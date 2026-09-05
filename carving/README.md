# Carving Module

Extracts deleted and unallocated files from disk images and raw bytes.

## Files
- `config.py`: File signatures and chunk size settings.
- `signature_carver.py`: Sliding window stream carver.
- `sqlite_carver.py`: SQLite page table calculator.
- `validator.py`: Hashes (SHA-256/MD5) and header checks.
- `json_exporter.py`: Manifest writer (JSON / NDJSON).
- `manager.py`: Main carver runner.
- `cli.py`: Terminal command line interface.
