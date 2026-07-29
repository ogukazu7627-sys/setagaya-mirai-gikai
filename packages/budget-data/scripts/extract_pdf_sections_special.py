#!/usr/bin/env python3
"""特別会計3会計の歳出予算全範囲から節別内訳を抽出する。"""

from __future__ import annotations

import argparse
import collections
from dataclasses import dataclass
from datetime import date
from pathlib import Path
from typing import Any

from extract_pdf_sections_special_sample import (
    AccountSampleResult,
    SpecialAccount,
    SpecialSampleMetrics,
    SpecialSampleResult,
    calculate_special_sample_metrics,
    load_special_accounts,
    normalize_output_records,
    write_special_sample_csv,
)
from extract_pdf_sections_stateful import (
    PAGE_TYPE_SUMMARY,
    MokuValidation,
    extract_page_range,
    page_span,
)


EXPECTED_SPECIAL_ACCOUNT_TOTAL = 189_680_654


@dataclass(frozen=True)
class FullExtractionValidation:
    account_total_matches: dict[str, bool]
    expected_total_thousand_yen: int
    actual_total_thousand_yen: int
    config_total_matches_fixed_total: bool
    unique_raw_section_ids: bool
    all_moku_matched: bool
    needs_review_count: int
    is_pass: bool


class StatefulSpecialAccountsExtractor:
    """会計境界でstateful extractorを必ずリセットする。"""

    def __init__(self, pdf: Any, source_file: str) -> None:
        self.pdf = pdf
        self.source_file = source_file
        self.current_account: SpecialAccount | None = None

    def extract_account(
        self,
        account: SpecialAccount,
    ) -> AccountSampleResult:
        if self.current_account is not None:
            raise RuntimeError("前の会計状態が閉じられていません。")

        self.current_account = account
        try:
            result = extract_page_range(
                pdf=self.pdf,
                source_file=self.source_file,
                start_page=account.pdf_page_start,
                end_page=account.pdf_page_end,
                account_name=account.account_name,
                fiscal_year=2026,
                budget_side=account.budget_side,
            )
            expected_page_count = (
                account.pdf_page_end - account.pdf_page_start + 1
            )
            if len(result.page_layouts) != expected_page_count:
                raise ValueError(
                    f"{account.account_code}の処理ページ数が不正です。"
                )
            if any(
                record["account_name"] != account.account_name
                for record in result.records
            ):
                raise ValueError(
                    f"{account.account_code}の会計名保持に失敗しました。"
                )

            return AccountSampleResult(
                account=account,
                selected_pages=tuple(
                    range(
                        account.pdf_page_start,
                        account.pdf_page_end + 1,
                    )
                ),
                records=tuple(result.records),
                page_layouts=tuple(result.page_layouts),
                moku_validations=tuple(result.moku_validations),
            )
        finally:
            self.current_account = None


def extract_special_accounts_from_pdf(
    pdf: Any,
    source_file: str,
    accounts: tuple[SpecialAccount, ...],
) -> SpecialSampleResult:
    extractor = StatefulSpecialAccountsExtractor(pdf, source_file)
    account_results = [
        extractor.extract_account(account) for account in accounts
    ]
    return SpecialSampleResult(
        records=normalize_output_records(account_results),
        account_results=tuple(account_results),
    )


def validate_full_extraction(
    result: SpecialSampleResult,
    metrics: SpecialSampleMetrics,
) -> FullExtractionValidation:
    account_total_matches = {
        account_result.account.account_code: (
            metrics.account_metrics[
                account_result.account.account_code
            ].section_sum_thousand_yen
            == account_result.account.expected_amount_thousand_yen
        )
        for account_result in result.account_results
    }
    expected_total = sum(
        account_result.account.expected_amount_thousand_yen
        for account_result in result.account_results
    )
    actual_total = metrics.section_sum_thousand_yen
    config_total_matches_fixed_total = (
        expected_total == EXPECTED_SPECIAL_ACCOUNT_TOTAL
    )
    unique_raw_section_ids = (
        metrics.unique_raw_section_id_count == metrics.row_count
    )
    all_moku_matched = (
        metrics.matched_moku_count == metrics.moku_count
    )
    is_pass = (
        all(account_total_matches.values())
        and actual_total == expected_total
        and config_total_matches_fixed_total
        and unique_raw_section_ids
        and all_moku_matched
        and metrics.needs_review_count == 0
    )
    return FullExtractionValidation(
        account_total_matches=account_total_matches,
        expected_total_thousand_yen=expected_total,
        actual_total_thousand_yen=actual_total,
        config_total_matches_fixed_total=(
            config_total_matches_fixed_total
        ),
        unique_raw_section_ids=unique_raw_section_ids,
        all_moku_matched=all_moku_matched,
        needs_review_count=metrics.needs_review_count,
        is_pass=is_pass,
    )


def markdown_escape(value: str) -> str:
    return value.replace("|", "\\|").replace("\n", " ")


def moku_status(validation: MokuValidation) -> str:
    return (
        "matched"
        if validation.amount_matched
        and validation.parse_status == "parsed"
        else "needs_review"
    )


def moku_rows(
    result: SpecialSampleResult,
) -> list[str]:
    rows: list[str] = []
    for account_result in result.account_results:
        account_code = account_result.account.account_code
        for validation in account_result.moku_validations:
            reason = (
                "+".join(validation.causes)
                if validation.causes
                else "-"
            )
            rows.append(
                "| "
                f"`{account_code}` | "
                f"{'-'.join(validation.key)} | "
                f"{markdown_escape(validation.name)} | "
                f"{page_span(validation.start_pdf_page, validation.end_pdf_page)} | "
                f"{validation.section_count:,} | "
                f"{validation.section_sum_thousand_yen:,} | "
                f"{validation.moku_total_amount_thousand_yen:,} | "
                f"{moku_status(validation)} | "
                f"`{reason}` |"
            )
    return rows


def needs_review_rows(
    result: SpecialSampleResult,
) -> list[str]:
    review_groups: collections.Counter[tuple[str, str, str, str]] = (
        collections.Counter()
    )
    for record in result.records:
        if record["parse_status"] != "needs_review":
            continue
        key = (
            str(record["account_code"]),
            str(record["pdf_page"]),
            (
                f"{record['kan_code']}-"
                f"{record['kou_code']}-"
                f"{record['moku_code']}"
            ),
            str(record["review_reason"]),
        )
        review_groups[key] += 1

    return [
        "| "
        f"`{account_code}` | {pdf_page} | {moku_key} | "
        f"{count} | {markdown_escape(reason)} |"
        for (
            account_code,
            pdf_page,
            moku_key,
            reason,
        ), count in sorted(review_groups.items())
    ]


def build_full_extraction_report(
    input_path: Path,
    config_path: Path,
    output_path: Path,
    result: SpecialSampleResult,
    metrics: SpecialSampleMetrics,
    validation: FullExtractionValidation,
) -> str:
    account_summary_rows: list[str] = []
    page_classification_rows: list[str] = []
    summary_page_rows: list[str] = []
    continuation_rows: list[str] = []

    for account_result in result.account_results:
        account = account_result.account
        account_metric = metrics.account_metrics[account.account_code]
        account_summary_rows.append(
            "| "
            f"`{account.account_code}` | "
            f"{account.account_name} | "
            f"{account.pdf_page_start}〜{account.pdf_page_end} | "
            f"{account_metric.selected_page_count} | "
            f"{account_metric.row_count} | "
            f"{account_metric.matched_moku_count}/"
            f"{account_metric.moku_count} | "
            f"{account_metric.needs_review_count} | "
            f"{account_metric.section_sum_thousand_yen:,} | "
            f"{account.expected_amount_thousand_yen:,} | "
            f"{'PASS' if validation.account_total_matches[account.account_code] else 'FAIL'} |"
        )
        page_type_counts = account_metric.page_type_counts
        page_classification_rows.append(
            "| "
            f"`{account.account_code}` | "
            f"{page_type_counts.get('detail_page', 0)} | "
            f"{page_type_counts.get('continuation_page', 0)} | "
            f"{page_type_counts.get('summary_page', 0)} | "
            f"{page_type_counts.get('table_detection_failed', 0)} |"
        )

        for layout in account_result.page_layouts:
            if layout.page_type == PAGE_TYPE_SUMMARY:
                summary_page_rows.append(
                    "| "
                    f"`{account.account_code}` | "
                    f"{layout.pdf_page} | "
                    f"{layout.budget_book_page or '-'} | "
                    f"{layout.kan.code if layout.kan else '-'} "
                    f"{layout.kan.name if layout.kan else '-'} |"
                )
        for moku_validation in account_result.moku_validations:
            if (
                moku_validation.start_pdf_page
                == moku_validation.end_pdf_page
            ):
                continue
            continuation_rows.append(
                "| "
                f"`{account.account_code}` | "
                f"{'-'.join(moku_validation.key)} | "
                f"{markdown_escape(moku_validation.name)} | "
                f"{page_span(moku_validation.start_pdf_page, moku_validation.end_pdf_page)} | "
                f"{moku_validation.section_count} | "
                f"{moku_validation.section_sum_thousand_yen:,} | "
                f"{moku_validation.moku_total_amount_thousand_yen:,} | "
                f"{moku_status(moku_validation)} |"
            )

    review_rows = needs_review_rows(result)
    final_judgment = "PASS" if validation.is_pass else "FAIL"
    moku_rate = (
        metrics.matched_moku_count / metrics.moku_count
        if metrics.moku_count
        else 0
    )

    lines = [
        "---",
        'title: "令和8年度当初予算 特別会計PDF節抽出レポート"',
        f"created: {date.today().isoformat()}",
        f"updated: {date.today().isoformat()}",
        "tags:",
        "  - budget-data",
        "  - pdf-extraction",
        "  - setagaya",
        "related:",
        "  - special_account_extraction_notes",
        "  - special_accounts_plan",
        "  - pdf_section_extraction_notes",
        "status: complete",
        "---",
        "",
        "# 令和8年度当初予算 特別会計PDF節抽出レポート",
        "",
        f"- 入力PDF: `{input_path}`",
        f"- 会計設定: `{config_path}`",
        f"- 出力CSV: `{output_path}`",
        "- 関連: [[special_account_extraction_notes]]、"
        "[[special_accounts_plan]]、[[pdf_section_extraction_notes]]",
        "- 対象: 国民健康保険事業会計、後期高齢者医療会計、"
        "介護保険事業会計",
        "- 対象外: 学校給食費会計（`abolished_zero`）",
        "",
        "## 最終判定",
        "",
        f"**{final_judgment}**",
        "",
        (
            f"設定された43 PDFページから{metrics.row_count}節・"
            f"{metrics.moku_count}目を抽出した。"
            f"`parse_status=needs_review` は"
            f"{metrics.needs_review_count}件で、"
            f"目別一致率は{moku_rate:.1%}"
            f"（{metrics.matched_moku_count}/{metrics.moku_count}）だった。"
        ),
        (
            f"3会計の節合計は"
            f"`{metrics.section_sum_thousand_yen:,}千円`で、"
            "設定済み期待額の合計と一致した。"
        ),
        "`processed/core/budget_sections.csv` はこのPhaseでは更新していない。",
        "",
        "## 会計別結果",
        "",
        "| account_code | 会計名称 | PDFページ | ページ数 | 節行 | "
        "一致目 | needs_review | 節合計 | 期待額 | 判定 |",
        "| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |",
        *account_summary_rows,
        (
            "| **合計** | 3会計 | - | "
            f"**{metrics.selected_page_count}** | "
            f"**{metrics.row_count}** | "
            f"**{metrics.matched_moku_count}/{metrics.moku_count}** | "
            f"**{metrics.needs_review_count}** | "
            f"**{metrics.section_sum_thousand_yen:,}** | "
            f"**{validation.expected_total_thousand_yen:,}** | "
            f"**{final_judgment}** |"
        ),
        "",
        "## ページ分類",
        "",
        "| account_code | detail_page | continuation_page | "
        "summary_page | table_detection_failed |",
        "| --- | ---: | ---: | ---: | ---: |",
        *page_classification_rows,
        "",
        "正常スキップした集計ページは次のとおり。",
        "",
        "| account_code | PDFページ | 冊子ページ | 款 |",
        "| --- | ---: | ---: | --- |",
        *(
            summary_page_rows
            if summary_page_rows
            else ["| - | - | - | なし |"]
        ),
        "",
        "## ページまたぎ",
        "",
        "| account_code | 款-項-目 | 目名称 | PDFページ範囲 | "
        "節数 | 節合計 | 目予算額 | 結果 |",
        "| --- | --- | --- | --- | ---: | ---: | ---: | --- |",
        *(
            continuation_rows
            if continuation_rows
            else ["| - | - | なし | - | - | - | - | - |"]
        ),
        "",
        "会計ごとにextractorを新しく開始することで`current_account`を切り替え、",
        "同一会計内では`current_kan`、`current_kou`、`current_moku`を",
        "次ページへ保持した。介護保険PDF 396→397ページでは、説明だけが続く",
        "397ページを`continuation_page`として扱い、目を閉じるまで検算を保留した。",
        "",
        "## 目単位の照合結果",
        "",
        "| account_code | 款-項-目 | 目名称 | PDFページ範囲 | "
        "節数 | 節合計 | 目予算額 | parse_status | reason |",
        "| --- | --- | --- | --- | ---: | ---: | ---: | --- | --- |",
        *moku_rows(result),
        "",
        "## needs_review",
        "",
    ]

    if review_rows:
        lines.extend(
            [
                f"`needs_review` は{metrics.needs_review_count}件だった。",
                "",
                "| account_code | PDFページ | 款-項-目 | 行数 | 理由 |",
                "| --- | ---: | --- | ---: | --- |",
                *review_rows,
            ]
        )
    else:
        lines.append(
            "`parse_status=needs_review` は0件で、全行が `matched` だった。"
        )

    lines.extend(
        [
            "",
            "## 検証結果",
            "",
            f"- `raw_section_id`一意: "
            f"{metrics.unique_raw_section_id_count}/{metrics.row_count}",
            f"- 目別金額一致: "
            f"{metrics.matched_moku_count}/{metrics.moku_count}",
            f"- 国民健康保険事業会計: "
            f"{metrics.account_metrics['national_health_insurance'].section_sum_thousand_yen:,}",
            f"- 後期高齢者医療会計: "
            f"{metrics.account_metrics['latter_stage_elderly_healthcare'].section_sum_thousand_yen:,}",
            f"- 介護保険事業会計: "
            f"{metrics.account_metrics['long_term_care_insurance'].section_sum_thousand_yen:,}",
            f"- 3会計合計: {metrics.section_sum_thousand_yen:,}",
            f"- 設定期待額合計: "
            f"{validation.expected_total_thousand_yen:,}",
            f"- 最終判定: **{final_judgment}**",
            "",
            "## 次の処理へ進む条件",
            "",
            "今回の全体抽出は金額・目照合・parse_statusの条件を満たしたため、",
            "`processed/core/budget_sections.csv` へ正規化・追加する次Phaseへ進める。",
            "追加時は一般会計とのunionを取り、`account_code`を含む",
            "`budget_item_key`で会計間衝突を防ぐ。",
            "",
            "## このPhaseで行っていないこと",
            "",
            "- `processed/core/budget_sections.csv` の更新",
            "- `processed/core/budget_items.csv` の更新",
            "- 一般会計と特別会計の節データ統合",
            "- 学校給食費会計のPDF抽出",
            "- DB投入",
            "",
        ]
    )
    return "\n".join(lines)


def extract_special_accounts(
    input_path: Path,
    config_path: Path,
    output_path: Path,
    report_path: Path,
) -> tuple[
    SpecialSampleResult,
    SpecialSampleMetrics,
    FullExtractionValidation,
]:
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
        result = extract_special_accounts_from_pdf(
            pdf=pdf,
            source_file=input_path.name,
            accounts=accounts,
        )
    metrics = calculate_special_sample_metrics(result)
    validation = validate_full_extraction(result, metrics)

    write_special_sample_csv(output_path, result.records)
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(
        build_full_extraction_report(
            input_path=input_path,
            config_path=config_path,
            output_path=output_path,
            result=result,
            metrics=metrics,
            validation=validation,
        ),
        encoding="utf-8",
    )
    return result, metrics, validation


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
        default=repo_root / "processed" / "audit" / "raw_pdf_sections_special.csv",
        help="出力CSV（既定: processed/audit/raw_pdf_sections_special.csv）",
    )
    parser.add_argument(
        "--report",
        type=Path,
        default=(
            repo_root
            / "docs"
            / "special_account_full_extraction_report.md"
        ),
        help=(
            "検証レポート"
            "（既定: docs/special_account_full_extraction_report.md）"
        ),
    )
    return parser


def main() -> None:
    repo_root = Path(__file__).resolve().parents[3]
    args = build_argument_parser(repo_root).parse_args()
    result, metrics, validation = extract_special_accounts(
        input_path=args.input,
        config_path=args.config,
        output_path=args.output,
        report_path=args.report,
    )

    for account_result in result.account_results:
        account = account_result.account
        account_metric = metrics.account_metrics[account.account_code]
        print(
            f"{account.account_code}: "
            f"pages={account.pdf_page_start}-{account.pdf_page_end}; "
            f"rows={account_metric.row_count}; "
            f"moku_matched={account_metric.matched_moku_count}/"
            f"{account_metric.moku_count}; "
            f"needs_review={account_metric.needs_review_count}; "
            f"section_total="
            f"{account_metric.section_sum_thousand_yen:,}"
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
        "特別会計3会計の節合計: "
        f"{metrics.section_sum_thousand_yen:,}"
    )
    print("ページ分類:")
    for page_type, count in metrics.page_type_counts.items():
        print(f"  {page_type}: {count}")
    print(f"Validation: {'PASS' if validation.is_pass else 'FAIL'}")
    print(f"CSV出力先: {args.output}")
    print(f"レポート出力先: {args.report}")

    if not validation.is_pass:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
