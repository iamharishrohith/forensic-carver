"""
Integration Test: Carving Real Internet-Sourced Evidence Drive
Validates downloading real media files, embedding them into a raw disk image,
and carving them with 100% byte-exact hash matching and metadata extraction.
"""

import os
import sys
import json
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
        """Downloads real samples, creates 25MB raw drive, and carves all artifacts."""
        raw_image_path = os.path.join(self.workspace, "internet_evidence_drive.raw")
        cache_dir = os.path.join(self.workspace, "evidence_cache")
        output_dir = os.path.join(self.workspace, "carved_output")

        # 1. Build the synthetic raw disk with real downloaded samples
        _, ground_truth = build_synthetic_raw_image(
            output_raw_path=raw_image_path,
            cache_dir=cache_dir,
            total_size_mb=25,
        )

        # 2. Process through Carving Engine
        manager = CarvingManager(chunk_size=4 * 1024 * 1024, overlap_size=64 * 1024)
        manifest = manager.process_source(
            source_path=raw_image_path,
            output_dir=output_dir,
            case_id="INTERNET-DATASET-TEST",
        )

        print("\n" + "=" * 65)
        print("  CARVING MANIFEST SUMMARY (REAL INTERNET DATASET)")
        print("=" * 65)
        print(f"Total Injected Files:        {len(ground_truth)}")
        print(f"Total Recovered Artifacts:   {manifest['summary']['total_artifacts_recovered']}")
        print(f"Total Recovered Bytes:       {manifest['summary']['total_recovered_bytes']:,} bytes")
        print(f"Scan Duration:               {manifest['source']['scan_duration_seconds']}s")
        print(f"Integrity Status:            {manifest['summary']['integrity_status']}")
        print(f"Artifacts by Type:           {json.dumps(manifest['summary']['artifacts_by_type'], indent=2)}")
        print("=" * 65)

        # 3. Assertions
        self.assertEqual(manifest["report_type"], "FORENSIC_CARVING_MANIFEST")
        self.assertGreaterEqual(manifest["summary"]["total_artifacts_recovered"], len(ground_truth))

        recovered_artifacts = manifest["artifacts"]
        recovered_hashes = {a["hashes"]["sha256"]: a for a in recovered_artifacts}

        # Check each injected real-world file
        for name, gt_info in ground_truth.items():
            gt_sha256 = gt_info["sha256"]
            self.assertIn(
                gt_sha256,
                recovered_hashes,
                f"File {name} was not recovered or hash mismatched! Expected SHA256: {gt_sha256}",
            )
            art = recovered_hashes[gt_sha256]
            self.assertTrue(art["is_valid_structure"], f"File {name} failed structural validation")
            self.assertTrue(os.path.exists(art["recovered_path"]), f"Recovered file {art['filename']} does not exist on disk")
            print(f"  [PASS] Recovered {name:22} | SHA-256 Match: {gt_sha256[:16]}... | Method: {art['carve_method']}")

        # Validate SQLite Chat Database table extraction
        sqlite_hash = ground_truth["evidence_chats.sqlite"]["sha256"]
        sqlite_art = recovered_hashes[sqlite_hash]
        extracted_tables = sqlite_art["extracted_metadata"].get("tables", [])
        self.assertIn("messages", extracted_tables)
        self.assertIn("locations", extracted_tables)
        self.assertIn("attachments", extracted_tables)
        print(f"  [PASS] SQLite schema tables parsed: {extracted_tables}")


if __name__ == "__main__":
    unittest.main(verbosity=2)
