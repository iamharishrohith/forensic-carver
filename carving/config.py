# File signatures and carving thresholds

# 4MB chunks with 64KB overlap so we don't miss headers split across chunks
CHUNK_SIZE = 4 * 1024 * 1024
OVERLAP_SIZE = 64 * 1024

SIGNATURES = {
    "jpeg": {
        "ext": "jpg",
        "mime": "image/jpeg",
        "header": b"\xFF\xD8\xFF",
        "trailer": b"\xFF\xD9",
        "max_size": 30 * 1024 * 1024,
    },
    "png": {
        "ext": "png",
        "mime": "image/png",
        "header": b"\x89PNG\r\n\x1a\n",
        "trailer": b"IEND\xaeB`\x82",
        "max_size": 30 * 1024 * 1024,
    },
    "gif": {
        "ext": "gif",
        "mime": "image/gif",
        "header": b"GIF89a",
        "trailer": b"\x00\x3B",
        "max_size": 25 * 1024 * 1024,
    },
    "gif87": {
        "ext": "gif",
        "mime": "image/gif",
        "header": b"GIF87a",
        "trailer": b"\x00\x3B",
        "max_size": 25 * 1024 * 1024,
    },
    "pdf": {
        "ext": "pdf",
        "mime": "application/pdf",
        "header": b"%PDF-",
        "trailer": b"%%EOF",
        "max_size": 100 * 1024 * 1024,
    },
    "zip": {
        "ext": "zip",
        "mime": "application/zip",
        "header": b"PK\x03\x04",
        "trailer": b"PK\x05\x06",
        "trailer_add": 18,
        "max_size": 200 * 1024 * 1024,
    },
    "sqlite": {
        "ext": "sqlite",
        "mime": "application/x-sqlite3",
        "header": b"SQLite format 3\x00",
        "trailer": None, # computed dynamically from header page count
        "max_size": 500 * 1024 * 1024,
    },
    "webp": {
        "ext": "webp",
        "mime": "image/webp",
        "header": b"RIFF",
        "sub_header": b"WEBP",
        "trailer": None,
        "max_size": 50 * 1024 * 1024,
    },
}
