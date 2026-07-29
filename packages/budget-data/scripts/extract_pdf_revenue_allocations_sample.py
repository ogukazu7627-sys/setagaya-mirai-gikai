#!/usr/bin/env python3
"""歳入PDFの充当事業を10ページだけstatefulに試験抽出する。"""

from __future__ import annotations

import argparse
import collections
import csv
import json
import os
import re
import sys
import unicodedata
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import pdfplumber

from extract_pdf_sections_sample import (
    FISCAL_YEAR,
    HierarchyValue,
    choose_moku,
    extract_moku_records,
    find_budget_tables,
    normalize_compact_text,
    parse_amount,
    parse_code_and_name,
)
from extract_pdf_sections_stateful import infer_page_hierarchy


BUDGET_SIDE = "revenue"
MIN_SAMPLE_PAGE_COUNT = 8
MAX_SAMPLE_PAGE_COUNT = 10

CSV_COLUMNS = [
    "raw_allocation_id",
    "source_file",
    "pdf_page",
    "budget_book_page",
    "fiscal_year",
    "account_code",
    "account_name",
    "kan_code",
    "kan_name",
    "kou_code",
    "kou_name",
    "moku_code",
    "moku_name",
    "setsu_code",
    "setsu_name",
    "saisetsu_code",
    "pdf_revenue_detail_name",
    "pdf_department_name",
    "pdf_revenue_amount_thousand_yen",
    "allocation_sequence",
    "pdf_target_program_name",
    "target_budget_book_page",
    "raw_text",
    "parse_status",
    "parse_note",
]

CAUSE_ALLOCATION_TARGET_PARSE = "allocation_target_parse_failure"
CAUSE_BUDGET_BOOK_PAGE_MISSING = "budget_book_page_missing"
CAUSE_DEPARTMENT_PARSE = "department_parse_failure"
CAUSE_HIERARCHY_MISSING = "hierarchy_context_missing"
CAUSE_MOKU_MISSING_AFTER_SAMPLE_GAP = "sample_gap_current_moku_missing"
CAUSE_SAISETSU_MISSING = "current_saisetsu_missing"
CAUSE_SETSU_MISSING = "current_setsu_missing"
CAUSE_TARGET_PAGE_OUT_OF_RANGE = "target_budget_book_page_out_of_range"
CAUSE_TABLE_DETECTION = "table_detection_failed"


@dataclass(frozen=True)
class SampleSegment:
    account_code: str
    pages: tuple[int, ...]
    patterns: tuple[str, ...]
    note: str
    no_allocation_expected: bool = False


SAMPLE_SEGMENTS = (
    SampleSegment(
        account_code="general",
        pages=(38,),
        patterns=("充当事業なし", "特別区税"),
        note="特別区民税。充当事業記載がない正常ページ。",
        no_allocation_expected=True,
    ),
    SampleSegment(
        account_code="general",
        pages=(52,),
        patterns=("1細節1充当事業", "複数の目・節・細節"),
        note="分担金及負担金。複数階層と1対1記載を確認する。",
    ),
    SampleSegment(
        account_code="general",
        pages=(53, 54),
        patterns=("細節ページまたぎ", "充当事業の次ページ継続"),
        note="区民センター等。玉川地域出張所の充当事業が次ページへ続く。",
    ),
    SampleSegment(
        account_code="general",
        pages=(58,),
        patterns=("1細節複数充当事業", "ガス関係922,900千円"),
        note="冒頭はPDF57からの継続だが、ガス関係は同一ページ内で完結する。",
    ),
    SampleSegment(
        account_code="national_health_insurance",
        pages=(291, 292),
        patterns=("1細節複数充当事業", "充当事業の次ページ継続"),
        note="一般会計繰入金。職員給与費と納付金の継続を確認する。",
    ),
    SampleSegment(
        account_code="latter_stage_elderly_healthcare",
        pages=(330,),
        patterns=("1細節複数充当事業",),
        note="職員給与費203,106千円から3事業への記載を確認する。",
    ),
    SampleSegment(
        account_code="long_term_care_insurance",
        pages=(358, 359),
        patterns=("細節ページまたぎ", "充当事業の次ページ継続"),
        note="住宅改修アドバイザー派遣の充当事業が次ページへ続く。",
    ),
)


@dataclass(frozen=True)
class RevenueAccount:
    account_code: str
    account_name: str
    revenue_pdf_page_start: int
    revenue_pdf_page_end: int
    expenditure_book_page_start: int
    expenditure_book_page_end: int


@dataclass(frozen=True)
class DetailEvent:
    code: str
    name: str
    department_name: str
    amount_thousand_yen: int | None
    raw_text: str
    causes: tuple[str, ...]


@dataclass(frozen=True)
class AllocationEvent:
    target_program_name: str
    target_budget_book_page: int | None
    raw_text: str
    causes: tuple[str, ...]


@dataclass
class ActiveDetail:
    detail_uid: int
    code: str
    name: str
    department_name: str
    amount_thousand_yen: int | None
    raw_text: str
    causes: set[str] = field(default_factory=set)
    allocation_count: int = 0


@dataclass(frozen=True)
class PageExtractionSummary:
    account_code: str
    pdf_page: int
    budget_book_page: int | None
    allocation_count: int
    parsed_count: int
    needs_review_count: int
    source_allocation_marker_count: int
    table_detected: bool
    no_allocation_expected: bool
    no_allocation_normal: bool
    unparsed_explanation_line_count: int


@dataclass(frozen=True)
class RevenueAllocationSampleResult:
    records: list[dict[str, Any]]
    page_summaries: tuple[PageExtractionSummary, ...]
    selected_pages: tuple[int, ...]


@dataclass(frozen=True)
class RevenueAllocationSampleMetrics:
    selected_page_count: int
    row_count: int
    parsed_count: int
    needs_review_count: int
    source_allocation_marker_count: int
    unique_raw_allocation_id_count: int
    no_allocation_page_count: int
    normal_no_allocation_page_count: int
    multiple_allocation_detail_count: int
    review_cause_counts: dict[str, int]
    account_row_counts: dict[str, int]


def sample_pages() -> tuple[int, ...]:
    return tuple(page for segment in SAMPLE_SEGMENTS for page in segment.pages)


def normalize_line(value: str) -> str:
    normalized = unicodedata.normalize("NFKC", value)
    return re.sub(r"\s+", " ", normalized).strip()


def normalize_name(value: str) -> str:
    return re.sub(r"\s+", "", unicodedata.normalize("NFKC", value))


def extract_revenue_budget_book_page(page: Any) -> int | None:
    footer_numbers = [
        word
        for word in page.extract_words()
        if word["x0"] > page.width / 2
        and word["top"] > page.height - 100
        and re.fullmatch(r"\d{2,4}", word["text"])
    ]
    if not footer_numbers:
        return None
    return int(max(footer_numbers, key=lambda word: word["x0"])["text"])


def logical_event_texts(value: str) -> tuple[list[tuple[str, str]], int]:
    lines = [
        normalize_line(line)
        for line in value.splitlines()
        if normalize_line(line)
    ]
    events: list[tuple[str, str]] = []
    unparsed_count = 0
    index = 0
    while index < len(lines):
        line = lines[index]
        if re.match(r"^充当事業\s*:", line):
            parts = [line]
            while (
                not re.search(r"[・･]\s*P\s*\d+\s*$", "".join(parts))
                and index + 1 < len(lines)
                and not re.match(
                    r"^(?:充当事業\s*:|\d{1,3}\s+)",
                    lines[index + 1],
                )
            ):
                index += 1
                parts.append(lines[index])
            events.append(("allocation", "".join(parts)))
        elif re.match(r"^\d{1,3}\s+", line):
            parts = [line]
            while (
                not re.search(r"\s-?[\d,]+\s*$", " ".join(parts))
                and index + 1 < len(lines)
                and not re.match(
                    r"^(?:充当事業\s*:|\d{1,3}\s+)",
                    lines[index + 1],
                )
            ):
                index += 1
                parts.append(lines[index])
            events.append(("detail", " ".join(parts)))
        else:
            unparsed_count += 1
        index += 1
    return events, unparsed_count


def parse_detail_event(value: str) -> DetailEvent | None:
    normalized = normalize_line(value)
    match = re.fullmatch(
        r"(?P<code>\d{1,3})\s+(?P<body>.+?)\s+"
        r"(?P<amount>-?[\d,]+)",
        normalized,
    )
    if not match:
        return None

    code = match.group("code").zfill(2)
    body = match.group("body").strip()
    amount = parse_amount(match.group("amount"))
    causes: set[str] = set()
    department_name = ""
    detail_name = body
    if body.endswith(")") and "(" in body:
        open_index = body.rfind("(")
        detail_name = body[:open_index].strip()
        department_name = body[open_index + 1 : -1].strip()
    else:
        causes.add(CAUSE_DEPARTMENT_PARSE)

    return DetailEvent(
        code=code,
        name=detail_name,
        department_name=department_name,
        amount_thousand_yen=amount,
        raw_text=normalized,
        causes=tuple(sorted(causes)),
    )


def parse_allocation_event(value: str) -> AllocationEvent:
    normalized = normalize_line(value)
    compact = normalize_compact_text(normalized)
    match = re.fullmatch(
        r"充当事業:(?P<name>.+)[・･]P(?P<page>\d+)",
        compact,
    )
    if match is None:
        return AllocationEvent(
            target_program_name="",
            target_budget_book_page=None,
            raw_text=normalized,
            causes=(CAUSE_ALLOCATION_TARGET_PARSE,),
        )
    return AllocationEvent(
        target_program_name=match.group("name"),
        target_budget_book_page=int(match.group("page")),
        raw_text=normalized,
        causes=(),
    )


def load_revenue_accounts(
    config_path: Path,
) -> dict[str, RevenueAccount]:
    try:
        config = json.loads(config_path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as error:
        raise ValueError(
            "budget-accounts.jsonが有効なJSONではありません。"
        ) from error
    if config.get("fiscal_year") != FISCAL_YEAR:
        raise ValueError(
            f"会計設定の年度が{FISCAL_YEAR}年度ではありません。"
        )
    account_rows = config.get("accounts")
    if not isinstance(account_rows, list):
        raise ValueError("会計設定のaccountsが配列ではありません。")

    required_codes = {segment.account_code for segment in SAMPLE_SEGMENTS}
    accounts: dict[str, RevenueAccount] = {}
    for row in account_rows:
        if not isinstance(row, dict):
            continue
        account_code = row.get("account_code")
        if account_code not in required_codes:
            continue
        revenue = row.get("revenue")
        if not isinstance(revenue, dict) or revenue.get("status") != "active":
            raise ValueError(
                f"{account_code}のactiveなrevenue設定がありません。"
            )
        integer_fields = {
            "revenue_pdf_page_start": revenue.get("pdf_page_start"),
            "revenue_pdf_page_end": revenue.get("pdf_page_end"),
            "expenditure_book_page_start": row.get(
                "pdf_budget_book_start_page"
            ),
            "expenditure_book_page_end": row.get(
                "pdf_budget_book_end_page"
            ),
        }
        if not all(isinstance(value, int) for value in integer_fields.values()):
            raise ValueError(f"{account_code}のPDF範囲設定が不正です。")
        account_name = row.get("account_name")
        if not isinstance(account_name, str) or not account_name.strip():
            raise ValueError(f"{account_code}のaccount_nameが不正です。")
        accounts[account_code] = RevenueAccount(
            account_code=account_code,
            account_name=account_name.strip(),
            **integer_fields,
        )

    if set(accounts) != required_codes:
        missing = ", ".join(sorted(required_codes - set(accounts)))
        raise ValueError(f"会計設定が不足しています: {missing}")

    pages = sample_pages()
    if not MIN_SAMPLE_PAGE_COUNT <= len(pages) <= MAX_SAMPLE_PAGE_COUNT:
        raise ValueError("サンプル対象は8〜10ページである必要があります。")
    if len(set(pages)) != len(pages):
        raise ValueError("サンプルページが重複しています。")
    for segment in SAMPLE_SEGMENTS:
        account = accounts[segment.account_code]
        if any(
            page < account.revenue_pdf_page_start
            or page > account.revenue_pdf_page_end
            for page in segment.pages
        ):
            raise ValueError(
                f"{segment.account_code}のサンプルページが歳入範囲外です。"
            )
    return accounts


class StatefulRevenueAllocationExtractor:
    def __init__(
        self,
        source_file: str,
        account: RevenueAccount,
    ) -> None:
        self.source_file = source_file
        self.account = account
        self.current_kan: HierarchyValue | None = None
        self.current_kou: HierarchyValue | None = None
        self.current_moku: HierarchyValue | None = None
        self.current_setsu: HierarchyValue | None = None
        self.current_saisetsu: ActiveDetail | None = None
        self.detail_counter = 0
        self.orphan_allocation_counter = 0
        self.records: list[dict[str, Any]] = []

    def reset_below_kan(self) -> None:
        self.current_kou = None
        self.reset_below_kou()

    def reset_below_kou(self) -> None:
        self.current_moku = None
        self.reset_below_moku()

    def reset_below_moku(self) -> None:
        self.current_setsu = None
        self.current_saisetsu = None

    def update_hierarchy(
        self,
        kan: HierarchyValue | None,
        kou: HierarchyValue | None,
    ) -> None:
        if kan is not None:
            if (
                self.current_kan is not None
                and self.current_kan != kan
            ):
                self.reset_below_kan()
            self.current_kan = kan
        if kou is not None:
            if (
                self.current_kou is not None
                and self.current_kou != kou
            ):
                self.reset_below_kou()
            self.current_kou = kou

    def update_moku(self, value: HierarchyValue | None) -> None:
        if value is None:
            return
        if self.current_moku != value:
            self.current_moku = value
            self.reset_below_moku()

    def update_setsu(self, raw_category: str) -> set[str]:
        if not raw_category:
            return set()
        parsed = parse_code_and_name(raw_category)
        if parsed is None:
            self.current_setsu = None
            self.current_saisetsu = None
            return {CAUSE_SETSU_MISSING}
        if self.current_setsu != parsed:
            self.current_setsu = parsed
            self.current_saisetsu = None
        return set()

    def update_detail(self, event: DetailEvent | None) -> None:
        self.detail_counter += 1
        if event is None:
            self.current_saisetsu = None
            return
        self.current_saisetsu = ActiveDetail(
            detail_uid=self.detail_counter,
            code=event.code,
            name=event.name,
            department_name=event.department_name,
            amount_thousand_yen=event.amount_thousand_yen,
            raw_text=event.raw_text,
            causes=set(event.causes),
        )

    def append_allocation(
        self,
        event: AllocationEvent,
        pdf_page: int,
        budget_book_page: int | None,
        row_causes: set[str],
        page_allocation_ordinal: int,
    ) -> dict[str, Any]:
        causes = set(event.causes) | row_causes
        detail = self.current_saisetsu
        if self.current_kan is None or self.current_kou is None:
            causes.add(CAUSE_HIERARCHY_MISSING)
        if self.current_moku is None:
            causes.add(CAUSE_MOKU_MISSING_AFTER_SAMPLE_GAP)
        if self.current_setsu is None:
            causes.add(CAUSE_SETSU_MISSING)
        if detail is None:
            causes.add(CAUSE_SAISETSU_MISSING)
            self.orphan_allocation_counter += 1
            sequence = self.orphan_allocation_counter
            detail_uid = -self.orphan_allocation_counter
        else:
            detail.allocation_count += 1
            sequence = detail.allocation_count
            detail_uid = detail.detail_uid
            causes.update(detail.causes)

        target_page = event.target_budget_book_page
        if target_page is not None and not (
            self.account.expenditure_book_page_start
            <= target_page
            <= self.account.expenditure_book_page_end
        ):
            causes.add(CAUSE_TARGET_PAGE_OUT_OF_RANGE)
        if budget_book_page is None:
            causes.add(CAUSE_BUDGET_BOOK_PAGE_MISSING)

        amount: int | str = ""
        if (
            detail is not None
            and sequence == 1
            and detail.amount_thousand_yen is not None
        ):
            amount = detail.amount_thousand_yen
        raw_parts = [detail.raw_text] if detail is not None else []
        raw_parts.append(event.raw_text)

        return {
            "raw_allocation_id": (
                f"ra_{FISCAL_YEAR}_{self.account.account_code}_"
                f"{pdf_page:03d}_{page_allocation_ordinal:03d}"
            ),
            "source_file": self.source_file,
            "pdf_page": pdf_page,
            "budget_book_page": budget_book_page or "",
            "fiscal_year": FISCAL_YEAR,
            "account_code": self.account.account_code,
            "account_name": self.account.account_name,
            "kan_code": self.current_kan.code if self.current_kan else "",
            "kan_name": self.current_kan.name if self.current_kan else "",
            "kou_code": self.current_kou.code if self.current_kou else "",
            "kou_name": self.current_kou.name if self.current_kou else "",
            "moku_code": self.current_moku.code if self.current_moku else "",
            "moku_name": self.current_moku.name if self.current_moku else "",
            "setsu_code": self.current_setsu.code if self.current_setsu else "",
            "setsu_name": self.current_setsu.name if self.current_setsu else "",
            "saisetsu_code": detail.code if detail else "",
            "pdf_revenue_detail_name": detail.name if detail else "",
            "pdf_department_name": (
                detail.department_name if detail else ""
            ),
            "pdf_revenue_amount_thousand_yen": amount,
            "allocation_sequence": sequence,
            "pdf_target_program_name": event.target_program_name,
            "target_budget_book_page": target_page or "",
            "raw_text": "\n".join(raw_parts),
            "parse_status": "needs_review" if causes else "parsed",
            "parse_note": ";".join(sorted(causes)),
            "_detail_uid": detail_uid,
        }

    def process_page(
        self,
        page: Any,
        pdf_page: int,
        no_allocation_expected: bool,
    ) -> PageExtractionSummary:
        budget_book_page = extract_revenue_budget_book_page(page)
        page_text = page.extract_text() or ""
        source_allocation_marker_count = page_text.count("充当事業")
        start_record_count = len(self.records)
        unparsed_count = 0
        try:
            hierarchy_table, section_table = find_budget_tables(page)
        except ValueError:
            return PageExtractionSummary(
                account_code=self.account.account_code,
                pdf_page=pdf_page,
                budget_book_page=budget_book_page,
                allocation_count=0,
                parsed_count=0,
                needs_review_count=0,
                source_allocation_marker_count=(
                    source_allocation_marker_count
                ),
                table_detected=False,
                no_allocation_expected=no_allocation_expected,
                no_allocation_normal=False,
                unparsed_explanation_line_count=0,
            )

        moku_records = extract_moku_records(hierarchy_table)
        kan, kou = infer_page_hierarchy(
            page_text,
            hierarchy_table,
            moku_records,
        )
        self.update_hierarchy(kan, kou)

        page_allocation_ordinal = 0
        for row, values in zip(section_table.rows, section_table.extract()):
            if len(values) < 3:
                continue
            raw_category = values[0] or ""
            if normalize_compact_text(raw_category) in {"節", "区分"}:
                continue

            moku = choose_moku(moku_records, row.bbox[1])
            self.update_moku(
                HierarchyValue(code=moku.code, name=moku.name)
                if moku is not None
                else None
            )
            row_causes = self.update_setsu(raw_category)
            explanation = values[2] or ""
            events, row_unparsed_count = logical_event_texts(explanation)
            unparsed_count += row_unparsed_count
            for event_type, event_text in events:
                if event_type == "detail":
                    self.update_detail(parse_detail_event(event_text))
                    continue
                allocation = parse_allocation_event(event_text)
                page_allocation_ordinal += 1
                self.records.append(
                    self.append_allocation(
                        event=allocation,
                        pdf_page=pdf_page,
                        budget_book_page=budget_book_page,
                        row_causes=row_causes,
                        page_allocation_ordinal=page_allocation_ordinal,
                    )
                )

        page_records = self.records[start_record_count:]
        parsed_count = sum(
            record["parse_status"] == "parsed" for record in page_records
        )
        review_count = len(page_records) - parsed_count
        return PageExtractionSummary(
            account_code=self.account.account_code,
            pdf_page=pdf_page,
            budget_book_page=budget_book_page,
            allocation_count=len(page_records),
            parsed_count=parsed_count,
            needs_review_count=review_count,
            source_allocation_marker_count=(
                source_allocation_marker_count
            ),
            table_detected=True,
            no_allocation_expected=no_allocation_expected,
            no_allocation_normal=(
                no_allocation_expected and len(page_records) == 0
            ),
            unparsed_explanation_line_count=unparsed_count,
        )


def extract_revenue_allocation_sample(
    pdf: Any,
    source_file: str,
    accounts: dict[str, RevenueAccount],
) -> RevenueAllocationSampleResult:
    records: list[dict[str, Any]] = []
    page_summaries: list[PageExtractionSummary] = []
    for segment_index, segment in enumerate(SAMPLE_SEGMENTS, start=1):
        extractor = StatefulRevenueAllocationExtractor(
            source_file=source_file,
            account=accounts[segment.account_code],
        )
        for pdf_page in segment.pages:
            summary = extractor.process_page(
                page=pdf.pages[pdf_page - 1],
                pdf_page=pdf_page,
                no_allocation_expected=segment.no_allocation_expected,
            )
            page_summaries.append(summary)
        for record in extractor.records:
            record["_segment_index"] = segment_index
            records.append(record)

    normalized_records = []
    for record in records:
        normalized = {
            column: record[column] for column in CSV_COLUMNS
        }
        normalized["_detail_uid"] = record["_detail_uid"]
        normalized["_segment_index"] = record["_segment_index"]
        normalized_records.append(normalized)
    return RevenueAllocationSampleResult(
        records=normalized_records,
        page_summaries=tuple(page_summaries),
        selected_pages=sample_pages(),
    )


def calculate_metrics(
    result: RevenueAllocationSampleResult,
) -> RevenueAllocationSampleMetrics:
    review_causes: collections.Counter[str] = collections.Counter()
    account_rows: collections.Counter[str] = collections.Counter()
    detail_rows: collections.Counter[
        tuple[str, int, int]
    ] = collections.Counter()
    for record in result.records:
        account_rows[str(record["account_code"])] += 1
        detail_rows[
            (
                str(record["account_code"]),
                int(record["_segment_index"]),
                int(record["_detail_uid"]),
            )
        ] += 1
        if record["parse_status"] == "needs_review":
            review_causes.update(
                cause
                for cause in str(record["parse_note"]).split(";")
                if cause
            )

    return RevenueAllocationSampleMetrics(
        selected_page_count=len(result.selected_pages),
        row_count=len(result.records),
        parsed_count=sum(
            record["parse_status"] == "parsed"
            for record in result.records
        ),
        needs_review_count=sum(
            record["parse_status"] == "needs_review"
            for record in result.records
        ),
        source_allocation_marker_count=sum(
            summary.source_allocation_marker_count
            for summary in result.page_summaries
        ),
        unique_raw_allocation_id_count=len(
            {
                str(record["raw_allocation_id"])
                for record in result.records
            }
        ),
        no_allocation_page_count=sum(
            summary.allocation_count == 0
            for summary in result.page_summaries
        ),
        normal_no_allocation_page_count=sum(
            summary.no_allocation_normal
            for summary in result.page_summaries
        ),
        multiple_allocation_detail_count=sum(
            count > 1
            for (
                account_code,
                segment_index,
                detail_uid,
            ), count in detail_rows.items()
            if detail_uid > 0
        ),
        review_cause_counts=dict(sorted(review_causes.items())),
        account_row_counts=dict(sorted(account_rows.items())),
    )


def records_for_detail(
    result: RevenueAllocationSampleResult,
    account_code: str,
    detail_name: str,
) -> list[dict[str, Any]]:
    expected = normalize_name(detail_name)
    return [
        record
        for record in result.records
        if record["account_code"] == account_code
        and normalize_name(str(record["pdf_revenue_detail_name"]))
        == expected
    ]


def validate_sample(
    result: RevenueAllocationSampleResult,
    metrics: RevenueAllocationSampleMetrics,
) -> None:
    errors: list[str] = []
    if not MIN_SAMPLE_PAGE_COUNT <= metrics.selected_page_count <= (
        MAX_SAMPLE_PAGE_COUNT
    ):
        errors.append("対象ページ数が8〜10ではありません。")
    if (
        metrics.unique_raw_allocation_id_count
        != metrics.row_count
    ):
        errors.append("raw_allocation_idが一意ではありません。")
    if (
        metrics.source_allocation_marker_count
        != metrics.row_count
        or any(
            summary.source_allocation_marker_count
            != summary.allocation_count
            for summary in result.page_summaries
        )
    ):
        errors.append("PDFの充当事業記載数と出力行数が一致しません。")
    if {
        str(record["account_code"]) for record in result.records
    } != {
        "general",
        "national_health_insurance",
        "latter_stage_elderly_healthcare",
        "long_term_care_insurance",
    }:
        errors.append("対象4会計のいずれかが抽出結果にありません。")
    if any(
        record["parse_status"] == "parsed"
        and (
            not isinstance(record["target_budget_book_page"], int)
            or int(record["target_budget_book_page"]) <= 0
        )
        for record in result.records
    ):
        errors.append("parsed行のtarget_budget_book_pageが不正です。")
    required_parsed_fields = (
        "budget_book_page",
        "kan_code",
        "kan_name",
        "kou_code",
        "kou_name",
        "moku_code",
        "moku_name",
        "setsu_code",
        "setsu_name",
        "saisetsu_code",
        "pdf_revenue_detail_name",
        "pdf_department_name",
        "pdf_target_program_name",
        "target_budget_book_page",
    )
    if any(
        record["parse_status"] == "parsed"
        and any(record[field] == "" for field in required_parsed_fields)
        for record in result.records
    ):
        errors.append("parsed行の必須項目に空欄があります。")
    if any(
        int(record["allocation_sequence"]) > 1
        and record["pdf_revenue_amount_thousand_yen"] != ""
        for record in result.records
    ):
        errors.append("複数充当先の2行目以降に細節金額が複製されています。")
    if not any(
        summary.pdf_page == 38
        and summary.no_allocation_normal
        and summary.allocation_count == 0
        for summary in result.page_summaries
    ):
        errors.append("PDF38の充当事業なしページが正常扱いされていません。")

    gas_rows = records_for_detail(result, "general", "ガス関係")
    if (
        len(gas_rows) != 2
        or [row["allocation_sequence"] for row in gas_rows] != [1, 2]
        or {
            row["target_budget_book_page"] for row in gas_rows
        }
        != {423, 471}
        or gas_rows[0]["pdf_revenue_amount_thousand_yen"] != 922_900
        or gas_rows[1]["pdf_revenue_amount_thousand_yen"] != ""
    ):
        errors.append("ガス関係922,900千円の複数充当先保持に失敗しました。")

    continuation_expectations = (
        ("general", "玉川地域出張所", 54, 333),
        (
            "national_health_insurance",
            "子ども・子育て支援金分(納付金)",
            292,
            619,
        ),
        (
            "long_term_care_insurance",
            "住宅改修アドバイザー派遣",
            359,
            785,
        ),
    )
    for account_code, detail_name, pdf_page, target_page in (
        continuation_expectations
    ):
        rows = records_for_detail(result, account_code, detail_name)
        if not any(
            row["pdf_page"] == pdf_page
            and row["target_budget_book_page"] == target_page
            and row["parse_status"] == "parsed"
            for row in rows
        ):
            errors.append(
                f"{account_code}:{detail_name}のページ継続を保持できません。"
            )

    if errors:
        raise ValueError("\n".join(errors))


def write_sample_csv(
    output_path: Path,
    records: list[dict[str, Any]],
) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", encoding="utf-8", newline="") as stream:
        writer = csv.DictWriter(
            stream,
            fieldnames=CSV_COLUMNS,
            extrasaction="ignore",
            lineterminator="\n",
        )
        writer.writeheader()
        writer.writerows(records)


def markdown_escape(value: str) -> str:
    return value.replace("|", "\\|").replace("\n", "<br>")


def render_notes(
    result: RevenueAllocationSampleResult,
    metrics: RevenueAllocationSampleMetrics,
) -> str:
    summary_by_page = {
        summary.pdf_page: summary for summary in result.page_summaries
    }
    segment_rows = []
    for segment in SAMPLE_SEGMENTS:
        summaries = [summary_by_page[page] for page in segment.pages]
        allocation_count = sum(
            summary.allocation_count for summary in summaries
        )
        review_count = sum(
            summary.needs_review_count for summary in summaries
        )
        segment_rows.append(
            "| "
            f"`{segment.account_code}` | "
            f"{', '.join(str(page) for page in segment.pages)} | "
            f"{', '.join(segment.patterns)} | "
            f"{allocation_count:,} | "
            f"{review_count:,} | "
            f"{markdown_escape(segment.note)} |"
        )

    if metrics.review_cause_counts:
        review_rows = [
            f"| `{cause}` | {count:,} |"
            for cause, count in metrics.review_cause_counts.items()
        ]
    else:
        review_rows = ["| - | 0 |"]

    review_examples = [
        record
        for record in result.records
        if record["parse_status"] == "needs_review"
    ][:10]
    if review_examples:
        review_example_rows = [
            "| "
            f"{record['pdf_page']} | "
            f"{markdown_escape(str(record['pdf_revenue_detail_name']) or '-')} | "
            f"{markdown_escape(str(record['pdf_target_program_name']) or '-')} | "
            f"`{record['parse_note']}` |"
            for record in review_examples
        ]
    else:
        review_example_rows = ["| - | - | - | - |"]

    gas_rows = records_for_detail(result, "general", "ガス関係")
    gas_targets = "、".join(
        f"{row['pdf_target_program_name']}（P{row['target_budget_book_page']}）"
        for row in gas_rows
    )

    lines = [
        "# 歳入PDF「充当事業」抽出 最小実験ノート",
        "",
        "## 結論",
        "",
        "- 対象は10物理ページだけ。全ページ抽出は実行していない。",
        "- PDFテキスト層と表座標を使用し、OCRは使用していない。",
        (
            f"- 抽出した充当事業は{metrics.row_count:,}行、"
            f"`parsed` {metrics.parsed_count:,}行、"
            f"`needs_review` {metrics.needs_review_count:,}行。"
        ),
        "- 1つの「充当事業」記載を1行として保持した。",
        (
            "- 複数充当先でも配分額を推測していない。細節金額は"
            "`allocation_sequence=1`だけに置き、2行目以降は空欄とした。"
        ),
        "- `allocation_amount`は作成していない。",
        "",
        "全ページ処理へは、会計ごとの歳入範囲を先頭から連続処理する",
        "stateful extractorとして進めることができる。PDF 58冒頭の",
        "`needs_review`はサンプルがPDF 57を含まないことによる文脈欠落であり、",
        "全範囲の連続処理では解消可能。ただしCSV歳入明細との全件照合を",
        "Phase 26以降の必須ゲートとする。",
        "",
        "## 入力と出力",
        "",
        "- 入力: `raw/r8tousyoyosanallpage.pdf`",
        "- 設定: `config/budget-accounts.json`の各会計`revenue`範囲",
        "- 出力: `processed/audit/raw_pdf_revenue_allocations_sample.csv`",
        "- 金額単位: 千円",
        "",
        "## 対象ページ",
        "",
        "| account_code | PDF物理ページ | 主なパターン | 抽出行 | needs_review | 備考 |",
        "| --- | --- | --- | ---: | ---: | --- |",
        *segment_rows,
        "",
        f"対象物理ページ数は{metrics.selected_page_count}ページ。",
        "学校給食費会計は`abolished_zero`のため対象外。",
        "",
        "## 抽出方法",
        "",
        "1. `pdfplumber.find_tables()`で左側の款・項・目表と右側の節・説明表を検出する。",
        "2. 左表の行座標と右表の行座標を比較し、目を対応付ける。",
        "3. 説明欄から細節コード、細節名、括弧内所属、細節金額を読む。",
        "4. `充当事業：事業名･P000`を記載順に抽出する。",
        "5. 連続ページでは款・項・目・節・細節を保持し、ページ冒頭の充当事業を直前細節へ付ける。",
        "6. 非連続のサンプル区間では状態をリセットし、誤った前ページ状態を流用しない。",
        "",
        "節名称や事業名の改行は、表セル内の論理行を連結してから解析する。",
        "`target_budget_book_page`は`･P000`から整数として取得し、同じ会計の",
        "歳出冊子ページ範囲内かも確認する。",
        "",
        "## パターン別確認",
        "",
        "### 充当事業なし",
        "",
        "- PDF 38、冊子68-69の特別区税は抽出行0件。",
        "- 表検出失敗やエラー行にはせず、正常な0件ページとして記録した。",
        "",
        "### 1細節に1充当事業",
        "",
        "- PDF 52の分担金及負担金で複数例を抽出できた。",
        "- 細節名、所属、細節金額、充当事業名、冊子ページを同じ行に保持した。",
        "",
        "### 1細節に複数充当事業",
        "",
        (
            "- ガス関係922,900千円は2行に分けて保持: "
            f"{gas_targets}。"
        ),
        "- 2行目の`pdf_revenue_amount_thousand_yen`は空欄で、922,900を複製していない。",
        "- 国保・後期高齢者医療の職員給与費も、各充当事業を別行で保持できた。",
        "",
        "### ページ継続",
        "",
        "- PDF 53→54: 玉川地域出張所44千円 → P333。",
        "- PDF 291→292: 子ども・子育て支援金分（納付金）69,677千円 → P619。",
        "- PDF 358→359: 住宅改修アドバイザー派遣333千円 → P785。",
        "- 3例とも次ページの行を直前ページの細節へ付け、`parsed`とした。",
        "",
        "## 検証結果",
        "",
        "| 項目 | 結果 |",
        "| --- | ---: |",
        f"| 出力行数 | {metrics.row_count:,} |",
        (
            "| PDF原文の充当事業記載数 | "
            f"{metrics.source_allocation_marker_count:,} |"
        ),
        f"| raw_allocation_id一意数 | {metrics.unique_raw_allocation_id_count:,} |",
        f"| parsed | {metrics.parsed_count:,} |",
        f"| needs_review | {metrics.needs_review_count:,} |",
        f"| 複数充当先を持つ細節 | {metrics.multiple_allocation_detail_count:,} |",
        f"| 充当事業0件ページ | {metrics.no_allocation_page_count:,} |",
        f"| 正常な充当事業0件ページ | {metrics.normal_no_allocation_page_count:,} |",
        "",
        "- `raw_allocation_id`は全行一意。",
        "- PDF原文の`充当事業`記載数と出力行数はページ別に一致。",
        "- `parsed`行の`target_budget_book_page`は全件取得済み。",
        "- 複数充当先は別行で、細節金額は先頭行にだけ保持。",
        "- 既存のCSV正本や歳出テーブルとの結合は行っていない。",
        "",
        "## needs_reviewの分類",
        "",
        "| 原因コード | 件数 |",
        "| --- | ---: |",
        *review_rows,
        "",
        "| PDFページ | 細節 | 充当事業 | 原因コード |",
        "| ---: | --- | --- | --- |",
        *review_example_rows,
        "",
        "## 全ページ処理前の改修点",
        "",
        "1. `account.revenue.pdf_page_start`から終了まで会計単位で連続処理し、サンプル区間の状態欠落をなくす。",
        "2. PDF細節をCSVの会計・款・項・目・節・細節・所属・金額と照合し、名称揺れを検出する。",
        "3. 細節ごとの充当事業件数とPDF記載件数を照合し、ページ末尾の未閉鎖細節を次ページで確定する。",
        "4. 表検出失敗、細節解析失敗、対象冊子ページ範囲外を原因コード別に停止・レビューできるようにする。",
        "5. 充当事業名と冊子ページだけで歳出`program_id`へ自動結合しない。結合は別フェーズで検証する。",
        "",
        "## このPhaseで作成していないもの",
        "",
        "- `processed/core/budget_revenue_allocations.csv`",
        "- 全ページのPDF抽出CSV",
        "- 細節金額の充当先別配分",
        "- 歳出事業との結合",
        "",
    ]
    return "\n".join(lines)


def write_notes(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


def resolve_path(value: Path, repo_root: Path) -> Path:
    return value if value.is_absolute() else repo_root / value


def main() -> None:
    repo_root = Path(__file__).resolve().parents[3]
    parser = argparse.ArgumentParser(
        description="歳入PDFの充当事業を10ページだけ試験抽出します。"
    )
    parser.add_argument(
        "--pdf",
        type=Path,
        default=repo_root / "raw" / "r8tousyoyosanallpage.pdf",
    )
    parser.add_argument(
        "--config",
        type=Path,
        default=repo_root / "config" / "budget-accounts.json",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=(
            repo_root
            / "processed" / "audit" / "raw_pdf_revenue_allocations_sample.csv"
        ),
    )
    parser.add_argument(
        "--notes",
        type=Path,
        default=(
            repo_root
            / "docs"
            / "pdf_revenue_allocation_extraction_notes.md"
        ),
    )
    args = parser.parse_args(
        [argument for argument in sys.argv[1:] if argument != "--"]
    )
    args.pdf = resolve_path(args.pdf, repo_root)
    args.config = resolve_path(args.config, repo_root)
    args.output = resolve_path(args.output, repo_root)
    args.notes = resolve_path(args.notes, repo_root)

    accounts = load_revenue_accounts(args.config)
    with pdfplumber.open(args.pdf) as pdf:
        if max(sample_pages()) > len(pdf.pages):
            raise ValueError("サンプルページがPDFページ数を超えています。")
        result = extract_revenue_allocation_sample(
            pdf=pdf,
            source_file=args.pdf.name,
            accounts=accounts,
        )
    metrics = calculate_metrics(result)
    validate_sample(result, metrics)
    notes = render_notes(result, metrics)

    output_temporary = args.output.with_name(
        f".{args.output.name}.{os.getpid()}.tmp"
    )
    notes_temporary = args.notes.with_name(
        f".{args.notes.name}.{os.getpid()}.tmp"
    )
    try:
        write_sample_csv(output_temporary, result.records)
        write_notes(notes_temporary, notes)
        with output_temporary.open(
            encoding="utf-8",
            newline="",
        ) as stream:
            reader = csv.DictReader(stream)
            written_rows = list(reader)
        if reader.fieldnames != CSV_COLUMNS:
            raise ValueError("一時CSVの列が不正です。")
        if len(written_rows) != metrics.row_count:
            raise ValueError("一時CSVの行数が不正です。")
        verified_notes = notes_temporary.read_text(encoding="utf-8")
        if "## 結論" not in verified_notes or "## 検証結果" not in (
            verified_notes
        ):
            raise ValueError("一時ノートの必須見出しがありません。")
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.notes.parent.mkdir(parents=True, exist_ok=True)
        os.replace(output_temporary, args.output)
        os.replace(notes_temporary, args.notes)
    finally:
        output_temporary.unlink(missing_ok=True)
        notes_temporary.unlink(missing_ok=True)

    print(f"Selected PDF pages: {metrics.selected_page_count}")
    print(
        f"Allocations: {metrics.row_count} "
        f"(parsed={metrics.parsed_count}, "
        f"needs_review={metrics.needs_review_count})"
    )
    print(
        "Unique raw_allocation_id: "
        f"{metrics.unique_raw_allocation_id_count}"
    )
    print(
        "Source allocation markers: "
        f"{metrics.source_allocation_marker_count}"
    )
    print(
        "Multiple-allocation details: "
        f"{metrics.multiple_allocation_detail_count}"
    )
    print(
        "Normal no-allocation pages: "
        f"{metrics.normal_no_allocation_page_count}"
    )
    print(f"Review causes: {metrics.review_cause_counts}")
    print(f"Output: {args.output}")
    print(f"Notes: {args.notes}")


if __name__ == "__main__":
    main()
