from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List, Dict, Any

# Case Schemas
class CaseBase(BaseModel):
    name: str
    description: Optional[str] = None

class CaseCreate(CaseBase):
    pass

class CaseResponse(CaseBase):
    id: int
    created_at: datetime
    status: str

    class Config:
        from_attributes = True

# Evidence Schemas
class EvidenceBase(BaseModel):
    filename: str
    filepath: str
    file_type: str
    sha256: str
    size_bytes: int
    metadata_json: Optional[str] = None
    status: str

class EvidenceResponse(EvidenceBase):
    id: int
    case_id: int

    class Config:
        from_attributes = True

# Agent Decision Schemas
class AgentDecisionBase(BaseModel):
    agent_name: str
    decision: str
    confidence: float
    reasoning: Optional[str] = None
    status: str

class AgentDecisionResponse(AgentDecisionBase):
    id: int
    evidence_id: int

    class Config:
        from_attributes = True

class AgentDecisionUpdate(BaseModel):
    status: str  # approved, rejected

# Timeline Event Schemas
class TimelineEventBase(BaseModel):
    timestamp: datetime
    event_type: str
    description: str
    source: str
    location_gps: Optional[str] = None

class TimelineEventResponse(TimelineEventBase):
    id: int
    case_id: int
    evidence_id: Optional[int] = None

    class Config:
        from_attributes = True

# Entity Node Schemas
class EntityNodeBase(BaseModel):
    name: str
    type: str
    properties_json: Optional[str] = None
    status: str = "approved"

class EntityNodeCreate(EntityNodeBase):
    pass

class EntityNodeResponse(EntityNodeBase):
    id: int
    case_id: int

    class Config:
        from_attributes = True

# Entity Edge Schemas
class EntityEdgeBase(BaseModel):
    source_id: int
    target_id: int
    type: str
    properties_json: Optional[str] = None
    status: str = "approved"

class EntityEdgeCreate(EntityEdgeBase):
    pass

class EntityEdgeResponse(EntityEdgeBase):
    id: int
    case_id: int

    class Config:
        from_attributes = True

# Audit Log Schemas
class AuditLogResponse(BaseModel):
    id: int
    case_id: Optional[int] = None
    user: str
    action: str
    timestamp: datetime
    sha256_hash: Optional[str] = None
    details: Optional[str] = None

    class Config:
        from_attributes = True

# Dashboard Stats Schemas
class EvidenceTypeCount(BaseModel):
    type: str
    count: int

class UrgencyCount(BaseModel):
    level: str
    count: int

class AgentStatus(BaseModel):
    agent_name: str
    status: str  # active, completed, idle
    progress: int  # percentage

class DashboardStatsResponse(BaseModel):
    total_cases: int
    total_evidence: int
    high_risk_alerts: int
    pending_agent_decisions: int
    evidence_types: List[EvidenceTypeCount]
    urgency_distribution: List[UrgencyCount]
    agent_activities: List[AgentStatus]
