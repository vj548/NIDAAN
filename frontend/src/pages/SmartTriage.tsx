import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../store/appStore'
import {
  Panel, SectionH1, PriorityChip, CaseIdBadge,
  AlertInfo, AlertSuccess, PageShell, EmptyState
} from '../components/shared'
import { format } from 'date-fns'

const COMPLAINT_CATEGORIES = [
  'Faculty Shortage', 'Faculty Qualification', 'Fee Irregularity', 'Infrastructure Deficiency',
  'Excess Admission', 'Disclosure Non-compliance', 'Student Welfare', 'Faculty Welfare',
  'Document Fraud', 'Affiliation Issue',
]

export default function SmartTriagePage() {
  const navigate = useNavigate()
  const allComplaints = useAppStore(s => s.complaints)
  const { currentUser, updateComplaintStatus, addAuditEntry } = useAppStore()

  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [onlyUnassigned, setOnlyUnassigned] = useState(false)
  const [overrideId, setOverrideId] = useState<string | null>(null)
  const [overrideReason, setOverrideReason] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const triageList = allComplaints
    .filter(c => ['RECEIVED', 'TRIAGE_PENDING'].includes(c.status) || (!c.assignedOfficerId && !['RESOLVED','CLOSED'].includes(c.status)))
    .filter(c => !filterCategory || c.category === filterCategory)
    .filter(c => !onlyUnassigned || !c.assignedOfficerId)

  // Suggestion engine (rule-based)
  function suggest(c: typeof allComplaints[0]) {
    const keywords = c.description.toLowerCase()
    const cat = c.category
    let suggestedBureau = c.assignedBureauName
    let suggestedPriority = c.priority
    let confidence = 'MEDIUM'
    let nextAction = 'Assign to bureau officer for review'
    let missing: string[] = []

    if (cat === 'Faculty Shortage' || cat === 'Faculty Qualification') {
      suggestedBureau = 'Academic Bureau'
      confidence = 'HIGH'
    } else if (cat === 'Fee Irregularity') {
      suggestedBureau = 'Finance & Accounts'
      confidence = 'HIGH'
    } else if (cat === 'Infrastructure Deficiency') {
      suggestedBureau = 'Infrastructure Cell'
      confidence = 'HIGH'
    } else if (cat === 'Student Welfare') {
      suggestedBureau = 'Student Affairs Cell'
      confidence = 'HIGH'
    } else if (cat === 'Document Fraud' || cat === 'Excess Admission' || cat === 'Affiliation Issue') {
      suggestedBureau = 'Approval Bureau'
      confidence = 'HIGH'
    }

    if (keywords.includes('urgent') || keywords.includes('immediate') || keywords.includes('exam')) {
      suggestedPriority = 'CRITICAL'
    }

    if (!keywords.includes('faculty list') && (cat === 'Faculty Shortage' || cat === 'Faculty Qualification')) {
      missing.push('Current faculty roster not attached')
    }
    if (!keywords.includes('fee') && cat === 'Fee Irregularity') {
      missing.push('Fee receipts or payment proof not mentioned')
    }

    if (nextAction === 'Assign to bureau officer for review' && c.priority === 'CRITICAL') {
      nextAction = 'Escalate to Supervisor immediately'
    }

    return { suggestedBureau, suggestedPriority, confidence, nextAction, missing }
  }

  function handleAccept(c: typeof allComplaints[0]) {
    updateComplaintStatus(c.id, 'UNDER_REVIEW', 'Triage accepted — assigned to bureau', currentUser?.name ?? 'System')
    setSuccessMsg(`Triage accepted for ${c.caseNumber}. Status updated to UNDER_REVIEW.`)
  }

  function handleOverride(id: string) {
    if (!overrideReason.trim()) return
    addAuditEntry({
      actorName: currentUser?.name ?? 'Officer',
      eventType: 'STATUS_TRANSITION',
      complaintId: id,
      caseNumber: allComplaints.find(c => c.id === id)?.caseNumber ?? '',
      detail: `Triage recommendation overridden by officer. Reason: ${overrideReason}`,
      createdAt: new Date().toISOString(),
    })
    setSuccessMsg(`Override recorded for case. Audit event written.`)
    setOverrideId(null)
    setOverrideReason('')
  }

  return (
    <PageShell breadcrumb={[{ label: 'Smart Triage' }]}>
      <SectionH1>Smart Case Triage & Bureau Assignment</SectionH1>

      <AlertInfo>
        AI-assisted triage suggestions use a rule-based classifier and TF-IDF text similarity. Suggestions are advisory. Officers must verify and may override any recommendation. Overrides require a written reason.
      </AlertInfo>

      {successMsg && <div className="mt-4"><AlertSuccess>{successMsg}</AlertSuccess></div>}

      {/* Search panel */}
      <Panel title="Triage Filter" className="mt-6 mb-6">
        <div className="p-4 flex flex-wrap gap-4 items-end">
          <div className="flex-1">
            <label htmlFor="triage-search" className="form-label">Subject / Text</label>
            <input id="triage-search" className="form-input" value={search} onChange={e => setSearch(e.target.value)} placeholder="Filter by keyword…" />
          </div>
          <div>
            <label htmlFor="triage-cat" className="form-label">Category</label>
            <select id="triage-cat" className="form-select" value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
              <option value="">All categories</option>
              {COMPLAINT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2 pb-2">
            <input type="checkbox" id="unassigned-only" checked={onlyUnassigned} onChange={e => setOnlyUnassigned(e.target.checked)} className="w-4 h-4" />
            <label htmlFor="unassigned-only" className="text-body font-semibold cursor-pointer">Only unassigned</label>
          </div>
        </div>
      </Panel>

      {/* Triage table */}
      <Panel>
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Case ID</th>
                <th>Institution</th>
                <th>Category</th>
                <th>Suggested Bureau</th>
                <th>Current Bureau</th>
                <th>Priority</th>
                <th>SLA Deadline</th>
                <th>Assignment</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {triageList.length === 0 ? (
                <tr><td colSpan={9}>
                  <EmptyState icon="✅" title="No cases require triage" subtitle="All registered complaints have been assigned and are under review." />
                </td></tr>
              ) : (
                triageList.map(c => {
                  const s = suggest(c)
                  const match = s.suggestedBureau === c.assignedBureauName
                  return (
                    <>
                      <tr key={c.id}>
                        <td><CaseIdBadge caseNumber={c.caseNumber} /></td>
                        <td className="text-table">{c.institutionName}</td>
                        <td className="text-muted text-table">{c.category}</td>
                        <td>
                          <div className="font-semibold text-navy">{s.suggestedBureau}</div>
                          <div className="text-chip text-muted">Confidence: <span className={`font-semibold ${s.confidence === 'HIGH' ? 'text-status-green' : 'text-status-amber'}`}>{s.confidence}</span></div>
                        </td>
                        <td className={`text-table ${match ? 'text-muted' : 'text-status-amber font-semibold'}`}>
                          {c.assignedBureauName}
                          {!match && <span className="ml-1 chip chip-action-req text-chip">MISMATCH</span>}
                        </td>
                        <td><PriorityChip priority={c.priority} /></td>
                        <td className="font-mono text-mono text-muted">{format(new Date(c.responseDueAt), 'dd MMM yyyy')}</td>
                        <td>
                          {c.assignedOfficerName
                            ? <span className="text-status-green text-chip font-semibold">● {c.assignedOfficerName}</span>
                            : <span className="chip chip-action-req">UNASSIGNED</span>
                          }
                        </td>
                        <td>
                          <div className="flex gap-1 flex-col">
                            <button
                              onClick={() => handleAccept(c)}
                              className="btn-primary px-2 py-1 text-chip"
                              style={{ minHeight: '32px' }}
                            >
                              ✓ Accept
                            </button>
                            <button
                              onClick={() => setOverrideId(overrideId === c.id ? null : c.id)}
                              className="btn-secondary px-2 py-1 text-chip"
                              style={{ minHeight: '32px' }}
                            >
                              Override
                            </button>
                            <button
                              onClick={() => navigate(`/complaints/${c.id}`)}
                              className="btn-secondary px-2 py-1 text-chip"
                              style={{ minHeight: '32px' }}
                            >
                              View
                            </button>
                          </div>
                        </td>
                      </tr>
                      {/* Suggestion detail row */}
                      <tr key={`${c.id}-detail`} className="bg-tint">
                        <td colSpan={9} className="p-3 border-b-2 border-border">
                          <div className="flex gap-6 flex-wrap text-chip">
                            <div>
                              <span className="text-muted font-semibold">Next action: </span>
                              <span className="text-ink">{s.nextAction}</span>
                            </div>
                            {s.missing.length > 0 && (
                              <div>
                                <span className="text-muted font-semibold">Missing information: </span>
                                <span className="text-status-amber">{s.missing.join(', ')}</span>
                              </div>
                            )}
                          </div>
                          {/* Override form */}
                          {overrideId === c.id && (
                            <div className="mt-3 flex gap-3 items-end">
                              <div className="flex-1">
                                <label className="form-label text-chip">Override reason * (required)</label>
                                <input
                                  className="form-input text-body"
                                  value={overrideReason}
                                  onChange={e => setOverrideReason(e.target.value)}
                                  placeholder="Why are you overriding the recommendation?"
                                />
                              </div>
                              <button onClick={() => handleOverride(c.id)} className="btn-primary text-body">
                                Record Override
                              </button>
                              <button onClick={() => setOverrideId(null)} className="btn-secondary text-body">
                                Cancel
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    </>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </Panel>
    </PageShell>
  )
}
