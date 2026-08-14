# 📑 ACPIA: Comprehensive Project Pitch & Product Guide

This document contains the exhaustive product details, architectural specifications, and strategic slides content for **ACPIA (Agentic Child Protection Investigation Assistant)**.

---

## 1. Executive Summary & Vision

### Vision Statement
> *"To eliminate digital evidence backlogs in child exploitation and safety investigations by deploying local, secure, and privacy-compliant AI intelligence inside air-gapped forensics labs."*

### Key Value Proposition
ACPIA operates as a **digital copilot** for cybercrime analysts. By leveraging a **tiered offline AI pipeline** and a **9-agent collaborative network**, it processes massive sets of chat logs, device exports, and location files locally. It flags grooming patterns, reconstructs suspect networks in Neo4j, and logs every step into an immutable audit trail to generate court-ready forensic reports.

---

## 2. The Critical Operational Gap

| Challenge | Current Forensic State | The ACPIA Paradigm |
| :--- | :--- | :--- |
| **Evidence Volatility** | Days spent manually parsing raw JSONs, CSVs, and folder structures. | Instant automated file parser with SHA-256 checks. |
| **Privacy Compliance** | Cannot use cloud-based APIs (OpenAI, Anthropic) due to victim confidentiality regulations. | Runs 100% offline using optimized local CPU models (DistilBERT/BERT). |
| **Siloed Investigations** | Suspect aliases across cases are rarely matched. | Agent 9 scans historical indexes for cross-case correlation. |
| **Legal Admissibility** | AI classifications are black-boxes and easily challenged in court. | Every link requires human approval (HITL) and generates signed audit logs. |

---

## 3. Core Architecture: Tiered Offline AI Pipeline

ACPIA does not require heavy GPU infrastructure. It uses a **cascading, resource-conscious pipeline** optimized for standard forensic workstations:

```
[Uploaded Evidence File]
        │
        ▼
┌──────────────────────────────────────────────┐
│  Tier 1: Fast Heuristics Classifier (<5ms)    │
│  - Bag-of-words / TF-IDF threat weights      │
│  - Instant keyword matching & scoring        │
└──────────────────────┬───────────────────────┘
                       │
             Triage Score >= 0.20?
              /          \
            YES           NO
            /               \
           ▼                 ▼
┌──────────────────────────┐ ┌──────────────────────────┐
│ Tier 2: Deep Context     │ │ Skip Transformer stage   │
│ - Local DistilBERT Model │ │ - Run high-speed regex   │
│ - Local BERT NER Model   │ │ - Extract standard nodes │
└──────────┬───────────────┘ └──────────┬───────────────┘
           │                            │
           └───────────┬────────────────┘
                       ▼
         [Agentic Collaboration Engine]
```

### Tier 1: Fast Triage Classifier (<5ms)
*   **Mechanism:** Bag-of-words scanner with weighted threat keywords (e.g., *"meet me"*, *"dont tell"*, *"secret"*).
*   **Purpose:** Filters out noise instantly, ensuring low-risk files bypass heavier model runtimes.

### Tier 2: Deep Context Transformers
*   **Inference Models:** Local CPU-optimized Hugging Face models:
    *   **Intent/Sentiment Analysis:** `distilbert-base-uncased-finetuned-sst-2` flags coercion, emotional manipulation, and grooming intent.
    *   **Named Entity Recognition (NER):** `dbmdz/bert-large-cased-finetuned-conll03-english` extracts `Person`, `Location`, and `Organization` entities.
*   **Fallback Heuristics:** Built-in regex pattern matchers automatically run if Hugging Face pipeline libraries are missing in air-gapped systems.

---

## 4. The 9-Agent Collaboration Engine

The orchestrator spawns a multi-agent system to divide and conquer evidence extraction:

1.  **Agent 1: Evidence Classification Agent**  
    Scans file headers and structures to classify payloads (e.g., Chat Records, Media Geotags, Documents, Audio).
2.  **Agent 2: Entity Extraction Agent**  
    Extracts core entities like `Phone`, `Email`, `Person`, `Location`, and `Device` from metadata and texts.
3.  **Agent 3: Relationship Miner Agent**  
    Determines connections between entities (e.g., `Phone` --(OWNS)--> `Account`, `Person` --(COMMUNICATES_WITH)--> `Person`).
4.  **Agent 4: Timeline Pathfinder Agent**  
    Reconstructs chronological events, extracting timestamps from file creation headers and conversation timestamps.
5.  **Agent 5: Geofence Guardian Agent**  
    Analyzes GPS geotags on maps, matching them against geofence boundaries to detect proximity violations.
6.  **Agent 6: OSINT Correlation Agent**  
    Simulates external expansions (e.g., Truecaller profile mapping, Telegram handle scans) to enrich network profiles.
7.  **Agent 8: Forensic Auditor Agent**  
    Logs all system events and human decisions into a relational SQLite/Postgres audit ledger with cryptographic validation.
8.  **Agent 9: Cross-Case Intelligence Matcher**  
    Scans other active or historical case databases for matching phone numbers, device IDs, or emails to detect systemic serial offenders.
9.  **Agent 7: Risk Assessor Agent**  
    Consolidates scores from all agents to compute the global severity rating of the evidence package.

---

## 5. Relational & Graph Data Layer

To maximize search and visualization speeds, ACPIA uses three database layers:

```
                  ┌──────────────────────────────┐
                  │    SQLite / PostgreSQL       │
                  │   (Relational database for   │
                  │     cases & audit logs)      │
                  └──────────────┬───────────────┘
                                 │
                     Synchronizes transactions
                                 │
                                 ▼
         ┌───────────────────────┴───────────────────────┐
         │              Neo4j Graph DB                   │
         │     (Plots entity-relationship graphs         │
         │      connecting suspects to devices)          │
         └───────────────────────────────────────────────┘
```

*   **SQLite/PostgreSQL:** Relational ledger for strict schema configuration, case management, and user permissions.
*   **Neo4j community-edition:** Graph database engine mapping complex actor-phone-device communication pathways.
*   **Qdrant:** Vector database storing text embeddings for rapid semantic matches across file attachments.

---

## 6. Chain of Custody & Court Admissibility

```
[Evidence Uploaded] ──► SHA-256 Hashed ──► Audit Log entry
      │
      ▼
[AI Pipeline Extracts Nodes & Edges]
      │
      ▼
[Human Investigator Review] ──► APPROVED/REJECTED ──► Audit Log updated
      │
      ▼
[Forensic Report Export] ──► Cryptographically locked court-ready PDF
```

*   **Audit Logging:** Every node/edge created by the AI starts as `pending_approval`. The investigator must review, approve, or reject it.
*   **Audit Records:** Actions generate a log entry: `Human-in-the-loop response to Agent X: APPROVED. Relational node added...`
*   **Court-Ready Exports:** Instantly generates a locked PDF document containing the case description, chronological map tracks, suspect-victim connections, and the full audit trail.
