"""
Synthetic Forensic Test Image Generator
Creates a raw mock disk image with unallocated sectors, random noise, and injected test files.
"""

import os
import io
import struct
import sqlite3
import hashlib
from typing import Dict, Any, Tuple


def create_sample_jpeg() -> bytes:
    """Generates a minimal valid JPEG file with JFIF header and dummy scan data."""
    header = b"\xFF\xD8\xFF\xE0\x00\x10JFIF\x00\x01\x01\x01\x00H\x00H\x00\x00"
    comment = b"\xFF\xFE\x00\x16ACPIA-FORENSIC-TEST-DATA"
    body = b"\xFF\xDB\x00\x43\x00" + (b"\x05" * 64) + b"\xFF\xDA\x00\x0C\x03\x01\x00\x02\x11\x03\x11\x00\x3F\x00\x12\x34\x56\x78"
    trailer = b"\xFF\xD9"
    return header + comment + body + trailer


def create_sample_png() -> bytes:
    """Generates a minimal valid PNG 1x1 pixel image."""
    signature = b"\x89PNG\r\n\x1a\n"
    # IHDR chunk: 1x1, 8-bit RGB
    ihdr_data = struct.pack(">IIBBBBB", 1, 1, 8, 2, 0, 0, 0)
    ihdr_crc = struct.pack(">I", 0x367A6080)
    ihdr = struct.pack(">I", len(ihdr_data)) + b"IHDR" + ihdr_data + ihdr_crc
    # IDAT chunk
    idat_data = b"\x78\x9c\x63\x60\x60\x60\x00\x00\x00\x04\x00\x01"
    idat_crc = struct.pack(">I", 0x03450125)
    idat = struct.pack(">I", len(idat_data)) + b"IDAT" + idat_data + idat_crc
    # IEND chunk
    iend = b"\x00\x00\x00\x00IEND\xaeB`\x82"
    return signature + ihdr + idat + iend


def create_sample_pdf() -> bytes:
    """Generates a minimal valid PDF document."""
    pdf_content = (
        b"%PDF-1.4\n"
        b"1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n"
        b"2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n"
        b"3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>\nendobj\n"
        b"xref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n"
        b"trailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n190\n%%EOF"
    )
    return pdf_content


def create_sample_sqlite() -> bytes:
    """Generates a valid SQLite database with mock investigation tables."""
    mem_db = sqlite3.connect(":memory:")
    cursor = mem_db.cursor()
    cursor.execute("CREATE TABLE contacts (id INTEGER PRIMARY KEY, name TEXT, phone TEXT);")
    cursor.execute("INSERT INTO contacts VALUES (1, 'Suspect Alpha', '+1-555-0199');")
    cursor.execute("INSERT INTO contacts VALUES (2, 'Associate Bravo', '+1-555-0288');")
    cursor.execute("CREATE TABLE calls (call_id INTEGER PRIMARY KEY, duration_sec INT);")
    cursor.execute("INSERT INTO calls VALUES (101, 340);")
    mem_db.commit()
    
    # Export bytes
    db_bytes = mem_db.serialize()
    mem_db.close()
    return db_bytes


def generate_synthetic_disk_image(
    output_path: str,
    total_size_mb: int = 10,
    inject_boundary_test: bool = True,
) -> Tuple[str, Dict[str, Any]]:
    """
    Constructs a synthetic binary evidence image containing injected files separated by slack space.
    Returns (image_path, ground_truth_dict).
    """
    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
    
    # Prepare files to inject
    jpeg_bytes = create_sample_jpeg()
    png_bytes = create_sample_png()
    pdf_bytes = create_sample_pdf()
    sqlite_bytes = create_sample_sqlite()

    ground_truth = {
        "jpeg": {
            "size": len(jpeg_bytes),
            "sha256": hashlib.sha256(jpeg_bytes).hexdigest(),
        },
        "png": {
            "size": len(png_bytes),
            "sha256": hashlib.sha256(png_bytes).hexdigest(),
        },
        "pdf": {
            "size": len(pdf_bytes),
            "sha256": hashlib.sha256(pdf_bytes).hexdigest(),
        },
        "sqlite": {
            "size": len(sqlite_bytes),
            "sha256": hashlib.sha256(sqlite_bytes).hexdigest(),
        },
    }

    # Initialize raw disk with noise / zeros
    total_bytes = total_size_mb * 1024 * 1024
    image_buffer = bytearray(b"\x00" * total_bytes)

    # Offset 1: Inode/MBR dummy padding at offset 0-4096
    # Inject JPEG at 64 KB offset
    offset_jpeg = 64 * 1024
    image_buffer[offset_jpeg : offset_jpeg + len(jpeg_bytes)] = jpeg_bytes
    ground_truth["jpeg"]["offset"] = offset_jpeg

    # Inject PNG at 512 KB offset
    offset_png = 512 * 1024
    image_buffer[offset_png : offset_png + len(png_bytes)] = png_bytes
    ground_truth["png"]["offset"] = offset_png

    # Inject SQLite at 1.5 MB offset
    offset_sqlite = int(1.5 * 1024 * 1024)
    image_buffer[offset_sqlite : offset_sqlite + len(sqlite_bytes)] = sqlite_bytes
    ground_truth["sqlite"]["offset"] = offset_sqlite

    # Inject PDF spanning across the 4MB chunk boundary (e.g. at 4MB - 50 bytes)
    if inject_boundary_test:
        offset_pdf = (4 * 1024 * 1024) - 50
    else:
        offset_pdf = 2 * 1024 * 1024
    image_buffer[offset_pdf : offset_pdf + len(pdf_bytes)] = pdf_bytes
    ground_truth["pdf"]["offset"] = offset_pdf

    # Write raw disk image to disk
    with open(output_path, "wb") as f:
        f.write(image_buffer)

    return output_path, ground_truth
