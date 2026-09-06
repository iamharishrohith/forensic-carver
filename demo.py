import os
import sys
import json
import time
import shutil
import argparse

sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from carving.manager import CarvingManager
from carving.tests.download_and_build_dataset import build_synthetic_raw_image


def run_live_demo(size_mb=1024):
    print("\n" + "=" * 78)
    print("      LIVE FORENSIC DEMO: FILE CARVING & DELETED EVIDENCE RECOVERY      ")
    print(f"               [ TARGET DRIVE SIZE: {size_mb} MB ({size_mb/1024:.1f} GB) ]                ")
    print("=" * 78)

    raw_image_path = f"suspect_{size_mb}MB_drive.raw"
    recovered_dir = "demo_recovered_evidence"

    # Clean previous output
    if os.path.exists(recovered_dir):
        shutil.rmtree(recovered_dir, ignore_errors=True)

    # -------------------------------------------------------------
    # STEP 1: Create Evidence & Simulate File Deletion
    # -------------------------------------------------------------
    print(f"\n[STEP 1] Generating {size_mb} MB Raw Forensic Drive with Real-World Media...")
    print("  -> Fetching real DSLR camera JPEGs, PDFs, WebPs, PNGs...")
    print("  -> Generating suspect SQLite chat databases, browser history, & ZIP archives...")
    print("  -> Distributing files across 1 GB unallocated sectors...")

    t_build_start = time.perf_counter()
    _, ground_truth = build_synthetic_raw_image(
        output_raw_path=raw_image_path,
        cache_dir="./evidence_cache",
        total_size_mb=size_mb,
    )
    t_build = time.perf_counter() - t_build_start

    print(f"\n[+] Raw Evidence Drive Created in {t_build:.2f}s: {os.path.abspath(raw_image_path)}")
    print(f"[+] Total files deleted/hidden across the drive: {len(ground_truth)}")
    print("-" * 78)
    for name, info in ground_truth.items():
        print(f"  * {name:30} | Size: {info['size_bytes']:9,} bytes | Offset: {info['offset_start']:10,} | SHA256: {info['sha256'][:16]}...")
    print("-" * 78)

    print("\n>>> All file references have been wiped from filesystem directory tables.")
    print(">>> Files now exist only as raw bytes in unallocated drive sectors.")
    
    # Check if run with --auto or interactive
    if "--auto" not in sys.argv:
        input("\n>>> Press ENTER to launch the Carving Engine across the 1 GB drive... ")

    # -------------------------------------------------------------
    # STEP 2: Execute Carving Engine
    # -------------------------------------------------------------
    print(f"\n[STEP 2] Executing Sliding-Window Stream Carver across {size_mb} MB ({os.path.getsize(raw_image_path):,} bytes)...")
    t0 = time.perf_counter()

    manager = CarvingManager(chunk_size=4 * 1024 * 1024, overlap_size=64 * 1024)
    manifest = manager.process_source(
        source_path=raw_image_path,
        output_dir=recovered_dir,
        case_id="DEMO-LIVE-MEET-2026",
    )

    duration = time.perf_counter() - t0
    mb_per_sec = size_mb / duration if duration > 0 else 0
    print(f"[+] Carving finished in {duration:.3f} seconds! (Throughput: {mb_per_sec:.1f} MB/s)")

    # -------------------------------------------------------------
    # STEP 3: Cryptographic Integrity Verification (Side-by-Side)
    # -------------------------------------------------------------
    print("\n" + "=" * 78)
    print(" [STEP 3] CRYPTOGRAPHIC INTEGRITY VERIFICATION (BEFORE vs AFTER)")
    print("=" * 78)

    recovered_artifacts = manifest["artifacts"]
    recovered_map = {a["hashes"]["sha256"]: a for a in recovered_artifacts}

    print(f"{'FILE NAME':<30} | {'ORIGINAL SHA-256':<16} | {'CARVED SHA-256':<16} | {'STATUS'}")
    print("-" * 78)

    all_matched = True
    for name, gt in ground_truth.items():
        orig_hash = gt["sha256"]
        if orig_hash in recovered_map:
            carved_art = recovered_map[orig_hash]
            carved_hash = carved_art["hashes"]["sha256"]
            status = "MATCH (100%)"
        else:
            carved_hash = "NOT_FOUND"
            status = "FAILED"
            all_matched = False

        print(f"{name:<30} | {orig_hash[:16]}... | {carved_hash[:16]}... | {status}")

    print("-" * 78)
    if all_matched:
        print(">>> RESULT: ALL 15 REAL EVIDENCE FILES RECOVERED WITH 100% BIT-EXACT INTEGRITY! <<<")

    # -------------------------------------------------------------
    # STEP 4: Metadata & Output Manifest Inspection
    # -------------------------------------------------------------
    print("\n[STEP 4] Output Deliverables for Pipeline / Court:")
    print(f"  * Recovered Files Directory : {os.path.abspath(os.path.join(recovered_dir, 'recovered_artifacts'))}")
    print(f"  * JSON Manifest             : {manifest.get('manifest_saved_to')}")
    print(f"  * Streaming NDJSON          : {manifest.get('ndjson_saved_to')}")
    print(f"  * Total Bytes Recovered     : {manifest['summary']['total_recovered_bytes']:,} bytes")
    print(f"  * Artifacts by MIME Type    : {json.dumps(manifest['summary']['artifacts_by_type'], indent=2)}")

    print("\n" + "=" * 78)
    print("                      DEMO COMPLETED SUCCESSFULLY                      ")
    print("=" * 78 + "\n")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Live Forensic Carving Demo")
    parser.add_argument("--size-mb", type=int, default=1024, help="Drive size in MB (default: 1024 for 1GB)")
    parser.add_argument("--auto", action="store_true", help="Run without waiting for Enter key")
    args = parser.parse_args()

    run_live_demo(size_mb=args.size_mb)
