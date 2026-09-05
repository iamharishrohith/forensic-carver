import os
import sys
import argparse
from .manager import CarvingManager


def main():
    parser = argparse.ArgumentParser(description="Forensic File Carving Tool")
    parser.add_argument("--source", "-s", required=True, help="Path to raw disk image or evidence file")
    parser.add_argument("--output", "-o", default="./carved_evidence", help="Output directory")
    parser.add_argument("--case-id", "-c", default="CASE-2026-LOCAL", help="Case ID")
    parser.add_argument("--chunk-mb", type=int, default=4, help="Chunk size in MB")
    parser.add_argument("--no-fs", action="store_true", help="Skip filesystem check")

    args = parser.parse_args()

    if not os.path.exists(args.source):
        print(f"Error: Source path not found: {args.source}")
        sys.exit(1)

    print(f"Carving file: {args.source}")
    print(f"Output folder: {args.output}")

    manager = CarvingManager(
        prefer_filesystem=not args.no_fs,
        chunk_size=args.chunk_mb * 1024 * 1024,
    )

    manifest = manager.process_source(
        source_path=args.source,
        output_dir=args.output,
        case_id=args.case_id,
    )

    print("\nCarving finished.")
    print(f"Recovered files: {manifest['summary']['total_artifacts_recovered']}")
    print(f"Recovered bytes: {manifest['summary']['total_recovered_bytes']:,}")
    print(f"Manifest saved to: {manifest.get('manifest_saved_to')}")


if __name__ == "__main__":
    main()
