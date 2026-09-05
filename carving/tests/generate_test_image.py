import os
import struct
import sqlite3
import hashlib


def make_jpeg():
    header = b"\xFF\xD8\xFF\xE0\x00\x10JFIF\x00\x01\x01\x01\x00H\x00H\x00\x00"
    data = b"\xFF\xDB\x00\x43\x00" + (b"\x05" * 64) + b"\xFF\xDA\x00\x0C\x03\x01\x00\x02\x11\x03\x11\x00\x3F\x00\x12\x34\x56\x78"
    trailer = b"\xFF\xD9"
    return header + data + trailer


def make_png():
    header = b"\x89PNG\r\n\x1a\n"
    ihdr_data = struct.pack(">IIBBBBB", 1, 1, 8, 2, 0, 0, 0)
    ihdr_crc = struct.pack(">I", 0x367A6080)
    ihdr = struct.pack(">I", len(ihdr_data)) + b"IHDR" + ihdr_data + ihdr_crc
    idat_data = b"\x78\x9c\x63\x60\x60\x60\x00\x00\x00\x04\x00\x01"
    idat_crc = struct.pack(">I", 0x03450125)
    idat = struct.pack(">I", len(idat_data)) + b"IDAT" + idat_data + idat_crc
    iend = b"\x00\x00\x00\x00IEND\xaeB`\x82"
    return header + ihdr + idat + iend


def make_pdf():
    return (
        b"%PDF-1.4\n"
        b"1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n"
        b"2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n"
        b"3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>\nendobj\n"
        b"xref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n"
        b"trailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n190\n%%EOF"
    )


def make_sqlite():
    conn = sqlite3.connect(":memory:")
    cur = conn.cursor()
    cur.execute("CREATE TABLE contacts (id INTEGER PRIMARY KEY, name TEXT, phone TEXT);")
    cur.execute("INSERT INTO contacts VALUES (1, 'Alice', '1234567890');")
    cur.execute("INSERT INTO contacts VALUES (2, 'Bob', '0987654321');")
    conn.commit()
    data = conn.serialize()
    conn.close()
    return data


def generate_synthetic_disk_image(output_path, total_size_mb=10, inject_boundary_test=True):
    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)

    jpeg_bytes = make_jpeg()
    png_bytes = make_png()
    pdf_bytes = make_pdf()
    sqlite_bytes = make_sqlite()

    ground_truth = {
        "jpeg": {"size": len(jpeg_bytes), "sha256": hashlib.sha256(jpeg_bytes).hexdigest()},
        "png": {"size": len(png_bytes), "sha256": hashlib.sha256(png_bytes).hexdigest()},
        "pdf": {"size": len(pdf_bytes), "sha256": hashlib.sha256(pdf_bytes).hexdigest()},
        "sqlite": {"size": len(sqlite_bytes), "sha256": hashlib.sha256(sqlite_bytes).hexdigest()},
    }

    total_bytes = total_size_mb * 1024 * 1024
    image_data = bytearray(b"\x00" * total_bytes)

    # Put JPEG at 64KB
    off_jpeg = 64 * 1024
    image_data[off_jpeg : off_jpeg + len(jpeg_bytes)] = jpeg_bytes

    # Put PNG at 512KB
    off_png = 512 * 1024
    image_data[off_png : off_png + len(png_bytes)] = png_bytes

    # Put SQLite at 1.5MB
    off_sqlite = int(1.5 * 1024 * 1024)
    image_data[off_sqlite : off_sqlite + len(sqlite_bytes)] = sqlite_bytes

    # Put PDF near the 4MB boundary
    if inject_boundary_test:
        off_pdf = (4 * 1024 * 1024) - 50
    else:
        off_pdf = 2 * 1024 * 1024
    image_data[off_pdf : off_pdf + len(pdf_bytes)] = pdf_bytes

    with open(output_path, "wb") as f:
        f.write(image_data)

    return output_path, ground_truth
