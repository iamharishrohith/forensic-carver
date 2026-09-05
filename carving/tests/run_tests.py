"""
Standalone Unit Test Runner for Forensic Carving Engine
Uses Python's standard `unittest` library (zero extra dependencies).
"""

import os
import sys
import json
import tempfile
import unittest

# Ensure root workspace is on python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

try:
    from carving.manager import CarvingManager
    from carving.tests.generate_test_image import generate_synthetic_disk_image
except ImportError:
    from app.carving.manager import CarvingManager
    from app.carving.tests.generate_test_image import generate_synthetic_disk_image


class TestForensicCarver(unittest.TestCase):
    def setUp(self):
        self.tmp_dir = tempfile.TemporaryDirectory()
        self.workspace = self.tmp_dir.name

    def tearDown(self):
        self.tmp_dir.cleanup()

    def test_synthetic_image_carving_and_hashes(self):
        """
        Verifies that all 4 injected files (JPEG, PNG, SQLite, and boundary-crossing PDF)
        are successfully recovered with 100% byte-exact SHA-256 matches.
        """
        image_path = os.path.join(self.workspace, "test_evidence.raw")
        output_dir = os.path.join(self.workspace, "carved_output")

        # Generate synthetic test image
        _, ground_truth = generate_synthetic_disk_image(
            output_path=image_path,
            total_size_mb=8,
            inject_boundary_test=True,
        )

        manager = CarvingManager(chunk_size=4 * 1024 * 1024, overlap_size=64 * 1024)
        manifest = manager.process_source(
            source_path=image_path,
            output_dir=output_dir,
            case_id="UNIT-TEST-CASE-01",
        )

        # 1. Verify JSON Manifest Structure
        self.assertEqual(manifest["report_type"], "FORENSIC_CARVING_MANIFEST")
        self.assertGreaterEqual(manifest["summary"]["total_artifacts_recovered"], 4)
        self.assertEqual(manifest["summary"]["integrity_status"], "ALL_HASHES_VERIFIED")

        carved_artifacts = manifest["artifacts"]
        recovered_hashes = {a["hashes"]["sha256"]: a for a in carved_artifacts}

        # 2. Check JPEG Recovery & Exact Hash Match
        gt_jpeg_hash = ground_truth["jpeg"]["sha256"]
        self.assertIn(gt_jpeg_hash, recovered_hashes, "JPEG was not recovered or hash mismatched")
        jpeg_art = recovered_hashes[gt_jpeg_hash]
        self.assertEqual(jpeg_art["mime_type"], "image/jpeg")
        self.assertTrue(jpeg_art["is_valid_structure"])
        self.assertTrue(os.path.exists(jpeg_art["recovered_path"]))

        # 3. Check PNG Recovery & Exact Hash Match
        gt_png_hash = ground_truth["png"]["sha256"]
        self.assertIn(gt_png_hash, recovered_hashes, "PNG was not recovered or hash mismatched")
        png_art = recovered_hashes[gt_png_hash]
        self.assertEqual(png_art["mime_type"], "image/png")
        self.assertTrue(png_art["is_valid_structure"])

        # 4. Check SQLite Recovery & Schema Parsing
        gt_sqlite_hash = ground_truth["sqlite"]["sha256"]
        self.assertIn(gt_sqlite_hash, recovered_hashes, "SQLite DB was not recovered or hash mismatched")
        sqlite_art = recovered_hashes[gt_sqlite_hash]
        self.assertEqual(sqlite_art["mime_type"], "application/x-sqlite3")
        self.assertIn("contacts", sqlite_art["extracted_metadata"].get("tables", []))

        # 5. Check Boundary-Crossing PDF Recovery
        gt_pdf_hash = ground_truth["pdf"]["sha256"]
        self.assertIn(gt_pdf_hash, recovered_hashes, "Boundary-crossing PDF was not recovered cleanly")
        pdf_art = recovered_hashes[gt_pdf_hash]
        self.assertEqual(pdf_art["mime_type"], "application/pdf")
        self.assertTrue(pdf_art["is_valid_structure"])

    def test_json_manifest_file_output(self):
        """
        Verifies that carving_manifest.json and carving_manifest.ndjson are written
        and validly formatted.
        """
        image_path = os.path.join(self.workspace, "test_manifest.raw")
        output_dir = os.path.join(self.workspace, "manifest_output")

        generate_synthetic_disk_image(output_path=image_path, total_size_mb=4)

        manager = CarvingManager()
        result = manager.process_source(
            source_path=image_path,
            output_dir=output_dir,
            json_output_filename="carving_manifest.json",
            export_ndjson=True,
        )

        json_file = os.path.join(output_dir, "carving_manifest.json")
        ndjson_file = os.path.join(output_dir, "carving_manifest.ndjson")

        self.assertTrue(os.path.exists(json_file))
        self.assertTrue(os.path.exists(ndjson_file))

        # Read and parse JSON file directly from disk
        with open(json_file, "r", encoding="utf-8") as f:
            loaded_json = json.load(f)

        self.assertEqual(loaded_json["case_id"], "ACPIA-LOCAL-CASE")
        self.assertIn("source", loaded_json)
        self.assertIn("summary", loaded_json)
        self.assertGreater(len(loaded_json["artifacts"]), 0)

        # Read NDJSON lines
        with open(ndjson_file, "r", encoding="utf-8") as f:
            lines = [json.loads(line) for line in f if line.strip()]
        self.assertEqual(len(lines), len(loaded_json["artifacts"]))


if __name__ == "__main__":
    unittest.main(verbosity=2)
