import os
import sys
import unittest
import tempfile

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from carving.manager import CarvingManager
from carving.tests.download_and_build_dataset import build_synthetic_raw_image


class TestInternetSyntheticCarving(unittest.TestCase):
    def setUp(self):
        self.tmp_dir = tempfile.TemporaryDirectory()
        self.workspace = self.tmp_dir.name

    def tearDown(self):
        self.tmp_dir.cleanup()

    def test_internet_evidence_carving(self):
        raw_image = os.path.join(self.workspace, "internet_evidence_drive.raw")
        cache_folder = os.path.join(self.workspace, "evidence_cache")
        out_folder = os.path.join(self.workspace, "carved_output")

        _, ground_truth = build_synthetic_raw_image(
            output_raw_path=raw_image,
            cache_dir=cache_folder,
            total_size_mb=50,
        )

        manager = CarvingManager(chunk_size=4 * 1024 * 1024, overlap_size=64 * 1024)
        manifest = manager.process_source(
            source_path=raw_image,
            output_dir=out_folder,
            case_id="INTERNET-DATASET-TEST",
        )

        self.assertEqual(manifest["report_type"], "FORENSIC_CARVING_MANIFEST")
        self.assertGreaterEqual(manifest["summary"]["total_artifacts_recovered"], len(ground_truth))

        recovered_artifacts = manifest["artifacts"]
        recovered_hashes = {item["hashes"]["sha256"]: item for item in recovered_artifacts}

        for name, expected in ground_truth.items():
            expected_hash = expected["sha256"]
            self.assertIn(expected_hash, recovered_hashes, f"Missing {name}")
            item = recovered_hashes[expected_hash]
            self.assertTrue(item["is_valid_structure"])
            self.assertTrue(os.path.exists(item["recovered_path"]))

        # Check SQLite chat history
        sqlite_hash = ground_truth["suspect_chat_history.sqlite"]["sha256"]
        sqlite_item = recovered_hashes[sqlite_hash]
        tables = sqlite_item["extracted_metadata"].get("tables", [])
        self.assertIn("messages", tables)
        self.assertIn("locations", tables)


if __name__ == "__main__":
    unittest.main(verbosity=2)
