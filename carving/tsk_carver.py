import os
from .validator import get_hashes, inspect_artifact

try:
    import pytsk3
    HAS_PYTSK3 = True
except ImportError:
    HAS_PYTSK3 = False


class TskCarver:
    """Optional filesystem-aware carver using pytsk3 when available."""

    @classmethod
    def is_available(cls):
        return HAS_PYTSK3

    @classmethod
    def carve_filesystem(cls, image_path: str, output_dir: str):
        if not HAS_PYTSK3:
            return []

        os.makedirs(output_dir, exist_ok=True)
        carved = []

        try:
            img = pytsk3.Img_Info(image_path)
        except Exception:
            return []

        try:
            volume = pytsk3.Volume_Info(img)
            partitions = [p for p in volume if p.flags == pytsk3.TSK_VS_PART_FLAG_ALLOC]
        except Exception:
            partitions = [None]

        count = 0
        for part in partitions:
            offset = part.start * 512 if part else 0
            try:
                fs = pytsk3.FS_Info(img, offset=offset)
            except Exception:
                continue

            def scan_dir(directory, cur_path=""):
                nonlocal count
                for entry in directory:
                    if not hasattr(entry, "info") or not entry.info.name:
                        continue
                    name = entry.info.name.name.decode("utf-8", errors="ignore")
                    if name in [".", ".."]:
                        continue

                    is_unalloc = entry.info.meta and (entry.info.meta.flags & pytsk3.TSK_FS_META_FLAG_UNALLOC)
                    if is_unalloc and entry.info.meta.type == pytsk3.TSK_FS_META_TYPE_REG:
                        size = entry.info.meta.size
                        if 0 < size < 100 * 1024 * 1024:
                            try:
                                data = entry.read_random(0, size)
                                hashes = get_hashes(data)
                                ext = name.split(".")[-1].lower() if "." in name else "bin"

                                count += 1
                                art_id = f"tsk_recovered_{count:04d}"
                                filename = f"{art_id}_{name}"
                                out_path = os.path.join(output_dir, filename)

                                with open(out_path, "wb") as f:
                                    f.write(data)

                                valid, meta = inspect_artifact(ext, data)
                                meta["original_filename"] = name
                                if entry.info.meta.mtime:
                                    meta["mtime_epoch"] = entry.info.meta.mtime

                                carved.append({
                                    "artifact_id": art_id,
                                    "filename": filename,
                                    "original_name": name,
                                    "extension": ext,
                                    "mime_type": f"application/{ext}",
                                    "carve_method": "TSK_FS_UNDELETE",
                                    "offset_start": offset,
                                    "offset_end": offset + size,
                                    "size_bytes": size,
                                    "hashes": hashes,
                                    "is_valid_structure": valid,
                                    "extracted_metadata": meta,
                                    "recovered_path": os.path.abspath(out_path),
                                    "is_carved_or_deleted": True,
                                })
                            except Exception:
                                pass

                    if entry.info.meta and entry.info.meta.type == pytsk3.TSK_FS_META_TYPE_DIR:
                        try:
                            scan_dir(entry.as_directory(), os.path.join(cur_path, name))
                        except Exception:
                            pass

            try:
                root = fs.open_dir(path="/")
                scan_dir(root)
            except Exception:
                pass

        return carved
