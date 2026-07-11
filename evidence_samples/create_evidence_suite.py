import os
import json
from PIL import Image
from PIL.ExifTags import TAGS

# Ensure output directory exists
SAMPLE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "evidence_samples"))
os.makedirs(SAMPLE_DIR, exist_ok=True)

# 1. Create chat_whatsapp.txt
chat_content = """[2026-07-08 14:10:05] Kamal: Hey Anitha, did you enjoy the ice cream yesterday?
[2026-07-08 14:11:22] Anitha: Yes, thank you so much! It was great.
[2026-07-08 14:12:00] Kamal: I want to show you a new game I bought. We can meet tomorrow at 4 PM.
[2026-07-08 14:12:45] Kamal: Let's meet at the park near Chennai National School. It's quiet there.
[2026-07-08 14:13:10] Kamal: Make sure you don't tell your parents or anyone else. Keep this private, our secret game.
[2026-07-08 14:13:50] Kamal: Delete this message immediately after reading.
[2026-07-08 14:14:15] Anitha: Okay, I will delete it. See you there tomorrow.
"""
with open(os.path.join(SAMPLE_DIR, "chat_whatsapp.txt"), "w", encoding="utf-8") as f:
    f.write(chat_content)
print("Created: chat_whatsapp.txt")

# 2. Create contacts.csv
contacts_content = """Name,Phone,Email,Group,LastContacted
Kamal Kumar,+91 98765 43210,suspect_alpha@shadow.com,Suspicious,2026-07-08
Anitha Nair,+91 94444 55555,anitha@schoolmail.com,Victim,2026-07-08
Anil Kumar,+1 555-0199,target_john@webmail.xyz,Suspicious,2026-07-05
"""
with open(os.path.join(SAMPLE_DIR, "contacts.csv"), "w", encoding="utf-8") as f:
    f.write(contacts_content)
print("Created: contacts.csv")

# 3. Create gps_history.json
gps_content = [
    {
        "timestamp": "2026-07-08T16:00:00Z",
        "device_id": "DEV-9921",
        "latitude": 13.0827,
        "longitude": 80.2707,
        "accuracy_m": 8.5,
        "source": "Cell Tower Triangulation"
    },
    {
        "timestamp": "2026-07-08T16:30:00Z",
        "device_id": "DEV-9921",
        "latitude": 13.0830,
        "longitude": 80.2712,
        "accuracy_m": 5.0,
        "source": "GPS Device Ping"
    }
]
with open(os.path.join(SAMPLE_DIR, "gps_history.json"), "w", encoding="utf-8") as f:
    json.dump(gps_content, f, indent=2)
print("Created: gps_history.json")


# 4. Create capture_gps.jpg with real EXIF tags
# We generate a small solid image and attach PIL EXIF data blocks
try:
    img = Image.new("RGB", (200, 200), color=(139, 92, 246)) # ACPIA purple background image
    
    # Chennai: Lat 13.0827, Lon 80.2707
    exif = img.getexif()
    
    # Tag IDs for EXIF metadata
    # Make: 271, Model: 272, DateTime: 306
    exif[271] = "Apple"
    exif[272] = "iPhone 13 Pro"
    exif[306] = "2026:07:08 16:30:00"
    
    # Let's save standard fields and write GPS coordinates directly
    # GPSLatitudeRef: N, GPSLatitude: (13.0, 4.0, 57.72)
    # GPSLongitudeRef: E, GPSLongitude: (80.0, 16.0, 14.52)
    gps_info = {
        1: "N",
        2: (13.0, 4.0, 57.72),
        3: "E",
        4: (80.0, 16.0, 14.52)
    }
    exif[34853] = gps_info

    # Save image with exif
    img.save(os.path.join(SAMPLE_DIR, "capture_gps.jpg"), exif=exif)
    print("Created: capture_gps.jpg (with active EXIF GPS tags)")
except Exception as e:
    print(f"Failed to generate JPG with EXIF: {e}")
    # Fallback to normal save
    img.save(os.path.join(SAMPLE_DIR, "capture_gps.jpg"))
