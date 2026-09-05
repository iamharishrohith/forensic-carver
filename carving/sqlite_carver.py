# SQLite 3 Database page parser for carving raw unallocated sectors

class SQLiteCarver:
    HEADER = b"SQLite format 3\x00"

    @classmethod
    def get_length(cls, data: bytes, offset: int = 0):
        """Reads SQLite header and computes total file size from page count."""
        if offset + 100 > len(data):
            return None

        if data[offset : offset + 16] != cls.HEADER:
            return None

        # bytes 16-17: page size (big-endian)
        raw_page_size = int.from_bytes(data[offset + 16 : offset + 18], "big")
        page_size = 65536 if raw_page_size == 1 else raw_page_size

        if page_size not in [512, 1024, 2048, 4096, 8192, 16384, 32768, 65536]:
            return None

        # bytes 28-31: total page count in database
        page_count = int.from_bytes(data[offset + 28 : offset + 32], "big")
        if page_count <= 0:
            page_count = 1

        return page_size * page_count
