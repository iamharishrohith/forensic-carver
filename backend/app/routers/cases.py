from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List
import os
import shutil
import json
from fastapi.responses import StreamingResponse
from ..database import get_db
from .. import models, schemas
from ..services.parser import parse_file_metadata
from ..services.orchestrator import run_agentic_pipeline
from ..services.pdf_generator import generate_forensic_report
from .auth import get_current_user

router = APIRouter(prefix="/cases", tags=["cases"])

UPLOAD_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "uploads"))

@router.post("/", response_model=schemas.CaseResponse)
def create_case(
    case: schemas.CaseCreate, 
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    db_case = models.Case(name=case.name, description=case.description)
    db.add(db_case)
    db.commit()
    db.refresh(db_case)
    
    # Audit log
    audit = models.AuditLog(
        case_id=db_case.id,
        user=current_user.username,
        action="CREATE_CASE",
        details=f"Created case: {db_case.name}"
    )
    db.add(audit)
    db.commit()
    
    return db_case

@router.get("/", response_model=List[schemas.CaseResponse])
def list_cases(db: Session = Depends(get_db)):
    return db.query(models.Case).all()

@router.get("/{case_id}", response_model=schemas.CaseResponse)
def get_case(case_id: int, db: Session = Depends(get_db)):
    db_case = db.query(models.Case).filter(models.Case.id == case_id).first()
    if not db_case:
        raise HTTPException(status_code=404, detail="Case not found")
    return db_case

@router.post("/{case_id}/evidence", response_model=schemas.EvidenceResponse)
def upload_evidence(
    case_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    db_case = db.query(models.Case).filter(models.Case.id == case_id).first()
    if not db_case:
        raise HTTPException(status_code=404, detail="Case not found")
        
    # Ensure upload directory exists
    case_upload_dir = os.path.join(UPLOAD_DIR, str(case_id))
    os.makedirs(case_upload_dir, exist_ok=True)
    
    filepath = os.path.join(case_upload_dir, file.filename)
    
    # Save file
    with open(filepath, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    try:
        # Extract metadata
        parsed_data = parse_file_metadata(filepath, file.filename)
        
        # Check if hash already exists in this case
        existing = db.query(models.Evidence).filter(
            models.Evidence.case_id == case_id,
            models.Evidence.sha256 == parsed_data["sha256"]
        ).first()
        
        if existing:
            # File already uploaded
            # Clean up saved file to save space
            try:
                os.remove(filepath)
            except Exception:
                pass
            raise HTTPException(status_code=400, detail="Evidence with this file hash already exists in this case")

        # Save to database
        db_evidence = models.Evidence(
            case_id=case_id,
            filename=file.filename,
            filepath=filepath,
            file_type=parsed_data["file_type"],
            sha256=parsed_data["sha256"],
            size_bytes=parsed_data["size_bytes"],
            metadata_json=json.dumps(parsed_data["metadata"]),
            status="pending"
        )
        db.add(db_evidence)
        db.commit()
        db.refresh(db_evidence)
        
        # Write chain of custody log
        audit = models.AuditLog(
            case_id=case_id,
            user=current_user.username,
            action="UPLOAD",
            sha256_hash=db_evidence.sha256,
            details=f"Uploaded evidence file: {db_evidence.filename} (Type: {db_evidence.file_type}, Hash: {db_evidence.sha256})"
        )
        db.add(audit)
        db.commit()
        
        # Run AI orchestrator (sequential/mock pipeline)
        run_agentic_pipeline(db, db_evidence.id)
        db.refresh(db_evidence)
        
        return db_evidence
    except HTTPException:
        raise
    except Exception as e:
        # Rollback file if error
        if os.path.exists(filepath):
            try:
                os.remove(filepath)
            except Exception:
                pass
        raise HTTPException(status_code=500, detail=f"Failed to parse evidence: {str(e)}")

@router.get("/{case_id}/evidence", response_model=List[schemas.EvidenceResponse])
def get_case_evidence(case_id: int, db: Session = Depends(get_db)):
    return db.query(models.Evidence).filter(models.Evidence.case_id == case_id).all()

@router.get("/{case_id}/report")
def download_case_report(case_id: int, db: Session = Depends(get_db)):
    db_case = db.query(models.Case).filter(models.Case.id == case_id).first()
    if not db_case:
        raise HTTPException(status_code=404, detail="Case not found")
        
    # Write audit log
    audit = models.AuditLog(
        case_id=case_id,
        user="Investigator",
        action="EXPORT",
        details="Generated and downloaded court-ready PDF Forensic Report."
    )
    db.add(audit)
    db.commit()
    
    pdf_buffer = generate_forensic_report(db, case_id)
    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=ACPIA_Forensic_Report_Case_{case_id}.pdf"}
    )
