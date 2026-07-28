from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

from profile_budget_revenue_input import (
    compact_pdf_text,
    decode_csv,
    duplicate_summary,
    profile_core_csv,
    resolve_input_path,
)


class RevenueInputProfileTest(unittest.TestCase):
    def test_decode_csv_uses_cp932(self) -> None:
        raw = "年度,名称\r\n2026,髙齢者\r\n".encode("cp932")

        text, encoding, attempts = decode_csv(raw)

        self.assertEqual(encoding, "cp932")
        self.assertIn("髙齢者", text)
        self.assertEqual(attempts["cp932"], "success")
        self.assertTrue(attempts["shift_jis"].startswith("failed"))

    def test_duplicate_summary_detects_duplicate_keys(self) -> None:
        rows = [
            {"会計": "1", "款": "1"},
            {"会計": "1", "款": "1"},
            {"会計": "1", "款": "2"},
        ]

        result = duplicate_summary(rows, ("会計", "款"))

        self.assertFalse(result["is_unique"])
        self.assertEqual(result["unique_key_count"], 2)
        self.assertEqual(result["duplicate_group_count"], 1)
        self.assertEqual(result["duplicate_row_count"], 2)

    def test_resolve_input_path_uses_repo_root_for_relative_path(self) -> None:
        repo_root = Path("/repo")

        self.assertEqual(
            resolve_input_path(Path("raw/input.csv"), repo_root),
            Path("/repo/raw/input.csv"),
        )
        self.assertEqual(
            resolve_input_path(Path("/tmp/input.csv"), repo_root),
            Path("/tmp/input.csv"),
        )

    def test_profile_core_csv_reports_data_rows_and_columns(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "core.csv"
            path.write_text("a,b\n1,2\n3,4\n", encoding="utf-8")

            result = profile_core_csv(path)

        self.assertEqual(result["row_count"], 2)
        self.assertEqual(result["column_count"], 2)

    def test_compact_pdf_text_removes_whitespace(self) -> None:
        self.assertEqual(
            compact_pdf_text("2. 歳 入\n予 算 67"),
            "2.歳入予算67",
        )


if __name__ == "__main__":
    unittest.main()
