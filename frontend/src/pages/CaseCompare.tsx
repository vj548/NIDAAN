import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAppStore } from '../store/appStore'
import { Panel, SectionH1, CaseIdBadge, StatusChip, PriorityChip, AlertInfo, PageShell, EmptyState } from '../components/shared'
import { format, differenceInDays } from 'date-fns'

type FieldStatus = 'CONSISTENT' | 'CHANGED' | 'NOT_AVAILABLE' | 'REQUIRES_REVIEW'

export default function CaseComparePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const allComplaints = useAppStore(s => s.complaints)
  const [showDiffOnly, setShowDiffOnly] = useState(false)
  const [selectedId, setSelectedId] = useState('')

  const caseA = allComplaints.find(c => c.id === id)
  const caseB = allComplaints.find(c => c.id === selectedId)

  if (!caseA) {
    return (
      <PageShell breadcrumb={[{ label: 'Complaints', path: '/complaints' }, { label: 'Compare' }]}>
        <EmptyState icon="❌" title="Case not found" />
      </PageShell>
    )
  }

  type Row = { field: string; a: string; b: string; status: FieldStatus }

  const rows: Row[] = caseB ? [
    { field: 'Case ID', a: caseA.caseNumber, b: caseB.caseNumber, status: caseA.caseNumber === caseB.caseNumber ? 'CONSISTENT' : 'CHANGED' },
    { field: 'Institution', a: caseA.institutionName, b: caseB.institutionName, status: caseA.institutionId === caseB.institutionId ? 'CONSISTENT' : 'REQUIRES_REVIEW' },
    { field: 'Category', a: caseA.category, b: caseB.category, status: caseA.category === caseB.category ? 'CONSISTENT' : 'CHANGED' },
    { field: 'Priority', a: caseA.priority, b: caseB.priority, status: caseA.priority === caseB.priority ? 'CONSISTENT' : 'CHANGED' },
    { field: 'Status', a: caseA.status, b: caseB.status, status: caseA.status === caseB.status ? 'CONSISTENT' : 'CHANGED' },
    { field: 'Assigned Bureau', a: caseA.assignedBureauName, b: caseB.assignedBureauName, status: caseA.assignedBureauId === caseB.assignedBureauId ? 'CONSISTENT' : 'CHANGED' },
    { field: 'Assigned Officer', a: caseA.assignedOfficerName ?? '—', b: caseB.assignedOfficerName ?? '—', status: caseA.assignedOfficerId === caseB.assignedOfficerId ? 'CONSISTENT' : 'CHANGED' },
    { field: 'Filing Date', a: format(new Date(caseA.filedAt), 'dd MMM yyyy'), b: format(new Date(caseB.filedAt), 'dd MMM yyyy'), status: 'CHANGED' },
    { field: 'Response Deadline', a: format(new Date(caseA.responseDueAt), 'dd MMM yyyy'), b: format(new Date(caseB.responseDueAt), 'dd MMM yyyy'), status: 'CHANGED' },
    { field: 'Days Since Filing', a: `${differenceInDays(new Date(), new Date(caseA.filedAt))}d`, b: `${differenceInDays(new Date(), new Date(caseB.filedAt))}d`, status: 'CHANGED' },
    { field: 'Title', a: caseA.title, b: caseB.title, status: caseA.title === caseB.title ? 'CONSISTENT' : 'REQUIRES_REVIEW' },
  ] : []

  const displayRows = showDiffOnly ? rows.filter(r => r.status !== 'CONSISTENT') : rows

  const chipCls: Record<FieldStatus, string> = {
    CONSISTENT: 'chip chip-resolved',
    CHANGED: 'chip chip-action-req',
    NOT_AVAILABLE: 'chip chip-on-hold',
    REQUIRES_REVIEW: 'chip chip-cross-bureau',
  }

  return (
    <PageShell breadcrumb={[
      { label: 'Complaints', path: '/complaints' },
      { label: caseA.caseNumber, path: `/complaints/${id}` },
      { label: 'Compare' },
    ]}>
      <SectionH1>Case Comparison · {caseA.caseNumber}</SectionH1>

      <AlertInfo>
        A difference in field values is a prompt for officer review, not evidence of wrongdoing. Differences may reflect legitimate administrative changes.
      </AlertInfo>

      {/* Select comparison case */}
      <Panel title="Select Case to Compare" className="mt-6 mb-6">
        <div className="p-4 flex items-end gap-4">
          <div className="flex-1">
            <label htmlFor="cmp-select" className="form-label">Compare with Case</label>
            <select id="cmp-select" className="form-select" value={selectedId} onChange={e => setSelectedId(e.target.value)}>
              <option value="">Select a case to compare…</option>
              {allComplaints.filter(c => c.id !== id).map(c => (
                <option key={c.id} value={c.id}>{c.caseNumber} — {c.institutionName} — {c.category}</option>
              ))}
            </select>
          </div>
        </div>
      </Panel>

      {caseB ? (
        <>
          {/* Header row */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            {[caseA, caseB].map(c => (
              <div key={c.id} className="panel p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CaseIdBadge caseNumber={c.caseNumber} />
                  <StatusChip status={c.status} />
                  <PriorityChip priority={c.priority} />
                </div>
                <div className="font-semibold text-navy text-body line-clamp-2">{c.title}</div>
                <div className="text-chip text-muted mt-1">{c.institutionName} · {c.category}</div>
              </div>
            ))}
          </div>

          {/* Diff toggle */}
          <div className="flex items-center gap-3 mb-4">
            <label className="flex items-center gap-2 cursor-pointer text-body font-semibold">
              <input
                type="checkbox"
                checked={showDiffOnly}
                onChange={e => setShowDiffOnly(e.target.checked)}
                className="w-4 h-4"
              />
              Show only fields that differ
            </label>
            <span className="text-chip text-muted ml-auto">
              {rows.filter(r => r.status !== 'CONSISTENT').length} of {rows.length} fields differ
            </span>
          </div>

          <Panel>
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Field</th>
                    <th>{caseA.caseNumber}</th>
                    <th>{caseB.caseNumber}</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {displayRows.length === 0 ? (
                    <tr><td colSpan={4} className="text-center text-muted py-8">All visible fields are consistent between these cases.</td></tr>
                  ) : (
                    displayRows.map(row => (
                      <tr key={row.field} className={row.status === 'REQUIRES_REVIEW' ? 'bg-amber-50' : row.status === 'CHANGED' ? 'bg-blue-50' : ''}>
                        <td className="font-semibold text-muted">{row.field}</td>
                        <td className="font-mono text-mono">{row.a}</td>
                        <td className="font-mono text-mono">{row.b}</td>
                        <td><span className={chipCls[row.status]}>{row.status.replace(/_/g,' ')}</span></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Panel>
        </>
      ) : (
        <EmptyState icon="⚖️" title="Select a second case above to begin comparison" subtitle="The comparison table will appear once you select a case." />
      )}
    </PageShell>
  )
}
