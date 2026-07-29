#!/usr/bin/env python3
"""歳入PDFの充当事業を22ページで追加検証する。"""

from __future__ import annotations

import argparse
import collections
import csv
import os
import re
import sys
from dataclasses import dataclass, replace
from pathlib import Path
from typing import Any

import pdfplumber

from extract_pdf_revenue_allocations_sample import (
    CSV_COLUMNS,
    SampleSegment,
    RevenueAccount,
    RevenueAllocationSampleMetrics,
    RevenueAllocationSampleResult,
    StatefulRevenueAllocationExtractor,
    calculate_metrics,
    load_revenue_accounts,
    markdown_escape,
    normalize_name,
    records_for_detail,
    resolve_path,
    write_notes,
    write_sample_csv,
)
from extract_pdf_sections_sample import FISCAL_YEAR


MIN_EXTENDED_SAMPLE_PAGE_COUNT = 20
MAX_EXTENDED_SAMPLE_PAGE_COUNT = 30
PHASE_26_HEADING = "## Phase 26: 追加サンプル検証"

EXTENDED_SAMPLE_SEGMENTS = (
    SampleSegment(
        account_code="general",
        pages=(38,),
        patterns=("充当事業なし", "一般財源系"),
        note="特別区税。充当事業記載がない正常ページ。",
        no_allocation_expected=True,
    ),
    SampleSegment(
        account_code="general",
        pages=(52,),
        patterns=("1細節1事業", "複数の目・節・細節"),
        note="分担金及負担金。1対1記載と複数階層を確認する。",
    ),
    SampleSegment(
        account_code="general",
        pages=(53, 54, 55, 56, 57, 58, 59),
        patterns=(
            "ページ継続",
            "複数充当先",
            "1千円・小額",
            "人件費",
        ),
        note=(
            "使用料の連続7ページ。ページ冒頭・末尾の継続、"
            "ガス関係、1千円行、人件費事業を確認する。"
        ),
    ),
    SampleSegment(
        account_code="general",
        pages=(65, 66, 67),
        patterns=("細節名称・金額の改行", "既存方式の失敗確認"),
        note=(
            "長い細節名の後で金額だけが次行へ送られるPDF 67を含む。"
            "既存方式の失敗を原因分類する。"
        ),
    ),
    SampleSegment(
        account_code="national_health_insurance",
        pages=(286, 287, 288, 289, 290, 291, 292),
        patterns=(
            "特別会計",
            "複数細節同一事業",
            "名称改行",
            "1千円",
        ),
        note=(
            "国保歳入の連続7ページ。改行された節名称、"
            "同一事業の反復、ページ継続を確認する。"
        ),
    ),
    SampleSegment(
        account_code="latter_stage_elderly_healthcare",
        pages=(328, 329, 330),
        patterns=("特別会計", "複数充当先", "人件費"),
        note="後期高齢者医療会計の先頭3ページ。",
    ),
    SampleSegment(
        account_code="long_term_care_insurance",
        pages=(358, 359, 360),
        patterns=("特別会計", "ページ継続", "1千円"),
        note="介護保険事業会計の先頭3ページ。",
    ),
)


@dataclass(frozen=True)
class OpenDetailSummary:
    account_code: str
    pdf_page: int
    saisetsu_code: str
    detail_name: str
    amount_thousand_yen: int | None


@dataclass(frozen=True)
class SampleRegressionMetrics:
    sample_row_count: int
    covered_row_count: int
    unchanged_parsed_row_count: int
    corrected_budget_book_page_row_count: int
    resolved_review_row_count: int
    unexpected_changed_parsed_row_count: int
    unresolved_review_row_count: int


@dataclass(frozen=True)
class ExtendedPatternMetrics:
    one_to_one_detail_count: int
    one_to_many_detail_count: int
    multiple_details_same_program_count: int
    repeated_program_multiple_page_count: int
    amount_one_detail_count: int
    small_amount_detail_count: int
    personnel_allocation_count: int
    special_account_allocation_count: int


def extended_sample_pages() -> tuple[int, ...]:
    return tuple(
        page
        for segment in EXTENDED_SAMPLE_SEGMENTS
        for page in segment.pages
    )


def validate_extended_configuration(
    accounts: dict[str, RevenueAccount],
) -> None:
    pages = extended_sample_pages()
    if not MIN_EXTENDED_SAMPLE_PAGE_COUNT <= len(pages) <= (
        MAX_EXTENDED_SAMPLE_PAGE_COUNT
    ):
        raise ValueError("追加サンプル対象は20〜30ページである必要があります。")
    if len(set(pages)) != len(pages):
        raise ValueError("追加サンプルページが重複しています。")
    expected_accounts = {
        "general",
        "national_health_insurance",
        "latter_stage_elderly_healthcare",
        "long_term_care_insurance",
    }
    if {segment.account_code for segment in EXTENDED_SAMPLE_SEGMENTS} != (
        expected_accounts
    ):
        raise ValueError("追加サンプルの対象4会計が不正です。")
    for segment in EXTENDED_SAMPLE_SEGMENTS:
        account = accounts[segment.account_code]
        if any(
            page < account.revenue_pdf_page_start
            or page > account.revenue_pdf_page_end
            for page in segment.pages
        ):
            raise ValueError(
                f"{segment.account_code}の追加サンプルページが歳入範囲外です。"
            )


def extract_footer_budget_book_page(page: Any) -> int | None:
    footer_numbers = [
        word
        for word in page.extract_words()
        if word["x0"] > page.width / 2
        and word["top"] > page.height - 85
        and re.fullmatch(r"\d{2,4}", word["text"])
    ]
    if not footer_numbers:
        return None
    return int(max(footer_numbers, key=lambda word: word["x0"])["text"])


def extract_extended_revenue_allocation_sample(
    pdf: Any,
    source_file: str,
    accounts: dict[str, RevenueAccount],
) -> tuple[RevenueAllocationSampleResult, tuple[OpenDetailSummary, ...]]:
    records: list[dict[str, Any]] = []
    page_summaries = []
    open_details: list[OpenDetailSummary] = []

    for segment_index, segment in enumerate(
        EXTENDED_SAMPLE_SEGMENTS,
        start=1,
    ):
        extractor = StatefulRevenueAllocationExtractor(
            source_file=source_file,
            account=accounts[segment.account_code],
        )
        for pdf_page in segment.pages:
            page = pdf.pages[pdf_page - 1]
            start_record_count = len(extractor.records)
            summary = extractor.process_page(
                page=page,
                pdf_page=pdf_page,
                no_allocation_expected=segment.no_allocation_expected,
            )
            budget_book_page = extract_footer_budget_book_page(page)
            for record in extractor.records[start_record_count:]:
                record["budget_book_page"] = budget_book_page or ""
            page_summaries.append(
                replace(summary, budget_book_page=budget_book_page)
            )

        active_detail = extractor.current_saisetsu
        if (
            active_detail is not None
            and active_detail.allocation_count == 0
            and not segment.no_allocation_expected
        ):
            open_details.append(
                OpenDetailSummary(
                    account_code=segment.account_code,
                    pdf_page=segment.pages[-1],
                    saisetsu_code=active_detail.code,
                    detail_name=active_detail.name,
                    amount_thousand_yen=active_detail.amount_thousand_yen,
                )
            )

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

    return (
        RevenueAllocationSampleResult(
            records=normalized_records,
            page_summaries=tuple(page_summaries),
            selected_pages=extended_sample_pages(),
        ),
        tuple(open_details),
    )


def read_phase25_sample(path: Path) -> list[dict[str, str]]:
    with path.open(encoding="utf-8", newline="") as stream:
        reader = csv.DictReader(stream)
        rows = list(reader)
    if reader.fieldnames != CSV_COLUMNS:
        raise ValueError("Phase 25サンプルCSVの列が不正です。")
    ids = [row["raw_allocation_id"] for row in rows]
    if len(ids) != len(set(ids)):
        raise ValueError("Phase 25サンプルCSVのIDが一意ではありません。")
    return rows


def stringify_record(record: dict[str, Any]) -> dict[str, str]:
    return {
        column: str(record[column])
        for column in CSV_COLUMNS
    }


def calculate_sample_regression(
    phase25_rows: list[dict[str, str]],
    result: RevenueAllocationSampleResult,
) -> SampleRegressionMetrics:
    extended_by_id = {
        str(record["raw_allocation_id"]): stringify_record(record)
        for record in result.records
    }
    covered = 0
    unchanged_parsed = 0
    corrected_budget_book_page = 0
    resolved_review = 0
    unexpected_changed_parsed = 0
    unresolved_review = 0

    for sample_row in phase25_rows:
        extended_row = extended_by_id.get(sample_row["raw_allocation_id"])
        if extended_row is None:
            continue
        covered += 1
        if sample_row["parse_status"] == "parsed":
            if sample_row == extended_row:
                unchanged_parsed += 1
            elif {
                column
                for column in CSV_COLUMNS
                if sample_row[column] != extended_row[column]
            } == {"budget_book_page"}:
                corrected_budget_book_page += 1
            else:
                unexpected_changed_parsed += 1
        elif extended_row["parse_status"] == "parsed":
            resolved_review += 1
        else:
            unresolved_review += 1

    return SampleRegressionMetrics(
        sample_row_count=len(phase25_rows),
        covered_row_count=covered,
        unchanged_parsed_row_count=unchanged_parsed,
        corrected_budget_book_page_row_count=(
            corrected_budget_book_page
        ),
        resolved_review_row_count=resolved_review,
        unexpected_changed_parsed_row_count=(
            unexpected_changed_parsed
        ),
        unresolved_review_row_count=unresolved_review,
    )


def calculate_pattern_metrics(
    result: RevenueAllocationSampleResult,
) -> ExtendedPatternMetrics:
    detail_rows: dict[
        tuple[str, int, int],
        list[dict[str, Any]],
    ] = collections.defaultdict(list)
    target_details: dict[
        tuple[str, str],
        set[tuple[int, int]],
    ] = collections.defaultdict(set)
    target_pages: dict[
        tuple[str, str],
        set[int],
    ] = collections.defaultdict(set)

    for record in result.records:
        detail_key = (
            str(record["account_code"]),
            int(record["_segment_index"]),
            int(record["_detail_uid"]),
        )
        if detail_key[2] > 0:
            detail_rows[detail_key].append(record)
        target_key = (
            str(record["account_code"]),
            normalize_name(str(record["pdf_target_program_name"])),
        )
        target_details[target_key].add(
            (
                int(record["_segment_index"]),
                int(record["_detail_uid"]),
            )
        )
        target_pages[target_key].add(int(record["pdf_page"]))

    amounts = [
        int(record["pdf_revenue_amount_thousand_yen"])
        for record in result.records
        if isinstance(record["pdf_revenue_amount_thousand_yen"], int)
    ]
    return ExtendedPatternMetrics(
        one_to_one_detail_count=sum(
            len(rows) == 1 for rows in detail_rows.values()
        ),
        one_to_many_detail_count=sum(
            len(rows) > 1 for rows in detail_rows.values()
        ),
        multiple_details_same_program_count=sum(
            len(details) > 1 for details in target_details.values()
        ),
        repeated_program_multiple_page_count=sum(
            len(pages) > 1 for pages in target_pages.values()
        ),
        amount_one_detail_count=sum(amount == 1 for amount in amounts),
        small_amount_detail_count=sum(
            0 < amount <= 10 for amount in amounts
        ),
        personnel_allocation_count=sum(
            "人件費" in str(record["pdf_target_program_name"])
            for record in result.records
        ),
        special_account_allocation_count=sum(
            record["account_code"] != "general"
            for record in result.records
        ),
    )


def has_continuation(
    result: RevenueAllocationSampleResult,
    account_code: str,
    detail_name: str,
    pdf_page: int,
    target_page: int,
) -> bool:
    return any(
        row["pdf_page"] == pdf_page
        and row["target_budget_book_page"] == target_page
        and row["parse_status"] == "parsed"
        for row in records_for_detail(result, account_code, detail_name)
    )


def validate_extended_sample(
    result: RevenueAllocationSampleResult,
    metrics: RevenueAllocationSampleMetrics,
    pattern_metrics: ExtendedPatternMetrics,
    regression: SampleRegressionMetrics,
    open_details: tuple[OpenDetailSummary, ...],
) -> None:
    errors: list[str] = []
    if not MIN_EXTENDED_SAMPLE_PAGE_COUNT <= metrics.selected_page_count <= (
        MAX_EXTENDED_SAMPLE_PAGE_COUNT
    ):
        errors.append("対象ページ数が20〜30ではありません。")
    if metrics.selected_page_count != 25:
        errors.append("Phase 26固定ゲートの対象ページ数が25ではありません。")
    if metrics.row_count != 325:
        errors.append("Phase 26固定ゲートの出力行数が325ではありません。")
    if metrics.parsed_count != 325 or metrics.needs_review_count != 0:
        errors.append("Phase 26固定ゲートが全件parsedではありません。")
    if metrics.source_allocation_marker_count != 325:
        errors.append("Phase 26固定ゲートのPDF記載数が325ではありません。")
    if metrics.unique_raw_allocation_id_count != metrics.row_count:
        errors.append("raw_allocation_idが一意ではありません。")
    if (
        metrics.source_allocation_marker_count != metrics.row_count
        or any(
            summary.source_allocation_marker_count
            != summary.allocation_count
            for summary in result.page_summaries
        )
    ):
        errors.append("ページ別の充当事業記載数と出力行数が一致しません。")
    if any(not summary.table_detected for summary in result.page_summaries):
        errors.append("表検出に失敗した対象ページがあります。")
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
        errors.append("PDF 38の充当事業なしページが正常扱いされていません。")
    if regression.covered_row_count != regression.sample_row_count:
        errors.append("Phase 25の全行を拡張サンプルで再現できません。")
    if regression.unexpected_changed_parsed_row_count:
        errors.append("Phase 25のparsed行に想定外の差分があります。")
    if regression.unresolved_review_row_count:
        errors.append("Phase 25のneeds_reviewが解消していません。")

    required_patterns = (
        pattern_metrics.one_to_one_detail_count,
        pattern_metrics.one_to_many_detail_count,
        pattern_metrics.multiple_details_same_program_count,
        pattern_metrics.repeated_program_multiple_page_count,
        pattern_metrics.amount_one_detail_count,
        pattern_metrics.small_amount_detail_count,
        pattern_metrics.personnel_allocation_count,
        pattern_metrics.special_account_allocation_count,
    )
    if any(count <= 0 for count in required_patterns):
        errors.append("必須パターンのいずれかを確認できません。")

    continuation_expectations = (
        ("general", "玉川地域出張所", 54, 333),
        ("general", "陶芸教室", 56, 343),
        ("general", "大腸がん検診", 58, 403),
        ("general", "多摩川玉堤広場", 59, 431),
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
    for expectation in continuation_expectations:
        if not has_continuation(result, *expectation):
            errors.append(
                f"{expectation[0]}:{expectation[1]}の継続所属に失敗しました。"
            )

    if not any(
        detail.account_code == "general"
        and detail.pdf_page == 59
        and normalize_name(detail.detail_name) == normalize_name("郷土資料館")
        and detail.amount_thousand_yen == 3
        for detail in open_details
    ):
        errors.append("PDF 59末尾の未閉鎖細節を保持できません。")

    wrapped_detail_rows = [
        row
        for row in result.records
        if row["account_code"] == "general"
        and row["pdf_page"] == 67
        and row["raw_allocation_id"] == "ra_2026_general_067_018"
    ]
    if (
        len(wrapped_detail_rows) != 1
        or wrapped_detail_rows[0]["saisetsu_code"] != "05"
        or normalize_name(
            str(wrapped_detail_rows[0]["pdf_revenue_detail_name"])
        )
        != normalize_name(
            "生活困窮者自立相談支援事業費"
            "（会計年度任用職員人件費）"
        )
        or wrapped_detail_rows[0]["pdf_department_name"]
        != "保健福祉政策部"
        or wrapped_detail_rows[0][
            "pdf_revenue_amount_thousand_yen"
        ]
        != 11_497
        or normalize_name(
            str(wrapped_detail_rows[0]["pdf_target_program_name"])
        )
        != normalize_name(
            "会計年度任用職員の人件費（保健福祉政策部）"
        )
        or wrapped_detail_rows[0]["target_budget_book_page"] != 467
        or wrapped_detail_rows[0]["parse_status"] != "parsed"
    ):
        errors.append("PDF 67の複数行細節固定回帰に失敗しました。")

    wrapped_rows = [
        row
        for row in result.records
        if row["account_code"] == "national_health_insurance"
        and row["pdf_page"] == 286
        and row["setsu_code"] == "02"
        and normalize_name(str(row["setsu_name"]))
        == normalize_name("医療給付費分滞納繰越分")
    ]
    if not wrapped_rows:
        errors.append("改行された節名称を復元できません。")

    page_288_rows = [
        row
        for row in result.records
        if row["account_code"] == "national_health_insurance"
        and row["pdf_page"] == 288
        and normalize_name(str(row["pdf_target_program_name"]))
        == normalize_name("療養給付費")
    ]
    if (
        len(page_288_rows) != 2
        or any(
            row["pdf_revenue_amount_thousand_yen"] != 1
            for row in page_288_rows
        )
        or len(
            {
                int(row["_detail_uid"])
                for row in page_288_rows
            }
        )
        != 2
    ):
        errors.append("複数細節から同一事業への対応を保持できません。")

    if errors:
        raise ValueError("\n".join(errors))


def render_phase26_notes(
    result: RevenueAllocationSampleResult,
    metrics: RevenueAllocationSampleMetrics,
    pattern_metrics: ExtendedPatternMetrics,
    regression: SampleRegressionMetrics,
    open_details: tuple[OpenDetailSummary, ...],
) -> str:
    summary_by_page = {
        summary.pdf_page: summary
        for summary in result.page_summaries
    }
    page_rows = []
    for segment in EXTENDED_SAMPLE_SEGMENTS:
        for pdf_page in segment.pages:
            summary = summary_by_page[pdf_page]
            page_rows.append(
                "| "
                f"`{segment.account_code}` | "
                f"{pdf_page} | "
                f"{summary.budget_book_page or '-'} | "
                f"{summary.source_allocation_marker_count:,} | "
                f"{summary.allocation_count:,} | "
                f"{summary.needs_review_count:,} | "
                f"{'一致' if summary.source_allocation_marker_count == summary.allocation_count else '不一致'} |"
            )

    segment_rows = []
    for segment in EXTENDED_SAMPLE_SEGMENTS:
        summaries = [summary_by_page[page] for page in segment.pages]
        segment_rows.append(
            "| "
            f"`{segment.account_code}` | "
            f"{', '.join(str(page) for page in segment.pages)} | "
            f"{', '.join(segment.patterns)} | "
            f"{sum(summary.allocation_count for summary in summaries):,} | "
            f"{sum(summary.needs_review_count for summary in summaries):,} | "
            f"{markdown_escape(segment.note)} |"
        )

    if metrics.review_cause_counts:
        review_rows = [
            f"| `{cause}` | {count:,} |"
            for cause, count in metrics.review_cause_counts.items()
        ]
    else:
        review_rows = ["| - | 0 |"]

    review_example_rows = [
        "| "
        f"`{record['raw_allocation_id']}` | "
        f"{record['pdf_page']} | "
        f"{markdown_escape(str(record['pdf_target_program_name']) or '-')} | "
        f"`{record['parse_note']}` |"
        for record in result.records
        if record["parse_status"] == "needs_review"
    ]
    if not review_example_rows:
        review_example_rows = ["| - | - | - | - |"]

    if open_details:
        open_rows = [
            "| "
            f"`{detail.account_code}` | "
            f"{detail.pdf_page} | "
            f"{detail.saisetsu_code} | "
            f"{markdown_escape(detail.detail_name)} | "
            f"{detail.amount_thousand_yen:,} |"
            for detail in open_details
            if detail.amount_thousand_yen is not None
        ]
    else:
        open_rows = ["| - | - | - | - | - |"]

    return "\n".join(
        [
            PHASE_26_HEADING,
            "",
            "### 結論",
            "",
            (
                f"- 全4会計から{metrics.selected_page_count}物理ページを選び、"
                "全ページ抽出は実行していない。"
            ),
            "- PDFテキスト層と表座標を使用し、OCRは使用していない。",
            (
                f"- `充当事業：`は{metrics.row_count:,}行を抽出し、"
                f"`parsed` {metrics.parsed_count:,}行、"
                f"`needs_review` {metrics.needs_review_count:,}行だった。"
            ),
            (
                "- PDF内の出現数とCSV行数は、対象"
                f"{metrics.selected_page_count}ページすべてで一致した。"
            ),
            (
                "- Phase 25の148行は全件同じIDで再抽出でき、"
                f"既存`parsed`のうち{regression.unchanged_parsed_row_count:,}行は"
                "全25列が一致した。"
            ),
            (
                "- 残る"
                f"{regression.corrected_budget_book_page_row_count:,}行は、"
                "PDF 53・358で右端の細節金額を冊子ページと誤認していた"
                "`budget_book_page`だけを、99・709へ補正した。"
            ),
            (
                f"- Phase 25で文脈不足だった{regression.resolved_review_row_count:,}行は、"
                "PDF 53〜59を連続処理することで`parsed`になった。"
            ),
            "- CSV側の`revenue_detail_id`との結合は行っていない。",
            "",
            "このサンプル範囲ではPhase 27の全体抽出へ進める。ただし、",
            "PDF 67修正後の25ページ固定ゲートを必ず先に通し、会計の歳入範囲を",
            "先頭から末尾まで連続処理することを必須条件とする。",
            "",
            "### 対象ページ",
            "",
            "| account_code | PDF物理ページ | 主なパターン | 抽出行 | needs_review | 備考 |",
            "| --- | --- | --- | ---: | ---: | --- |",
            *segment_rows,
            "",
            (
                "学校給食費会計は令和8年度`abolished_zero`のため、"
                "PDF抽出対象外。"
            ),
            "",
            "### ページ別の記載数照合",
            "",
            "| account_code | PDF物理ページ | 冊子ページ | PDFの`充当事業：` | 出力行 | needs_review | 判定 |",
            "| --- | ---: | ---: | ---: | ---: | ---: | --- |",
            *page_rows,
            "",
            (
                f"合計はPDF記載{metrics.source_allocation_marker_count:,}件、"
                f"出力{metrics.row_count:,}行で一致。"
            ),
            "",
            "### パターン別確認",
            "",
            "| パターン | 確認結果 |",
            "| --- | --- |",
            (
                "| 1細節→1事業 | "
                f"{pattern_metrics.one_to_one_detail_count:,}細節。"
                "PDF 55の土と農の交流園1千円などで確認。 |"
            ),
            (
                "| 1細節→複数事業 | "
                f"{pattern_metrics.one_to_many_detail_count:,}細節。"
                "PDF 58のガス関係922,900千円などを別行で保持。 |"
            ),
            (
                "| 複数細節→同じ事業 | "
                f"{pattern_metrics.multiple_details_same_program_count:,}事業。"
                "PDF 288の現年分・滞納繰越分各1千円を、"
                "別細節のまま療養給付費へ保持。 |"
            ),
            (
                "| ページ冒頭が前ページの続き | "
                "PDF 54、56、58、59、292、359で直前細節へ所属。 |"
            ),
            (
                "| ページ末尾で細節が閉じない | "
                "PDF 55→56、57→58、58→59を継続。"
                "PDF 59末尾の郷土資料館3千円も未閉鎖状態として検出。 |"
            ),
            (
                "| 節名称の改行 | "
                "PDF 286の「医療給付費分滞納繰越分」などを連結して復元。 |"
            ),
            (
                "| 細節名称・金額の改行 | "
                "PDF 67の長い細節名、括弧内所属、次行の11,497千円を"
                "分離し、充当事業P467まで`parsed`として復元。 |"
            ),
            (
                "| 1千円・小額 | "
                f"1千円は{pattern_metrics.amount_one_detail_count:,}細節、"
                f"1〜10千円は{pattern_metrics.small_amount_detail_count:,}細節。 |"
            ),
            (
                "| 同じ事業名が複数ページ | "
                f"{pattern_metrics.repeated_program_multiple_page_count:,}事業。"
                "国保の医療給付費分納付金はPDF 286、290〜292に存在。 |"
            ),
            (
                "| 人件費事業 | "
                f"{pattern_metrics.personnel_allocation_count:,}行を保持。"
                "一般会計・国保・後期高齢者医療で確認。 |"
            ),
            (
                "| 特別会計 | "
                f"{pattern_metrics.special_account_allocation_count:,}行。"
                "国保、後期高齢者医療、介護保険を含む。 |"
            ),
            (
                "| 充当事業なし | PDF 38の特別区税は0行で、"
                "エラーではなく正常ページとして扱った。 |"
            ),
            "",
            "### ページ末尾の未閉鎖細節",
            "",
            "| account_code | PDF物理ページ | 細節コード | 細節名 | 金額（千円） |",
            "| --- | ---: | --- | --- | ---: |",
            *open_rows,
            "",
            "この表はエラー行ではない。サンプル区間の末尾で",
            "次ページを未処理のため、stateを閉じずに保持した記録である。",
            "",
            "### needs_review",
            "",
            "| 原因コード | 件数 |",
            "| --- | ---: |",
            *review_rows,
            "",
            "| raw_allocation_id | PDFページ | 充当事業 | 原因コード |",
            "| --- | ---: | --- | --- |",
            *review_example_rows,
            "",
            (
                f"`needs_review`合計は{metrics.needs_review_count:,}件。"
                "追加した連続ページにより、Phase 25の"
                "`sample_gap_current_moku_missing`等は解消した。"
                "PDF 67の複数行細節も固定回帰を通過した。"
            ),
            "",
            "### Phase 25回帰",
            "",
            "| 項目 | 件数 |",
            "| --- | ---: |",
            f"| Phase 25入力行 | {regression.sample_row_count:,} |",
            f"| 同一IDで再抽出 | {regression.covered_row_count:,} |",
            (
                "| 既存parsed行の全25列一致 | "
                f"{regression.unchanged_parsed_row_count:,} |"
            ),
            (
                "| budget_book_pageのみ補正 | "
                f"{regression.corrected_budget_book_page_row_count:,} |"
            ),
            (
                "| needs_reviewからparsedへ改善 | "
                f"{regression.resolved_review_row_count:,} |"
            ),
            (
                "| 既存parsed行の想定外差分 | "
                f"{regression.unexpected_changed_parsed_row_count:,} |"
            ),
            (
                "| 未解消needs_review | "
                f"{regression.unresolved_review_row_count:,} |"
            ),
            "",
            "### Phase 27で必要な改修",
            "",
            "1. PDF 67の複数行細節固定ゲートを全ページ処理前に必ず実行する。",
            "2. `config/budget-accounts.json`の歳入PDF範囲を、会計ごとに先頭から末尾まで連続処理する。",
            "3. `current_account / current_kan / current_kou / current_moku / current_setsu / current_saisetsu`をページ間で保持し、新しい階層または細節を検出した時だけ下位stateを閉じる。",
            "4. ページ末尾では細節を確定せず、次ページ冒頭の充当事業を直前細節へ割り当てる。会計末尾でのみ未閉鎖状態を確定する。",
            "5. ページ別の`充当事業：`記載数と出力行数を全対象ページで照合し、不一致は原因コード付きで停止する。",
            "6. 複数充当先でも細節金額を複製せず、`allocation_sequence`と細節stateを分離して保持する。",
            "7. 充当事業なしページと、充当事業を持たない細節を正常な0件として区別する。",
            "8. 表検出、階層欠落、名称解析、対象冊子ページ範囲外を別々の`needs_review`原因にする。",
            "9. CSV側の`revenue_detail_id`との結合は全体抽出後の別工程とし、このPDF抽出器では行わない。",
            "",
            "### このPhaseで作成していないもの",
            "",
            "- 全ページのPDF歳入充当事業CSV",
            "- `budget_revenue_allocations.csv`",
            "- CSV側`revenue_detail_id`との結合",
            "- 充当先別の配分額",
            "",
        ]
    )


def append_phase26_notes(existing_notes: str, phase26_notes: str) -> str:
    marker = f"\n{PHASE_26_HEADING}\n"
    marker_index = existing_notes.find(marker)
    if marker_index >= 0:
        existing_notes = existing_notes[:marker_index]
    return f"{existing_notes.rstrip()}\n\n{phase26_notes.rstrip()}\n"


def main() -> None:
    repo_root = Path(__file__).resolve().parents[3]
    parser = argparse.ArgumentParser(
        description="歳入PDFの充当事業を22ページで追加検証します。"
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
            / "processed" / "audit" / "raw_pdf_revenue_allocations_sample.csv"
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
            / "processed" / "audit" / "raw_pdf_revenue_allocations_extended_sample.csv"
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
    args.sample = resolve_path(args.sample, repo_root)
    args.config = resolve_path(args.config, repo_root)
    args.output = resolve_path(args.output, repo_root)
    args.notes = resolve_path(args.notes, repo_root)

    accounts = load_revenue_accounts(args.config)
    validate_extended_configuration(accounts)
    phase25_rows = read_phase25_sample(args.sample)
    with pdfplumber.open(args.pdf) as pdf:
        if max(extended_sample_pages()) > len(pdf.pages):
            raise ValueError("追加サンプルページがPDFページ数を超えています。")
        result, open_details = extract_extended_revenue_allocation_sample(
            pdf=pdf,
            source_file=args.pdf.name,
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

    phase26_notes = render_phase26_notes(
        result,
        metrics,
        pattern_metrics,
        regression,
        open_details,
    )
    notes = append_phase26_notes(
        args.notes.read_text(encoding="utf-8"),
        phase26_notes,
    )
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
        if verified_notes.count(PHASE_26_HEADING) != 1:
            raise ValueError("一時ノートのPhase 26見出しが不正です。")
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
        "Source allocation markers: "
        f"{metrics.source_allocation_marker_count}"
    )
    print(f"Account rows: {metrics.account_row_counts}")
    print(
        "Phase 25 regression: "
        f"covered={regression.covered_row_count}, "
        f"unchanged_parsed={regression.unchanged_parsed_row_count}, "
        "corrected_budget_book_page="
        f"{regression.corrected_budget_book_page_row_count}, "
        f"resolved_review={regression.resolved_review_row_count}"
    )
    print(f"Review causes: {metrics.review_cause_counts}")
    print(f"Output: {args.output}")
    print(f"Notes: {args.notes}")


if __name__ == "__main__":
    main()
