# Forensic File Carving & Deleted Items Recovery Engine

A lightweight, high-performance forensic carving engine built to extract deleted, fragmented, or unallocated files from raw disk images (`.raw`, `.dd`, `.img`), memory dumps, and binary streams.

Outputs clean, byte-exact recovered files alongside a court-ready JSON manifest.

---

## 🎯 Key Features

1. **Header & Trailer Signature Carving**: Recovers JPEG, PNG, GIF, PDF, ZIP / Office Open XML (DOCX/XLSX), WebP, and SQLite databases.
2. **Smart JPEG Segment Parser**: Automatically walks EXIF/APP1 segment lengths to avoid premature stops on embedded camera thumbnails.
3. **Dynamic Database Page Calculations**: Reconstructs complete SQLite databases from raw sectors by parsing database header page tables without needing an end-of-file trailer.
4. **Sliding-Window Memory Safety (500GB+ Safe)**: Streams evidence in $4\text{ MB}$ chunks with a $64\text{ KB}$ carryover buffer to catch boundary-spanning files while using under $50\text{ MB}$ of RAM.
5. **Multi-Hash Verification**: Computes SHA-256, BLAKE3, and MD5 for every carved artifact.
6. **Dual Engine with Auto-Fallback**: Optional filesystem undelete layer (`pytsk3`) with automatic fallback to the pure-Python signature engine.
7. **Court-Ready Standardized Output**: Emits `carving_manifest.json` and line-delimited `carving_manifest.ndjson`.

---

## 📁 Repository Structure

```text
├── carving/
│   ├── __init__.py           # Public exports (CarvingManager, SignatureCarver, etc.)
│   ├── config.py             # File signatures, headers/trailers, and buffer settings
│   ├── signature_carver.py   # Sliding-window stream carver
│   ├── sqlite_carver.py      # SQLite page-size & page-count calculator
│   ├── tsk_carver.py         # Optional Sleuth Kit (pytsk3) filesystem undelete
│   ├── validator.py          # Structural validation & SHA-256/BLAKE3 hashers
│   ├── json_exporter.py      # JSON and NDJSON manifest serializer
│   ├── manager.py            # Main coordinator
│   ├── cli.py                # Command-line interface
│   └── tests/
│       ├── download_and_build_dataset.py       # Downloads real internet files & builds 25MB raw drive
│       ├── test_internet_synthetic_carving.py  # Integration test on real internet media
│       ├── generate_test_image.py              # Synthetic mock disk generator
│       ├── test_carver.py                      # Pytest unit tests
│       └── run_tests.py                        # Standalone unit test runner
├── run_tests.py              # Root test runner (runs both unit & internet integration tests)
├── requirements.txt          # Dependencies (optional blake3, pytsk3, pytest)
└── README.md                 # Documentation
```

---

## 🚀 Quick Start

### 1. Run Complete Test Suite (Unit Tests + Real Internet Dataset Test)
```bash
python run_tests.py
```

### 2. Generate a Standalone 25MB Raw Evidence Drive with Internet Samples
```bash
python carving/tests/download_and_build_dataset.py
```

### 3. Carve any Disk Image via CLI
```bash
python -m carving.cli --source "/path/to/evidence.raw" --output "./carved_output"
```

#### CLI Options:
* `--source, -s`: Path to the raw image or binary dump (*required*).
* `--output, -o`: Directory where recovered files & manifests will be saved (default: `./carved_evidence`).
* `--chunk-mb`: Buffer window size in MB (default: `4`).
* `--case-id, -c`: Case identifier to stamp in the manifest (default: `CASE-2026-LOCAL`).
* `--no-fs`: Skip filesystem inode scan and carve raw signatures directly.

---

## 💻 Python API Usage

```python
from carving import CarvingManager

# Initialize manager (4MB chunks, 64KB boundary overlap)
manager = CarvingManager(chunk_size=4 * 1024 * 1024)

# Process evidence disk
manifest = manager.process_source(
    source_path="path/to/suspect_drive.raw",
    output_dir="./output_folder",
    case_id="CASE-2026-T1"
)

print(f"Total recovered files: {manifest['summary']['total_artifacts_recovered']}")
print(f"Manifest written to: {manifest['manifest_saved_to']}")
```

---

## 📋 JSON Manifest Output Schema

```json
{
  "report_type": "FORENSIC_CARVING_MANIFEST",
  "version": "1.0.0",
  "case_id": "CASE-2026-T1",
  "source": {
    "image_path": "/path/to/evidence.raw",
    "image_size_bytes": 26214403,
    "image_sha256": "3a8f...",
    "scan_duration_seconds": 0.15
  },
  "summary": {
    "total_artifacts_recovered": 6,
    "total_recovered_bytes": 1711487,
    "artifacts_by_type": {
      "image/jpeg": 2,
      "image/png": 1,
      "application/x-sqlite3": 1,
      "application/pdf": 1,
      "image/webp": 1
    },
    "integrity_status": "ALL_HASHES_VERIFIED"
  },
  "artifacts": [
    {
      "artifact_id": "carved_0001",
      "filename": "carved_0001_017cb131.jpg",
      "extension": "jpg",
      "mime_type": "image/jpeg",
      "carve_method": "SIGNATURE_STREAM",
      "offset_start": 65536,
      "offset_end": 1131405,
      "size_bytes": 1065869,
      "hashes": {
        "sha256": "017cb13148858673cb4554bed385920b3261158759a75d9c18f20e908d686f1d",
        "blake3": "4b227777d4dd...",
        "md5": "e0287a9b1c..."
      },
      "is_valid_structure": true,
      "extracted_metadata": {
        "format": "JPEG",
        "exif_present": true
      },
      "recovered_path": ".../carved_0001_017cb131.jpg",
      "is_carved_or_deleted": true
    }
  ]
}
```
