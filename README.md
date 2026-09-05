# Forensic File Carver

Simple Python tool to recover deleted files (JPEG, PNG, PDF, SQLite, WebP, GIF, ZIP) from disk images and memory dumps.

## Features
- Extracts deleted files using header and trailer signatures.
- Reconstructs SQLite databases directly from header page counts.
- Streams files in 4MB chunks with 64KB overlap to save RAM.
- Generates SHA-256 and MD5 hashes for all recovered files.
- Exports results to `carving_manifest.json` and `carving_manifest.ndjson`.

## How to run

### 1. Run tests
```bash
python run_tests.py
```

### 2. Carve a disk image
```bash
python -m carving.cli --source "path/to/evidence.raw" --output "./output_folder"
```

### 3. Use in Python
```python
from carving import CarvingManager

manager = CarvingManager()
manifest = manager.process_source("evidence.raw", "./output")
print("Recovered files:", manifest["summary"]["total_artifacts_recovered"])
```
