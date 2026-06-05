import csv
import json
import subprocess
import sys
import tempfile
from pathlib import Path
from unittest import TestCase


ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts" / "preprocess_map_data.py"
FIXTURES = ROOT / "tests" / "fixtures"


class PreprocessMapDataTest(TestCase):
    def run_script(self, input_csv, geojson, output_dir, extra_args=None, geo_level="buurt"):
        command = [
            sys.executable,
            str(SCRIPT),
            "--input",
            str(input_csv),
            "--geo-level",
            geo_level,
            "--geo-year",
            "2026",
            "--geojson",
            str(geojson),
            "--output-public",
            str(output_dir),
        ]
        if extra_args:
            command.extend(extra_args)
        return subprocess.run(command, cwd=ROOT, text=True, capture_output=True)

    def test_converts_wide_profile_export_to_map_explorer_csv(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            result = self.run_script(
                FIXTURES / "raw_buurt_profiles.csv",
                FIXTURES / "buurt_2026.geojson",
                Path(tmpdir),
            )

            self.assertEqual(result.returncode, 0, msg=result.stderr)

            output_csv = Path(tmpdir) / "buurt_5_processed.csv"
            with output_csv.open(newline="", encoding="utf-8") as handle:
                rows = list(csv.DictReader(handle))

            self.assertEqual(len(rows), 10)
            self.assertEqual(rows[0]["profile"], "1")
            self.assertEqual(rows[0]["buurt_code"], "BU0001")
            self.assertEqual(rows[0]["buren"], "BU0001")
            self.assertEqual(rows[0]["value"], "20")
            self.assertEqual(rows[0]["gender"], "all")

            report = json.loads((Path(tmpdir) / "preprocess_report.json").read_text())
            self.assertEqual(report["profile_scale"], "proportion")
            self.assertEqual(report["compatibility_columns"], ["buren"])
            self.assertEqual(report["output_geojson_features"], 2)
            self.assertEqual(report["geojson_regions_without_data"], 1)

    def test_converts_wijk_export_with_wijk_alias(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            result = self.run_script(
                FIXTURES / "raw_wijk_profiles.csv",
                FIXTURES / "wijk_2026.geojson",
                Path(tmpdir),
                geo_level="wijk",
            )

            self.assertEqual(result.returncode, 0, msg=result.stderr)

            output_csv = Path(tmpdir) / "wijk_5_processed.csv"
            with output_csv.open(newline="", encoding="utf-8") as handle:
                rows = list(csv.DictReader(handle))

            self.assertEqual(len(rows), 10)
            self.assertEqual(rows[0]["profile"], "1")
            self.assertEqual(rows[0]["wijk_code"], "WK0001")
            self.assertEqual(rows[0]["wijk"], "WK0001")
            self.assertEqual(rows[0]["value"], "25")

            report = json.loads((Path(tmpdir) / "preprocess_report.json").read_text())
            self.assertEqual(report["geo_level"], "wijk")
            self.assertEqual(report["compatibility_columns"], ["wijk"])
            self.assertEqual(report["output_geojson_features"], 2)

    def test_rejects_profile_values_that_do_not_sum_to_100(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            bad_csv = Path(tmpdir) / "bad.csv"
            bad_csv.write_text(
                "buurt_code,n_sample,profile_1,profile_2,profile_3,profile_4,profile_5\n"
                "BU0001,100,0.2,0.1,0.2,0.2,0.05\n",
                encoding="utf-8",
            )

            result = self.run_script(
                bad_csv,
                FIXTURES / "buurt_2026.geojson",
                Path(tmpdir) / "public",
            )

            self.assertNotEqual(result.returncode, 0)
            self.assertIn("sum to", result.stderr)

    def test_rejects_duplicate_region_filter_combinations(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            bad_csv = Path(tmpdir) / "duplicate.csv"
            bad_csv.write_text(
                "buurt_code,n_sample,profile_1,profile_2,profile_3,profile_4,profile_5,gender\n"
                "BU0001,100,0.2,0.1,0.2,0.45,0.05,all\n"
                "BU0001,100,0.2,0.1,0.2,0.45,0.05,all\n",
                encoding="utf-8",
            )

            result = self.run_script(
                bad_csv,
                FIXTURES / "buurt_2026.geojson",
                Path(tmpdir) / "public",
            )

            self.assertNotEqual(result.returncode, 0)
            self.assertIn("Duplicate", result.stderr)

    def test_rejects_too_many_unmatched_geojson_codes(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            bad_csv = Path(tmpdir) / "unmatched.csv"
            bad_csv.write_text(
                "buurt_code,n_sample,profile_1,profile_2,profile_3,profile_4,profile_5\n"
                "BU0001,100,20,10,20,45,5\n"
                "BU1234,100,20,10,20,45,5\n",
                encoding="utf-8",
            )

            result = self.run_script(
                bad_csv,
                FIXTURES / "buurt_2026.geojson",
                Path(tmpdir) / "public",
            )

            self.assertNotEqual(result.returncode, 0)
            self.assertIn("did not join", result.stderr)
            self.assertFalse((Path(tmpdir) / "public" / "buurt_5_processed.csv").exists())
