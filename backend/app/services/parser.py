import hashlib
import os
import json
from datetime import datetime
from PIL import Image
from PIL.ExifTags import TAGS, GPSTAGS

def calculate_sha256(filepath: str) -> str:
    sha256_hash = hashlib.sha256()
    with open(filepath, "rb") as f:
        for byte_block in iter(lambda: f.read(4096), b""):
            sha256_hash.update(byte_block)
    return sha256_hash.hexdigest()

def get_geotagging(exif):
    if not exif:
        return None
    geotagging = {}
    for deckey, value in exif.items():
        key = TAGS.get(deckey, deckey)
        if key == "GPSInfo":
            for gpskey, gpsval in value.items():
                sub_key = GPSTAGS.get(gpskey, gpskey)
                geotagging[sub_key] = gpsval
    return geotagging if geotagging else None

def get_decimal_coordinates(geotags):
    if not geotags:
        return None

    def convert_to_degrees(value):
        # Value is usually tuple or list of PIL Fraction or float
        d = float(value[0])
        m = float(value[1])
        s = float(value[2])
        return d + (m / 60.0) + (s / 3600.0)

    try:
        lat = convert_to_degrees(geotags.get("GPSLatitude"))
        lat_ref = geotags.get("GPSLatitudeRef")
        lon = convert_to_degrees(geotags.get("GPSLongitude"))
        lon_ref = geotags.get("GPSLongitudeRef")

        if lat_ref != "N":
            lat = -lat
        if lon_ref != "E":
            lon = -lon

        return f"{lat:.6f},{lon:.6f}"
    except Exception:
        return None

def parse_file_metadata(filepath: str, filename: str) -> dict:
    file_size = os.path.getsize(filepath)
    ext = os.path.splitext(filename)[1].lower()
    
    sha256 = calculate_sha256(filepath)
    
    # Classify file type
    file_type = "Unknown"
    if ext in [".jpg", ".jpeg", ".png", ".gif", ".webp"]:
        file_type = "Image"
    elif ext in [".mp4", ".mov", ".avi", ".mkv"]:
        file_type = "Video"
    elif ext in [".txt", ".json", ".csv", ".tsv"]:
        # We can check if it's a conversation export
        if "chat" in filename.lower() or "whatsapp" in filename.lower() or "msg" in filename.lower() or "message" in filename.lower():
            file_type = "Conversation"
        else:
            file_type = "Document"
    elif ext in [".pdf", ".docx", ".xlsx", ".pptx"]:
        file_type = "Document"
    elif ext in [".mp3", ".wav", ".m4a", ".ogg"]:
        file_type = "Audio"

    metadata = {
        "filename": filename,
        "size_bytes": file_size,
        "extension": ext,
        "sha256": sha256,
        "parsed_at": datetime.now().isoformat(),
        "creation_time": datetime.fromtimestamp(os.path.getctime(filepath)).isoformat(),
        "modification_time": datetime.fromtimestamp(os.path.getmtime(filepath)).isoformat()
    }

    # Extract EXIF if Image
    if file_type == "Image":
        try:
            with Image.open(filepath) as img:
                metadata["width"] = img.width
                metadata["height"] = img.height
                
                exif_data = img._getexif()
                if exif_data:
                    clean_exif = {}
                    for tag_id, value in exif_data.items():
                        tag_name = TAGS.get(tag_id, tag_id)
                        # Filter out bytes as they don't serialize easily to JSON
                        if isinstance(value, bytes):
                            continue
                        # Standardize tuple values
                        if isinstance(value, tuple):
                            value = list(value)
                        clean_exif[str(tag_name)] = str(value)
                    
                    metadata["exif"] = clean_exif
                    
                    # Geolocation
                    geotags = get_geotagging(exif_data)
                    if geotags:
                        gps_coords = get_decimal_coordinates(geotags)
                        if gps_coords:
                            metadata["gps_coordinates"] = gps_coords
                            
                    # Camera details
                    metadata["camera_make"] = clean_exif.get("Make", "Unknown")
                    metadata["camera_model"] = clean_exif.get("Model", "Unknown")
                    metadata["capture_date"] = clean_exif.get("DateTimeOriginal", clean_exif.get("DateTime", None))
        except Exception as e:
            metadata["exif_error"] = str(e)
            
    # Read text contents if txt/json/csv
    elif file_type in ["Document", "Conversation"] and ext in [".txt", ".json", ".csv"]:
        try:
            with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
                content = f.read(4000)  # Read first 4KB
                metadata["text_preview"] = content
        except Exception as e:
            metadata["text_error"] = str(e)

    return {
        "file_type": file_type,
        "sha256": sha256,
        "size_bytes": file_size,
        "metadata": metadata
    }
