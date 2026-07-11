# Investigation Scenario 2: Geospatial Mapping and EXIF Coordinate Extraction

This scenario guides the investigator through analyzing image metadata files to reconstruct real-world locations, active coordinates, and physical meetup risks.

---

## 1. Case Objective
An investigator extracts an image file from a victim's smartphone. The target is to extract the date, time, and coordinates of the photo capture to trace whether the suspect met the victim at a specific location, or if the photo was captured near sensitive zones (e.g. parks, schools).

---

## 2. Walkthrough Steps

### Step 1: Upload Image
1. Navigate to the **Evidence Explorer** page.
2. Click **Upload Evidence File** and select `evidence_samples/capture_gps.jpg`.
3. ACPIA's backend parser parses the JPEG file headers and calculates its SHA-256 hash.

### Step 2: EXIF Parameter Extraction (Metadata Parser)
- The backend parser extracts the embedded camera metadata tags:
  - **Camera Make/Model**: `Apple iPhone 13 Pro`
  - **Capture Date**: `2026-07-08 16:30:00`
  - **GPS Latitude/Longitude**: `13.0827, 80.2707` (Chennai coordinates)
- These values are stored in the database's `metadata_json` field, securing it for the chain-of-custody log.

### Step 3: Sequence Mapping (Agent 4)
- **Agent 4: Timeline Reconstruction Agent** registers a new event on the vertical sequence board:
  - **Time**: `16:30:00`
  - **Event Type**: `Location / Media`
  - **Description**: *“Photo capture event: Camera model iPhone 13 Pro was active. Geotagged at coordinates (13.0827, 80.2707).”*

### Step 4: Map View Verification
1. Navigate to the **Map View** tab in the sidebar.
2. In the coordinate list on the left, click on the newly registered GPS item.
3. The **Tactical Coordinate Plotter** on the right centers on the target coordinate marker:
   - Displays latitude `13.082700` and longitude `80.270700`.
   - Links the coordinate directly to the source image file `capture_gps.jpg`.
   - Projects a target radar ring matching cell-tower or GPS accuracy boundaries (~5m).

### Step 5: Safeguarding Assessment
- The Risk Center flags the GPS coordinate presence. Having physical coordinates confirms suspect-victim real-world meetups, boosting the priority level of the file to **High** to ensure the investigator reviews it first.

---

## 3. Forensic Admissibility
Every metadata read is logged under **Audit Logs** including the file checksum. If the suspect claims they were never in Chennai, the immutable EXIF parameters and hash matches in the ACPIA ledger serve as evidence for court-ready reports.
