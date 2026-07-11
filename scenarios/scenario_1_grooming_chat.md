# Investigation Scenario 1: Online Grooming and Coercive Vocabulary Detection

This scenario guides the investigator through analyzing suspicious messaging exports to detect grooming patterns, secrecy indicators, and immediate safety threats.

---

## 1. Case Objective
An investigator receives a mobile extraction containing chat backups between a minor ("Anitha") and an unknown adult contact ("Kamal"). The objective is to identify if the chat logs exhibit grooming patterns (secrecy, meetup demands, gift offerings, requests to delete messages) and highlight active leads.

---

## 2. Walkthrough Steps

### Step 1: Upload Evidence
1. Navigate to the **Evidence Explorer** page in ACPIA.
2. Click the **Upload Evidence** button.
3. Select `evidence_samples/chat_whatsapp.txt` from your local machine.
4. ACPIA will generate the SHA-256 hash `ecdf4819...` to secure the chain of custody.

### Step 2: Automatic Classification (Agent 1)
- **Agent 1: Classification Agent** runs immediately, analyzing file headers.
- It will automatically categorize the file under **Communication Records (Chat Log)** based on structure tags and timestamps.

### Step 3: Entity Extraction (Agent 2 & 3)
- **Agent 2** scans the text and pulls out critical entity tags:
  - **Names**: `Kamal Kumar` (Suspect), `Anitha Nair` (Victim).
  - **Phone Keys**: `+91 98765 43210`.
  - **Email Keys**: `suspect_alpha@shadow.com`.
- **Agent 3** maps the relations:
  - `Kamal Kumar` --(OWNS)--> Phone `+91 98765 43210`
  - `Kamal Kumar` --(COMMUNICATED_WITH)--> `Anitha Nair`

### Step 4: Grooming Threat Alarm (Agent 6 & 7)
- **Agent 6: Conversation Intelligence Agent** scans the vocabulary structure. It identifies high-risk coercive strings:
  - *"meet me"* (scheduling physical meetups)
  - *"don't tell"* / *"our secret"* (enforcing secrecy)
  - *"private"* (isolation request)
  - *"delete this"* (covering tracks)
- **Agent 7: Risk Assessment Agent** calculates the case risk:
  - **Urgency Level**: `Critical`
  - **Confidence**: `89%`
  - **Reason**: *“Critical risk: High-level grooming and isolation vocabulary detected in conversations.”*

### Step 5: Copilot Actions (Agent 10)
- **Agent 10: Investigation Copilot** suggests tactical leads:
  1. Coordinate immediately with Child Protective Units for physical safety verification.
  2. Request ISP logs for registration keys of phone `+91 98765 43210`.
  3. Draft witness/suspect summons.

---

## 3. Expected Results in Dashboard
- The **Dashboard** alert count increases by 1 for **High Risk Alerts**.
- The Case Urgency chart updates to show a **Critical** sector.
- The **AI Insights** page populates with the 12 agent decisions waiting for manual review. The investigator can click **Approve** to commit Kamal Kumar and Anitha Nair to the formal Investigation Knowledge Graph.
