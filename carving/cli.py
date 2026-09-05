"""
Command-Line Interface (CLI) for Forensic File Carving
Allows running the carver directly on any disk image or folder from the terminal.
"""

import os
import sys
import json
import argparse

from .manager import CarvingManager


def main():
    parser = argparse.ArgumentParser(
        description="ACPIA Forensic File Carving & Deleted Items Recovery Engine"
    )
    parser.add_argument(
        "--source", "-s", required=True, help="Path to raw disk image, binary dump, or evidence file."
    )
    parser.add_argument(
        "--output", "-o", default="./carved_evidence", help="Directory where carved files & JSON manifest will be saved."
    )
    parser.add_argument(
        "--case-id", "-c", default="CASE-2026-LOCAL", help="Case identifier to tag in manifest."
    )
    parser.add_argument(
        "--chunk-mb", type=int, default=4, help="Chunk window size in megabytes (default: 4 MB)."
    )
    parser.add_argument(
        "--no-fs", action="store_true", help="Skip pytsk3 filesystem search and use signature stream directly."
    )

    args = parser.parse_args()

    if not os.path.exists(args.source):
        print(f"[ERROR] Source path does not exist: {args.source}")
        sys.exit(1)

    print(f"[*] Starting Forensic Ingestion Carving...")
    print(f"[*] Source: {os.path.abspath(args.source)}")
    print(f"[*] Output Directory: {os.path.abspath(args.output)}")
    print(f"[*] Memory Chunk Size: {args.chunk_mb} MB")

    manager = CarvingManager(
        prefer_filesystem=not args.no_fs,
        chunk_size=args.chunk_mb * 1024 * 1024,
    )

    manifest = manager.process_source(
        source_path=args.source,
        output_dir=args.output,
        case_id=args.case_id,
    )

    print("\n" + "=" * 60)
    print(" CARVING COMPLETE - SUMMARY")
    print("=" * 60)
    print(f"Total Artifacts Recovered: {manifest['summary']['total_artifacts_recovered']}")
    print(f"Total Recovered Bytes:     {manifest['summary']['total_recovered_bytes']:,} bytes")
    print(f"Scan Duration:             {manifest['source']['scan_duration_seconds']}s")
    print(f"Engine Used:               {manifest['engine']['active_engine']}")
    print(f"Artifacts by Type:         {json.dumps(manifest['summary']['artifacts_by_type'], indent=2)}")
    print(f"JSON Manifest Written:     {manifest.get('manifest_saved_to')}")
    print(f"NDJSON Manifest Written:   {manifest.get('ndjson_saved_to')}")
    print("=" * 60)


if __name__ == "__main__":
    main()
