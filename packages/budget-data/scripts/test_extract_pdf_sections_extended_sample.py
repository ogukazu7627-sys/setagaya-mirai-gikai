import argparse
import unittest

from extract_pdf_sections_extended_sample import (
    CAUSE_NEXT_PAGE,
    CAUSE_PREVIOUS_PAGE,
    CAUSE_SUMMARY_PAGE,
    calculate_metrics,
    classify_review_cause,
    parse_extended_page_list,
    review_cause_from_note,
)


class PdfSectionExtendedSampleTest(unittest.TestCase):
    def test_parse_extended_page_list_accepts_eight_to_twelve_pages(self) -> None:
        self.assertEqual(
            parse_extended_page_list("160,164,169,187,196,216,220,226"),
            (160, 164, 169, 187, 196, 216, 220, 226),
        )

    def test_parse_extended_page_list_rejects_too_few_pages(self) -> None:
        with self.assertRaises(argparse.ArgumentTypeError):
            parse_extended_page_list("160,164,169")

    def test_parse_extended_page_list_rejects_too_many_pages(self) -> None:
        with self.assertRaises(argparse.ArgumentTypeError):
            parse_extended_page_list(
                "160,164,169,187,196,216,220,226,229,234,235,236,237"
            )

    def test_classify_review_cause_distinguishes_continuation_direction(
        self,
    ) -> None:
        self.assertEqual(
            classify_review_cause(
                {"parse_note": "節行を目へ対応付けできない"}
            ),
            CAUSE_PREVIOUS_PAGE,
        )
        self.assertEqual(
            classify_review_cause(
                {
                    "parse_note": (
                        "節金額合計 744,456 と目本年度予算額 "
                        "994,508 が一致しない"
                    )
                }
            ),
            CAUSE_NEXT_PAGE,
        )

    def test_review_cause_from_note_reads_page_level_cause(self) -> None:
        self.assertEqual(
            review_cause_from_note(
                f"cause={CAUSE_SUMMARY_PAGE}; 節行がない集計ページ"
            ),
            CAUSE_SUMMARY_PAGE,
        )

    def test_calculate_metrics_reports_moku_match_rate(self) -> None:
        records = [
            self.record(moku_code="01", amount=6, total=10),
            self.record(moku_code="01", amount=4, total=10),
            self.record(moku_code="02", amount=8, total=9),
            self.record(
                moku_code="",
                amount="",
                total="",
                status="needs_review",
                note=f"cause={CAUSE_SUMMARY_PAGE}; 節行がない集計ページ",
            ),
        ]

        metrics = calculate_metrics(records)

        self.assertEqual(metrics.moku_count, 2)
        self.assertEqual(metrics.matched_moku_count, 1)
        self.assertEqual(metrics.mismatched_moku_count, 1)
        self.assertEqual(metrics.moku_match_rate, 0.5)
        self.assertEqual(
            metrics.review_cause_counts,
            {CAUSE_SUMMARY_PAGE: 1},
        )

    @staticmethod
    def record(
        *,
        moku_code: str,
        amount: int | str,
        total: int | str,
        status: str = "parsed",
        note: str = "",
    ) -> dict[str, object]:
        return {
            "pdf_page": 1,
            "kan_code": "01",
            "kou_code": "01",
            "moku_code": moku_code,
            "moku_total_amount_thousand_yen": total,
            "setsu_amount_thousand_yen": amount,
            "parse_status": status,
            "parse_note": note,
        }


if __name__ == "__main__":
    unittest.main()
