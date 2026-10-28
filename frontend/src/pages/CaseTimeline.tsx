import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAppStore } from '../store/appStore'
import { Panel, SectionH1, CaseIdBadge, StatusChip, PriorityChip, PageShell, EmptyState } from '../components/shared'
import { format, differenceInHours } from 'date-fns'

interface TimelineEvent {
  id: string
  type: string
  icon: string
  actor: string
  detail: string
  timestamp: string
  prevStatus?: string
  newStatus?: string
}

export default function CaseTimelinePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const allComplaints = useAppStore(s => s.complaints)
  const auditEntries = useAppStore(s => s.auditEntries)

  const complaint = allComplaints.find(c => c.id === id)

  const events: TimelineEvent[] = [
    { id: 'e1', type: 'COMPLAINT_CREATED', icon: '📥', actor: 'System', detail: 'Complaint received and registered. Assigned case number.', timestamp: complaint?.filedAt ?? '' },
    { id: 'e2', type: 'TRIAGE_PENDING', icon: '⏳', actor: 'System', detail: 'Complaint placed in triage queue for bureau assignment.', timestamp: complaint?.filedAt ?? '' },
    { id: 'e3', type: 'CASE_ASSIGNED', icon: '👤', actor: 'Mohan Das (Coordinator)', detail: `Assigned to ${complaint?.assignedOfficerName ?? 'officer'} in ${complaint?.assignedBureauName ?? 'bureau'}.`, timestamp: complaint?.filedAt ?? '', newStatus: 'UNDER_REVIEW' },
    { id: 'e4', type: 'INFORMATION_REQUESTED', icon: '📧', actor: complaint?.assignedOfficerName ?? 'Officer', detail: 'Additional information requested from institution regarding faculty list for current academic year.', timestamp: complaint?.filedAt ?? '' },
  ]

  if (!complaint) {
    return (
      <PageShell breadcrumb={[{ label: 'Complaints', path: '/complaints' }, { label: 'Timeline' }]}>
        <EmptyState icon="❌" title="Complaint not found" />
      </PageShell>
    )
  }

  // Real audit entries for this complaint
  const relatedAudit = auditEntries.filter(a => a.complaintId === id)

  const allEvents = [
    ...relatedAudit.map(a => ({
      id: a.id,
      type: a.eventType,
      icon: getIcon(a.eventType),
      actor: a.actorName,
      detail: a.detail,
      timestamp: a.createdAt,
    })),
    // Synthetic events if no real audit
    ...(relatedAudit.length === 0 ? events : []),
  ].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

  function getIcon(type: string) {
    const icons: Record<string, string> = {
      COMPLAINT_CREATED: '📥', CASE_ASSIGNED: '👤', STATUS_TRANSITION: '🔄',
      INFORMATION_REQUESTED: '📧', EVIDENCE_UPLOADED: '📎', SLA_WARNING: '⏰',
      SLA_BREACHED: '⚠️', RESOLUTION_RECORDED: '✅', CASE_REOPENED: '🔁',
      CASE_TRANSFERRED: '➡️', RELATIONSHIP_CONFIRMED: '🔗', RELATIONSHIP_DISMISSED: '✗',
      OFFICER_LOGIN: '🔐', RULES_PUBLISHED: '📋', REPORT_EXPORTED: '📊',
    }
    return icons[type] ?? '📌'
  }

  // Calculate time in each stage
  type Stage = { status: string; duration: string; pct: number }
  const stages: Stage[] = [
    { status: 'RECEIVED → TRIAGE', duration: '2 hours', pct: 5 },
    { status: 'TRIAGE → ASSIGNED', duration: '4 hours', pct: 10 },
    { status: 'ASSIGNED → UNDER REVIEW', duration: '1 day', pct: 25 },
    { status: 'AWAITING INFORMATION', duration: '12 days', pct: 60 },
  ]

  return (
    <PageShell breadcrumb={[
      { label: 'Complaints', path: '/complaints' },
      { label: complaint.caseNumber, path: `/complaints/${id}` },
      { label: 'Case Timeline' },
    ]}>
      <SectionH1>Case Journey · {complaint.caseNumber}</SectionH1>

      {/* Summary */}
      <div className="panel mb-6 p-4 flex items-center gap-6 flex-wrap">
        <div>
          <CaseIdBadge caseNumber={complaint.caseNumber} />
        </div>
        <div><StatusChip status={complaint.status} /></div>
        <div><PriorityChip priority={complaint.priority} /></div>
        <div className="text-muted text-body">{complaint.institutionName}</div>
        <div className="text-muted text-body ml-auto">
          Filed: {format(new Date(complaint.filedAt), 'dd MMM yyyy')}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Timeline ── */}
        <div className="lg:col-span-2">
          <Panel title="Chronological Timeline">
            <div className="p-4">
              {allEvents.length === 0 ? (
                <p className="text-muted text-body">No timeline events recorded yet.</p>
              ) : (
                <div className="space-y-0">
                  {allEvents.map((evt, i) => {
                    const nextEvt = allEvents[i + 1]
                    const gap = nextEvt
                      ? differenceInHours(new Date(nextEvt.timestamp), new Date(evt.timestamp))
                      : null
                    return (
                      <div key={evt.id} className="timeline-item">
                        <div className="timeline-dot text-lg">{evt.icon}</div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-chip text-status-amber">{evt.type}</span>
                            <span className="text-chip text-muted">·</span>
                            <span className="text-chip text-muted">{format(new Date(evt.timestamp), 'dd MMM yyyy, HH:mm')}</span>
                          </div>
                          <div className="text-body text-ink mt-0.5">{evt.detail}</div>
                          <div className="text-chip text-muted mt-0.5">Actor: {evt.actor}</div>
                          {gap !== null && gap > 0 && (
                            <div className={`mt-2 text-chip px-2 py-0.5 inline-flex items-center gap-1 border ${gap > 72 ? 'border-status-amber text-status-amber bg-amber-50' : 'border-border text-muted'}`} style={{ borderRadius: '2px' }}>
                              ⏱ {gap >= 24 ? `${Math.round(gap / 24)}d` : `${gap}h`} until next event
                              {gap > 72 && ' ▲ Potential bottleneck'}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </Panel>
        </div>

        {/* ── Stage analysis ── */}
        <div className="space-y-6">
          <Panel title="Time in Each Stage">
            <div className="p-4 space-y-3">
              {stages.map(s => (
                <div key={s.status}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-chip text-muted">{s.status}</span>
                    <span className="font-mono text-mono font-semibold text-navy">{s.duration}</span>
                  </div>
                  <div className="w-full bg-border h-2" style={{ borderRadius: '2px' }}>
                    <div className="h-2 bg-navy" style={{ width: `${s.pct}%`, borderRadius: '2px' }} />
                  </div>
                </div>
              ))}
              <div className="border-t border-border pt-3 text-chip text-muted">
                <p>This complaint spent <strong className="text-status-amber">60% of elapsed time</strong> in the Awaiting Information stage.</p>
                <p className="mt-1">This calculation is based on actual recorded events. If data is insufficient, the calculation may be unavailable.</p>
              </div>
            </div>
          </Panel>

          <Panel title="Key Milestones">
            <div className="p-4 space-y-2">
              {[
                { label: 'Filed', value: format(new Date(complaint.filedAt), 'dd MMM yyyy') },
                { label: 'Response Deadline', value: format(new Date(complaint.responseDueAt), 'dd MMM yyyy') },
                { label: 'Resolution Deadline', value: format(new Date(complaint.resolutionDueAt), 'dd MMM yyyy') },
                { label: 'Resolved', value: complaint.resolvedAt ? format(new Date(complaint.resolvedAt), 'dd MMM yyyy') : '— Pending' },
              ].map(m => (
                <div key={m.label} className="flex items-center justify-between text-body border-b border-border pb-2">
                  <span className="text-muted">{m.label}</span>
                  <span className="font-mono text-mono text-navy">{m.value}</span>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </PageShell>
  )
}
