import hashlib
import sqlite3
import struct

try:
    import blake3
    HAS_BLAKE3 = True
except ImportError:
    HAS_BLAKE3 = False


def get_hashes(data: bytes) -> dict:
    """Computes sha256, blake3 (if available), and md5 for an artifact."""
    h_sha256 = hashlib.sha256(data).hexdigest()
    h_md5 = hashlib.md5(data).hexdigest()

    if HAS_BLAKE3:
        h_blake3 = blake3.blake3(data).hexdigest()
    else:
        # Fallback if blake3 package is not installed in the environment
        h_blake3 = hashlib.sha512(data).hexdigest()[:64]

    return {
        "sha256": h_sha256,
        "blake3": h_blake3,
        "md5": h_md5,
    }


def check_jpeg(data: bytes) -> tuple[bool, dict]:
    if len(data) < 4 or not data.startswith(b"\xFF\xD8"):
        return False, {}
    
    meta = {"format": "JPEG"}
    if b"JFIF\x00" in data[:100]:
        meta["jfif"] = True
    if b"Exif\x00\x00" in data[:500]:
        meta["exif_present"] = True
        
    return True, meta


def check_png(data: bytes) -> tuple[bool, dict]:
    if len(data) < 24 or not data.startswith(b"\x89PNG\r\n\x1a\n"):
        return False, {}
    
    meta = {"format": "PNG"}
    try:
        if data[12:16] == b"IHDR":
            w, h = struct.unpack(">II", data[16:24])
            meta["width"] = w
            meta["height"] = h
    except Exception:
        pass
        
    return True, meta


def check_pdf(data: bytes) -> tuple[bool, dict]:
    if not data.startswith(b"%PDF-"):
        return False, {}
    
    version = data[5:8].decode("ascii", errors="ignore")
    meta = {
        "format": "PDF",
        "pdf_version": version,
        "has_valid_eof": b"%%EOF" in data[-1024:],
    }
    return True, meta


def check_sqlite(data: bytes) -> tuple[bool, dict]:
    if not data.startswith(b"SQLite format 3\x00") or len(data) < 100:
        return False, {}
    
    page_size = int.from_bytes(data[16:18], "big")
    if page_size == 1:
        page_size = 65536
    page_count = int.from_bytes(data[28:32], "big")
    
    meta = {
        "format": "SQLite3",
        "page_size": page_size,
        "page_count": page_count,
        "calculated_db_size": page_size * page_count,
    }
    
    # Try reading tables in-memory if sqlite3 supports deserialization
    try:
        conn = sqlite3.connect(":memory:")
        conn.deserialize(data)
        cur = conn.cursor()
        cur.execute("SELECT name FROM sqlite_master WHERE type='table';")
        meta["tables"] = [r[0] for r in cur.fetchall()]
        conn.close()
    except Exception as e:
        meta["note"] = f"Partial/unfinalized db: {e}"
        
    return True, meta


def inspect_artifact(file_type: str, data: bytes) -> tuple[bool, dict]:
    """Inspects file structure and grabs lightweight metadata."""
    if file_type == "jpeg":
        return check_jpeg(data)
    elif file_type == "png":
        return check_png(data)
    elif file_type == "pdf":
        return check_pdf(data)
    elif file_type == "sqlite":
        return check_sqlite(data)
    
    return True, {"format": file_type.upper()}
