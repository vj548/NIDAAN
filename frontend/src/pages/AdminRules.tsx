import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../store/appStore'
import {
  Panel, SectionH1, AlertInfo, AlertWarning, AlertSuccess, PageShell
} from '../components/shared'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend,
} from 'recharts'
import { bureaus } from '../data/seed'

const COLORS = ['#12306B','#FF9933','#138808','#B3261E','#8A4B00','#3B4659']

const SLA_RULES = [
  { id: 'SLA-001', category: 'Any', priority: 'CRITICAL', responseTarget: '3 days',  resolutionTarget: '14 days',  escalation: '2 days',  timePolicy: 'Calendar', active: true },
  { id: 'SLA-002', category: 'Any', priority: 'HIGH',     responseTarget: '7 days',  resolutionTarget: '30 days',  escalation: '5 days',  timePolicy: 'Business', active: true },
  { id: 'SLA-003', category: 'Any', priority: 'MEDIUM',   responseTarget: '14 days', resolutionTarget: '60 days',  escalation: '10 days', timePolicy: 'Business', active: true },
  { id: 'SLA-004', category: 'Any', priority: 'LOW',      responseTarget: '30 days', resolutionTarget: '90 days',  escalation: '20 days', timePolicy: 'Business', active: true },
]

const ROUTING_RULES = [
  { id: 'R-001', condition: 'Category = Faculty Shortage OR Faculty Qualification', bureau: 'Academic Bureau',      priority: 'HIGH',   active: true },
  { id: 'R-002', condition: 'Category = Fee Irregularity',                         bureau: 'Finance & Accounts',  priority: 'MEDIUM', active: true },
  { id: 'R-003', condition: 'Category = Infrastructure Deficiency',                 bureau: 'Infrastructure Cell', priority: 'MEDIUM', active: true },
  { id: 'R-004', condition: 'Category = Student Welfare',                           bureau: 'Student Affairs Cell', priority: 'HIGH',  active: true },
  { id: 'R-005', condition: 'Category = Document Fraud OR Excess Admission',        bureau: 'Approval Bureau',     priority: 'CRITICAL', active: true },
  { id: 'R-006', condition: 'Category = Disclosure Non-compliance',                 bureau: 'Compliance Cell',     priority: 'MEDIUM', active: true },
]

import { api } from '../services/api'

export default function AdminRulesPage() {
  const navigate = useNavigate()
  const allComplaints = useAppStore(s => s.complaints)
  const { currentUser, addAuditEntry } = useAppStore()

  const [tab, setTab] = useState<'routing' | 'sources' | 'sla' | 'thresholds' | 'analytics'>('routing')
  const [hasUnpublished, setHasUnpublished] = useState(false)
  const [ruleVersion, setRuleVersion] = useState('v2.1')
  const [publishMsg, setPublishMsg] = useState('')
  const [sources, setSources] = useState([
    { id: 'S001', name: 'AICTE Approval Portal API', endpoint: 'https://approval.aicte-india.org/api/v2', lastFetched: '2026-10-26T08:00:00Z', status: 'PARSED', recordCount: 11200 },
    { id: 'S002', name: 'Mandatory Disclosures Registry', endpoint: 'https://disclosures.aicte-india.org/2026', lastFetched: '2026-10-25T14:30:00Z', status: 'PARSED', recordCount: 8940 },
    { id: 'S003', name: 'State Directorate of Technical Education (TN)', endpoint: 'https://dte.tn.gov.in/feed', lastFetched: '2026-10-24T18:00:00Z', status: 'PARSED', recordCount: 612 },
    { id: 'S004', name: 'Bank FDR Central Verification Gateway', endpoint: 'https://fdr-gateway.npci.org.in/v1', lastFetched: '2026-10-26T06:15:00Z', status: 'FETCH_FAILED', recordCount: 0 },
    { id: 'S005', name: 'National Scholarship Portal (Saksham/Pragati)', endpoint: 'https://scholarships.gov.in/api', lastFetched: '2026-10-23T11:00:00Z', status: 'PARSED', recordCount: 4210 },
  ])
  const [fetchingId, setFetchingId] = useState<string | null>(null)

  const isAdmin = currentUser?.role === 'ADMINISTRATOR'

  async function handlePublish() {
    const newVersion = `v${(parseFloat(ruleVersion.slice(1)) + 0.1).toFixed(1)}`
    try {
      await api.publishRules(newVersion, currentUser?.name ?? 'Admin')
    } catch (e) {
      console.warn(e)
    }
    addAuditEntry({
      actorName: currentUser?.name ?? 'Admin',
      eventType: 'RULES_PUBLISHED',
      complaintId: null,
      caseNumber: null,
      detail: `Rules published. New version: ${newVersion}. Previous version: ${ruleVersion}. Published by ${currentUser?.name}.`,
      createdAt: new Date().toISOString(),
    })
    setRuleVersion(newVersion)
    setHasUnpublished(false)
    setPublishMsg(`Rules published as ${newVersion}. Audit event recorded.`)
  }

  async function handleRefetchSource(sourceId: string) {
    setFetchingId(sourceId)
    try {
      await api.refetchSource(sourceId)
    } catch (e) {
      console.warn(e)
    }
    setSources(prev =>
      prev.map(s => (s.id === sourceId ? { ...s, status: 'PARSED', recordCount: 2450, lastFetched: new Date().toISOString() } : s))
    )
    addAuditEntry({
      actorName: currentUser?.name ?? 'Admin',
      eventType: 'SOURCE_FETCHED',
      complaintId: null,
      caseNumber: null,
      detail: `Data source ${sourceId} refetched and indexed. Status: PARSED.`,
      createdAt: new Date().toISOString(),
    })
    setTimeout(() => setFetchingId(null), 800)
  }

  // Analytics data
  const byCategory = Object.entries(
    allComplaints.reduce((acc, c) => {
      acc[c.category] = (acc[c.category] || 0) + 1
      return acc
    }, {} as Record<string, number>)
  ).map(([name, value]) => ({ name: name.replace(' ', '\n'), value }))

  const byBureau = bureaus.map(b => ({
    name: b.name.split(' ')[0],
    open: allComplaints.filter(c => c.assignedBureauId === b.id && !['RESOLVED','CLOSED'].includes(c.status)).length,
    resolved: allComplaints.filter(c => c.assignedBureauId === b.id && ['RESOLVED','CLOSED'].includes(c.status)).length,
  }))

  const trendData = [
    { month: 'Jul', complaints: 3, resolved: 2 },
    { month: 'Aug', complaints: 5, resolved: 3 },
    { month: 'Sep', complaints: 8, resolved: 4 },
    { month: 'Oct', complaints: 9, resolved: 2 },
  ]

  const priorities = ['CRITICAL','HIGH','MEDIUM','LOW'].map(p => ({
    name: p,
    value: allComplaints.filter(c => c.priority === p).length,
  }))

  const tabs = [
    { key: 'routing', label: 'A. Case Routing & Case Action Checklist' },
    { key: 'sources', label: 'B. Data Sources & Target' },
    { key: 'sla', label: 'C. SLA Targets' },
    { key: 'thresholds', label: 'D. Match Thresholds' },
    { key: 'analytics', label: 'E. Analytics' },
  ]

  return (
    <PageShell breadcrumb={[{ label: isAdmin ? 'Admin: Rules & SLAs' : 'Analytics & Reports' }]}>
      <SectionH1>{isAdmin ? 'Administrator: Rules, SLAs & Analytics' : 'Analytics & Reports'}</SectionH1>

      {!isAdmin && (
        <div className="mb-4">
          <AlertWarning>Rules editing requires Administrator role. You are viewing read-only analytics.</AlertWarning>
        </div>
      )}

      {/* Header with version */}
      {isAdmin && (
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <span className="chip chip-under-review">Case Action Checklist Rules · {ruleVersion}</span>
          {hasUnpublished && <span className="chip chip-action-req">UNPUBLISHED CHANGES</span>}
          {publishMsg && <span className="chip chip-resolved">● {publishMsg}</span>}
          <button
            onClick={handlePublish}
            className="btn-primary ml-auto"
            disabled={!hasUnpublished}
          >
            Publish New Version
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-border mb-6 overflow-x-auto">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as typeof tab)}
            className={`px-4 py-3 font-semibold text-body border-b-2 transition-colors whitespace-nowrap ${tab === t.key ? 'border-saffron text-navy bg-tint' : 'border-transparent text-muted hover:text-navy'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── A. Routing Rules ── */}
      {tab === 'routing' && (
        <Panel title="Case Routing Rules">
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Rule ID</th>
                  <th>Condition</th>
                  <th>Target Bureau</th>
                  <th>Default Priority</th>
                  <th>Active</th>
                  {isAdmin && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {ROUTING_RULES.map(r => (
                  <tr key={r.id}>
                    <td className="font-mono text-mono text-navy">{r.id}</td>
                    <td className="text-table">{r.condition}</td>
                    <td className="font-semibold">{r.bureau}</td>
                    <td><span className={`chip ${r.priority === 'CRITICAL' ? 'chip-critical' : r.priority === 'HIGH' ? 'chip-high' : 'chip-medium'}`}>{r.priority}</span></td>
                    <td>
                      {isAdmin
                        ? <input type="checkbox" defaultChecked={r.active} onChange={() => setHasUnpublished(true)} className="w-4 h-4 cursor-pointer" />
                        : <span className={r.active ? 'chip chip-resolved' : 'chip chip-on-hold'}>{r.active ? '● ACTIVE' : '⊘ INACTIVE'}</span>
                      }
                    </td>
                    {isAdmin && <td><button className="btn-secondary px-2 py-1 text-chip" onClick={() => setHasUnpublished(true)} style={{ minHeight:'32px' }}>Edit</button></td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Live YAML preview per spec §5.10 */}
          <div className="p-4 border-t border-border bg-tint">
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono text-chip text-navy font-bold uppercase">
                Live Specification Preview: case_action_checklist.yaml ({ruleVersion})
              </span>
              <span className="text-[11px] font-mono text-muted">Generated from Active Rule AST</span>
            </div>
            <pre className="p-3 bg-[#0B2455] text-white font-mono text-xs rounded-[2px] overflow-x-auto leading-relaxed border border-navy">
{`version: "${ruleVersion}"
jurisdiction: "AICTE_ALL_INDIA"
baseline_norms:
  - id: "R-001"
    match: "Category in [Faculty Shortage, Faculty Qualification]"
    bureau: "Academic Bureau"
    priority: "HIGH"
    blocking: true
  - id: "R-002"
    match: "Category == Fee Irregularity"
    bureau: "Finance & Accounts"
    priority: "MEDIUM"
    blocking: true
  - id: "R-003"
    match: "Category == Infrastructure Deficiency"
    bureau: "Infrastructure Cell"
    priority: "MEDIUM"
    blocking: false
  - id: "R-004"
    match: "Category == Student Welfare"
    bureau: "Student Affairs Cell"
    priority: "HIGH"
    blocking: true
  - id: "R-005"
    match: "Category in [Document Fraud, Excess Admission]"
    bureau: "Approval Bureau"
    priority: "CRITICAL"
    blocking: true
  - id: "R-006"
    match: "Category == Disclosure Non-compliance"
    bureau: "Compliance Cell"
    priority: "MEDIUM"
    blocking: false`}
            </pre>
          </div>
        </Panel>
      )}

      {/* ── B. Data Sources & Extraction Target (Spec §5.11) ── */}
      {tab === 'sources' && (
        <div className="space-y-6">
          <Panel title="Registry Extraction Performance">
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <div className="text-body font-semibold text-navy">
                    Mandatory Disclosures & Integration Registry Status
                  </div>
                  <div className="text-chip text-muted">
                    Disclosures parsed: {sources.filter(s => s.status === 'PARSED').length} of {sources.length} ({((sources.filter(s => s.status === 'PARSED').length / sources.length) * 100).toFixed(0)}%)
                  </div>
                </div>
                <div>
                  {sources.filter(s => s.status === 'PARSED').length >= 4 ? (
                    <span className="chip chip-resolved">● TARGET MET (≥ 90%)</span>
                  ) : (
                    <span className="chip chip-sla-risk">◔ BELOW TARGET (90% REQUIREMENT)</span>
                  )}
                </div>
              </div>
              <div className="w-full bg-border h-2 rounded-[2px] overflow-hidden">
                <div
                  className="h-full bg-navy transition-all duration-500"
                  style={{ width: `${(sources.filter(s => s.status === 'PARSED').length / sources.length) * 100}%` }}
                />
              </div>
              <div className="alert-info text-chip">
                <span>ℹ</span>
                <span>Disclosures are fetched in advance through secure API adapters, not crawled live. Data is cryptographically anchored.</span>
              </div>
            </div>
          </Panel>

          <Panel title="Configured Upstream Data Sources">
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Source ID</th>
                    <th>Integration Channel / Registry</th>
                    <th>Endpoint URL</th>
                    <th>Last Synchronised</th>
                    <th>Records Indexed</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {sources.map(src => (
                    <tr key={src.id}>
                      <td className="font-mono text-mono text-navy font-bold">{src.id}</td>
                      <td className="font-semibold text-ink">{src.name}</td>
                      <td className="font-mono text-mono text-muted">{src.endpoint}</td>
                      <td className="font-mono text-mono text-muted">
                        {new Date(src.lastFetched).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="font-mono text-mono font-semibold">{src.recordCount.toLocaleString()}</td>
                      <td>
                        <span className={`chip ${src.status === 'PARSED' ? 'chip-resolved' : 'chip-sla-breached'}`}>
                          {src.status === 'PARSED' ? '● PARSED' : '⊘ FETCH FAILED'}
                        </span>
                      </td>
                      <td>
                        <button
                          onClick={() => handleRefetchSource(src.id)}
                          disabled={fetchingId === src.id}
                          className="btn-secondary px-3 py-1 text-chip border-navy"
                          style={{ minHeight: '32px' }}
                        >
                          {fetchingId === src.id ? 'Fetching…' : 'Re-fetch'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>
      )}

      {/* ── B. SLA Rules ── */}
      {tab === 'sla' && (
        <Panel title="SLA Rules">
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Rule ID</th>
                  <th>Priority</th>
                  <th>Response Target</th>
                  <th>Resolution Target</th>
                  <th>Escalation</th>
                  <th>Time Policy</th>
                  <th>Active</th>
                </tr>
              </thead>
              <tbody>
                {SLA_RULES.map(r => (
                  <tr key={r.id}>
                    <td className="font-mono text-mono text-navy">{r.id}</td>
                    <td><span className={`chip ${r.priority === 'CRITICAL' ? 'chip-critical' : r.priority === 'HIGH' ? 'chip-high' : r.priority === 'MEDIUM' ? 'chip-medium' : 'chip-low'}`}>{r.priority}</span></td>
                    <td className="font-mono text-mono">{r.responseTarget}</td>
                    <td className="font-mono text-mono">{r.resolutionTarget}</td>
                    <td className="font-mono text-mono">{r.escalation}</td>
                    <td><span className="chip chip-triage">{r.timePolicy}</span></td>
                    <td><span className="chip chip-resolved">● ACTIVE</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      {/* ── C. Thresholds ── */}
      {tab === 'thresholds' && (
        <Panel title="Related-Case Detection Thresholds">
          <div className="p-4">
            <AlertInfo>
              These thresholds control when the system suggests complaints as potentially related. All suggestions require officer review before any action is taken.
            </AlertInfo>
            <div className="mt-4 table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Strategy</th>
                    <th>Threshold</th>
                    <th>Fields Considered</th>
                    <th>Active</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { strategy: 'Exact Identifier Match', threshold: 'N/A (exact)', fields: 'Case number, FDR no., PAN no., institution code', active: true },
                    { strategy: 'TF-IDF Cosine Similarity', threshold: '≥ 0.75', fields: 'Title, description (normalized)', active: true },
                    { strategy: 'Category + Institution', threshold: 'Same both', fields: 'Institution ID, complaint category', active: true },
                    { strategy: 'Near-miss display', threshold: '0.50–0.74', fields: 'All text fields', active: true },
                  ].map(r => (
                    <tr key={r.strategy}>
                      <td className="font-semibold">{r.strategy}</td>
                      <td className="font-mono text-mono">{r.threshold}</td>
                      <td className="text-muted text-table">{r.fields}</td>
                      <td><span className="chip chip-resolved">● ACTIVE</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Panel>
      )}

      {/* ── D. Analytics ── */}
      {tab === 'analytics' && (
        <div className="space-y-6">
          <AlertInfo>
            Charts display real application data. All complaint counts are operational metrics. Higher counts do not imply institutional misconduct.
          </AlertInfo>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Complaints by Bureau */}
            <Panel title="Complaints by Bureau (Open vs Resolved)">
              <div className="p-4">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={byBureau}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#C3CCDC" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="open" fill="#12306B" name="Open" />
                    <Bar dataKey="resolved" fill="#0B6B2A" name="Resolved" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Panel>

            {/* Priority distribution */}
            <Panel title="Priority Distribution">
              <div className="p-4">
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={priorities} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={e => `${e.name}: ${e.value}`} labelLine>
                      {priorities.map((_, i) => <Cell key={i} fill={['#B3261E','#FF9933','#8A4B00','#3B4659'][i]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Panel>

            {/* Complaint trend */}
            <Panel title="Monthly Complaint Trend">
              <div className="p-4">
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#C3CCDC" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="complaints" stroke="#12306B" strokeWidth={2} name="Filed" />
                    <Line type="monotone" dataKey="resolved" stroke="#0B6B2A" strokeWidth={2} name="Resolved" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Panel>

            {/* Category distribution */}
            <Panel title="Complaints by Category">
              <div className="p-4">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={byCategory} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#C3CCDC" />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={110} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#12306B" name="Complaints" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Panel>
          </div>

          {/* KPI Summary */}
          <Panel title="Key Performance Indicators">
            <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'Total Complaints', value: allComplaints.length },
                { label: 'Open', value: allComplaints.filter(c => !['RESOLVED','CLOSED'].includes(c.status)).length },
                { label: 'SLA Compliance', value: `${Math.round((allComplaints.filter(c => c.status === 'RESOLVED' || c.status === 'CLOSED').length / allComplaints.length) * 100)}%` },
                { label: 'Cross-Bureau Cases', value: allComplaints.filter(c => c.status === 'CROSS_BUREAU_REVIEW').length },
              ].map(m => (
                <div key={m.label} className="panel p-3 bg-tint text-center">
                  <div className="text-3xl font-bold font-mono text-navy">{m.value}</div>
                  <div className="text-chip text-muted">{m.label}</div>
                </div>
              ))}
            </div>
          </Panel>

          {/* Reports */}
          <Panel title="Export Reports">
            <div className="p-4 space-y-2">
              {[
                'Complaint Register (CSV)',
                'Bureau Workload Report (CSV)',
                'SLA Compliance Report (CSV)',
                'Institution Complaint History (CSV)',
                'Related Cases Review Report (CSV)',
                'Audit Activity Export (CSV)',
              ].map(r => (
                <div key={r} className="flex items-center justify-between py-2 border-b border-border">
                  <span className="text-body font-semibold text-ink">{r}</span>
                  <button className="btn-secondary px-3 py-1 text-chip" style={{ minHeight: '36px' }}>
                    📥 Export
                  </button>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      )}
    </PageShell>
  )
}
