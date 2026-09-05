import time
import os
from .config import CHUNK_SIZE, OVERLAP_SIZE
from .signature_carver import SignatureCarver
from .tsk_carver import TskCarver
from .json_exporter import make_manifest, write_json, write_ndjson


class CarvingManager:
    def __init__(self, prefer_filesystem=True, chunk_size=CHUNK_SIZE, overlap_size=OVERLAP_SIZE):
        self.prefer_filesystem = prefer_filesystem
        self.carver = SignatureCarver(chunk_size=chunk_size, overlap_size=overlap_size)

    def process_source(self, source_path, output_dir, case_id=None, json_output_filename="carving_manifest.json", export_ndjson=True):
        start_time = time.perf_counter()
        os.makedirs(output_dir, exist_ok=True)
        rec_dir = os.path.join(output_dir, "recovered_artifacts")
        os.makedirs(rec_dir, exist_ok=True)

        engine_used = "SIGNATURE_STREAM_SLIDING_WINDOW"
        artifacts = []

        if self.prefer_filesystem and TskCarver.is_available():
            tsk_results = TskCarver.carve_filesystem(source_path, rec_dir)
            if tsk_results:
                engine_used = "TSK_FILESYSTEM_AWARE"
                artifacts.extend(tsk_results)

        if not artifacts:
            sig_results = self.carver.carve(source_path, rec_dir, case_id=case_id)
            artifacts.extend(sig_results)

        elapsed = time.perf_counter() - start_time

        manifest = make_manifest(
            source_path=source_path,
            artifacts=artifacts,
            duration_sec=elapsed,
            active_engine=engine_used,
            case_id=case_id,
        )

        json_path = os.path.join(output_dir, json_output_filename)
        write_json(manifest, json_path)
        manifest["manifest_saved_to"] = os.path.abspath(json_path)

        if export_ndjson:
            nd_path = os.path.join(output_dir, "carving_manifest.ndjson")
            write_ndjson(artifacts, nd_path)
            manifest["ndjson_saved_to"] = os.path.abspath(nd_path)

        return manifest
