"""
The Sleuth Kit (pytsk3) Filesystem-Aware Carver
Recovers deleted files with original names, metadata, and timestamps when partition tables exist.
Provides graceful fallback when pytsk3 is not installed or when filesystem structures are absent.
"""

import os
import hashlib
from typing import List, Dict, Any, Optional

try:
    import pytsk3
    HAS_PYTSK3 = True
except ImportError:
    HAS_PYTSK3 = False

from .validator import calculate_hashes, validate_and_extract_metadata


class TskCarver:
    """Filesystem-aware undelete carver using The Sleuth Kit bindings."""

    @classmethod
    def is_available(cls) -> bool:
        return HAS_PYTSK3

    @classmethod
    def carve_filesystem(cls, image_path: str, output_dir: str) -> List[Dict[str, Any]]:
        """
        Attempts to mount disk image partitions via pytsk3 and recover deleted files.
        Returns list of recovered artifacts.
        """
        if not HAS_PYTSK3:
            return []

        os.makedirs(output_dir, exist_ok=True)
        carved_artifacts: List[Dict[str, Any]] = []

        try:
            img_info = pytsk3.Img_Info(image_path)
        except Exception:
            # Cannot open as disk image
            return []

        # Try volume / partition table inspection
        try:
            volume = pytsk3.Volume_Info(img_info)
            partitions = [p for p in volume if p.flags == pytsk3.TSK_VS_PART_FLAG_ALLOC]
        except Exception:
            # Single partition image without partition table
            partitions = [None]

        counter = 0
        for part in partitions:
            offset = part.start * 512 if part else 0
            try:
                fs_info = pytsk3.FS_Info(img_info, offset=offset)
            except Exception:
                continue

            # Walk directory looking for unallocated/deleted entries
            def walk_dir(directory, current_path=""):
                nonlocal counter
                for entry in directory:
                    # Skip . and ..
                    if not hasattr(entry, "info") or not entry.info.name:
                        continue
                    name = entry.info.name.name.decode("utf-8", errors="ignore")
                    if name in [".", ".."]:
                        continue

                    # Check if marked as unallocated/deleted
                    is_deleted = entry.info.meta and (entry.info.meta.flags & pytsk3.TSK_FS_META_FLAG_UNALLOC)

                    if is_deleted and entry.info.meta.type == pytsk3.TSK_FS_META_TYPE_REG:
                        size = entry.info.meta.size
                        if 0 < size < 100 * 1024 * 1024:  # Max 100MB per file
                            try:
                                file_data = entry.read_random(0, size)
                                hashes = calculate_hashes(file_data)
                                ext = name.split(".")[-1].lower() if "." in name else "bin"
                                
                                counter += 1
                                artifact_id = f"tsk_recovered_{counter:04d}"
                                out_filename = f"{artifact_id}_{name}"
                                out_filepath = os.path.join(output_dir, out_filename)

                                with open(out_filepath, "wb") as out_f:
                                    out_f.write(file_data)

                                is_valid, meta = validate_and_extract_metadata(ext, file_data)
                                meta["original_filename"] = name
                                if entry.info.meta.mtime:
                                    meta["original_mtime_epoch"] = entry.info.meta.mtime

                                carved_artifacts.append({
                                    "artifact_id": artifact_id,
                                    "filename": out_filename,
                                    "original_name": name,
                                    "extension": ext,
                                    "mime_type": f"application/{ext}",
                                    "carve_method": "TSK_FS_UNDELETE",
                                    "offset_start": offset,
                                    "offset_end": offset + size,
                                    "size_bytes": size,
                                    "hashes": hashes,
                                    "is_valid_structure": is_valid,
                                    "extracted_metadata": meta,
                                    "recovered_path": os.path.abspath(out_filepath),
                                    "is_carved_or_deleted": True,
                                })
                            except Exception:
                                pass

                    # Recurse into subdirectories
                    if entry.info.meta and entry.info.meta.type == pytsk3.TSK_FS_META_TYPE_DIR:
                        try:
                            sub_dir = entry.as_directory()
                            walk_dir(sub_dir, os.path.join(current_path, name))
                        except Exception:
                            pass

            try:
                root_dir = fs_info.open_dir(path="/")
                walk_dir(root_dir)
            except Exception:
                pass

        return carved_artifacts
