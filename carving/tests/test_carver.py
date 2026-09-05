"""
Forensic File Carving Unit Test Suite
Validates signature recovery, boundary overlap handling, cryptographic hash integrity,
and JSON manifest generation.
"""

import os
import sys
import json
import tempfile
import sqlite3
import pytest

# Ensure root workspace is on python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

try:
    from carving.manager import CarvingManager
    from carving.signature_carver import SignatureCarver
    from carving.tests.generate_test_image import generate_synthetic_disk_image
except ImportError:
    from app.carving.manager import CarvingManager
    from app.carving.signature_carver import SignatureCarver
    from app.carving.tests.generate_test_image import generate_synthetic_disk_image


@pytest.fixture
def test_workspace():
    """Creates a temporary isolated directory for carving test outputs."""
    with tempfile.TemporaryDirectory() as tmp_dir:
        yield tmp_dir


def test_synthetic_image_carving_and_hashes(test_workspace):
    """
    Verifies that all 4 injected files (JPEG, PNG, SQLite, and boundary-crossing PDF)
    are successfully recovered with 100% byte-exact SHA-256 matches.
    """
    image_path = os.path.join(test_workspace, "test_evidence.raw")
    output_dir = os.path.join(test_workspace, "carved_output")

    # Generate synthetic image
    _, ground_truth = generate_synthetic_disk_image(
        output_path=image_path,
        total_size_mb=8,
        inject_boundary_test=True,
    )

    # Initialize manager and process image
    manager = CarvingManager(chunk_size=4 * 1024 * 1024, overlap_size=64 * 1024)
    manifest = manager.process_source(
        source_path=image_path,
        output_dir=output_dir,
        case_id="UNIT-TEST-CASE-01",
    )

    # 1. Verify JSON Manifest Structure
    assert manifest["report_type"] == "FORENSIC_CARVING_MANIFEST"
    assert manifest["summary"]["total_artifacts_recovered"] >= 4
    assert manifest["summary"]["integrity_status"] == "ALL_HASHES_VERIFIED"

    carved_artifacts = manifest["artifacts"]
    recovered_hashes = {a["hashes"]["sha256"]: a for a in carved_artifacts}

    # 2. Check JPEG Recovery & Exact Hash Match
    gt_jpeg_hash = ground_truth["jpeg"]["sha256"]
    assert gt_jpeg_hash in recovered_hashes, "JPEG was not recovered or hash mismatched"
    jpeg_art = recovered_hashes[gt_jpeg_hash]
    assert jpeg_art["mime_type"] == "image/jpeg"
    assert jpeg_art["is_valid_structure"] is True
    assert os.path.exists(jpeg_art["recovered_path"])

    # 3. Check PNG Recovery & Exact Hash Match
    gt_png_hash = ground_truth["png"]["sha256"]
    assert gt_png_hash in recovered_hashes, "PNG was not recovered or hash mismatched"
    png_art = recovered_hashes[gt_png_hash]
    assert png_art["mime_type"] == "image/png"
    assert png_art["is_valid_structure"] is True

    # 4. Check SQLite Recovery & Schema Parsing
    gt_sqlite_hash = ground_truth["sqlite"]["sha256"]
    assert gt_sqlite_hash in recovered_hashes, "SQLite DB was not recovered or hash mismatched"
    sqlite_art = recovered_hashes[gt_sqlite_hash]
    assert sqlite_art["mime_type"] == "application/x-sqlite3"
    # Verify tables were read
    assert "contacts" in sqlite_art["extracted_metadata"].get("tables", [])

    # 5. Check Boundary-Crossing PDF Recovery
    gt_pdf_hash = ground_truth["pdf"]["sha256"]
    assert gt_pdf_hash in recovered_hashes, "Boundary-crossing PDF was not recovered cleanly"
    pdf_art = recovered_hashes[gt_pdf_hash]
    assert pdf_art["mime_type"] == "application/pdf"
    assert pdf_art["is_valid_structure"] is True


def test_json_manifest_file_output(test_workspace):
    """
    Verifies that carving_manifest.json and carving_manifest.ndjson are written
    and validly formatted.
    """
    image_path = os.path.join(test_workspace, "test_manifest.raw")
    output_dir = os.path.join(test_workspace, "manifest_output")

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

    assert os.path.exists(json_file)
    assert os.path.exists(ndjson_file)

    # Read and parse JSON file directly from disk
    with open(json_file, "r", encoding="utf-8") as f:
        loaded_json = json.load(f)

    assert loaded_json["case_id"] == "ACPIA-LOCAL-CASE"
    assert "source" in loaded_json
    assert "summary" in loaded_json
    assert len(loaded_json["artifacts"]) > 0

    # Read NDJSON lines
    with open(ndjson_file, "r", encoding="utf-8") as f:
        lines = [json.loads(line) for line in f if line.strip()]
    assert len(lines) == len(loaded_json["artifacts"])
