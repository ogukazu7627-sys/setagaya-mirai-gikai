import csv
import os
import tempfile
import unittest
from pathlib import Path

from extract_pdf_sections_special import (
    EXPECTED_SPECIAL_ACCOUNT_TOTAL,
    build_full_extraction_report,
    extract_special_accounts_from_pdf,
    validate_full_extraction,
)
from extract_pdf_sections_special_sample import (
    CSV_COLUMNS,
    calculate_special_sample_metrics,
    load_special_accounts,
    write_special_sample_csv,
)
from extract_pdf_sections_stateful import (
    PAGE_TYPE_CONTINUATION,
    PAGE_TYPE_SUMMARY,
)


def repo_root() -> Path:
    return Path(__file__).resolve().parents[3]


def config_path() -> Path:
    return repo_root() / "config" / "budget-accounts.json"


def find_budget_pdf() -> Path:
    configured_path = os.environ.get("BUDGET_PDF_PATH")
    if configured_path:
        return Path(configured_path)
    return repo_root() / "raw" / "r8tousyoyosanallpage.pdf"


@unittest.skipUnless(
    find_budget_pdf().is_file(),
    "BUDGET_PDF_PATHまたはraw/に予算説明書PDFが必要です。",
)
class SpecialAccountFullExtractionTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        import pdfplumber

        cls.pdf_path = find_budget_pdf()
        cls.accounts = load_special_accounts(config_path())
        cls.pdf = pdfplumber.open(cls.pdf_path)
        cls.result = extract_special_accounts_from_pdf(
            pdf=cls.pdf,
            source_file=cls.pdf_path.name,
            accounts=cls.accounts,
        )
        cls.metrics = calculate_special_sample_metrics(cls.result)
        cls.validation = validate_full_extraction(
            cls.result,
            cls.metrics,
        )

    @classmethod
    def tearDownClass(cls) -> None:
        cls.pdf.close()

    def test_full_metrics_are_fixed(self) -> None:
        self.assertEqual(self.metrics.selected_page_count, 43)
        self.assertEqual(self.metrics.row_count, 122)
        self.assertEqual(self.metrics.matched_row_count, 122)
        self.assertEqual(self.metrics.needs_review_count, 0)
        self.assertEqual(self.metrics.unique_raw_section_id_count, 122)
        self.assertEqual(self.metrics.moku_count, 58)
        self.assertEqual(self.metrics.matched_moku_count, 58)
        self.assertEqual(
            self.metrics.section_sum_thousand_yen,
            EXPECTED_SPECIAL_ACCOUNT_TOTAL,
        )
        self.assertEqual(
            self.metrics.moku_total_sum_thousand_yen,
            EXPECTED_SPECIAL_ACCOUNT_TOTAL,
        )
        self.assertEqual(
            self.metrics.page_type_counts,
            {
                "continuation_page": 1,
                "detail_page": 41,
                "summary_page": 1,
            },
        )
        self.assertTrue(self.validation.is_pass)

    def test_account_totals_match_config(self) -> None:
        expected = {
            "national_health_insurance": (16, 42, 22, 84_206_905),
            "latter_stage_elderly_healthcare": (
                6,
                21,
                7,
                29_414_796,
            ),
            "long_term_care_insurance": (21, 59, 29, 76_058_953),
        }

        for account_code, (
            page_count,
            row_count,
            moku_count,
            total,
        ) in expected.items():
            metric = self.metrics.account_metrics[account_code]
            self.assertEqual(metric.selected_page_count, page_count)
            self.assertEqual(metric.row_count, row_count)
            self.assertEqual(metric.moku_count, moku_count)
            self.assertEqual(metric.matched_moku_count, moku_count)
            self.assertEqual(metric.needs_review_count, 0)
            self.assertEqual(metric.section_sum_thousand_yen, total)
            self.assertEqual(metric.moku_total_sum_thousand_yen, total)
            self.assertTrue(
                self.validation.account_total_matches[account_code]
            )

    def test_account_boundaries_and_school_lunch_exclusion(self) -> None:
        account_codes = {
            record["account_code"] for record in self.result.records
        }
        self.assertEqual(
            account_codes,
            {
                "national_health_insurance",
                "latter_stage_elderly_healthcare",
                "long_term_care_insurance",
            },
        )
        self.assertNotIn("school_lunch_fee", account_codes)

        for account_result in self.result.account_results:
            account = account_result.account
            self.assertEqual(
                account_result.selected_pages,
                tuple(
                    range(
                        account.pdf_page_start,
                        account.pdf_page_end + 1,
                    )
                ),
            )
            self.assertEqual(
                {
                    record["account_name"]
                    for record in account_result.records
                },
                {account.account_name},
            )

    def test_summary_and_continuation_pages_are_stateful(self) -> None:
        long_term_result = next(
            account_result
            for account_result in self.result.account_results
            if account_result.account.account_code
            == "long_term_care_insurance"
        )
        summary_layout = next(
            layout
            for layout in long_term_result.page_layouts
            if layout.pdf_page == 382
        )
        continuation_layout = next(
            layout
            for layout in long_term_result.page_layouts
            if layout.pdf_page == 397
        )
        spanning_moku = next(
            validation
            for validation in long_term_result.moku_validations
            if validation.key == ("49", "02", "02")
        )

        self.assertEqual(summary_layout.page_type, PAGE_TYPE_SUMMARY)
        self.assertEqual(
            continuation_layout.page_type,
            PAGE_TYPE_CONTINUATION,
        )
        self.assertEqual(spanning_moku.start_pdf_page, 396)
        self.assertEqual(spanning_moku.end_pdf_page, 397)
        self.assertEqual(
            spanning_moku.section_sum_thousand_yen,
            290_146,
        )
        self.assertEqual(
            spanning_moku.moku_total_amount_thousand_yen,
            290_146,
        )
        self.assertTrue(spanning_moku.amount_matched)
        self.assertFalse(
            any(
                record["pdf_page"] in {382, 397}
                for record in self.result.records
            )
        )

    def test_output_csv_uses_phase_10_schema(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            output_path = (
                Path(temporary_directory)
                / "raw_pdf_sections_special.csv"
            )
            write_special_sample_csv(output_path, self.result.records)
            with output_path.open(
                encoding="utf-8",
                newline="",
            ) as output_file:
                reader = csv.DictReader(output_file)
                rows = list(reader)
                fieldnames = reader.fieldnames

        self.assertEqual(fieldnames, CSV_COLUMNS)
        self.assertEqual(len(rows), 122)
        self.assertEqual(
            {row["parse_status"] for row in rows},
            {"matched"},
        )
        self.assertEqual(
            len({row["raw_section_id"] for row in rows}),
            len(rows),
        )

    def test_report_contains_every_moku_and_validation_result(self) -> None:
        report = build_full_extraction_report(
            input_path=self.pdf_path,
            config_path=config_path(),
            output_path=Path(
                "processed/audit/raw_pdf_sections_special.csv"
            ),
            result=self.result,
            metrics=self.metrics,
            validation=self.validation,
        )

        self.assertIn("**PASS**", report)
        self.assertIn("189,680,654", report)
        self.assertIn(
            "`parse_status=needs_review` は0件",
            report,
        )
        self.assertIn("396-397", report)
        self.assertEqual(report.count("| matched | `-` |"), 58)


if __name__ == "__main__":
    unittest.main()
