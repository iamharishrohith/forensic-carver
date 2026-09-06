"""
Live Meeting Demo Script: Forensic File Carving & Deleted File Recovery
Demonstrates:
1. Creating original evidence files (JPEG, PNG, PDF, SQLite DB).
2. Simulating a suspect deleting all files into raw unallocated disk sectors.
3. Running the sliding-window carver to extract the deleted files.
4. Proving 100% byte-exact SHA-256 integrity match before vs after recovery.
"""

import os
import sys
import json
import time
import shutil

sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from carving.manager import CarvingManager
from carving.tests.download_and_build_dataset import build_synthetic_raw_image


def run_live_demo():
    print("\n" + "=" * 75)
    print("      LIVE FORENSIC DEMO: FILE CARVING & DELETED EVIDENCE RECOVERY      ")
    print("=" * 75)

    raw_image_path = "suspect_harddrive.raw"
    recovered_dir = "demo_recovered_evidence"

    # Clean up previous demo run if any
    if os.path.exists(recovered_dir):
        shutil.rmtree(recovered_dir, ignore_errors=True)

    # -------------------------------------------------------------
    # STEP 1: Create Evidence & Simulate File Deletion
    # -------------------------------------------------------------
    print("\n[STEP 1] Generating Suspect Drive & Simulating File Deletion...")
    print("  -> Creating 25 MB raw forensic drive...")
    print("  -> Injecting files (JPEG photos, PDF doc, SQLite chats, WebP, PNG)...")
    print("  -> Simulating filesystem deletion (wiping directory references into raw slack space)...")

    _, ground_truth = build_synthetic_raw_image(
        output_raw_path=raw_image_path,
        cache_dir="./evidence_cache",
        total_size_mb=25,
    )

    print(f"\n[+] Raw drive created: {os.path.abspath(raw_image_path)}")
    print(f"[+] Total files deleted/hidden on drive: {len(ground_truth)}")
    print("-" * 75)
    for name, info in ground_truth.items():
        print(f"  * {name:24} | Size: {info['size_bytes']:8,} bytes | Original SHA256: {info['sha256'][:16]}...")
    print("-" * 75)

    input("\n>>> Press ENTER to start the Carving Engine and recover deleted files... ")

    # -------------------------------------------------------------
    # STEP 2: Execute Carving Engine
    # -------------------------------------------------------------
    print("\n[STEP 2] Executing Sliding-Window Stream Carver...")
    t0 = time.perf_counter()

    manager = CarvingManager(chunk_size=4 * 1024 * 1024, overlap_size=64 * 1024)
    manifest = manager.process_source(
        source_path=raw_image_path,
        output_dir=recovered_dir,
        case_id="DEMO-LIVE-MEET-2026",
    )

    duration = time.perf_counter() - t0
    print(f"[+] Carving finished in {duration:.3f} seconds!")

    # -------------------------------------------------------------
    # STEP 3: Cryptographic Integrity Verification (Side-by-Side)
    # -------------------------------------------------------------
    print("\n" + "=" * 75)
    print(" [STEP 3] CRYPTOGRAPHIC INTEGRITY VERIFICATION (BEFORE vs AFTER)")
    print("=" * 75)

    recovered_artifacts = manifest["artifacts"]
    recovered_map = {a["hashes"]["sha256"]: a for a in recovered_artifacts}

    print(f"{'FILE NAME':<24} | {'ORIGINAL SHA-256':<16} | {'CARVED SHA-256':<16} | {'STATUS'}")
    print("-" * 75)

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

        print(f"{name:<24} | {orig_hash[:16]}... | {carved_hash[:16]}... | {status}")

    print("-" * 75)
    if all_matched:
        print(">>> RESULT: ALL DELETED FILES RECOVERED WITH 100% BIT-EXACT INTEGRITY! <<<")

    # -------------------------------------------------------------
    # STEP 4: Metadata & Output Manifest Inspection
    # -------------------------------------------------------------
    print("\n[STEP 4] Output Deliverables for Pipeline / Court:")
    print(f"  * Recovered Files Directory : {os.path.abspath(os.path.join(recovered_dir, 'recovered_artifacts'))}")
    print(f"  * JSON Manifest             : {manifest.get('manifest_saved_to')}")
    print(f"  * Streaming NDJSON          : {manifest.get('ndjson_saved_to')}")

    # Inspect SQLite database tables if recovered
    sqlite_hash = ground_truth["evidence_chats.sqlite"]["sha256"]
    if sqlite_hash in recovered_map:
        db_tables = recovered_map[sqlite_hash]["extracted_metadata"].get("tables", [])
        print(f"  * Extracted SQLite Tables   : {db_tables}")

    print("\n" + "=" * 75)
    print("                      DEMO COMPLETED SUCCESSFULLY                      ")
    print("=" * 75 + "\n")


if __name__ == "__main__":
    run_live_demo()
