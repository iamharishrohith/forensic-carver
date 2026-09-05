class SQLiteCarver:
    HEADER = b"SQLite format 3\x00"

    @classmethod
    def get_length(cls, data, offset=0):
        if offset + 100 > len(data):
            return None

        if data[offset : offset + 16] != cls.HEADER:
            return None

        page_size_raw = int.from_bytes(data[offset + 16 : offset + 18], "big")
        if page_size_raw == 1:
            page_size = 65536
        else:
            page_size = page_size_raw

        valid_page_sizes = [512, 1024, 2048, 4096, 8192, 16384, 32768, 65536]
        if page_size not in valid_page_sizes:
            return None

        page_count = int.from_bytes(data[offset + 28 : offset + 32], "big")
        if page_count <= 0:
            page_count = 1

        return page_size * page_count
