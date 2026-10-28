import datetime
from sqlalchemy.orm import Session
from db_models import (
    User, Bureau, Institution, Complaint, CaseEvent,
    CaseRelationship, SlaRule, Notification, AuditLedgerEntry, DataSource
)
from crypto import compute_audit_hash

def seed_database(db: Session, force: bool = False):
    """Deterministically populates database with synthetic demo data."""
    if not force and db.query(Bureau).count() > 0:
        return  # already seeded

    if force:
        db.query(AuditLedgerEntry).delete()
        db.query(Notification).delete()
        db.query(CaseRelationship).delete()
        db.query(CaseEvent).delete()
        db.query(Complaint).delete()
        db.query(Institution).delete()
        db.query(User).delete()
        db.query(Bureau).delete()
        db.query(SlaRule).delete()
        db.query(DataSource).delete()
        db.commit()

    # 1. Bureaus
    bureaus_data = [
        {"id": "B001", "name": "Academic Bureau", "code": "BUR-ACAD", "description": "Academic quality, curriculum, and faculty norms"},
        {"id": "B002", "name": "Infrastructure Cell", "code": "BUR-INFRA", "description": "Physical infrastructure, labs, and campus facilities"},
        {"id": "B003", "name": "Finance & Accounts", "code": "BUR-FIN", "description": "Fee regulation, FDR, and financial compliance"},
        {"id": "B004", "name": "Approval Bureau", "code": "BUR-APPR", "description": "Institutional recognition, EoA, and sanctioned intake"},
        {"id": "B005", "name": "Student Affairs Cell", "code": "BUR-STUD", "description": "Student welfare, anti-ragging, and grievances"},
        {"id": "B006", "name": "Compliance Cell", "code": "BUR-COMP", "description": "Ombudsperson oversight and inspection reports"},
    ]
    for b in bureaus_data:
        db.add(Bureau(**b))
    db.commit()

    # 2. Users
    users_data = [
        {"id": "U001", "username": "officer1", "name": "Arjun Sharma", "role": "OFFICER", "bureau_id": "B001", "bureau_name": "Academic Bureau", "email": "officer1@demo.aicte", "password_hash": "demo@2026"},
        {"id": "U002", "username": "officer2", "name": "Priya Nair", "role": "OFFICER", "bureau_id": "B002", "bureau_name": "Infrastructure Cell", "email": "officer2@demo.aicte", "password_hash": "demo@2026"},
        {"id": "U003", "username": "officer3", "name": "Ramesh Gupta", "role": "OFFICER", "bureau_id": "B003", "bureau_name": "Finance & Accounts", "email": "officer3@demo.aicte", "password_hash": "demo@2026"},
        {"id": "U004", "username": "officer4", "name": "Kavitha Reddy", "role": "OFFICER", "bureau_id": "B005", "bureau_name": "Student Affairs Cell", "email": "officer4@demo.aicte", "password_hash": "demo@2026"},
        {"id": "U005", "username": "coordinator1", "name": "Mohan Das", "role": "COORDINATOR", "bureau_id": "B001", "bureau_name": "Academic Bureau", "email": "coordinator1@demo.aicte", "password_hash": "demo@2026"},
        {"id": "U006", "username": "supervisor1", "name": "Dr. V. Krishnamurthy", "role": "SUPERVISOR", "bureau_id": None, "bureau_name": None, "email": "supervisor1@demo.aicte", "password_hash": "demo@2026"},
        {"id": "U007", "username": "admin1", "name": "Admin Console", "role": "ADMINISTRATOR", "bureau_id": None, "bureau_name": None, "email": "admin1@demo.aicte", "password_hash": "demo@2026"},
    ]
    for u in users_data:
        db.add(User(**u))
    db.commit()

    # 3. Institutions
    inst_data = [
        {"id": "I001", "code": "SVIT-1042", "name": "Sri Vaikunta Institute of Technology", "state": "Tamil Nadu", "type": "Engineering College", "risk_score": 78},
        {"id": "I002", "code": "KVCE-0877", "name": "Kaveri Valley College of Engineering", "state": "Karnataka", "type": "Engineering College", "risk_score": 64},
        {"id": "I003", "code": "NPIT-0310", "name": "Narmada Polytechnic Institute", "state": "Madhya Pradesh", "type": "Polytechnic", "risk_score": 25},
        {"id": "I004", "code": "MSMG-0455", "name": "Marudhar School of Management", "state": "Rajasthan", "type": "Management Institute", "risk_score": 52},
        {"id": "I005", "code": "BTCA-0612", "name": "Brahmaputra Technical Campus", "state": "Assam", "type": "Engineering College", "risk_score": 86},
        {"id": "I006", "code": "KPCY-0198", "name": "Konkan Pharmacy College", "state": "Maharashtra", "type": "Pharmacy College", "risk_score": 12},
        {"id": "I007", "code": "GPEC-0733", "name": "Ganga Plains Engineering College", "state": "Uttar Pradesh", "type": "Engineering College", "risk_score": 71},
        {"id": "I008", "code": "NIAS-0921", "name": "Nilgiri Institute of Applied Sciences", "state": "Tamil Nadu", "type": "Engineering College", "risk_score": 69},
    ]
    for i in inst_data:
        db.add(Institution(**i))
    db.commit()

    # 4. Complaints
    complaints_data = [
        {
            "id": "C001", "case_number": "CC-2026-0001", "institution_id": "I001", "institution_name": "Sri Vaikunta Institute of Technology",
            "title": "Shortage of full-time faculty in CSE department",
            "description": "Multiple students complained that CSE department has only 4 full-time faculty members against approved intake of 180 students, violating AICTE norms of 1:15 ratio.",
            "category": "Faculty Shortage", "priority": "CRITICAL", "status": "UNDER_REVIEW",
            "assigned_bureau_id": "B001", "assigned_bureau_name": "Academic Bureau", "assigned_officer_id": "U001", "assigned_officer_name": "Arjun Sharma",
            "complainant_name": "Rahul Verma", "complainant_role": "Student", "is_anonymous": False,
            "filed_at": datetime.datetime(2026, 9, 1, 9, 0, 0),
            "response_due_at": datetime.datetime(2026, 9, 8, 9, 0, 0),
            "resolution_due_at": datetime.datetime(2026, 10, 1, 9, 0, 0),
            "resolved_at": None, "synthetic": True
        },
        {
            "id": "C002", "case_number": "CC-2026-0002", "institution_id": "I001", "institution_name": "Sri Vaikunta Institute of Technology",
            "title": "Faculty qualification mismatch — CSE department visiting lecturers",
            "description": "Visiting lecturers in CSE department lack minimum qualification (ME/MTech or PhD) required by AICTE norms.",
            "category": "Faculty Qualification", "priority": "HIGH", "status": "CROSS_BUREAU_REVIEW",
            "assigned_bureau_id": "B001", "assigned_bureau_name": "Academic Bureau", "assigned_officer_id": "U001", "assigned_officer_name": "Arjun Sharma",
            "complainant_name": "Confidential", "complainant_role": "Faculty Member", "is_anonymous": True,
            "filed_at": datetime.datetime(2026, 9, 3, 11, 0, 0),
            "response_due_at": datetime.datetime(2026, 9, 10, 11, 0, 0),
            "resolution_due_at": datetime.datetime(2026, 10, 5, 11, 0, 0),
            "resolved_at": None, "synthetic": True
        },
        {
            "id": "C003", "case_number": "CC-2026-0003", "institution_id": "I002", "institution_name": "Kaveri Valley College of Engineering",
            "title": "Excess fee collection beyond AICTE-approved fee structure",
            "description": "Students allege collection of undisclosed 'development fee' of Rs. 25,000 without receipt or approval.",
            "category": "Fee Irregularity", "priority": "HIGH", "status": "ACTION_REQUIRED",
            "assigned_bureau_id": "B003", "assigned_bureau_name": "Finance & Accounts", "assigned_officer_id": "U003", "assigned_officer_name": "Ramesh Gupta",
            "complainant_name": "Parent Association", "complainant_role": "Parent / Guardian", "is_anonymous": False,
            "filed_at": datetime.datetime(2026, 9, 5, 14, 0, 0),
            "response_due_at": datetime.datetime(2026, 9, 12, 14, 0, 0),
            "resolution_due_at": datetime.datetime(2026, 10, 7, 14, 0, 0),
            "resolved_at": None, "synthetic": True
        },
        {
            "id": "C004", "case_number": "CC-2026-0004", "institution_id": "I005", "institution_name": "Brahmaputra Technical Campus",
            "title": "Laboratory and library infrastructure below AICTE norms",
            "description": "Inspection reveals central library has fewer than 2000 titles and computer labs lack required bandwidth.",
            "category": "Infrastructure Deficiency", "priority": "HIGH", "status": "SLA_AT_RISK",
            "assigned_bureau_id": "B002", "assigned_bureau_name": "Infrastructure Cell", "assigned_officer_id": "U002", "assigned_officer_name": "Priya Nair",
            "complainant_name": "Amit Barua", "complainant_role": "Student", "is_anonymous": False,
            "filed_at": datetime.datetime(2026, 8, 20, 10, 0, 0),
            "response_due_at": datetime.datetime(2026, 8, 27, 10, 0, 0),
            "resolution_due_at": datetime.datetime(2026, 9, 20, 10, 0, 0),
            "resolved_at": None, "synthetic": True
        },
        {
            "id": "C005", "case_number": "CC-2026-0005", "institution_id": "I005", "institution_name": "Brahmaputra Technical Campus",
            "title": "Excess admissions beyond sanctioned intake in Mechanical Engineering",
            "description": "Admitted 240 students in ME branch against approved intake of 120. Overcrowding in classrooms and labs.",
            "category": "Excess Admission", "priority": "CRITICAL", "status": "SLA_BREACHED",
            "assigned_bureau_id": "B004", "assigned_bureau_name": "Approval Bureau", "assigned_officer_id": "U001", "assigned_officer_name": "Arjun Sharma",
            "complainant_name": "Staff Union", "complainant_role": "Whistleblower / Staff", "is_anonymous": True,
            "filed_at": datetime.datetime(2026, 8, 10, 9, 0, 0),
            "response_due_at": datetime.datetime(2026, 8, 17, 9, 0, 0),
            "resolution_due_at": datetime.datetime(2026, 9, 10, 9, 0, 0),
            "resolved_at": None, "synthetic": True
        },
        {
            "id": "C006", "case_number": "CC-2026-0006", "institution_id": "I004", "institution_name": "Marudhar School of Management",
            "title": "Non-compliance with Grievance Redressal Committee regulations",
            "description": "Institution failed to constitute ombudsperson panel or online portal for student grievance redressal.",
            "category": "Disclosure Non-compliance", "priority": "MEDIUM", "status": "ACTION_REQUIRED",
            "assigned_bureau_id": "B006", "assigned_bureau_name": "Compliance Cell", "assigned_officer_id": "U004", "assigned_officer_name": "Kavitha Reddy",
            "complainant_name": "Sunil Shekhawat", "complainant_role": "Student", "is_anonymous": False,
            "filed_at": datetime.datetime(2026, 9, 12, 11, 0, 0),
            "response_due_at": datetime.datetime(2026, 9, 26, 11, 0, 0),
            "resolution_due_at": datetime.datetime(2026, 11, 12, 11, 0, 0),
            "resolved_at": None, "synthetic": True
        },
        {
            "id": "C007", "case_number": "CC-2026-0007", "institution_id": "I007", "institution_name": "Ganga Plains Engineering College",
            "title": "Delay in disbursal of AICTE Pragati & Saksham scholarship funds",
            "description": "Female students allege scholarship funds received from AICTE have not been disbursed for over four months.",
            "category": "Fee Irregularity", "priority": "HIGH", "status": "UNDER_REVIEW",
            "assigned_bureau_id": "B003", "assigned_bureau_name": "Finance & Accounts", "assigned_officer_id": "U003", "assigned_officer_name": "Ramesh Gupta",
            "complainant_name": "Ananya Mishra", "complainant_role": "Student", "is_anonymous": False,
            "filed_at": datetime.datetime(2026, 9, 15, 15, 30, 0),
            "response_due_at": datetime.datetime(2026, 9, 22, 15, 30, 0),
            "resolution_due_at": datetime.datetime(2026, 10, 15, 15, 30, 0),
            "resolved_at": None, "synthetic": True
        },
        {
            "id": "C008", "case_number": "CC-2026-0008", "institution_id": "I008", "institution_name": "Nilgiri Institute of Applied Sciences",
            "title": "Security Deposit FDR reuse detected across institutions",
            "description": "Fixed Deposit Receipt SB-FDR-2024-00412 appears in both Nilgiri Institute and Kaveri Valley submissions.",
            "category": "Document Fraud", "priority": "CRITICAL", "status": "CROSS_BUREAU_REVIEW",
            "assigned_bureau_id": "B004", "assigned_bureau_name": "Approval Bureau", "assigned_officer_id": "U001", "assigned_officer_name": "Arjun Sharma",
            "complainant_name": "System Audit", "complainant_role": "General Public / Citizen", "is_anonymous": True,
            "filed_at": datetime.datetime(2026, 9, 18, 10, 0, 0),
            "response_due_at": datetime.datetime(2026, 9, 25, 10, 0, 0),
            "resolution_due_at": datetime.datetime(2026, 10, 18, 10, 0, 0),
            "resolved_at": None, "synthetic": True
        },
        {
            "id": "C009", "case_number": "CC-2026-0009", "institution_id": "I006", "institution_name": "Konkan Pharmacy College",
            "title": "Discrepancy in faculty salary records vs AICTE 7th CPC scale",
            "description": "Complaints regarding underpayment of assistant professors verified and settled following compliance notice.",
            "category": "Faculty Shortage", "priority": "MEDIUM", "status": "RESOLVED",
            "assigned_bureau_id": "B001", "assigned_bureau_name": "Academic Bureau", "assigned_officer_id": "U001", "assigned_officer_name": "Arjun Sharma",
            "complainant_name": "Faculty Welfare Association", "complainant_role": "Faculty Member", "is_anonymous": False,
            "filed_at": datetime.datetime(2026, 7, 1, 9, 0, 0),
            "response_due_at": datetime.datetime(2026, 7, 15, 9, 0, 0),
            "resolution_due_at": datetime.datetime(2026, 8, 1, 9, 0, 0),
            "resolved_at": datetime.datetime(2026, 8, 5, 14, 0, 0), "synthetic": True
        },
        {
            "id": "C010", "case_number": "CC-2026-0010", "institution_id": "I003", "institution_name": "Narmada Polytechnic Institute",
            "title": "FDR duplication inquiry — cross-check with Marudhar School",
            "description": "Suspected identical FDR security deposit reference submitted for AICTE approval cycle.",
            "category": "Document Fraud", "priority": "CRITICAL", "status": "UNDER_REVIEW",
            "assigned_bureau_id": "B004", "assigned_bureau_name": "Approval Bureau", "assigned_officer_id": "U001", "assigned_officer_name": "Arjun Sharma",
            "complainant_name": "Finance Cell Scrutiny", "complainant_role": "Whistleblower / Staff", "is_anonymous": True,
            "filed_at": datetime.datetime(2026, 9, 20, 11, 0, 0),
            "response_due_at": datetime.datetime(2026, 9, 27, 11, 0, 0),
            "resolution_due_at": datetime.datetime(2026, 10, 20, 11, 0, 0),
            "resolved_at": None, "synthetic": True
        }
    ]
    for c in complaints_data:
        db.add(Complaint(**c))
    db.commit()

    # 5. Timeline Events for Complaint C001
    events_data = [
        {"id": "EV-001", "complaint_id": "C001", "actor_name": "System", "actor_role": "System", "event_type": "COMPLAINT_CREATED", "previous_status": None, "new_status": "RECEIVED", "reason": "Initial grievance registered", "detail": "Complaint CC-2026-0001 created via portal intake form. Category: Faculty Shortage.", "created_at": datetime.datetime(2026, 9, 1, 9, 1, 0)},
        {"id": "EV-002", "complaint_id": "C001", "actor_name": "Mohan Das", "actor_role": "COORDINATOR", "event_type": "CASE_ASSIGNED", "previous_status": "RECEIVED", "new_status": "UNDER_REVIEW", "reason": "Assigned to Academic Bureau officer", "detail": "Assigned to Arjun Sharma (Academic Bureau). Initial priority marked as CRITICAL.", "created_at": datetime.datetime(2026, 9, 1, 11, 0, 0)},
        {"id": "EV-003", "complaint_id": "C001", "actor_name": "Arjun Sharma", "actor_role": "OFFICER", "event_type": "INFORMATION_REQUESTED", "previous_status": "UNDER_REVIEW", "new_status": "UNDER_REVIEW", "reason": "Faculty roster verification", "detail": "Official inquiry notice issued to Sri Vaikunta IT requesting certified faculty attendance and Form 16.", "created_at": datetime.datetime(2026, 9, 4, 14, 30, 0)},
    ]
    for e in events_data:
        db.add(CaseEvent(**e))
    db.commit()

    # 6. Case Relationships
    rel_data = [
        {
            "id": "R001", "source_id": "C001", "target_id": "C002",
            "source_case_number": "CC-2026-0001", "target_case_number": "CC-2026-0002",
            "match_type": "STRONG_CANDIDATE", "similarity_score": 0.91,
            "algorithm_version": "v1.4-tfidf-hybrid",
            "explanation": "Both cases involve CSE department faculty deficiencies at Sri Vaikunta Institute of Technology.",
            "matching_signals": "Same Institution (SVIT-1042), Common Department (CSE), Cosine Similarity > 0.85",
            "conflicting_signals": "Different complainant sources",
            "review_status": "CONFIRMED", "reviewed_by": "Dr. V. Krishnamurthy", "review_reason": "Corroborated by joint inspection roster",
            "created_at": datetime.datetime(2026, 9, 4, 10, 0, 0)
        },
        {
            "id": "R002", "source_id": "C008", "target_id": "C010",
            "source_case_number": "CC-2026-0008", "target_case_number": "CC-2026-0010",
            "match_type": "EXACT_IDENTIFIER", "similarity_score": 0.97,
            "algorithm_version": "v1.4-tfidf-hybrid",
            "explanation": "Exact identical FDR Number SB-FDR-2024-00412 claimed by two different institutions.",
            "matching_signals": "Exact FDR Number match (SB-FDR-2024-00412), High Cross-Institutional Risk",
            "conflicting_signals": "None",
            "review_status": "CONFIRMED", "reviewed_by": "Dr. V. Krishnamurthy", "review_reason": "FDR bank reference confirmed identical",
            "created_at": datetime.datetime(2026, 9, 21, 12, 0, 0)
        },
        {
            "id": "R003", "source_id": "C004", "target_id": "C005",
            "source_case_number": "CC-2026-0004", "target_case_number": "CC-2026-0005",
            "match_type": "STRONG_CANDIDATE", "similarity_score": 0.84,
            "algorithm_version": "v1.4-tfidf-hybrid",
            "explanation": "Severe institutional strain at Brahmaputra Technical Campus — infrastructure deficit paired with excess admissions.",
            "matching_signals": "Same Institution (BTCA-0612), High Concurrent Load",
            "conflicting_signals": "Different Categories (Infrastructure vs Approval)",
            "review_status": "PENDING", "reviewed_by": None, "review_reason": None,
            "created_at": datetime.datetime(2026, 8, 21, 9, 0, 0)
        }
    ]
    for r in rel_data:
        db.add(CaseRelationship(**r))
    db.commit()

    # 7. SLA Rules
    sla_data = [
        {"id": "SLA-001", "priority": "CRITICAL", "category": "Any", "response_target_days": 3, "resolution_target_days": 14, "escalation_days": 2, "time_policy": "Calendar", "active": True, "version": "v2.1"},
        {"id": "SLA-002", "priority": "HIGH", "category": "Any", "response_target_days": 7, "resolution_target_days": 30, "escalation_days": 5, "time_policy": "Business", "active": True, "version": "v2.1"},
        {"id": "SLA-003", "priority": "MEDIUM", "category": "Any", "response_target_days": 14, "resolution_target_days": 60, "escalation_days": 10, "time_policy": "Business", "active": True, "version": "v2.1"},
        {"id": "SLA-004", "priority": "LOW", "category": "Any", "response_target_days": 30, "resolution_target_days": 90, "escalation_days": 20, "time_policy": "Business", "active": True, "version": "v2.1"},
    ]
    for s in sla_data:
        db.add(SlaRule(**s))
    db.commit()

    # 8. Notifications
    notifs_data = [
        {"id": "N001", "recipient_id": "U001", "type": "SLA_WARNING", "message": "CC-2026-0004 response deadline in 24 hours. Immediate action required.", "complaint_id": "C004", "case_number": "CC-2026-0004", "read_at": None, "created_at": datetime.datetime(2026, 10, 26, 6, 0, 0)},
        {"id": "N002", "recipient_id": "U001", "type": "CASE_ASSIGNED", "message": "You have been assigned CC-2026-0001 (Faculty Shortage — Sri Vaikunta IT).", "complaint_id": "C001", "case_number": "CC-2026-0001", "read_at": None, "created_at": datetime.datetime(2026, 9, 1, 11, 0, 0)},
        {"id": "N003", "recipient_id": "U001", "type": "RELATED_REVIEW", "message": "Related case suggestion pending your review: CC-2026-0001 ↔ CC-2026-0002.", "complaint_id": "C001", "case_number": "CC-2026-0001", "read_at": None, "created_at": datetime.datetime(2026, 9, 4, 10, 5, 0)},
        {"id": "N004", "recipient_id": "U001", "type": "SLA_BREACHED", "message": "CC-2026-0005 SLA breached. Resolution deadline was 10 Sep 2026.", "complaint_id": "C005", "case_number": "CC-2026-0005", "read_at": datetime.datetime(2026, 10, 11, 9, 0, 0), "created_at": datetime.datetime(2026, 9, 10, 9, 1, 0)},
    ]
    for n in notifs_data:
        db.add(Notification(**n))
    db.commit()

    # 9. Audit Ledger Entries with true cryptographic SHA-256 chain
    raw_audit = [
        ("L001", "#1001", "System", "COMPLAINT_CREATED", "C001", "CC-2026-0001", "Complaint CC-2026-0001 registered via portal. Category: Faculty Shortage.", datetime.datetime(2026, 8, 10, 9, 0, 0)),
        ("L002", "#1002", "Mohan Das", "CASE_ASSIGNED", "C001", "CC-2026-0001", "Case assigned to Arjun Sharma (Academic Bureau).", datetime.datetime(2026, 8, 10, 11, 0, 0)),
        ("L003", "#1003", "System", "COMPLAINT_CREATED", "C005", "CC-2026-0005", "Complaint CC-2026-0005 registered. Category: Excess Admission. Priority: CRITICAL.", datetime.datetime(2026, 8, 20, 9, 1, 0)),
        ("L004", "#1004", "System", "SLA_WARNING", "C004", "CC-2026-0004", "CC-2026-0004 response deadline approaching in 24 hours.", datetime.datetime(2026, 8, 26, 10, 0, 0)),
        ("L005", "#1005", "System", "SLA_BREACHED", "C005", "CC-2026-0005", "CC-2026-0005 resolution deadline exceeded. Escalation triggered.", datetime.datetime(2026, 9, 1, 9, 1, 0)),
        ("L006", "#1006", "Dr. V. Krishnamurthy", "STATUS_TRANSITION", "C002", "CC-2026-0002", "Status changed to CROSS_BUREAU_REVIEW. Joint review requested.", datetime.datetime(2026, 9, 10, 14, 0, 0)),
        ("L007", "#1007", "System", "AI_INFERENCE", "C008", "CC-2026-0008", "AI duplicate detection flagged exact FDR match with CC-2026-0010 (97% score).", datetime.datetime(2026, 9, 18, 10, 5, 0)),
        ("L008", "#1008", "Dr. V. Krishnamurthy", "FLAG_RESOLVED", "C008", "CC-2026-0008", "Duplicate FDR flag confirmed after bank verification.", datetime.datetime(2026, 9, 21, 12, 30, 0)),
        ("L009", "#1009", "Admin Console", "RULES_PUBLISHED", None, None, "APH Checklist & Case Routing Rules v2.1 published.", datetime.datetime(2026, 10, 1, 10, 0, 0)),
        ("L010", "#1010", "System", "OFFICER_LOGIN", None, None, "Officer login: Arjun Sharma (OFFICER, Academic Bureau). Session established.", datetime.datetime(2026, 10, 26, 9, 0, 0)),
    ]
    prev_hash = "0000000000000000"
    for eid, lid, actor, etype, cid, cnum, detail, ctime in raw_audit:
        curr_hash = compute_audit_hash(etype, detail, prev_hash)
        db.add(AuditLedgerEntry(
            id=eid, ledger_id=lid, actor_name=actor, event_type=etype,
            complaint_id=cid, case_number=cnum, detail=detail,
            previous_hash=prev_hash, current_hash=curr_hash,
            created_at=ctime, tampered=False
        ))
        prev_hash = curr_hash
    db.commit()

    # 10. Data sources
    sources_data = [
        {"id": "S001", "name": "AICTE Approval Portal API", "endpoint": "https://approval.aicte-india.org/api/v2", "last_fetched": datetime.datetime(2026, 10, 26, 8, 0, 0), "status": "PARSED", "record_count": 11200},
        {"id": "S002", "name": "Mandatory Disclosures Registry", "endpoint": "https://disclosures.aicte-india.org/2026", "last_fetched": datetime.datetime(2026, 10, 25, 14, 30, 0), "status": "PARSED", "record_count": 8940},
        {"id": "S003", "name": "State Directorate of Technical Education (TN)", "endpoint": "https://dte.tn.gov.in/feed", "last_fetched": datetime.datetime(2026, 10, 24, 18, 0, 0), "status": "PARSED", "record_count": 612},
        {"id": "S004", "name": "Bank FDR Central Verification Gateway", "endpoint": "https://fdr-gateway.npci.org.in/v1", "last_fetched": datetime.datetime(2026, 10, 26, 6, 15, 0), "status": "FETCH_FAILED", "record_count": 0},
        {"id": "S005", "name": "National Scholarship Portal (Saksham/Pragati)", "endpoint": "https://scholarships.gov.in/api", "last_fetched": datetime.datetime(2026, 10, 23, 11, 0, 0), "status": "PARSED", "record_count": 4210},
    ]
    for s in sources_data:
        db.add(DataSource(**s))
    db.commit()

if __name__ == "__main__":
    from db_session import init_db, SessionLocal
    init_db()
    with SessionLocal() as session:
        seed_database(session, force=True)
        print("Database initialized and deterministically seeded successfully.")
