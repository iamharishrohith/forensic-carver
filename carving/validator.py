import hashlib
import sqlite3
import struct

try:
    import blake3
    HAS_BLAKE3 = True
except ImportError:
    HAS_BLAKE3 = False


def get_hashes(data):
    sha256_val = hashlib.sha256(data).hexdigest()
    md5_val = hashlib.md5(data).hexdigest()

    if HAS_BLAKE3:
        blake3_val = blake3.blake3(data).hexdigest()
    else:
        blake3_val = hashlib.sha512(data).hexdigest()[:64]

    return {
        "sha256": sha256_val,
        "blake3": blake3_val,
        "md5": md5_val,
    }


def check_jpeg(data):
    if len(data) < 4:
        return False, {}
    if not data.startswith(b"\xFF\xD8"):
        return False, {}

    info = {"format": "JPEG"}
    if b"JFIF\x00" in data[:100]:
        info["jfif"] = True
    if b"Exif\x00\x00" in data[:500]:
        info["exif_present"] = True

    return True, info


def check_png(data):
    if len(data) < 24:
        return False, {}
    if not data.startswith(b"\x89PNG\r\n\x1a\n"):
        return False, {}

    info = {"format": "PNG"}
    try:
        if data[12:16] == b"IHDR":
            width, height = struct.unpack(">II", data[16:24])
            info["width"] = width
            info["height"] = height
    except Exception:
        pass

    return True, info


def check_pdf(data):
    if not data.startswith(b"%PDF-"):
        return False, {}

    version = data[5:8].decode("ascii", errors="ignore")
    has_eof = b"%%EOF" in data[-1024:]
    info = {
        "format": "PDF",
        "pdf_version": version,
        "has_valid_eof": has_eof,
    }
    return True, info


def check_sqlite(data):
    if len(data) < 100 or not data.startswith(b"SQLite format 3\x00"):
        return False, {}

    page_size = int.from_bytes(data[16:18], "big")
    if page_size == 1:
        page_size = 65536

    page_count = int.from_bytes(data[28:32], "big")

    info = {
        "format": "SQLite3",
        "page_size": page_size,
        "page_count": page_count,
        "calculated_db_size": page_size * page_count,
    }

    try:
        conn = sqlite3.connect(":memory:")
        conn.deserialize(data)
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = [row[0] for row in cursor.fetchall()]
        info["tables"] = tables
        conn.close()
    except Exception:
        pass

    return True, info


def inspect_artifact(file_type, data):
    if file_type == "jpeg":
        return check_jpeg(data)
    elif file_type == "png":
        return check_png(data)
    elif file_type == "pdf":
        return check_pdf(data)
    elif file_type == "sqlite":
        return check_sqlite(data)

    return True, {"format": file_type.upper()}
