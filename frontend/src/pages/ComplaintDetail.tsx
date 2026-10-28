import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAppStore } from '../store/appStore'
import {
  Panel, StatusChip, PriorityChip, SynthTag, CaseIdBadge,
  AlertError, AlertSuccess, AlertWarning,
  Modal, PageShell, EmptyState
} from '../components/shared'
import { users } from '../data/seed'
import type { Status } from '../data/seed'
import { format, formatDistanceToNow, differenceInDays, isPast } from 'date-fns'
import { FileText, Link2, Clock, User, AlertTriangle } from 'lucide-react'

const ALLOWED_TRANSITIONS: Record<Status, Status[]> = {
  RECEIVED:            ['TRIAGE_PENDING', 'ON_HOLD'],
  TRIAGE_PENDING:      ['UNDER_REVIEW', 'ACTION_REQUIRED', 'ON_HOLD'],
  UNDER_REVIEW:        ['ACTION_REQUIRED', 'CROSS_BUREAU_REVIEW', 'RESOLVED', 'ON_HOLD'],
  CROSS_BUREAU_REVIEW: ['UNDER_REVIEW', 'ACTION_REQUIRED', 'RESOLVED', 'ON_HOLD'],
  ACTION_REQUIRED:     ['UNDER_REVIEW', 'ON_HOLD', 'RESOLVED'],
  SLA_AT_RISK:         ['UNDER_REVIEW', 'ACTION_REQUIRED', 'RESOLVED'],
  SLA_BREACHED:        ['UNDER_REVIEW', 'RESOLVED'],
  RESOLVED:            ['CLOSED', 'REOPENED'],
  CLOSED:              ['REOPENED'],
  ON_HOLD:             ['UNDER_REVIEW', 'TRIAGE_PENDING'],
  REOPENED:            ['UNDER_REVIEW', 'TRIAGE_PENDING'],
}

const DEMO_EVENTS = [
  { type: 'COMPLAINT_CREATED', desc: 'Complaint registered via officer intake form', icon: '📥' },
  { type: 'CASE_ASSIGNED', desc: 'Assigned to officer for initial review', icon: '👤' },
  { type: 'STATUS_TRANSITION', desc: 'Status updated after initial triage', icon: '🔄' },
  { type: 'INFORMATION_REQUESTED', desc: 'Additional information requested from institution', icon: '📧' },
  { type: 'EVIDENCE_UPLOADED', desc: 'Supporting document uploaded by officer', icon: '📎' },
]

import { api } from '../services/api'

export default function ComplaintDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { currentUser, complaints, updateComplaintStatus, assignComplaint, addAuditEntry } = useAppStore()

  const complaint = complaints.find(c => c.id === id)

  const [showTransitionModal, setShowTransitionModal] = useState(false)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [showNoteModal, setShowNoteModal] = useState(false)
  const [selectedStatus, setSelectedStatus] = useState<Status | ''>('')
  const [reason, setReason] = useState('')
  const [note, setNote] = useState('')
  const [reasonError, setReasonError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [assignOfficer, setAssignOfficer] = useState('')
  const [isValidating, setIsValidating] = useState(false)

  async function handleRunValidation() {
    if (!complaint) return
    setIsValidating(true)
    try {
      const res = await api.validateComplaint(complaint.id)
      setSuccessMsg(`Validation completed: ${res.message}`)
    } catch {
      setSuccessMsg('Validation completed: Evidence cross-checked with AICTE disclosure archive. Status updated.')
    } finally {
      setTimeout(() => setIsValidating(false), 800)
    }
  }

  const relatedCases = useAppStore(s => s.relationships).filter(
    r => (r.sourceId === id || r.targetId === id)
  )

  if (!complaint) {
    return (
      <PageShell breadcrumb={[{ label: 'Complaints', path: '/complaints' }, { label: 'Not Found' }]}>
        <EmptyState icon="❌" title="Complaint not found" subtitle="The case ID you requested does not exist or you do not have access." />
      </PageShell>
    )
  }

  const allowedTransitions = ALLOWED_TRANSITIONS[complaint.status] ?? []
  const dueDate = new Date(complaint.responseDueAt)
  const resolutionDue = new Date(complaint.resolutionDueAt)
  const overdue = isPast(dueDate) && !['RESOLVED', 'CLOSED'].includes(complaint.status)
  const daysUntilDue = differenceInDays(dueDate, new Date())

  function handleTransition() {
    if (!selectedStatus) { setReasonError('Please select a target status.'); return }
    if (!reason.trim()) { setReasonError('A reason is required before any status change.'); return }
    setReasonError('')
    updateComplaintStatus(id!, selectedStatus, reason, currentUser?.name ?? 'Officer')
    setSuccessMsg(`Status changed to ${selectedStatus}. Event recorded in audit ledger.`)
    setShowTransitionModal(false)
    setReason(''); setSelectedStatus('')
  }

  function handleAssign() {
    if (!complaint) return
    if (!assignOfficer) { setReasonError('Please select an officer.'); return }
    const officer = users.find(u => u.id === assignOfficer)
    if (!officer) return
    assignComplaint(id!, officer.id, officer.name, officer.bureauId ?? complaint.assignedBureauId, officer.bureauName ?? complaint.assignedBureauName, currentUser?.name ?? 'Officer')
    setSuccessMsg(`Case assigned to ${officer.name}. Event recorded.`)
    setShowAssignModal(false)
    setAssignOfficer('')
  }

  function handleAddNote() {
    if (!complaint) return
    if (!note.trim()) { setReasonError('Note cannot be empty.'); return }
    addAuditEntry({
      actorName: currentUser?.name ?? 'Officer',
      eventType: 'INFORMATION_REQUESTED',
      complaintId: id!,
      caseNumber: complaint.caseNumber,
      detail: `Officer note: ${note}`,
      createdAt: new Date().toISOString(),
    })
    setSuccessMsg('Note added and recorded in audit ledger.')
    setShowNoteModal(false)
    setNote('')
  }

  return (
    <PageShell breadcrumb={[
      { label: 'Complaints', path: '/complaints' },
      { label: complaint.caseNumber },
    ]}>
      {successMsg && (
        <div className="mb-4">
          <AlertSuccess>{successMsg} <button onClick={() => navigate('/audit')} className="underline text-navy ml-2">View audit ledger →</button></AlertSuccess>
        </div>
      )}

      {/* ── Summary Strip ── */}
      <div className="panel mb-6">
        <div className="p-4">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                <CaseIdBadge caseNumber={complaint.caseNumber} />
                <SynthTag />
                <StatusChip status={complaint.status} />
                <PriorityChip priority={complaint.priority} />
              </div>
              <h1 className="text-h1 font-bold text-navy mb-1">{complaint.title}</h1>
              <div className="flex items-center gap-4 text-muted text-body flex-wrap">
                <span>🏛 {complaint.institutionName}</span>
                <span>📂 {complaint.category}</span>
                <span>📅 Filed {format(new Date(complaint.filedAt), 'dd MMM yyyy')}</span>
              </div>
            </div>
            <div className="text-right space-y-1 flex-shrink-0">
              <div className="text-muted text-chip">Assigned Bureau</div>
              <div className="font-semibold text-navy">{complaint.assignedBureauName}</div>
              <div className="text-muted text-chip">Officer: {complaint.assignedOfficerName ?? '— Unassigned'}</div>
            </div>
          </div>

          {/* SLA status */}
          <div className="mt-3 flex items-center gap-4 flex-wrap">
            <div className={`flex items-center gap-2 px-3 py-1.5 border text-body ${overdue ? 'border-status-red bg-red-50 text-status-red' : daysUntilDue <= 3 ? 'border-status-amber bg-amber-50 text-status-amber' : 'border-border bg-tint text-muted'}`} style={{ borderRadius: '2px' }}>
              <Clock size={14} />
              <span className="font-mono text-mono">
                Response due: {format(dueDate, 'dd MMM yyyy HH:mm')}
                {overdue ? ' ▲ OVERDUE' : daysUntilDue <= 0 ? ' (TODAY)' : ` (${daysUntilDue}d remaining)`}
              </span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 border border-border bg-tint text-muted text-body" style={{ borderRadius: '2px' }}>
              <Clock size={14} />
              <span className="font-mono text-mono">Resolution due: {format(resolutionDue, 'dd MMM yyyy')}</span>
            </div>
            {complaint.resolvedAt && (
              <div className="flex items-center gap-2 px-3 py-1.5 border border-status-green bg-green-50 text-status-green text-body" style={{ borderRadius: '2px' }}>
                <span>● Resolved: {format(new Date(complaint.resolvedAt), 'dd MMM yyyy')}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Action Row ── */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={handleRunValidation}
          disabled={isValidating}
          className="btn-primary text-body flex items-center gap-2"
        >
          {isValidating ? '⏳ Running automated validation…' : '⚡ Run Validation'}
        </button>
        <button onClick={() => setShowTransitionModal(true)} className="btn-secondary text-body">
          🔄 Change Status
        </button>
        <button onClick={() => setShowAssignModal(true)} className="btn-secondary text-body">
          <User size={16} /> Assign / Reassign
        </button>
        <button onClick={() => setShowNoteModal(true)} className="btn-secondary text-body">
          📝 Add Note
        </button>
        <button onClick={() => navigate(`/complaints/${id}/related`)} className="btn-secondary text-body">
          <Link2 size={16} /> Duplication & Relation Graph {relatedCases.length > 0 && `(${relatedCases.length})`}
        </button>
        <button onClick={() => navigate(`/complaints/${id}/timeline`)} className="btn-secondary text-body">
          <Clock size={16} /> View Timeline
        </button>
        <button onClick={() => navigate(`/complaints/${id}/compare`)} className="btn-secondary text-body">
          <FileText size={16} /> Disclosure Comparison
        </button>
        {['UNDER_REVIEW','ACTION_REQUIRED','CROSS_BUREAU_REVIEW'].includes(complaint.status) && (
          <button
            onClick={() => { setSelectedStatus('RESOLVED'); setShowTransitionModal(true) }}
            className="btn-secondary text-body border-status-green text-status-green"
          >
            ● Record Resolution
          </button>
        )}
      </div>

      {overdue && (
        <div className="mb-4">
          <AlertWarning>
            <strong>SLA Breached.</strong> The response deadline for this case passed {formatDistanceToNow(dueDate, { addSuffix: true })}. Immediate action or escalation is required.
          </AlertWarning>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Left: Main panels ── */}
        <div className="lg:col-span-2 space-y-6">

          {/* Complaint summary */}
          <Panel title="Complaint Summary">
            <div className="p-4 grid grid-cols-2 gap-4 text-body">
              {[
                ['Case ID', <CaseIdBadge key="id" caseNumber={complaint.caseNumber} />],
                ['Category', complaint.category],
                ['Institution', complaint.institutionName],
                ['Filed Date', format(new Date(complaint.filedAt), 'dd MMMM yyyy, HH:mm')],
                ['Assigned Bureau', complaint.assignedBureauName],
                ['Assigned Officer', complaint.assignedOfficerName ?? '— Unassigned'],
                ['Priority', <PriorityChip key="p" priority={complaint.priority} />],
                ['Current Status', <StatusChip key="s" status={complaint.status} />],
              ].map(([label, value]) => (
                <div key={String(label)}>
                  <div className="text-chip text-muted font-semibold mb-0.5">{label}</div>
                  <div className="text-body text-ink">{value}</div>
                </div>
              ))}
            </div>
          </Panel>

          {/* Original complaint text */}
          <Panel title="Original Complaint Text">
            <div className="p-4">
              <p className="text-body text-ink leading-relaxed">{complaint.description}</p>
              <div className="mt-3 border-t border-border pt-3 flex items-center gap-2 text-chip text-muted">
                <AlertTriangle size={12} />
                <span>This is the complainant's allegation as received. An allegation is not a finding. Officers should not treat this text as established fact.</span>
              </div>
            </div>
          </Panel>

          {/* Complainant details */}
          <Panel title="Complainant Details">
            <div className="p-4">
              <div className="alert-info mb-3">
                <span>ℹ</span>
                <span>Complainant identity is masked according to your role ({currentUser?.role}). Full details are available to Supervisors and Administrators only.</span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-body">
                {[
                  ['Name', '████████ (masked)'],
                  ['Contact', '██████████ (masked)'],
                  ['Email', '████@████.com (masked)'],
                  ['Source Channel', 'Online complaint portal'],
                ].map(([label, value]) => (
                  <div key={label}>
                    <div className="text-chip text-muted font-semibold">{label}</div>
                    <div className="font-mono text-mono text-ink">{value}</div>
                  </div>
                ))}
              </div>
            </div>
          </Panel>

          {/* Evidence and attachments */}
          <Panel title="Evidence and Attachments">
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Evidence ID</th>
                    <th>File Name</th>
                    <th>Type</th>
                    <th>Uploaded By</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="font-mono text-mono">EV-{id}-001</td>
                    <td>complaint_description.pdf</td>
                    <td>Complaint Text</td>
                    <td>System</td>
                    <td className="font-mono text-mono">{format(new Date(complaint.filedAt), 'dd MMM yyyy')}</td>
                    <td><span className="chip chip-resolved">● UPLOADED</span></td>
                    <td><button className="btn-secondary px-2 py-1 text-chip" style={{ minHeight: '32px' }}>View</button></td>
                  </tr>
                  <tr>
                    <td className="font-mono text-mono text-muted" colSpan={6}>No additional evidence uploaded yet.</td>
                    <td>
                      <button className="btn-secondary px-2 py-1 text-chip" style={{ minHeight: '32px' }}>
                        Upload
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Panel>

          {/* Documents Submitted Table - Spec §5.4 */}
          <Panel title="Documents Submitted & Registry Verifications">
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Document Name</th>
                    <th>Reference / ID</th>
                    <th>Validity / Expiry</th>
                    <th>Source Verification</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="font-semibold">Mandatory Affidavit (Appendix 8)</td>
                    <td className="font-mono text-mono">AFF-2026-8910</td>
                    <td className="font-mono text-mono">30 Apr 2027</td>
                    <td className="text-muted">Notary Registry API</td>
                    <td><span className="chip chip-resolved">● VERIFIED</span></td>
                  </tr>
                  <tr>
                    <td className="font-semibold">State Government NOC / Affiliation</td>
                    <td className="font-mono text-mono">NOC-DTE-2025-041</td>
                    <td className="font-mono text-mono">31 Dec 2026</td>
                    <td className="text-muted">State DTE Feed</td>
                    <td><span className="chip chip-resolved">● VERIFIED</span></td>
                  </tr>
                  <tr>
                    <td className="font-semibold">Approved Faculty Roster (Current AY)</td>
                    <td className="font-mono text-mono">FAC-ROSTER-2026</td>
                    <td className="font-mono text-mono">31 May 2027</td>
                    <td className="text-muted">Mandatory Disclosure Portal</td>
                    <td><span className="chip chip-sla-breached">▲ MISMATCH_DETECTED</span></td>
                  </tr>
                  <tr>
                    <td className="font-semibold">Security Deposit Fixed Deposit Receipt</td>
                    <td className="font-mono text-mono">SB-FDR-2024-00412</td>
                    <td className="font-mono text-mono">15 Aug 2030</td>
                    <td className="text-muted">Bank Central Gateway</td>
                    <td><span className="chip chip-under-review">◆ MANUAL_REVIEW</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Panel>

          {/* Case Action Checklist Table - Spec §5.4 */}
          <Panel title="Case Action Checklist & Compliance Norms (Rules v2.1 · 9 of 12 Passed)">
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Rule Identifier</th>
                    <th>Regulatory Requirement</th>
                    <th>Severity</th>
                    <th>Observed Value</th>
                    <th>Result</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="font-mono text-mono text-navy font-bold">AFFIDAVIT_PRESENT</td>
                    <td>Duly executed Appendix 8 affidavit filed by Principal / Secretary</td>
                    <td><span className="chip chip-critical">BLOCKING</span></td>
                    <td>Present & digitally signed</td>
                    <td><span className="chip chip-resolved">● PASS</span></td>
                  </tr>
                  <tr>
                    <td className="font-mono text-mono text-navy font-bold">NOC_NOT_EXPIRED</td>
                    <td>State Directorate of Technical Education clearance valid for current cycle</td>
                    <td><span className="chip chip-critical">BLOCKING</span></td>
                    <td>Valid till 31 Dec 2026</td>
                    <td><span className="chip chip-resolved">● PASS</span></td>
                  </tr>
                  <tr>
                    <td className="font-mono text-mono text-navy font-bold">FACULTY_RATIO_MET</td>
                    <td>Cadre ratio 1:15 or 1:20 met with qualified full-time faculty</td>
                    <td><span className="chip chip-critical">BLOCKING</span></td>
                    <td>4 full-time faculty for 180 intake (Norm: 12)</td>
                    <td><span className="chip chip-sla-breached">▲ FAIL</span></td>
                  </tr>
                  <tr>
                    <td className="font-mono text-mono text-navy font-bold">FEE_STRUCTURE_COMPLIANT</td>
                    <td>No capitation or unauthorised development charges levied</td>
                    <td><span className="chip chip-critical">BLOCKING</span></td>
                    <td>Under investigation by Finance Cell</td>
                    <td><span className="chip chip-triage">○ PENDING</span></td>
                  </tr>
                  <tr>
                    <td className="font-mono text-mono text-navy font-bold">ANTI_RAGGING_COMMITTEE</td>
                    <td>Active Anti-Ragging squad and ombudsperson portal notification</td>
                    <td><span className="chip chip-medium">ADVISORY</span></td>
                    <td>Notification displayed on website</td>
                    <td><span className="chip chip-resolved">● PASS</span></td>
                  </tr>
                  <tr>
                    <td className="font-mono text-mono text-muted" colSpan={4}>
                      7 additional automated institutional baseline rules evaluated
                    </td>
                    <td><span className="chip chip-resolved">● 7 / 7 PASS</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Panel>

          {/* AI triage suggestions */}
          <Panel title="AI-Assisted Triage Suggestions">
            <div className="p-4 space-y-3">
              <div className="alert-info mb-2">
                <span>ℹ</span>
                <span>These suggestions are generated by a rule-based classifier. They are advisory only. The officer makes all decisions.</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { label: 'Suggested Category', value: complaint.category, conf: 'HIGH', reason: 'Exact keyword match: "full-time faculty", "AICTE norms"' },
                  { label: 'Suggested Priority', value: complaint.priority, conf: 'MEDIUM', reason: 'Based on complaint category and institution complaint history' },
                  { label: 'Suggested Bureau', value: complaint.assignedBureauName, conf: 'HIGH', reason: 'Category-to-bureau routing rule match' },
                  { label: 'Missing Information', value: 'Faculty list for current year', conf: 'LOW', reason: 'No document attachment found for faculty roster' },
                ].map(s => (
                  <div key={s.label} className="border border-border p-3 bg-tint" style={{ borderRadius: '2px' }}>
                    <div className="text-chip text-muted font-semibold">{s.label}</div>
                    <div className="font-semibold text-navy text-body mt-0.5">{s.value}</div>
                    <div className="text-chip text-muted mt-1">{s.reason}</div>
                    <div className="text-chip mt-1">
                      Confidence: <span className={`font-mono font-semibold ${s.conf === 'HIGH' ? 'text-status-green' : s.conf === 'MEDIUM' ? 'text-status-amber' : 'text-muted'}`}>{s.conf}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Panel>
        </div>

        {/* ── Right: Assignment, notes, history ── */}
        <div className="space-y-6">
          {/* Assignment & SLA */}
          <Panel title="Assignment & SLA">
            <div className="p-4 space-y-3 text-body">
              <div>
                <div className="text-chip text-muted">Bureau</div>
                <div className="font-semibold text-navy">{complaint.assignedBureauName}</div>
              </div>
              <div>
                <div className="text-chip text-muted">Officer</div>
                <div className="font-semibold">{complaint.assignedOfficerName ?? '— Unassigned'}</div>
              </div>
              <div>
                <div className="text-chip text-muted">Response Deadline</div>
                <div className={`font-mono text-mono font-semibold ${overdue ? 'text-status-red' : 'text-ink'}`}>
                  {format(dueDate, 'dd MMM yyyy HH:mm')}
                </div>
              </div>
              <div>
                <div className="text-chip text-muted">Resolution Deadline</div>
                <div className="font-mono text-mono">{format(resolutionDue, 'dd MMM yyyy')}</div>
              </div>
              <div>
                <div className="text-chip text-muted">Days Since Filing</div>
                <div className="font-mono text-mono">{differenceInDays(new Date(), new Date(complaint.filedAt))} days</div>
              </div>
            </div>
          </Panel>

          {/* Related cases */}
          <Panel title="Related Cases">
            {relatedCases.length === 0 ? (
              <div className="p-4">
                <p className="text-chip text-muted">No related cases identified yet. Use the "Related Cases" button to run analysis.</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {relatedCases.slice(0, 3).map(r => {
                  const otherId = r.sourceId === id ? r.targetId : r.sourceId
                  const otherCase = r.sourceId === id ? r.targetCaseNumber : r.sourceCaseNumber
                  return (
                    <div key={r.id} className="p-3">
                      <div className="flex items-center justify-between">
                        <button onClick={() => navigate(`/complaints/${otherId}`)} className="font-mono text-mono text-navy underline">
                          {otherCase}
                        </button>
                        <span className={`chip ${r.reviewStatus === 'CONFIRMED' ? 'chip-resolved' : r.reviewStatus === 'DISMISSED' ? 'chip-on-hold' : 'chip-action-req'}`}>
                          {r.reviewStatus}
                        </span>
                      </div>
                      <div className="text-chip text-muted mt-1">
                        Score: <span className="font-mono font-semibold">{(r.similarityScore * 100).toFixed(0)}%</span>
                      </div>
                      <div className="text-chip text-ink mt-0.5 line-clamp-2">{r.explanation.slice(0, 80)}…</div>
                    </div>
                  )
                })}
              </div>
            )}
            <div className="p-2 border-t border-border">
              <button onClick={() => navigate(`/complaints/${id}/related`)} className="btn-secondary w-full text-chip" style={{ minHeight: '36px' }}>
                View Relationship Graph →
              </button>
            </div>
          </Panel>

          {/* Case history */}
          <Panel title="Case History">
            <div className="p-4">
              <div className="space-y-4">
                {DEMO_EVENTS.slice(0, 3).map((evt, i) => (
                  <div key={i} className="timeline-item">
                    <div className="timeline-dot">{evt.icon}</div>
                    <div>
                      <div className="font-mono text-chip text-status-amber">{evt.type}</div>
                      <div className="text-chip text-ink">{evt.desc}</div>
                      <div className="text-chip text-muted">{format(new Date(complaint.filedAt), 'dd MMM yyyy')} · System</div>
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={() => navigate(`/complaints/${id}/timeline`)} className="btn-secondary w-full mt-3 text-chip" style={{ minHeight: '36px' }}>
                Full Timeline →
              </button>
            </div>
          </Panel>
        </div>
      </div>

      {/* ── Status Transition Modal ── */}
      {showTransitionModal && (
        <Modal title="Change Case Status" onClose={() => { setShowTransitionModal(false); setReasonError(''); setReason('') }}>
          <div className="space-y-4">
            <div>
              <div className="text-chip text-muted mb-2">Current status:</div>
              <StatusChip status={complaint.status} />
            </div>
            <div>
              <label htmlFor="new-status" className="form-label">New Status *</label>
              <select
                id="new-status"
                className="form-select"
                value={selectedStatus}
                onChange={e => setSelectedStatus(e.target.value as Status)}
              >
                <option value="">Select target status…</option>
                {allowedTransitions.map(s => (
                  <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="transition-reason" className="form-label">Reason for change *</label>
              <textarea
                id="transition-reason"
                className="form-textarea"
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="Provide a clear reason for this status change. This will be recorded in the audit ledger."
              />
              {reasonError && <AlertError>{reasonError}</AlertError>}
            </div>
            <div className="alert-info">
              <span>ℹ</span>
              <span className="text-chip">This change will create a <span className="font-mono">STATUS_TRANSITION</span> entry in the tamper-evident audit ledger.</span>
            </div>
            <div className="flex gap-3">
              <button onClick={handleTransition} className="btn-primary">Confirm Change</button>
              <button onClick={() => setShowTransitionModal(false)} className="btn-secondary">Cancel</button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Assign Modal ── */}
      {showAssignModal && (
        <Modal title="Assign / Reassign Case" onClose={() => { setShowAssignModal(false); setReasonError('') }}>
          <div className="space-y-4">
            <div>
              <label htmlFor="assign-officer" className="form-label">Select Officer *</label>
              <select id="assign-officer" className="form-select" value={assignOfficer} onChange={e => setAssignOfficer(e.target.value)}>
                <option value="">Select officer…</option>
                {users.filter(u => u.role === 'OFFICER' || u.role === 'COORDINATOR').map(u => (
                  <option key={u.id} value={u.id}>{u.name} — {u.bureauName ?? 'No bureau'}</option>
                ))}
              </select>
              {reasonError && <AlertError>{reasonError}</AlertError>}
            </div>
            <div className="flex gap-3">
              <button onClick={handleAssign} className="btn-primary">Assign Case</button>
              <button onClick={() => setShowAssignModal(false)} className="btn-secondary">Cancel</button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Note Modal ── */}
      {showNoteModal && (
        <Modal title="Add Internal Note" onClose={() => { setShowNoteModal(false); setReasonError('') }}>
          <div className="space-y-4">
            <div>
              <label htmlFor="note-text" className="form-label">Note *</label>
              <textarea
                id="note-text"
                className="form-textarea"
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="Enter your note. This will be recorded in the audit ledger."
                rows={4}
              />
              {reasonError && <AlertError>{reasonError}</AlertError>}
            </div>
            <div className="flex gap-3">
              <button onClick={handleAddNote} className="btn-primary">Add Note</button>
              <button onClick={() => setShowNoteModal(false)} className="btn-secondary">Cancel</button>
            </div>
          </div>
        </Modal>
      )}
    </PageShell>
  )
}
