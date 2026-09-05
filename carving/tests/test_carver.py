import os
import sys
import json
import tempfile
import pytest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from carving.manager import CarvingManager
from carving.tests.generate_test_image import generate_synthetic_disk_image


@pytest.fixture
def test_workspace():
    with tempfile.TemporaryDirectory() as tmp_dir:
        yield tmp_dir


def test_synthetic_image_carving(test_workspace):
    image_path = os.path.join(test_workspace, "test_evidence.raw")
    output_dir = os.path.join(test_workspace, "carved_output")

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

    assert manifest["report_type"] == "FORENSIC_CARVING_MANIFEST"
    assert manifest["summary"]["total_artifacts_recovered"] >= 4

    recovered_hashes = {a["hashes"]["sha256"]: a for a in manifest["artifacts"]}

    for key in ["jpeg", "png", "sqlite", "pdf"]:
        gt_hash = ground_truth[key]["sha256"]
        assert gt_hash in recovered_hashes
        assert recovered_hashes[gt_hash]["is_valid_structure"] is True
