import datetime
from typing import Optional, Dict, Any, Tuple
from fastapi import HTTPException
from sqlalchemy.orm import Session
from db_models import Complaint, CaseEvent, AuditLedgerEntry, Notification, Bureau
from crypto import compute_audit_hash

# Valid lifecycle state transitions for CaseConnect AI
# Received → Triage Pending → Assigned → Under Review → Action Required → Resolved → Closed
# Also supports authorized Reopening and Cross-Bureau Reviews
VALID_TRANSITIONS: Dict[str, list] = {
    "RECEIVED": ["TRIAGE_PENDING", "UNDER_REVIEW", "ASSIGNED", "ON_HOLD"],
    "TRIAGE_PENDING": ["UNDER_REVIEW", "ASSIGNED", "ON_HOLD"],
    "ASSIGNED": ["UNDER_REVIEW", "CROSS_BUREAU_REVIEW", "ON_HOLD", "ACTION_REQUIRED"],
    "UNDER_REVIEW": ["ACTION_REQUIRED", "CROSS_BUREAU_REVIEW", "SLA_AT_RISK", "RESOLVED", "CLOSED", "ON_HOLD"],
    "CROSS_BUREAU_REVIEW": ["UNDER_REVIEW", "ACTION_REQUIRED", "RESOLVED", "ON_HOLD"],
    "ACTION_REQUIRED": ["UNDER_REVIEW", "CROSS_BUREAU_REVIEW", "RESOLVED", "CLOSED"],
    "SLA_AT_RISK": ["UNDER_REVIEW", "ACTION_REQUIRED", "RESOLVED", "CLOSED"],
    "SLA_BREACHED": ["UNDER_REVIEW", "ACTION_REQUIRED", "RESOLVED", "CLOSED"],
    "ON_HOLD": ["UNDER_REVIEW", "ASSIGNED"],
    "RESOLVED": ["CLOSED", "REOPENED"],
    "CLOSED": ["REOPENED"],
    "REOPENED": ["UNDER_REVIEW", "ASSIGNED", "ACTION_REQUIRED"],
}

CONSEQUENTIAL_TRANSITIONS = {"ACTION_REQUIRED", "RESOLVED", "CLOSED", "REOPENED"}

def validate_state_transition(current_status: str, new_status: str, reason: Optional[str] = None) -> Tuple[bool, str]:
    """
    Validates if transition from current_status to new_status is allowed by the workflow rules.
    Also validates that consequential transitions include a written explanation.
    """
    if current_status == new_status:
        return True, "No status change."

    allowed = VALID_TRANSITIONS.get(current_status, [])
    if new_status not in allowed:
        return False, f"Invalid state transition: Cannot move complaint from '{current_status}' to '{new_status}'. Allowed target states: {', '.join(allowed)}."

    if new_status in CONSEQUENTIAL_TRANSITIONS:
        if not reason or not reason.strip():
            return False, f"Consequential state transition to '{new_status}' requires a mandatory written administrative reason."

    return True, "Transition valid."


def execute_transition(
    db: Session,
    complaint: Complaint,
    new_status: str,
    actor_name: str,
    actor_role: str = "OFFICER",
    reason: Optional[str] = None,
    detail: Optional[str] = None
) -> Complaint:
    """
    Executes a validated state transition inside the active database transaction:
    1. Updates complaint status and relevant timestamps
    2. Records an immutable CaseEvent in the case history
    3. Writes an AuditLedgerEntry into the SHA-256 cryptographic chain
    4. Emits in-app Notification for relevant parties
    """
    is_valid, msg = validate_state_transition(complaint.status, new_status, reason)
    if not is_valid:
        raise HTTPException(status_code=400, detail=msg)

    old_status = complaint.status
    complaint.status = new_status
    now = datetime.datetime.utcnow()
    complaint.updated_at = now

    if new_status in ["RESOLVED", "CLOSED"]:
        complaint.resolved_at = now
    elif new_status == "REOPENED":
        complaint.resolved_at = None

    # 1. Add CaseEvent record
    import uuid
    uid_suffix = uuid.uuid4().hex[:6]
    event_id = f"EVT-{complaint.id}-{int(now.timestamp() * 1000)}-{uid_suffix}"
    event_detail = detail or f"Status transition from {old_status} to {new_status}. Reason: {reason or 'Standard workflow action'}."
    case_event = CaseEvent(
        id=event_id,
        complaint_id=complaint.id,
        actor_name=actor_name,
        actor_role=actor_role,
        event_type="STATE_TRANSITION",
        previous_status=old_status,
        new_status=new_status,
        reason=reason,
        detail=event_detail,
        created_at=now
    )
    db.add(case_event)

    # 2. Append to cryptographic audit chain
    last_entry = db.query(AuditLedgerEntry).order_by(AuditLedgerEntry.created_at.desc(), AuditLedgerEntry.id.desc()).first()
    prev_hash = last_entry.current_hash if last_entry else "0000000000000000"
    event_type = "CASE_RESOLVED" if new_status in ["RESOLVED", "CLOSED"] else ("CASE_REOPENED" if new_status == "REOPENED" else "STATE_TRANSITION")
    ledger_count = db.query(AuditLedgerEntry).count() + 1
    ledger_id = f"#{1000 + ledger_count}"
    
    current_hash = compute_audit_hash(event_type, event_detail, prev_hash)
    audit_entry = AuditLedgerEntry(
        id=f"AUD-{int(now.timestamp() * 1000)}-{uid_suffix}",
        ledger_id=ledger_id,
        actor_name=actor_name,
        event_type=event_type,
        complaint_id=complaint.id,
        case_number=complaint.case_number,
        detail=event_detail,
        previous_hash=prev_hash,
        current_hash=current_hash,
        created_at=now
    )
    db.add(audit_entry)

    # 3. Notification for significant transitions
    if new_status in ["ACTION_REQUIRED", "RESOLVED", "CLOSED", "REOPENED"]:
        notif = Notification(
            id=f"NOTIF-{int(now.timestamp() * 1000)}-{uid_suffix}",
            recipient_id=complaint.assigned_officer_id,
            type=f"CASE_{new_status}",
            message=f"Case {complaint.case_number} moved to {new_status}. {event_detail}",
            complaint_id=complaint.id,
            case_number=complaint.case_number,
            created_at=now
        )
        db.add(notif)

    db.commit()
    db.refresh(complaint)
    return complaint


def execute_transfer(
    db: Session,
    complaint: Complaint,
    target_bureau_id: str,
    actor_name: str,
    reason: str,
    target_officer_id: Optional[str] = None,
    target_officer_name: Optional[str] = None
) -> Complaint:
    """
    Executes an authorized inter-bureau case transfer:
    Requires a written justification reason and records twin audit + event records.
    """
    if not reason or not reason.strip():
        raise HTTPException(status_code=400, detail="A mandatory justification reason is required for inter-bureau case transfers.")

    target_bureau = db.query(Bureau).filter(Bureau.id == target_bureau_id).first()
    if not target_bureau:
        raise HTTPException(status_code=404, detail=f"Target bureau '{target_bureau_id}' not found.")

    old_bureau_id = complaint.assigned_bureau_id
    old_bureau_name = complaint.assigned_bureau_name
    now = datetime.datetime.utcnow()

    complaint.assigned_bureau_id = target_bureau.id
    complaint.assigned_bureau_name = target_bureau.name
    if target_officer_id:
        complaint.assigned_officer_id = target_officer_id
        complaint.assigned_officer_name = target_officer_name or "Assigned Officer"
    
    complaint.status = "CROSS_BUREAU_REVIEW"
    complaint.updated_at = now

    import uuid
    uid_suffix = uuid.uuid4().hex[:6]
    event_detail = f"Inter-bureau transfer: {old_bureau_name} → {target_bureau.name}. Reason: '{reason}'."
    
    # Event
    case_event = CaseEvent(
        id=f"EVT-{complaint.id}-{int(now.timestamp() * 1000)}-{uid_suffix}",
        complaint_id=complaint.id,
        actor_name=actor_name,
        actor_role="OFFICER",
        event_type="BUREAU_TRANSFER",
        previous_status=complaint.status,
        new_status="CROSS_BUREAU_REVIEW",
        reason=reason,
        detail=event_detail,
        created_at=now
    )
    db.add(case_event)

    # Audit
    last_entry = db.query(AuditLedgerEntry).order_by(AuditLedgerEntry.created_at.desc(), AuditLedgerEntry.id.desc()).first()
    prev_hash = last_entry.current_hash if last_entry else "0000000000000000"
    ledger_count = db.query(AuditLedgerEntry).count() + 1
    ledger_id = f"#{1000 + ledger_count}"
    
    current_hash = compute_audit_hash("BUREAU_TRANSFER", event_detail, prev_hash)
    audit_entry = AuditLedgerEntry(
        id=f"AUD-{int(now.timestamp() * 1000)}-{uid_suffix}",
        ledger_id=ledger_id,
        actor_name=actor_name,
        event_type="BUREAU_TRANSFER",
        complaint_id=complaint.id,
        case_number=complaint.case_number,
        detail=event_detail,
        previous_hash=prev_hash,
        current_hash=current_hash,
        created_at=now
    )
    db.add(audit_entry)

    # Notification to target bureau
    notif = Notification(
        id=f"NOTIF-{int(now.timestamp() * 1000)}-{uid_suffix}",
        recipient_id=complaint.assigned_officer_id,
        type="CASE_TRANSFERRED",
        message=f"Case {complaint.case_number} transferred from {old_bureau_name} to {target_bureau.name}. Reason: '{reason}'",
        complaint_id=complaint.id,
        case_number=complaint.case_number,
        created_at=now
    )
    db.add(notif)

    db.commit()
    db.refresh(complaint)
    return complaint
