# Forensic File Carving & Deleted Item Recovery Module

A lightweight, high-performance forensic carving engine built to extract deleted or unallocated files from raw disk images (`.raw`, `.dd`, `.img`), memory dumps, or binary streams.

It combines a **streaming signature carver** with an optional **filesystem-aware undelete layer (pytsk3)**, outputting clean, byte-exact recovered files alongside a court-ready JSON manifest.

---

## 🎯 What this module does

1. **Recovers Deleted Files from Raw Streams**: Scans for known file headers & trailers (JPEG, PNG, GIF, PDF, ZIP/Office, WebP, SQLite databases).
2. **Dynamic Database Page Calculations**: Reconstructs complete SQLite databases from raw sectors by parsing database header page tables without needing an end-of-file trailer.
3. **Sliding-Window Memory Safety**: Streams evidence in $4\text{ MB}$ chunks with a $64\text{ KB}$ carryover buffer, so files spanning across chunk boundaries are recovered without memory bloat (safe for 500GB+ disk images).
4. **Multi-Hash Verification**: Computes SHA-256, BLAKE3, and MD5 for every carved artifact.
5. **Standardized Manifest**: Automatically generates `carving_manifest.json` and `carving_manifest.ndjson` for pipeline orchestrators.

---

## 📁 Package Layout

```text
carving/
├── config.py             # File signatures, headers/trailers, and buffer settings
├── signature_carver.py   # Sliding-window stream carver
├── sqlite_carver.py      # SQLite page-size & page-count calculator
├── tsk_carver.py         # Optional Sleuth Kit (pytsk3) filesystem undelete
├── validator.py          # Structural validation & SHA-256/BLAKE3 hashers
├── json_exporter.py      # JSON and NDJSON manifest serializer
├── manager.py            # Main entry coordinator
├── cli.py                # Command-line interface
├── README.md             # This guide
└── tests/
    ├── generate_test_image.py  # Builds synthetic test images with injected files
    ├── test_carver.py          # Pytest suite
    └── run_tests.py            # Zero-dependency standard unittest runner
```

---

## 🚀 Quick Start

### 1. Run Unit Tests
No external test runner required — runs with standard Python:
```bash
cd backend
python app/carving/tests/run_tests.py
```

### 2. Carve a Disk Image via CLI
```bash
cd backend
python -m app.carving.cli --source "/path/to/evidence.raw" --output "./carved_output"
```

Options:
- `--source, -s`: Path to the raw image or binary dump (required).
- `--output, -o`: Directory where recovered files & manifests will be saved (default: `./carved_evidence`).
- `--chunk-mb`: Buffer window size in MB (default: `4`).
- `--case-id, -c`: Case identifier to stamp in the manifest (default: `CASE-2026-LOCAL`).
- `--no-fs`: Skip filesystem inode scan and carve raw signatures directly.

---

## 💻 Python API Usage

You can easily import and trigger the carver in FastAPI routes or background workers:

```python
from app.carving import CarvingManager

# Initialize the manager
manager = CarvingManager(chunk_size=4 * 1024 * 1024)

# Process a disk image
manifest = manager.process_source(
    source_path="evidence/suspect_drive.raw",
    output_dir="output/case_101",
    case_id="CASE-2026-001"
)

print(f"Recovered {manifest['summary']['total_artifacts_recovered']} files.")
print(f"Manifest written to: {manifest['manifest_saved_to']}")
```

---

## 📋 JSON Output Sample (`carving_manifest.json`)

```json
{
  "report_type": "FORENSIC_CARVING_MANIFEST",
  "version": "1.0.0",
  "case_id": "CASE-2026-001",
  "source": {
    "image_path": "/absolute/path/to/suspect_drive.raw",
    "image_size_bytes": 104857600,
    "image_sha256": "7a8b9c...",
    "scan_duration_seconds": 1.12
  },
  "summary": {
    "total_artifacts_recovered": 3,
    "total_recovered_bytes": 489201,
    "artifacts_by_type": {
      "image/jpeg": 2,
      "application/x-sqlite3": 1
    },
    "integrity_status": "ALL_HASHES_VERIFIED"
  },
  "artifacts": [
    {
      "artifact_id": "carved_0001",
      "filename": "carved_0001_8f4e2a.jpg",
      "extension": "jpg",
      "mime_type": "image/jpeg",
      "carve_method": "SIGNATURE_STREAM",
      "offset_start": 65536,
      "offset_end": 142080,
      "size_bytes": 76544,
      "hashes": {
        "sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        "blake3": "4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a",
        "md5": "d41d8cd98f00b204e9800998ecf8427e"
      },
      "is_valid_structure": true,
      "extracted_metadata": {
        "format": "JPEG",
        "jfif": true
      },
      "recovered_path": "/absolute/path/output/recovered_artifacts/carved_0001_8f4e2a.jpg"
    }
  ]
}
```

---

## 🔬 How the Boundary Overlap Works

When carving a $500\text{ GB}$ disk image, files are often located right at the seam between two $4\text{ MB}$ read buffers. 

This engine maintains a **$64\text{ KB}$ sliding carryover window**:
1. It reads chunk $N$.
2. It concatenates the final $64\text{ KB}$ of chunk $N-1$ to the start of chunk $N$.
3. Any header or trailer split across the boundary is seamlessly detected and recovered with exact absolute sector offsets.
