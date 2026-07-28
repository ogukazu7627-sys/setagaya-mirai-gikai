#!/usr/bin/env python3
"""一般会計歳出の節別内訳をページ間状態を保持して抽出する。"""

from __future__ import annotations

import argparse
import collections
import re
import unicodedata
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from extract_pdf_sections_sample import (
    ACCOUNT_NAME,
    BUDGET_SIDE,
    FISCAL_YEAR,
    HierarchyValue,
    MokuRecord,
    extract_budget_book_page,
    extract_header_hierarchy,
    extract_moku_records,
    find_budget_tables,
    infer_hierarchy_value,
    normalize_compact_text,
    parse_amount,
    parse_code_and_name,
    write_csv,
)


GENERAL_ACCOUNT_EXPENDITURE_START_PAGE = 159
GENERAL_ACCOUNT_EXPENDITURE_END_PAGE = 243
EXPECTED_GENERAL_ACCOUNT_TOTAL = 431_353_010

PAGE_TYPE_SUMMARY = "summary_page"
PAGE_TYPE_DETAIL = "detail_page"
PAGE_TYPE_CONTINUATION = "continuation_page"
PAGE_TYPE_TABLE_FAILED = "table_detection_failed"

CAUSE_MOKU_TOTAL_MISMATCH = "moku_total_mismatch"
CAUSE_SECTION_VALUE_PARSE = "section_value_parse_failure"
CAUSE_CONTINUATION_WITHOUT_MOKU = "continuation_without_current_moku"
CAUSE_TABLE_FAILED_IN_SPAN = "table_detection_failed_in_moku_span"
CAUSE_HIERARCHY_MISSING = "hierarchy_context_missing"
CAUSE_BUDGET_BOOK_PAGE_MISSING = "budget_book_page_missing"
CAUSE_MOKU_WITHOUT_SECTIONS = "moku_without_sections"
CAUSE_DUPLICATE_MOKU = "duplicate_moku_key"


@dataclass(frozen=True)
class PageSectionRow:
    y_start: float
    code: str | None
    name: str | None
    amount_thousand_yen: int | None
    raw_text: str
    parse_cause: str | None = None


@dataclass(frozen=True)
class PageLayout:
    pdf_page: int
    budget_book_page: int | None
    page_type: str
    kan: HierarchyValue | None
    kou: HierarchyValue | None
    moku_boundaries: tuple[MokuRecord, ...]
    section_rows: tuple[PageSectionRow, ...]
    has_leading_continuation: bool
    table_error: str | None = None


@dataclass
class PendingSection:
    record: dict[str, Any]
    causes: set[str] = field(default_factory=set)


@dataclass
class ActiveMoku:
    kan: HierarchyValue
    kou: HierarchyValue
    code: str
    name: str
    total_amount_thousand_yen: int
    start_pdf_page: int
    start_budget_book_page: int | None
    last_context_page: int
    sections: list[PendingSection] = field(default_factory=list)
    causes: set[str] = field(default_factory=set)


@dataclass(frozen=True)
class MokuValidation:
    key: tuple[str, str, str]
    name: str
    start_pdf_page: int
    end_pdf_page: int
    section_count: int
    section_sum_thousand_yen: int
    moku_total_amount_thousand_yen: int
    amount_matched: bool
    parse_status: str
    causes: tuple[str, ...]


@dataclass(frozen=True)
class StatefulExtractionResult:
    records: list[dict[str, Any]]
    page_layouts: list[PageLayout]
    moku_validations: list[MokuValidation]


@dataclass(frozen=True)
class StatefulExtractionMetrics:
    row_count: int
    parsed_count: int
    needs_review_count: int
    moku_count: int
    matched_moku_count: int
    mismatched_moku_count: int
    moku_match_rate: float
    moku_total_sum_thousand_yen: int
    section_amount_sum_thousand_yen: int
    page_type_counts: dict[str, int]
    summary_pages: tuple[int, ...]
    table_detection_failed_pages: tuple[int, ...]
    review_cause_counts: dict[str, int]


def has_explanation_text(value: str | None) -> bool:
    if not value:
        return False
    return normalize_compact_text(value) not in {"", "説明"}


def extract_page_section_rows(section_table: Any) -> list[PageSectionRow]:
    section_rows: list[PageSectionRow] = []
    for row, values in zip(section_table.rows, section_table.extract()):
        if len(values) < 2:
            continue

        raw_category = values[0] or ""
        raw_amount = values[1] or ""
        compact_category = normalize_compact_text(raw_category)
        if compact_category in {"節", "区分"}:
            continue
        if not raw_category and not raw_amount:
            continue

        section = parse_code_and_name(raw_category)
        amount = parse_amount(raw_amount)
        parse_cause = None
        if section is None or amount is None:
            parse_cause = CAUSE_SECTION_VALUE_PARSE

        section_rows.append(
            PageSectionRow(
                y_start=row.bbox[1],
                code=section.code if section else None,
                name=section.name if section else None,
                amount_thousand_yen=amount,
                raw_text=f"{raw_category} | {raw_amount}",
                parse_cause=parse_cause,
            )
        )
    return section_rows


def infer_page_hierarchy(
    page_text: str,
    hierarchy_table: Any,
    moku_boundaries: list[MokuRecord],
) -> tuple[HierarchyValue | None, HierarchyValue | None]:
    kan, kou = extract_header_hierarchy(page_text)
    moku_values = [
        HierarchyValue(code=moku.code, name=moku.name)
        for moku in moku_boundaries
    ]
    if kan is None:
        kan = infer_hierarchy_value(hierarchy_table, 0, [])
    if kou is None:
        kou = infer_hierarchy_value(hierarchy_table, 1, moku_values)
    return kan, kou


def parse_page_layout(page: Any, pdf_page_number: int) -> PageLayout:
    page_text = page.extract_text() or ""
    header_kan, header_kou = extract_header_hierarchy(page_text)
    budget_book_page = extract_budget_book_page(page)

    try:
        hierarchy_table, section_table = find_budget_tables(page)
    except ValueError as error:
        return PageLayout(
            pdf_page=pdf_page_number,
            budget_book_page=budget_book_page,
            page_type=PAGE_TYPE_TABLE_FAILED,
            kan=header_kan,
            kou=header_kou,
            moku_boundaries=(),
            section_rows=(),
            has_leading_continuation=False,
            table_error=str(error),
        )

    moku_boundaries = extract_moku_records(hierarchy_table)
    section_rows = extract_page_section_rows(section_table)
    kan, kou = infer_page_hierarchy(
        page_text,
        hierarchy_table,
        moku_boundaries,
    )

    section_table_rows = list(zip(section_table.rows, section_table.extract()))
    explanation_present = any(
        len(values) >= 3 and has_explanation_text(values[2])
        for _, values in section_table_rows
    )
    first_moku_y = min(
        (moku.y_start for moku in moku_boundaries),
        default=None,
    )
    leading_section = (
        first_moku_y is not None
        and any(
            section.y_start < first_moku_y - 0.75
            for section in section_rows
        )
    )
    leading_explanation = (
        first_moku_y is not None
        and any(
            row.bbox[1] < first_moku_y - 0.75
            and len(values) >= 3
            and has_explanation_text(values[2])
            for row, values in section_table_rows
        )
    )
    has_leading_continuation = leading_section or leading_explanation

    if not moku_boundaries and not section_rows:
        page_type = (
            PAGE_TYPE_CONTINUATION
            if explanation_present
            else PAGE_TYPE_SUMMARY
        )
    elif (
        has_leading_continuation
        or (not moku_boundaries and bool(section_rows))
    ):
        page_type = PAGE_TYPE_CONTINUATION
    else:
        page_type = PAGE_TYPE_DETAIL

    return PageLayout(
        pdf_page=pdf_page_number,
        budget_book_page=budget_book_page,
        page_type=page_type,
        kan=kan,
        kou=kou,
        moku_boundaries=tuple(moku_boundaries),
        section_rows=tuple(section_rows),
        has_leading_continuation=has_leading_continuation,
    )


def hierarchy_differs(
    active: ActiveMoku,
    kan: HierarchyValue | None,
    kou: HierarchyValue | None,
) -> bool:
    if kan is not None and (kan.code, kan.name) != (
        active.kan.code,
        active.kan.name,
    ):
        return True
    return kou is not None and (kou.code, kou.name) != (
        active.kou.code,
        active.kou.name,
    )


def page_span(start_page: int, end_page: int) -> str:
    return (
        str(start_page)
        if start_page == end_page
        else f"{start_page}-{end_page}"
    )


class StatefulSectionExtractor:
    def __init__(
        self,
        source_file: str,
        account_name: str = ACCOUNT_NAME,
        fiscal_year: int = FISCAL_YEAR,
        budget_side: str = BUDGET_SIDE,
    ) -> None:
        self.source_file = source_file
        self.account_name = account_name
        self.fiscal_year = fiscal_year
        self.budget_side = budget_side
        self.current_kan: HierarchyValue | None = None
        self.current_kou: HierarchyValue | None = None
        self.current_moku: ActiveMoku | None = None
        self.records: list[dict[str, Any]] = []
        self.page_layouts: list[PageLayout] = []
        self.moku_validations: list[MokuValidation] = []
        self.seen_moku_keys: set[tuple[str, str, str]] = set()

    def process(self, layout: PageLayout) -> None:
        self.page_layouts.append(layout)

        if layout.page_type == PAGE_TYPE_TABLE_FAILED:
            if self.current_moku is not None:
                self.current_moku.causes.add(CAUSE_TABLE_FAILED_IN_SPAN)
                self.current_moku.last_context_page = layout.pdf_page
            return

        if layout.page_type == PAGE_TYPE_SUMMARY:
            self._process_summary_page(layout)
            return

        if (
            layout.has_leading_continuation
            and self.current_moku is not None
        ):
            self.current_moku.last_context_page = layout.pdf_page

        if not layout.moku_boundaries:
            for section in layout.section_rows:
                self._assign_section(section, layout)
            if self.current_moku is not None:
                self.current_moku.last_context_page = layout.pdf_page
            self._update_hierarchy_context(layout.kan, layout.kou)
            return

        events: list[tuple[float, int, str, Any]] = []
        events.extend(
            (moku.y_start, 0, "moku", moku)
            for moku in layout.moku_boundaries
        )
        events.extend(
            (section.y_start, 1, "section", section)
            for section in layout.section_rows
        )

        for _, _, event_type, value in sorted(events):
            if event_type == "moku":
                self._close_current_moku()
                self._open_moku(value, layout)
            else:
                self._assign_section(value, layout)

        self._update_hierarchy_context(layout.kan, layout.kou)

    def finish(self) -> StatefulExtractionResult:
        self._close_current_moku()
        return StatefulExtractionResult(
            records=self.records,
            page_layouts=self.page_layouts,
            moku_validations=self.moku_validations,
        )

    def _process_summary_page(self, layout: PageLayout) -> None:
        if (
            self.current_moku is not None
            and hierarchy_differs(
                self.current_moku,
                layout.kan,
                layout.kou,
            )
        ):
            self._close_current_moku()
        self._update_hierarchy_context(layout.kan, layout.kou)

    def _update_hierarchy_context(
        self,
        kan: HierarchyValue | None,
        kou: HierarchyValue | None,
    ) -> None:
        if kan is not None:
            if self.current_kan is not None and kan.code != self.current_kan.code:
                self.current_kou = None
            self.current_kan = kan
        if kou is not None:
            self.current_kou = kou

    def _open_moku(self, moku: MokuRecord, layout: PageLayout) -> None:
        kan = layout.kan or self.current_kan
        kou = layout.kou or self.current_kou
        causes: set[str] = set()
        if kan is None:
            kan = HierarchyValue("", "")
            causes.add(CAUSE_HIERARCHY_MISSING)
        if kou is None:
            kou = HierarchyValue("", "")
            causes.add(CAUSE_HIERARCHY_MISSING)

        self.current_moku = ActiveMoku(
            kan=kan,
            kou=kou,
            code=moku.code,
            name=moku.name,
            total_amount_thousand_yen=moku.total_amount_thousand_yen,
            start_pdf_page=layout.pdf_page,
            start_budget_book_page=layout.budget_book_page,
            last_context_page=layout.pdf_page,
            causes=causes,
        )
        self.current_kan = kan
        self.current_kou = kou

    def _assign_section(
        self,
        section: PageSectionRow,
        layout: PageLayout,
    ) -> None:
        if self.current_moku is None:
            self._append_orphan_section(section, layout)
            return

        row_causes: set[str] = set()
        if section.parse_cause is not None:
            row_causes.add(section.parse_cause)
        if layout.budget_book_page is None:
            row_causes.add(CAUSE_BUDGET_BOOK_PAGE_MISSING)

        self.current_moku.sections.append(
            PendingSection(
                record={
                    "source_file": self.source_file,
                    "pdf_page": layout.pdf_page,
                    "budget_book_page": layout.budget_book_page or "",
                    "fiscal_year": self.fiscal_year,
                    "account_name": self.account_name,
                    "budget_side": self.budget_side,
                    "kan_code": self.current_moku.kan.code,
                    "kan_name": self.current_moku.kan.name,
                    "kou_code": self.current_moku.kou.code,
                    "kou_name": self.current_moku.kou.name,
                    "moku_code": self.current_moku.code,
                    "moku_name": self.current_moku.name,
                    "moku_total_amount_thousand_yen": (
                        self.current_moku.total_amount_thousand_yen
                    ),
                    "setsu_code": section.code or "",
                    "setsu_name": section.name or "",
                    "setsu_amount_thousand_yen": (
                        section.amount_thousand_yen
                        if section.amount_thousand_yen is not None
                        else ""
                    ),
                    "raw_text": section.raw_text,
                    "parse_status": "",
                    "parse_note": "",
                },
                causes=row_causes,
            )
        )
        self.current_moku.last_context_page = layout.pdf_page

    def _append_orphan_section(
        self,
        section: PageSectionRow,
        layout: PageLayout,
    ) -> None:
        causes = {CAUSE_CONTINUATION_WITHOUT_MOKU}
        if section.parse_cause is not None:
            causes.add(section.parse_cause)
        if layout.budget_book_page is None:
            causes.add(CAUSE_BUDGET_BOOK_PAGE_MISSING)

        kan = layout.kan or self.current_kan
        kou = layout.kou or self.current_kou
        self.records.append(
            {
                "source_file": self.source_file,
                "pdf_page": layout.pdf_page,
                "budget_book_page": layout.budget_book_page or "",
                "fiscal_year": self.fiscal_year,
                "account_name": self.account_name,
                "budget_side": self.budget_side,
                "kan_code": kan.code if kan else "",
                "kan_name": kan.name if kan else "",
                "kou_code": kou.code if kou else "",
                "kou_name": kou.name if kou else "",
                "moku_code": "",
                "moku_name": "",
                "moku_total_amount_thousand_yen": "",
                "setsu_code": section.code or "",
                "setsu_name": section.name or "",
                "setsu_amount_thousand_yen": (
                    section.amount_thousand_yen
                    if section.amount_thousand_yen is not None
                    else ""
                ),
                "raw_text": section.raw_text,
                "parse_status": "needs_review",
                "parse_note": (
                    f"cause={'+'.join(sorted(causes))}; "
                    "ページ冒頭の節行に引継ぎ可能な目がない"
                ),
            }
        )

    def _close_current_moku(self) -> None:
        active = self.current_moku
        if active is None:
            return

        key = (active.kan.code, active.kou.code, active.code)
        causes = set(active.causes)
        if key in self.seen_moku_keys:
            causes.add(CAUSE_DUPLICATE_MOKU)
        self.seen_moku_keys.add(key)

        if not active.sections:
            causes.add(CAUSE_MOKU_WITHOUT_SECTIONS)
            active.sections.append(
                PendingSection(
                    record={
                        "source_file": self.source_file,
                        "pdf_page": active.start_pdf_page,
                        "budget_book_page": (
                            active.start_budget_book_page or ""
                        ),
                        "fiscal_year": self.fiscal_year,
                        "account_name": self.account_name,
                        "budget_side": self.budget_side,
                        "kan_code": active.kan.code,
                        "kan_name": active.kan.name,
                        "kou_code": active.kou.code,
                        "kou_name": active.kou.name,
                        "moku_code": active.code,
                        "moku_name": active.name,
                        "moku_total_amount_thousand_yen": (
                            active.total_amount_thousand_yen
                        ),
                        "setsu_code": "",
                        "setsu_name": "",
                        "setsu_amount_thousand_yen": "",
                        "raw_text": "",
                        "parse_status": "",
                        "parse_note": "",
                    },
                    causes={CAUSE_MOKU_WITHOUT_SECTIONS},
                )
            )

        valid_amounts = [
            pending.record["setsu_amount_thousand_yen"]
            for pending in active.sections
            if isinstance(
                pending.record["setsu_amount_thousand_yen"],
                int,
            )
        ]
        section_sum = sum(valid_amounts)
        amounts_complete = len(valid_amounts) == len(active.sections)
        amount_matched = (
            amounts_complete
            and section_sum == active.total_amount_thousand_yen
        )
        if not amount_matched:
            causes.add(CAUSE_MOKU_TOTAL_MISMATCH)

        row_causes = set().union(
            *(pending.causes for pending in active.sections)
        )
        all_causes = causes | row_causes
        parse_status = "parsed" if not all_causes else "needs_review"
        span = page_span(
            active.start_pdf_page,
            active.last_context_page,
        )

        for pending in active.sections:
            if parse_status == "parsed":
                note = (
                    "stateful_reconciliation=matched; "
                    f"section_sum={section_sum}; "
                    f"moku_total={active.total_amount_thousand_yen}; "
                    f"moku_page_span={span}"
                )
            else:
                note = (
                    f"cause={'+'.join(sorted(all_causes))}; "
                    f"section_sum={section_sum}; "
                    f"moku_total={active.total_amount_thousand_yen}; "
                    f"moku_page_span={span}"
                )
            pending.record["parse_status"] = parse_status
            pending.record["parse_note"] = note
            self.records.append(pending.record)

        self.moku_validations.append(
            MokuValidation(
                key=key,
                name=active.name,
                start_pdf_page=active.start_pdf_page,
                end_pdf_page=active.last_context_page,
                section_count=len(active.sections),
                section_sum_thousand_yen=section_sum,
                moku_total_amount_thousand_yen=(
                    active.total_amount_thousand_yen
                ),
                amount_matched=amount_matched,
                parse_status=parse_status,
                causes=tuple(sorted(all_causes)),
            )
        )
        self.current_moku = None


def extract_page_range(
    pdf: Any,
    source_file: str,
    start_page: int,
    end_page: int,
    account_name: str = ACCOUNT_NAME,
    fiscal_year: int = FISCAL_YEAR,
    budget_side: str = BUDGET_SIDE,
) -> StatefulExtractionResult:
    extractor = StatefulSectionExtractor(
        source_file=source_file,
        account_name=account_name,
        fiscal_year=fiscal_year,
        budget_side=budget_side,
    )
    for page_number in range(start_page, end_page + 1):
        extractor.process(
            parse_page_layout(pdf.pages[page_number - 1], page_number)
        )
    return extractor.finish()


def review_cause_from_note(note: str) -> str:
    if not note.startswith("cause="):
        return "unclassified_review"
    return note.removeprefix("cause=").split(";", maxsplit=1)[0]


def calculate_stateful_metrics(
    result: StatefulExtractionResult,
) -> StatefulExtractionMetrics:
    page_type_counts = collections.Counter(
        layout.page_type for layout in result.page_layouts
    )
    matched_moku_count = sum(
        validation.amount_matched
        for validation in result.moku_validations
    )
    moku_count = len(result.moku_validations)
    parsed_count = sum(
        record["parse_status"] == "parsed" for record in result.records
    )
    needs_review_count = sum(
        record["parse_status"] == "needs_review"
        for record in result.records
    )
    review_cause_counts = collections.Counter(
        review_cause_from_note(record["parse_note"])
        for record in result.records
        if record["parse_status"] == "needs_review"
    )
    return StatefulExtractionMetrics(
        row_count=len(result.records),
        parsed_count=parsed_count,
        needs_review_count=needs_review_count,
        moku_count=moku_count,
        matched_moku_count=matched_moku_count,
        mismatched_moku_count=moku_count - matched_moku_count,
        moku_match_rate=(
            matched_moku_count / moku_count if moku_count else 0
        ),
        moku_total_sum_thousand_yen=sum(
            validation.moku_total_amount_thousand_yen
            for validation in result.moku_validations
        ),
        section_amount_sum_thousand_yen=sum(
            record["setsu_amount_thousand_yen"]
            for record in result.records
            if isinstance(record["setsu_amount_thousand_yen"], int)
        ),
        page_type_counts=dict(sorted(page_type_counts.items())),
        summary_pages=tuple(
            layout.pdf_page
            for layout in result.page_layouts
            if layout.page_type == PAGE_TYPE_SUMMARY
        ),
        table_detection_failed_pages=tuple(
            layout.pdf_page
            for layout in result.page_layouts
            if layout.page_type == PAGE_TYPE_TABLE_FAILED
        ),
        review_cause_counts=dict(sorted(review_cause_counts.items())),
    )


def normalized_page_text(page: Any) -> str:
    text = unicodedata.normalize("NFKC", page.extract_text() or "")
    return re.sub(r"\s+", "", text)


def validate_general_account_scope(pdf: Any) -> None:
    if len(pdf.pages) <= GENERAL_ACCOUNT_EXPENDITURE_END_PAGE:
        raise ValueError("一般会計歳出の終端と次セクションを確認できません。")

    start_text = normalized_page_text(
        pdf.pages[GENERAL_ACCOUNT_EXPENDITURE_START_PAGE - 1]
    )
    end_text = normalized_page_text(
        pdf.pages[GENERAL_ACCOUNT_EXPENDITURE_END_PAGE - 1]
    )
    next_text = normalized_page_text(
        pdf.pages[GENERAL_ACCOUNT_EXPENDITURE_END_PAGE]
    )
    if "(款)01議会費" not in start_text or "歳出" not in start_text:
        raise ValueError("PDF 159ページを一般会計歳出の開始と確認できません。")
    if "(款)12予備費" not in end_text:
        raise ValueError("PDF 243ページを一般会計歳出の終端と確認できません。")
    if "給与費明細書" not in next_text:
        raise ValueError("PDF 244ページの給与費明細書への切替を確認できません。")


def extract_general_account_expenditure(
    input_path: Path,
    output_path: Path,
) -> tuple[StatefulExtractionResult, StatefulExtractionMetrics]:
    if not input_path.is_file():
        raise FileNotFoundError(f"入力PDFが見つかりません: {input_path}")

    try:
        import pdfplumber
    except ImportError as error:
        raise RuntimeError(
            "pdfplumber が必要です。requirements-pdf.txt をインストールしてください。"
        ) from error

    with pdfplumber.open(input_path) as pdf:
        validate_general_account_scope(pdf)
        result = extract_page_range(
            pdf=pdf,
            source_file=input_path.name,
            start_page=GENERAL_ACCOUNT_EXPENDITURE_START_PAGE,
            end_page=GENERAL_ACCOUNT_EXPENDITURE_END_PAGE,
        )

    write_csv(output_path, result.records)
    return result, calculate_stateful_metrics(result)


def build_argument_parser(repo_root: Path) -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--input",
        type=Path,
        default=repo_root / "raw" / "r8tousyoyosanallpage.pdf",
        help="入力PDF（既定: raw/r8tousyoyosanallpage.pdf）",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=repo_root / "processed" / "raw_pdf_sections.csv",
        help="出力CSV（既定: processed/raw_pdf_sections.csv）",
    )
    return parser


def main() -> None:
    repo_root = Path(__file__).resolve().parents[3]
    args = build_argument_parser(repo_root).parse_args()
    _, metrics = extract_general_account_expenditure(
        input_path=args.input,
        output_path=args.output,
    )

    print(
        "対象PDFページ: "
        f"{GENERAL_ACCOUNT_EXPENDITURE_START_PAGE}-"
        f"{GENERAL_ACCOUNT_EXPENDITURE_END_PAGE}"
    )
    print(
        "対象ページ数: "
        f"{GENERAL_ACCOUNT_EXPENDITURE_END_PAGE - GENERAL_ACCOUNT_EXPENDITURE_START_PAGE + 1}"
    )
    print("ページ分類:")
    for page_type, count in metrics.page_type_counts.items():
        print(f"  {page_type}: {count}")
    print(
        "正常スキップしたsummary_page: "
        + ", ".join(map(str, metrics.summary_pages))
    )
    print(
        "table_detection_failed: "
        + (
            ", ".join(map(str, metrics.table_detection_failed_pages))
            if metrics.table_detection_failed_pages
            else "0"
        )
    )
    print(f"抽出件数: {metrics.row_count}")
    print(f"parsed: {metrics.parsed_count}")
    print(f"needs_review: {metrics.needs_review_count}")
    print(
        "目別金額一致: "
        f"{metrics.matched_moku_count}/{metrics.moku_count} "
        f"({metrics.moku_match_rate:.1%})"
    )
    print(
        "moku_total_amount_thousand_yen合計: "
        f"{metrics.moku_total_sum_thousand_yen:,}"
    )
    print(
        "setsu_amount_thousand_yen合計: "
        f"{metrics.section_amount_sum_thousand_yen:,}"
    )
    if metrics.review_cause_counts:
        print("needs_review原因:")
        for cause, count in metrics.review_cause_counts.items():
            print(f"  {cause}: {count}")
    print(f"出力先: {args.output}")


if __name__ == "__main__":
    main()
