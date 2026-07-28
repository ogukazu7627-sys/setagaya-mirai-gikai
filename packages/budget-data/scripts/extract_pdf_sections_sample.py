#!/usr/bin/env python3
"""令和8年度当初予算説明書から節別内訳を3ページ以内で試験抽出する。"""

from __future__ import annotations

import argparse
import csv
import re
import unicodedata
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable


FISCAL_YEAR = 2026
ACCOUNT_NAME = "一般会計"
BUDGET_SIDE = "expenditure"
DEFAULT_SAMPLE_PAGES = (159, 162, 166)
MAX_SAMPLE_PAGES = 3

CSV_COLUMNS = [
    "source_file",
    "pdf_page",
    "budget_book_page",
    "fiscal_year",
    "account_name",
    "budget_side",
    "kan_code",
    "kan_name",
    "kou_code",
    "kou_name",
    "moku_code",
    "moku_name",
    "moku_total_amount_thousand_yen",
    "setsu_code",
    "setsu_name",
    "setsu_amount_thousand_yen",
    "raw_text",
    "parse_status",
    "parse_note",
]


@dataclass(frozen=True)
class HierarchyValue:
    code: str
    name: str


@dataclass(frozen=True)
class MokuRecord:
    code: str
    name: str
    total_amount_thousand_yen: int
    y_start: float


def normalize_compact_text(value: str) -> str:
    """PDFの折返しや全角空白だけを除き、項目名を連結する。"""

    normalized = unicodedata.normalize("NFKC", value)
    return re.sub(r"\s+", "", normalized)


def parse_code_and_name(value: str) -> HierarchyValue | None:
    compact = normalize_compact_text(value)
    match = re.fullmatch(r"(\d{2})(.+)", compact)
    if not match:
        return None
    return HierarchyValue(code=match.group(1), name=match.group(2))


def parse_amount(value: str) -> int | None:
    normalized = unicodedata.normalize("NFKC", value).replace(",", "").strip()
    if not re.fullmatch(r"\d+", normalized):
        return None
    return int(normalized)


def parse_page_list(value: str) -> tuple[int, ...]:
    try:
        pages = tuple(int(part.strip()) for part in value.split(",") if part.strip())
    except ValueError as error:
        raise argparse.ArgumentTypeError(
            "ページ番号はカンマ区切りの整数で指定してください。"
        ) from error

    if not pages:
        raise argparse.ArgumentTypeError("ページ番号を1件以上指定してください。")
    if len(pages) > MAX_SAMPLE_PAGES:
        raise argparse.ArgumentTypeError(
            f"最小実験のため、対象は{MAX_SAMPLE_PAGES}ページ以内にしてください。"
        )
    if len(set(pages)) != len(pages) or any(page <= 0 for page in pages):
        raise argparse.ArgumentTypeError(
            "ページ番号は重複のない正の整数にしてください。"
        )
    return pages


def extract_header_hierarchy(page_text: str) -> tuple[
    HierarchyValue | None, HierarchyValue | None
]:
    header_line = next(
        (
            unicodedata.normalize("NFKC", line)
            for line in page_text.splitlines()
            if "(款)" in unicodedata.normalize("NFKC", line)
        ),
        "",
    )

    kan_match = re.search(
        r"\(款\)\s*(\d{2})\s*(.+?)(?=\s*\(項\)|\s*\(単位|$)",
        header_line,
    )
    kou_match = re.search(
        r"\(項\)\s*(\d{2})\s*(.+?)(?=\s*\(単位|$)",
        header_line,
    )

    kan = (
        HierarchyValue(kan_match.group(1), kan_match.group(2).strip())
        if kan_match
        else None
    )
    kou = (
        HierarchyValue(kou_match.group(1), kou_match.group(2).strip())
        if kou_match
        else None
    )
    return kan, kou


def table_text(table: Any) -> str:
    return "\n".join(
        str(cell)
        for row in table.extract()
        for cell in row
        if cell is not None
    )


def find_budget_tables(page: Any) -> tuple[Any, Any]:
    tables = page.find_tables()
    hierarchy_table = next(
        (
            table
            for table in tables
            if table.bbox[0] < page.width / 2 and "本年度" in table_text(table)
        ),
        None,
    )
    section_table = next(
        (
            table
            for table in tables
            if table.bbox[0] > page.width / 2 and "節" in table_text(table)
        ),
        None,
    )
    if hierarchy_table is None or section_table is None:
        raise ValueError("款項目表または節表を検出できませんでした。")
    return hierarchy_table, section_table


def extract_moku_records(hierarchy_table: Any) -> list[MokuRecord]:
    records: list[MokuRecord] = []
    for row, values in zip(hierarchy_table.rows, hierarchy_table.extract()):
        if len(values) < 4 or not values[2] or not values[3]:
            continue

        hierarchy = parse_code_and_name(values[2])
        amount = parse_amount(values[3])
        if hierarchy is None or amount is None:
            continue

        records.append(
            MokuRecord(
                code=hierarchy.code,
                name=hierarchy.name,
                total_amount_thousand_yen=amount,
                y_start=row.bbox[1],
            )
        )
    return records


def extract_hierarchy_candidates(
    hierarchy_table: Any, column_index: int
) -> list[HierarchyValue]:
    candidates: list[HierarchyValue] = []
    for values in hierarchy_table.extract():
        if len(values) <= column_index or not values[column_index]:
            continue
        for line in values[column_index].splitlines():
            parsed = parse_code_and_name(line)
            if parsed is not None:
                candidates.append(parsed)
    return candidates


def infer_hierarchy_value(
    hierarchy_table: Any,
    column_index: int,
    excluded: Iterable[HierarchyValue],
) -> HierarchyValue | None:
    candidates = extract_hierarchy_candidates(hierarchy_table, column_index)
    excluded_pairs = {(item.code, item.name) for item in excluded}
    remaining = [
        item for item in candidates if (item.code, item.name) not in excluded_pairs
    ]
    if remaining:
        return remaining[0]
    return candidates[0] if candidates else None


def choose_moku(moku_records: list[MokuRecord], row_y_start: float) -> MokuRecord | None:
    preceding = [
        moku for moku in moku_records if moku.y_start <= row_y_start + 0.75
    ]
    return max(preceding, key=lambda moku: moku.y_start) if preceding else None


def extract_budget_book_page(page: Any) -> int | None:
    footer_numbers = [
        word
        for word in page.extract_words()
        if word["x0"] > page.width / 2
        and word["top"] > page.height - 100
        and re.fullmatch(r"\d{3,4}", word["text"])
    ]
    if not footer_numbers:
        return None
    return int(max(footer_numbers, key=lambda word: word["x0"])["text"])


def append_note(current: str, note: str) -> str:
    return f"{current}; {note}" if current else note


def extract_page_records(
    page: Any,
    pdf_page_number: int,
    source_file: str,
) -> list[dict[str, Any]]:
    page_text = page.extract_text() or ""
    hierarchy_table, section_table = find_budget_tables(page)
    moku_records = extract_moku_records(hierarchy_table)
    kan, kou = extract_header_hierarchy(page_text)
    moku_values = [
        HierarchyValue(code=moku.code, name=moku.name) for moku in moku_records
    ]

    if kan is None:
        kan = infer_hierarchy_value(hierarchy_table, 0, [])
    if kou is None:
        kou = infer_hierarchy_value(hierarchy_table, 1, moku_values)

    budget_book_page = extract_budget_book_page(page)
    records: list[dict[str, Any]] = []

    for row, values in zip(section_table.rows, section_table.extract()):
        if len(values) < 2:
            continue

        raw_category = values[0] or ""
        raw_amount = values[1] or ""
        if not raw_category and not raw_amount:
            continue
        if normalize_compact_text(raw_category) in {"節", "区分"}:
            continue

        section = parse_code_and_name(raw_category)
        amount = parse_amount(raw_amount)
        moku = choose_moku(moku_records, row.bbox[1])
        status = "parsed"
        note = ""

        if section is None:
            status = "needs_review"
            note = append_note(note, "節番号・節名称を解析できない")
        if amount is None:
            status = "needs_review"
            note = append_note(note, "節金額を解析できない")
        if moku is None:
            status = "needs_review"
            note = append_note(note, "節行を目へ対応付けできない")
        if kan is None:
            status = "needs_review"
            note = append_note(note, "款を解析できない")
        if kou is None:
            status = "needs_review"
            note = append_note(note, "項を解析できない")
        if budget_book_page is None:
            status = "needs_review"
            note = append_note(note, "予算説明書ページ番号を解析できない")

        records.append(
            {
                "source_file": source_file,
                "pdf_page": pdf_page_number,
                "budget_book_page": budget_book_page or "",
                "fiscal_year": FISCAL_YEAR,
                "account_name": ACCOUNT_NAME,
                "budget_side": BUDGET_SIDE,
                "kan_code": kan.code if kan else "",
                "kan_name": kan.name if kan else "",
                "kou_code": kou.code if kou else "",
                "kou_name": kou.name if kou else "",
                "moku_code": moku.code if moku else "",
                "moku_name": moku.name if moku else "",
                "moku_total_amount_thousand_yen": (
                    moku.total_amount_thousand_yen if moku else ""
                ),
                "setsu_code": section.code if section else "",
                "setsu_name": section.name if section else "",
                "setsu_amount_thousand_yen": amount if amount is not None else "",
                "raw_text": f"{raw_category} | {raw_amount}",
                "parse_status": status,
                "parse_note": note,
                "_moku_y_start": moku.y_start if moku else None,
            }
        )

    reconcile_moku_totals(records, moku_records)
    for record in records:
        record.pop("_moku_y_start", None)
    return records


def reconcile_moku_totals(
    records: list[dict[str, Any]], moku_records: list[MokuRecord]
) -> None:
    for moku in moku_records:
        moku_rows = [
            record
            for record in records
            if record.get("_moku_y_start") == moku.y_start
        ]
        parsed_amounts = [
            record["setsu_amount_thousand_yen"]
            for record in moku_rows
            if isinstance(record["setsu_amount_thousand_yen"], int)
        ]
        section_total = sum(parsed_amounts)

        if not moku_rows:
            continue
        if (
            len(parsed_amounts) != len(moku_rows)
            or section_total != moku.total_amount_thousand_yen
        ):
            note = (
                f"節金額合計 {section_total:,} と目本年度予算額 "
                f"{moku.total_amount_thousand_yen:,} が一致しない"
            )
            for record in moku_rows:
                record["parse_status"] = "needs_review"
                record["parse_note"] = append_note(record["parse_note"], note)
        else:
            note = "節金額合計が目本年度予算額と一致"
            for record in moku_rows:
                record["parse_note"] = append_note(record["parse_note"], note)


def write_csv(output_path: Path, records: list[dict[str, Any]]) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", encoding="utf-8", newline="") as output_file:
        writer = csv.DictWriter(output_file, fieldnames=CSV_COLUMNS)
        writer.writeheader()
        writer.writerows(records)


def extract_sample(
    input_path: Path,
    output_path: Path,
    pdf_pages: tuple[int, ...],
) -> list[dict[str, Any]]:
    try:
        import pdfplumber
    except ImportError as error:
        raise RuntimeError(
            "pdfplumber が必要です。requirements-pdf.txt をインストールしてください。"
        ) from error

    if not input_path.is_file():
        raise FileNotFoundError(f"入力PDFが見つかりません: {input_path}")

    records: list[dict[str, Any]] = []
    with pdfplumber.open(input_path) as pdf:
        if max(pdf_pages) > len(pdf.pages):
            raise ValueError(
                f"PDFは{len(pdf.pages)}ページですが、"
                f"{max(pdf_pages)}ページ目が指定されています。"
            )
        for page_number in pdf_pages:
            records.extend(
                extract_page_records(
                    page=pdf.pages[page_number - 1],
                    pdf_page_number=page_number,
                    source_file=input_path.name,
                )
            )

    write_csv(output_path, records)
    return records


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
        default=repo_root / "processed" / "raw_pdf_sections_sample.csv",
        help="出力CSV（既定: processed/raw_pdf_sections_sample.csv）",
    )
    parser.add_argument(
        "--pages",
        type=parse_page_list,
        default=DEFAULT_SAMPLE_PAGES,
        help="PDFページ番号。最大3件のカンマ区切り（既定: 159,162,166）",
    )
    return parser


def main() -> None:
    repo_root = Path(__file__).resolve().parents[3]
    args = build_argument_parser(repo_root).parse_args()
    records = extract_sample(args.input, args.output, args.pages)

    parsed_count = sum(record["parse_status"] == "parsed" for record in records)
    review_count = sum(
        record["parse_status"] == "needs_review" for record in records
    )
    print(f"対象PDFページ: {', '.join(map(str, args.pages))}")
    print(f"出力行数: {len(records)}")
    print(f"parsed: {parsed_count}")
    print(f"needs_review: {review_count}")
    print(f"出力先: {args.output}")


if __name__ == "__main__":
    main()
