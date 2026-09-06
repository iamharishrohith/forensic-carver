"""
Interactive Forensic Demo:
1. Shows real evidence files inside original folder.
2. Simulates suspect deleting all files into raw unallocated drive sectors.
3. Runs the Forensic Carving Engine to recover all deleted files.
4. Shows side-by-side cryptographic verification (Before vs After).
"""

import os
import sys
import json
import time
import shutil
import argparse

sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from carving.manager import CarvingManager
from carving.tests.download_and_build_dataset import download_all_samples, build_synthetic_raw_image


def run_interactive_demo(size_mb=1024, auto_mode=False):
    original_folder = "original_suspect_files"
    raw_disk_image = f"suspect_{size_mb}MB_drive.raw"
    recovered_folder = "recovered_evidence"

    # Clean previous demo runs
    for path in [original_folder, recovered_folder, raw_disk_image]:
        if os.path.isdir(path):
            shutil.rmtree(path, ignore_errors=True)
        elif os.path.isfile(path):
            os.remove(path)

    print("\n" + "=" * 80)
    print("        FORENSIC INVESTIGATION DEMO: FILE CARVING & DELETED RECOVERY       ")
    print(f"                     [ EVIDENCE DRIVE SIZE: {size_mb} MB ]                       ")
    print("=" * 80)

    # -------------------------------------------------------------
    # PHASE 1: SHOW ORIGINAL FILES INSIDE
    # -------------------------------------------------------------
    print("\n" + "-" * 80)
    print(" [PHASE 1] ORIGINAL EVIDENCE FILES (Before Deletion)")
    print("-" * 80)
    print("  -> Populating original evidence files on suspect computer...")

    samples = download_all_samples("./evidence_cache")
    os.makedirs(original_folder, exist_ok=True)

    ground_truth = {}
    for name, data in samples.items():
        file_path = os.path.join(original_folder, name)
        with open(file_path, "wb") as f:
            f.write(data)

        ground_truth[name] = {
            "size": len(data),
            "sha256": manager_hash(data),
            "path": os.path.abspath(file_path),
        }

    print(f"\n[+] Created folder: {os.path.abspath(original_folder)}")
    print(f"[+] Total files currently present: {len(ground_truth)}")
    print(f"\n{'FILE NAME':<32} | {'SIZE':<10} | {'PRE-DELETION SHA-256'}")
    print("-" * 80)
    for name, info in ground_truth.items():
        print(f"{name:<32} | {info['size']:8,} B | {info['sha256'][:24]}...")
    print("-" * 80)

    print("\n[*] NOTE: You can open 'original_suspect_files/' in File Explorer right now to view them.")
    if not auto_mode:
        input("\n>>> Press ENTER to simulate SUSPECT DELETING THESE FILES... ")

    # -------------------------------------------------------------
    # PHASE 2: SIMULATE DELETION (SHOW WHICH FILES DELETED)
    # -------------------------------------------------------------
    print("\n" + "-" * 80)
    print(" [PHASE 2] SUSPECT DELETION & RAW DISK IMAGING")
    print("-" * 80)
    print(f"  -> Building {size_mb} MB raw disk image with unallocated sectors...")

    build_synthetic_raw_image(
        output_raw_path=raw_disk_image,
        cache_dir="./evidence_cache",
        total_size_mb=size_mb,
    )

    # Now delete original folder to simulate deletion
    shutil.rmtree(original_folder, ignore_errors=True)

    print("\n[!] SUSPECT ACTION TRIGGERED:")
    print(f"  [X] DELETED DIRECTORY : {os.path.abspath(original_folder)}")
    print("  [X] DELETED FILES     :")
    for name in ground_truth.keys():
        print(f"      - {name} (DELETED)")

    print(f"\n[+] The files are now wiped from filesystem tables.")
    print(f"[+] Only raw disk bytes remain in: {os.path.abspath(raw_disk_image)} ({os.path.getsize(raw_disk_image):,} bytes)")

    if not auto_mode:
        input("\n>>> Press ENTER to launch our CARVING RECOVERY ENGINE on the raw disk... ")

    # -------------------------------------------------------------
    # PHASE 3: EXECUTE CARVING RECOVERY ENGINE
    # -------------------------------------------------------------
    print("\n" + "-" * 80)
    print(" [PHASE 3] EXECUTING FORENSIC CARVING ENGINE")
    print("-" * 80)
    print("  -> Scanning raw binary stream in 4 MB chunks with 64 KB overlap...")

    t0 = time.perf_counter()
    manager = CarvingManager(chunk_size=4 * 1024 * 1024, overlap_size=64 * 1024)
    manifest = manager.process_source(
        source_path=raw_disk_image,
        output_dir=recovered_folder,
        case_id="DEMO-2026-T1",
    )
    elapsed = time.perf_counter() - t0
    speed = size_mb / elapsed if elapsed > 0 else 0

    print(f"[+] Carving complete in {elapsed:.3f} seconds! (Speed: {speed:.1f} MB/s)")
    print(f"[+] Total files extracted: {manifest['summary']['total_artifacts_recovered']}")

    # -------------------------------------------------------------
    # PHASE 4: PROOF & VERIFICATION (BEFORE vs AFTER)
    # -------------------------------------------------------------
    print("\n" + "=" * 80)
    print(" [PHASE 4] CRYPTOGRAPHIC INTEGRITY VERIFICATION (BEFORE vs AFTER)")
    print("=" * 80)

    recovered_artifacts = manifest["artifacts"]
    recovered_map = {a["hashes"]["sha256"]: a for a in recovered_artifacts}

    print(f"{'DELETED FILE NAME':<30} | {'ORIGINAL SHA-256':<16} | {'RECOVERED SHA-256':<16} | {'STATUS'}")
    print("-" * 80)

    all_matched = True
    for name, info in ground_truth.items():
        orig_hash = info["sha256"]
        if orig_hash in recovered_map:
            carved_art = recovered_map[orig_hash]
            carved_hash = carved_art["hashes"]["sha256"]
            status = "MATCH (100%)"
        else:
            carved_hash = "NOT_FOUND"
            status = "FAILED"
            all_matched = False

        print(f"{name:<30} | {orig_hash[:16]}... | {carved_hash[:16]}... | {status}")

    print("-" * 80)
    if all_matched:
        print(">>> SUCCESS: 100% OF DELETED EVIDENCE RECOVERED WITH ZERO CORRUPTION! <<<")

    print("\n[+] Deliverables Ready for Investigation:")
    print(f"  * Recovered Files Folder : {os.path.abspath(os.path.join(recovered_folder, 'recovered_artifacts'))}")
    print(f"  * JSON Manifest Dossier  : {manifest.get('manifest_saved_to')}")
    print(f"  * Streaming NDJSON       : {manifest.get('ndjson_saved_to')}")
    print(f"  * Breakdown by Type      : {json.dumps(manifest['summary']['artifacts_by_type'], indent=2)}")

    print("\n" + "=" * 80)
    print("                         DEMO COMPLETE                          ")
    print("=" * 80 + "\n")


def manager_hash(data):
    import hashlib
    return hashlib.sha256(data).hexdigest()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Forensic Carving Live Demo")
    parser.add_argument("--size-mb", type=int, default=1024, help="Drive size in MB (default: 1024 for 1GB)")
    parser.add_argument("--auto", action="store_true", help="Run in non-interactive automatic mode")
    args = parser.parse_args()

    run_interactive_demo(size_mb=args.size_mb, auto_mode=args.auto)
