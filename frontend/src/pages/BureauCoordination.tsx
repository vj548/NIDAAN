import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../store/appStore'
import {
  Panel, SectionH1, StatusChip, PriorityChip, CaseIdBadge,
  AlertInfo, AlertWarning, PageShell, Modal, AlertSuccess
} from '../components/shared'
import { bureaus, users } from '../data/seed'
import { format, differenceInDays } from 'date-fns'

export default function BureauCoordinationPage() {
  const navigate = useNavigate()
  const allComplaints = useAppStore(s => s.complaints)
  const { assignComplaint, currentUser } = useAppStore()
  const [transferModal, setTransferModal] = useState<string | null>(null)
  const [transferBureau, setTransferBureau] = useState('')
  const [transferOfficer, setTransferOfficer] = useState('')
  const [transferNote, setTransferNote] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  // Bureau summary
  const bureauSummary = bureaus.map(b => {
    const bComplaints = allComplaints.filter(c => c.assignedBureauId === b.id)
    const open = bComplaints.filter(c => !['RESOLVED','CLOSED'].includes(c.status))
    return {
      ...b,
      open: open.length,
      unassigned: open.filter(c => !c.assignedOfficerId).length,
      high: open.filter(c => ['CRITICAL','HIGH'].includes(c.priority)).length,
      slaRisk: open.filter(c => ['SLA_AT_RISK','SLA_BREACHED'].includes(c.status)).length,
      breached: open.filter(c => c.status === 'SLA_BREACHED').length,
      medianAge: open.length > 0
        ? Math.round(open.reduce((s, c) => s + differenceInDays(new Date(), new Date(c.filedAt)), 0) / open.length)
        : 0,
      officers: [...new Set(open.filter(c => c.assignedOfficerId).map(c => c.assignedOfficerId))].length,
    }
  })

  // Officer workload
  const officerWorkload = users.filter(u => ['OFFICER','COORDINATOR'].includes(u.role)).map(u => {
    const assigned = allComplaints.filter(c => c.assignedOfficerId === u.id && !['RESOLVED','CLOSED'].includes(c.status))
    const high = assigned.filter(c => ['CRITICAL','HIGH'].includes(c.priority))
    const slaRisk = assigned.filter(c => ['SLA_AT_RISK','SLA_BREACHED'].includes(c.status))
    const oldest = assigned.sort((a, b) => new Date(a.filedAt).getTime() - new Date(b.filedAt).getTime())[0]
    let suggestion = '—'
    if (slaRisk.length > 0) suggestion = '⚠ SLA risk — review immediately'
    else if (assigned.length > 5) suggestion = 'High workload — consider rebalancing'
    else if (assigned.length === 0) suggestion = '✓ Available for assignment'
    return { ...u, active: assigned.length, high: high.length, slaRisk: slaRisk.length, oldest, suggestion }
  })

  const unassignedComplaints = allComplaints.filter(c => !c.assignedOfficerId && !['RESOLVED','CLOSED'].includes(c.status))

  function handleTransfer() {
    if (!transferModal || !transferOfficer) return
    const officer = users.find(u => u.id === transferOfficer)
    const bureau = bureaus.find(b => b.id === transferBureau)
    if (!officer || !bureau) return
    assignComplaint(transferModal, officer.id, officer.name, bureau.id, bureau.name, currentUser?.name ?? 'System')
    setSuccessMsg(`Case transferred to ${officer.name} (${bureau.name}). Audit event recorded.`)
    setTransferModal(null)
    setTransferBureau('')
    setTransferOfficer('')
    setTransferNote('')
  }

  return (
    <PageShell breadcrumb={[{ label: 'Bureau Coordination' }]}>
      <SectionH1>Bureau Coordination & Workload</SectionH1>

      {successMsg && <div className="mb-4"><AlertSuccess>{successMsg}</AlertSuccess></div>}

      {/* Bureau summary table */}
      <Panel title="Bureau Summary" className="mb-6">
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Bureau</th>
                <th>Open Cases</th>
                <th>Unassigned</th>
                <th>High Priority</th>
                <th>SLA At Risk</th>
                <th>SLA Breached</th>
                <th>Median Age (d)</th>
                <th>Officers</th>
              </tr>
            </thead>
            <tbody>
              {bureauSummary.map(b => (
                <tr key={b.id}>
                  <td className="font-semibold">{b.name}</td>
                  <td className="font-mono text-mono font-bold text-navy">{b.open}</td>
                  <td>
                    {b.unassigned > 0
                      ? <span className="chip chip-action-req">{b.unassigned}</span>
                      : <span className="text-muted">—</span>
                    }
                  </td>
                  <td>
                    {b.high > 0
                      ? <span className="chip chip-high">{b.high}</span>
                      : <span className="text-muted">—</span>
                    }
                  </td>
                  <td>
                    {b.slaRisk > 0
                      ? <span className="chip chip-sla-risk">{b.slaRisk}</span>
                      : <span className="text-muted">—</span>
                    }
                  </td>
                  <td>
                    {b.breached > 0
                      ? <span className="chip chip-sla-breached">{b.breached}</span>
                      : <span className="text-muted">—</span>
                    }
                  </td>
                  <td className="font-mono text-mono">{b.medianAge}d</td>
                  <td className="font-mono text-mono">{b.officers}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* Unassigned cases */}
      {unassignedComplaints.length > 0 && (
        <div className="mb-6">
          <AlertWarning>
            <strong>{unassignedComplaints.length} unassigned case{unassignedComplaints.length > 1 ? 's' : ''}</strong> require bureau assignment. Cases are listed in the workload table below.
          </AlertWarning>
        </div>
      )}

      {/* Officer workload */}
      <Panel title="Officer Workload" className="mb-6">
        <div className="p-3">
          <AlertInfo>
            Workload recommendations are rule-based and advisory. Only an authorized person may apply reassignment. All assignments are logged in the audit ledger.
          </AlertInfo>
        </div>
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Officer</th>
                <th>Bureau</th>
                <th>Active Cases</th>
                <th>High Priority</th>
                <th>SLA At Risk</th>
                <th>Oldest Case</th>
                <th>Recommendation</th>
              </tr>
            </thead>
            <tbody>
              {officerWorkload.map(o => (
                <tr key={o.id}>
                  <td className="font-semibold">{o.name}</td>
                  <td className="text-muted text-table">{o.bureauName ?? '—'}</td>
                  <td className="font-mono text-mono font-bold text-navy">{o.active}</td>
                  <td>
                    {o.high > 0 ? <span className="chip chip-high">{o.high}</span> : <span className="text-muted">—</span>}
                  </td>
                  <td>
                    {o.slaRisk > 0 ? <span className="chip chip-sla-risk">{o.slaRisk}</span> : <span className="text-muted">—</span>}
                  </td>
                  <td className="font-mono text-mono text-muted">
                    {o.oldest ? format(new Date(o.oldest.filedAt), 'dd MMM') : '—'}
                  </td>
                  <td className={`text-chip ${o.slaRisk > 0 ? 'text-status-amber font-semibold' : o.active === 0 ? 'text-status-green' : 'text-muted'}`}>
                    {o.suggestion}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* Unassigned complaints table */}
      <Panel title="Unassigned & At-Risk Complaints">
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Case ID</th>
                <th>Institution</th>
                <th>Category</th>
                <th>Bureau</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {allComplaints
                .filter(c => (!c.assignedOfficerId || ['SLA_AT_RISK','SLA_BREACHED','ACTION_REQUIRED'].includes(c.status)) && !['RESOLVED','CLOSED'].includes(c.status))
                .map(c => (
                  <tr key={c.id}>
                    <td><CaseIdBadge caseNumber={c.caseNumber} /></td>
                    <td className="text-table">{c.institutionName}</td>
                    <td className="text-muted text-table">{c.category}</td>
                    <td className="text-table">{c.assignedBureauName}</td>
                    <td><PriorityChip priority={c.priority} /></td>
                    <td><StatusChip status={c.status} /></td>
                    <td>
                      <div className="flex gap-1">
                        <button
                          onClick={() => navigate(`/complaints/${c.id}`)}
                          className="btn-secondary px-2 py-1 text-chip"
                          style={{ minHeight: '32px' }}
                        >
                          View
                        </button>
                        <button
                          onClick={() => setTransferModal(c.id)}
                          className="btn-secondary px-2 py-1 text-chip"
                          style={{ minHeight: '32px' }}
                        >
                          Assign
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* Transfer/assign modal */}
      {transferModal && (
        <Modal title="Transfer / Assign Case" onClose={() => setTransferModal(null)}>
          <div className="space-y-4">
            <div>
              <label htmlFor="tb" className="form-label">Target Bureau</label>
              <select id="tb" className="form-select" value={transferBureau} onChange={e => setTransferBureau(e.target.value)}>
                <option value="">Select bureau…</option>
                {bureaus.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="to" className="form-label">Assign to Officer</label>
              <select id="to" className="form-select" value={transferOfficer} onChange={e => setTransferOfficer(e.target.value)}>
                <option value="">Select officer…</option>
                {users.filter(u => ['OFFICER','COORDINATOR'].includes(u.role)).map(u => (
                  <option key={u.id} value={u.id}>{u.name} — {u.bureauName}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="tn" className="form-label">Handover Note</label>
              <textarea id="tn" className="form-textarea" value={transferNote} onChange={e => setTransferNote(e.target.value)} placeholder="Note for receiving officer…" rows={3} />
            </div>
            <div className="flex gap-3">
              <button onClick={handleTransfer} className="btn-primary">Confirm Transfer</button>
              <button onClick={() => setTransferModal(null)} className="btn-secondary">Cancel</button>
            </div>
          </div>
        </Modal>
      )}
    </PageShell>
  )
}
