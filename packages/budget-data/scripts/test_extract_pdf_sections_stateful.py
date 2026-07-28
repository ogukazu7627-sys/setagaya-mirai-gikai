import os
import unittest
from pathlib import Path

from extract_pdf_sections_stateful import (
    GENERAL_ACCOUNT_EXPENDITURE_END_PAGE,
    GENERAL_ACCOUNT_EXPENDITURE_START_PAGE,
    PAGE_TYPE_CONTINUATION,
    PAGE_TYPE_DETAIL,
    PAGE_TYPE_SUMMARY,
    PAGE_TYPE_TABLE_FAILED,
    calculate_stateful_metrics,
    extract_page_range,
    parse_page_layout,
)


REGRESSION_EXPECTATIONS = {
    159: (PAGE_TYPE_DETAIL, 10),
    162: (PAGE_TYPE_DETAIL, 16),
    166: (PAGE_TYPE_DETAIL, 13),
    160: (PAGE_TYPE_SUMMARY, 0),
    164: (PAGE_TYPE_CONTINUATION, 26),
    169: (PAGE_TYPE_CONTINUATION, 13),
    187: (PAGE_TYPE_DETAIL, 9),
    196: (PAGE_TYPE_DETAIL, 10),
    216: (PAGE_TYPE_CONTINUATION, 23),
    220: (PAGE_TYPE_DETAIL, 16),
    226: (PAGE_TYPE_DETAIL, 19),
    229: (PAGE_TYPE_DETAIL, 20),
    234: (PAGE_TYPE_DETAIL, 29),
}


def find_budget_pdf() -> Path:
    configured_path = os.environ.get("BUDGET_PDF_PATH")
    if configured_path:
        return Path(configured_path)
    repo_root = Path(__file__).resolve().parents[3]
    return repo_root / "raw" / "r8tousyoyosanallpage.pdf"


@unittest.skipUnless(
    find_budget_pdf().is_file(),
    "BUDGET_PDF_PATHまたはraw/に予算説明書PDFが必要です。",
)
class StatefulPdfSectionRegressionTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        import pdfplumber

        cls.pdf_path = find_budget_pdf()
        cls.pdf = pdfplumber.open(cls.pdf_path)

    @classmethod
    def tearDownClass(cls) -> None:
        cls.pdf.close()

    def test_phase_2_and_2_5_pages_are_fixed_as_regression_cases(self) -> None:
        for page_number, expected in REGRESSION_EXPECTATIONS.items():
            with self.subTest(pdf_page=page_number):
                layout = parse_page_layout(
                    self.pdf.pages[page_number - 1],
                    page_number,
                )
                self.assertEqual(
                    (layout.page_type, len(layout.section_rows)),
                    expected,
                )

    def test_page_164_to_165_continuation_closes_as_parsed(self) -> None:
        result = extract_page_range(
            pdf=self.pdf,
            source_file=self.pdf_path.name,
            start_page=163,
            end_page=166,
        )
        target_rows = [
            record
            for record in result.records
            if record["kan_code"] == "02"
            and record["kou_code"] == "01"
            and record["moku_code"] == "06"
        ]

        self.assertEqual(len(target_rows), 9)
        self.assertEqual(
            {int(record["pdf_page"]) for record in target_rows},
            {164, 165},
        )
        self.assertEqual(
            sum(
                int(record["setsu_amount_thousand_yen"])
                for record in target_rows
            ),
            994_508,
        )
        self.assertEqual(
            {record["parse_status"] for record in target_rows},
            {"parsed"},
        )
        self.assertTrue(
            all(
                "moku_page_span=164-165" in record["parse_note"]
                for record in target_rows
            )
        )

        metrics = calculate_stateful_metrics(result)
        self.assertEqual(metrics.needs_review_count, 0)

    def test_full_general_account_expenditure_metrics(self) -> None:
        result = extract_page_range(
            pdf=self.pdf,
            source_file=self.pdf_path.name,
            start_page=GENERAL_ACCOUNT_EXPENDITURE_START_PAGE,
            end_page=GENERAL_ACCOUNT_EXPENDITURE_END_PAGE,
        )
        metrics = calculate_stateful_metrics(result)

        self.assertEqual(metrics.row_count, 872)
        self.assertEqual(metrics.parsed_count, 872)
        self.assertEqual(metrics.needs_review_count, 0)
        self.assertEqual(metrics.moku_count, 122)
        self.assertEqual(metrics.matched_moku_count, 122)
        self.assertEqual(metrics.moku_match_rate, 1.0)
        self.assertEqual(metrics.moku_total_sum_thousand_yen, 431_353_010)
        self.assertEqual(metrics.section_amount_sum_thousand_yen, 431_353_010)
        self.assertEqual(
            metrics.page_type_counts,
            {
                PAGE_TYPE_CONTINUATION: 27,
                PAGE_TYPE_DETAIL: 51,
                PAGE_TYPE_SUMMARY: 7,
            },
        )
        self.assertEqual(
            metrics.summary_pages,
            (160, 161, 180, 181, 190, 198, 212),
        )
        self.assertNotIn(
            PAGE_TYPE_TABLE_FAILED,
            metrics.page_type_counts,
        )


if __name__ == "__main__":
    unittest.main()
