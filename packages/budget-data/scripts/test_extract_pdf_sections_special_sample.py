import csv
import os
import tempfile
import unittest
from pathlib import Path

from extract_pdf_sections_special_sample import (
    CSV_COLUMNS,
    SAMPLE_PAGE_WINDOWS,
    TARGET_ACCOUNT_CODES,
    calculate_special_sample_metrics,
    extract_special_sample_from_pdf,
    load_special_accounts,
    sample_pages,
    write_special_sample_csv,
)
from extract_pdf_sections_stateful import PAGE_TYPE_CONTINUATION


def repo_root() -> Path:
    return Path(__file__).resolve().parents[3]


def config_path() -> Path:
    return repo_root() / "config" / "budget-accounts.json"


def find_budget_pdf() -> Path:
    configured_path = os.environ.get("BUDGET_PDF_PATH")
    if configured_path:
        return Path(configured_path)
    return repo_root() / "raw" / "r8tousyoyosanallpage.pdf"


class SpecialSampleConfigurationTest(unittest.TestCase):
    def test_each_account_has_two_or_three_selected_pages(self) -> None:
        accounts = load_special_accounts(config_path())

        self.assertEqual(
            tuple(account.account_code for account in accounts),
            TARGET_ACCOUNT_CODES,
        )
        for account in accounts:
            pages = sample_pages(
                SAMPLE_PAGE_WINDOWS[account.account_code]
            )
            self.assertGreaterEqual(len(pages), 2)
            self.assertLessEqual(len(pages), 3)
            self.assertEqual(len(pages), len(set(pages)))
            self.assertTrue(
                all(
                    account.pdf_page_start
                    <= page
                    <= account.pdf_page_end
                    for page in pages
                )
            )


@unittest.skipUnless(
    find_budget_pdf().is_file(),
    "BUDGET_PDF_PATHまたはraw/に予算説明書PDFが必要です。",
)
class SpecialAccountPdfSectionSampleTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        import pdfplumber

        cls.pdf_path = find_budget_pdf()
        cls.pdf = pdfplumber.open(cls.pdf_path)
        cls.accounts = load_special_accounts(config_path())
        cls.result = extract_special_sample_from_pdf(
            pdf=cls.pdf,
            source_file=cls.pdf_path.name,
            accounts=cls.accounts,
        )
        cls.metrics = calculate_special_sample_metrics(cls.result)

    @classmethod
    def tearDownClass(cls) -> None:
        cls.pdf.close()

    def test_sample_metrics_are_fixed(self) -> None:
        self.assertEqual(self.metrics.selected_page_count, 8)
        self.assertEqual(self.metrics.row_count, 46)
        self.assertEqual(self.metrics.matched_row_count, 46)
        self.assertEqual(self.metrics.needs_review_count, 0)
        self.assertEqual(self.metrics.unique_raw_section_id_count, 46)
        self.assertEqual(self.metrics.moku_count, 11)
        self.assertEqual(self.metrics.matched_moku_count, 11)
        self.assertEqual(
            self.metrics.section_sum_thousand_yen,
            31_142_894,
        )
        self.assertEqual(
            self.metrics.moku_total_sum_thousand_yen,
            31_142_894,
        )
        self.assertEqual(
            self.metrics.page_type_counts,
            {"continuation_page": 1, "detail_page": 7},
        )

    def test_account_names_and_required_general_admin_pages_are_kept(
        self,
    ) -> None:
        expected = {
            "national_health_insurance": (
                "国民健康保険事業会計",
                "21",
            ),
            "latter_stage_elderly_healthcare": (
                "後期高齢者医療会計",
                "61",
            ),
            "long_term_care_insurance": (
                "介護保険事業会計",
                "41",
            ),
        }
        for account_code, (account_name, kan_code) in expected.items():
            rows = [
                record
                for record in self.result.records
                if record["account_code"] == account_code
                and record["kan_code"] == kan_code
            ]
            self.assertTrue(rows)
            self.assertEqual(
                {record["account_name"] for record in rows},
                {account_name},
            )
            self.assertEqual(
                {record["kan_name"] for record in rows},
                {"総務費"},
            )

    def test_page_396_to_397_keeps_current_moku(self) -> None:
        long_term_result = next(
            account_result
            for account_result in self.result.account_results
            if account_result.account.account_code
            == "long_term_care_insurance"
        )
        continuation_layout = next(
            layout
            for layout in long_term_result.page_layouts
            if layout.pdf_page == 397
        )
        target_validation = next(
            validation
            for validation in long_term_result.moku_validations
            if validation.key == ("49", "02", "02")
        )

        self.assertEqual(
            continuation_layout.page_type,
            PAGE_TYPE_CONTINUATION,
        )
        self.assertEqual(target_validation.start_pdf_page, 396)
        self.assertEqual(target_validation.end_pdf_page, 397)
        self.assertEqual(
            target_validation.section_sum_thousand_yen,
            290_146,
        )
        self.assertEqual(
            target_validation.moku_total_amount_thousand_yen,
            290_146,
        )
        self.assertTrue(target_validation.amount_matched)
        self.assertFalse(
            any(
                record["pdf_page"] == 397
                for record in self.result.records
            )
        )

    def test_output_csv_has_the_requested_columns(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            output_path = (
                Path(temporary_directory)
                / "raw_pdf_sections_special_sample.csv"
            )
            write_special_sample_csv(output_path, self.result.records)
            with output_path.open(
                encoding="utf-8",
                newline="",
            ) as output_file:
                reader = csv.DictReader(output_file)
                rows = list(reader)

        self.assertEqual(reader.fieldnames, CSV_COLUMNS)
        self.assertEqual(len(rows), 46)
        self.assertEqual(
            {row["parse_status"] for row in rows},
            {"matched"},
        )
        self.assertEqual(
            len({row["raw_section_id"] for row in rows}),
            len(rows),
        )


if __name__ == "__main__":
    unittest.main()
