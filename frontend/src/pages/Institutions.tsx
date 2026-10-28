import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../store/appStore'
import { Panel, SectionH1, StatusChip, PriorityChip, SynthTag, CaseIdBadge, PageShell } from '../components/shared'
import { institutions } from '../data/seed'
import { format } from 'date-fns'

export default function InstitutionsPage() {
  const navigate = useNavigate()
  const allComplaints = useAppStore(s => s.complaints)
  const [selectedId, setSelectedId] = useState(institutions[0].id)
  const [search, setSearch] = useState('')

  const filtered = institutions.filter(i =>
    i.name.toLowerCase().includes(search.toLowerCase()) ||
    i.code.toLowerCase().includes(search.toLowerCase())
  )

  const selected = institutions.find(i => i.id === selectedId)
  const institutionComplaints = allComplaints.filter(c => c.institutionId === selectedId)

  return (
    <PageShell breadcrumb={[{ label: 'Institutions' }]}>
      <SectionH1>Institutions</SectionH1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Left: Institution list ── */}
        <div className="lg:col-span-1">
          <Panel title="Institution List">
            <div className="p-3 border-b border-border">
              <label htmlFor="inst-search" className="form-label text-chip">Search</label>
              <input
                id="inst-search"
                className="form-input text-body"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Name or ID…"
              />
            </div>
            <div className="divide-y divide-border">
              {filtered.map(inst => (
                <button
                  key={inst.id}
                  onClick={() => setSelectedId(inst.id)}
                  className={`w-full text-left px-4 py-3 transition-colors ${selectedId === inst.id ? 'bg-panel-header border-l-4 border-saffron' : 'hover:bg-tint'}`}
                >
                  <div className="font-semibold text-navy text-body">{inst.name}</div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="font-mono text-mono text-muted">{inst.code}</span>
                    <SynthTag />
                  </div>
                  <div className="text-chip text-muted mt-0.5">{inst.state} · {inst.type}</div>
                </button>
              ))}
              {filtered.length === 0 && (
                <div className="p-4 text-muted text-body">No institutions match.</div>
              )}
            </div>
          </Panel>
        </div>

        {/* ── Right: Profile + complaints ── */}
        <div className="lg:col-span-2 space-y-6">
          {selected && (
            <>
              {/* Profile panel */}
              <Panel title="Institution Profile">
                <div className="p-4">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div>
                      <h2 className="text-h1 font-bold text-navy">{selected.name}</h2>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="font-mono text-mono text-muted">{selected.code}</span>
                        <SynthTag />
                      </div>
                    </div>
                    <div className="text-right text-body text-muted">
                      <div>{selected.state}</div>
                      <div>{selected.type}</div>
                    </div>
                  </div>

                  {/* Metrics */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                    {[
                      { label: 'Total Complaints', value: selected.totalComplaints, color: 'text-navy' },
                      { label: 'Open Complaints', value: selected.openComplaints, color: 'text-status-amber' },
                      { label: 'High Priority', value: selected.highPriority, color: 'text-status-red' },
                      { label: 'SLA Breaches', value: selected.slaBreaches, color: 'text-status-red' },
                    ].map(m => (
                      <div key={m.label} className="panel p-3 bg-tint text-center">
                        <div className={`text-2xl font-bold font-mono ${m.color}`}>{m.value}</div>
                        <div className="text-chip text-muted">{m.label}</div>
                      </div>
                    ))}
                  </div>

                  <div className="alert-info mb-4">
                    <span>ℹ</span>
                    <span className="text-chip">
                      Complaint counts are operational metrics only. A higher complaint count does not imply institutional misconduct. All allegations require officer review before any finding is made.
                    </span>
                  </div>

                  {/* Action buttons */}
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => {
                        useAppStore.getState().setComplaintFilters({ search: selected.name })
                        navigate('/complaints')
                      }}
                      className="btn-secondary text-body"
                    >
                      📋 Open Complaints
                    </button>
                    <button
                      onClick={() => navigate(`/complaints/${institutionComplaints[0]?.id}/related`)}
                      className="btn-secondary text-body"
                    >
                      🔗 Related Cases
                    </button>
                    <button className="btn-secondary text-body" title="Feature: View complaint trend chart">
                      📈 Case Trends
                    </button>
                    <button className="btn-secondary text-body" title="Feature: Export authorized report">
                      📥 Export Report
                    </button>
                  </div>
                </div>
              </Panel>

              {/* Complaint history */}
              <Panel title="Complaint History">
                <div className="table-scroll">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Case ID</th>
                        <th>Subject</th>
                        <th>Category</th>
                        <th>Filed</th>
                        <th>Bureau</th>
                        <th>Status</th>
                        <th>Priority</th>
                        <th>View</th>
                      </tr>
                    </thead>
                    <tbody>
                      {institutionComplaints.length === 0 ? (
                        <tr><td colSpan={8} className="text-center text-muted py-6">No complaints on record for this institution.</td></tr>
                      ) : (
                        institutionComplaints.map(c => (
                          <tr key={c.id}>
                            <td><CaseIdBadge caseNumber={c.caseNumber} /></td>
                            <td className="max-w-xs">
                              <span className="line-clamp-2 text-table">{c.title}</span>
                            </td>
                            <td className="text-muted text-table">{c.category}</td>
                            <td className="font-mono text-mono text-muted">{format(new Date(c.filedAt), 'dd MMM yyyy')}</td>
                            <td className="text-table">{c.assignedBureauName}</td>
                            <td><StatusChip status={c.status} /></td>
                            <td><PriorityChip priority={c.priority} /></td>
                            <td>
                              <button
                                onClick={() => navigate(`/complaints/${c.id}`)}
                                className="btn-secondary px-2 py-1 text-chip"
                                style={{ minHeight: '32px' }}
                              >
                                View →
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </Panel>
            </>
          )}
        </div>
      </div>
    </PageShell>
  )
}
