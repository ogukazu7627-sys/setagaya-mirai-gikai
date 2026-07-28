import csv
import os
import tempfile
import unittest
from pathlib import Path

from extract_pdf_revenue_allocations_extended_sample import (
    EXTENDED_SAMPLE_SEGMENTS,
    PHASE_26_HEADING,
    append_phase26_notes,
    calculate_pattern_metrics,
    calculate_sample_regression,
    extended_sample_pages,
    extract_extended_revenue_allocation_sample,
    read_phase25_sample,
    render_phase26_notes,
    validate_extended_configuration,
    validate_extended_sample,
)
from extract_pdf_revenue_allocations_sample import (
    CSV_COLUMNS,
    SAMPLE_SEGMENTS,
    calculate_metrics,
    load_revenue_accounts,
    records_for_detail,
    write_sample_csv,
)


def repo_root() -> Path:
    return Path(__file__).resolve().parents[3]


def find_budget_pdf() -> Path:
    configured_path = os.environ.get("BUDGET_PDF_PATH")
    if configured_path:
        return Path(configured_path)
    return repo_root() / "raw" / "r8tousyoyosanallpage.pdf"


def phase25_sample_path() -> Path:
    return (
        repo_root()
        / "processed"
        / "raw_pdf_revenue_allocations_sample.csv"
    )


class ExtendedRevenueAllocationConfigurationTest(unittest.TestCase):
    def test_sample_has_25_unique_pages_across_four_accounts(self) -> None:
        pages = extended_sample_pages()
        accounts = {
            segment.account_code
            for segment in EXTENDED_SAMPLE_SEGMENTS
        }

        self.assertEqual(len(pages), 25)
        self.assertEqual(len(set(pages)), 25)
        self.assertEqual(
            accounts,
            {
                "general",
                "national_health_insurance",
                "latter_stage_elderly_healthcare",
                "long_term_care_insurance",
            },
        )
        self.assertTrue(
            set(page for segment in SAMPLE_SEGMENTS for page in segment.pages)
            <= set(pages)
        )


@unittest.skipUnless(
    find_budget_pdf().is_file() and phase25_sample_path().is_file(),
    "予算説明書PDFとPhase 25サンプルCSVが必要です。",
)
class ExtendedRevenueAllocationPdfTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        import pdfplumber

        cls.pdf_path = find_budget_pdf()
        cls.accounts = load_revenue_accounts(
            repo_root() / "config" / "budget-accounts.json"
        )
        validate_extended_configuration(cls.accounts)
        cls.phase25_rows = read_phase25_sample(phase25_sample_path())
        with pdfplumber.open(cls.pdf_path) as pdf:
            (
                cls.result,
                cls.open_details,
            ) = extract_extended_revenue_allocation_sample(
                pdf=pdf,
                source_file=cls.pdf_path.name,
                accounts=cls.accounts,
            )
        cls.metrics = calculate_metrics(cls.result)
        cls.pattern_metrics = calculate_pattern_metrics(cls.result)
        cls.regression = calculate_sample_regression(
            cls.phase25_rows,
            cls.result,
        )
        validate_extended_sample(
            cls.result,
            cls.metrics,
            cls.pattern_metrics,
            cls.regression,
            cls.open_details,
        )

    def test_fixed_counts_and_page_marker_comparison(self) -> None:
        self.assertEqual(self.metrics.selected_page_count, 25)
        self.assertEqual(self.metrics.row_count, 325)
        self.assertEqual(self.metrics.parsed_count, 325)
        self.assertEqual(self.metrics.needs_review_count, 0)
        self.assertEqual(
            self.metrics.source_allocation_marker_count,
            325,
        )
        self.assertEqual(
            self.metrics.unique_raw_allocation_id_count,
            325,
        )
        self.assertEqual(
            self.metrics.account_row_counts,
            {
                "general": 202,
                "latter_stage_elderly_healthcare": 17,
                "long_term_care_insurance": 35,
                "national_health_insurance": 71,
            },
        )
        self.assertTrue(
            all(
                summary.source_allocation_marker_count
                == summary.allocation_count
                for summary in self.result.page_summaries
            )
        )
        source_pages = {
            summary.pdf_page: summary.budget_book_page
            for summary in self.result.page_summaries
        }
        self.assertEqual(source_pages[53], 99)
        self.assertEqual(source_pages[358], 709)

    def test_all_required_patterns_are_present(self) -> None:
        self.assertEqual(
            self.pattern_metrics.one_to_one_detail_count,
            311,
        )
        self.assertEqual(
            self.pattern_metrics.one_to_many_detail_count,
            6,
        )
        self.assertEqual(
            self.pattern_metrics.amount_one_detail_count,
            7,
        )
        self.assertEqual(
            self.pattern_metrics.small_amount_detail_count,
            12,
        )
        self.assertGreater(
            self.pattern_metrics.multiple_details_same_program_count,
            0,
        )
        self.assertGreater(
            self.pattern_metrics.repeated_program_multiple_page_count,
            0,
        )
        self.assertEqual(
            self.pattern_metrics.personnel_allocation_count,
            16,
        )
        self.assertEqual(
            self.pattern_metrics.special_account_allocation_count,
            123,
        )

    def test_continuations_keep_the_previous_detail(self) -> None:
        expected = (
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
        for account_code, detail_name, pdf_page, target_page in expected:
            rows = records_for_detail(
                self.result,
                account_code,
                detail_name,
            )
            self.assertTrue(
                any(
                    row["pdf_page"] == pdf_page
                    and row["target_budget_book_page"] == target_page
                    and row["parse_status"] == "parsed"
                    for row in rows
                )
            )

    def test_wrapped_name_same_target_and_open_detail(self) -> None:
        wrapped_rows = [
            row
            for row in self.result.records
            if row["account_code"] == "national_health_insurance"
            and row["pdf_page"] == 286
            and row["setsu_code"] == "02"
            and row["setsu_name"] == "医療給付費分滞納繰越分"
        ]
        self.assertEqual(len(wrapped_rows), 1)
        same_target_rows = [
            row
            for row in self.result.records
            if row["account_code"] == "national_health_insurance"
            and row["pdf_page"] == 288
            and row["pdf_target_program_name"] == "療養給付費"
        ]
        self.assertEqual(len(same_target_rows), 2)
        self.assertEqual(
            [
                row["pdf_revenue_amount_thousand_yen"]
                for row in same_target_rows
            ],
            [1, 1],
        )
        self.assertTrue(
            any(
                detail.account_code == "general"
                and detail.pdf_page == 59
                and detail.detail_name == "郷土資料館"
                and detail.amount_thousand_yen == 3
                for detail in self.open_details
            )
        )
        wrapped_detail_rows = [
            row
            for row in self.result.records
            if row["account_code"] == "general"
            and row["pdf_page"] == 67
            and row["raw_allocation_id"] == "ra_2026_general_067_018"
        ]
        self.assertEqual(len(wrapped_detail_rows), 1)
        self.assertEqual(
            wrapped_detail_rows[0]["saisetsu_code"],
            "05",
        )
        self.assertEqual(
            wrapped_detail_rows[0]["pdf_revenue_detail_name"],
            "生活困窮者自立相談支援事業費"
            "(会計年度任用職員人件費)",
        )
        self.assertEqual(
            wrapped_detail_rows[0]["pdf_department_name"],
            "保健福祉政策部",
        )
        self.assertEqual(
            wrapped_detail_rows[0][
                "pdf_revenue_amount_thousand_yen"
            ],
            11_497,
        )
        self.assertEqual(
            wrapped_detail_rows[0]["pdf_target_program_name"],
            "会計年度任用職員の人件費(保健福祉政策部)",
        )
        self.assertEqual(
            wrapped_detail_rows[0]["target_budget_book_page"],
            467,
        )
        self.assertEqual(
            wrapped_detail_rows[0]["parse_status"],
            "parsed",
        )

    def test_phase25_regression_and_review_resolution(self) -> None:
        self.assertEqual(self.regression.sample_row_count, 148)
        self.assertEqual(self.regression.covered_row_count, 148)
        self.assertEqual(
            self.regression.unchanged_parsed_row_count,
            106,
        )
        self.assertEqual(
            self.regression.corrected_budget_book_page_row_count,
            36,
        )
        self.assertEqual(self.regression.resolved_review_row_count, 6)
        self.assertEqual(
            self.regression.unexpected_changed_parsed_row_count,
            0,
        )
        self.assertEqual(self.regression.unresolved_review_row_count, 0)

    def test_csv_and_notes_shape(self) -> None:
        phase26_notes = render_phase26_notes(
            self.result,
            self.metrics,
            self.pattern_metrics,
            self.regression,
            self.open_details,
        )
        appended_notes = append_phase26_notes(
            "# Phase 25\n\n既存ノート\n",
            phase26_notes,
        )
        with tempfile.TemporaryDirectory() as temporary_directory:
            output_path = (
                Path(temporary_directory)
                / "raw_pdf_revenue_allocations_extended_sample.csv"
            )
            write_sample_csv(output_path, self.result.records)
            with output_path.open(
                encoding="utf-8",
                newline="",
            ) as stream:
                reader = csv.DictReader(stream)
                rows = list(reader)

        self.assertEqual(reader.fieldnames, CSV_COLUMNS)
        self.assertEqual(len(rows), 325)
        self.assertNotIn("revenue_detail_id", reader.fieldnames or [])
        self.assertEqual(appended_notes.count(PHASE_26_HEADING), 1)
        self.assertIn("Phase 27で必要な改修", appended_notes)
        self.assertIn("CSV側の`revenue_detail_id`との結合は行っていない", appended_notes)

    def test_formal_outputs_match_current_extraction(self) -> None:
        output_path = (
            repo_root()
            / "processed"
            / "raw_pdf_revenue_allocations_extended_sample.csv"
        )
        notes_path = (
            repo_root()
            / "docs"
            / "pdf_revenue_allocation_extraction_notes.md"
        )
        with output_path.open(
            encoding="utf-8",
            newline="",
        ) as stream:
            reader = csv.DictReader(stream)
            actual_rows = list(reader)
        expected_rows = [
            {
                column: str(record[column])
                for column in CSV_COLUMNS
            }
            for record in self.result.records
        ]
        expected_phase26 = render_phase26_notes(
            self.result,
            self.metrics,
            self.pattern_metrics,
            self.regression,
            self.open_details,
        )

        self.assertEqual(reader.fieldnames, CSV_COLUMNS)
        self.assertEqual(actual_rows, expected_rows)
        self.assertTrue(
            notes_path.read_text(encoding="utf-8").endswith(
                f"{expected_phase26.rstrip()}\n"
            )
        )


if __name__ == "__main__":
    unittest.main()
