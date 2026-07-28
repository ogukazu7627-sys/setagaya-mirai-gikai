#!/usr/bin/env python3
"""歳入PDFの充当事業を会計ごとに連続抽出する。"""

from __future__ import annotations

import argparse
import collections
import csv
import hashlib
import json
import os
import re
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import pdfplumber

from extract_pdf_revenue_allocations_extended_sample import (
    ExtendedPatternMetrics,
    SampleRegressionMetrics,
    calculate_pattern_metrics,
    calculate_sample_regression,
    extended_sample_pages,
    extract_extended_revenue_allocation_sample,
    extract_footer_budget_book_page,
    read_phase25_sample,
    validate_extended_configuration,
    validate_extended_sample,
)
from extract_pdf_revenue_allocations_sample import (
    CSV_COLUMNS,
    RevenueAccount,
    RevenueAllocationSampleMetrics,
    RevenueAllocationSampleResult,
    StatefulRevenueAllocationExtractor,
    calculate_metrics,
    load_revenue_accounts,
    resolve_path,
    write_notes,
    write_sample_csv,
)
from extract_pdf_sections_sample import FISCAL_YEAR


ACTIVE_ACCOUNT_CODES = (
    "general",
    "national_health_insurance",
    "latter_stage_elderly_healthcare",
    "long_term_care_insurance",
)
FORBIDDEN_COLUMNS = {
    "allocation_amount_thousand_yen",
    "budget_program_group_id",
    "revenue_detail_id",
}


@dataclass(frozen=True)
class FullRevenueAccount:
    extraction_account: RevenueAccount
    revenue_budget_book_start_page: int
    revenue_budget_book_end_page: int

    @property
    def account_code(self) -> str:
        return self.extraction_account.account_code

    @property
    def account_name(self) -> str:
        return self.extraction_account.account_name


@dataclass(frozen=True)
class Phase26GateResult:
    result: RevenueAllocationSampleResult
    metrics: RevenueAllocationSampleMetrics
    pattern_metrics: ExtendedPatternMetrics
    regression: SampleRegressionMetrics
    pdf67_record: dict[str, Any]


@dataclass(frozen=True)
class FullPageSummary:
    account_code: str
    pdf_page: int
    expected_budget_book_page: int
    detected_budget_book_page: int | None
    source_allocation_marker_count: int
    output_row_count: int
    parsed_count: int
    needs_review_count: int
    table_detected: bool
    page_type: str


@dataclass(frozen=True)
class AccountEndState:
    account_code: str
    kan_code: str
    kou_code: str
    moku_code: str
    setsu_code: str
    saisetsu_code: str
    saisetsu_name: str
    saisetsu_amount_thousand_yen: int | None
    allocation_count: int


@dataclass(frozen=True)
class FullExtractionResult:
    records: list[dict[str, Any]]
    page_summaries: tuple[FullPageSummary, ...]
    account_end_states: tuple[AccountEndState, ...]


@dataclass(frozen=True)
class FullExtractionMetrics:
    page_count: int
    row_count: int
    parsed_count: int
    needs_review_count: int
    source_allocation_marker_count: int
    unique_raw_allocation_id_count: int
    multiple_allocation_detail_count: int
    account_page_counts: dict[str, int]
    account_row_counts: dict[str, int]
    account_marker_counts: dict[str, int]
    page_type_counts: dict[str, int]
    review_cause_counts: dict[str, int]


@dataclass(frozen=True)
class ValidationIssue:
    error_code: str
    account_code: str
    pdf_page: int | None
    raw_allocation_id: str
    expected: str
    actual: str
    message: str


class FullStatefulRevenueAllocationExtractor(
    StatefulRevenueAllocationExtractor
):
    def __init__(
        self,
        source_file: str,
        account: RevenueAccount,
    ) -> None:
        super().__init__(source_file=source_file, account=account)
        self.current_account = account


def load_full_revenue_accounts(
    config_path: Path,
) -> tuple[FullRevenueAccount, ...]:
    extraction_accounts = load_revenue_accounts(config_path)
    config = json.loads(config_path.read_text(encoding="utf-8"))
    rows_by_code = {
        row.get("account_code"): row
        for row in config.get("accounts", [])
        if isinstance(row, dict)
    }
    accounts: list[FullRevenueAccount] = []
    for account_code in ACTIVE_ACCOUNT_CODES:
        row = rows_by_code.get(account_code)
        if not isinstance(row, dict):
            raise ValueError(f"{account_code}の会計設定がありません。")
        revenue = row.get("revenue")
        if not isinstance(revenue, dict) or revenue.get("status") != "active":
            raise ValueError(
                f"{account_code}のactiveな歳入設定がありません。"
            )
        start = revenue.get("pdf_budget_book_start_page")
        end = revenue.get("pdf_budget_book_end_page")
        if not isinstance(start, int) or not isinstance(end, int):
            raise ValueError(
                f"{account_code}の歳入冊子ページ範囲が不正です。"
            )
        extraction_account = extraction_accounts[account_code]
        expected_end = start + 2 * (
            extraction_account.revenue_pdf_page_end
            - extraction_account.revenue_pdf_page_start
        )
        if expected_end != end:
            raise ValueError(
                f"{account_code}の物理ページ・冊子ページ対応が不正です。"
            )
        accounts.append(
            FullRevenueAccount(
                extraction_account=extraction_account,
                revenue_budget_book_start_page=start,
                revenue_budget_book_end_page=end,
            )
        )
    return tuple(accounts)


def expected_budget_book_page(
    account: FullRevenueAccount,
    pdf_page: int,
) -> int:
    extraction_account = account.extraction_account
    if not (
        extraction_account.revenue_pdf_page_start
        <= pdf_page
        <= extraction_account.revenue_pdf_page_end
    ):
        raise ValueError(
            f"{account.account_code}: PDF {pdf_page}は歳入範囲外です。"
        )
    return account.revenue_budget_book_start_page + 2 * (
        pdf_page - extraction_account.revenue_pdf_page_start
    )


def count_allocation_markers(page_text: str) -> int:
    return len(re.findall(r"充当事業\s*：", page_text))


def run_phase26_gate(
    pdf: Any,
    source_file: str,
    accounts: dict[str, RevenueAccount],
    phase25_rows: list[dict[str, str]],
) -> Phase26GateResult:
    validate_extended_configuration(accounts)
    if max(extended_sample_pages()) > len(pdf.pages):
        raise ValueError("Phase 26ゲートページがPDFページ数を超えています。")
    result, open_details = extract_extended_revenue_allocation_sample(
        pdf=pdf,
        source_file=source_file,
        accounts=accounts,
    )
    metrics = calculate_metrics(result)
    pattern_metrics = calculate_pattern_metrics(result)
    regression = calculate_sample_regression(phase25_rows, result)
    validate_extended_sample(
        result,
        metrics,
        pattern_metrics,
        regression,
        open_details,
    )
    pdf67_records = [
        record
        for record in result.records
        if record["raw_allocation_id"]
        == "ra_2026_general_067_018"
    ]
    if len(pdf67_records) != 1:
        raise ValueError("PDF 67固定回帰行を一意に取得できません。")
    return Phase26GateResult(
        result=result,
        metrics=metrics,
        pattern_metrics=pattern_metrics,
        regression=regression,
        pdf67_record=pdf67_records[0],
    )


def classify_page(
    table_detected: bool,
    marker_count: int,
    output_count: int,
) -> str:
    if not table_detected and marker_count > 0:
        return "table_detection_failed"
    if not table_detected:
        return "summary_page"
    if marker_count == 0 and output_count == 0:
        return "no_allocation_page"
    return "detail_page"


def snapshot_account_end_state(
    account_code: str,
    extractor: StatefulRevenueAllocationExtractor,
) -> AccountEndState:
    detail = extractor.current_saisetsu
    return AccountEndState(
        account_code=account_code,
        kan_code=extractor.current_kan.code if extractor.current_kan else "",
        kou_code=extractor.current_kou.code if extractor.current_kou else "",
        moku_code=(
            extractor.current_moku.code if extractor.current_moku else ""
        ),
        setsu_code=(
            extractor.current_setsu.code if extractor.current_setsu else ""
        ),
        saisetsu_code=detail.code if detail else "",
        saisetsu_name=detail.name if detail else "",
        saisetsu_amount_thousand_yen=(
            detail.amount_thousand_yen if detail else None
        ),
        allocation_count=detail.allocation_count if detail else 0,
    )


def extract_full_revenue_allocations(
    pdf: Any,
    source_file: str,
    accounts: tuple[FullRevenueAccount, ...],
) -> FullExtractionResult:
    records: list[dict[str, Any]] = []
    page_summaries: list[FullPageSummary] = []
    account_end_states: list[AccountEndState] = []

    for account_index, account in enumerate(accounts, start=1):
        extractor = FullStatefulRevenueAllocationExtractor(
            source_file=source_file,
            account=account.extraction_account,
        )
        for pdf_page in range(
            account.extraction_account.revenue_pdf_page_start,
            account.extraction_account.revenue_pdf_page_end + 1,
        ):
            page = pdf.pages[pdf_page - 1]
            page_text = page.extract_text() or ""
            marker_count = count_allocation_markers(page_text)
            start_record_count = len(extractor.records)
            summary = extractor.process_page(
                page=page,
                pdf_page=pdf_page,
                no_allocation_expected=False,
            )
            detected_book_page = extract_footer_budget_book_page(page)
            expected_book_page = expected_budget_book_page(
                account,
                pdf_page,
            )
            page_records = extractor.records[start_record_count:]
            for record in page_records:
                record["budget_book_page"] = detected_book_page or ""
                record["_account_index"] = account_index
            parsed_count = sum(
                record["parse_status"] == "parsed"
                for record in page_records
            )
            page_summaries.append(
                FullPageSummary(
                    account_code=account.account_code,
                    pdf_page=pdf_page,
                    expected_budget_book_page=expected_book_page,
                    detected_budget_book_page=detected_book_page,
                    source_allocation_marker_count=marker_count,
                    output_row_count=len(page_records),
                    parsed_count=parsed_count,
                    needs_review_count=len(page_records) - parsed_count,
                    table_detected=summary.table_detected,
                    page_type=classify_page(
                        summary.table_detected,
                        marker_count,
                        len(page_records),
                    ),
                )
            )

        account_end_states.append(
            snapshot_account_end_state(account.account_code, extractor)
        )
        for record in extractor.records:
            normalized = {
                column: record[column] for column in CSV_COLUMNS
            }
            normalized["_detail_uid"] = record["_detail_uid"]
            normalized["_account_index"] = account_index
            records.append(normalized)

    return FullExtractionResult(
        records=records,
        page_summaries=tuple(page_summaries),
        account_end_states=tuple(account_end_states),
    )


def calculate_full_metrics(
    result: FullExtractionResult,
) -> FullExtractionMetrics:
    account_pages: collections.Counter[str] = collections.Counter()
    account_rows: collections.Counter[str] = collections.Counter()
    account_markers: collections.Counter[str] = collections.Counter()
    page_types: collections.Counter[str] = collections.Counter()
    review_causes: collections.Counter[str] = collections.Counter()
    detail_rows: collections.Counter[
        tuple[str, int]
    ] = collections.Counter()

    for summary in result.page_summaries:
        account_pages[summary.account_code] += 1
        account_markers[summary.account_code] += (
            summary.source_allocation_marker_count
        )
        page_types[summary.page_type] += 1
    for record in result.records:
        account_code = str(record["account_code"])
        account_rows[account_code] += 1
        detail_uid = int(record["_detail_uid"])
        if detail_uid > 0:
            detail_rows[(account_code, detail_uid)] += 1
        if record["parse_status"] == "needs_review":
            review_causes.update(
                cause
                for cause in str(record["parse_note"]).split(";")
                if cause
            )

    return FullExtractionMetrics(
        page_count=len(result.page_summaries),
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
        multiple_allocation_detail_count=sum(
            count > 1 for count in detail_rows.values()
        ),
        account_page_counts=dict(sorted(account_pages.items())),
        account_row_counts=dict(sorted(account_rows.items())),
        account_marker_counts=dict(sorted(account_markers.items())),
        page_type_counts=dict(sorted(page_types.items())),
        review_cause_counts=dict(sorted(review_causes.items())),
    )


def issue(
    error_code: str,
    message: str,
    *,
    account_code: str = "",
    pdf_page: int | None = None,
    raw_allocation_id: str = "",
    expected: Any = "",
    actual: Any = "",
) -> ValidationIssue:
    return ValidationIssue(
        error_code=error_code,
        account_code=account_code,
        pdf_page=pdf_page,
        raw_allocation_id=raw_allocation_id,
        expected=str(expected),
        actual=str(actual),
        message=message,
    )


def validate_full_extraction(
    result: FullExtractionResult,
    metrics: FullExtractionMetrics,
    accounts: tuple[FullRevenueAccount, ...],
) -> list[ValidationIssue]:
    issues: list[ValidationIssue] = []
    expected_page_count = sum(
        account.extraction_account.revenue_pdf_page_end
        - account.extraction_account.revenue_pdf_page_start
        + 1
        for account in accounts
    )
    if metrics.page_count != expected_page_count:
        issues.append(
            issue(
                "page_count_mismatch",
                "設定範囲の全物理ページを処理できていません。",
                expected=expected_page_count,
                actual=metrics.page_count,
            )
        )
    if metrics.unique_raw_allocation_id_count != metrics.row_count:
        issues.append(
            issue(
                "raw_allocation_id_duplicate",
                "raw_allocation_idが一意ではありません。",
                expected=metrics.row_count,
                actual=metrics.unique_raw_allocation_id_count,
            )
        )
    if FORBIDDEN_COLUMNS & set(CSV_COLUMNS):
        issues.append(
            issue(
                "forbidden_column_present",
                "禁止列が出力スキーマに含まれています。",
                expected="none",
                actual=",".join(
                    sorted(FORBIDDEN_COLUMNS & set(CSV_COLUMNS))
                ),
            )
        )

    account_by_code = {
        account.account_code: account for account in accounts
    }
    expected_book_by_page: dict[tuple[str, int], int] = {}
    for summary in result.page_summaries:
        expected_book_by_page[
            (summary.account_code, summary.pdf_page)
        ] = summary.expected_budget_book_page
        if (
            summary.source_allocation_marker_count
            != summary.output_row_count
        ):
            issues.append(
                issue(
                    "page_allocation_marker_mismatch",
                    "PDFの充当事業記載数と出力行数が不一致です。",
                    account_code=summary.account_code,
                    pdf_page=summary.pdf_page,
                    expected=summary.source_allocation_marker_count,
                    actual=summary.output_row_count,
                )
            )
        if summary.detected_budget_book_page is None:
            issues.append(
                issue(
                    "budget_book_page_missing",
                    "ページフッターから冊子ページを取得できません。",
                    account_code=summary.account_code,
                    pdf_page=summary.pdf_page,
                    expected=summary.expected_budget_book_page,
                    actual="missing",
                )
            )
        elif (
            summary.detected_budget_book_page
            != summary.expected_budget_book_page
        ):
            issues.append(
                issue(
                    "budget_book_page_mismatch",
                    "フッターと検証済み対応関数の冊子ページが不一致です。",
                    account_code=summary.account_code,
                    pdf_page=summary.pdf_page,
                    expected=summary.expected_budget_book_page,
                    actual=summary.detected_budget_book_page,
                )
            )
        if summary.page_type == "table_detection_failed":
            issues.append(
                issue(
                    "table_detection_failed",
                    "充当事業記載ページの表を検出できません。",
                    account_code=summary.account_code,
                    pdf_page=summary.pdf_page,
                    expected=summary.source_allocation_marker_count,
                    actual=summary.output_row_count,
                )
            )

    seen_ids: set[str] = set()
    detail_rows: dict[
        tuple[str, int],
        list[dict[str, Any]],
    ] = collections.defaultdict(list)
    for record in result.records:
        account_code = str(record["account_code"])
        pdf_page = int(record["pdf_page"])
        raw_id = str(record["raw_allocation_id"])
        if raw_id in seen_ids:
            issues.append(
                issue(
                    "raw_allocation_id_duplicate",
                    "raw_allocation_idが重複しています。",
                    account_code=account_code,
                    pdf_page=pdf_page,
                    raw_allocation_id=raw_id,
                )
            )
        seen_ids.add(raw_id)
        if record["parse_status"] != "parsed":
            issues.append(
                issue(
                    "parse_needs_review",
                    f"抽出行がparsedではありません: {record['parse_note']}",
                    account_code=account_code,
                    pdf_page=pdf_page,
                    raw_allocation_id=raw_id,
                    expected="parsed",
                    actual=record["parse_status"],
                )
            )
        expected_book = expected_book_by_page.get(
            (account_code, pdf_page)
        )
        if record["budget_book_page"] != expected_book:
            issues.append(
                issue(
                    "record_budget_book_page_mismatch",
                    "出力行の冊子ページが対応関数と一致しません。",
                    account_code=account_code,
                    pdf_page=pdf_page,
                    raw_allocation_id=raw_id,
                    expected=expected_book,
                    actual=record["budget_book_page"],
                )
            )
        target_page = record["target_budget_book_page"]
        account = account_by_code[account_code]
        if (
            not isinstance(target_page, int)
            or not (
                account.extraction_account.expenditure_book_page_start
                <= target_page
                <= account.extraction_account.expenditure_book_page_end
            )
        ):
            issues.append(
                issue(
                    "target_budget_book_page_invalid",
                    "充当先冊子ページが未取得または対象歳出範囲外です。",
                    account_code=account_code,
                    pdf_page=pdf_page,
                    raw_allocation_id=raw_id,
                    expected=(
                        f"{account.extraction_account.expenditure_book_page_start}"
                        "-"
                        f"{account.extraction_account.expenditure_book_page_end}"
                    ),
                    actual=target_page,
                )
            )
        detail_uid = int(record["_detail_uid"])
        if detail_uid > 0:
            detail_rows[(account_code, detail_uid)].append(record)

    for (account_code, _), rows in detail_rows.items():
        sequences = [
            int(record["allocation_sequence"]) for record in rows
        ]
        expected_sequences = list(range(1, len(rows) + 1))
        if sequences != expected_sequences:
            first = rows[0]
            issues.append(
                issue(
                    "allocation_sequence_invalid",
                    "細節内のallocation_sequenceが連番ではありません。",
                    account_code=account_code,
                    pdf_page=int(first["pdf_page"]),
                    raw_allocation_id=str(first["raw_allocation_id"]),
                    expected=expected_sequences,
                    actual=sequences,
                )
            )
        for record in rows:
            sequence = int(record["allocation_sequence"])
            amount = record["pdf_revenue_amount_thousand_yen"]
            if sequence == 1 and not isinstance(amount, int):
                issues.append(
                    issue(
                        "first_allocation_amount_missing",
                        "allocation_sequence=1に細節金額がありません。",
                        account_code=account_code,
                        pdf_page=int(record["pdf_page"]),
                        raw_allocation_id=str(
                            record["raw_allocation_id"]
                        ),
                        expected="integer",
                        actual=amount,
                    )
                )
            if sequence > 1 and amount != "":
                issues.append(
                    issue(
                        "allocation_amount_duplicated",
                        "複数充当先の2行目以降に細節金額が複製されています。",
                        account_code=account_code,
                        pdf_page=int(record["pdf_page"]),
                        raw_allocation_id=str(
                            record["raw_allocation_id"]
                        ),
                        expected="blank",
                        actual=amount,
                    )
                )

    fixed_pages = {
        ("general", 53): 99,
        ("long_term_care_insurance", 358): 709,
    }
    for key, expected_book in fixed_pages.items():
        summaries = [
            summary
            for summary in result.page_summaries
            if (summary.account_code, summary.pdf_page) == key
        ]
        if (
            len(summaries) != 1
            or summaries[0].detected_budget_book_page != expected_book
        ):
            issues.append(
                issue(
                    "fixed_budget_book_page_regression",
                    "固定冊子ページ回帰に失敗しました。",
                    account_code=key[0],
                    pdf_page=key[1],
                    expected=expected_book,
                    actual=(
                        summaries[0].detected_budget_book_page
                        if summaries
                        else "missing"
                    ),
                )
            )
    return issues


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def markdown_escape(value: Any) -> str:
    return str(value).replace("|", "\\|").replace("\n", "<br>")


def render_full_report(
    gate: Phase26GateResult,
    result: FullExtractionResult,
    metrics: FullExtractionMetrics,
    issues: list[ValidationIssue],
    output_path: Path,
    output_hash: str,
) -> str:
    final_status = "PASS" if not issues else "FAIL"
    account_rows = []
    for account_code in ACTIVE_ACCOUNT_CODES:
        account_summaries = [
            summary
            for summary in result.page_summaries
            if summary.account_code == account_code
        ]
        account_rows.append(
            "| "
            f"`{account_code}` | "
            f"{len(account_summaries):,} | "
            f"{sum(s.source_allocation_marker_count for s in account_summaries):,} | "
            f"{metrics.account_row_counts.get(account_code, 0):,} | "
            f"{sum(s.needs_review_count for s in account_summaries):,} | "
            f"{sum(s.detected_budget_book_page != s.expected_budget_book_page for s in account_summaries):,} |"
        )

    page_rows = [
        "| "
        f"`{summary.account_code}` | "
        f"{summary.pdf_page} | "
        f"{summary.expected_budget_book_page} | "
        f"{summary.detected_budget_book_page or '-'} | "
        f"{summary.source_allocation_marker_count:,} | "
        f"{summary.output_row_count:,} | "
        f"{summary.needs_review_count:,} | "
        f"`{summary.page_type}` | "
        f"{'一致' if summary.source_allocation_marker_count == summary.output_row_count else '不一致'} |"
        for summary in result.page_summaries
    ]
    if issues:
        issue_rows = [
            "| "
            f"`{entry.error_code}` | "
            f"`{entry.account_code or '-'}` | "
            f"{entry.pdf_page or '-'} | "
            f"`{entry.raw_allocation_id or '-'}` | "
            f"{markdown_escape(entry.expected)} | "
            f"{markdown_escape(entry.actual)} | "
            f"{markdown_escape(entry.message)} |"
            for entry in issues
        ]
    else:
        issue_rows = ["| - | - | - | - | - | - | 0件 |"]

    state_rows = [
        "| "
        f"`{state.account_code}` | "
        f"{state.kan_code or '-'} | "
        f"{state.kou_code or '-'} | "
        f"{state.moku_code or '-'} | "
        f"{state.setsu_code or '-'} | "
        f"{state.saisetsu_code or '-'} | "
        f"{markdown_escape(state.saisetsu_name or '-')} | "
        f"{state.saisetsu_amount_thousand_yen if state.saisetsu_amount_thousand_yen is not None else '-'} | "
        f"{state.allocation_count} |"
        for state in result.account_end_states
    ]

    pdf67 = gate.pdf67_record
    return "\n".join(
        [
            "# 歳入PDF「充当事業」全体抽出レポート",
            "",
            f"## 最終判定: {final_status}",
            "",
            "- 対象は一般会計、国民健康保険事業会計、後期高齢者医療会計、介護保険事業会計の歳入PDF範囲。",
            "- 学校給食費会計は`abolished_zero`のためPDF抽出対象外。",
            "- 会計ごとに先頭物理ページから末尾物理ページまで連続処理した。",
            "- OCRは使用せず、PDFテキスト層と表座標を使用した。",
            "- CSV側の`revenue_detail_id`、歳出`budget_program_group_id`とは結合していない。",
            "- 充当先別金額は推測せず、`allocation_amount_thousand_yen`も作成していない。",
            "",
            "## Phase 26必須ゲート",
            "",
            "| 項目 | 結果 |",
            "| --- | ---: |",
            f"| 対象物理ページ | {gate.metrics.selected_page_count:,} |",
            f"| PDFの充当事業記載数 | {gate.metrics.source_allocation_marker_count:,} |",
            f"| 出力行数 | {gate.metrics.row_count:,} |",
            f"| parsed | {gate.metrics.parsed_count:,} |",
            f"| needs_review | {gate.metrics.needs_review_count:,} |",
            f"| raw_allocation_id一意数 | {gate.metrics.unique_raw_allocation_id_count:,} |",
            f"| 既存parsed行の想定外差分 | {gate.regression.unexpected_changed_parsed_row_count:,} |",
            "",
            "PDF物理67ページ固定回帰:",
            "",
            f"- `saisetsu_code`: `{pdf67['saisetsu_code']}`",
            f"- `pdf_revenue_detail_name`: {pdf67['pdf_revenue_detail_name']}",
            f"- `pdf_department_name`: {pdf67['pdf_department_name']}",
            f"- `pdf_revenue_amount_thousand_yen`: {pdf67['pdf_revenue_amount_thousand_yen']:,}",
            f"- `pdf_target_program_name`: {pdf67['pdf_target_program_name']}",
            f"- `target_budget_book_page`: {pdf67['target_budget_book_page']}",
            f"- `parse_status`: `{pdf67['parse_status']}`",
            "",
            "ゲートが全条件を満たした後にだけ全ページ処理を開始した。",
            "",
            "## 全体抽出結果",
            "",
            "| 項目 | 結果 |",
            "| --- | ---: |",
            f"| 対象物理ページ | {metrics.page_count:,} |",
            f"| PDFの充当事業記載数 | {metrics.source_allocation_marker_count:,} |",
            f"| 出力行数 | {metrics.row_count:,} |",
            f"| raw_allocation_id一意数 | {metrics.unique_raw_allocation_id_count:,} |",
            f"| parsed | {metrics.parsed_count:,} |",
            f"| needs_review | {metrics.needs_review_count:,} |",
            f"| 複数充当先を持つ細節 | {metrics.multiple_allocation_detail_count:,} |",
            f"| 検証エラー | {len(issues):,} |",
            "",
            "| account_code | 物理ページ | PDF記載 | 出力行 | needs_review | 冊子ページ検証エラー |",
            "| --- | ---: | ---: | ---: | ---: | ---: |",
            *account_rows,
            "",
            f"- 出力: `{output_path.as_posix()}`",
            f"- 出力SHA-256: `{output_hash}`",
            "",
            "## ページ種別",
            "",
            "| page_type | ページ数 |",
            "| --- | ---: |",
            *[
                f"| `{page_type}` | {count:,} |"
                for page_type, count in metrics.page_type_counts.items()
            ],
            "",
            "## ページ別照合",
            "",
            "| account_code | PDF物理ページ | 期待冊子ページ | フッター冊子ページ | PDF記載 | 出力行 | needs_review | page_type | 記載数判定 |",
            "| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |",
            *page_rows,
            "",
            "PDF物理53ページは冊子99ページ、PDF物理358ページは冊子709ページとして検証済み。",
            "",
            "## 会計終了時state",
            "",
            "| account_code | 款 | 項 | 目 | 節 | 細節 | 細節名 | 金額（千円） | 充当事業数 |",
            "| --- | --- | --- | --- | --- | --- | --- | ---: | ---: |",
            *state_rows,
            "",
            "ページ末尾ではstateを閉じず、会計末尾でこの状態を確定した。",
            "",
            "## 検証エラー",
            "",
            "| 原因コード | account_code | PDFページ | raw_allocation_id | 期待値 | 実際値 | 内容 |",
            "| --- | --- | ---: | --- | --- | --- | --- |",
            *issue_rows,
            "",
            "## 金額複製防止",
            "",
            "- 同一細節の`allocation_sequence=1`だけに細節金額を保持。",
            "- `allocation_sequence=2`以降の金額欄は全件空欄。",
            "- 充当先別の配分額は保持・推測していない。",
            "",
            "## このPhaseで作成していないもの",
            "",
            "- `processed/budget_revenue_allocations.csv`",
            "- CSV側`revenue_detail_id`との結合",
            "- 歳出`budget_program_group_id`との結合",
            "- 充当先別金額",
            "",
        ]
    )


def write_failure_report(
    path: Path,
    message: str,
) -> None:
    write_notes(
        path,
        "\n".join(
            [
                "# 歳入PDF「充当事業」全体抽出レポート",
                "",
                "## 最終判定: FAIL",
                "",
                "全ページ処理前のPhase 26必須ゲートで停止した。",
                "",
                f"- 原因: {message}",
                "",
            ]
        ),
    )


def main() -> None:
    repo_root = Path(__file__).resolve().parents[3]
    parser = argparse.ArgumentParser(
        description=(
            "Phase 26固定ゲート後に歳入PDFの充当事業を全範囲抽出します。"
        )
    )
    parser.add_argument(
        "--pdf",
        type=Path,
        default=repo_root / "raw" / "r8tousyoyosanallpage.pdf",
    )
    parser.add_argument(
        "--sample",
        type=Path,
        default=(
            repo_root
            / "processed"
            / "raw_pdf_revenue_allocations_sample.csv"
        ),
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
            / "processed"
            / "raw_pdf_revenue_allocations.csv"
        ),
    )
    parser.add_argument(
        "--report",
        type=Path,
        default=(
            repo_root
            / "docs"
            / "pdf_revenue_allocation_full_extraction_report.md"
        ),
    )
    args = parser.parse_args(
        [argument for argument in sys.argv[1:] if argument != "--"]
    )
    args.pdf = resolve_path(args.pdf, repo_root)
    args.sample = resolve_path(args.sample, repo_root)
    args.config = resolve_path(args.config, repo_root)
    args.output = resolve_path(args.output, repo_root)
    args.report = resolve_path(args.report, repo_root)

    extraction_accounts = load_revenue_accounts(args.config)
    full_accounts = load_full_revenue_accounts(args.config)
    phase25_rows = read_phase25_sample(args.sample)

    with pdfplumber.open(args.pdf) as pdf:
        try:
            gate = run_phase26_gate(
                pdf=pdf,
                source_file=args.pdf.name,
                accounts=extraction_accounts,
                phase25_rows=phase25_rows,
            )
        except ValueError as error:
            write_failure_report(args.report, str(error))
            raise

        if max(
            account.extraction_account.revenue_pdf_page_end
            for account in full_accounts
        ) > len(pdf.pages):
            raise ValueError("設定した歳入範囲がPDFページ数を超えています。")
        result = extract_full_revenue_allocations(
            pdf=pdf,
            source_file=args.pdf.name,
            accounts=full_accounts,
        )

    metrics = calculate_full_metrics(result)
    issues = validate_full_extraction(result, metrics, full_accounts)
    output_temporary = args.output.with_name(
        f".{args.output.name}.{os.getpid()}.tmp"
    )
    report_temporary = args.report.with_name(
        f".{args.report.name}.{os.getpid()}.tmp"
    )
    try:
        write_sample_csv(output_temporary, result.records)
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
        output_hash = sha256_file(output_temporary)
        report = render_full_report(
            gate=gate,
            result=result,
            metrics=metrics,
            issues=issues,
            output_path=args.output,
            output_hash=output_hash,
        )
        write_notes(report_temporary, report)
        args.report.parent.mkdir(parents=True, exist_ok=True)
        if issues:
            os.replace(report_temporary, args.report)
            raise ValueError(
                f"Phase 27 FAIL: 検証エラー{len(issues)}件。"
            )
        args.output.parent.mkdir(parents=True, exist_ok=True)
        os.replace(output_temporary, args.output)
        os.replace(report_temporary, args.report)
    finally:
        output_temporary.unlink(missing_ok=True)
        report_temporary.unlink(missing_ok=True)

    print("Phase 26 gate: PASS")
    print(f"Processed PDF pages: {metrics.page_count}")
    print(
        f"Allocations: {metrics.row_count} "
        f"(parsed={metrics.parsed_count}, "
        f"needs_review={metrics.needs_review_count})"
    )
    print(
        "Source allocation markers: "
        f"{metrics.source_allocation_marker_count}"
    )
    print(
        "Unique raw_allocation_id: "
        f"{metrics.unique_raw_allocation_id_count}"
    )
    print(f"Account rows: {metrics.account_row_counts}")
    print(f"Page types: {metrics.page_type_counts}")
    print(f"Validation errors: {len(issues)}")
    print(f"Output SHA-256: {output_hash}")
    print(f"Output: {args.output}")
    print(f"Report: {args.report}")


if __name__ == "__main__":
    main()
