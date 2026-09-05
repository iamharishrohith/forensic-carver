import os
import sqlite3
import hashlib
import urllib.request

SAMPLE_URLS = {
    "nikon_exif.jpg": "https://raw.githubusercontent.com/drewnoakes/metadata-extractor-images/master/jpg/Nikon%20E990.jpg",
    "landscape_exif.jpg": "https://raw.githubusercontent.com/recurser/exif-orientation-examples/master/Landscape_3.jpg",
    "w3c_dummy.pdf": "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
    "gallery.webp": "https://www.gstatic.com/webp/gallery/1.webp",
    "transparent.png": "https://upload.wikimedia.org/wikipedia/commons/4/47/PNG_transparency_demonstration_1.png",
}


def make_chat_db():
    conn = sqlite3.connect(":memory:")
    cur = conn.cursor()
    cur.execute("CREATE TABLE messages (id INT PRIMARY KEY, sender TEXT, text TEXT);")
    cur.execute("CREATE TABLE locations (id INT PRIMARY KEY, lat REAL, lon REAL);")
    cur.execute("CREATE TABLE attachments (id INT PRIMARY KEY, filename TEXT);")
    cur.execute("INSERT INTO messages VALUES (1, 'UserA', 'Hello world');")
    cur.execute("INSERT INTO locations VALUES (1, 37.7749, -122.4194);")
    cur.execute("INSERT INTO attachments VALUES (1, 'photo.jpg');")
    conn.commit()
    data = conn.serialize()
    conn.close()
    return data


def download_samples(cache_folder):
    os.makedirs(cache_folder, exist_ok=True)
    samples = {}

    for name, url in SAMPLE_URLS.items():
        local_path = os.path.join(cache_folder, name)
        if os.path.exists(local_path) and os.path.getsize(local_path) > 0:
            with open(local_path, "rb") as f:
                data = f.read()
        else:
            try:
                req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
                with urllib.request.urlopen(req, timeout=15) as resp:
                    data = resp.read()
                with open(local_path, "wb") as f:
                    f.write(data)
            except Exception:
                data = b"DUMMY_DATA"

        samples[name] = data

    samples["evidence_chats.sqlite"] = make_chat_db()
    return samples


def build_synthetic_raw_image(output_raw_path, cache_dir="./evidence_cache", total_size_mb=25):
    os.makedirs(os.path.dirname(os.path.abspath(output_raw_path)), exist_ok=True)
    samples = download_samples(cache_dir)

    total_bytes = total_size_mb * 1024 * 1024
    disk_data = bytearray(b"\x00" * total_bytes)

    # dummy MBR header
    disk_data[0:512] = b"\xEB\x58\x90MSDOS5.0" + (b"\xAA\x55" * 252)

    ground_truth = {}
    current_offset = 64 * 1024

    for name, data in samples.items():
        if current_offset + len(data) > total_bytes:
            break

        file_sha256 = hashlib.sha256(data).hexdigest()
        file_md5 = hashlib.md5(data).hexdigest()

        disk_data[current_offset : current_offset + len(data)] = data

        ground_truth[name] = {
            "name": name,
            "offset_start": current_offset,
            "offset_end": current_offset + len(data),
            "size_bytes": len(data),
            "sha256": file_sha256,
            "md5": file_md5,
        }

        current_offset += len(data) + (1024 * 1024)

    with open(output_raw_path, "wb") as f:
        f.write(disk_data)

    return output_raw_path, ground_truth


if __name__ == "__main__":
    out_file = os.path.join(os.path.dirname(__file__), "synthetic_evidence_drive.raw")
    build_synthetic_raw_image(out_file)
