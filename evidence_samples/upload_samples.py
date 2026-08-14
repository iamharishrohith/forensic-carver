import os
import requests

API_URL = "http://localhost:8000/api/v1/cases/1/evidence"
SAMPLE_DIR = os.path.dirname(os.path.abspath(__file__))

files_to_upload = [
    "chat_whatsapp.txt",
    "contacts.csv",
    "gps_history.json",
    "capture_gps.jpg"
]

print("Uploading evidence files to local ACPIA API...")

for filename in files_to_upload:
    filepath = os.path.join(SAMPLE_DIR, filename)
    if not os.path.exists(filepath):
        print(f"File not found: {filename}")
        continue
        
    print(f"Uploading {filename}...")
    try:
        with open(filepath, "rb") as f:
            files = {"file": (filename, f)}
            response = requests.post(API_URL, files=files)
            
        if response.status_code == 200:
            print(f"Successfully uploaded {filename}!")
            print(response.json())
        else:
            print(f"Failed to upload {filename}: {response.status_code}")
            print(response.text)
    except Exception as e:
        print(f"Error uploading {filename}: {e}")
