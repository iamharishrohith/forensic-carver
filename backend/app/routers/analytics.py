from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from ..database import get_db
from .. import models, schemas

router = APIRouter(prefix="/analytics", tags=["analytics"])

@router.get("/{case_id}", response_model=schemas.DashboardStatsResponse)
def get_case_analytics(case_id: int, db: Session = Depends(get_db)):
    # Total cases
    total_cases = db.query(models.Case).count()
    
    # Total evidence in case
    total_evidence = db.query(models.Evidence).filter(models.Evidence.case_id == case_id).count()
    
    # Get all decisions for this case
    decisions = db.query(models.AgentDecision).join(models.Evidence).filter(models.Evidence.case_id == case_id).all()
    
    # Flagged risk levels: we inspect decisions from "Agent 7: Risk Assessment Agent"
    high_risk_alerts = 0
    pending_decisions = 0
    urgency_counts = {"Critical": 0, "High": 0, "Medium": 0, "Low": 0}
    
    for d in decisions:
        if d.status == "pending_approval":
            pending_decisions += 1
            
        if "Agent 7: Risk Assessment Agent" in d.agent_name:
            if "Critical" in d.decision:
                high_risk_alerts += 1
                urgency_counts["Critical"] += 1
            elif "High" in d.decision:
                high_risk_alerts += 1
                urgency_counts["High"] += 1
            elif "Medium" in d.decision:
                urgency_counts["Medium"] += 1
            else:
                urgency_counts["Low"] += 1
                
    # Evidence types count
    ev_types = db.query(
        models.Evidence.file_type, 
        func.count(models.Evidence.id)
    ).filter(models.Evidence.case_id == case_id).group_by(models.Evidence.file_type).all()
    
    types_list = [schemas.EvidenceTypeCount(type=t[0], count=t[1]) for t in ev_types]
    # Ensure standard types exist in list if count is 0
    known_types = ["Image", "Video", "Conversation", "Document", "Audio", "Unknown"]
    present_types = [t.type for t in types_list]
    for kt in known_types:
        if kt not in present_types:
            types_list.append(schemas.EvidenceTypeCount(type=kt, count=0))
            
    # Urgency distribution list
    urgency_list = [
        schemas.UrgencyCount(level=k, count=v) for k, v in urgency_counts.items()
    ]
    
    # Simulated Agent Statuses
    agents = [
        "Classification Agent", "Entity Extraction Agent", "Relationship Intelligence Agent",
        "Timeline Reconstruction Agent", "Vision Intelligence Agent", "Conversation Intelligence Agent",
        "Risk Assessment Agent", "Evidence Prioritization Agent", "Cross-Case Intelligence Agent",
        "Investigation Copilot Agent", "Explainability Agent", "Report Generation Agent"
    ]
    
    agent_status_list = []
    # If there is pending evidence, set some agents as active, otherwise idle
    has_pending = db.query(models.Evidence).filter(
        models.Evidence.case_id == case_id, 
        models.Evidence.status == "processing"
    ).first() is not None
    
    for i, a in enumerate(agents):
        status = "idle"
        progress = 0
        if has_pending:
            if i % 3 == 0:
                status = "active"
                progress = 45
            elif i % 3 == 1:
                status = "completed"
                progress = 100
        else:
            status = "idle"
            progress = 0
            
        agent_status_list.append(
            schemas.AgentStatus(agent_name=f"Agent {i+1}: {a}", status=status, progress=progress)
        )
        
    return schemas.DashboardStatsResponse(
        total_cases=total_cases,
        total_evidence=total_evidence,
        high_risk_alerts=high_risk_alerts,
        pending_agent_decisions=pending_decisions,
        evidence_types=types_list,
        urgency_distribution=urgency_list,
        agent_activities=agent_status_list
    )
