from __future__ import annotations

import argparse
import csv
import hashlib
import io
import json
import re
import sys
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any

import pdfplumber


ACCOUNT_CODES = {
    "一般会計": "general",
    "国民健康保険事業会計": "national_health_insurance",
    "後期高齢者医療会計": "latter_stage_elderly_healthcare",
    "介護保険事業会計": "long_term_care_insurance",
    "学校給食費会計": "school_lunch_fee",
}

EXPECTED_ACCOUNT_ROW_COUNTS = {
    "general": 1_857,
    "national_health_insurance": 90,
    "latter_stage_elderly_healthcare": 30,
    "long_term_care_insurance": 211,
    "school_lunch_fee": 4,
}

EXPECTED_CORE_FILES = {
    "programs": {"row_count": 1_170, "column_count": 30},
    "sections": {"row_count": 994, "column_count": 19},
    "items": {"row_count": 190, "column_count": 19},
}

EXPECTED_GENERAL_ALLOCATED_AMOUNT = 151_950_897
EXPECTED_GENERAL_UNALLOCATED_AMOUNT = 279_402_113
EXPECTED_OVERALL_AMOUNT = 621_033_664
EXPECTED_SELECTED_ROW_COUNT = 2_192


def file_profile(path: Path) -> dict[str, Any]:
    raw = path.read_bytes()
    return {
        "path": str(path.resolve()),
        "name": path.name,
        "size_bytes": len(raw),
        "sha256": hashlib.sha256(raw).hexdigest(),
    }


def compact_pdf_text(text: str) -> str:
    return re.sub(r"\s+", "", text)


def resolve_input_path(path: Path, repo_root: Path) -> Path:
    return path if path.is_absolute() else repo_root / path


def profile_core_csv(path: Path) -> dict[str, Any]:
    with path.open(encoding="utf-8", newline="") as stream:
        records = list(csv.reader(stream))
    if not records:
        raise ValueError(f"CSVが空です: {path}")
    return {
        **file_profile(path),
        "row_count": len(records) - 1,
        "column_count": len(records[0]),
    }


def profile_pdf(
    path: Path,
    accounts: list[dict[str, Any]],
    validation_errors: list[str],
) -> dict[str, Any]:
    ranges: dict[str, Any] = {}
    with pdfplumber.open(path) as pdf:
        page_count = len(pdf.pages)
        for account in accounts:
            account_code = account["account_code"]
            revenue = account.get("revenue")
            if not isinstance(revenue, dict):
                validation_errors.append(
                    f"{account_code}: revenue設定がありません。"
                )
                continue
            status = revenue.get("status")
            if status == "abolished_zero":
                ranges[account_code] = {"status": status}
                continue
            if status != "active":
                validation_errors.append(
                    f"{account_code}: revenue.statusが不正です。"
                )
                continue

            required_fields = (
                "expected_amount_thousand_yen",
                "pdf_budget_book_start_page",
                "pdf_budget_book_end_page",
                "pdf_page_start",
                "pdf_page_end",
            )
            missing = [
                field
                for field in required_fields
                if not isinstance(revenue.get(field), int)
            ]
            if missing:
                validation_errors.append(
                    f"{account_code}: revenueの必須整数項目がありません: "
                    + ", ".join(missing)
                )
                continue

            pdf_page_start = revenue["pdf_page_start"]
            pdf_page_end = revenue["pdf_page_end"]
            if not (
                1 <= pdf_page_start <= pdf_page_end < page_count
            ):
                validation_errors.append(
                    f"{account_code}: revenueのPDF範囲が不正です。"
                )
                continue

            start_text = pdf.pages[pdf_page_start - 1].extract_text() or ""
            end_text = pdf.pages[pdf_page_end - 1].extract_text() or ""
            next_text = pdf.pages[pdf_page_end].extract_text() or ""
            if "歳入予算" not in compact_pdf_text(start_text):
                validation_errors.append(
                    f"{account_code}: PDF開始ページに歳入予算見出しがありません。"
                )
            if "歳出予算" not in compact_pdf_text(next_text):
                validation_errors.append(
                    f"{account_code}: PDF終了ページの次に歳出予算見出しがありません。"
                )

            ranges[account_code] = {
                **revenue,
                "start_page_text": re.sub(r"\s+", " ", start_text).strip()[
                    :160
                ],
                "end_page_text": re.sub(r"\s+", " ", end_text).strip()[
                    :160
                ],
                "next_page_text": re.sub(r"\s+", " ", next_text).strip()[
                    :160
                ],
            }

    return {
        **file_profile(path),
        "page_count": page_count,
        "revenue_ranges": ranges,
    }


def decode_csv(raw: bytes) -> tuple[str, str, dict[str, str]]:
    attempts: dict[str, str] = {}
    decoded: dict[str, str] = {}
    for encoding in ("utf-8-sig", "cp932", "shift_jis"):
        try:
            decoded[encoding] = raw.decode(encoding, errors="strict")
            attempts[encoding] = "success"
        except UnicodeDecodeError as error:
            attempts[encoding] = (
                f"failed at byte {error.start}: {error.reason}"
            )
    if "cp932" not in decoded:
        raise ValueError("CSVをcp932で厳密にデコードできません。")
    return decoded["cp932"], "cp932", attempts


def parse_amount(value: str) -> int:
    normalized = value.replace(",", "").strip()
    if not normalized:
        raise ValueError("金額列が空です。")
    return int(normalized)


def sorted_counter(counter: Counter[str]) -> dict[str, int]:
    return dict(sorted(counter.items(), key=lambda item: item[0]))


def pair_counts(
    rows: list[dict[str, str]], code_field: str, name_field: str
) -> list[dict[str, Any]]:
    counts = Counter((row[code_field], row[name_field]) for row in rows)
    return [
        {"code": code, "name": name, "row_count": count}
        for (code, name), count in sorted(counts.items())
    ]


def duplicate_summary(
    rows: list[dict[str, str]],
    fields: tuple[str, ...],
) -> dict[str, Any]:
    groups: dict[tuple[str, ...], list[int]] = defaultdict(list)
    for logical_row_number, row in enumerate(rows, start=1):
        groups[tuple(row[field] for field in fields)].append(
            logical_row_number
        )
    duplicates = {
        key: row_numbers
        for key, row_numbers in groups.items()
        if len(row_numbers) > 1
    }
    examples = []
    for key, row_numbers in sorted(
        duplicates.items(), key=lambda item: item[1][0]
    )[:20]:
        examples.append(
            {
                "values": dict(zip(fields, key, strict=True)),
                "logical_filtered_row_numbers": row_numbers,
            }
        )
    return {
        "fields": list(fields),
        "row_count": len(rows),
        "unique_key_count": len(groups),
        "duplicate_group_count": len(duplicates),
        "duplicate_row_count": sum(len(value) for value in duplicates.values()),
        "is_unique": not duplicates,
        "examples": examples,
    }


def main() -> None:
    repo_root = Path(__file__).resolve().parents[3]
    parser = argparse.ArgumentParser(
        description=(
            "令和8年度当初予算の歳入入力を読み取り専用でプロファイルします。"
        )
    )
    parser.add_argument(
        "--csv",
        type=Path,
        default=repo_root / "raw" / "ippansainyu.csv",
    )
    parser.add_argument(
        "--pdf",
        type=Path,
        default=repo_root / "raw" / "r8tousyoyosanallpage.pdf",
    )
    parser.add_argument(
        "--programs",
        type=Path,
        default=repo_root / "processed" / "core" / "budget_programs.csv",
    )
    parser.add_argument(
        "--sections",
        type=Path,
        default=repo_root / "processed" / "core" / "budget_sections.csv",
    )
    parser.add_argument(
        "--items",
        type=Path,
        default=repo_root / "processed" / "core" / "budget_items.csv",
    )
    parser.add_argument(
        "--config",
        type=Path,
        default=repo_root / "config" / "budget-accounts.json",
    )
    parser.add_argument("--fiscal-year", type=int)
    parser.add_argument("--initial-label", default="当初")
    args = parser.parse_args(
        [argument for argument in sys.argv[1:] if argument != "--"]
    )
    args.csv = resolve_input_path(args.csv, repo_root)
    args.pdf = resolve_input_path(args.pdf, repo_root)
    args.programs = resolve_input_path(args.programs, repo_root)
    args.sections = resolve_input_path(args.sections, repo_root)
    args.items = resolve_input_path(args.items, repo_root)
    args.config = resolve_input_path(args.config, repo_root)

    config = json.loads(args.config.read_text(encoding="utf-8"))
    configured_fiscal_year = config.get("fiscal_year")
    if not isinstance(configured_fiscal_year, int):
        raise ValueError("configのfiscal_yearが整数ではありません。")
    fiscal_year = args.fiscal_year or configured_fiscal_year
    fiscal_year_text = str(fiscal_year)
    accounts = config.get("accounts")
    if not isinstance(accounts, list) or not accounts:
        raise ValueError("configのaccountsが空または配列ではありません。")

    raw = args.csv.read_bytes()
    text, encoding, decode_attempts = decode_csv(raw)
    reader = csv.reader(io.StringIO(text, newline=""))
    records = list(reader)
    if not records:
        raise ValueError("CSVが空です。")
    header = records[0]
    data_records = records[1:]
    width_counts = Counter(len(record) for record in data_records)
    if set(width_counts) != {len(header)}:
        raise ValueError(
            f"列数不一致があります: header={len(header)}, "
            f"data={dict(width_counts)}"
        )
    if len(set(header)) != len(header):
        raise ValueError("ヘッダー名が重複しています。")
    rows = [dict(zip(header, record, strict=True)) for record in data_records]

    selected = [
        row
        for row in rows
        if row["年度"] == fiscal_year_text
        and row["当初補正区分名称"] == args.initial_label
    ]

    amount_fields = (
        "現計予算額",
        "現計充当額",
        "現計未充当額",
    )
    account_rows = Counter(row["会計名称"] for row in selected)
    account_totals: dict[str, dict[str, int]] = {}
    for account_name in sorted(account_rows):
        account_code = ACCOUNT_CODES.get(account_name, "unmapped")
        account_data = [
            row for row in selected if row["会計名称"] == account_name
        ]
        account_totals[account_code] = {
            "row_count": len(account_data),
            **{
                field: sum(parse_amount(row[field]) for row in account_data)
                for field in amount_fields
            },
            "nonzero_unallocated_row_count": sum(
                parse_amount(row["現計未充当額"]) != 0
                for row in account_data
            ),
            "zero_allocated_positive_budget_row_count": sum(
                parse_amount(row["現計予算額"]) > 0
                and parse_amount(row["現計充当額"]) == 0
                for row in account_data
            ),
            "zero_amount_row_count": sum(
                parse_amount(row["現計予算額"]) == 0
                for row in account_data
            ),
        }

    balance_failures = []
    for logical_row_number, row in enumerate(selected, start=1):
        budget = parse_amount(row["現計予算額"])
        allocated = parse_amount(row["現計充当額"])
        unallocated = parse_amount(row["現計未充当額"])
        if budget != allocated + unallocated:
            balance_failures.append(
                {
                    "logical_filtered_row_number": logical_row_number,
                    "account_name": row["会計名称"],
                    "revenue_number": row["歳入番号"],
                    "budget": budget,
                    "allocated": allocated,
                    "unallocated": unallocated,
                    "diff": budget - allocated - unallocated,
                }
            )

    base_key = ("会計", "款", "項", "目", "節", "細節", "所属")
    extended_key = (*base_key, "歳入番号")

    newline_counts = {
        "crlf": raw.count(b"\r\n"),
        "lf": raw.count(b"\n"),
        "cr": raw.count(b"\r"),
    }
    validation_errors: list[str] = []
    if len(header) != 52:
        validation_errors.append(f"列数が52ではありません: {len(header)}")
    if len(selected) != EXPECTED_SELECTED_ROW_COUNT:
        validation_errors.append(
            f"対象行数が{EXPECTED_SELECTED_ROW_COUNT}ではありません: "
            f"{len(selected)}"
        )
    if balance_failures:
        validation_errors.append(
            f"現計額の収支式が不成立の行があります: {len(balance_failures)}"
        )

    base_key_uniqueness = duplicate_summary(selected, base_key)
    extended_key_uniqueness = duplicate_summary(selected, extended_key)
    if not base_key_uniqueness["is_unique"]:
        validation_errors.append(
            "会計・款・項・目・節・細節・所属の組合せが一意ではありません。"
        )

    config_by_csv_account_name = {
        account["csv_account_name"]: account
        for account in accounts
        if isinstance(account, dict)
        and isinstance(account.get("csv_account_name"), str)
    }
    for account_name, account_code in ACCOUNT_CODES.items():
        actual_count = account_rows.get(account_name, 0)
        expected_count = EXPECTED_ACCOUNT_ROW_COUNTS[account_code]
        if actual_count != expected_count:
            validation_errors.append(
                f"{account_code}: 行数が不一致です: "
                f"{actual_count} != {expected_count}"
            )
        configured_account = config_by_csv_account_name.get(account_name)
        if configured_account is None:
            validation_errors.append(
                f"{account_code}: configに会計がありません。"
            )
            continue
        revenue = configured_account.get("revenue")
        if not isinstance(revenue, dict):
            validation_errors.append(
                f"{account_code}: configにrevenueがありません。"
            )
            continue
        expected_amount = (
            0
            if revenue.get("status") == "abolished_zero"
            else revenue.get("expected_amount_thousand_yen")
        )
        actual_amount = account_totals.get(account_code, {}).get(
            "現計予算額"
        )
        if actual_amount != expected_amount:
            validation_errors.append(
                f"{account_code}: 現計予算額がconfigと不一致です: "
                f"{actual_amount} != {expected_amount}"
            )

    overall_totals = {
        field: sum(parse_amount(row[field]) for row in selected)
        for field in amount_fields
    }
    general_account_totals = {
        field: sum(
            parse_amount(row[field])
            for row in selected
            if row["会計名称"] == "一般会計"
        )
        for field in amount_fields
    }
    if overall_totals["現計予算額"] != EXPECTED_OVERALL_AMOUNT:
        validation_errors.append(
            "全会計の現計予算額が不一致です: "
            f"{overall_totals['現計予算額']} != {EXPECTED_OVERALL_AMOUNT}"
        )
    if (
        general_account_totals["現計充当額"]
        != EXPECTED_GENERAL_ALLOCATED_AMOUNT
    ):
        validation_errors.append(
            "一般会計の現計充当額が不一致です。"
        )
    if (
        general_account_totals["現計未充当額"]
        != EXPECTED_GENERAL_UNALLOCATED_AMOUNT
    ):
        validation_errors.append(
            "一般会計の現計未充当額が不一致です。"
        )

    core_files = {
        "programs": profile_core_csv(args.programs),
        "sections": profile_core_csv(args.sections),
        "items": profile_core_csv(args.items),
    }
    for name, expected in EXPECTED_CORE_FILES.items():
        actual = core_files[name]
        if (
            actual["row_count"] != expected["row_count"]
            or actual["column_count"] != expected["column_count"]
        ):
            validation_errors.append(
                f"{name}: コアCSVの行列数が不一致です: "
                f"{actual['row_count']}x{actual['column_count']} != "
                f"{expected['row_count']}x{expected['column_count']}"
            )

    pdf_profile = profile_pdf(args.pdf, accounts, validation_errors)
    result = {
        "inputs": {
            "revenue_csv": {
                **file_profile(args.csv),
                "bom": raw.startswith(b"\xef\xbb\xbf"),
                "encoding": encoding,
                "decode_attempts": decode_attempts,
                "newlines": newline_counts,
            },
            "budget_pdf": pdf_profile,
            "config": file_profile(args.config),
            "core_csvs": core_files,
        },
        "csv": {
            "column_count": len(header),
            "columns": [
                {"position": index, "name": name}
                for index, name in enumerate(header, start=1)
            ],
            "record_count_including_header": len(records),
            "data_row_count": len(rows),
            "physical_line_count": raw.count(b"\n"),
            "width_counts": dict(width_counts),
            "year_counts": sorted_counter(
                Counter(row["年度"] for row in rows)
            ),
            "initial_adjustment_counts": sorted_counter(
                Counter(row["当初補正区分名称"] for row in rows)
            ),
            "initial_adjustment_pairs": pair_counts(
                rows, "当初補正区分", "当初補正区分名称"
            ),
            "account_counts": sorted_counter(
                Counter(row["会計名称"] for row in rows)
            ),
            "account_pairs": pair_counts(rows, "会計", "会計名称"),
        },
        "selected": {
            "fiscal_year": fiscal_year,
            "initial_label": args.initial_label,
            "row_count": len(selected),
            "year_counts": sorted_counter(
                Counter(row["年度"] for row in selected)
            ),
            "initial_adjustment_counts": sorted_counter(
                Counter(row["当初補正区分名称"] for row in selected)
            ),
            "account_row_counts_by_name": sorted_counter(account_rows),
            "account_pairs": pair_counts(selected, "会計", "会計名称"),
            "account_totals": account_totals,
            "overall_totals": overall_totals,
            "general_account_totals": general_account_totals,
            "funding_category_names": sorted(
                {row["財源区分名称"] for row in selected}
            ),
            "funding_category_counts": sorted_counter(
                Counter(row["財源区分名称"] for row in selected)
            ),
            "funding_category_pairs": pair_counts(
                selected, "財源区分", "財源区分名称"
            ),
            "department_pair_count": len(
                {
                    (row["所属"], row["所属名称"])
                    for row in selected
                }
            ),
            "revenue_number_pair_count": len(
                {
                    (row["歳入番号"], row["歳入番号名称"])
                    for row in selected
                }
            ),
            "balance": {
                "checked_row_count": len(selected),
                "matched_row_count": len(selected) - len(balance_failures),
                "failure_count": len(balance_failures),
                "failures": balance_failures[:20],
            },
            "base_key_uniqueness": base_key_uniqueness,
            "extended_key_uniqueness": extended_key_uniqueness,
        },
        "validation": {
            "status": "PASS" if not validation_errors else "FAIL",
            "errors": validation_errors,
        },
    }
    print(json.dumps(result, ensure_ascii=False, indent=2))
    if validation_errors:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
