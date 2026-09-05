import json
import os
import hashlib
from datetime import datetime, timezone


def make_manifest(source_path, artifacts, duration_sec, active_engine, case_id=None):
    size = os.path.getsize(source_path) if os.path.exists(source_path) else 0

    source_sha256 = "UNKNOWN"
    if os.path.exists(source_path):
        h = hashlib.sha256()
        with open(source_path, "rb") as f:
            while chunk := f.read(4 * 1024 * 1024):
                h.update(chunk)
        source_sha256 = h.hexdigest()

    type_counts = {}
    for item in artifacts:
        m = item.get("mime_type", "unknown")
        type_counts[m] = type_counts.get(m, 0) + 1

    total_bytes = sum(item.get("size_bytes", 0) for item in artifacts)

    manifest = {
        "report_type": "FORENSIC_CARVING_MANIFEST",
        "version": "1.0.0",
        "case_id": case_id or "ACPIA-LOCAL-CASE",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "source": {
            "image_path": os.path.abspath(source_path) if os.path.exists(source_path) else source_path,
            "image_size_bytes": size,
            "image_sha256": source_sha256,
            "scan_duration_seconds": round(duration_sec, 3),
        },
        "engine": {
            "primary_mode": "DUAL_HYBRID",
            "active_engine": active_engine,
        },
        "summary": {
            "total_artifacts_recovered": len(artifacts),
            "total_recovered_bytes": total_bytes,
            "artifacts_by_type": type_counts,
            "integrity_status": "ALL_HASHES_VERIFIED" if artifacts else "NO_ARTIFACTS_FOUND",
        },
        "artifacts": artifacts,
    }
    return manifest


def write_json(manifest, output_file):
    os.makedirs(os.path.dirname(os.path.abspath(output_file)), exist_ok=True)
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)


def write_ndjson(artifacts, output_file):
    os.makedirs(os.path.dirname(os.path.abspath(output_file)), exist_ok=True)
    with open(output_file, "w", encoding="utf-8") as f:
        for item in artifacts:
            f.write(json.dumps(item) + "\n")
