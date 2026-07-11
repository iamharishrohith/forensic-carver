# Investigation Scenario 3: Cross-Case Intelligence and Known Offender Matching

This scenario guides the investigator through using ACPIA's cross-case scanning capabilities to identify serial offenders and linked investigations.

---

## 1. Case Objective
An investigator begins working on a new child safety case (Case ID 2). They upload a contact log showing messages from phone `+91 98765 43210`. The objective is to verify if this phone number matches historical suspects or active targets in other central police/child safety agency cases.

---

## 2. Walkthrough Steps

### Step 1: Upload Contact Evidence
1. Navigate to the **Evidence Explorer** page.
2. Upload the contact list file: `evidence_samples/contacts.csv`.
3. The parser extracts the text rows and registers the phone `+91 98765 43210` and email `suspect_alpha@shadow.com`.

### Step 2: Cross-Case Database Scan (Agent 9)
- **Agent 9: Cross-Case Intelligence Agent** queries the centralized database indexes.
- It scans for matching phone numbers, emails, and device MAC keys.
- **Match Detected**:
  - The phone number `+91 98765 43210` is flagged as an active suspect device in Case `SC-2026-092` (Operation Safe Haven).
  - The email `suspect_alpha@shadow.com` is flagged as linked to a historical case `SP-2025-412`.

### Step 3: Alarm Warnings
- In **AI Insights**, Agent 9 writes the warning:
  - *“Alert: Phone +91 98765 43210 matches an active case file (ID: SC-2026-092) | Email suspect_alpha@shadow.com linked to previous case (ID: SP-2025-412).”*
- The risk scoring algorithm elevates the case priority immediately to **Critical**, irrespective of the file contents, due to the positive known offender match.

### Step 4: Investigator Cross-Reference
- In the **Knowledge Graph** visualization:
  - Click on the phone node `+91 98765 43210`.
  - The metadata panel displays the cross-case links, allowing the investigator to coordinate with the officer in charge of case `SC-2026-092`.
  - This eliminates stovepiped communications between different districts or squads, allowing them to coordinate their efforts on the same suspect.

---

## 3. Benefits for Agency Databases
- Automates serial offender detection at the point of file upload.
- Avoids manual, time-consuming searches across excel sheets or folders.
- Maintains strict privacy by only matching keys (phone/email/hash) rather than sharing full evidence payloads between unauthorized departments.
