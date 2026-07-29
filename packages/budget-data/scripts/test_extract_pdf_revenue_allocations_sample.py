import csv
import os
import tempfile
import unittest
from pathlib import Path

from extract_pdf_revenue_allocations_sample import (
    CSV_COLUMNS,
    SAMPLE_SEGMENTS,
    calculate_metrics,
    extract_revenue_allocation_sample,
    load_revenue_accounts,
    records_for_detail,
    render_notes,
    sample_pages,
    validate_sample,
    write_sample_csv,
)


def repo_root() -> Path:
    return Path(__file__).resolve().parents[3]


def find_budget_pdf() -> Path:
    configured_path = os.environ.get("BUDGET_PDF_PATH")
    if configured_path:
        return Path(configured_path)
    return repo_root() / "raw" / "r8tousyoyosanallpage.pdf"


class RevenueAllocationSampleConfigurationTest(unittest.TestCase):
    def test_sample_is_exactly_ten_unique_pages_for_four_accounts(
        self,
    ) -> None:
        pages = sample_pages()
        accounts = {
            segment.account_code for segment in SAMPLE_SEGMENTS
        }

        self.assertEqual(len(pages), 10)
        self.assertEqual(len(set(pages)), 10)
        self.assertEqual(
            accounts,
            {
                "general",
                "national_health_insurance",
                "latter_stage_elderly_healthcare",
                "long_term_care_insurance",
            },
        )


@unittest.skipUnless(
    find_budget_pdf().is_file(),
    "BUDGET_PDF_PATHまたはraw/に予算説明書PDFが必要です。",
)
class RevenueAllocationPdfSampleTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        import pdfplumber

        cls.pdf_path = find_budget_pdf()
        cls.accounts = load_revenue_accounts(
            repo_root() / "config" / "budget-accounts.json"
        )
        with pdfplumber.open(cls.pdf_path) as pdf:
            cls.result = extract_revenue_allocation_sample(
                pdf=pdf,
                source_file=cls.pdf_path.name,
                accounts=cls.accounts,
            )
        cls.metrics = calculate_metrics(cls.result)
        validate_sample(cls.result, cls.metrics)

    def test_ids_targets_and_no_allocation_page(self) -> None:
        self.assertEqual(self.metrics.selected_page_count, 10)
        self.assertEqual(self.metrics.row_count, 148)
        self.assertEqual(self.metrics.parsed_count, 142)
        self.assertEqual(self.metrics.needs_review_count, 6)
        self.assertEqual(
            self.metrics.multiple_allocation_detail_count,
            3,
        )
        self.assertEqual(
            self.metrics.source_allocation_marker_count,
            148,
        )
        self.assertEqual(
            self.metrics.account_row_counts,
            {
                "general": 70,
                "latter_stage_elderly_healthcare": 13,
                "long_term_care_insurance": 34,
                "national_health_insurance": 31,
            },
        )
        self.assertEqual(
            self.metrics.review_cause_counts,
            {
                "current_saisetsu_missing": 1,
                "current_setsu_missing": 2,
                "sample_gap_current_moku_missing": 6,
            },
        )
        self.assertEqual(
            self.metrics.unique_raw_allocation_id_count,
            self.metrics.row_count,
        )
        self.assertTrue(
            all(
                isinstance(row["target_budget_book_page"], int)
                for row in self.result.records
                if row["parse_status"] == "parsed"
            )
        )
        page_38 = next(
            summary
            for summary in self.result.page_summaries
            if summary.pdf_page == 38
        )
        self.assertEqual(page_38.allocation_count, 0)
        self.assertTrue(page_38.no_allocation_normal)
        self.assertTrue(
            all(
                summary.source_allocation_marker_count
                == summary.allocation_count
                for summary in self.result.page_summaries
            )
        )

    def test_gas_amount_is_not_duplicated_across_two_targets(
        self,
    ) -> None:
        gas_rows = records_for_detail(
            self.result,
            "general",
            "ガス関係",
        )

        self.assertEqual(len(gas_rows), 2)
        self.assertEqual(
            [row["allocation_sequence"] for row in gas_rows],
            [1, 2],
        )
        self.assertEqual(
            [row["pdf_revenue_amount_thousand_yen"] for row in gas_rows],
            [922_900, ""],
        )
        self.assertEqual(
            {row["target_budget_book_page"] for row in gas_rows},
            {423, 471},
        )

    def test_three_continuations_keep_the_previous_detail(self) -> None:
        expected = (
            ("general", "玉川地域出張所", 54, 333),
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
        for account_code, name, pdf_page, target_page in expected:
            rows = records_for_detail(
                self.result,
                account_code,
                name,
            )
            self.assertTrue(
                any(
                    row["pdf_page"] == pdf_page
                    and row["target_budget_book_page"] == target_page
                    and row["parse_status"] == "parsed"
                    for row in rows
                )
            )

    def test_csv_and_notes_have_the_requested_shape(self) -> None:
        notes = render_notes(self.result, self.metrics)
        with tempfile.TemporaryDirectory() as temporary_directory:
            output_path = (
                Path(temporary_directory)
                / "raw_pdf_revenue_allocations_sample.csv"
            )
            write_sample_csv(output_path, self.result.records)
            with output_path.open(
                encoding="utf-8",
                newline="",
            ) as stream:
                reader = csv.DictReader(stream)
                rows = list(reader)

        self.assertEqual(reader.fieldnames, CSV_COLUMNS)
        self.assertEqual(len(rows), self.metrics.row_count)
        self.assertIn("全ページ処理へ", notes)
        self.assertIn("allocation_amount", notes)
        self.assertIn("needs_reviewの分類", notes)

    def test_formal_outputs_match_the_current_extraction(self) -> None:
        output_path = (
            repo_root()
            / "processed" / "audit" / "raw_pdf_revenue_allocations_sample.csv"
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

        self.assertEqual(reader.fieldnames, CSV_COLUMNS)
        self.assertEqual(actual_rows, expected_rows)
        self.assertTrue(
            notes_path.read_text(encoding="utf-8").startswith(
                render_notes(self.result, self.metrics).rstrip()
            ),
        )


if __name__ == "__main__":
    unittest.main()
