// Synthetic seed data for CaseConnect AI — SIH26264
// All data is fictional and tagged SYNTH

export type Status =
  | 'RECEIVED'
  | 'TRIAGE_PENDING'
  | 'UNDER_REVIEW'
  | 'CROSS_BUREAU_REVIEW'
  | 'ACTION_REQUIRED'
  | 'SLA_AT_RISK'
  | 'SLA_BREACHED'
  | 'RESOLVED'
  | 'CLOSED'
  | 'ON_HOLD'
  | 'REOPENED'

export type Priority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'

export type Role = 'OFFICER' | 'COORDINATOR' | 'SUPERVISOR' | 'ADMINISTRATOR'

export type MatchType = 'EXACT_IDENTIFIER' | 'STRONG_CANDIDATE' | 'POSSIBLE_RELATION' | 'BELOW_THRESHOLD'

export interface Bureau {
  id: string
  name: string
  description: string
  active: boolean
}

export interface Institution {
  id: string
  code: string
  name: string
  state: string
  type: string
  totalComplaints: number
  openComplaints: number
  highPriority: number
  slaBreaches: number
  synthetic: true
}

export interface User {
  id: string
  name: string
  role: Role
  bureauId: string | null
  bureauName: string | null
  email: string
}

export interface Complaint {
  id: string
  caseNumber: string
  institutionId: string
  institutionName: string
  title: string
  description: string
  category: string
  priority: Priority
  status: Status
  assignedBureauId: string
  assignedBureauName: string
  assignedOfficerId: string | null
  assignedOfficerName: string | null
  filedAt: string
  responseDueAt: string
  resolutionDueAt: string
  resolvedAt: string | null
  synthetic: true
}

export interface CaseEvent {
  id: string
  complaintId: string
  actorName: string
  actorRole: string
  eventType: string
  previousStatus: string | null
  newStatus: string | null
  reason: string
  detail: string
  createdAt: string
}

export interface CaseRelationship {
  id: string
  sourceId: string
  targetId: string
  sourceCaseNumber: string
  targetCaseNumber: string
  matchType: MatchType
  similarityScore: number
  explanation: string
  reviewStatus: 'PENDING' | 'CONFIRMED' | 'DISMISSED' | 'FLAGGED'
  reviewedBy: string | null
  reviewReason: string | null
  createdAt: string
}

export interface AuditEntry {
  id: string
  ledgerId: string
  actorName: string
  eventType: string
  complaintId: string | null
  caseNumber: string | null
  detail: string
  previousHash: string
  currentHash: string
  createdAt: string
  tampered?: boolean
}

export interface Notification {
  id: string
  type: string
  message: string
  complaintId: string | null
  caseNumber: string | null
  readAt: string | null
  createdAt: string
}

// ============================================================
// BUREAUS
// ============================================================
export const bureaus: Bureau[] = [
  { id: 'B001', name: 'Academic Bureau',        description: 'Academic quality and faculty-related complaints', active: true },
  { id: 'B002', name: 'Infrastructure Cell',    description: 'Physical infrastructure and facilities complaints', active: true },
  { id: 'B003', name: 'Finance & Accounts',     description: 'Fee-related and financial irregularity complaints', active: true },
  { id: 'B004', name: 'Approval Bureau',        description: 'Institution approval and recognition complaints', active: true },
  { id: 'B005', name: 'Student Affairs Cell',   description: 'Student grievance and welfare complaints', active: true },
  { id: 'B006', name: 'Compliance Cell',        description: 'Regulatory compliance and inspection complaints', active: true },
]

// ============================================================
// INSTITUTIONS
// ============================================================
export const institutions: Institution[] = [
  { id: 'I001', code: 'SVIT-1042', name: 'Sri Vaikunta Institute of Technology',  state: 'Tamil Nadu',     type: 'Engineering College',    totalComplaints: 7, openComplaints: 4, highPriority: 2, slaBreaches: 1, synthetic: true },
  { id: 'I002', code: 'KVCE-0877', name: 'Kaveri Valley College of Engineering',  state: 'Karnataka',      type: 'Engineering College',    totalComplaints: 5, openComplaints: 3, highPriority: 1, slaBreaches: 0, synthetic: true },
  { id: 'I003', code: 'NPIT-0310', name: 'Narmada Polytechnic Institute',         state: 'Madhya Pradesh', type: 'Polytechnic',            totalComplaints: 3, openComplaints: 1, highPriority: 0, slaBreaches: 0, synthetic: true },
  { id: 'I004', code: 'MSMG-0455', name: 'Marudhar School of Management',         state: 'Rajasthan',      type: 'Management Institute',   totalComplaints: 4, openComplaints: 2, highPriority: 1, slaBreaches: 1, synthetic: true },
  { id: 'I005', code: 'BTCA-0612', name: 'Brahmaputra Technical Campus',          state: 'Assam',          type: 'Engineering College',    totalComplaints: 6, openComplaints: 5, highPriority: 3, slaBreaches: 2, synthetic: true },
  { id: 'I006', code: 'KPCY-0198', name: 'Konkan Pharmacy College',               state: 'Maharashtra',    type: 'Pharmacy College',       totalComplaints: 2, openComplaints: 0, highPriority: 0, slaBreaches: 0, synthetic: true },
  { id: 'I007', code: 'GPEC-0733', name: 'Ganga Plains Engineering College',      state: 'Uttar Pradesh',  type: 'Engineering College',    totalComplaints: 5, openComplaints: 3, highPriority: 2, slaBreaches: 1, synthetic: true },
  { id: 'I008', code: 'NIAS-0921', name: 'Nilgiri Institute of Applied Sciences', state: 'Tamil Nadu',     type: 'Engineering College',    totalComplaints: 4, openComplaints: 2, highPriority: 1, slaBreaches: 0, synthetic: true },
]

// ============================================================
// USERS
// ============================================================
export const users: User[] = [
  { id: 'U001', name: 'Arjun Sharma',       role: 'OFFICER',        bureauId: 'B001', bureauName: 'Academic Bureau',      email: 'officer1@demo.aicte' },
  { id: 'U002', name: 'Priya Nair',         role: 'OFFICER',        bureauId: 'B002', bureauName: 'Infrastructure Cell',  email: 'officer2@demo.aicte' },
  { id: 'U003', name: 'Ramesh Gupta',       role: 'OFFICER',        bureauId: 'B003', bureauName: 'Finance & Accounts',   email: 'officer3@demo.aicte' },
  { id: 'U004', name: 'Kavitha Reddy',      role: 'OFFICER',        bureauId: 'B005', bureauName: 'Student Affairs Cell', email: 'officer4@demo.aicte' },
  { id: 'U005', name: 'Mohan Das',          role: 'COORDINATOR',    bureauId: 'B001', bureauName: 'Academic Bureau',      email: 'coordinator1@demo.aicte' },
  { id: 'U006', name: 'Sujata Patil',       role: 'COORDINATOR',    bureauId: 'B002', bureauName: 'Infrastructure Cell',  email: 'coordinator2@demo.aicte' },
  { id: 'U007', name: 'Dr. V. Krishnamurthy', role: 'SUPERVISOR',   bureauId: null,   bureauName: null,                  email: 'supervisor1@demo.aicte' },
  { id: 'U008', name: 'Admin Console',      role: 'ADMINISTRATOR',  bureauId: null,   bureauName: null,                  email: 'admin1@demo.aicte' },
]

// ============================================================
// COMPLAINTS (20 synthetic records)
// ============================================================
export const complaints: Complaint[] = [
  {
    id: 'C001', caseNumber: 'CC-2026-0001', institutionId: 'I001', institutionName: 'Sri Vaikunta Institute of Technology',
    title: 'Shortage of full-time faculty in CSE department',
    description: 'Multiple students have complained that the Computer Science and Engineering department has only 4 full-time faculty members against the approved intake of 180 students, violating AICTE norms of 1:15 ratio. Several classes are being taken by visiting faculty without proper approval.',
    category: 'Faculty Shortage', priority: 'CRITICAL', status: 'UNDER_REVIEW',
    assignedBureauId: 'B001', assignedBureauName: 'Academic Bureau', assignedOfficerId: 'U001', assignedOfficerName: 'Arjun Sharma',
    filedAt: '2026-09-01T09:00:00Z', responseDueAt: '2026-09-08T09:00:00Z', resolutionDueAt: '2026-10-01T09:00:00Z', resolvedAt: null, synthetic: true,
  },
  {
    id: 'C002', caseNumber: 'CC-2026-0002', institutionId: 'I001', institutionName: 'Sri Vaikunta Institute of Technology',
    title: 'Faculty qualification mismatch — CSE department visiting lecturers',
    description: 'Visiting lecturers in the CSE department reportedly lack the minimum qualification (ME/MTech or PhD) required by AICTE norms. Faculty qualification certificates submitted during EoA 2025-26 appear inconsistent with current roster.',
    category: 'Faculty Qualification', priority: 'HIGH', status: 'CROSS_BUREAU_REVIEW',
    assignedBureauId: 'B001', assignedBureauName: 'Academic Bureau', assignedOfficerId: 'U001', assignedOfficerName: 'Arjun Sharma',
    filedAt: '2026-09-03T11:00:00Z', responseDueAt: '2026-09-10T11:00:00Z', resolutionDueAt: '2026-10-05T11:00:00Z', resolvedAt: null, synthetic: true,
  },
  {
    id: 'C003', caseNumber: 'CC-2026-0003', institutionId: 'I002', institutionName: 'Kaveri Valley College of Engineering',
    title: 'Excess fee collection beyond AICTE-approved fee structure',
    description: 'Students of 2025-26 batch allege collection of fees beyond the approved fee structure, including an undisclosed "development fee" of Rs. 25,000. Institution has not displayed approved fee structure as required.',
    category: 'Fee Irregularity', priority: 'HIGH', status: 'ACTION_REQUIRED',
    assignedBureauId: 'B003', assignedBureauName: 'Finance & Accounts', assignedOfficerId: 'U003', assignedOfficerName: 'Ramesh Gupta',
    filedAt: '2026-09-05T14:00:00Z', responseDueAt: '2026-09-12T14:00:00Z', resolutionDueAt: '2026-10-07T14:00:00Z', resolvedAt: null, synthetic: true,
  },
  {
    id: 'C004', caseNumber: 'CC-2026-0004', institutionId: 'I005', institutionName: 'Brahmaputra Technical Campus',
    title: 'Laboratory and library infrastructure below AICTE norms',
    description: 'Physical inspection reveals that the central library has fewer than 2000 titles and lab equipment is outdated. Bandwidth does not meet 1 Mbps per student requirement. Students lack access to NPTEL/e-learning resources.',
    category: 'Infrastructure Deficiency', priority: 'HIGH', status: 'SLA_AT_RISK',
    assignedBureauId: 'B002', assignedBureauName: 'Infrastructure Cell', assignedOfficerId: 'U002', assignedOfficerName: 'Priya Nair',
    filedAt: '2026-08-20T10:00:00Z', responseDueAt: '2026-08-27T10:00:00Z', resolutionDueAt: '2026-09-20T10:00:00Z', resolvedAt: null, synthetic: true,
  },
  {
    id: 'C005', caseNumber: 'CC-2026-0005', institutionId: 'I005', institutionName: 'Brahmaputra Technical Campus',
    title: 'Admission beyond sanctioned intake — 2025-26 batch',
    description: 'Complaint alleges that 2025-26 admissions exceed the AICTE-sanctioned intake by approximately 40 students across three branches. Excess students admitted via management quota without disclosure.',
    category: 'Excess Admission', priority: 'CRITICAL', status: 'SLA_BREACHED',
    assignedBureauId: 'B004', assignedBureauName: 'Approval Bureau', assignedOfficerId: null, assignedOfficerName: null,
    filedAt: '2026-08-10T09:00:00Z', responseDueAt: '2026-08-17T09:00:00Z', resolutionDueAt: '2026-09-10T09:00:00Z', resolvedAt: null, synthetic: true,
  },
  {
    id: 'C006', caseNumber: 'CC-2026-0006', institutionId: 'I004', institutionName: 'Marudhar School of Management',
    title: 'Non-submission of Mandatory Disclosure for 2025-26',
    description: 'Institution has not updated the Mandatory Disclosure portal for FY 2025-26 as required under AICTE regulation. Previous disclosure dates to 2023-24 with significant gaps in faculty and infrastructure data.',
    category: 'Disclosure Non-compliance', priority: 'MEDIUM', status: 'TRIAGE_PENDING',
    assignedBureauId: 'B006', assignedBureauName: 'Compliance Cell', assignedOfficerId: null, assignedOfficerName: null,
    filedAt: '2026-10-15T08:00:00Z', responseDueAt: '2026-10-22T08:00:00Z', resolutionDueAt: '2026-11-15T08:00:00Z', resolvedAt: null, synthetic: true,
  },
  {
    id: 'C007', caseNumber: 'CC-2026-0007', institutionId: 'I007', institutionName: 'Ganga Plains Engineering College',
    title: 'Hostel facilities inadequate and unsafe for female students',
    description: 'Female students report inadequate hostel security, absence of a proper warden, and basic amenity deficiencies in the women\'s hostel. Multiple written representations to institution administration have gone unanswered.',
    category: 'Student Welfare', priority: 'HIGH', status: 'UNDER_REVIEW',
    assignedBureauId: 'B005', assignedBureauName: 'Student Affairs Cell', assignedOfficerId: 'U004', assignedOfficerName: 'Kavitha Reddy',
    filedAt: '2026-09-18T12:00:00Z', responseDueAt: '2026-09-25T12:00:00Z', resolutionDueAt: '2026-10-18T12:00:00Z', resolvedAt: null, synthetic: true,
  },
  {
    id: 'C008', caseNumber: 'CC-2026-0008', institutionId: 'I002', institutionName: 'Kaveri Valley College of Engineering',
    title: 'Unauthorised collection of caution deposit and refusal to refund',
    description: 'Students allege collection of a Rs. 15,000 caution deposit not sanctioned under the approved fee structure. Multiple requests for refund upon withdrawal have been denied by the institution.',
    category: 'Fee Irregularity', priority: 'MEDIUM', status: 'RECEIVED',
    assignedBureauId: 'B003', assignedBureauName: 'Finance & Accounts', assignedOfficerId: null, assignedOfficerName: null,
    filedAt: '2026-10-20T10:30:00Z', responseDueAt: '2026-10-27T10:30:00Z', resolutionDueAt: '2026-11-20T10:30:00Z', resolvedAt: null, synthetic: true,
  },
  {
    id: 'C009', caseNumber: 'CC-2026-0009', institutionId: 'I003', institutionName: 'Narmada Polytechnic Institute',
    title: 'Faculty salary irregularity — payment below 6th pay commission norms',
    description: 'Faculty members allege that salaries are paid below the pay scales mandated by AICTE pay revision scheme. Salary slips show deductions not reflected in appointment letters.',
    category: 'Faculty Welfare', priority: 'MEDIUM', status: 'RESOLVED',
    assignedBureauId: 'B001', assignedBureauName: 'Academic Bureau', assignedOfficerId: 'U001', assignedOfficerName: 'Arjun Sharma',
    filedAt: '2026-07-10T09:00:00Z', responseDueAt: '2026-07-17T09:00:00Z', resolutionDueAt: '2026-08-10T09:00:00Z', resolvedAt: '2026-08-05T14:00:00Z', synthetic: true,
  },
  {
    id: 'C010', caseNumber: 'CC-2026-0010', institutionId: 'I008', institutionName: 'Nilgiri Institute of Applied Sciences',
    title: 'FDR certificate submitted appears identical to one filed by another institution',
    description: 'Cross-check during EoA processing reveals that the FDR certificate number submitted by this institution matches one filed by Sri Vaikunta Institute of Technology in 2024-25, raising concerns of document reuse or fabrication.',
    category: 'Document Fraud', priority: 'CRITICAL', status: 'CROSS_BUREAU_REVIEW',
    assignedBureauId: 'B004', assignedBureauName: 'Approval Bureau', assignedOfficerId: null, assignedOfficerName: null,
    filedAt: '2026-09-25T11:00:00Z', responseDueAt: '2026-10-02T11:00:00Z', resolutionDueAt: '2026-10-25T11:00:00Z', resolvedAt: null, synthetic: true,
  },
  {
    id: 'C011', caseNumber: 'CC-2026-0011', institutionId: 'I001', institutionName: 'Sri Vaikunta Institute of Technology',
    title: 'FDR certificate irregularity — possible shared document',
    description: 'Institution submitted FDR No. SB-FDR-2024-00412 for EoA 2026-27. The same certificate number appears in the records of another institution for the prior academic year. Officer review requested.',
    category: 'Document Fraud', priority: 'CRITICAL', status: 'CROSS_BUREAU_REVIEW',
    assignedBureauId: 'B004', assignedBureauName: 'Approval Bureau', assignedOfficerId: null, assignedOfficerName: null,
    filedAt: '2026-09-28T09:30:00Z', responseDueAt: '2026-10-05T09:30:00Z', resolutionDueAt: '2026-10-28T09:30:00Z', resolvedAt: null, synthetic: true,
  },
  {
    id: 'C012', caseNumber: 'CC-2026-0012', institutionId: 'I007', institutionName: 'Ganga Plains Engineering College',
    title: 'Excessive fees collected from lateral entry students 2025-26',
    description: 'Lateral entry students (2025-26 batch) allege collection of fees significantly in excess of the AICTE-approved structure, with no fee structure displayed on institution notice board or website.',
    category: 'Fee Irregularity', priority: 'MEDIUM', status: 'UNDER_REVIEW',
    assignedBureauId: 'B003', assignedBureauName: 'Finance & Accounts', assignedOfficerId: 'U003', assignedOfficerName: 'Ramesh Gupta',
    filedAt: '2026-10-01T10:00:00Z', responseDueAt: '2026-10-08T10:00:00Z', resolutionDueAt: '2026-11-01T10:00:00Z', resolvedAt: null, synthetic: true,
  },
  {
    id: 'C013', caseNumber: 'CC-2026-0013', institutionId: 'I005', institutionName: 'Brahmaputra Technical Campus',
    title: 'Full-time faculty count below required norms — multiple departments',
    description: 'Inspection report notes that across five departments at this campus, the full-time faculty count falls below AICTE-required minimums. Visiting faculty are shown as full-time in submissions.',
    category: 'Faculty Shortage', priority: 'HIGH', status: 'ACTION_REQUIRED',
    assignedBureauId: 'B001', assignedBureauName: 'Academic Bureau', assignedOfficerId: 'U001', assignedOfficerName: 'Arjun Sharma',
    filedAt: '2026-09-10T09:00:00Z', responseDueAt: '2026-09-17T09:00:00Z', resolutionDueAt: '2026-10-10T09:00:00Z', resolvedAt: null, synthetic: true,
  },
  {
    id: 'C014', caseNumber: 'CC-2026-0014', institutionId: 'I004', institutionName: 'Marudhar School of Management',
    title: 'Inadequate computing infrastructure for MBA programme',
    description: 'Students complain that the institution provides only 30 computers for 120 MBA students, which is below the AICTE-prescribed ratio. Internet connectivity is also reported as unreliable.',
    category: 'Infrastructure Deficiency', priority: 'LOW', status: 'ON_HOLD',
    assignedBureauId: 'B002', assignedBureauName: 'Infrastructure Cell', assignedOfficerId: 'U002', assignedOfficerName: 'Priya Nair',
    filedAt: '2026-08-05T11:00:00Z', responseDueAt: '2026-08-12T11:00:00Z', resolutionDueAt: '2026-09-05T11:00:00Z', resolvedAt: null, synthetic: true,
  },
  {
    id: 'C015', caseNumber: 'CC-2026-0015', institutionId: 'I006', institutionName: 'Konkan Pharmacy College',
    title: 'Affiliation renewal issue causing student uncertainty',
    description: 'Students report that university affiliation renewal for B.Pharm 2026-27 has not been obtained, creating uncertainty about the validity of their enrolment. Institution has not communicated the status to students.',
    category: 'Affiliation Issue', priority: 'HIGH', status: 'RESOLVED',
    assignedBureauId: 'B004', assignedBureauName: 'Approval Bureau', assignedOfficerId: 'U007', assignedOfficerName: 'Dr. V. Krishnamurthy',
    filedAt: '2026-07-20T09:00:00Z', responseDueAt: '2026-07-27T09:00:00Z', resolutionDueAt: '2026-08-20T09:00:00Z', resolvedAt: '2026-08-15T11:00:00Z', synthetic: true,
  },
  {
    id: 'C016', caseNumber: 'CC-2026-0016', institutionId: 'I007', institutionName: 'Ganga Plains Engineering College',
    title: 'Students denied exam hall tickets pending fee payment dispute',
    description: 'Multiple students report being denied semester examination hall tickets pending resolution of the disputed fee excess collection complaint (CC-2026-0012). This is causing immediate academic harm.',
    category: 'Student Welfare', priority: 'CRITICAL', status: 'REOPENED',
    assignedBureauId: 'B005', assignedBureauName: 'Student Affairs Cell', assignedOfficerId: 'U004', assignedOfficerName: 'Kavitha Reddy',
    filedAt: '2026-10-22T08:00:00Z', responseDueAt: '2026-10-24T08:00:00Z', resolutionDueAt: '2026-10-28T08:00:00Z', resolvedAt: null, synthetic: true,
  },
  {
    id: 'C017', caseNumber: 'CC-2026-0017', institutionId: 'I002', institutionName: 'Kaveri Valley College of Engineering',
    title: 'Shortage of full-time faculty — ECE department',
    description: 'Students and parents allege that the Electronics & Communication Engineering department at Kaveri Valley College has significantly fewer full-time faculty than the AICTE approved norms require for its sanctioned intake.',
    category: 'Faculty Shortage', priority: 'HIGH', status: 'TRIAGE_PENDING',
    assignedBureauId: 'B001', assignedBureauName: 'Academic Bureau', assignedOfficerId: null, assignedOfficerName: null,
    filedAt: '2026-10-24T10:00:00Z', responseDueAt: '2026-10-31T10:00:00Z', resolutionDueAt: '2026-11-24T10:00:00Z', resolvedAt: null, synthetic: true,
  },
  {
    id: 'C018', caseNumber: 'CC-2026-0018', institutionId: 'I008', institutionName: 'Nilgiri Institute of Applied Sciences',
    title: 'Placement data misrepresentation in mandatory disclosure',
    description: 'Alumni allege that the placement data published in the institution\'s mandatory disclosure significantly overstates placement percentages and salary figures for the 2023-24 and 2024-25 batches.',
    category: 'Disclosure Non-compliance', priority: 'MEDIUM', status: 'UNDER_REVIEW',
    assignedBureauId: 'B006', assignedBureauName: 'Compliance Cell', assignedOfficerId: null, assignedOfficerName: null,
    filedAt: '2026-10-10T09:00:00Z', responseDueAt: '2026-10-17T09:00:00Z', resolutionDueAt: '2026-11-10T09:00:00Z', resolvedAt: null, synthetic: true,
  },
  {
    id: 'C019', caseNumber: 'CC-2026-0019', institutionId: 'I003', institutionName: 'Narmada Polytechnic Institute',
    title: 'Workshop equipment non-functional — Mechanical department',
    description: 'Students in the Mechanical Engineering programme report that workshop machinery including lathe machines and milling machines are non-functional for over six months, severely affecting practical training.',
    category: 'Infrastructure Deficiency', priority: 'MEDIUM', status: 'CLOSED',
    assignedBureauId: 'B002', assignedBureauName: 'Infrastructure Cell', assignedOfficerId: 'U002', assignedOfficerName: 'Priya Nair',
    filedAt: '2026-06-15T09:00:00Z', responseDueAt: '2026-06-22T09:00:00Z', resolutionDueAt: '2026-07-15T09:00:00Z', resolvedAt: '2026-07-10T14:00:00Z', synthetic: true,
  },
  {
    id: 'C020', caseNumber: 'CC-2026-0020', institutionId: 'I005', institutionName: 'Brahmaputra Technical Campus',
    title: 'Anti-ragging committee not constituted as per UGC/AICTE norms',
    description: 'A student complaint states that the institution has not constituted the mandatory anti-ragging committee. No anti-ragging helpline number is displayed. Incidents of ragging have been reported to the institution with no recorded action.',
    category: 'Student Welfare', priority: 'CRITICAL', status: 'ACTION_REQUIRED',
    assignedBureauId: 'B005', assignedBureauName: 'Student Affairs Cell', assignedOfficerId: 'U004', assignedOfficerName: 'Kavitha Reddy',
    filedAt: '2026-10-18T11:00:00Z', responseDueAt: '2026-10-20T11:00:00Z', resolutionDueAt: '2026-10-30T11:00:00Z', resolvedAt: null, synthetic: true,
  },
]

// ============================================================
// CASE RELATIONSHIPS
// ============================================================
export const relationships: CaseRelationship[] = [
  {
    id: 'R001',
    sourceId: 'C001', targetId: 'C013',
    sourceCaseNumber: 'CC-2026-0001', targetCaseNumber: 'CC-2026-0013',
    matchType: 'STRONG_CANDIDATE',
    similarityScore: 0.87,
    explanation: 'Both complaints concern full-time faculty shortage violations. C001 is specific to CSE department at SVIT; C013 covers multiple departments at Brahmaputra TC. Shared category "Faculty Shortage", similar description terms: "full-time faculty", "visiting faculty", "AICTE norms", "1:15 ratio".',
    reviewStatus: 'PENDING',
    reviewedBy: null,
    reviewReason: null,
    createdAt: '2026-10-01T09:00:00Z',
  },
  {
    id: 'R002',
    sourceId: 'C010', targetId: 'C011',
    sourceCaseNumber: 'CC-2026-0010', targetCaseNumber: 'CC-2026-0011',
    matchType: 'EXACT_IDENTIFIER',
    similarityScore: 0.97,
    explanation: 'Both complaints reference the identical FDR certificate number "SB-FDR-2024-00412". This is a structural identifier match, not text similarity. The institutions involved are different (NIAS-0921 and SVIT-1042), which is the core concern raising cross-bureau review.',
    reviewStatus: 'CONFIRMED',
    reviewedBy: 'Dr. V. Krishnamurthy',
    reviewReason: 'Identical FDR number confirmed in both submissions. Cross-bureau review warranted. Referred to Finance & Approval Bureau for joint examination.',
    createdAt: '2026-09-29T10:00:00Z',
  },
  {
    id: 'R003',
    sourceId: 'C003', targetId: 'C008',
    sourceCaseNumber: 'CC-2026-0003', targetCaseNumber: 'CC-2026-0008',
    matchType: 'STRONG_CANDIDATE',
    similarityScore: 0.79,
    explanation: 'Both complaints allege fee collection beyond the AICTE-approved fee structure at Kaveri Valley College of Engineering. C003 concerns "development fee", C008 concerns "caution deposit". Same institution, same category, filed by different complainants.',
    reviewStatus: 'PENDING',
    reviewedBy: null,
    reviewReason: null,
    createdAt: '2026-10-21T14:00:00Z',
  },
  {
    id: 'R004',
    sourceId: 'C012', targetId: 'C003',
    sourceCaseNumber: 'CC-2026-0012', targetCaseNumber: 'CC-2026-0003',
    matchType: 'POSSIBLE_RELATION',
    similarityScore: 0.64,
    explanation: 'Both complaints allege excess fee collection, but institutions are different (GPEC-0733 vs KVCE-0877). Category is identical. Description terms overlap: "AICTE-approved fee structure", "not displayed", "excess fees". No institutional connection.',
    reviewStatus: 'DISMISSED',
    reviewedBy: 'Arjun Sharma',
    reviewReason: 'Different institutions, different complainants. Fee-irregularity complaints share category language by nature. No structural link found. Dismissing relationship suggestion.',
    createdAt: '2026-10-05T11:00:00Z',
  },
  {
    id: 'R005',
    sourceId: 'C007', targetId: 'C016',
    sourceCaseNumber: 'CC-2026-0007', targetCaseNumber: 'CC-2026-0016',
    matchType: 'STRONG_CANDIDATE',
    similarityScore: 0.82,
    explanation: 'C016 directly references the unresolved fee dispute at the same institution as C012, and C007 concerns a separate student welfare issue at Ganga Plains EC. Both involve immediate student harm at the same institution. C016 was reopened after earlier closure.',
    reviewStatus: 'PENDING',
    reviewedBy: null,
    reviewReason: null,
    createdAt: '2026-10-23T08:00:00Z',
  },
]

// ============================================================
// AUDIT LEDGER
// ============================================================
export const auditEntries: AuditEntry[] = [
  { id: 'L001', ledgerId: '#1001', actorName: 'System',              eventType: 'COMPLAINT_CREATED',    complaintId: 'C001', caseNumber: 'CC-2026-0001', detail: 'Complaint CC-2026-0001 created via officer intake form. Category: Faculty Shortage.',                                        previousHash: '0000000000000000', currentHash: 'a3f2c91d8e4b7056', createdAt: '2026-09-01T09:01:00Z' },
  { id: 'L002', ledgerId: '#1002', actorName: 'Mohan Das',           eventType: 'CASE_ASSIGNED',        complaintId: 'C001', caseNumber: 'CC-2026-0001', detail: 'Assigned to Arjun Sharma (Academic Bureau). Previous: unassigned.',                                                          previousHash: 'a3f2c91d8e4b7056', currentHash: 'b7e1d04f2a9c3812', createdAt: '2026-09-01T11:00:00Z' },
  { id: 'L003', ledgerId: '#1003', actorName: 'System',              eventType: 'COMPLAINT_CREATED',    complaintId: 'C005', caseNumber: 'CC-2026-0005', detail: 'Complaint CC-2026-0005 created. Category: Excess Admission. Priority: CRITICAL.',                                            previousHash: 'b7e1d04f2a9c3812', currentHash: 'c4a8e63b1f5d9072', createdAt: '2026-08-10T09:01:00Z' },
  { id: 'L004', ledgerId: '#1004', actorName: 'System',              eventType: 'SLA_WARNING',          complaintId: 'C004', caseNumber: 'CC-2026-0004', detail: 'CC-2026-0004 response deadline in 24 hours. Current status: UNDER_REVIEW. Officer: Priya Nair.',                            previousHash: 'c4a8e63b1f5d9072', currentHash: 'd2f7b19e3c0a6485', createdAt: '2026-08-26T10:00:00Z' },
  { id: 'L005', ledgerId: '#1005', actorName: 'System',              eventType: 'SLA_BREACHED',         complaintId: 'C005', caseNumber: 'CC-2026-0005', detail: 'CC-2026-0005 resolution deadline passed. No resolution recorded. Escalation recommended.',                                    previousHash: 'd2f7b19e3c0a6485', currentHash: 'e5c0d82a7f4b1937', createdAt: '2026-09-10T09:01:00Z' },
  { id: 'L006', ledgerId: '#1006', actorName: 'Dr. V. Krishnamurthy', eventType: 'STATUS_TRANSITION',   complaintId: 'C002', caseNumber: 'CC-2026-0002', detail: 'Status changed from UNDER_REVIEW → CROSS_BUREAU_REVIEW. Reason: Finance Bureau input required for faculty payroll verification.', previousHash: 'e5c0d82a7f4b1937', currentHash: 'f8a1c47e6d2b0593', createdAt: '2026-09-10T14:00:00Z' },
  { id: 'L007', ledgerId: '#1007', actorName: 'System',              eventType: 'RELATED_CASE_SUGGESTED', complaintId: 'C010', caseNumber: 'CC-2026-0010', detail: 'AI system suggested CC-2026-0010 ↔ CC-2026-0011 as EXACT_IDENTIFIER match (score: 0.97). FDR No. SB-FDR-2024-00412.',   previousHash: 'f8a1c47e6d2b0593', currentHash: 'g9b3e58f1a4c7062', createdAt: '2026-09-29T10:00:00Z' },
  { id: 'L008', ledgerId: '#1008', actorName: 'Dr. V. Krishnamurthy', eventType: 'RELATIONSHIP_CONFIRMED', complaintId: 'C010', caseNumber: 'CC-2026-0010', detail: 'Relationship CC-2026-0010 ↔ CC-2026-0011 confirmed. Reason: Identical FDR number confirmed in both submissions.', previousHash: 'g9b3e58f1a4c7062', currentHash: 'h2d6f91e5b8a3047', createdAt: '2026-09-29T11:00:00Z' },
  { id: 'L009', ledgerId: '#1009', actorName: 'Arjun Sharma',        eventType: 'CASE_TRANSFERRED',     complaintId: 'C002', caseNumber: 'CC-2026-0002', detail: 'CC-2026-0002 transferred from Academic Bureau → Approval Bureau for FDR cross-check. Reason: Joint investigation required.', previousHash: 'h2d6f91e5b8a3047', currentHash: 'i5c0b27f4e9d1683', createdAt: '2026-09-30T09:00:00Z' },
  { id: 'L010', ledgerId: '#1010', actorName: 'Arjun Sharma',        eventType: 'RELATIONSHIP_DISMISSED', complaintId: 'C012', caseNumber: 'CC-2026-0012', detail: 'Relationship CC-2026-0012 ↔ CC-2026-0003 dismissed. Reason: Different institutions, no structural link found.',           previousHash: 'i5c0b27f4e9d1683', currentHash: 'j8a4e63c2f1b7509', createdAt: '2026-10-05T11:30:00Z' },
  { id: 'L011', ledgerId: '#1011', actorName: 'Dr. V. Krishnamurthy', eventType: 'RESOLUTION_RECORDED',  complaintId: 'C009', caseNumber: 'CC-2026-0009', detail: 'CC-2026-0009 resolved. Reason: Institution submitted revised pay slips and confirmed compliance. Monitoring for 3 months.',  previousHash: 'j8a4e63c2f1b7509', currentHash: 'k3d7f18e4a2c9506', createdAt: '2026-08-05T14:00:00Z' },
  { id: 'L012', ledgerId: '#1012', actorName: 'Admin Console',        eventType: 'RULES_PUBLISHED',       complaintId: null,   caseNumber: null,            detail: 'SLA rules v2.1 published. Response target: CRITICAL=3d, HIGH=7d, MEDIUM=14d, LOW=30d.',                                     previousHash: 'k3d7f18e4a2c9506', currentHash: 'l6e0b29f7d4a1823', createdAt: '2026-10-01T10:00:00Z' },
  { id: 'L013', ledgerId: '#1013', actorName: 'System',              eventType: 'OFFICER_LOGIN',         complaintId: null,   caseNumber: null,            detail: 'Officer login: Arjun Sharma (OFFICER, Academic Bureau). Session established.',                                              previousHash: 'l6e0b29f7d4a1823', currentHash: 'm1c4e87b3f6d2940', createdAt: '2026-10-26T09:00:00Z' },
  { id: 'L014', ledgerId: '#1014', actorName: 'Kavitha Reddy',       eventType: 'CASE_REOPENED',         complaintId: 'C016', caseNumber: 'CC-2026-0016', detail: 'CC-2026-0016 reopened. Reason: Exam hall tickets denial requires urgent resolution before semester exam date.',               previousHash: 'm1c4e87b3f6d2940', currentHash: 'n5b8d21f4c7e3065', createdAt: '2026-10-22T08:30:00Z' },
  { id: 'L015', ledgerId: '#1015', actorName: 'System',              eventType: 'REPORT_EXPORTED',       complaintId: null,   caseNumber: null,            detail: 'Complaint register exported as CSV by Dr. V. Krishnamurthy. 20 records included.',                                          previousHash: 'n5b8d21f4c7e3065', currentHash: 'o9a3c56e8b1f4702', createdAt: '2026-10-26T10:00:00Z' },
]

// ============================================================
// NOTIFICATIONS
// ============================================================
export const notifications: Notification[] = [
  { id: 'N001', type: 'SLA_WARNING',    message: 'CC-2026-0016 response deadline in 2 hours. Immediate action required.',      complaintId: 'C016', caseNumber: 'CC-2026-0016', readAt: null,                    createdAt: '2026-10-26T06:00:00Z' },
  { id: 'N002', type: 'CASE_ASSIGNED',  message: 'You have been assigned CC-2026-0013 (Faculty Shortage — Brahmaputra TC).',   complaintId: 'C013', caseNumber: 'CC-2026-0013', readAt: null,                    createdAt: '2026-10-20T11:00:00Z' },
  { id: 'N003', type: 'RELATED_REVIEW', message: 'Related case suggestion pending your review: CC-2026-0001 ↔ CC-2026-0013.',  complaintId: 'C001', caseNumber: 'CC-2026-0001', readAt: null,                    createdAt: '2026-10-01T09:05:00Z' },
  { id: 'N004', type: 'SLA_BREACHED',   message: 'CC-2026-0005 SLA breached. Resolution deadline was 10 Sep 2026.',            complaintId: 'C005', caseNumber: 'CC-2026-0005', readAt: '2026-10-11T09:00:00Z', createdAt: '2026-09-10T09:01:00Z' },
  { id: 'N005', type: 'CASE_REOPENED',  message: 'CC-2026-0016 has been reopened. Review the updated case.',                   complaintId: 'C016', caseNumber: 'CC-2026-0016', readAt: '2026-10-22T09:00:00Z', createdAt: '2026-10-22T08:30:00Z' },
]

export interface DemoAccount {
  name: string
  userId: string
  password: string
  role: Role
  bureauName: string | null
}

export const demoAccounts: DemoAccount[] = [
  { name: 'Arjun Sharma',         userId: 'officer1',     password: 'demo@2026', role: 'OFFICER',       bureauName: 'Academic Bureau' },
  { name: 'Priya Nair',           userId: 'officer2',     password: 'demo@2026', role: 'OFFICER',       bureauName: 'Infrastructure Cell' },
  { name: 'Ramesh Gupta',         userId: 'officer3',     password: 'demo@2026', role: 'OFFICER',       bureauName: 'Finance & Accounts' },
  { name: 'Kavitha Reddy',        userId: 'officer4',     password: 'demo@2026', role: 'OFFICER',       bureauName: 'Student Affairs Cell' },
  { name: 'Mohan Das',            userId: 'coordinator1', password: 'demo@2026', role: 'COORDINATOR',   bureauName: 'Academic Bureau' },
  { name: 'Dr. V. Krishnamurthy', userId: 'supervisor1',  password: 'demo@2026', role: 'SUPERVISOR',    bureauName: null },
  { name: 'Admin Console',        userId: 'admin1',       password: 'demo@2026', role: 'ADMINISTRATOR', bureauName: null },
]

export const DEMO_CAPTCHA = '7K3pQ'
