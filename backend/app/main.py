from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
import json
from .config import settings
from .database import engine, Base, SessionLocal
from .routers import cases, agents, timeline, graph, search, audit, analytics, osint, auth, forensics
from . import models

# Create SQLite tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# Mount uploads static directory
UPLOAD_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "uploads"))
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# Set CORS origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For local development, allow all
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(cases.router, prefix=settings.API_V1_STR)
app.include_router(agents.router, prefix=settings.API_V1_STR)
app.include_router(timeline.router, prefix=settings.API_V1_STR)
app.include_router(graph.router, prefix=settings.API_V1_STR)
app.include_router(search.router, prefix=settings.API_V1_STR)
app.include_router(audit.router, prefix=settings.API_V1_STR)
app.include_router(analytics.router, prefix=settings.API_V1_STR)
app.include_router(osint.router, prefix=settings.API_V1_STR)
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(forensics.router, prefix=settings.API_V1_STR)

@app.on_event("startup")
def startup_event():
    db = SessionLocal()
    try:
        # Seed case
        case_count = db.query(models.Case).count()
        if case_count == 0:
            default_case = models.Case(
                name="Operation Safe Haven",
                description="Simulated investigation tracking digital forensics leads on target grooming rings and child safety threats."
            )
            db.add(default_case)
            db.commit()
            db.refresh(default_case)
            
            audit = models.AuditLog(
                case_id=default_case.id,
                user="System",
                action="CREATE_CASE",
                details="Seeded default investigation case 'Operation Safe Haven' on platform initialization."
            )
            db.add(audit)
            db.commit()
            
        # Seed investigator user
        user_count = db.query(models.User).count()
        if user_count == 0:
            from .routers.auth import get_password_hash
            default_user = models.User(
                username="investigator",
                hashed_password=get_password_hash("investigatorpassword"),
                role="investigator"
            )
            db.add(default_user)
            db.commit()

        # Seed forensic sources if they don't exist
        target_case_id = 1
        forensic_count = db.query(models.Evidence).filter(
            models.Evidence.case_id == target_case_id,
            models.Evidence.file_type.in_(["DiskImage", "MemoryDump"])
        ).count()
        
        if forensic_count == 0:
            # Ensure case folder exists
            case_uploads_dir = os.path.join(UPLOAD_DIR, str(target_case_id))
            os.makedirs(case_uploads_dir, exist_ok=True)
            
            # 1. Seed Disk Image
            disk_filename = "suspect_android_dump.dd"
            disk_filepath = os.path.join(case_uploads_dir, disk_filename)
            with open(disk_filepath, "w") as f:
                f.write("ACPIA simulated android filesystem disk block copy")
                
            db_disk = models.Evidence(
                case_id=target_case_id,
                filename=disk_filename,
                filepath=disk_filepath,
                file_type="DiskImage",
                sha256="7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c0d9e8f7a6b",
                size_bytes=10485760,
                metadata_json=json.dumps({
                    "registered_directly": False,
                    "forensic_type": "DiskImage",
                    "device_brand": "Samsung",
                    "device_model": "SM-G998B",
                    "filesystem": "ext4"
                }),
                status="processed"
            )
            db.add(db_disk)
            
            # 2. Seed Memory Dump
            mem_filename = "system_memory.bin"
            mem_filepath = os.path.join(case_uploads_dir, mem_filename)
            with open(mem_filepath, "w") as f:
                f.write("ACPIA simulated volatile system RAM crash dump")
                
            db_mem = models.Evidence(
                case_id=target_case_id,
                filename=mem_filename,
                filepath=mem_filepath,
                file_type="MemoryDump",
                sha256="9a01b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1",
                size_bytes=4194304,
                metadata_json=json.dumps({
                    "registered_directly": False,
                    "forensic_type": "MemoryDump",
                    "os_profile": "Win10x64_19041",
                    "total_processes": 10,
                    "suspicious_processes": 1
                }),
                status="processed"
            )
            db.add(db_mem)
            
            db.commit()
            
            # Audit log
            audit = models.AuditLog(
                case_id=target_case_id,
                user="System",
                action="UPLOAD",
                details="Seeded default forensic workspace sources (suspect_android_dump.dd and system_memory.bin)."
            )
            db.add(audit)
            db.commit()

    finally:
        db.close()

@app.get("/")
def root():
    return {
        "status": "online",
        "service": "ACPIA Digital Evidence Intelligence Platform",
        "version": "1.0.0"
    }
