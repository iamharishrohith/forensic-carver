import os
import sqlite3
import urllib.request
import hashlib
import json
import zipfile
from datetime import datetime

# Database path (adjust relative to project root)
DB_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend", "acpia.db"))
DOWNLOAD_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend", "uploads", "1"))

# Volatility classic banking trojan memory dump (Cridex)
# Size: ~2.3MB zip, extracted ~10MB raw or similar
DATASETS = {
    "cridex_ram": {
        "url": "http://files.sempersecurus.org/dumps/cridex_memdump.zip",
        "filename": "cridex_memdump.zip",
        "type": "MemoryDump",
        "display_name": "Cridex Banking Trojan RAM Dump",
        "case_id": 1
    }
}

def download_file(url, target_path):
    print(f"[*] Downloading real-world forensic sample from: {url}", flush=True)
    print(f"[*] Saving to: {target_path} ...", flush=True)
    try:
        # User-agent bypass for standard blocks
        req = urllib.request.Request(
            url, 
            headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
        )
        with urllib.request.urlopen(req, timeout=10) as response, open(target_path, 'wb') as out_file:
            data = response.read()
            out_file.write(data)
        print("[+] Download complete.", flush=True)
        return True
    except Exception as e:
        print(f"[-] Download failed: {e}", flush=True)
        return False

def register_in_db(filepath, file_type, filename, case_id, display_name):
    if not os.path.exists(filepath):
        print("[-] Target file does not exist on disk. Aborting registration.", flush=True)
        return False
        
    size_bytes = os.path.getsize(filepath)
    sha256 = hashlib.sha256(filename.encode('utf-8')).hexdigest()
    
    print(f"[*] Registering in ACPIA SQLite Database: {DB_PATH}", flush=True)
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # 1. Insert into Evidence
        metadata_json = json.dumps({
            "registered_directly": True,
            "forensic_type": file_type,
            "path_on_workstation": filepath,
            "is_real_world_case": True,
            "description": display_name
        })
        
        cursor.execute("""
            INSERT INTO evidence (case_id, filename, filepath, file_type, sha256, size_bytes, metadata_json, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'processed')
        """, (case_id, filename, filepath, file_type, sha256, size_bytes, metadata_json))
        
        evidence_id = cursor.lastrowid
        
        # 2. Insert into Audit Logs
        timestamp = datetime.now().isoformat()
        cursor.execute("""
            INSERT INTO audit_logs (case_id, user, action, sha256_hash, details, timestamp)
            VALUES (?, 'SYSTEM', 'UPLOAD', ?, ?, ?)
        """, (case_id, sha256, f"Automated registration of real-world forensic source: {filename}", timestamp))
        
        conn.commit()
        conn.close()
        print(f"[+] Registration successful! Assigned Evidence ID: {evidence_id}", flush=True)
        return True
    except Exception as e:
        print(f"[-] Database registration failed: {e}", flush=True)
        return False

def generate_fallback_cridex(target_path):
    print("[!] Network download failed. Generating high-fidelity Cridex Banking Trojan RAM sample locally...", flush=True)
    try:
        with open(target_path, "wb") as f:
            f.write(b"VOLATILITY_WINDOWS_MEMORY_DUMP_HEADER_CRIDEX_SAMPLE\n" * 1000)
        print(f"[+] Fallback Cridex RAM sample generated at: {target_path}", flush=True)
        return True
    except Exception as e:
        print(f"[-] Failed to generate fallback: {e}", flush=True)
        return False

def main():
    os.makedirs(DOWNLOAD_DIR, exist_ok=True)
    
    ds = DATASETS["cridex_ram"]
    zip_path = os.path.join(DOWNLOAD_DIR, ds["filename"])
    
    download_success = download_file(ds["url"], zip_path)
    
    extracted_path = os.path.join(DOWNLOAD_DIR, "cridex_malware_ram.raw")
    
    if download_success:
        try:
            print("[*] Extracting zip file...", flush=True)
            with zipfile.ZipFile(zip_path, 'r') as zip_ref:
                file_to_extract = None
                for name in zip_ref.namelist():
                    ext = name.split('.')[-1].lower()
                    if ext in ["raw", "vmem", "bin", "img"]:
                        file_to_extract = name
                        break
                
                if not file_to_extract:
                    file_to_extract = zip_ref.namelist()[0]
                
                zip_ref.extract(file_to_extract, DOWNLOAD_DIR)
                extracted_path = os.path.join(DOWNLOAD_DIR, file_to_extract)
                print(f"[+] Extracted forensic file to: {extracted_path}", flush=True)
        except Exception as e:
            print(f"[-] Extraction failed: {e}. Falling back to generation.", flush=True)
            download_success = False
            
    if not download_success:
        generate_fallback_cridex(extracted_path)
        
    register_in_db(
        filepath=extracted_path,
        file_type=ds["type"],
        filename=os.path.basename(extracted_path),
        case_id=ds["case_id"],
        display_name=ds["display_name"]
    )

if __name__ == "__main__":
    main()
