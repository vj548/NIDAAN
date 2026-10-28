import datetime
from typing import List, Dict, Any, Optional
from crypto import compute_audit_hash

# In-memory database with persistent thread-safe operations
class Database:
    def __init__(self):
        self.reset()

    def reset(self):
        self.bureaus = [
            {"id": "B001", "name": "Academic Bureau", "description": "Academic quality, curriculum, and faculty norms", "active": True},
            {"id": "B002", "name": "Infrastructure Cell", "description": "Physical infrastructure, labs, and campus facilities", "active": True},
            {"id": "B003", "name": "Finance & Accounts", "description": "Fee regulation, FDR, and financial compliance", "active": True},
            {"id": "B004", "name": "Approval Bureau", "description": "Institutional recognition, EoA, and sanctioned intake", "active": True},
            {"id": "B005", "name": "Student Affairs Cell", "description": "Student welfare, anti-ragging, and grievances", "active": True},
            {"id": "B006", "name": "Compliance Cell", "description": "Ombudsperson oversight and inspection reports", "active": True},
        ]

        self.institutions = [
            {"id": "I001", "code": "SVIT-1042", "name": "Sri Vaikunta Institute of Technology", "state": "Tamil Nadu", "type": "Engineering College", "totalComplaints": 7, "openComplaints": 4, "highPriority": 2, "slaBreaches": 1, "synthetic": True, "riskScore": 78},
            {"id": "I002", "code": "KVCE-0877", "name": "Kaveri Valley College of Engineering", "state": "Karnataka", "type": "Engineering College", "totalComplaints": 5, "openComplaints": 3, "highPriority": 1, "slaBreaches": 0, "synthetic": True, "riskScore": 64},
            {"id": "I003", "code": "NPIT-0310", "name": "Narmada Polytechnic Institute", "state": "Madhya Pradesh", "type": "Polytechnic", "totalComplaints": 3, "openComplaints": 1, "highPriority": 0, "slaBreaches": 0, "synthetic": True, "riskScore": 25},
            {"id": "I004", "code": "MSMG-0455", "name": "Marudhar School of Management", "state": "Rajasthan", "type": "Management Institute", "totalComplaints": 4, "openComplaints": 2, "highPriority": 1, "slaBreaches": 1, "synthetic": True, "riskScore": 52},
            {"id": "I005", "code": "BTCA-0612", "name": "Brahmaputra Technical Campus", "state": "Assam", "type": "Engineering College", "totalComplaints": 6, "openComplaints": 5, "highPriority": 3, "slaBreaches": 2, "synthetic": True, "riskScore": 86},
            {"id": "I006", "code": "KPCY-0198", "name": "Konkan Pharmacy College", "state": "Maharashtra", "type": "Pharmacy College", "totalComplaints": 2, "openComplaints": 0, "highPriority": 0, "slaBreaches": 0, "synthetic": True, "riskScore": 12},
            {"id": "I007", "code": "GPEC-0733", "name": "Ganga Plains Engineering College", "state": "Uttar Pradesh", "type": "Engineering College", "totalComplaints": 5, "openComplaints": 3, "highPriority": 2, "slaBreaches": 1, "synthetic": True, "riskScore": 71},
            {"id": "I008", "code": "NIAS-0921", "name": "Nilgiri Institute of Applied Sciences", "state": "Tamil Nadu", "type": "Engineering College", "totalComplaints": 4, "openComplaints": 2, "highPriority": 1, "slaBreaches": 0, "synthetic": True, "riskScore": 69},
        ]

        self.users = [
            {"id": "U001", "name": "Arjun Sharma", "role": "OFFICER", "bureauId": "B001", "bureauName": "Academic Bureau", "email": "officer1@demo.aicte"},
            {"id": "U002", "name": "Priya Nair", "role": "OFFICER", "bureauId": "B002", "bureauName": "Infrastructure Cell", "email": "officer2@demo.aicte"},
            {"id": "U003", "name": "Ramesh Gupta", "role": "OFFICER", "bureauId": "B003", "bureauName": "Finance & Accounts", "email": "officer3@demo.aicte"},
            {"id": "U004", "name": "Kavitha Reddy", "role": "OFFICER", "bureauId": "B005", "bureauName": "Student Affairs Cell", "email": "officer4@demo.aicte"},
            {"id": "U005", "name": "Mohan Das", "role": "COORDINATOR", "bureauId": "B001", "bureauName": "Academic Bureau", "email": "coordinator1@demo.aicte"},
            {"id": "U006", "name": "Dr. V. Krishnamurthy", "role": "SUPERVISOR", "bureauId": None, "bureauName": None, "email": "supervisor1@demo.aicte"},
            {"id": "U007", "name": "Admin Console", "role": "ADMINISTRATOR", "bureauId": None, "bureauName": None, "email": "admin1@demo.aicte"},
        ]

        self.complaints = [
            {
                "id": "C001", "caseNumber": "CC-2026-0001", "institutionId": "I001", "institutionName": "Sri Vaikunta Institute of Technology",
                "title": "Shortage of full-time faculty in CSE department",
                "description": "Multiple students complained that CSE department has only 4 full-time faculty members against approved intake of 180 students, violating AICTE norms of 1:15 ratio.",
                "category": "Faculty Shortage", "priority": "CRITICAL", "status": "UNDER_REVIEW",
                "assignedBureauId": "B001", "assignedBureauName": "Academic Bureau", "assignedOfficerId": "U001", "assignedOfficerName": "Arjun Sharma",
                "filedAt": "2026-09-01T09:00:00Z", "responseDueAt": "2026-09-08T09:00:00Z", "resolutionDueAt": "2026-10-01T09:00:00Z", "resolvedAt": None, "synthetic": True
            },
            {
                "id": "C002", "caseNumber": "CC-2026-0002", "institutionId": "I001", "institutionName": "Sri Vaikunta Institute of Technology",
                "title": "Faculty qualification mismatch — CSE department visiting lecturers",
                "description": "Visiting lecturers in CSE department lack minimum qualification (ME/MTech or PhD) required by AICTE norms.",
                "category": "Faculty Qualification", "priority": "HIGH", "status": "CROSS_BUREAU_REVIEW",
                "assignedBureauId": "B001", "assignedBureauName": "Academic Bureau", "assignedOfficerId": "U001", "assignedOfficerName": "Arjun Sharma",
                "filedAt": "2026-09-03T11:00:00Z", "responseDueAt": "2026-09-10T11:00:00Z", "resolutionDueAt": "2026-10-05T11:00:00Z", "resolvedAt": None, "synthetic": True
            },
            {
                "id": "C003", "caseNumber": "CC-2026-0003", "institutionId": "I002", "institutionName": "Kaveri Valley College of Engineering",
                "title": "Excess fee collection beyond AICTE-approved fee structure",
                "description": "Students allege collection of undisclosed 'development fee' of Rs. 25,000 without receipt or approval.",
                "category": "Fee Irregularity", "priority": "HIGH", "status": "ACTION_REQUIRED",
                "assignedBureauId": "B003", "assignedBureauName": "Finance & Accounts", "assignedOfficerId": "U003", "assignedOfficerName": "Ramesh Gupta",
                "filedAt": "2026-09-05T14:00:00Z", "responseDueAt": "2026-09-12T14:00:00Z", "resolutionDueAt": "2026-10-07T14:00:00Z", "resolvedAt": None, "synthetic": True
            },
            {
                "id": "C004", "caseNumber": "CC-2026-0004", "institutionId": "I005", "institutionName": "Brahmaputra Technical Campus",
                "title": "Laboratory and library infrastructure below AICTE norms",
                "description": "Inspection reveals central library has fewer than 2000 titles and computer labs lack required bandwidth.",
                "category": "Infrastructure Deficiency", "priority": "HIGH", "status": "SLA_AT_RISK",
                "assignedBureauId": "B002", "assignedBureauName": "Infrastructure Cell", "assignedOfficerId": "U002", "assignedOfficerName": "Priya Nair",
                "filedAt": "2026-08-20T10:00:00Z", "responseDueAt": "2026-08-27T10:00:00Z", "resolutionDueAt": "2026-09-20T10:00:00Z", "resolvedAt": None, "synthetic": True
            },
            {
                "id": "C005", "caseNumber": "CC-2026-0005", "institutionId": "I005", "institutionName": "Brahmaputra Technical Campus",
                "title": "Excess admissions beyond sanctioned intake in Mechanical Engineering",
                "description": "Admitted 240 students in ME branch against approved intake of 120. Overcrowding in classrooms and labs.",
                "category": "Excess Admission", "priority": "CRITICAL", "status": "SLA_BREACHED",
                "assignedBureauId": "B004", "assignedBureauName": "Approval Bureau", "assignedOfficerId": "U001", "assignedOfficerName": "Arjun Sharma",
                "filedAt": "2026-08-10T09:00:00Z", "responseDueAt": "2026-08-17T09:00:00Z", "resolutionDueAt": "2026-09-10T09:00:00Z", "resolvedAt": None, "synthetic": True
            },
            {
                "id": "C006", "caseNumber": "CC-2026-0006", "institutionId": "I004", "institutionName": "Marudhar School of Management",
                "title": "Non-compliance with Grievance Redressal Committee regulations",
                "description": "Institution failed to constitute ombudsperson panel or online portal for student grievance redressal.",
                "category": "Regulatory Non-Compliance", "priority": "MEDIUM", "status": "ACTION_REQUIRED",
                "assignedBureauId": "B006", "assignedBureauName": "Compliance Cell", "assignedOfficerId": "U004", "assignedOfficerName": "Kavitha Reddy",
                "filedAt": "2026-09-12T11:00:00Z", "responseDueAt": "2026-09-26T11:00:00Z", "resolutionDueAt": "2026-11-12T11:00:00Z", "resolvedAt": None, "synthetic": True
            },
            {
                "id": "C007", "caseNumber": "CC-2026-0007", "institutionId": "I007", "institutionName": "Ganga Plains Engineering College",
                "title": "Delay in disbursal of AICTE Pragati & Saksham scholarship funds",
                "description": "Female students allege scholarship funds received from AICTE have not been disbursed for over four months.",
                "category": "Scholarship Irregularity", "priority": "HIGH", "status": "UNDER_REVIEW",
                "assignedBureauId": "B003", "assignedBureauName": "Finance & Accounts", "assignedOfficerId": "U003", "assignedOfficerName": "Ramesh Gupta",
                "filedAt": "2026-09-15T15:30:00Z", "responseDueAt": "2026-09-22T15:30:00Z", "resolutionDueAt": "2026-10-15T15:30:00Z", "resolvedAt": None, "synthetic": True
            },
            {
                "id": "C008", "caseNumber": "CC-2026-0008", "institutionId": "I008", "institutionName": "Nilgiri Institute of Applied Sciences",
                "title": "Security Deposit FDR reuse detected across institutions",
                "description": "Fixed Deposit Receipt SB-FDR-2024-00412 appears in both Nilgiri Institute and Kaveri Valley submissions.",
                "category": "FDR Duplication", "priority": "CRITICAL", "status": "CROSS_BUREAU_REVIEW",
                "assignedBureauId": "B004", "assignedBureauName": "Approval Bureau", "assignedOfficerId": "U001", "assignedOfficerName": "Arjun Sharma",
                "filedAt": "2026-09-18T10:00:00Z", "responseDueAt": "2026-09-25T10:00:00Z", "resolutionDueAt": "2026-10-18T10:00:00Z", "resolvedAt": None, "synthetic": True
            },
            {
                "id": "C009", "caseNumber": "CC-2026-0009", "institutionId": "I006", "institutionName": "Konkan Pharmacy College",
                "title": "Discrepancy in faculty salary records vs AICTE 7th CPC scale",
                "description": "Complaints regarding underpayment of assistant professors verified and settled following compliance notice.",
                "category": "Faculty Salary", "priority": "MEDIUM", "status": "RESOLVED",
                "assignedBureauId": "B001", "assignedBureauName": "Academic Bureau", "assignedOfficerId": "U001", "assignedOfficerName": "Arjun Sharma",
                "filedAt": "2026-07-01T09:00:00Z", "responseDueAt": "2026-07-15T09:00:00Z", "resolutionDueAt": "2026-08-01T09:00:00Z", "resolvedAt": "2026-08-05T14:00:00Z", "synthetic": True
            },
            {
                "id": "C010", "caseNumber": "CC-2026-0010", "institutionId": "I003", "institutionName": "Narmada Polytechnic Institute",
                "title": "FDR duplication inquiry — cross-check with Marudhar School",
                "description": "Suspected identical FDR security deposit reference submitted for AICTE approval cycle.",
                "category": "FDR Duplication", "priority": "CRITICAL", "status": "UNDER_REVIEW",
                "assignedBureauId": "B004", "assignedBureauName": "Approval Bureau", "assignedOfficerId": "U001", "assignedOfficerName": "Arjun Sharma",
                "filedAt": "2026-09-20T11:00:00Z", "responseDueAt": "2026-09-27T11:00:00Z", "resolutionDueAt": "2026-10-20T11:00:00Z", "resolvedAt": None, "synthetic": True
            }
        ]

        self.relationships = [
            {
                "id": "R001", "sourceId": "C001", "targetId": "C002",
                "sourceCaseNumber": "CC-2026-0001", "targetCaseNumber": "CC-2026-0002",
                "matchType": "STRONG_CANDIDATE", "similarityScore": 0.91,
                "explanation": "Both cases involve CSE department faculty deficiencies at Sri Vaikunta Institute of Technology.",
                "reviewStatus": "CONFIRMED", "reviewedBy": "Dr. V. Krishnamurthy", "reviewReason": "Corroborated by joint inspection roster", "createdAt": "2026-09-04T10:00:00Z"
            },
            {
                "id": "R002", "sourceId": "C008", "targetId": "C010",
                "sourceCaseNumber": "CC-2026-0008", "targetCaseNumber": "CC-2026-0010",
                "matchType": "EXACT_IDENTIFIER", "similarityScore": 0.97,
                "explanation": "Exact identical FDR Number SB-FDR-2024-00412 claimed by two different institutions.",
                "reviewStatus": "CONFIRMED", "reviewedBy": "Dr. V. Krishnamurthy", "reviewReason": "FDR bank reference confirmed identical", "createdAt": "2026-09-21T12:00:00Z"
            },
            {
                "id": "R003", "sourceId": "C004", "targetId": "C005",
                "sourceCaseNumber": "CC-2026-0004", "targetCaseNumber": "CC-2026-0005",
                "matchType": "STRONG_CANDIDATE", "similarityScore": 0.84,
                "explanation": "Severe institutional strain at Brahmaputra Technical Campus — infrastructure deficit paired with excess admissions.",
                "reviewStatus": "PENDING", "reviewedBy": None, "reviewReason": None, "createdAt": "2026-08-21T09:00:00Z"
            }
        ]

        # Audit ledger entries with true SHA-256 chain
        self.audit_entries = []
        raw_events = [
            ("L001", "#1001", "System", "COMPLAINT_CREATED", "C001", "CC-2026-0001", "Complaint CC-2026-0001 registered via portal. Category: Faculty Shortage.", "2026-09-01T09:01:00Z"),
            ("L002", "#1002", "Mohan Das", "CASE_ASSIGNED", "C001", "CC-2026-0001", "Case assigned to Arjun Sharma (Academic Bureau).", "2026-09-01T11:00:00Z"),
            ("L003", "#1003", "System", "COMPLAINT_CREATED", "C005", "CC-2026-0005", "Complaint CC-2026-0005 registered. Category: Excess Admission. Priority: CRITICAL.", "2026-08-10T09:01:00Z"),
            ("L004", "#1004", "System", "SLA_WARNING", "C004", "CC-2026-0004", "CC-2026-0004 response deadline approaching in 24 hours.", "2026-08-26T10:00:00Z"),
            ("L005", "#1005", "System", "SLA_BREACHED", "C005", "CC-2026-0005", "CC-2026-0005 resolution deadline exceeded. Escalation triggered.", "2026-09-10T09:01:00Z"),
            ("L006", "#1006", "Dr. V. Krishnamurthy", "STATUS_TRANSITION", "C002", "CC-2026-0002", "Status changed to CROSS_BUREAU_REVIEW. Joint review requested.", "2026-09-10T14:00:00Z"),
            ("L007", "#1007", "System", "AI_INFERENCE", "C008", "CC-2026-0008", "AI duplicate detection flagged exact FDR match with CC-2026-0010 (97% score).", "2026-09-18T10:05:00Z"),
            ("L008", "#1008", "Dr. V. Krishnamurthy", "FLAG_RESOLVED", "C008", "CC-2026-0008", "Duplicate FDR flag confirmed after bank verification.", "2026-09-21T12:30:00Z"),
            ("L009", "#1009", "Admin Console", "RULES_PUBLISHED", None, None, "APH Checklist and Routing Rules v2.1 published.", "2026-10-01T10:00:00Z"),
            ("L010", "#1010", "System", "OFFICER_LOGIN", None, None, "Officer login: Arjun Sharma (OFFICER, Academic Bureau). Session established.", "2026-10-26T09:00:00Z"),
        ]

        prev_hash = "0000000000000000"
        for eid, lid, actor, etype, cid, cnum, detail, ctime in raw_events:
            curr_hash = compute_audit_hash(etype, detail, prev_hash)
            self.audit_entries.append({
                "id": eid,
                "ledgerId": lid,
                "actorName": actor,
                "eventType": etype,
                "complaintId": cid,
                "caseNumber": cnum,
                "detail": detail,
                "previousHash": prev_hash,
                "currentHash": curr_hash,
                "createdAt": ctime,
                "tampered": False
            })
            prev_hash = curr_hash

        # Backup of audit entries for restore after tampering simulation
        self.original_audit_entries = [dict(e) for e in self.audit_entries]

        self.rules = [
            {"id": "R-101", "name": "Faculty Student Ratio 1:15", "category": "Academic", "severity": "BLOCKING", "active": True},
            {"id": "R-102", "name": "Valid State NOC / Affiliation", "category": "Regulatory", "severity": "BLOCKING", "active": True},
            {"id": "R-103", "name": "Approved Fee Structure Adherence", "category": "Finance", "severity": "BLOCKING", "active": True},
            {"id": "R-104", "name": "Security Deposit FDR Uniqueness", "category": "Finance", "severity": "BLOCKING", "active": True},
            {"id": "R-105", "name": "Campus Anti-Ragging Cell Mandatory Display", "category": "Student Welfare", "severity": "ADVISORY", "active": True},
            {"id": "R-106", "name": "Digital Library and Broadband Connectivity", "category": "Infrastructure", "severity": "ADVISORY", "active": True},
        ]

        self.data_sources = [
            {"id": "S001", "name": "AICTE Approval Portal API", "endpoint": "https://approval.aicte-india.org/api/v2", "lastFetched": "2026-10-26T08:00:00Z", "status": "PARSED", "recordCount": 11200},
            {"id": "S002", "name": "Mandatory Disclosures Registry", "endpoint": "https://disclosures.aicte-india.org/2026", "lastFetched": "2026-10-25T14:30:00Z", "status": "PARSED", "recordCount": 8940},
            {"id": "S003", "name": "State Directorate of Technical Education (TN)", "endpoint": "https://dte.tn.gov.in/feed", "lastFetched": "2026-10-24T18:00:00Z", "status": "PARSED", "recordCount": 612},
            {"id": "S004", "name": "Bank FDR Central Verification Gateway", "endpoint": "https://fdr-gateway.npci.org.in/v1", "lastFetched": "2026-10-26T06:15:00Z", "status": "FETCH_FAILED", "recordCount": 0},
            {"id": "S005", "name": "National Scholarship Portal (Saksham/Pragati)", "endpoint": "https://scholarships.gov.in/api", "lastFetched": "2026-10-23T11:00:00Z", "status": "PARSED", "recordCount": 4210},
        ]

    def add_audit_entry(self, actor: str, event_type: str, detail: str, complaint_id: Optional[str] = None, case_number: Optional[str] = None):
        last_hash = self.audit_entries[-1]["currentHash"] if self.audit_entries else "0000000000000000"
        curr_hash = compute_audit_hash(event_type, detail, last_hash)
        next_num = len(self.audit_entries) + 1001
        entry = {
            "id": f"L{len(self.audit_entries) + 1:03d}",
            "ledgerId": f"#{next_num}",
            "actorName": actor,
            "eventType": event_type,
            "complaintId": complaint_id,
            "caseNumber": case_number,
            "detail": detail,
            "previousHash": last_hash,
            "currentHash": curr_hash,
            "createdAt": datetime.datetime.utcnow().isoformat() + "Z",
            "tampered": False
        }
        self.audit_entries.append(entry)
        self.original_audit_entries.append(dict(entry))
        return entry

db = Database()
