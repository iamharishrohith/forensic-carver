"""
Unified Carving Manager
Coordinates the dual-engine carving process (Filesystem Undelete + Signature Stream)
and exports standardized JSON dossiers.
"""

import time
import os
from typing import Dict, Any, Optional, List

from .signature_carver import SignatureCarver
from .tsk_carver import TskCarver
from .json_exporter import JsonManifestExporter


class CarvingManager:
    """Orchestrator for the forensic carving pipeline."""

    def __init__(
        self,
        prefer_filesystem: bool = True,
        chunk_size: int = 4 * 1024 * 1024,
        overlap_size: int = 64 * 1024,
    ):
        self.prefer_filesystem = prefer_filesystem
        self.signature_carver = SignatureCarver(chunk_size=chunk_size, overlap_size=overlap_size)

    def process_source(
        self,
        source_path: str,
        output_dir: str,
        case_id: Optional[str] = None,
        json_output_filename: str = "carving_manifest.json",
        export_ndjson: bool = True,
    ) -> Dict[str, Any]:
        """
        Executes carving across the provided evidence source, saves artifacts,
        and generates the JSON manifest.
        """
        start_time = time.perf_counter()
        os.makedirs(output_dir, exist_ok=True)
        carved_output_subfolder = os.path.join(output_dir, "recovered_artifacts")
        os.makedirs(carved_output_subfolder, exist_ok=True)

        active_engine = "SIGNATURE_STREAM_SLIDING_WINDOW"
        fallback_triggered = False
        all_artifacts: List[Dict[str, Any]] = []

        # Strategy 1: Attempt TSK Filesystem-Aware Recovery if requested and available
        if self.prefer_filesystem and TskCarver.is_available():
            tsk_results = TskCarver.carve_filesystem(source_path, carved_output_subfolder)
            if tsk_results:
                active_engine = "TSK_FILESYSTEM_AWARE"
                all_artifacts.extend(tsk_results)

        # Strategy 2: Execute Signature-based Stream Carver for unallocated/raw streams
        # If TSK found nothing or wasn't applicable, fallback to signature carver
        if not all_artifacts:
            if self.prefer_filesystem and TskCarver.is_available():
                fallback_triggered = True
            
            sig_results = self.signature_carver.carve_file_stream(
                source_path,
                carved_output_subfolder,
                case_id=case_id,
            )
            all_artifacts.extend(sig_results)

        scan_duration = time.perf_counter() - start_time

        # Generate JSON Manifest
        manifest_dict = JsonManifestExporter.generate_manifest_dict(
            source_path=source_path,
            carved_artifacts=all_artifacts,
            scan_duration_seconds=scan_duration,
            active_engine=active_engine,
            fallback_triggered=fallback_triggered,
            case_id=case_id,
        )

        # Save JSON manifest to disk
        json_path = os.path.join(output_dir, json_output_filename)
        JsonManifestExporter.save_json_manifest(manifest_dict, json_path)
        manifest_dict["manifest_saved_to"] = os.path.abspath(json_path)

        # Save optional NDJSON
        if export_ndjson:
            ndjson_path = os.path.join(output_dir, "carving_manifest.ndjson")
            JsonManifestExporter.save_ndjson_manifest(all_artifacts, ndjson_path)
            manifest_dict["ndjson_saved_to"] = os.path.abspath(ndjson_path)

        return manifest_dict
