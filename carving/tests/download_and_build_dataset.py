"""
Internet-Sourced Synthetic Evidence Drive Builder
Downloads real-world media files (EXIF JPEGs, PNGs, PDFs, WebP) from public repositories,
synthesizes a forensic SQLite case database, and embeds them into a raw disk image
separated by unallocated sectors and slack space.
"""

import os
import sys
import time
import struct
import sqlite3
import hashlib
import urllib.request
from typing import Dict, Any, Tuple

PUBLIC_DATASET_URLS = {
    "nikon_exif.jpg": "https://raw.githubusercontent.com/drewnoakes/metadata-extractor-images/master/jpg/Nikon%20E990.jpg",
    "landscape_exif.jpg": "https://raw.githubusercontent.com/recurser/exif-orientation-examples/master/Landscape_3.jpg",
    "w3c_dummy.pdf": "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
    "gallery.webp": "https://www.gstatic.com/webp/gallery/1.webp",
    "transparent.png": "https://upload.wikimedia.org/wikipedia/commons/4/47/PNG_transparency_demonstration_1.png",
}


def download_real_samples(cache_dir: str) -> Dict[str, bytes]:
    """Downloads real media samples from the internet or loads from local cache."""
    os.makedirs(cache_dir, exist_ok=True)
    sample_bytes_map: Dict[str, bytes] = {}

    print("[*] Fetching real media samples from internet repositories...")
    for filename, url in PUBLIC_DATASET_URLS.items():
        local_path = os.path.join(cache_dir, filename)
        if os.path.exists(local_path) and os.path.getsize(local_path) > 0:
            with open(local_path, "rb") as f:
                data = f.read()
            print(f"  -> Loaded from cache: {filename} ({len(data):,} bytes)")
        else:
            try:
                req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (Forensic-Toolkit/1.0)"})
                with urllib.request.urlopen(req, timeout=15) as resp:
                    data = resp.read()
                with open(local_path, "wb") as f:
                    f.write(data)
                print(f"  -> Downloaded: {filename} ({len(data):,} bytes)")
            except Exception as e:
                print(f"  [!] Failed to download {filename} from {url}: {e}")
                # Fallback: minimal valid payload if internet is restricted
                if filename.endswith(".jpg"):
                    data = b"\xFF\xD8\xFF\xE0\x00\x10JFIF\x00\x01\x01\x01\x00H\x00H\x00\x00\xFF\xD9"
                elif filename.endswith(".png"):
                    data = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x00IEND\xaeB`\x82"
                elif filename.endswith(".pdf"):
                    data = b"%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF"
                elif filename.endswith(".webp"):
                    data = b"RIFF\x14\x00\x00\x00WEBPVP8 \x08\x00\x00\x00\x9d\x01*\x01\x00\x01\x00"
                else:
                    data = b"DUMMY_DATA"

        sample_bytes_map[filename] = data

    # Create realistic forensic SQLite database for chat logs
    sample_bytes_map["evidence_chats.sqlite"] = create_forensic_chat_db()
    print(f"  -> Created synthetic database: evidence_chats.sqlite ({len(sample_bytes_map['evidence_chats.sqlite']):,} bytes)")

    return sample_bytes_map


def create_forensic_chat_db() -> bytes:
    """Creates a realistic SQLite database with suspect messages and location history."""
    con = sqlite3.connect(":memory:")
    cur = con.cursor()
    cur.execute("CREATE TABLE messages (msg_id INT PRIMARY KEY, sender TEXT, recipient TEXT, content TEXT, timestamp_utc TEXT);")
    cur.execute("CREATE TABLE locations (loc_id INT PRIMARY KEY, latitude REAL, longitude REAL, description TEXT, captured_at TEXT);")
    cur.execute("CREATE TABLE attachments (att_id INT PRIMARY KEY, filename TEXT, file_hash TEXT, file_type TEXT);")

    # Insert realistic evidence rows
    cur.execute("INSERT INTO messages VALUES (1, '+1-202-555-0144', '+1-202-555-0199', 'Meet at coordinates attached in folder', '2026-09-04T12:30:00Z');")
    cur.execute("INSERT INTO messages VALUES (2, '+1-202-555-0199', '+1-202-555-0144', 'Confirmed. Delete conversation history after read.', '2026-09-04T12:31:15Z');")
    cur.execute("INSERT INTO locations VALUES (101, 37.774929, -122.419416, 'Mission District Drop Zone', '2026-09-04T14:00:00Z');")
    cur.execute("INSERT INTO attachments VALUES (501, 'nikon_exif.jpg', 'e3b0c442...', 'image/jpeg');")

    con.commit()
    db_bytes = con.serialize()
    con.close()
    return db_bytes


def build_synthetic_raw_image(
    output_raw_path: str,
    cache_dir: str = "./evidence_cache",
    total_size_mb: int = 25,
) -> Tuple[str, Dict[str, Any]]:
    """
    Constructs a 25 MB raw disk image embedding real downloaded media files at
    unallocated sector offsets, separated by noise/zero padding.
    """
    os.makedirs(os.path.dirname(os.path.abspath(output_raw_path)), exist_ok=True)
    samples = download_real_samples(cache_dir)

    total_bytes = total_size_mb * 1024 * 1024
    disk_buffer = bytearray(b"\x00" * total_bytes)

    # Master Boot Record / Inode simulation at start
    disk_buffer[0:512] = b"\xEB\x58\x90MSDOS5.0" + (b"\xAA\x55" * 252)

    ground_truth = {}
    current_offset = 64 * 1024  # Start after MBR slack space at 64 KB

    print(f"\n[*] Embedding {len(samples)} real evidence artifacts into {total_size_mb} MB raw disk image...")

    for name, data in samples.items():
        # Space files out by ~1.5 MB unallocated gaps
        if current_offset + len(data) > total_bytes:
            print(f"[!] Warning: disk buffer full, skipping {name}")
            break

        file_sha256 = hashlib.sha256(data).hexdigest()
        file_md5 = hashlib.md5(data).hexdigest()

        # Place file data at current unallocated offset
        disk_buffer[current_offset : current_offset + len(data)] = data

        ground_truth[name] = {
            "name": name,
            "offset_start": current_offset,
            "offset_end": current_offset + len(data),
            "size_bytes": len(data),
            "sha256": file_sha256,
            "md5": file_md5,
        }

        print(f"  -> Injected {name:22} @ Offset: {current_offset:8,} bytes | Size: {len(data):8,} bytes | SHA256: {file_sha256[:16]}...")
        # Advance offset with padding
        current_offset += len(data) + (1024 * 1024)  # 1 MB gap

    with open(output_raw_path, "wb") as f:
        f.write(disk_buffer)

    print(f"\n[+] Raw Evidence Drive Created: {os.path.abspath(output_raw_path)} ({os.path.getsize(output_raw_path):,} bytes)")
    return output_raw_path, ground_truth


if __name__ == "__main__":
    out_path = os.path.join(os.path.dirname(__file__), "synthetic_evidence_drive.raw")
    build_synthetic_raw_image(out_path)
