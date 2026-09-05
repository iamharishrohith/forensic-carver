"""
Specialized SQLite Database Carver
Reconstructs deleted or unallocated SQLite3 database files by calculating page size & total pages.
"""

from typing import Optional, Dict, Any, Tuple


class SQLiteCarver:
    """Specialized carver for SQLite format 3 databases from raw binary offsets."""

    MAGIC_HEADER = b"SQLite format 3\x00"

    @classmethod
    def calculate_length_from_offset(cls, stream_data: bytes, offset: int) -> Optional[int]:
        """
        Reads the SQLite 100-byte database header and computes the total valid file length.
        """
        if offset + 100 > len(stream_data):
            return None

        # Verify magic header
        if stream_data[offset : offset + 16] != cls.MAGIC_HEADER:
            return None

        # Byte 16-17: Database page size (in bytes, big-endian)
        # Must be a power of two between 512 and 32768 inclusive, or the value 1 representing 65536.
        page_size_bytes = stream_data[offset + 16 : offset + 18]
        page_size = int.from_bytes(page_size_bytes, "big")
        if page_size == 1:
            page_size = 65536

        if page_size not in [512, 1024, 2048, 4096, 8192, 16384, 32768, 65536]:
            return None

        # Byte 28-31: Size of the database file in pages (in-header database size)
        page_count_bytes = stream_data[offset + 28 : offset + 32]
        page_count = int.from_bytes(page_count_bytes, "big")

        if page_count <= 0:
            # Fallback: scan page by page or set minimum 1 page
            page_count = 1

        total_length = page_size * page_count
        return total_length
