#!/usr/bin/env python3
"""既存のPDF節抽出方式を失敗しやすい10ページで追加検証する。"""

from __future__ import annotations

import argparse
import collections
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from extract_pdf_sections_sample import (
    ACCOUNT_NAME,
    BUDGET_SIDE,
    FISCAL_YEAR,
    extract_budget_book_page,
    extract_header_hierarchy,
    extract_page_records,
    write_csv,
)


EXTENDED_SAMPLE_PAGES = (160, 164, 169, 187, 196, 216, 220, 226, 229, 234)
MIN_EXTENDED_PAGES = 8
MAX_EXTENDED_PAGES = 12

CAUSE_SUMMARY_PAGE = "summary_page_no_section_rows"
CAUSE_PREVIOUS_PAGE = "continuation_without_previous_page_context"
CAUSE_NEXT_PAGE = "moku_total_mismatch_possible_next_page_continuation"
CAUSE_SECTION_PARSE = "section_value_parse_failure"
CAUSE_HIERARCHY = "hierarchy_context_missing"
CAUSE_BOOK_PAGE = "budget_book_page_missing"
CAUSE_TABLE = "table_detection_failure"
CAUSE_UNKNOWN = "unclassified_review"


@dataclass(frozen=True)
class ExtendedSampleMetrics:
    row_count: int
    parsed_count: int
    needs_review_count: int
    moku_count: int
    matched_moku_count: int
    mismatched_moku_count: int
    moku_match_rate: float
    review_cause_counts: dict[str, int]


def parse_extended_page_list(value: str) -> tuple[int, ...]:
    try:
        pages = tuple(int(part.strip()) for part in value.split(",") if part.strip())
    except ValueError as error:
        raise argparse.ArgumentTypeError(
            "ページ番号はカンマ区切りの整数で指定してください。"
        ) from error

    if not MIN_EXTENDED_PAGES <= len(pages) <= MAX_EXTENDED_PAGES:
        raise argparse.ArgumentTypeError(
            f"追加検証の対象は{MIN_EXTENDED_PAGES}〜"
            f"{MAX_EXTENDED_PAGES}ページにしてください。"
        )
    if len(set(pages)) != len(pages) or any(page <= 0 for page in pages):
        raise argparse.ArgumentTypeError(
            "ページ番号は重複のない正の整数にしてください。"
        )
    return pages


def classify_review_cause(record: dict[str, Any]) -> str:
    note = str(record.get("parse_note", ""))
    if "節行を目へ対応付けできない" in note:
        return CAUSE_PREVIOUS_PAGE
    if "節金額合計" in note and "一致しない" in note:
        return CAUSE_NEXT_PAGE
    if "節番号・節名称を解析できない" in note or "節金額を解析できない" in note:
        return CAUSE_SECTION_PARSE
    if "款を解析できない" in note or "項を解析できない" in note:
        return CAUSE_HIERARCHY
    if "予算説明書ページ番号を解析できない" in note:
        return CAUSE_BOOK_PAGE
    return CAUSE_UNKNOWN


def annotate_review_cause(record: dict[str, Any]) -> dict[str, Any]:
    if record["parse_status"] != "needs_review":
        return record

    cause = classify_review_cause(record)
    original_note = record["parse_note"]
    return {
        **record,
        "parse_note": f"cause={cause}; {original_note}",
    }


def page_header_excerpt(page_text: str) -> str:
    lines = [line.strip() for line in page_text.splitlines() if line.strip()]
    return " | ".join(lines[:6])


def build_page_review_record(
    page: Any,
    pdf_page_number: int,
    source_file: str,
    cause: str,
    detail: str,
) -> dict[str, Any]:
    page_text = page.extract_text() or ""
    kan, kou = extract_header_hierarchy(page_text)
    return {
        "source_file": source_file,
        "pdf_page": pdf_page_number,
        "budget_book_page": extract_budget_book_page(page) or "",
        "fiscal_year": FISCAL_YEAR,
        "account_name": ACCOUNT_NAME,
        "budget_side": BUDGET_SIDE,
        "kan_code": kan.code if kan else "",
        "kan_name": kan.name if kan else "",
        "kou_code": kou.code if kou else "",
        "kou_name": kou.name if kou else "",
        "moku_code": "",
        "moku_name": "",
        "moku_total_amount_thousand_yen": "",
        "setsu_code": "",
        "setsu_name": "",
        "setsu_amount_thousand_yen": "",
        "raw_text": page_header_excerpt(page_text),
        "parse_status": "needs_review",
        "parse_note": f"cause={cause}; {detail}",
    }


def extract_extended_page_records(
    page: Any,
    pdf_page_number: int,
    source_file: str,
) -> list[dict[str, Any]]:
    try:
        records = extract_page_records(page, pdf_page_number, source_file)
    except ValueError as error:
        return [
            build_page_review_record(
                page,
                pdf_page_number,
                source_file,
                CAUSE_TABLE,
                str(error),
            )
        ]

    if not records:
        return [
            build_page_review_record(
                page,
                pdf_page_number,
                source_file,
                CAUSE_SUMMARY_PAGE,
                "節行がない集計ページ",
            )
        ]
    return [annotate_review_cause(record) for record in records]


def review_cause_from_note(note: str) -> str:
    prefix = "cause="
    if not note.startswith(prefix):
        return CAUSE_UNKNOWN
    return note[len(prefix) :].split(";", maxsplit=1)[0]


def calculate_metrics(records: list[dict[str, Any]]) -> ExtendedSampleMetrics:
    moku_groups: dict[tuple[Any, ...], list[dict[str, Any]]] = (
        collections.defaultdict(list)
    )
    for record in records:
        if record["moku_code"] == "":
            continue
        key = (
            record["pdf_page"],
            record["kan_code"],
            record["kou_code"],
            record["moku_code"],
            record["moku_total_amount_thousand_yen"],
        )
        moku_groups[key].append(record)

    matched_moku_count = 0
    for key, group in moku_groups.items():
        amounts = [
            record["setsu_amount_thousand_yen"]
            for record in group
            if isinstance(record["setsu_amount_thousand_yen"], int)
        ]
        expected_total = key[-1]
        if len(amounts) == len(group) and sum(amounts) == expected_total:
            matched_moku_count += 1

    review_cause_counts = collections.Counter(
        review_cause_from_note(record["parse_note"])
        for record in records
        if record["parse_status"] == "needs_review"
    )
    moku_count = len(moku_groups)
    mismatched_moku_count = moku_count - matched_moku_count
    return ExtendedSampleMetrics(
        row_count=len(records),
        parsed_count=sum(
            record["parse_status"] == "parsed" for record in records
        ),
        needs_review_count=sum(
            record["parse_status"] == "needs_review" for record in records
        ),
        moku_count=moku_count,
        matched_moku_count=matched_moku_count,
        mismatched_moku_count=mismatched_moku_count,
        moku_match_rate=matched_moku_count / moku_count if moku_count else 0,
        review_cause_counts=dict(sorted(review_cause_counts.items())),
    )


def extract_extended_sample(
    input_path: Path,
    output_path: Path,
    pdf_pages: tuple[int, ...],
) -> tuple[list[dict[str, Any]], ExtendedSampleMetrics]:
    if not MIN_EXTENDED_PAGES <= len(pdf_pages) <= MAX_EXTENDED_PAGES:
        raise ValueError(
            f"追加検証は{MIN_EXTENDED_PAGES}〜"
            f"{MAX_EXTENDED_PAGES}ページに限定してください。"
        )
    if not input_path.is_file():
        raise FileNotFoundError(f"入力PDFが見つかりません: {input_path}")

    try:
        import pdfplumber
    except ImportError as error:
        raise RuntimeError(
            "pdfplumber が必要です。requirements-pdf.txt をインストールしてください。"
        ) from error

    records: list[dict[str, Any]] = []
    with pdfplumber.open(input_path) as pdf:
        if max(pdf_pages) > len(pdf.pages):
            raise ValueError(
                f"PDFは{len(pdf.pages)}ページですが、"
                f"{max(pdf_pages)}ページ目が指定されています。"
            )
        for page_number in pdf_pages:
            records.extend(
                extract_extended_page_records(
                    page=pdf.pages[page_number - 1],
                    pdf_page_number=page_number,
                    source_file=input_path.name,
                )
            )

    write_csv(output_path, records)
    return records, calculate_metrics(records)


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
        default=repo_root
        / "processed"
        / "raw_pdf_sections_sample_extended.csv",
        help="出力CSV（既定: processed/raw_pdf_sections_sample_extended.csv）",
    )
    parser.add_argument(
        "--pages",
        type=parse_extended_page_list,
        default=EXTENDED_SAMPLE_PAGES,
        help=(
            "PDFページ番号。8〜12件のカンマ区切り"
            "（既定: 160,164,169,187,196,216,220,226,229,234）"
        ),
    )
    return parser


def main() -> None:
    repo_root = Path(__file__).resolve().parents[3]
    args = build_argument_parser(repo_root).parse_args()
    _, metrics = extract_extended_sample(args.input, args.output, args.pages)

    print(f"対象PDFページ: {', '.join(map(str, args.pages))}")
    print(f"対象ページ数: {len(args.pages)}")
    print(f"出力行数: {metrics.row_count}")
    print(f"parsed: {metrics.parsed_count}")
    print(f"needs_review: {metrics.needs_review_count}")
    print(
        "目別金額一致: "
        f"{metrics.matched_moku_count}/{metrics.moku_count} "
        f"({metrics.moku_match_rate:.1%})"
    )
    print("needs_review原因:")
    for cause, count in metrics.review_cause_counts.items():
        print(f"  {cause}: {count}")
    print(f"出力先: {args.output}")


if __name__ == "__main__":
    main()
