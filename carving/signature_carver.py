"""
Sliding-Window Signature-Based File Carver
Scans raw disk images, mounted volumes, or unallocated streams for magic headers and trailers.
Includes JPEG segment parsing (to avoid stopping on embedded EXIF thumbnails),
dynamic SQLite page counting, RIFF/WebP size calculations, and overlap window buffering.
"""

import os
import io
import struct
from typing import Generator, Dict, Any, Optional, List, BinaryIO

from .config import CARVE_SIGNATURES, DEFAULT_CHUNK_SIZE, DEFAULT_OVERLAP_SIZE
from .sqlite_carver import SQLiteCarver
from .validator import calculate_hashes, validate_and_extract_metadata


def parse_jpeg_length(buffer: bytes, start_offset: int = 0, max_size: int = 50 * 1024 * 1024) -> Optional[int]:
    """
    Parses JPEG segment markers (APP0, APP1/EXIF, DQT, DHT, SOF) by length,
    skipping embedded EXIF thumbnail trailers and finding the true terminal EOI (FF D9).
    """
    pos = start_offset + 2
    buf_len = len(buffer)
    limit = min(buf_len, start_offset + max_size)

    while pos + 4 <= limit:
        if buffer[pos] != 0xFF:
            break
        marker = buffer[pos + 1]
        
        # Standalone markers with no length payload
        if marker in [0xD8, 0xD9]:
            pos += 2
            continue
        if 0xD0 <= marker <= 0xD7:  # RST restart markers
            pos += 2
            continue

        # Start of Scan (SOS) - Image data stream begins
        if marker == 0xDA:
            seg_len = int.from_bytes(buffer[pos + 2 : pos + 4], "big")
            pos += 2 + seg_len
            
            # Scan scan-data until true un-escaped FFD9 EOI
            while pos + 1 < limit:
                if buffer[pos] == 0xFF:
                    m = buffer[pos + 1]
                    if m == 0xD9:  # Genuine End of Image
                        return (pos + 2) - start_offset
                    elif m == 0x00:  # Escaped byte-stuffed 0xFF
                        pos += 2
                    elif 0xD0 <= m <= 0xD7:  # RST marker inside scan
                        pos += 2
                    else:
                        pos += 1
                else:
                    pos += 1
            break

        # Standard segment: read 2-byte big-endian length and skip
        seg_len = int.from_bytes(buffer[pos + 2 : pos + 4], "big")
        pos += 2 + seg_len

    # Fallback to last FFD9 within max_size if segment walk did not terminate
    last_eoi = buffer.rfind(b"\xFF\xD9", start_offset + 2, start_offset + max_size)
    if last_eoi != -1:
        return (last_eoi + 2) - start_offset

    return None


class SignatureCarver:
    """Stream-based magic-byte and trailer file carver."""

    def __init__(
        self,
        chunk_size: int = DEFAULT_CHUNK_SIZE,
        overlap_size: int = DEFAULT_OVERLAP_SIZE,
        signatures: Optional[Dict[str, Dict[str, Any]]] = None,
    ):
        self.chunk_size = chunk_size
        self.overlap_size = overlap_size
        self.signatures = signatures or CARVE_SIGNATURES

    def carve_file_stream(
        self,
        file_path_or_stream: Any,
        output_dir: str,
        case_id: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """
        Scans a raw evidence file or binary stream and extracts all carved artifacts to output_dir.
        Returns a list of recovered artifact metadata dictionaries.
        """
        os.makedirs(output_dir, exist_ok=True)
        carved_artifacts: List[Dict[str, Any]] = []
        carved_counter = 0

        if isinstance(file_path_or_stream, str):
            stream = open(file_path_or_stream, "rb")
            should_close = True
        else:
            stream = file_path_or_stream
            should_close = False

        try:
            stream_pos = 0
            carryover_buffer = b""

            while True:
                chunk = stream.read(self.chunk_size)
                if not chunk and not carryover_buffer:
                    break

                buffer_data = carryover_buffer + chunk
                buffer_base_offset = stream_pos - len(carryover_buffer)
                buffer_len = len(buffer_data)

                # Scan buffer for supported signatures
                for sig_key, sig_info in self.signatures.items():
                    header = sig_info["header"]
                    trailer = sig_info.get("trailer")
                    max_size = sig_info.get("max_size", 50 * 1024 * 1024)
                    ext = sig_info["extension"]
                    mime_type = sig_info["mime_type"]

                    start_idx = 0
                    while True:
                        header_pos = buffer_data.find(header, start_idx)
                        if header_pos == -1:
                            break

                        # Sub-header verification if applicable (e.g. WEBP inside RIFF)
                        if "sub_header" in sig_info:
                            sub_header = sig_info["sub_header"]
                            if buffer_data[header_pos + 8 : header_pos + 8 + len(sub_header)] != sub_header:
                                start_idx = header_pos + len(header)
                                continue

                        end_pos = -1

                        # Sizing Logic 1: Smart Segment-Aware JPEG
                        if sig_key in ["jpeg"]:
                            jpeg_len = parse_jpeg_length(buffer_data, header_pos, max_size)
                            if jpeg_len is not None:
                                end_pos = header_pos + jpeg_len
                            else:
                                # Read ahead if file extends past current chunk
                                needed_bytes = min(max_size, 10 * 1024 * 1024)
                                curr_tell = stream.tell()
                                read_ahead = stream.read(needed_bytes)
                                stream.seek(curr_tell)
                                if read_ahead:
                                    extended_buf = buffer_data[header_pos:] + read_ahead
                                    jpeg_len = parse_jpeg_length(extended_buf, 0, max_size)
                                    if jpeg_len is not None:
                                        end_pos = header_pos + jpeg_len
                                        buffer_data = buffer_data[:header_pos] + extended_buf[:jpeg_len]
                                        buffer_len = len(buffer_data)

                        # Sizing Logic 2: SQLite dynamic page table length
                        elif sig_key == "sqlite":
                            calc_len = SQLiteCarver.calculate_length_from_offset(buffer_data, header_pos)
                            if calc_len and calc_len <= max_size:
                                if header_pos + calc_len <= buffer_len:
                                    end_pos = header_pos + calc_len
                                else:
                                    needed_bytes = (header_pos + calc_len) - buffer_len
                                    curr_tell = stream.tell()
                                    read_ahead = stream.read(needed_bytes)
                                    stream.seek(curr_tell)
                                    if len(read_ahead) == needed_bytes:
                                        full_db_data = buffer_data[header_pos:] + read_ahead
                                        end_pos = header_pos + calc_len
                                        buffer_data = buffer_data[:header_pos] + full_db_data
                                        buffer_len = len(buffer_data)

                        # Sizing Logic 3: WebP dynamic length from RIFF header
                        elif sig_key == "webp":
                            if header_pos + 8 <= buffer_len:
                                riff_payload_len = struct.unpack("<I", buffer_data[header_pos + 4 : header_pos + 8])[0]
                                total_webp_len = riff_payload_len + 8
                                if total_webp_len <= max_size and header_pos + total_webp_len <= buffer_len:
                                    end_pos = header_pos + total_webp_len

                        # Sizing Logic 4: PDF with trailing newline detection
                        elif sig_key == "pdf":
                            trailer_pos = buffer_data.find(b"%%EOF", header_pos + len(header))
                            if trailer_pos != -1 and (trailer_pos - header_pos) <= max_size:
                                end_pos = trailer_pos + 5
                                # Check for trailing \r, \n, or \r\n immediately following %%EOF
                                if end_pos + 1 <= buffer_len and buffer_data[end_pos : end_pos + 2] == b"\r\n":
                                    end_pos += 2
                                elif end_pos < buffer_len and buffer_data[end_pos : end_pos + 1] in [b"\n", b"\r"]:
                                    end_pos += 1

                        # Sizing Logic 5: Standard Header-Trailer matching (PNG, GIF, ZIP)
                        elif trailer:
                            trailer_pos = buffer_data.find(trailer, header_pos + len(header))
                            if trailer_pos != -1:
                                potential_len = (trailer_pos + len(trailer)) - header_pos
                                if potential_len <= max_size:
                                    add_offset = sig_info.get("trailer_offset_add", 0)
                                    end_pos = trailer_pos + len(trailer) + add_offset

                        if end_pos != -1 and end_pos <= buffer_len:
                            carved_bytes = buffer_data[header_pos:end_pos]
                            abs_start_offset = buffer_base_offset + header_pos
                            abs_end_offset = buffer_base_offset + end_pos

                            is_valid, extracted_meta = validate_and_extract_metadata(sig_key, carved_bytes)
                            hashes = calculate_hashes(carved_bytes)

                            carved_counter += 1
                            artifact_id = f"carved_{carved_counter:04d}"
                            out_filename = f"{artifact_id}_{hashes['sha256'][:8]}.{ext}"
                            out_filepath = os.path.join(output_dir, out_filename)

                            with open(out_filepath, "wb") as out_f:
                                out_f.write(carved_bytes)

                            artifact_record = {
                                "artifact_id": artifact_id,
                                "filename": out_filename,
                                "extension": ext,
                                "mime_type": mime_type,
                                "carve_method": "SIGNATURE_STREAM",
                                "offset_start": abs_start_offset,
                                "offset_end": abs_end_offset,
                                "size_bytes": len(carved_bytes),
                                "hashes": hashes,
                                "is_valid_structure": is_valid,
                                "extracted_metadata": extracted_meta,
                                "recovered_path": os.path.abspath(out_filepath),
                                "is_carved_or_deleted": True,
                            }
                            carved_artifacts.append(artifact_record)

                            start_idx = end_pos
                        else:
                            start_idx = header_pos + len(header)

                if not chunk:
                    break

                stream_pos += len(chunk)
                if len(buffer_data) > self.overlap_size:
                    carryover_buffer = buffer_data[-self.overlap_size :]
                else:
                    carryover_buffer = buffer_data

        finally:
            if should_close:
                stream.close()

        return carved_artifacts
