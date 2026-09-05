import os
import struct
from .config import SIGNATURES, CHUNK_SIZE, OVERLAP_SIZE
from .sqlite_carver import SQLiteCarver
from .validator import get_hashes, inspect_artifact


def find_jpeg_end(data, start=0, max_size=50 * 1024 * 1024):
    pos = start + 2
    limit = min(len(data), start + max_size)

    while pos + 4 <= limit:
        if data[pos] != 0xFF:
            break
        marker = data[pos + 1]

        if marker in [0xD8, 0xD9] or (0xD0 <= marker <= 0xD7):
            pos += 2
            continue

        if marker == 0xDA:
            seg_len = int.from_bytes(data[pos + 2 : pos + 4], "big")
            pos += 2 + seg_len

            while pos + 1 < limit:
                if data[pos] == 0xFF:
                    m = data[pos + 1]
                    if m == 0xD9:
                        return (pos + 2) - start
                    elif m == 0x00:
                        pos += 2
                    elif 0xD0 <= m <= 0xD7:
                        pos += 2
                    else:
                        pos += 1
                else:
                    pos += 1
            break

        seg_len = int.from_bytes(data[pos + 2 : pos + 4], "big")
        pos += 2 + seg_len

    last_eoi = data.rfind(b"\xFF\xD9", start + 2, start + max_size)
    if last_eoi != -1:
        return (last_eoi + 2) - start

    return None


class SignatureCarver:
    def __init__(self, chunk_size=CHUNK_SIZE, overlap_size=OVERLAP_SIZE, signatures=None):
        self.chunk_size = chunk_size
        self.overlap_size = overlap_size
        self.signatures = signatures or SIGNATURES

    def carve(self, source, output_dir, case_id=None):
        os.makedirs(output_dir, exist_ok=True)
        carved_files = []
        count = 0

        is_file_path = isinstance(source, str)
        if is_file_path:
            stream = open(source, "rb")
        else:
            stream = source

        try:
            stream_pos = 0
            carryover = b""

            while True:
                chunk = stream.read(self.chunk_size)
                if not chunk and not carryover:
                    break

                buf = carryover + chunk
                base_offset = stream_pos - len(carryover)
                buf_len = len(buf)

                for name, sig in self.signatures.items():
                    header = sig["header"]
                    trailer = sig.get("trailer")
                    max_len = sig.get("max_size", 50 * 1024 * 1024)
                    ext = sig["ext"]
                    mime = sig["mime"]

                    start = 0
                    while True:
                        h_pos = buf.find(header, start)
                        if h_pos == -1:
                            break

                        if "sub_header" in sig:
                            sub = sig["sub_header"]
                            if buf[h_pos + 8 : h_pos + 8 + len(sub)] != sub:
                                start = h_pos + len(header)
                                continue

                        end_pos = -1

                        if name == "jpeg":
                            jlen = find_jpeg_end(buf, h_pos, max_len)
                            if jlen is not None:
                                end_pos = h_pos + jlen
                            else:
                                cur = stream.tell()
                                extra = stream.read(min(max_len, 10 * 1024 * 1024))
                                stream.seek(cur)
                                if extra:
                                    temp_buf = buf[h_pos:] + extra
                                    jlen = find_jpeg_end(temp_buf, 0, max_len)
                                    if jlen is not None:
                                        end_pos = h_pos + jlen
                                        buf = buf[:h_pos] + temp_buf[:jlen]
                                        buf_len = len(buf)

                        elif name == "sqlite":
                            dlen = SQLiteCarver.get_length(buf, h_pos)
                            if dlen and dlen <= max_len:
                                if h_pos + dlen <= buf_len:
                                    end_pos = h_pos + dlen
                                else:
                                    needed = (h_pos + dlen) - buf_len
                                    cur = stream.tell()
                                    extra = stream.read(needed)
                                    stream.seek(cur)
                                    if len(extra) == needed:
                                        full_data = buf[h_pos:] + extra
                                        end_pos = h_pos + dlen
                                        buf = buf[:h_pos] + full_data
                                        buf_len = len(buf)

                        elif name == "webp":
                            if h_pos + 8 <= buf_len:
                                payload_len = struct.unpack("<I", buf[h_pos + 4 : h_pos + 8])[0]
                                wlen = payload_len + 8
                                if wlen <= max_len and h_pos + wlen <= buf_len:
                                    end_pos = h_pos + wlen

                        elif name == "pdf":
                            t_pos = buf.find(b"%%EOF", h_pos + len(header))
                            if t_pos != -1 and (t_pos - h_pos) <= max_len:
                                end_pos = t_pos + 5
                                if end_pos + 1 <= buf_len and buf[end_pos : end_pos + 2] == b"\r\n":
                                    end_pos += 2
                                elif end_pos < buf_len and buf[end_pos : end_pos + 1] in [b"\n", b"\r"]:
                                    end_pos += 1

                        elif trailer:
                            t_pos = buf.find(trailer, h_pos + len(header))
                            if t_pos != -1:
                                potential = (t_pos + len(trailer)) - h_pos
                                if potential <= max_len:
                                    extra_add = sig.get("trailer_add", 0)
                                    end_pos = t_pos + len(trailer) + extra_add

                        if end_pos != -1 and end_pos <= buf_len:
                            payload = buf[h_pos:end_pos]
                            abs_start = base_offset + h_pos
                            abs_end = base_offset + end_pos

                            valid, meta = inspect_artifact(name, payload)
                            hashes = get_hashes(payload)

                            count += 1
                            art_id = f"carved_{count:04d}"
                            filename = f"{art_id}_{hashes['sha256'][:8]}.{ext}"
                            out_path = os.path.join(output_dir, filename)

                            with open(out_path, "wb") as f:
                                f.write(payload)

                            carved_files.append({
                                "artifact_id": art_id,
                                "filename": filename,
                                "extension": ext,
                                "mime_type": mime,
                                "carve_method": "SIGNATURE_STREAM",
                                "offset_start": abs_start,
                                "offset_end": abs_end,
                                "size_bytes": len(payload),
                                "hashes": hashes,
                                "is_valid_structure": valid,
                                "extracted_metadata": meta,
                                "recovered_path": os.path.abspath(out_path),
                                "is_carved_or_deleted": True,
                            })

                            start = end_pos
                        else:
                            start = h_pos + len(header)

                if not chunk:
                    break

                stream_pos += len(chunk)
                if len(buf) > self.overlap_size:
                    carryover = buf[-self.overlap_size :]
                else:
                    carryover = buf

        finally:
            if is_file_path:
                stream.close()

        return carved_files
