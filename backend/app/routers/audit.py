from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from .. import models, schemas

router = APIRouter(prefix="/audit", tags=["audit"])

@router.get("/{case_id}", response_model=List[schemas.AuditLogResponse])
def get_case_audit_logs(case_id: int, db: Session = Depends(get_db)):
    return db.query(models.AuditLog).filter(models.AuditLog.case_id == case_id).order_by(models.AuditLog.timestamp.desc()).all()
