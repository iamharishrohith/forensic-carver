import requests
import json
import os

# HeyGen API configuration
# To use this, get an API key from HeyGen Dashboard: https://app.heygen.com
API_KEY = os.getenv("HEYGEN_API_KEY", "YOUR_HEYGEN_API_KEY_HERE")
API_URL = "https://api.heygen.com/v2/video/generate"

# Professional 2-Minute Script for ACPIA
PITCH_SCRIPT = """
Every day, child protection investigators are drowning in a tsunami of digital evidence. 
A single case can involve terabytes of chat logs, device dumps, and geotagged files. 
The result? Severe backlogs while children remain at risk. 

But standard cloud-based AI tools are a legal and ethical dead end due to victim confidentiality regulations. 
That is why we built ACPIA—the Agentic Child Protection Investigation Assistant. 
ACPIA is an offline-first, air-gapped AI copilot designed to run directly inside secure forensic labs.

When evidence is loaded, a fast Tier 1 triage classifier scans text in under 5 milliseconds. 
If coercion is flagged, it escalates to Tier 2 CPU-bound NLP models to identify grooming patterns and extract key actors. 
A team of nine autonomous agents then maps relationships in Neo4j, plots geolocated movement timelines, 
and matches phone numbers and device IDs against active historical cases.

Crucially, ACPIA is built for the courtroom. Every AI suggestion requires human investigator approval, 
maintaining an immutable audit ledger protected by SHA-256 signatures. 

ACPIA turns days of manual evidence tracking into seconds of automated intelligence—protecting victims, 
empowering investigators, and keeping communities safe.
"""

def generate_avatar_video():
    if API_KEY == "YOUR_HEYGEN_API_KEY_HERE" or not API_KEY:
        print("[-] WARNING: Please set the HEYGEN_API_KEY environment variable or replace the placeholder in the script.")
        print("[*] Generating the JSON payload structure that you can import or curl directly:")
        
    headers = {
        "X-Api-Key": API_KEY,
        "Content-Type": "application/json"
    }

    # HeyGen API v2 payload structure
    # Using 'josh_lite_20230714' (Professional male avatar) and 'en-US-Andrew' (Professional newsroom voice)
    payload = {
        "video_setting": {
            "aspect_ratio": "16:9",
            "background": "#0b0f19" # Slate dark blue background matching ACPIA theme
        },
        "dimension": {
            "width": 1920,
            "height": 1080
        },
        "character": {
            "type": "avatar",
            "avatar_id": "josh_lite_20230714",
            "avatar_style": "normal"
        },
        "voice": {
            "type": "text",
            "input_text": PITCH_SCRIPT,
            "voice_id": "2d5661bb17c24f688847f9e8a7154077" # High-quality Professional Andrew voice
        }
    }

    print(json.dumps(payload, indent=2))
    
    if API_KEY and API_KEY != "YOUR_HEYGEN_API_KEY_HERE":
        print("[+] Submitting video generation task to HeyGen...")
        response = requests.post(API_URL, headers=headers, json=payload)
        
        if response.status_code == 200:
            result = response.json()
            video_id = result.get("data", {}).get("video_id")
            print(f"[+] Success! Video Generation Started. Video ID: {video_id}")
            print(f"[+] Check status using: curl -H 'X-Api-Key: {API_KEY}' https://api.heygen.com/v1/video_status?video_id={video_id}")
        else:
            print(f"[-] Failed to generate video: {response.status_code}")
            print(response.text)

if __name__ == "__main__":
    generate_avatar_video()
