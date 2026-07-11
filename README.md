# ACPIA (Agentic Child Protection Investigation Assistant)

### AI-Powered Digital Evidence Intelligence Platform for Child Protection Investigations

---

ACPIA is a privacy-first, open-source investigation support platform designed to assist authorized child protection and law enforcement agencies in processing, analyzing, and correlating massive volumes of digital evidence. By implementing a tiered offline AI pipeline, ACPIA acts as a digital copilot to rapidly flag risks, map timeline chronologies, extract suspect/victim networks, and generate court-ready forensic reports.

## 🚀 Key Capabilities
- **Tiered Local AI Pipeline**: Runs a fast keyword/SVM triage classifier (<5ms) and escalates suspect files to deep Hugging Face NLP transformers for intent classification.
- **Relational Knowledge Graph**: Dynamically binds Phone, Email, Device, Location, and Person nodes. Integrates with Neo4j.
- **Leaflet Map Pathfinder**: Plots media geotag locations, tracks suspect coordinates chronologically, and calculates operational geofencing boundaries.
- **Forensic Rigor & Chain of Custody**: Computes SHA-256 signatures, logs dynamic investigator actions, and exports court-ready PDF dossiers.
- **100% Offline Ops**: Runs securely in air-gapped forensics laboratories.

---

## 🛠️ Technology Stack
- **Frontend**: Next.js (TypeScript, Tailwind CSS, Leaflet, Recharts)
- **Backend**: FastAPI (Python, SQLAlchemy)
- **Databases**: PostgreSQL / SQLite (Relational), Neo4j (Graph), Qdrant (Vector)

---

## 💻 Quick Start (Local Run)

### 1. Launch the Backend
```bash
cd backend
python -m venv .venv
# Activate virtual environment
.venv\Scripts\activate      # Windows
source .venv/bin/activate    # Linux/macOS
pip install -r requirements.txt
python run.py
```
*Serves API endpoints on `http://127.0.0.1:8000`.*

### 2. Launch the Frontend
```bash
cd frontend
npm install
npm run dev
```
*Launches Next.js Client on `http://localhost:3000`.*

---

## 🐳 Docker Deployment (Production Stack)
To run the full suite (PostgreSQL, Neo4j, Qdrant, backend, frontend) offline:
```bash
docker-compose up --build
```
