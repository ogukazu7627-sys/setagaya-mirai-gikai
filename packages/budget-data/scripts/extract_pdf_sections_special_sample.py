#!/usr/bin/env python3
"""特別会計3会計の節別内訳を8ページだけstatefulに試験抽出する。"""

from __future__ import annotations

import argparse
import collections
import csv
import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from extract_pdf_sections_sample import BUDGET_SIDE, FISCAL_YEAR
from extract_pdf_sections_stateful import (
    MokuValidation,
    PAGE_TYPE_CONTINUATION,
    PageLayout,
    extract_page_range,
)


CSV_COLUMNS = [
    "raw_section_id",
    "fiscal_year",
    "account_code",
    "account_name",
    "budget_side",
    "kan_code",
    "kan_name",
    "kou_code",
    "kou_name",
    "moku_code",
    "moku_name",
    "setsu_code",
    "setsu_name",
    "amount_thousand_yen",
    "budget_book_page",
    "pdf_page",
    "raw_text",
    "parse_status",
    "review_reason",
]

TARGET_ACCOUNT_CODES = (
    "national_health_insurance",
    "latter_stage_elderly_healthcare",
    "long_term_care_insurance",
)

# Each account remains limited to two or three selected PDF pages.
SAMPLE_PAGE_WINDOWS = {
    "national_health_insurance": ((299, 300),),
    "latter_stage_elderly_healthcare": ((338, 340),),
    "long_term_care_insurance": ((379, 379), (396, 397)),
}

GENERAL_ADMIN_PAGE_EXPECTATIONS = {
    "national_health_insurance": (299, "21", "総務費"),
    "latter_stage_elderly_healthcare": (338, "61", "総務費"),
    "long_term_care_insurance": (379, "41", "総務費"),
}


@dataclass(frozen=True)
class SpecialAccount:
    account_code: str
    account_name: str
    budget_side: str
    expected_amount_thousand_yen: int
    pdf_page_start: int
    pdf_page_end: int


@dataclass(frozen=True)
class AccountSampleResult:
    account: SpecialAccount
    selected_pages: tuple[int, ...]
    records: tuple[dict[str, Any], ...]
    page_layouts: tuple[PageLayout, ...]
    moku_validations: tuple[MokuValidation, ...]


@dataclass(frozen=True)
class SpecialSampleResult:
    records: list[dict[str, Any]]
    account_results: tuple[AccountSampleResult, ...]


@dataclass(frozen=True)
class AccountSampleMetrics:
    selected_page_count: int
    row_count: int
    matched_row_count: int
    needs_review_count: int
    moku_count: int
    matched_moku_count: int
    section_sum_thousand_yen: int
    moku_total_sum_thousand_yen: int
    page_type_counts: dict[str, int]


@dataclass(frozen=True)
class SpecialSampleMetrics:
    selected_page_count: int
    row_count: int
    matched_row_count: int
    needs_review_count: int
    unique_raw_section_id_count: int
    moku_count: int
    matched_moku_count: int
    section_sum_thousand_yen: int
    moku_total_sum_thousand_yen: int
    page_type_counts: dict[str, int]
    account_metrics: dict[str, AccountSampleMetrics]


def sample_pages(
    windows: tuple[tuple[int, int], ...],
) -> tuple[int, ...]:
    return tuple(
        page
        for start_page, end_page in windows
        for page in range(start_page, end_page + 1)
    )


def load_special_accounts(config_path: Path) -> tuple[SpecialAccount, ...]:
    if not config_path.is_file():
        raise FileNotFoundError(f"会計設定が見つかりません: {config_path}")

    try:
        config = json.loads(config_path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as error:
        raise ValueError("budget-accounts.jsonが有効なJSONではありません。") from error

    if config.get("fiscal_year") != FISCAL_YEAR:
        raise ValueError(
            f"会計設定の年度が{FISCAL_YEAR}年度ではありません。"
        )
    account_rows = config.get("accounts")
    if not isinstance(account_rows, list):
        raise ValueError("会計設定のaccountsが配列ではありません。")

    rows_by_code = {
        row.get("account_code"): row
        for row in account_rows
        if isinstance(row, dict)
    }
    accounts: list[SpecialAccount] = []
    for account_code in TARGET_ACCOUNT_CODES:
        row = rows_by_code.get(account_code)
        if row is None:
            raise ValueError(f"会計設定に{account_code}がありません。")
        if row.get("status") != "active":
            raise ValueError(f"{account_code}がactiveではありません。")
        if row.get("budget_side") != BUDGET_SIDE:
            raise ValueError(
                f"{account_code}のbudget_sideが{BUDGET_SIDE}ではありません。"
            )

        account_name = row.get("account_name")
        expected_amount = row.get("expected_amount_thousand_yen")
        pdf_page_start = row.get("pdf_page_start")
        pdf_page_end = row.get("pdf_page_end")
        if not isinstance(account_name, str) or not account_name.strip():
            raise ValueError(f"{account_code}のaccount_nameが不正です。")
        if (
            not isinstance(expected_amount, int)
            or expected_amount <= 0
        ):
            raise ValueError(
                f"{account_code}のexpected_amount_thousand_yenが不正です。"
            )
        if (
            not isinstance(pdf_page_start, int)
            or not isinstance(pdf_page_end, int)
            or pdf_page_start > pdf_page_end
        ):
            raise ValueError(f"{account_code}のPDF範囲が不正です。")

        windows = SAMPLE_PAGE_WINDOWS[account_code]
        pages = sample_pages(windows)
        if not 2 <= len(pages) <= 3 or len(set(pages)) != len(pages):
            raise ValueError(
                f"{account_code}のサンプルは重複なしの2〜3ページが必要です。"
            )
        if any(
            page < pdf_page_start or page > pdf_page_end
            for page in pages
        ):
            raise ValueError(
                f"{account_code}のサンプルページが設定範囲外です。"
            )

        accounts.append(
            SpecialAccount(
                account_code=account_code,
                account_name=account_name.strip(),
                budget_side=BUDGET_SIDE,
                expected_amount_thousand_yen=expected_amount,
                pdf_page_start=pdf_page_start,
                pdf_page_end=pdf_page_end,
            )
        )
    return tuple(accounts)


def validate_required_layout(
    account: SpecialAccount,
    layouts: list[PageLayout],
) -> None:
    expected_page, expected_kan_code, expected_kan_name = (
        GENERAL_ADMIN_PAGE_EXPECTATIONS[account.account_code]
    )
    layout = next(
        (
            candidate
            for candidate in layouts
            if candidate.pdf_page == expected_page
        ),
        None,
    )
    if (
        layout is None
        or layout.kan is None
        or (layout.kan.code, layout.kan.name)
        != (expected_kan_code, expected_kan_name)
    ):
        raise ValueError(
            f"{account.account_code}の総務費ページを確認できません。"
        )

    if account.account_code == "long_term_care_insurance":
        continuation = next(
            (
                candidate
                for candidate in layouts
                if candidate.pdf_page == 397
            ),
            None,
        )
        if (
            continuation is None
            or continuation.page_type != PAGE_TYPE_CONTINUATION
        ):
            raise ValueError(
                "介護保険PDF 397ページを継続ページとして確認できません。"
            )


def output_record_base_id(
    account_code: str,
    record: dict[str, Any],
) -> str:
    components = [
        str(record.get("fiscal_year") or FISCAL_YEAR),
        account_code,
        str(record.get("budget_side") or BUDGET_SIDE),
        str(record.get("kan_code") or "XX"),
        str(record.get("kou_code") or "XX"),
        str(record.get("moku_code") or "XX"),
        "setsu",
        str(record.get("setsu_code") or "XX"),
    ]
    return "_".join(components)


def normalize_output_records(
    account_results: list[AccountSampleResult],
) -> list[dict[str, Any]]:
    output_records: list[dict[str, Any]] = []
    id_counts: collections.Counter[str] = collections.Counter()

    for account_result in account_results:
        account = account_result.account
        for record in account_result.records:
            source_status = record["parse_status"]
            if source_status == "parsed":
                parse_status = "matched"
                review_reason = ""
            elif source_status == "needs_review":
                parse_status = "needs_review"
                review_reason = str(record["parse_note"])
            else:
                raise ValueError(
                    f"未定義のparse_statusです: {source_status}"
                )

            base_id = output_record_base_id(account.account_code, record)
            id_counts[base_id] += 1
            raw_section_id = f"{base_id}_{id_counts[base_id]:02d}"
            output_records.append(
                {
                    "raw_section_id": raw_section_id,
                    "fiscal_year": record["fiscal_year"],
                    "account_code": account.account_code,
                    "account_name": record["account_name"],
                    "budget_side": record["budget_side"],
                    "kan_code": record["kan_code"],
                    "kan_name": record["kan_name"],
                    "kou_code": record["kou_code"],
                    "kou_name": record["kou_name"],
                    "moku_code": record["moku_code"],
                    "moku_name": record["moku_name"],
                    "setsu_code": record["setsu_code"],
                    "setsu_name": record["setsu_name"],
                    "amount_thousand_yen": (
                        record["setsu_amount_thousand_yen"]
                    ),
                    "budget_book_page": record["budget_book_page"],
                    "pdf_page": record["pdf_page"],
                    "raw_text": record["raw_text"],
                    "parse_status": parse_status,
                    "review_reason": review_reason,
                }
            )
    return output_records


def extract_special_sample_from_pdf(
    pdf: Any,
    source_file: str,
    accounts: tuple[SpecialAccount, ...],
) -> SpecialSampleResult:
    account_results: list[AccountSampleResult] = []

    for account in accounts:
        records: list[dict[str, Any]] = []
        layouts: list[PageLayout] = []
        validations: list[MokuValidation] = []
        windows = SAMPLE_PAGE_WINDOWS[account.account_code]

        for start_page, end_page in windows:
            if end_page > len(pdf.pages):
                raise ValueError(
                    f"PDFは{len(pdf.pages)}ページですが、"
                    f"{end_page}ページ目が指定されています。"
                )
            result = extract_page_range(
                pdf=pdf,
                source_file=source_file,
                start_page=start_page,
                end_page=end_page,
                account_name=account.account_name,
                fiscal_year=FISCAL_YEAR,
                budget_side=account.budget_side,
            )
            records.extend(result.records)
            layouts.extend(result.page_layouts)
            validations.extend(result.moku_validations)

        validate_required_layout(account, layouts)
        account_results.append(
            AccountSampleResult(
                account=account,
                selected_pages=sample_pages(windows),
                records=tuple(records),
                page_layouts=tuple(layouts),
                moku_validations=tuple(validations),
            )
        )

    return SpecialSampleResult(
        records=normalize_output_records(account_results),
        account_results=tuple(account_results),
    )


def write_special_sample_csv(
    output_path: Path,
    records: list[dict[str, Any]],
) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", encoding="utf-8", newline="") as output_file:
        writer = csv.DictWriter(output_file, fieldnames=CSV_COLUMNS)
        writer.writeheader()
        writer.writerows(records)


def account_metrics(
    account_result: AccountSampleResult,
    output_records: list[dict[str, Any]],
) -> AccountSampleMetrics:
    account_code = account_result.account.account_code
    account_output = [
        record
        for record in output_records
        if record["account_code"] == account_code
    ]
    return AccountSampleMetrics(
        selected_page_count=len(account_result.selected_pages),
        row_count=len(account_output),
        matched_row_count=sum(
            record["parse_status"] == "matched"
            for record in account_output
        ),
        needs_review_count=sum(
            record["parse_status"] == "needs_review"
            for record in account_output
        ),
        moku_count=len(account_result.moku_validations),
        matched_moku_count=sum(
            validation.amount_matched
            for validation in account_result.moku_validations
        ),
        section_sum_thousand_yen=sum(
            int(record["amount_thousand_yen"])
            for record in account_output
            if isinstance(record["amount_thousand_yen"], int)
        ),
        moku_total_sum_thousand_yen=sum(
            validation.moku_total_amount_thousand_yen
            for validation in account_result.moku_validations
        ),
        page_type_counts=dict(
            sorted(
                collections.Counter(
                    layout.page_type
                    for layout in account_result.page_layouts
                ).items()
            )
        ),
    )


def calculate_special_sample_metrics(
    result: SpecialSampleResult,
) -> SpecialSampleMetrics:
    metrics_by_account = {
        account_result.account.account_code: account_metrics(
            account_result,
            result.records,
        )
        for account_result in result.account_results
    }
    validations = [
        validation
        for account_result in result.account_results
        for validation in account_result.moku_validations
    ]
    layouts = [
        layout
        for account_result in result.account_results
        for layout in account_result.page_layouts
    ]
    raw_section_ids = {
        record["raw_section_id"] for record in result.records
    }
    return SpecialSampleMetrics(
        selected_page_count=sum(
            len(account_result.selected_pages)
            for account_result in result.account_results
        ),
        row_count=len(result.records),
        matched_row_count=sum(
            record["parse_status"] == "matched"
            for record in result.records
        ),
        needs_review_count=sum(
            record["parse_status"] == "needs_review"
            for record in result.records
        ),
        unique_raw_section_id_count=len(raw_section_ids),
        moku_count=len(validations),
        matched_moku_count=sum(
            validation.amount_matched for validation in validations
        ),
        section_sum_thousand_yen=sum(
            int(record["amount_thousand_yen"])
            for record in result.records
            if isinstance(record["amount_thousand_yen"], int)
        ),
        moku_total_sum_thousand_yen=sum(
            validation.moku_total_amount_thousand_yen
            for validation in validations
        ),
        page_type_counts=dict(
            sorted(
                collections.Counter(
                    layout.page_type for layout in layouts
                ).items()
            )
        ),
        account_metrics=metrics_by_account,
    )


def extract_special_sample(
    input_path: Path,
    config_path: Path,
    output_path: Path,
) -> tuple[SpecialSampleResult, SpecialSampleMetrics]:
    if not input_path.is_file():
        raise FileNotFoundError(f"入力PDFが見つかりません: {input_path}")

    try:
        import pdfplumber
    except ImportError as error:
        raise RuntimeError(
            "pdfplumber が必要です。同梱PDFランタイムを使用してください。"
        ) from error

    accounts = load_special_accounts(config_path)
    with pdfplumber.open(input_path) as pdf:
        result = extract_special_sample_from_pdf(
            pdf=pdf,
            source_file=input_path.name,
            accounts=accounts,
        )
    write_special_sample_csv(output_path, result.records)
    return result, calculate_special_sample_metrics(result)


def build_argument_parser(repo_root: Path) -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--input",
        type=Path,
        default=repo_root / "raw" / "r8tousyoyosanallpage.pdf",
        help="入力PDF（既定: raw/r8tousyoyosanallpage.pdf）",
    )
    parser.add_argument(
        "--config",
        type=Path,
        default=repo_root / "config" / "budget-accounts.json",
        help="会計設定（既定: config/budget-accounts.json）",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=(
            repo_root
            / "processed" / "audit" / "raw_pdf_sections_special_sample.csv"
        ),
        help=(
            "出力CSV"
            "（既定: processed/audit/raw_pdf_sections_special_sample.csv）"
        ),
    )
    return parser


def main() -> None:
    repo_root = Path(__file__).resolve().parents[3]
    args = build_argument_parser(repo_root).parse_args()
    result, metrics = extract_special_sample(
        input_path=args.input,
        config_path=args.config,
        output_path=args.output,
    )

    for account_result in result.account_results:
        account_code = account_result.account.account_code
        account_metric = metrics.account_metrics[account_code]
        print(
            f"{account_code}: "
            f"pages={','.join(map(str, account_result.selected_pages))}; "
            f"rows={account_metric.row_count}; "
            f"matched={account_metric.matched_row_count}; "
            f"needs_review={account_metric.needs_review_count}; "
            f"moku_matched={account_metric.matched_moku_count}/"
            f"{account_metric.moku_count}"
        )
    print(f"対象ページ数: {metrics.selected_page_count}")
    print(f"抽出件数: {metrics.row_count}")
    print(f"matched: {metrics.matched_row_count}")
    print(f"needs_review: {metrics.needs_review_count}")
    print(
        "raw_section_id一意: "
        f"{metrics.unique_raw_section_id_count}/{metrics.row_count}"
    )
    print(
        "目別金額一致: "
        f"{metrics.matched_moku_count}/{metrics.moku_count}"
    )
    print(
        "節金額合計: "
        f"{metrics.section_sum_thousand_yen:,}"
    )
    print(
        "目本年度予算額合計: "
        f"{metrics.moku_total_sum_thousand_yen:,}"
    )
    print("ページ分類:")
    for page_type, count in metrics.page_type_counts.items():
        print(f"  {page_type}: {count}")
    print(
        "Validation: "
        + (
            "PASS"
            if metrics.needs_review_count == 0
            and metrics.matched_moku_count == metrics.moku_count
            and metrics.unique_raw_section_id_count == metrics.row_count
            else "NEEDS REVIEW"
        )
    )
    print(f"出力先: {args.output}")


if __name__ == "__main__":
    main()
