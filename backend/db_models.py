import datetime
from sqlalchemy import (
    Column, String, Integer, Float, Boolean, Text, DateTime, ForeignKey, Index
)
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()

class User(Base):
    __tablename__ = "users"

    id = Column(String(50), primary_key=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    name = Column(String(100), nullable=False)
    role = Column(String(30), nullable=False)  # OFFICER, COORDINATOR, SUPERVISOR, ADMINISTRATOR
    bureau_id = Column(String(50), ForeignKey("bureaus.id"), nullable=True)
    bureau_name = Column(String(100), nullable=True)
    email = Column(String(100), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    bureau = relationship("Bureau", back_populates="users")


class Bureau(Base):
    __tablename__ = "bureaus"

    id = Column(String(50), primary_key=True)
    name = Column(String(100), nullable=False, unique=True)
    code = Column(String(20), nullable=True)
    description = Column(Text, nullable=True)
    active = Column(Boolean, default=True)

    users = relationship("User", back_populates="bureau")
    complaints = relationship("Complaint", back_populates="assigned_bureau")


class Institution(Base):
    __tablename__ = "institutions"

    id = Column(String(50), primary_key=True)
    code = Column(String(50), unique=True, index=True, nullable=False)
    name = Column(String(200), nullable=False, index=True)
    state = Column(String(100), nullable=False, index=True)
    type = Column(String(100), nullable=False)
    risk_score = Column(Integer, default=50)
    synthetic = Column(Boolean, default=True)

    complaints = relationship("Complaint", back_populates="institution")


class Complaint(Base):
    __tablename__ = "complaints"

    id = Column(String(50), primary_key=True)
    case_number = Column(String(50), unique=True, index=True, nullable=False)
    institution_id = Column(String(50), ForeignKey("institutions.id"), nullable=False, index=True)
    institution_name = Column(String(200), nullable=False)
    title = Column(String(300), nullable=False, index=True)
    description = Column(Text, nullable=False)
    category = Column(String(100), nullable=False, index=True)
    priority = Column(String(20), nullable=False, index=True)  # CRITICAL, HIGH, MEDIUM, LOW
    status = Column(String(30), nullable=False, index=True)    # RECEIVED, TRIAGE_PENDING, UNDER_REVIEW, CROSS_BUREAU_REVIEW, ACTION_REQUIRED, SLA_AT_RISK, SLA_BREACHED, RESOLVED, CLOSED, ON_HOLD, REOPENED
    assigned_bureau_id = Column(String(50), ForeignKey("bureaus.id"), nullable=False, index=True)
    assigned_bureau_name = Column(String(100), nullable=False)
    assigned_officer_id = Column(String(50), ForeignKey("users.id"), nullable=True, index=True)
    assigned_officer_name = Column(String(100), nullable=True)
    complainant_name = Column(String(100), nullable=True)
    complainant_role = Column(String(50), nullable=True)
    is_anonymous = Column(Boolean, default=False)
    filed_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False, index=True)
    response_due_at = Column(DateTime, nullable=False, index=True)
    resolution_due_at = Column(DateTime, nullable=False, index=True)
    resolved_at = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    synthetic = Column(Boolean, default=True)

    institution = relationship("Institution", back_populates="complaints")
    assigned_bureau = relationship("Bureau", back_populates="complaints")
    events = relationship("CaseEvent", back_populates="complaint", cascade="all, delete-orphan")
    evidence_files = relationship("Evidence", back_populates="complaint", cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_complaints_bureau_status", "assigned_bureau_id", "status"),
        Index("ix_complaints_priority_status", "priority", "status"),
    )


class CaseEvent(Base):
    __tablename__ = "case_events"

    id = Column(String(50), primary_key=True)
    complaint_id = Column(String(50), ForeignKey("complaints.id"), nullable=False, index=True)
    actor_name = Column(String(100), nullable=False)
    actor_role = Column(String(50), nullable=True)
    event_type = Column(String(50), nullable=False, index=True)
    previous_status = Column(String(30), nullable=True)
    new_status = Column(String(30), nullable=True)
    reason = Column(Text, nullable=True)
    detail = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False, index=True)

    complaint = relationship("Complaint", back_populates="events")


class CaseRelationship(Base):
    __tablename__ = "case_relationships"

    id = Column(String(50), primary_key=True)
    source_id = Column(String(50), ForeignKey("complaints.id"), nullable=False, index=True)
    target_id = Column(String(50), ForeignKey("complaints.id"), nullable=False, index=True)
    source_case_number = Column(String(50), nullable=False)
    target_case_number = Column(String(50), nullable=False)
    match_type = Column(String(30), nullable=False)  # EXACT_IDENTIFIER, STRONG_CANDIDATE, POSSIBLE_RELATION, BELOW_THRESHOLD
    similarity_score = Column(Float, nullable=False)
    algorithm_version = Column(String(30), default="v1.4-tfidf-hybrid")
    explanation = Column(Text, nullable=False)
    matching_signals = Column(Text, nullable=True)   # JSON string or comma-separated
    conflicting_signals = Column(Text, nullable=True)
    review_status = Column(String(20), default="PENDING", index=True)  # PENDING, CONFIRMED, DISMISSED, FLAGGED
    reviewed_by = Column(String(100), nullable=True)
    review_reason = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)


class Evidence(Base):
    __tablename__ = "evidence"

    id = Column(String(50), primary_key=True)
    complaint_id = Column(String(50), ForeignKey("complaints.id"), nullable=False, index=True)
    filename = Column(String(255), nullable=False)
    storage_key = Column(String(255), unique=True, nullable=False)
    content_type = Column(String(100), nullable=False)
    file_size_bytes = Column(Integer, nullable=False)
    sha256_checksum = Column(String(64), nullable=False)
    extracted_text = Column(Text, nullable=True)
    uploaded_by = Column(String(100), nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)

    complaint = relationship("Complaint", back_populates="evidence_files")


class SlaRule(Base):
    __tablename__ = "sla_rules"

    id = Column(String(50), primary_key=True)
    priority = Column(String(20), nullable=False, index=True)
    category = Column(String(100), default="Any")
    response_target_days = Column(Integer, nullable=False)
    resolution_target_days = Column(Integer, nullable=False)
    escalation_days = Column(Integer, nullable=False)
    time_policy = Column(String(20), default="Business")  # Business, Calendar
    active = Column(Boolean, default=True)
    version = Column(String(20), default="v2.1")


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(String(50), primary_key=True)
    recipient_id = Column(String(50), nullable=True, index=True)
    type = Column(String(50), nullable=False)
    message = Column(Text, nullable=False)
    complaint_id = Column(String(50), nullable=True)
    case_number = Column(String(50), nullable=True)
    read_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False, index=True)


class AuditLedgerEntry(Base):
    __tablename__ = "audit_ledger"

    id = Column(String(50), primary_key=True)
    ledger_id = Column(String(20), unique=True, index=True, nullable=False)
    actor_name = Column(String(100), nullable=False)
    event_type = Column(String(50), nullable=False, index=True)
    complaint_id = Column(String(50), nullable=True, index=True)
    case_number = Column(String(50), nullable=True)
    detail = Column(Text, nullable=False)
    previous_hash = Column(String(64), nullable=False)
    current_hash = Column(String(64), nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False, index=True)
    tampered = Column(Boolean, default=False)


class DataSource(Base):
    __tablename__ = "data_sources"

    id = Column(String(50), primary_key=True)
    name = Column(String(150), nullable=False)
    endpoint = Column(String(255), nullable=False)
    last_fetched = Column(DateTime, default=datetime.datetime.utcnow)
    status = Column(String(30), default="PARSED")  # PARSED, FETCH_FAILED
    record_count = Column(Integer, default=0)
