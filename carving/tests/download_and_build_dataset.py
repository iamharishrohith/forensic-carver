import os
import sqlite3
import hashlib
import zipfile
import io
import urllib.request

# Diverse real-world media files from public repositories
SAMPLE_URLS = {
    "nikon_exif_dslr.jpg": "https://raw.githubusercontent.com/drewnoakes/metadata-extractor-images/master/jpg/Nikon%20E990.jpg",
    "landscape_camera_1.jpg": "https://raw.githubusercontent.com/recurser/exif-orientation-examples/master/Landscape_1.jpg",
    "landscape_camera_2.jpg": "https://raw.githubusercontent.com/recurser/exif-orientation-examples/master/Landscape_2.jpg",
    "landscape_camera_4.jpg": "https://raw.githubusercontent.com/recurser/exif-orientation-examples/master/Landscape_4.jpg",
    "landscape_camera_5.jpg": "https://raw.githubusercontent.com/recurser/exif-orientation-examples/master/Landscape_5.jpg",
    "landscape_camera_6.jpg": "https://raw.githubusercontent.com/recurser/exif-orientation-examples/master/Landscape_6.jpg",
    "portrait_camera_1.jpg": "https://raw.githubusercontent.com/recurser/exif-orientation-examples/master/Portrait_1.jpg",
    "portrait_camera_2.jpg": "https://raw.githubusercontent.com/recurser/exif-orientation-examples/master/Portrait_2.jpg",
    "high_res_earth.jpg": "https://upload.wikimedia.org/wikipedia/commons/9/97/The_Earth_seen_from_Apollo_17.jpg",
    "w3c_dummy_doc.pdf": "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
    "gallery_sample.webp": "https://www.gstatic.com/webp/gallery/1.webp",
    "transparent_demo.png": "https://upload.wikimedia.org/wikipedia/commons/4/47/PNG_transparency_demonstration_1.png",
}


def make_chat_db():
    conn = sqlite3.connect(":memory:")
    cur = conn.cursor()
    cur.execute("CREATE TABLE messages (id INT PRIMARY KEY, sender TEXT, recipient TEXT, text TEXT, timestamp_utc TEXT);")
    cur.execute("CREATE TABLE locations (id INT PRIMARY KEY, latitude REAL, longitude REAL, label TEXT);")
    cur.execute("CREATE TABLE attachments (id INT PRIMARY KEY, filename TEXT, file_hash TEXT);")

    cur.execute("INSERT INTO messages VALUES (1, '+1-555-0199', '+1-555-0288', 'Meeting point at drop zone confirmed', '2026-09-06T10:15:00Z');")
    cur.execute("INSERT INTO messages VALUES (2, '+1-555-0288', '+1-555-0199', 'Send the coordinates and clear device logs', '2026-09-06T10:16:30Z');")
    cur.execute("INSERT INTO locations VALUES (101, 37.774929, -122.419416, 'Mission District Safehouse');")
    cur.execute("INSERT INTO attachments VALUES (501, 'nikon_exif_dslr.jpg', '017cb13148858673...');")
    conn.commit()
    data = conn.serialize()
    conn.close()
    return data


def make_browser_history_db():
    conn = sqlite3.connect(":memory:")
    cur = conn.cursor()
    cur.execute("CREATE TABLE history (id INT PRIMARY KEY, url TEXT, title TEXT, visit_count INT, last_visit_time TEXT);")
    cur.execute("CREATE TABLE downloads (id INT PRIMARY KEY, target_path TEXT, total_bytes INT, mime_type TEXT);")

    cur.execute("INSERT INTO history VALUES (1, 'https://secure-chat.org/login', 'Encrypted Web Messenger', 14, '2026-09-06T09:30:00Z');")
    cur.execute("INSERT INTO history VALUES (2, 'https://darknet-market.onion/listing/982', 'Restricted Marketplace', 3, '2026-09-06T11:00:00Z');")
    cur.execute("INSERT INTO downloads VALUES (101, '/Downloads/confidential_manifest.pdf', 13264, 'application/pdf');")
    conn.commit()
    data = conn.serialize()
    conn.close()
    return data


def make_evidence_zip():
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("suspect_notes.txt", "Case 2026 confidential investigation notes.")
        zf.writestr("key_contacts.csv", "name,phone\nSuspect Alpha,+15550199\nAssociate Beta,+15550288")
    return buf.getvalue()


def download_all_samples(cache_folder):
    os.makedirs(cache_folder, exist_ok=True)
    samples = {}

    for name, url in SAMPLE_URLS.items():
        local_path = os.path.join(cache_folder, name)
        if os.path.exists(local_path) and os.path.getsize(local_path) > 0:
            with open(local_path, "rb") as f:
                data = f.read()
        else:
            try:
                req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"})
                with urllib.request.urlopen(req, timeout=20) as resp:
                    data = resp.read()
                with open(local_path, "wb") as f:
                    f.write(data)
            except Exception:
                data = b"FALLBACK_DATA"

        samples[name] = data

    # Add realistic forensic databases and archive
    samples["suspect_chat_history.sqlite"] = make_chat_db()
    samples["suspect_browser_history.sqlite"] = make_browser_history_db()
    samples["confidential_archive.zip"] = make_evidence_zip()

    return samples


def build_synthetic_raw_image(output_raw_path, cache_dir="./evidence_cache", total_size_mb=1024):
    """
    Builds a raw forensic disk image (e.g. 1024 MB / 1 GB) streaming directly to disk.
    Spreads real evidence files across unallocated sectors.
    """
    os.makedirs(os.path.dirname(os.path.abspath(output_raw_path)), exist_ok=True)
    samples = download_all_samples(cache_dir)

    total_bytes = total_size_mb * 1024 * 1024
    ground_truth = {}

    # Calculate gap between files to distribute evenly across the 1 GB drive
    num_files = len(samples)
    gap_size = max(1024 * 1024, (total_bytes - (50 * 1024 * 1024)) // (num_files + 1))

    current_offset = 64 * 1024  # 64 KB after MBR

    with open(output_raw_path, "wb") as f:
        # Write MBR sector
        mbr = b"\xEB\x58\x90MSDOS5.0" + (b"\xAA\x55" * 252)
        f.write(mbr)

        # Pad to first file offset
        if current_offset > len(mbr):
            f.write(b"\x00" * (current_offset - len(mbr)))

        for name, data in samples.items():
            file_len = len(data)
            if current_offset + file_len > total_bytes:
                break

            file_sha256 = hashlib.sha256(data).hexdigest()
            file_md5 = hashlib.md5(data).hexdigest()

            # Write file payload
            f.write(data)

            ground_truth[name] = {
                "name": name,
                "offset_start": current_offset,
                "offset_end": current_offset + file_len,
                "size_bytes": file_len,
                "sha256": file_sha256,
                "md5": file_md5,
            }

            current_offset += file_len

            # Write unallocated slack space gap (in 4MB blocks)
            gap_remaining = min(gap_size, total_bytes - current_offset)
            if gap_remaining > 0:
                block_size = 4 * 1024 * 1024
                while gap_remaining > 0:
                    write_size = min(gap_remaining, block_size)
                    f.write(b"\x00" * write_size)
                    gap_remaining -= write_size
                    current_offset += write_size

        # Pad remaining space up to total_bytes
        if current_offset < total_bytes:
            remaining = total_bytes - current_offset
            block_size = 4 * 1024 * 1024
            while remaining > 0:
                write_size = min(remaining, block_size)
                f.write(b"\x00" * write_size)
                remaining -= write_size

    return output_raw_path, ground_truth


if __name__ == "__main__":
    out_file = os.path.join(os.path.dirname(__file__), "1GB_evidence_drive.raw")
    build_synthetic_raw_image(out_file, total_size_mb=1024)
