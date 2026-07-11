from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, Float
from sqlalchemy.sql import func
from .database import Base

class Case(Base):
    __tablename__ = "cases"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    status = Column(String, default="active")  # active, archived, closed

class Evidence(Base):
    __tablename__ = "evidence"

    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(Integer, ForeignKey("cases.id", ondelete="CASCADE"), nullable=False)
    filename = Column(String, nullable=False)
    filepath = Column(String, nullable=False)
    file_type = Column(String, nullable=False)  # Image, Video, Document, Conversation, Audio, Unknown
    sha256 = Column(String, nullable=False, index=True)
    size_bytes = Column(Integer, nullable=False)
    metadata_json = Column(Text, nullable=True)  # Store parsed metadata as JSON string
    status = Column(String, default="pending")  # pending, processing, processed, failed

class AgentDecision(Base):
    __tablename__ = "agent_decisions"

    id = Column(Integer, primary_key=True, index=True)
    evidence_id = Column(Integer, ForeignKey("evidence.id", ondelete="CASCADE"), nullable=False)
    agent_name = Column(String, nullable=False)
    decision = Column(Text, nullable=False)
    confidence = Column(Float, nullable=False)
    reasoning = Column(Text, nullable=True)
    status = Column(String, default="pending_approval")  # pending_approval, approved, rejected

class TimelineEvent(Base):
    __tablename__ = "timeline_events"

    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(Integer, ForeignKey("cases.id", ondelete="CASCADE"), nullable=False)
    evidence_id = Column(Integer, ForeignKey("evidence.id", ondelete="SET NULL"), nullable=True)
    timestamp = Column(DateTime(timezone=True), nullable=False)
    event_type = Column(String, nullable=False)  # Chat, Call, Location, DeviceBoot, FileCreated, Financial
    description = Column(Text, nullable=False)
    source = Column(String, nullable=False)  # Filename/device source
    location_gps = Column(String, nullable=True)  # Latitude,Longitude format

class EntityNode(Base):
    __tablename__ = "entity_nodes"

    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(Integer, ForeignKey("cases.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)
    type = Column(String, nullable=False)  # Person, Device, Account, Location, Phone, Email, CryptoWallet, BankAccount
    properties_json = Column(Text, nullable=True)  # Extra properties as JSON
    status = Column(String, default="approved")  # approved, pending_approval, rejected

class EntityEdge(Base):
    __tablename__ = "entity_edges"

    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(Integer, ForeignKey("cases.id", ondelete="CASCADE"), nullable=False)
    source_id = Column(Integer, ForeignKey("entity_nodes.id", ondelete="CASCADE"), nullable=False)
    target_id = Column(Integer, ForeignKey("entity_nodes.id", ondelete="CASCADE"), nullable=False)
    type = Column(String, nullable=False)  # COMMUNICATED_WITH, OWNS, LOCATED_AT, ASSOCIATED_WITH, TRANSFERRED_FUNDS
    properties_json = Column(Text, nullable=True)
    status = Column(String, default="approved")  # approved, pending_approval, rejected

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(Integer, ForeignKey("cases.id", ondelete="CASCADE"), nullable=True)
    user = Column(String, nullable=False)
    action = Column(String, nullable=False)  # UPLOAD, AI_DECISION, EXPORT, APPROVE, REJECT, VIEW
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    sha256_hash = Column(String, nullable=True)  # For file integrity matching
    details = Column(Text, nullable=True)

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, default="investigator")  # admin, investigator, supervisor
    is_active = Column(Integer, default=1)  # 1 = active, 0 = inactive
