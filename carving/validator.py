"""
Validator and Cryptographic Fingerprinter for Carved Artifacts
Calculates SHA-256, BLAKE3 (or fallback), MD5, and validates structural integrity.
"""

import hashlib
import sqlite3
import struct
import io
import os
from typing import Dict, Any, Optional, Tuple

try:
    import blake3
    HAS_BLAKE3 = True
except ImportError:
    HAS_BLAKE3 = False


def calculate_hashes(data: bytes) -> Dict[str, str]:
    """Calculates multi-algorithm cryptographic hashes for evidence integrity."""
    sha256_hash = hashlib.sha256(data).hexdigest()
    md5_hash = hashlib.md5(data).hexdigest()
    
    if HAS_BLAKE3:
        b3_hash = blake3.blake3(data).hexdigest()
    else:
        # High-speed fallback if blake3 package is not installed
        b3_hash = hashlib.sha512(data).hexdigest()[:64]

    return {
        "sha256": sha256_hash,
        "blake3": b3_hash,
        "md5": md5_hash,
    }


def validate_jpeg(data: bytes) -> Tuple[bool, Dict[str, Any]]:
    """Validates JPEG format and extracts basic Exif/JFIF markers."""
    if len(data) < 4 or not data.startswith(b"\xFF\xD8"):
        return False, {}
    
    metadata: Dict[str, Any] = {"format": "JPEG"}
    
    # Check for JFIF or Exif markers
    if b"JFIF\x00" in data[:100]:
        metadata["jfif"] = True
    if b"Exif\x00\x00" in data[:500]:
        metadata["exif_present"] = True
        
    return True, metadata


def validate_png(data: bytes) -> Tuple[bool, Dict[str, Any]]:
    """Validates PNG signature and IHDR chunk."""
    if len(data) < 24 or not data.startswith(b"\x89PNG\r\n\x1a\n"):
        return False, {}
    
    metadata: Dict[str, Any] = {"format": "PNG"}
    
    # Check for IHDR
    try:
        if data[12:16] == b"IHDR":
            width, height = struct.unpack(">II", data[16:24])
            metadata["width"] = width
            metadata["height"] = height
    except Exception:
        pass
        
    return True, metadata


def validate_pdf(data: bytes) -> Tuple[bool, Dict[str, Any]]:
    """Validates PDF header and checks for EOF."""
    if not data.startswith(b"%PDF-"):
        return False, {}
    
    version = data[5:8].decode("ascii", errors="ignore")
    metadata: Dict[str, Any] = {"format": "PDF", "pdf_version": version}
    
    if b"%%EOF" in data[-1024:]:
        metadata["has_valid_eof"] = True
    else:
        metadata["has_valid_eof"] = False
        
    return True, metadata


def validate_sqlite(data: bytes) -> Tuple[bool, Dict[str, Any]]:
    """Validates SQLite header and extracts table metadata from raw bytes."""
    if not data.startswith(b"SQLite format 3\x00") or len(data) < 100:
        return False, {}
    
    page_size = int.from_bytes(data[16:18], "big")
    if page_size == 1:
        page_size = 65536
    page_count = int.from_bytes(data[28:32], "big")
    
    metadata: Dict[str, Any] = {
        "format": "SQLite3",
        "page_size": page_size,
        "page_count": page_count,
        "calculated_db_size": page_size * page_count,
    }
    
    # Attempt read-only memory connection to extract table names
    try:
        # Create temp in-memory or byte connection
        con = sqlite3.connect(":memory:")
        con.deserialize(data)
        cursor = con.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = [row[0] for row in cursor.fetchall()]
        metadata["tables"] = tables
        con.close()
    except Exception as e:
        metadata["db_parse_note"] = f"Partial/unfinalized database: {str(e)}"
        
    return True, metadata


def validate_and_extract_metadata(file_type: str, data: bytes) -> Tuple[bool, Dict[str, Any]]:
    """Dispatches validation according to file type."""
    if file_type == "jpeg":
        return validate_jpeg(data)
    elif file_type == "png":
        return validate_png(data)
    elif file_type == "pdf":
        return validate_pdf(data)
    elif file_type == "sqlite":
        return validate_sqlite(data)
    else:
        return True, {"format": file_type.upper()}
