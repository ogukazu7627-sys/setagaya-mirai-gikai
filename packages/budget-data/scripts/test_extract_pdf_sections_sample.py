import argparse
import unittest

from extract_pdf_sections_sample import (
    HierarchyValue,
    MokuRecord,
    choose_moku,
    normalize_compact_text,
    parse_amount,
    parse_code_and_name,
    parse_page_list,
    reconcile_moku_totals,
)


class PdfSectionSampleParserTest(unittest.TestCase):
    def test_normalize_compact_text_joins_pdf_line_wraps(self) -> None:
        self.assertEqual(
            normalize_compact_text("13 使用料及賃\n借料"),
            "13使用料及賃借料",
        )

    def test_parse_code_and_name_handles_multiline_name(self) -> None:
        self.assertEqual(
            parse_code_and_name("18 負担金補助\n及交付金"),
            HierarchyValue("18", "負担金補助及交付金"),
        )

    def test_parse_amount_removes_commas(self) -> None:
        self.assertEqual(parse_amount("1,379,576"), 1_379_576)
        self.assertIsNone(parse_amount("△13,289"))

    def test_choose_moku_uses_latest_vertical_boundary(self) -> None:
        mokus = [
            MokuRecord("01", "税務総務費", 2_182, 254.889),
            MokuRecord("02", "賦課徴収費", 1_379_576, 352.809),
        ]
        self.assertEqual(choose_moku(mokus, 271.209), mokus[0])
        self.assertEqual(choose_moku(mokus, 352.809), mokus[1])

    def test_parse_page_list_rejects_more_than_three_pages(self) -> None:
        with self.assertRaises(argparse.ArgumentTypeError):
            parse_page_list("159,160,161,162")

    def test_reconcile_moku_totals_marks_mismatch_for_review(self) -> None:
        moku = MokuRecord("01", "議会費", 10, 100.0)
        records = [
            {
                "_moku_y_start": 100.0,
                "setsu_amount_thousand_yen": 9,
                "parse_status": "parsed",
                "parse_note": "",
            }
        ]

        reconcile_moku_totals(records, [moku])

        self.assertEqual(records[0]["parse_status"], "needs_review")
        self.assertIn("一致しない", records[0]["parse_note"])


if __name__ == "__main__":
    unittest.main()
