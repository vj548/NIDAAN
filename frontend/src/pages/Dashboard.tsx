import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../store/appStore'
import {
  Panel, StatusChip, PriorityChip, SynthTag, CaseIdBadge,
  SectionH1, AlertWarning, AlertInfo, EmptyState
} from '../components/shared'
import { PageShell } from '../components/shared'
import { complaints, bureaus } from '../data/seed'
import { format, formatDistanceToNow, isPast } from 'date-fns'

export default function DashboardPage() {
  const navigate = useNavigate()
  const { currentUser, dashboardStats, setComplaintFilters } = useAppStore()
  const stats = dashboardStats()
  const allComplaints = useAppStore(s => s.complaints)

  // Greeting
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  // Needs attention: cases assigned to current user or unassigned in their bureau
  const needsAttention = allComplaints
    .filter(c =>
      ['ACTION_REQUIRED', 'TRIAGE_PENDING', 'SLA_AT_RISK', 'SLA_BREACHED', 'CROSS_BUREAU_REVIEW', 'REOPENED'].includes(c.status)
      && !['RESOLVED', 'CLOSED'].includes(c.status)
    )
    .slice(0, 8)

  // Recent audit
  const recentAudit = useAppStore(s => s.auditEntries).slice(-5).reverse()

  // Bureau summary
  const bureauSummary = bureaus.map(b => ({
    ...b,
    count: allComplaints.filter(c => c.assignedBureauId === b.id && !['RESOLVED', 'CLOSED'].includes(c.status)).length,
    critical: allComplaints.filter(c => c.assignedBureauId === b.id && c.priority === 'CRITICAL' && !['RESOLVED', 'CLOSED'].includes(c.status)).length,
  })).filter(b => b.active)

  const slaAtRisk = allComplaints.filter(c => ['SLA_AT_RISK', 'SLA_BREACHED'].includes(c.status))
  const oldestOpen = allComplaints
    .filter(c => !['RESOLVED', 'CLOSED'].includes(c.status))
    .sort((a, b) => new Date(a.filedAt).getTime() - new Date(b.filedAt).getTime())[0]

  function navigateWithFilter(status: string) {
    setComplaintFilters({ status: status as any })
    navigate('/complaints')
  }

  return (
    <PageShell breadcrumb={[{ label: 'Dashboard' }]}>
      {/* Greeting */}
      <div className="mb-6">
        <SectionH1>{greeting}, {currentUser?.name ?? 'Officer'}</SectionH1>
        <p className="text-muted text-body">
          {currentUser?.role}{currentUser?.bureauName ? ` · ${currentUser.bureauName}` : ''} · {format(new Date(), 'EEEE, d MMMM yyyy')}
        </p>
      </div>

      {/* ── Four summary tiles ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          {
            label: 'Open Complaints',
            value: stats.open,
            desc: 'Across all bureaus',
            filter: '',
            icon: '📋',
            color: 'text-navy',
          },
          {
            label: 'Requires My Action',
            value: stats.myAction,
            desc: 'Action required or triage pending',
            filter: 'ACTION_REQUIRED',
            icon: '⚡',
            color: 'text-status-amber',
          },
          {
            label: 'SLA At Risk / Breached',
            value: stats.slaAtRisk,
            desc: 'Approaching or past deadline',
            filter: 'SLA_AT_RISK',
            icon: '◔',
            color: 'text-status-red',
          },
          {
            label: 'Resolved (All Time)',
            value: stats.resolved,
            desc: 'Resolved or closed cases',
            filter: 'RESOLVED',
            icon: '●',
            color: 'text-status-green',
          },
        ].map(tile => (
          <button
            key={tile.label}
            onClick={() => navigateWithFilter(tile.filter)}
            className="dash-tile text-left focus:outline-none"
            aria-label={`${tile.label}: ${tile.value}. Click to view filtered complaints.`}
          >
            <div className="flex items-start justify-between mb-2">
              <span className="text-2xl">{tile.icon}</span>
              <span className={`text-3xl font-bold font-mono ${tile.color}`}>{tile.value}</span>
            </div>
            <div className="font-semibold text-navy text-body">{tile.label}</div>
            <div className="text-muted text-chip mt-0.5">{tile.desc}</div>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Left: Needs attention table + Bureau summary ── */}
        <div className="lg:col-span-2 space-y-6">
          {/* Needs Your Attention */}
          <Panel title="Needs Your Attention">
            {needsAttention.length === 0 ? (
              <div className="p-4">
                <div className="alert-success">
                  <span>●</span>
                  <span>All flagged complaints have been addressed. No items require immediate attention.</span>
                </div>
              </div>
            ) : (
              <div className="table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Case ID</th>
                      <th>Institution</th>
                      <th>Subject</th>
                      <th>Priority</th>
                      <th>Bureau / Officer</th>
                      <th>SLA Deadline</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {needsAttention.map(c => {
                      const dueDate = new Date(c.responseDueAt)
                      const overdue = isPast(dueDate)
                      return (
                        <tr key={c.id}>
                          <td><CaseIdBadge caseNumber={c.caseNumber} /></td>
                          <td>
                            <div className="font-semibold text-ink text-table">{c.institutionName}</div>
                            <SynthTag />
                          </td>
                          <td className="max-w-xs">
                            <span className="line-clamp-2">{c.title}</span>
                          </td>
                          <td><PriorityChip priority={c.priority} /></td>
                          <td>
                            <div className="text-table">{c.assignedBureauName}</div>
                            <div className="text-chip text-muted">{c.assignedOfficerName ?? '—'}</div>
                          </td>
                          <td>
                            <span className={`font-mono text-mono ${overdue ? 'text-status-red font-semibold' : 'text-muted'}`}>
                              {format(dueDate, 'dd MMM yyyy')}
                              {overdue && ' ▲ OVERDUE'}
                            </span>
                          </td>
                          <td><StatusChip status={c.status} /></td>
                          <td>
                            <button
                              onClick={() => navigate(`/complaints/${c.id}`)}
                              className="btn-secondary px-3 py-1 text-chip"
                              style={{ minHeight: '36px' }}
                            >
                              Review →
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
            <div className="px-4 py-2 border-t border-border text-chip text-muted bg-tint">
              Showing {needsAttention.length} items requiring attention · Zero auto-approval, zero auto-rejection
            </div>
          </Panel>

          {/* Cross-bureau summary */}
          <Panel title="Cross-Bureau Overview">
            <div className="p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                <div className="panel p-3 bg-tint">
                  <div className="text-chip text-muted mb-1">Oldest Open Case</div>
                  {oldestOpen ? (
                    <>
                      <div className="font-mono text-mono text-navy">{oldestOpen.caseNumber}</div>
                      <div className="text-chip text-muted">{oldestOpen.institutionName}</div>
                      <div className="text-chip text-status-red font-semibold">
                        Filed {formatDistanceToNow(new Date(oldestOpen.filedAt), { addSuffix: true })}
                      </div>
                    </>
                  ) : <span className="text-chip text-muted">None</span>}
                </div>
                <div className="panel p-3 bg-tint">
                  <div className="text-chip text-muted mb-1">Upcoming SLA Deadlines (next 3)</div>
                  {slaAtRisk.slice(0, 3).map(c => (
                    <div key={c.id} className="flex items-center gap-2 text-chip mb-1">
                      <span className="font-mono text-navy">{c.caseNumber}</span>
                      <span className="text-status-amber">◔ {format(new Date(c.responseDueAt), 'dd MMM')}</span>
                    </div>
                  ))}
                  {slaAtRisk.length === 0 && <span className="text-chip text-status-green">● No SLA warnings</span>}
                </div>
              </div>
              <div className="table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Bureau</th>
                      <th>Open Cases</th>
                      <th>Critical</th>
                      <th>Priority Distribution</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bureauSummary.map(b => (
                      <tr key={b.id}>
                        <td className="font-semibold">{b.name}</td>
                        <td className="font-mono text-mono text-navy font-bold">{b.count}</td>
                        <td>
                          {b.critical > 0
                            ? <span className="chip chip-critical">{b.critical}</span>
                            : <span className="text-chip text-muted">—</span>
                          }
                        </td>
                        <td>
                          <div className="flex gap-1 flex-wrap">
                            {(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const).map(p => {
                              const cnt = allComplaints.filter(c => c.assignedBureauId === b.id && c.priority === p && !['RESOLVED','CLOSED'].includes(c.status)).length
                              if (cnt === 0) return null
                              return <PriorityChip key={p} priority={p} />
                            })}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </Panel>
        </div>

        {/* ── Right: Recent ledger activity ── */}
        <div className="space-y-6">
          <Panel title="Recent Audit Activity">
            <div className="divide-y divide-border">
              {recentAudit.map(entry => (
                <div key={entry.id} className="p-3 hover:bg-tint transition-colors">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-mono text-navy">{entry.ledgerId}</span>
                    <span className="text-chip text-muted">{format(new Date(entry.createdAt), 'HH:mm')}</span>
                  </div>
                  <div className="font-mono text-chip text-status-amber">{entry.eventType}</div>
                  <div className="text-chip text-muted mt-0.5">{entry.actorName}</div>
                  <div className="text-chip text-ink mt-0.5 line-clamp-2">{entry.detail}</div>
                </div>
              ))}
            </div>
            <div className="px-3 py-2 border-t border-border">
              <button onClick={() => navigate('/audit')} className="btn-secondary w-full text-chip" style={{ minHeight: '36px' }}>
                View Full Audit Ledger →
              </button>
            </div>
          </Panel>

          {/* Quick SLA warnings */}
          {slaAtRisk.length > 0 && (
            <Panel title="⚠ SLA Alerts">
              <div className="p-3 space-y-2">
                {slaAtRisk.map(c => (
                  <button
                    key={c.id}
                    onClick={() => navigate(`/complaints/${c.id}`)}
                    className="w-full text-left p-2 border border-border hover:border-navy hover:bg-tint transition-colors"
                    style={{ borderRadius: '2px' }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-mono text-navy">{c.caseNumber}</span>
                      <StatusChip status={c.status} />
                    </div>
                    <div className="text-chip text-muted mt-0.5 line-clamp-1">{c.title}</div>
                    <div className="text-chip text-status-red font-semibold mt-0.5">
                      Due: {format(new Date(c.responseDueAt), 'dd MMM yyyy HH:mm')}
                    </div>
                  </button>
                ))}
              </div>
            </Panel>
          )}
        </div>
      </div>
    </PageShell>
  )
}
