from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from .. import models, schemas
from .auth import get_current_user

router = APIRouter(prefix="/agents", tags=["agents"])

@router.get("/decisions/{evidence_id}", response_model=List[schemas.AgentDecisionResponse])
def get_evidence_decisions(evidence_id: int, db: Session = Depends(get_db)):
    return db.query(models.AgentDecision).filter(models.AgentDecision.evidence_id == evidence_id).all()

@router.get("/case/{case_id}/decisions", response_model=List[schemas.AgentDecisionResponse])
def get_case_decisions(case_id: int, db: Session = Depends(get_db)):
    return db.query(models.AgentDecision).join(models.Evidence).filter(models.Evidence.case_id == case_id).all()

@router.put("/decisions/{decision_id}", response_model=schemas.AgentDecisionResponse)
def update_decision_status(
    decision_id: int,
    payload: schemas.AgentDecisionUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    decision = db.query(models.AgentDecision).filter(models.AgentDecision.id == decision_id).first()
    if not decision:
        raise HTTPException(status_code=404, detail="Decision not found")
        
    decision.status = payload.status
    
    # Audit log
    evidence = db.query(models.Evidence).filter(models.Evidence.id == decision.evidence_id).first()
    case_id = evidence.case_id if evidence else None
    
    audit = models.AuditLog(
        case_id=case_id,
        user=current_user.username,
        action="APPROVE" if payload.status == "approved" else "REJECT",
        details=f"Human-in-the-loop response to {decision.agent_name}: {payload.status.upper()}. Decision details: '{decision.decision}'"
    )
    db.add(audit)
    db.commit()
    db.refresh(decision)
    
    return decision
