"""
Forensic File Carving Configuration
Defines magic headers, trailers, sizing logic, and memory parameters.
"""

from typing import Dict, Any, Optional

# Default streaming buffer sizes
DEFAULT_CHUNK_SIZE = 4 * 1024 * 1024       # 4 MB chunk window
DEFAULT_OVERLAP_SIZE = 64 * 1024           # 64 KB overlap to catch boundary-spanning headers

# Supported file signatures with headers, trailers, and max allowed size
CARVE_SIGNATURES: Dict[str, Dict[str, Any]] = {
    "jpeg": {
        "extension": "jpg",
        "mime_type": "image/jpeg",
        "header": b"\xFF\xD8\xFF",
        "trailer": b"\xFF\xD9",
        "max_size": 30 * 1024 * 1024,      # 30 MB max
        "description": "JPEG Graphic Image",
    },
    "png": {
        "extension": "png",
        "mime_type": "image/png",
        "header": b"\x89PNG\r\n\x1a\n",
        "trailer": b"IEND\xaeB`\x82",
        "max_size": 30 * 1024 * 1024,      # 30 MB max
        "description": "Portable Network Graphics",
    },
    "gif": {
        "extension": "gif",
        "mime_type": "image/gif",
        "header": b"GIF89a",
        "trailer": b"\x00\x3B",
        "max_size": 25 * 1024 * 1024,      # 25 MB max
        "description": "Graphics Interchange Format (GIF89a)",
    },
    "pdf": {
        "extension": "pdf",
        "mime_type": "application/pdf",
        "header": b"%PDF-",
        "trailer": b"%%EOF",
        "max_size": 100 * 1024 * 1024,     # 100 MB max
        "description": "Adobe Portable Document Format",
    },
    "zip": {
        "extension": "zip",
        "mime_type": "application/zip",
        "header": b"PK\x03\x04",
        "trailer": b"PK\x05\x06",          # End of Central Directory Record
        "trailer_offset_add": 18,          # 18 bytes after PK\x05\x06
        "max_size": 200 * 1024 * 1024,    # 200 MB max
        "description": "ZIP / Office Open XML (DOCX/XLSX/PPTX)",
    },
    "sqlite": {
        "extension": "sqlite",
        "mime_type": "application/x-sqlite3",
        "header": b"SQLite format 3\x00",
        "trailer": None,                   # Dynamic calculation using page header
        "max_size": 500 * 1024 * 1024,    # 500 MB max
        "description": "SQLite 3 Database",
    },
    "webp": {
        "extension": "webp",
        "mime_type": "image/webp",
        "header": b"RIFF",
        "sub_header": b"WEBP",             # Offset 8 must contain WEBP
        "trailer": None,                   # Dynamic calculation using uint32 length at offset 4
        "max_size": 50 * 1024 * 1024,
        "description": "WebP Image",
    },
}
