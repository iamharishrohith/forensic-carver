import os
import sys
import json
import tempfile
import unittest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from carving.manager import CarvingManager
from carving.tests.generate_test_image import generate_synthetic_disk_image


class TestForensicCarver(unittest.TestCase):
    def setUp(self):
        self.tmp_dir = tempfile.TemporaryDirectory()
        self.workspace = self.tmp_dir.name

    def tearDown(self):
        self.tmp_dir.cleanup()

    def test_synthetic_image_carving_and_hashes(self):
        image_path = os.path.join(self.workspace, "test_evidence.raw")
        output_dir = os.path.join(self.workspace, "carved_output")

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

        self.assertEqual(manifest["report_type"], "FORENSIC_CARVING_MANIFEST")
        self.assertGreaterEqual(manifest["summary"]["total_artifacts_recovered"], 4)

        recovered_artifacts = manifest["artifacts"]
        recovered_hashes = {a["hashes"]["sha256"]: a for a in carved_artifacts} if "carved_artifacts" in locals() else {a["hashes"]["sha256"]: a for a in recovered_artifacts}

        for file_key in ["jpeg", "png", "sqlite", "pdf"]:
            gt_hash = ground_truth[file_key]["sha256"]
            self.assertIn(gt_hash, recovered_hashes)
            self.assertTrue(recovered_hashes[gt_hash]["is_valid_structure"])

    def test_json_manifest_file_output(self):
        image_path = os.path.join(self.workspace, "test_manifest.raw")
        output_dir = os.path.join(self.workspace, "manifest_output")

        generate_synthetic_disk_image(output_path=image_path, total_size_mb=4)

        manager = CarvingManager()
        manager.process_source(
            source_path=image_path,
            output_dir=output_dir,
            json_output_filename="carving_manifest.json",
            export_ndjson=True,
        )

        json_file = os.path.join(output_dir, "carving_manifest.json")
        ndjson_file = os.path.join(output_dir, "carving_manifest.ndjson")

        self.assertTrue(os.path.exists(json_file))
        self.assertTrue(os.path.exists(ndjson_file))

        with open(json_file, "r", encoding="utf-8") as f:
            data = json.load(f)

        self.assertEqual(data["case_id"], "ACPIA-LOCAL-CASE")
        self.assertGreater(len(data["artifacts"]), 0)


if __name__ == "__main__":
    unittest.main(verbosity=2)
