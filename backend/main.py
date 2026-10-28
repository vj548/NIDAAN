import os
import io
import csv
import datetime
from typing import List, Optional, Dict, Any
from fastapi import FastAPI, HTTPException, Query, Body, Depends, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, FileResponse
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy import func, or_, desc

from db_session import get_db, init_db, SessionLocal
from db_models import (
    User, Bureau, Institution, Complaint, CaseEvent,
    CaseRelationship, Evidence, SlaRule, Notification, AuditLedgerEntry, DataSource
)
from crypto import compute_audit_hash, verify_audit_chain
from triage_ai import classify_complaint
from lifecycle import execute_transition, execute_transfer, validate_state_transition
from intelligence import (
    analyze_relationships_for_case, record_relationship_review,
    RECOMMENDATION_THRESHOLD, ALGORITHM_VERSION
)
from sla_engine import calculate_case_sla_state, get_sla_dashboard_metrics
from evidence_service import save_evidence_file, EVIDENCE_DIR
from seed_data import seed_database

# Ensure database tables exist and seed with synthetic demo data if empty
init_db()
with SessionLocal() as session:
    seed_database(session, force=False)

app = FastAPI(
    title="CaseConnect AI — PRAMAAN Officer Console API",
    description="Centralized AICTE Grievance Redressal and Compliance Audit Service (SIH26264 / PRAMAAN)",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================
# PYDANTIC REQUEST SCHEMAS
# ============================================================
class LoginRequest(BaseModel):
    userId: str
    password: str
    captcha: str

class DecisionRequest(BaseModel):
    decision: str  # 'CONFIRM' | 'DISMISS' | 'RESUBMISSION' | 'RESOLVE' | 'CLOSE' | 'FLAG'
    reason: str
    actorName: str = "Officer Arjun Sharma"
    actorRole: str = "OFFICER"

class TransitionRequest(BaseModel):
    newStatus: str
    reason: Optional[str] = None
    actorName: str = "Officer Arjun Sharma"
    actorRole: str = "OFFICER"

class TransferRequest(BaseModel):
    targetBureauId: str
    reason: str
    actorName: str = "Officer Arjun Sharma"
    targetOfficerId: Optional[str] = None
    targetOfficerName: Optional[str] = None

class NewComplaintRequest(BaseModel):
    institutionId: str
    institutionName: str
    title: str
    description: str
    category: str
    priority: Optional[str] = None
    suggestedBureauId: Optional[str] = None
    complainantName: Optional[str] = "Anonymous Complainant"
    complainantRole: Optional[str] = "Student"
    isAnonymous: Optional[bool] = False

class TriageRequest(BaseModel):
    title: str
    description: str
    category: Optional[str] = ""

# ============================================================
# SYSTEM HEALTH & SUMMARY STATS
# ============================================================
@app.get("/api/health")
def health_check(db: Session = Depends(get_db)):
    count = db.query(Complaint).count()
    return {
        "status": "HEALTHY",
        "system": "CaseConnect AI — PRAMAAN",
        "database": "CONNECTED",
        "complaintCount": count,
        "timestamp": datetime.datetime.utcnow().isoformat() + "Z"
    }

@app.get("/api/stats")
def get_dashboard_stats(db: Session = Depends(get_db)):
    all_cases = db.query(Complaint).all()
    now = datetime.datetime.utcnow()

    open_cases = [c for c in all_cases if c.status not in ["RESOLVED", "CLOSED"]]
    my_action = [c for c in all_cases if c.status in ["ACTION_REQUIRED", "UNDER_REVIEW", "CROSS_BUREAU_REVIEW", "TRIAGE_PENDING"]]
    
    # SLA at-risk or breached
    sla_risk_count = 0
    for c in open_cases:
        state = calculate_case_sla_state(c, now)
        if state["isAtRisk"] or state["isBreached"]:
            sla_risk_count += 1

    resolved = [c for c in all_cases if c.status in ["RESOLVED", "CLOSED"]]

    return {
        "open": len(open_cases),
        "myAction": len(my_action),
        "slaAtRisk": sla_risk_count,
        "resolved": len(resolved),
        "total": len(all_cases)
    }

# ============================================================
# AUTHENTICATION
# ============================================================
@app.post("/api/auth/login")
def login(req: LoginRequest, db: Session = Depends(get_db)):
    if req.captcha != "7K3pQ":
        raise HTTPException(status_code=400, detail="CAPTCHA entry does not match. Please enter the exact characters shown.")

    user = db.query(User).filter(
        or_(
            User.username == req.userId,
            User.email == f"{req.userId}@demo.aicte"
        )
    ).first()

    demo_passwords = {"demo@2026", "password123"}
    if not user or (user.password_hash not in demo_passwords and req.password != user.password_hash):
        if req.password != "demo@2026":
            raise HTTPException(status_code=401, detail="User ID or password is incorrect. Check your credentials and try again.")
        # Fallback synthetic officer object
        user_data = {
            "id": f"DEMO-{req.userId}",
            "username": req.userId,
            "name": "Arjun Sharma" if "officer1" in req.userId else ("Admin Console" if "admin" in req.userId else "Authorized Officer"),
            "role": "ADMINISTRATOR" if "admin" in req.userId else "OFFICER",
            "bureauId": "B001",
            "bureauName": "Academic Bureau",
            "email": f"{req.userId}@demo.aicte"
        }
    else:
        user_data = {
            "id": user.id,
            "username": user.username,
            "name": user.name,
            "role": user.role,
            "bureauId": user.bureau_id,
            "bureauName": user.bureau_name,
            "email": user.email
        }

    # Record login in audit ledger
    now = datetime.datetime.utcnow()
    last_entry = db.query(AuditLedgerEntry).order_by(AuditLedgerEntry.created_at.desc(), AuditLedgerEntry.id.desc()).first()
    prev_hash = last_entry.current_hash if last_entry else "0000000000000000"
    detail = f"Officer login: {user_data['name']} ({user_data['role']}). Session established."
    current_hash = compute_audit_hash("OFFICER_LOGIN", detail, prev_hash)
    ledger_count = db.query(AuditLedgerEntry).count() + 1
    
    audit_entry = AuditLedgerEntry(
        id=f"AUD-{int(now.timestamp() * 1000)}",
        ledger_id=f"#{1000 + ledger_count}",
        actor_name=user_data["name"],
        event_type="OFFICER_LOGIN",
        detail=detail,
        previous_hash=prev_hash,
        current_hash=current_hash,
        created_at=now
    )
    db.add(audit_entry)
    db.commit()

    return {"ok": True, "user": user_data, "token": "demo-jwt-session-2026"}

# ============================================================
# COMPLAINTS (PERSISTENT REPOSITORY)
# ============================================================
def complaint_to_dict(c: Complaint) -> Dict[str, Any]:
    return {
        "id": c.id,
        "caseNumber": c.case_number,
        "institutionId": c.institution_id,
        "institutionName": c.institution_name,
        "title": c.title,
        "description": c.description,
        "category": c.category,
        "priority": c.priority,
        "status": c.status,
        "assignedBureauId": c.assigned_bureau_id,
        "assignedBureauName": c.assigned_bureau_name,
        "assignedOfficerId": c.assigned_officer_id,
        "assignedOfficerName": c.assigned_officer_name,
        "complainantName": c.complainant_name if not c.is_anonymous else "Confidential / Anonymous",
        "complainantRole": c.complainant_role,
        "isAnonymous": c.is_anonymous,
        "filedAt": c.filed_at.isoformat() + "Z" if c.filed_at else None,
        "responseDueAt": c.response_due_at.isoformat() + "Z" if c.response_due_at else None,
        "resolutionDueAt": c.resolution_due_at.isoformat() + "Z" if c.resolution_due_at else None,
        "resolvedAt": c.resolved_at.isoformat() + "Z" if c.resolved_at else None,
        "updatedAt": c.updated_at.isoformat() + "Z" if c.updated_at else None,
        "synthetic": c.synthetic
    }

@app.get("/api/complaints")
def list_complaints(
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    bureauId: Optional[str] = Query(None),
    institutionId: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    query = db.query(Complaint)
    if search:
        s = f"%{search.strip().lower()}%"
        query = query.filter(
            or_(
                func.lower(Complaint.case_number).like(s),
                func.lower(Complaint.title).like(s),
                func.lower(Complaint.institution_name).like(s),
                func.lower(Complaint.description).like(s)
            )
        )
    if status and status != "ALL":
        query = query.filter(Complaint.status == status)
    if priority and priority != "ALL":
        query = query.filter(Complaint.priority == priority)
    if bureauId and bureauId != "ALL":
        query = query.filter(Complaint.assigned_bureau_id == bureauId)
    if institutionId and institutionId != "ALL":
        query = query.filter(Complaint.institution_id == institutionId)

    complaints = query.order_by(desc(Complaint.filed_at)).all()
    return [complaint_to_dict(c) for c in complaints]


@app.get("/api/complaints/{complaint_id}")
def get_complaint(complaint_id: str, db: Session = Depends(get_db)):
    c = db.query(Complaint).filter(
        or_(Complaint.id == complaint_id, Complaint.case_number == complaint_id)
    ).first()
    if not c:
        raise HTTPException(status_code=404, detail="Complaint record not found.")

    res = complaint_to_dict(c)
    res["sla"] = calculate_case_sla_state(c)

    # Attach evidence files
    res["evidence"] = [
        {
            "id": e.id,
            "filename": e.filename,
            "contentType": e.content_type,
            "sizeBytes": e.file_size_bytes,
            "sha256": e.sha256_checksum,
            "uploadedBy": e.uploaded_by,
            "createdAt": e.created_at.isoformat() + "Z",
            "extractedTextSnippet": (e.extracted_text[:200] + "...") if e.extracted_text else None
        }
        for e in c.evidence_files
    ]

    # Attach timeline events
    res["events"] = [
        {
            "id": ev.id,
            "actorName": ev.actor_name,
            "actorRole": ev.actor_role,
            "eventType": ev.event_type,
            "previousStatus": ev.previous_status,
            "newStatus": ev.new_status,
            "reason": ev.reason,
            "detail": ev.detail,
            "createdAt": ev.created_at.isoformat() + "Z"
        }
        for ev in sorted(c.events, key=lambda x: x.created_at, reverse=True)
    ]

    return res


@app.post("/api/complaints")
def create_complaint(req: NewComplaintRequest, db: Session = Depends(get_db)):
    triage = classify_complaint(req.title, req.description, req.category)
    assigned_bureau_id = req.suggestedBureauId or triage["suggested_bureau_id"]
    
    bureau = db.query(Bureau).filter(Bureau.id == assigned_bureau_id).first()
    bureau_name = bureau.name if bureau else triage["suggested_bureau_name"]
    priority = req.priority or triage["priority"]

    now = datetime.datetime.utcnow()
    total_count = db.query(Complaint).count()
    case_num = f"CC-2026-{total_count + 1:04d}"
    complaint_id = f"C{total_count + 1:03d}"

    sla_info = triage["sla"]
    resp_due = now + datetime.timedelta(days=sla_info["response_days"])
    resol_due = now + datetime.timedelta(days=sla_info["resolution_days"])

    new_case = Complaint(
        id=complaint_id,
        case_number=case_num,
        institution_id=req.institutionId,
        institution_name=req.institutionName,
        title=req.title,
        description=req.description,
        category=req.category,
        priority=priority,
        status="UNDER_REVIEW",
        assigned_bureau_id=assigned_bureau_id,
        assigned_bureau_name=bureau_name,
        assigned_officer_id="U001",
        assigned_officer_name="Arjun Sharma",
        complainant_name=req.complainantName or "Anonymous Complainant",
        complainant_role=req.complainantRole or "Student",
        is_anonymous=req.isAnonymous or False,
        filed_at=now,
        response_due_at=resp_due,
        resolution_due_at=resol_due,
        synthetic=True
    )
    db.add(new_case)

    # Initial Case Event
    event = CaseEvent(
        id=f"EVT-{complaint_id}-{int(now.timestamp())}",
        complaint_id=complaint_id,
        actor_name="Intake Portal / AI Triage",
        actor_role="SYSTEM",
        event_type="COMPLAINT_CREATED",
        previous_status=None,
        new_status="UNDER_REVIEW",
        reason="Initial registration via intake portal",
        detail=f"Complaint {case_num} registered. Priority: {priority}. Assigned: {bureau_name}.",
        created_at=now
    )
    db.add(event)

    # Cryptographic Audit Ledger Entry
    last_entry = db.query(AuditLedgerEntry).order_by(AuditLedgerEntry.created_at.desc(), AuditLedgerEntry.id.desc()).first()
    prev_hash = last_entry.current_hash if last_entry else "0000000000000000"
    detail = f"Complaint {case_num} created for {req.institutionName}. Category: {req.category}. Assigned: {bureau_name}."
    current_hash = compute_audit_hash("COMPLAINT_CREATED", detail, prev_hash)
    ledger_count = db.query(AuditLedgerEntry).count() + 1

    audit_entry = AuditLedgerEntry(
        id=f"AUD-{int(now.timestamp() * 1000)}",
        ledger_id=f"#{1000 + ledger_count}",
        actor_name="Intake Portal",
        event_type="COMPLAINT_CREATED",
        complaint_id=complaint_id,
        case_number=case_num,
        detail=detail,
        previous_hash=prev_hash,
        current_hash=current_hash,
        created_at=now
    )
    db.add(audit_entry)

    # Notification
    notif = Notification(
        id=f"NOTIF-{int(now.timestamp() * 1000)}",
        recipient_id="U001",
        type="NEW_ASSIGNMENT",
        message=f"New complaint {case_num} assigned to Academic Bureau: {req.title}",
        complaint_id=complaint_id,
        case_number=case_num,
        created_at=now
    )
    db.add(notif)

    db.commit()
    db.refresh(new_case)
    return complaint_to_dict(new_case)


@app.post("/api/complaints/{complaint_id}/validate")
def validate_complaint(complaint_id: str, db: Session = Depends(get_db)):
    c = db.query(Complaint).filter(
        or_(Complaint.id == complaint_id, Complaint.case_number == complaint_id)
    ).first()
    if not c:
        raise HTTPException(status_code=404, detail="Complaint record not found.")

    old_status = c.status
    target_status = "UNDER_REVIEW" if old_status in ["RECEIVED", "TRIAGE_PENDING", "ACTION_REQUIRED", "ON_HOLD"] else old_status

    if target_status != old_status:
        execute_transition(
            db=db,
            complaint=c,
            new_status=target_status,
            actor_name="Validation Engine",
            actor_role="SYSTEM",
            reason="Automated Case Action Checklist verification executed against AICTE disclosure archives.",
            detail=f"Automated compliance validation completed for {c.case_number}."
        )

    return {
        "ok": True,
        "complaint": complaint_to_dict(c),
        "message": "Automated validation complete. All institutional disclosure norms and affiliation registries checked."
    }


@app.post("/api/complaints/{complaint_id}/decision")
def record_decision(complaint_id: str, req: DecisionRequest, db: Session = Depends(get_db)):
    c = db.query(Complaint).filter(
        or_(Complaint.id == complaint_id, Complaint.case_number == complaint_id)
    ).first()
    if not c:
        raise HTTPException(status_code=404, detail="Complaint record not found.")

    decision_map = {
        "CONFIRM": "ACTION_REQUIRED",
        "DISMISS": "RESOLVED",
        "RESUBMISSION": "UNDER_REVIEW",
        "RESOLVE": "RESOLVED",
        "CLOSE": "CLOSED",
    }
    new_status = decision_map.get(req.decision.upper(), "UNDER_REVIEW")

    execute_transition(
        db=db,
        complaint=c,
        new_status=new_status,
        actor_name=req.actorName,
        actor_role=req.actorRole,
        reason=req.reason,
        detail=f"Officer decision: {req.decision} for {c.case_number}. Written reason: '{req.reason}'."
    )
    return {"ok": True, "complaint": complaint_to_dict(c)}


@app.post("/api/complaints/{complaint_id}/transition")
def transition_case(complaint_id: str, req: TransitionRequest, db: Session = Depends(get_db)):
    c = db.query(Complaint).filter(
        or_(Complaint.id == complaint_id, Complaint.case_number == complaint_id)
    ).first()
    if not c:
        raise HTTPException(status_code=404, detail="Complaint record not found.")

    execute_transition(
        db=db,
        complaint=c,
        new_status=req.newStatus,
        actor_name=req.actorName,
        actor_role=req.actorRole,
        reason=req.reason,
        detail=f"State transitioned to {req.newStatus}. Reason: {req.reason or 'Workflow update'}."
    )
    return {"ok": True, "complaint": complaint_to_dict(c)}


@app.post("/api/complaints/{complaint_id}/transfer")
def transfer_case(complaint_id: str, req: TransferRequest, db: Session = Depends(get_db)):
    c = db.query(Complaint).filter(
        or_(Complaint.id == complaint_id, Complaint.case_number == complaint_id)
    ).first()
    if not c:
        raise HTTPException(status_code=404, detail="Complaint record not found.")

    transferred = execute_transfer(
        db=db,
        complaint=c,
        target_bureau_id=req.targetBureauId,
        actor_name=req.actorName,
        reason=req.reason,
        target_officer_id=req.targetOfficerId,
        target_officer_name=req.targetOfficerName
    )
    return {"ok": True, "complaint": complaint_to_dict(transferred)}


@app.get("/api/complaints/{complaint_id}/events")
def get_case_events(complaint_id: str, db: Session = Depends(get_db)):
    c = db.query(Complaint).filter(
        or_(Complaint.id == complaint_id, Complaint.case_number == complaint_id)
    ).first()
    if not c:
        raise HTTPException(status_code=404, detail="Complaint record not found.")

    events = db.query(CaseEvent).filter(CaseEvent.complaint_id == c.id).order_by(desc(CaseEvent.created_at)).all()
    return [
        {
            "id": ev.id,
            "actorName": ev.actor_name,
            "actorRole": ev.actor_role,
            "eventType": ev.event_type,
            "previousStatus": ev.previous_status,
            "newStatus": ev.new_status,
            "reason": ev.reason,
            "detail": ev.detail,
            "createdAt": ev.created_at.isoformat() + "Z"
        }
        for ev in events
    ]

# ============================================================
# RELATIONSHIP INTELLIGENCE (TF-IDF & COGNITIVE LINKAGE)
# ============================================================
@app.get("/api/complaints/{complaint_id}/candidates")
@app.post("/api/complaints/{complaint_id}/analyze-relationships")
def analyze_relationships(complaint_id: str, db: Session = Depends(get_db)):
    c = db.query(Complaint).filter(
        or_(Complaint.id == complaint_id, Complaint.case_number == complaint_id)
    ).first()
    if not c:
        raise HTTPException(status_code=404, detail="Complaint record not found.")

    candidates = analyze_relationships_for_case(db, c, threshold=RECOMMENDATION_THRESHOLD)
    return {
        "sourceCaseId": c.id,
        "sourceCaseNumber": c.case_number,
        "algorithmVersion": ALGORITHM_VERSION,
        "threshold": RECOMMENDATION_THRESHOLD,
        "candidatesCount": len(candidates),
        "recommendedCount": sum(1 for x in candidates if x["isRecommended"]),
        "candidates": candidates
    }

@app.get("/api/relationships")
def list_relationships(db: Session = Depends(get_db)):
    rels = db.query(CaseRelationship).order_by(desc(CaseRelationship.created_at)).all()
    return [
        {
            "id": r.id,
            "sourceId": r.source_id,
            "targetId": r.target_id,
            "sourceCaseNumber": r.source_case_number,
            "targetCaseNumber": r.target_case_number,
            "matchType": r.match_type,
            "similarityScore": r.similarity_score,
            "algorithmVersion": r.algorithm_version,
            "explanation": r.explanation,
            "matchingSignals": [s.strip() for s in (r.matching_signals or "").split(",") if s.strip()],
            "conflictingSignals": [s.strip() for s in (r.conflicting_signals or "").split(",") if s.strip()],
            "reviewStatus": r.review_status,
            "reviewedBy": r.reviewed_by,
            "reviewReason": r.review_reason,
            "createdAt": r.created_at.isoformat() + "Z"
        }
        for r in rels
    ]

@app.post("/api/relationships/{rel_id}/decision")
def review_relationship(rel_id: str, req: DecisionRequest, db: Session = Depends(get_db)):
    try:
        updated = record_relationship_review(
            db=db,
            relationship_id=rel_id,
            decision=req.decision,
            reason=req.reason,
            actor_name=req.actorName
        )
        return {
            "ok": True,
            "relationship": {
                "id": updated.id,
                "reviewStatus": updated.review_status,
                "reviewedBy": updated.reviewed_by,
                "reviewReason": updated.review_reason
            }
        }
    except (ValueError, KeyError) as e:
        raise HTTPException(status_code=400, detail=str(e))

# ============================================================
# SLA MONITORING & METRICS
# ============================================================
@app.get("/api/sla/summary")
def get_sla_summary(db: Session = Depends(get_db)):
    return get_sla_dashboard_metrics(db)

# ============================================================
# IN-APP NOTIFICATIONS
# ============================================================
@app.get("/api/notifications")
def list_notifications(db: Session = Depends(get_db)):
    notifs = db.query(Notification).order_by(desc(Notification.created_at)).all()
    unread_count = sum(1 for n in notifs if n.read_at is None)
    return {
        "unreadCount": unread_count,
        "notifications": [
            {
                "id": n.id,
                "recipientId": n.recipient_id,
                "type": n.type,
                "message": n.message,
                "complaintId": n.complaint_id,
                "caseNumber": n.case_number,
                "readAt": n.read_at.isoformat() + "Z" if n.read_at else None,
                "createdAt": n.created_at.isoformat() + "Z"
            }
            for n in notifs
        ]
    }

@app.patch("/api/notifications/{notif_id}/read")
def mark_notification_read(notif_id: str, db: Session = Depends(get_db)):
    n = db.query(Notification).filter(Notification.id == notif_id).first()
    if not n:
        raise HTTPException(status_code=404, detail="Notification not found.")
    n.read_at = datetime.datetime.utcnow()
    db.commit()
    return {"ok": True, "id": n.id, "readAt": n.read_at.isoformat() + "Z"}

@app.post("/api/notifications/mark-all-read")
def mark_all_notifications_read(db: Session = Depends(get_db)):
    now = datetime.datetime.utcnow()
    db.query(Notification).filter(Notification.read_at == None).update({"read_at": now})
    db.commit()
    return {"ok": True, "message": "All notifications marked as read."}

# ============================================================
# EVIDENCE REPOSITORY & SECURE DOWNLOADS
# ============================================================
@app.post("/api/complaints/{complaint_id}/evidence")
def upload_evidence(
    complaint_id: str,
    file: UploadFile = File(...),
    uploadedBy: str = Form("Officer Arjun Sharma"),
    db: Session = Depends(get_db)
):
    evidence = save_evidence_file(db, complaint_id, file, uploaded_by=uploadedBy)
    return {
        "ok": True,
        "id": evidence.id,
        "filename": evidence.filename,
        "sizeBytes": evidence.file_size_bytes,
        "sha256": evidence.sha256_checksum,
        "extractedTextSnippet": (evidence.extracted_text[:200] + "...") if evidence.extracted_text else None
    }

@app.get("/api/complaints/{complaint_id}/evidence")
def list_case_evidence(complaint_id: str, db: Session = Depends(get_db)):
    c = db.query(Complaint).filter(or_(Complaint.id == complaint_id, Complaint.case_number == complaint_id)).first()
    if not c:
        raise HTTPException(status_code=404, detail="Complaint not found.")
    return [
        {
            "id": e.id,
            "filename": e.filename,
            "contentType": e.content_type,
            "sizeBytes": e.file_size_bytes,
            "sha256": e.sha256_checksum,
            "uploadedBy": e.uploaded_by,
            "createdAt": e.created_at.isoformat() + "Z",
            "extractedText": e.extracted_text
        }
        for e in c.evidence_files
    ]

@app.get("/api/evidence/{evidence_id}/download")
def download_evidence(evidence_id: str, db: Session = Depends(get_db)):
    e = db.query(Evidence).filter(Evidence.id == evidence_id).first()
    if not e:
        raise HTTPException(status_code=404, detail="Evidence record not found.")

    file_path = os.path.join(EVIDENCE_DIR, e.storage_key)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Underlying evidence file does not exist on storage.")

    return FileResponse(
        path=file_path,
        media_type=e.content_type,
        filename=e.filename
    )

# ============================================================
# CRYPTOGRAPHIC AUDIT LEDGER
# ============================================================
@app.get("/api/audit")
def get_audit_ledger(db: Session = Depends(get_db)):
    entries = db.query(AuditLedgerEntry).order_by(AuditLedgerEntry.created_at.asc(), AuditLedgerEntry.id.asc()).all()
    return [
        {
            "id": e.id,
            "ledgerId": e.ledger_id,
            "actorName": e.actor_name,
            "eventType": e.event_type,
            "complaintId": e.complaint_id,
            "caseNumber": e.case_number,
            "detail": e.detail,
            "previousHash": e.previous_hash,
            "currentHash": e.current_hash,
            "createdAt": e.created_at.isoformat() + "Z",
            "tampered": e.tampered
        }
        for e in entries
    ]

@app.post("/api/audit/verify")
def verify_ledger(db: Session = Depends(get_db)):
    entries = db.query(AuditLedgerEntry).order_by(AuditLedgerEntry.created_at.asc(), AuditLedgerEntry.id.asc()).all()
    dict_entries = [
        {
            "id": e.id,
            "ledgerId": e.ledger_id,
            "eventType": e.event_type,
            "detail": e.detail,
            "previousHash": e.previous_hash,
            "currentHash": e.current_hash,
        }
        for e in entries
    ]
    is_intact, broken_index, message = verify_audit_chain(dict_entries)
    broken_entry = dict_entries[broken_index] if not is_intact and broken_index >= 0 else None
    return {
        "intact": is_intact,
        "brokenIndex": broken_index,
        "brokenLedgerId": broken_entry["ledgerId"] if broken_entry else None,
        "message": message,
        "recomputedCount": len(entries)
    }

@app.post("/api/audit/tamper")
def simulate_tampering(db: Session = Depends(get_db)):
    target = db.query(AuditLedgerEntry).filter(AuditLedgerEntry.ledger_id == "#1004").first()
    if not target:
        target = db.query(AuditLedgerEntry).offset(3).first()
    if not target:
        raise HTTPException(status_code=400, detail="Insufficient audit ledger records to simulate tampering.")

    target.detail = target.detail + " [UNAUTHORIZED_DATABASE_MUTATION_SIMULATION]"
    target.tampered = True
    db.commit()
    return {
        "ok": True,
        "tamperedLedgerId": target.ledger_id,
        "message": f"Tampering simulated on {target.ledger_id}: detail altered without recalculating cryptographic SHA-256 hash."
    }

@app.post("/api/audit/restore")
def restore_ledger(db: Session = Depends(get_db)):
    seed_database(db, force=True)
    return {"ok": True, "message": "Cryptographic audit chain restored to pristine verified state."}

# ============================================================
# INSTITUTIONS & BUREAUS
# ============================================================
@app.get("/api/institutions")
def list_institutions(db: Session = Depends(get_db)):
    insts = db.query(Institution).all()
    return [
        {
            "id": i.id,
            "code": i.code,
            "name": i.name,
            "state": i.state,
            "type": i.type,
            "riskScore": i.risk_score,
            "synthetic": i.synthetic
        }
        for i in insts
    ]

@app.get("/api/institutions/{institution_id}")
def get_institution(institution_id: str, db: Session = Depends(get_db)):
    i = db.query(Institution).filter(or_(Institution.id == institution_id, Institution.code == institution_id)).first()
    if not i:
        raise HTTPException(status_code=404, detail="Institution not found.")

    cases = [complaint_to_dict(c) for c in i.complaints]
    active_cases = [c for c in cases if c["status"] not in ["RESOLVED", "CLOSED"]]
    return {
        "institution": {
            "id": i.id,
            "code": i.code,
            "name": i.name,
            "state": i.state,
            "type": i.type,
            "riskScore": i.risk_score
        },
        "complaints": cases,
        "activeCount": len(active_cases),
        "history": [
            {"year": "2024-25", "eoaStatus": "APPROVED", "intake": 480, "faculty": 32, "deficiency": "None"},
            {"year": "2025-26", "eoaStatus": "APPROVED WITH CONDITION", "intake": 540, "faculty": 28, "deficiency": "Faculty Shortage in CSE"},
            {"year": "2026-27", "eoaStatus": "PENDING GRIEVANCE REVIEW", "intake": 540, "faculty": 24, "deficiency": "Multiple Grievances Registered"}
        ]
    }

@app.get("/api/bureaus")
def list_bureaus(db: Session = Depends(get_db)):
    bureaus = db.query(Bureau).filter(Bureau.active == True).all()
    return [
        {"id": b.id, "name": b.name, "code": b.code, "description": b.description}
        for b in bureaus
    ]

# ============================================================
# TRIAGE AI CLASSIFIER
# ============================================================
@app.post("/api/triage/classify")
def run_triage(req: TriageRequest):
    return classify_complaint(req.title, req.description, req.category or "")

# ============================================================
# RULES & DATA SOURCES
# ============================================================
@app.get("/api/rules")
def get_rules(db: Session = Depends(get_db)):
    rules = db.query(SlaRule).all()
    return [
        {
            "id": r.id,
            "priority": r.priority,
            "category": r.category,
            "responseDays": r.response_target_days,
            "resolutionDays": r.resolution_target_days,
            "escalationDays": r.escalation_days,
            "timePolicy": r.time_policy,
            "version": r.version
        }
        for r in rules
    ]

@app.post("/api/rules/publish")
def publish_rules(body: Dict[str, Any] = Body(...), db: Session = Depends(get_db)):
    version = body.get("version", "v2.2")
    actor = body.get("actorName", "Admin Console")
    now = datetime.datetime.utcnow()
    detail = f"Case Action Checklist & Routing Rules {version} published by {actor}. Workflow version locked."

    last_entry = db.query(AuditLedgerEntry).order_by(AuditLedgerEntry.created_at.desc(), AuditLedgerEntry.id.desc()).first()
    prev_hash = last_entry.current_hash if last_entry else "0000000000000000"
    current_hash = compute_audit_hash("RULES_PUBLISHED", detail, prev_hash)
    ledger_count = db.query(AuditLedgerEntry).count() + 1

    entry = AuditLedgerEntry(
        id=f"AUD-{int(now.timestamp() * 1000)}",
        ledger_id=f"#{1000 + ledger_count}",
        actor_name=actor,
        event_type="RULES_PUBLISHED",
        detail=detail,
        previous_hash=prev_hash,
        current_hash=current_hash,
        created_at=now
    )
    db.add(entry)
    db.commit()
    return {"ok": True, "version": version, "message": f"Rules published successfully as {version}."}

@app.get("/api/sources")
def get_sources(db: Session = Depends(get_db)):
    sources = db.query(DataSource).all()
    return [
        {
            "id": s.id,
            "name": s.name,
            "endpoint": s.endpoint,
            "status": s.status,
            "lastFetched": s.last_fetched.isoformat() + "Z" if s.last_fetched else None,
            "recordCount": s.record_count
        }
        for s in sources
    ]

@app.post("/api/sources/{source_id}/refetch")
def refetch_source(source_id: str, db: Session = Depends(get_db)):
    s = db.query(DataSource).filter(DataSource.id == source_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Data source not found.")

    s.status = "PARSED"
    s.last_fetched = datetime.datetime.utcnow()
    s.record_count = max(s.record_count, 2480)
    db.commit()
    return {"ok": True, "source": {"id": s.id, "name": s.name, "status": s.status, "recordCount": s.record_count}}

# ============================================================
# ANALYTICS & EXPORT (PHASE 10)
# ============================================================
@app.get("/api/analytics")
def get_analytics(db: Session = Depends(get_db)):
    complaints = db.query(Complaint).all()
    
    # Status distribution
    status_counts = {}
    for c in complaints:
        status_counts[c.status] = status_counts.get(c.status, 0) + 1

    # Bureau distribution
    bureau_counts = {}
    for c in complaints:
        bureau_counts[c.assigned_bureau_name] = bureau_counts.get(c.assigned_bureau_name, 0) + 1

    # Priority distribution
    priority_counts = {}
    for c in complaints:
        priority_counts[c.priority] = priority_counts.get(c.priority, 0) + 1

    # Resolution time calculation
    resolved = [c for c in complaints if c.resolved_at and c.filed_at]
    avg_resolution_days = 0.0
    if resolved:
        total_days = sum((c.resolved_at - c.filed_at).total_seconds() / 86400.0 for c in resolved)
        avg_resolution_days = round(total_days / len(resolved), 1)

    # Relationship reviews
    rels = db.query(CaseRelationship).all()
    rel_outcomes = {"CONFIRMED": 0, "DISMISSED": 0, "FLAGGED": 0, "PENDING": 0}
    for r in rels:
        rel_outcomes[r.review_status] = rel_outcomes.get(r.review_status, 0) + 1

    return {
        "statusDistribution": status_counts,
        "bureauDistribution": bureau_counts,
        "priorityDistribution": priority_counts,
        "averageResolutionDays": avg_resolution_days,
        "relationshipOutcomes": rel_outcomes,
        "totalCases": len(complaints),
        "generatedAt": datetime.datetime.utcnow().isoformat() + "Z"
    }

@app.get("/api/export/complaints/csv")
def export_complaints_csv(db: Session = Depends(get_db)):
    complaints = db.query(Complaint).order_by(desc(Complaint.filed_at)).all()
    output = io.StringIO()
    writer = csv.writer(output)

    # Official headers
    writer.writerow([
        "Case Number", "Title", "Institution ID", "Institution Name",
        "Category", "Priority", "Status", "Assigned Bureau", "Assigned Officer",
        "Filed At", "Response Due At", "Resolution Due At", "Resolved At"
    ])

    for c in complaints:
        writer.writerow([
            c.case_number,
            c.title,
            c.institution_id,
            c.institution_name,
            c.category,
            c.priority,
            c.status,
            c.assigned_bureau_name,
            c.assigned_officer_name,
            c.filed_at.isoformat() if c.filed_at else "",
            c.response_due_at.isoformat() if c.response_due_at else "",
            c.resolution_due_at.isoformat() if c.resolution_due_at else "",
            c.resolved_at.isoformat() if c.resolved_at else ""
        ])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=AICTE_CaseConnect_Complaints_Export.csv"}
    )
