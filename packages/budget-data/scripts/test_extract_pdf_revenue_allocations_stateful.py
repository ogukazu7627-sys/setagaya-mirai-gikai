import csv
import hashlib
import os
import unittest
from pathlib import Path

from extract_pdf_revenue_allocations_sample import (
    CSV_COLUMNS,
    load_revenue_accounts,
)
from extract_pdf_revenue_allocations_stateful import (
    ACTIVE_ACCOUNT_CODES,
    FORBIDDEN_COLUMNS,
    calculate_full_metrics,
    extract_full_revenue_allocations,
    load_full_revenue_accounts,
    read_phase25_sample,
    render_full_report,
    run_phase26_gate,
    sha256_file,
    validate_full_extraction,
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
        / "processed" / "audit" / "raw_pdf_revenue_allocations_sample.csv"
    )


class FullRevenueAllocationConfigurationTest(unittest.TestCase):
    def test_config_has_165_continuous_pages_for_four_accounts(
        self,
    ) -> None:
        accounts = load_full_revenue_accounts(
            repo_root() / "config" / "budget-accounts.json"
        )
        page_counts = {
            account.account_code: (
                account.extraction_account.revenue_pdf_page_end
                - account.extraction_account.revenue_pdf_page_start
                + 1
            )
            for account in accounts
        }

        self.assertEqual(
            tuple(account.account_code for account in accounts),
            ACTIVE_ACCOUNT_CODES,
        )
        self.assertEqual(
            page_counts,
            {
                "general": 121,
                "national_health_insurance": 13,
                "latter_stage_elderly_healthcare": 10,
                "long_term_care_insurance": 21,
            },
        )
        self.assertEqual(sum(page_counts.values()), 165)


@unittest.skipUnless(
    find_budget_pdf().is_file() and phase25_sample_path().is_file(),
    "予算説明書PDFとPhase 25サンプルCSVが必要です。",
)
class FullRevenueAllocationPdfTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        import pdfplumber

        cls.pdf_path = find_budget_pdf()
        cls.config_path = (
            repo_root() / "config" / "budget-accounts.json"
        )
        cls.extraction_accounts = load_revenue_accounts(
            cls.config_path
        )
        cls.full_accounts = load_full_revenue_accounts(
            cls.config_path
        )
        cls.phase25_rows = read_phase25_sample(
            phase25_sample_path()
        )
        with pdfplumber.open(cls.pdf_path) as pdf:
            cls.gate = run_phase26_gate(
                pdf=pdf,
                source_file=cls.pdf_path.name,
                accounts=cls.extraction_accounts,
                phase25_rows=cls.phase25_rows,
            )
            cls.result = extract_full_revenue_allocations(
                pdf=pdf,
                source_file=cls.pdf_path.name,
                accounts=cls.full_accounts,
            )
        cls.metrics = calculate_full_metrics(cls.result)
        cls.issues = validate_full_extraction(
            cls.result,
            cls.metrics,
            cls.full_accounts,
        )

    def test_phase26_gate_passes_before_full_extraction(self) -> None:
        self.assertEqual(self.gate.metrics.selected_page_count, 25)
        self.assertEqual(self.gate.metrics.row_count, 325)
        self.assertEqual(self.gate.metrics.parsed_count, 325)
        self.assertEqual(self.gate.metrics.needs_review_count, 0)
        self.assertEqual(
            self.gate.metrics.source_allocation_marker_count,
            325,
        )
        self.assertEqual(
            self.gate.regression.unexpected_changed_parsed_row_count,
            0,
        )
        row = self.gate.pdf67_record
        self.assertEqual(row["saisetsu_code"], "05")
        self.assertEqual(
            row["pdf_revenue_detail_name"],
            "生活困窮者自立相談支援事業費"
            "(会計年度任用職員人件費)",
        )
        self.assertEqual(row["pdf_department_name"], "保健福祉政策部")
        self.assertEqual(
            row["pdf_revenue_amount_thousand_yen"],
            11_497,
        )
        self.assertEqual(
            row["pdf_target_program_name"],
            "会計年度任用職員の人件費(保健福祉政策部)",
        )
        self.assertEqual(row["target_budget_book_page"], 467)
        self.assertEqual(row["parse_status"], "parsed")

    def test_full_counts_ids_and_statuses(self) -> None:
        self.assertEqual(self.metrics.page_count, 165)
        self.assertEqual(self.metrics.row_count, 1_948)
        self.assertEqual(self.metrics.parsed_count, 1_948)
        self.assertEqual(self.metrics.needs_review_count, 0)
        self.assertEqual(
            self.metrics.source_allocation_marker_count,
            1_948,
        )
        self.assertEqual(
            self.metrics.unique_raw_allocation_id_count,
            1_948,
        )
        self.assertEqual(self.metrics.multiple_allocation_detail_count, 27)
        self.assertEqual(
            self.metrics.account_row_counts,
            {
                "general": 1_626,
                "latter_stage_elderly_healthcare": 29,
                "long_term_care_insurance": 209,
                "national_health_insurance": 84,
            },
        )
        self.assertEqual(self.issues, [])

    def test_every_page_marker_and_book_page_matches(self) -> None:
        self.assertTrue(
            all(
                summary.source_allocation_marker_count
                == summary.output_row_count
                for summary in self.result.page_summaries
            )
        )
        self.assertTrue(
            all(
                summary.detected_budget_book_page
                == summary.expected_budget_book_page
                for summary in self.result.page_summaries
            )
        )
        source_pages = {
            (summary.account_code, summary.pdf_page): (
                summary.detected_budget_book_page
            )
            for summary in self.result.page_summaries
        }
        self.assertEqual(source_pages[("general", 53)], 99)
        self.assertEqual(
            source_pages[("long_term_care_insurance", 358)],
            709,
        )

    def test_target_pages_and_amount_non_duplication(self) -> None:
        accounts = {
            account.account_code: account
            for account in self.full_accounts
        }
        self.assertTrue(
            all(
                isinstance(record["target_budget_book_page"], int)
                and (
                    accounts[
                        str(record["account_code"])
                    ].extraction_account.expenditure_book_page_start
                    <= int(record["target_budget_book_page"])
                    <= accounts[
                        str(record["account_code"])
                    ].extraction_account.expenditure_book_page_end
                )
                for record in self.result.records
            )
        )
        self.assertTrue(
            all(
                record["pdf_revenue_amount_thousand_yen"] == ""
                for record in self.result.records
                if int(record["allocation_sequence"]) > 1
            )
        )
        self.assertFalse(FORBIDDEN_COLUMNS & set(CSV_COLUMNS))

    def test_account_state_is_kept_until_each_account_end(self) -> None:
        self.assertEqual(
            tuple(
                state.account_code
                for state in self.result.account_end_states
            ),
            ACTIVE_ACCOUNT_CODES,
        )
        self.assertTrue(
            all(state.saisetsu_code for state in self.result.account_end_states)
        )
        self.assertTrue(
            all(state.allocation_count > 0 for state in self.result.account_end_states)
        )

    def test_formal_outputs_match_current_extraction(self) -> None:
        output_path = (
            repo_root()
            / "processed" / "audit" / "raw_pdf_revenue_allocations.csv"
        )
        report_path = (
            repo_root()
            / "docs"
            / "pdf_revenue_allocation_full_extraction_report.md"
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
        output_hash = sha256_file(output_path)
        expected_report = render_full_report(
            gate=self.gate,
            result=self.result,
            metrics=self.metrics,
            issues=self.issues,
            output_path=output_path,
            output_hash=output_hash,
        )

        self.assertEqual(reader.fieldnames, CSV_COLUMNS)
        self.assertEqual(actual_rows, expected_rows)
        self.assertEqual(
            report_path.read_text(encoding="utf-8"),
            expected_report,
        )
        self.assertEqual(
            hashlib.sha256(output_path.read_bytes()).hexdigest(),
            output_hash,
        )


if __name__ == "__main__":
    unittest.main()
