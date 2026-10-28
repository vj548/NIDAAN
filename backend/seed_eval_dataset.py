import datetime
from sqlalchemy.orm import Session
from db_session import SessionLocal
from db_models import Complaint, CaseEvent, AuditLedgerEntry, Institution, Bureau, User
from crypto import compute_audit_hash

# 15 Fictional Synthetic Complaint Records (CC-1001 through CC-1015)
# Designed for AICTE regulatory case evaluation:
# Cluster 1: CC-1001 / CC-1002 (Similar: Faculty Shortage & Cadre Ratio) | CC-1003 (Negative: Fire Safety)
# Cluster 2: CC-1004 / CC-1005 (Similar: Illegal Capitation & Certificate Retention) | CC-1006 (Negative: Library Digital Access)
# Cluster 3: CC-1007 / CC-1008 (Similar: Bank FDR Escrow Multi-Reuse FDR-SB-2024-9981) | CC-1009 (Negative: Exam Hall Ticket Delay)
# Cluster 4: CC-1010 / CC-1011 (Similar: Unapproved AI/Data Science Intake) | CC-1012 (Negative: Post-Matric Scholarship Delay)
# Cluster 5: CC-1013 / CC-1014 (Similar: Severe Hostel Ragging & Anti-Ragging Inaction) | CC-1015 (Negative: Canteen Water Hygiene)

SYNTHETIC_EVALUATION_DATA = [
    # ── Cluster 1: Faculty Shortage (Academic Bureau B001) ──
    {
        "id": "C1001",
        "case_number": "CC-1001",
        "institution_id": "I001",
        "institution_name": "Sri Vaikunta Institute of Technology",
        "title": "Severe faculty shortage and non-adherence to cadre ratio in Computer Science",
        "description": "Sri Vaikunta Institute of Technology has an acute faculty shortage in the Department of Computer Science and Engineering. The student-to-faculty ratio has degraded to 1:29 against the AICTE prescribed norm of 1:20. Multiple core courses like Operating Systems, Compilers, and Database Systems are being taken by ad-hoc junior instructors without postgraduate qualification. Assistant professors are forced to supervise multiple accredited laboratories simultaneously.",
        "category": "Faculty Shortage",
        "priority": "HIGH",
        "status": "UNDER_REVIEW",
        "assigned_bureau_id": "B001",
        "assigned_bureau_name": "Academic Bureau",
        "assigned_officer_id": "U001",
        "assigned_officer_name": "Arjun Sharma",
        "complainant_name": "Faculty Welfare Association",
        "complainant_role": "Faculty",
        "is_anonymous": False,
    },
    {
        "id": "C1002",
        "case_number": "CC-1002",
        "institution_id": "I001",
        "institution_name": "Sri Vaikunta Institute of Technology",
        "title": "Inadequate teaching staff and lack of qualified professors in CSE department",
        "description": "Urgent complaint regarding deficient faculty strength in Computer Science Engineering at Sri Vaikunta Institute of Technology. The institution lacks qualified senior professors and associate professors, violating AICTE cadre ratio norms (observed 1:0:8). The teacher to student ratio is nearly 1:30. Junior lecturers are overwhelmed handling both undergraduate lectures and laboratory sessions, leading to severe compromise in academic instruction standards.",
        "category": "Faculty Shortage",
        "priority": "HIGH",
        "status": "UNDER_REVIEW",
        "assigned_bureau_id": "B001",
        "assigned_bureau_name": "Academic Bureau",
        "assigned_officer_id": "U001",
        "assigned_officer_name": "Arjun Sharma",
        "complainant_name": "Concerned Students & Parents",
        "complainant_role": "Student",
        "is_anonymous": False,
    },
    {
        "id": "C1003",
        "case_number": "CC-1003",
        "institution_id": "I001",
        "institution_name": "Sri Vaikunta Institute of Technology",
        "title": "Fire safety certificate expired and electrical hazard in mechanical workshop",
        "description": "Grievance regarding infrastructure and campus life safety at Sri Vaikunta Institute of Technology. The Fire Safety NOC from the state fire services department expired 6 months ago and has not been renewed. Exposed electrical cabling and defunct fire extinguishers in the Mechanical engineering workshop and Boys Hostel Block present an imminent safety hazard to students.",
        "category": "Infrastructure Deficiency",
        "priority": "HIGH",
        "status": "UNDER_REVIEW",
        "assigned_bureau_id": "B002",
        "assigned_bureau_name": "Infrastructure Cell",
        "assigned_officer_id": "U002",
        "assigned_officer_name": "Priya Nair",
        "complainant_name": "Campus Safety Vigil",
        "complainant_role": "Student",
        "is_anonymous": True,
    },

    # ── Cluster 2: Capitation Fee & Certificate Retention (Finance B003) ──
    {
        "id": "C1004",
        "case_number": "CC-1004",
        "institution_id": "I002",
        "institution_name": "Kaveri Valley College of Engineering",
        "title": "Unlawful retention of original 10th and 12th certificates and demanding capitation fee",
        "description": "Kaveri Valley College of Engineering administration is unlawfully retaining original school marksheets, transfer certificates, and migration documents of admitted students. Upon requesting withdrawal or migration clearance, the finance office demands an extortionate unapproved fee of INR 1,50,000 as penalty before returning original documents, in explicit defiance of AICTE Approval Process Handbook regulations.",
        "category": "Fee Irregularity",
        "priority": "HIGH",
        "status": "ACTION_REQUIRED",
        "assigned_bureau_id": "B003",
        "assigned_bureau_name": "Finance & Accounts",
        "assigned_officer_id": "U003",
        "assigned_officer_name": "Ramesh Gupta",
        "complainant_name": "Sunil V. Hegde",
        "complainant_role": "Parent",
        "is_anonymous": False,
    },
    {
        "id": "C1005",
        "case_number": "CC-1005",
        "institution_id": "I002",
        "institution_name": "Kaveri Valley College of Engineering",
        "title": "Refusal to return original degree certificates without paying unauthorized penalty fee",
        "description": "Management of Kaveri Valley College of Engineering is holding back original 10th, 12th, and transfer certificates of first-year engineering students. The college accounts section refuses to release original documents unless an unauthorized penalty payment of INR 1,50,000 is settled in cash. This blatant withholding of academic certificates violates AICTE mandatory disclosure norms.",
        "category": "Fee Irregularity",
        "priority": "HIGH",
        "status": "UNDER_REVIEW",
        "assigned_bureau_id": "B003",
        "assigned_bureau_name": "Finance & Accounts",
        "assigned_officer_id": "U003",
        "assigned_officer_name": "Ramesh Gupta",
        "complainant_name": "Deepak Kumar",
        "complainant_role": "Student",
        "is_anonymous": False,
    },
    {
        "id": "C1006",
        "case_number": "CC-1006",
        "institution_id": "I002",
        "institution_name": "Kaveri Valley College of Engineering",
        "title": "Shortage of physical textbook titles and IEEE digital subscription in library",
        "description": "General student grievance at Kaveri Valley College of Engineering regarding library access. Several core textbook titles for Electronics and Communication semester 4 have only 2 copies available in the reference section. Furthermore, the campus IEEE digital library subscription has been intermittent for the past two months due to institutional proxy re-configuration.",
        "category": "Infrastructure Deficiency",
        "priority": "MEDIUM",
        "status": "UNDER_REVIEW",
        "assigned_bureau_id": "B002",
        "assigned_bureau_name": "Infrastructure Cell",
        "assigned_officer_id": "U002",
        "assigned_officer_name": "Priya Nair",
        "complainant_name": "ECE Student Representative",
        "complainant_role": "Student",
        "is_anonymous": False,
    },

    # ── Cluster 3: Bank FDR Escrow Reuse (Finance B003 / Approval B004) ──
    {
        "id": "C1007",
        "case_number": "CC-1007",
        "institution_id": "I004",
        "institution_name": "Marudhar School of Management",
        "title": "Fraudulent submission and reuse of bank Fixed Deposit Receipt FDR-SB-2024-9981 for approval",
        "description": "Marudhar School of Management has submitted Fixed Deposit Receipt FDR-SB-2024-9981 for Extension of Approval (EoA) in Management studies. However, the exact same FDR instrument FDR-SB-2024-9981 of INR 35,00,000 in State Bank of India was previously encumbered and pledged with the Rajasthan State Technical Board for establishing an affiliated polytechnic division, constituting duplicate lien fraud.",
        "category": "Fee Irregularity",
        "priority": "CRITICAL",
        "status": "ACTION_REQUIRED",
        "assigned_bureau_id": "B003",
        "assigned_bureau_name": "Finance & Accounts",
        "assigned_officer_id": "U003",
        "assigned_officer_name": "Ramesh Gupta",
        "complainant_name": "Internal Audit Whistleblower",
        "complainant_role": "Officer",
        "is_anonymous": True,
    },
    {
        "id": "C1008",
        "case_number": "CC-1008",
        "institution_id": "I004",
        "institution_name": "Marudhar School of Management",
        "title": "Dual encumbrance and duplicate submission of security deposit FDR-SB-2024-9981",
        "description": "Discrepancy detected in statutory security deposit compliance by Marudhar School of Management. The institution uploaded deposit receipt certificate FDR-SB-2024-9981 during the current AICTE approval cycle. Verification indicates this exact FDR instrument FDR-SB-2024-9981 is already pledged under a joint lien for a separate technical program, representing unauthorized reuse of statutory escrow funds.",
        "category": "Fee Irregularity",
        "priority": "CRITICAL",
        "status": "CROSS_BUREAU_REVIEW",
        "assigned_bureau_id": "B003",
        "assigned_bureau_name": "Finance & Accounts",
        "assigned_officer_id": "U003",
        "assigned_officer_name": "Ramesh Gupta",
        "complainant_name": "Bank Audit Committee",
        "complainant_role": "Officer",
        "is_anonymous": False,
    },
    {
        "id": "C1009",
        "case_number": "CC-1009",
        "institution_id": "I004",
        "institution_name": "Marudhar School of Management",
        "title": "Administrative delay in issuing MBA semester II examination admit cards",
        "description": "Second-year MBA students at Marudhar School of Management report that semester examination hall tickets have not been distributed 48 hours prior to the university examination date. The examination cell stated that a technical synchronization error between the campus ERP software and the state university exam portal caused the delay.",
        "category": "Student Welfare",
        "priority": "MEDIUM",
        "status": "UNDER_REVIEW",
        "assigned_bureau_id": "B005",
        "assigned_bureau_name": "Student Affairs Cell",
        "assigned_officer_id": "U004",
        "assigned_officer_name": "Kavitha Reddy",
        "complainant_name": "MBA Class Representative",
        "complainant_role": "Student",
        "is_anonymous": False,
    },

    # ── Cluster 4: Unapproved Intake & AI Course (Approval Bureau B004) ──
    {
        "id": "C1010",
        "case_number": "CC-1010",
        "institution_id": "I005",
        "institution_name": "Brahmaputra Technical Campus",
        "title": "Running unapproved B.Tech Artificial Intelligence program exceeding sanctioned intake by 60 seats",
        "description": "Brahmaputra Technical Campus is offering an unapproved undergraduate course titled B.Tech in Artificial Intelligence and Data Science. The institution admitted 60 students into this new branch without obtaining mandatory AICTE Extension of Approval (EoA) or university affiliation. Students were promised AICTE recognized degrees during counseling.",
        "category": "Excess Admission",
        "priority": "CRITICAL",
        "status": "UNDER_REVIEW",
        "assigned_bureau_id": "B004",
        "assigned_bureau_name": "Approval Bureau",
        "assigned_officer_id": "U005",
        "assigned_officer_name": "Mohan Das",
        "complainant_name": "Student Parents Forum (Assam)",
        "complainant_role": "Parent",
        "is_anonymous": False,
    },
    {
        "id": "C1011",
        "case_number": "CC-1011",
        "institution_id": "I005",
        "institution_name": "Brahmaputra Technical Campus",
        "title": "Unauthorized admission of 60 students in B.Tech AI & Data Science without AICTE approval",
        "description": "Complaint against Brahmaputra Technical Campus for conducting illegal admissions into an unauthorized B.Tech Artificial Intelligence & Data Science degree. Sanctioned intake approved by AICTE is 300 total seats across 5 core branches, but college admitted 360 students (60 excess seats in the unapproved AI program) without regulatory sanction.",
        "category": "Excess Admission",
        "priority": "CRITICAL",
        "status": "UNDER_REVIEW",
        "assigned_bureau_id": "B004",
        "assigned_bureau_name": "Approval Bureau",
        "assigned_officer_id": "U005",
        "assigned_officer_name": "Mohan Das",
        "complainant_name": "Youth Academic Rights Forum",
        "complainant_role": "Student",
        "is_anonymous": False,
    },
    {
        "id": "C1012",
        "case_number": "CC-1012",
        "institution_id": "I005",
        "institution_name": "Brahmaputra Technical Campus",
        "title": "Delay in institutional biometric authentication for Post-Matric Scholarship portal",
        "description": "Students belonging to SC and ST categories at Brahmaputra Technical Campus complain that the institutional nodal officer has delayed biometric attendance upload on the National Scholarship Portal (NSP). Due to this verification lapse, state post-matric scholarship fee reimbursement has been held up for the current semester.",
        "category": "Student Welfare",
        "priority": "HIGH",
        "status": "UNDER_REVIEW",
        "assigned_bureau_id": "B005",
        "assigned_bureau_name": "Student Affairs Cell",
        "assigned_officer_id": "U004",
        "assigned_officer_name": "Kavitha Reddy",
        "complainant_name": "Tribal Students Welfare Cell",
        "complainant_role": "Student",
        "is_anonymous": False,
    },

    # ── Cluster 5: Severe Ragging & Anti-Ragging Inaction (Student Affairs B005) ──
    {
        "id": "C1013",
        "case_number": "CC-1013",
        "institution_id": "I003",
        "institution_name": "Narmada Polytechnic Institute",
        "title": "Severe ragging and harassment of first-year hostel students by senior batches in Block B",
        "description": "Urgent grievance regarding severe physical and verbal ragging at Narmada Polytechnic Institute. First-year diploma students residing in Hostel Block B are subjected to late-night intimidation, physical abuse, and forced servitude by senior students. The hostel warden refused to intervene and the campus Anti-Ragging Committee has not met or recorded complaints.",
        "category": "Student Welfare",
        "priority": "CRITICAL",
        "status": "UNDER_REVIEW",
        "assigned_bureau_id": "B005",
        "assigned_bureau_name": "Student Affairs Cell",
        "assigned_officer_id": "U004",
        "assigned_officer_name": "Kavitha Reddy",
        "complainant_name": "Hostel Inmates Collective",
        "complainant_role": "Student",
        "is_anonymous": True,
    },
    {
        "id": "C1014",
        "case_number": "CC-1014",
        "institution_id": "I003",
        "institution_name": "Narmada Polytechnic Institute",
        "title": "Physical intimidation and ragging in boys hostel with non-functional Anti-Ragging Squad",
        "description": "Distress report regarding persistent ragging of junior students in Hostel Block B of Narmada Polytechnic Institute. Senior diploma students conduct illegal late-night sessions with physical intimidation and harassment. Despite oral representations, the Anti-Ragging Squad is inactive, CCTV cameras in the corridors have been unplugged, and no action has been taken against culprits.",
        "category": "Student Welfare",
        "priority": "CRITICAL",
        "status": "UNDER_REVIEW",
        "assigned_bureau_id": "B005",
        "assigned_bureau_name": "Student Affairs Cell",
        "assigned_officer_id": "U004",
        "assigned_officer_name": "Kavitha Reddy",
        "complainant_name": "Distressed Parents Association",
        "complainant_role": "Parent",
        "is_anonymous": False,
    },
    {
        "id": "C1015",
        "case_number": "CC-1015",
        "institution_id": "I003",
        "institution_name": "Narmada Polytechnic Institute",
        "title": "Unhygienic drinking water filtration and substandard food quality in campus canteen",
        "description": "Student grievance concerning cafeteria hygiene at Narmada Polytechnic Institute. The water cooling filters in the main academic block have not been serviced for 8 months resulting in murky drinking water. Canteen vendors operate without food safety hygiene certificates and lack clean washing stations.",
        "category": "Student Welfare",
        "priority": "LOW",
        "status": "UNDER_REVIEW",
        "assigned_bureau_id": "B005",
        "assigned_bureau_name": "Student Affairs Cell",
        "assigned_officer_id": "U004",
        "assigned_officer_name": "Kavitha Reddy",
        "complainant_name": "Student Welfare Council",
        "complainant_role": "Student",
        "is_anonymous": False,
    },

    # ── Cluster 6: Faculty Ghost Attendance & PAN Duplicate (Academic B001 / Cross-Campus) ──
    {
        "id": "C1016",
        "case_number": "CC-1016",
        "institution_id": "I001",
        "institution_name": "Sri Vaikunta Institute of Technology",
        "title": "Ghost faculty impersonation and duplicate appointment under PAN ABCDE1234F",
        "description": "Sri Vaikunta Institute of Technology has listed Dr. Rajesh Verma (PAN: ABCDE1234F) as a regular full-time Professor in the CSE Department to fulfill AICTE cadre ratio norms. However, Dr. Verma is concurrently drawing full-time salary and listed as active faculty at another engineering institution in Karnataka.",
        "category": "Faculty Welfare",
        "priority": "CRITICAL",
        "status": "ACTION_REQUIRED",
        "assigned_bureau_id": "B001",
        "assigned_bureau_name": "Academic Bureau",
        "assigned_officer_id": "U001",
        "assigned_officer_name": "Arjun Sharma",
        "complainant_name": "Faculty Transparency Group",
        "complainant_role": "Faculty",
        "is_anonymous": False,
    },
    {
        "id": "C1017",
        "case_number": "CC-1017",
        "institution_id": "I002",
        "institution_name": "Kaveri Valley College of Engineering",
        "title": "Concurrent faculty appointment and dual salary drawal under PAN ABCDE1234F",
        "description": "Audit irregularity at Kaveri Valley College of Engineering regarding the appointment of Dr. Rajesh Verma (PAN: ABCDE1234F) as Dean of Academic Affairs. Tax deduction records indicate Dr. Verma is drawing simultaneous full-time compensation while appearing on the approved mandatory disclosure faculty list of another college.",
        "category": "Faculty Welfare",
        "priority": "CRITICAL",
        "status": "CROSS_BUREAU_REVIEW",
        "assigned_bureau_id": "B001",
        "assigned_bureau_name": "Academic Bureau",
        "assigned_officer_id": "U001",
        "assigned_officer_name": "Arjun Sharma",
        "complainant_name": "Inter-University Vigilance",
        "complainant_role": "Officer",
        "is_anonymous": True,
    },
    {
        "id": "C1018",
        "case_number": "CC-1018",
        "institution_id": "I001",
        "institution_name": "Sri Vaikunta Institute of Technology",
        "title": "Non-implementation of 7th Central Pay Commission salary arrears for Assistant Professors",
        "description": "Grievance from junior teaching staff at Sri Vaikunta Institute of Technology regarding delayed payment of 7th CPC scale arrears. While faculty cadre promotions were notified on paper, revised basic pay scales have been pending disbursement for 14 months.",
        "category": "Faculty Welfare",
        "priority": "MEDIUM",
        "status": "UNDER_REVIEW",
        "assigned_bureau_id": "B001",
        "assigned_bureau_name": "Academic Bureau",
        "assigned_officer_id": "U001",
        "assigned_officer_name": "Arjun Sharma",
        "complainant_name": "Staff Association",
        "complainant_role": "Faculty",
        "is_anonymous": False,
    },

    # ── Cluster 7: Degree Fraud vs Routine Alumni Verification (Approval B004) ──
    {
        "id": "C1019",
        "case_number": "CC-1019",
        "institution_id": "I004",
        "institution_name": "Marudhar School of Management",
        "title": "Operating unauthorized off-campus center and issuing fake distance MBA diplomas",
        "description": "Marudhar School of Management is running an unapproved off-campus extension center in Jodhpur. The center is fraudulently printing and distributing unaccredited Executive MBA degree certificates bearing forged AICTE approval crests to working professionals.",
        "category": "Excess Admission",
        "priority": "CRITICAL",
        "status": "ACTION_REQUIRED",
        "assigned_bureau_id": "B004",
        "assigned_bureau_name": "Approval Bureau",
        "assigned_officer_id": "U005",
        "assigned_officer_name": "Mohan Das",
        "complainant_name": "Education Integrity Cell",
        "complainant_role": "Citizen",
        "is_anonymous": False,
    },
    {
        "id": "C1020",
        "case_number": "CC-1020",
        "institution_id": "I004",
        "institution_name": "Marudhar School of Management",
        "title": "Turnaround delay and international courier surcharge for official academic transcripts",
        "description": "Alumni grievance regarding the student affairs administrative counter at Marudhar School of Management. Application for sealed academic transcripts for World Education Services (WES) credential evaluation has taken over 4 weeks to dispatch.",
        "category": "Student Welfare",
        "priority": "LOW",
        "status": "UNDER_REVIEW",
        "assigned_bureau_id": "B005",
        "assigned_bureau_name": "Student Affairs Cell",
        "assigned_officer_id": "U004",
        "assigned_officer_name": "Kavitha Reddy",
        "complainant_name": "Alumni Association",
        "complainant_role": "Student",
        "is_anonymous": False,
    },
]

# Ground-truth expected benchmark relationship labels (kept separate from AI prediction outputs)
GROUND_TRUTH_BENCHMARK_PAIRS = [
    # Positive pairs (True Matches)
    {"source": "CC-1001", "target": "CC-1002", "expected_relationship": True, "label": "Faculty Shortage / Cadre Ratio", "type": "SAME_INSTITUTION_SAME_ISSUE"},
    {"source": "CC-1004", "target": "CC-1005", "expected_relationship": True, "label": "Capitation Fee & Certificate Retention", "type": "SAME_INSTITUTION_SAME_ISSUE"},
    {"source": "CC-1007", "target": "CC-1008", "expected_relationship": True, "label": "Bank FDR Escrow Reuse (FDR-SB-2024-9981)", "type": "EXACT_IDENTIFIER_MATCH"},
    {"source": "CC-1010", "target": "CC-1011", "expected_relationship": True, "label": "Unapproved Intake & AI Course", "type": "SAME_INSTITUTION_SAME_ISSUE"},
    {"source": "CC-1013", "target": "CC-1014", "expected_relationship": True, "label": "Severe Hostel Ragging & Inaction", "type": "SAME_INSTITUTION_SAME_ISSUE"},
    {"source": "CC-1016", "target": "CC-1017", "expected_relationship": True, "label": "Faculty Ghost Attendance & PAN Duplicate (ABCDE1234F)", "type": "CROSS_INSTITUTION_PAN_MATCH"},

    # Negative comparisons (Expected Rejected / Different Issues)
    {"source": "CC-1001", "target": "CC-1003", "expected_relationship": False, "label": "Same Inst (SVIT): Faculty Shortage vs Fire Safety", "type": "SAME_INST_DIFFERENT_DOMAIN"},
    {"source": "CC-1004", "target": "CC-1006", "expected_relationship": False, "label": "Same Inst (KVCE): Certificate Retention vs Library Access", "type": "SAME_INST_DIFFERENT_DOMAIN"},
    {"source": "CC-1007", "target": "CC-1009", "expected_relationship": False, "label": "Same Inst (MSMG): FDR Fraud vs Exam Admit Card Delay", "type": "SAME_INST_DIFFERENT_DOMAIN"},
    {"source": "CC-1010", "target": "CC-1012", "expected_relationship": False, "label": "Same Inst (BTCA): Unapproved AI Intake vs Scholarship Lapse", "type": "SAME_INST_DIFFERENT_DOMAIN"},
    {"source": "CC-1013", "target": "CC-1015", "expected_relationship": False, "label": "Same Inst (NPIT): Severe Ragging vs Canteen Water Hygiene", "type": "SAME_INST_DIFFERENT_ISSUE"},
    {"source": "CC-1016", "target": "CC-1018", "expected_relationship": False, "label": "Same Inst (SVIT): Ghost PAN Duplicate vs 7th CPC Salary Arrears", "type": "SAME_INST_DIFFERENT_ISSUE"},
    {"source": "CC-1019", "target": "CC-1020", "expected_relationship": False, "label": "Same Inst (MSMG): Fake Degree Racket vs Transcript Courier Delay", "type": "SAME_INST_DIFFERENT_ISSUE"},
]


def seed_synthetic_evaluation_dataset(db: Session) -> int:
    """
    Idempotently seeds the 15 evaluation complaints CC-1001 through CC-1015.
    If a complaint already exists, updates it without duplicating.
    Maintains the cryptographic SHA-256 audit ledger.
    """
    now = datetime.datetime.utcnow()
    added_count = 0
    updated_count = 0

    # Audit chain tracking
    last_entry = db.query(AuditLedgerEntry).order_by(AuditLedgerEntry.created_at.desc(), AuditLedgerEntry.id.desc()).first()
    prev_hash = last_entry.current_hash if last_entry else "0000000000000000"
    ledger_count = db.query(AuditLedgerEntry).count()

    for item in SYNTHETIC_EVALUATION_DATA:
        existing = db.query(Complaint).filter(Complaint.case_number == item["case_number"]).first()
        
        # Calculate SLA target dates
        sla_days_map = {"CRITICAL": (2, 7), "HIGH": (3, 14), "MEDIUM": (7, 30), "LOW": (15, 60)}
        resp_days, resol_days = sla_days_map.get(item["priority"], (7, 30))
        resp_due = now + datetime.timedelta(days=resp_days)
        resol_due = now + datetime.timedelta(days=resol_days)

        if not existing:
            complaint = Complaint(
                id=item["id"],
                case_number=item["case_number"],
                institution_id=item["institution_id"],
                institution_name=item["institution_name"],
                title=f"[SYNTHETIC] {item['title']}",
                description=item["description"],
                category=item["category"],
                priority=item["priority"],
                status=item["status"],
                assigned_bureau_id=item["assigned_bureau_id"],
                assigned_bureau_name=item["assigned_bureau_name"],
                assigned_officer_id=item["assigned_officer_id"],
                assigned_officer_name=item["assigned_officer_name"],
                complainant_name=item["complainant_name"],
                complainant_role=item["complainant_role"],
                is_anonymous=item["is_anonymous"],
                filed_at=now - datetime.timedelta(days=3),
                response_due_at=resp_due,
                resolution_due_at=resol_due,
                synthetic=True
            )
            db.add(complaint)

            # Case Event
            event = CaseEvent(
                id=f"EVT-{item['id']}-INIT",
                complaint_id=item["id"],
                actor_name="Intake Portal / Synthetic Evaluation Engine",
                actor_role="SYSTEM",
                event_type="COMPLAINT_CREATED",
                previous_status=None,
                new_status=item["status"],
                reason="Synthetic benchmark complaint registration for evaluation",
                detail=f"Synthetic evaluation complaint {item['case_number']} registered: {item['title']}.",
                created_at=now
            )
            db.add(event)

            # Cryptographic Audit Entry in true SHA-256 chain sequence
            ledger_count += 1
            detail = f"Evaluation complaint {item['case_number']} registered for {item['institution_name']}. Category: {item['category']}."
            curr_hash = compute_audit_hash("COMPLAINT_CREATED", detail, prev_hash)

            audit_entry = AuditLedgerEntry(
                id=f"AUD-{item['id']}-INIT",
                ledger_id=f"#{1000 + ledger_count}",
                actor_name="Evaluation Seeder",
                event_type="COMPLAINT_CREATED",
                complaint_id=item["id"],
                case_number=item["case_number"],
                detail=detail,
                previous_hash=prev_hash,
                current_hash=curr_hash,
                created_at=now,
                tampered=False
            )
            db.add(audit_entry)
            prev_hash = curr_hash
            added_count += 1
        else:
            # Update fields to ensure consistency without duplicate creation
            existing.title = f"[SYNTHETIC] {item['title']}"
            existing.description = item["description"]
            existing.category = item["category"]
            existing.priority = item["priority"]
            existing.status = item["status"]
            existing.synthetic = True
            updated_count += 1

    db.commit()
    print(f"Synthetic evaluation seed completed: {added_count} added, {updated_count} existing verified.")
    return added_count + updated_count

if __name__ == "__main__":
    with SessionLocal() as session:
        seed_synthetic_evaluation_dataset(session)
