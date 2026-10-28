import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../store/appStore'
import {
  Panel, StatusChip, PriorityChip, SynthTag, CaseIdBadge,
  SectionH1, EmptyState, Pagination, PageShell
} from '../components/shared'
import type { Status, Priority } from '../data/seed'
import { bureaus } from '../data/seed'
import { format, isPast } from 'date-fns'
import { Search, RotateCcw, Plus, ChevronUp, ChevronDown } from 'lucide-react'

const ALL_STATUSES: Status[] = [
  'RECEIVED','TRIAGE_PENDING','UNDER_REVIEW','CROSS_BUREAU_REVIEW',
  'ACTION_REQUIRED','SLA_AT_RISK','SLA_BREACHED','RESOLVED','CLOSED','ON_HOLD','REOPENED'
]
const ALL_PRIORITIES: Priority[] = ['CRITICAL','HIGH','MEDIUM','LOW']
const ALL_CATEGORIES = [
  'Faculty Shortage','Faculty Qualification','Fee Irregularity','Infrastructure Deficiency',
  'Excess Admission','Disclosure Non-compliance','Student Welfare','Faculty Welfare',
  'Document Fraud','Affiliation Issue'
]

const PER_PAGE = 10

type SortField = 'caseNumber' | 'filedAt' | 'responseDueAt' | 'priority'
type SortDir = 'asc' | 'desc'

const PRIORITY_ORDER: Record<Priority, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 }

export default function ComplaintsPage() {
  const navigate = useNavigate()
  const allComplaints = useAppStore(s => s.complaints)
  const { complaintFilters, setComplaintFilters, clearComplaintFilters } = useAppStore()

  const [localSearch, setLocalSearch] = useState(complaintFilters.search)
  const [localStatus, setLocalStatus] = useState<Status | ''>(complaintFilters.status)
  const [localPriority, setLocalPriority] = useState<Priority | ''>(complaintFilters.priority)
  const [localBureau, setLocalBureau] = useState(complaintFilters.bureauId)
  const [localCategory, setLocalCategory] = useState(complaintFilters.category)
  const [page, setPage] = useState(1)
  const [sortField, setSortField] = useState<SortField>('filedAt')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [activeStatusTile, setActiveStatusTile] = useState<Status | ''>('')

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setComplaintFilters({ search: localSearch, status: localStatus, priority: localPriority, bureauId: localBureau, category: localCategory })
    setPage(1)
  }

  function handleReset() {
    setLocalSearch(''); setLocalStatus(''); setLocalPriority(''); setLocalBureau(''); setLocalCategory('')
    clearComplaintFilters(); setActiveStatusTile(''); setPage(1)
  }

  function toggleStatusTile(status: Status) {
    if (activeStatusTile === status) {
      setActiveStatusTile('')
      setLocalStatus('')
      setComplaintFilters({ status: '' })
    } else {
      setActiveStatusTile(status)
      setLocalStatus(status)
      setComplaintFilters({ status })
    }
    setPage(1)
  }

  function toggleSort(field: SortField) {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('asc') }
  }

  const filtered = useMemo(() => {
    let list = [...allComplaints]
    const search = (complaintFilters.search || localSearch).toLowerCase()
    const status = activeStatusTile || complaintFilters.status
    if (search) list = list.filter(c =>
      c.caseNumber.toLowerCase().includes(search) ||
      c.title.toLowerCase().includes(search) ||
      c.description.toLowerCase().includes(search) ||
      c.institutionName.toLowerCase().includes(search)
    )
    if (status) list = list.filter(c => c.status === status)
    if (complaintFilters.priority) list = list.filter(c => c.priority === complaintFilters.priority)
    if (localPriority && !complaintFilters.priority) list = list.filter(c => c.priority === localPriority)
    if (complaintFilters.bureauId) list = list.filter(c => c.assignedBureauId === complaintFilters.bureauId)
    if (complaintFilters.category) list = list.filter(c => c.category === complaintFilters.category)

    // Sort
    list.sort((a, b) => {
      let diff = 0
      if (sortField === 'caseNumber') diff = a.caseNumber.localeCompare(b.caseNumber)
      else if (sortField === 'filedAt') diff = new Date(a.filedAt).getTime() - new Date(b.filedAt).getTime()
      else if (sortField === 'responseDueAt') diff = new Date(a.responseDueAt).getTime() - new Date(b.responseDueAt).getTime()
      else if (sortField === 'priority') diff = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
      return sortDir === 'asc' ? diff : -diff
    })
    return list
  }, [allComplaints, complaintFilters, localSearch, localPriority, activeStatusTile, sortField, sortDir])

  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    ALL_STATUSES.forEach(s => { counts[s] = allComplaints.filter(c => c.status === s).length })
    return counts
  }, [allComplaints])

  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field) return null
    return sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
  }

  return (
    <PageShell breadcrumb={[{ label: 'Complaints' }]}>
      <SectionH1>Complaints Queue</SectionH1>

      {/* ── Search panel ── */}
      <Panel title="Search and Filter" className="mb-6">
        <form onSubmit={handleSearch} className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            <div>
              <label htmlFor="q-search" className="form-label">Case ID / Subject / Institution</label>
              <input id="q-search" className="form-input" value={localSearch} onChange={e => setLocalSearch(e.target.value)} placeholder="Search by any identifier or keyword" />
            </div>
            <div>
              <label htmlFor="q-status" className="form-label">Status</label>
              <select id="q-status" className="form-select" value={localStatus} onChange={e => setLocalStatus(e.target.value as Status | '')}>
                <option value="">All statuses</option>
                {ALL_STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g,' ')}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="q-priority" className="form-label">Priority</label>
              <select id="q-priority" className="form-select" value={localPriority} onChange={e => setLocalPriority(e.target.value as Priority | '')}>
                <option value="">All priorities</option>
                {ALL_PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="q-bureau" className="form-label">Bureau</label>
              <select id="q-bureau" className="form-select" value={localBureau} onChange={e => setLocalBureau(e.target.value)}>
                <option value="">All bureaus</option>
                {bureaus.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="q-category" className="form-label">Category</label>
              <select id="q-category" className="form-select" value={localCategory} onChange={e => setLocalCategory(e.target.value)}>
                <option value="">All categories</option>
                {ALL_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button type="submit" className="btn-primary">
              <Search size={16} /> Search
            </button>
            <button type="button" onClick={handleReset} className="btn-secondary">
              <RotateCcw size={16} /> Reset
            </button>
            <button
              type="button"
              onClick={() => navigate('/complaints/new')}
              className="btn-primary ml-auto bg-status-green border-status-green"
            >
              <Plus size={16} /> New Complaint
            </button>
          </div>
        </form>
      </Panel>

      {/* ── Status summary tiles ── */}
      <div className="mb-6">
        <div className="flex flex-wrap gap-2">
          {ALL_STATUSES.filter(s => statusCounts[s] > 0).map(s => (
            <button
              key={s}
              onClick={() => toggleStatusTile(s)}
              className={`flex items-center gap-2 px-3 py-2 border text-body font-semibold transition-all ${
                activeStatusTile === s
                  ? 'border-saffron bg-orange-50 shadow-inner'
                  : 'border-border bg-white hover:border-navy hover:bg-tint'
              }`}
              style={{ borderRadius: '2px', minHeight: '44px', boxShadow: activeStatusTile === s ? 'inset 0 0 0 2px #FF9933' : undefined }}
              aria-pressed={activeStatusTile === s}
            >
              <StatusChip status={s} />
              <span className="font-mono text-mono text-navy font-bold">{statusCounts[s]}</span>
            </button>
          ))}
        </div>
        {activeStatusTile && (
          <p className="text-chip text-muted mt-2">
            Filtering by status: <strong>{activeStatusTile}</strong> · Click tile again to clear
          </p>
        )}
      </div>

      {/* ── Table ── */}
      <Panel>
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Sr.</th>
                <th>
                  <button onClick={() => toggleSort('caseNumber')} className="flex items-center gap-1 text-white font-semibold">
                    Case ID <SortIcon field="caseNumber" />
                  </button>
                </th>
                <th>Institution</th>
                <th>Category</th>
                <th>Assigned Bureau</th>
                <th>
                  <button onClick={() => toggleSort('priority')} className="flex items-center gap-1 text-white font-semibold">
                    Priority <SortIcon field="priority" />
                  </button>
                </th>
                <th>
                  <button onClick={() => toggleSort('filedAt')} className="flex items-center gap-1 text-white font-semibold">
                    Filed <SortIcon field="filedAt" />
                  </button>
                </th>
                <th>
                  <button onClick={() => toggleSort('responseDueAt')} className="flex items-center gap-1 text-white font-semibold">
                    SLA Deadline <SortIcon field="responseDueAt" />
                  </button>
                </th>
                <th>Status</th>
                <th>View</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={10}>
                    <EmptyState icon="🔍" title="No complaints match this filter" subtitle="Try adjusting your search criteria or clearing the filters." />
                  </td>
                </tr>
              ) : (
                paginated.map((c, i) => {
                  const overdue = isPast(new Date(c.responseDueAt)) && !['RESOLVED', 'CLOSED'].includes(c.status)
                  return (
                    <tr key={c.id} className={overdue ? 'bg-red-50' : ''}>
                      <td className="text-muted text-chip font-mono">{(page - 1) * PER_PAGE + i + 1}</td>
                      <td>
                        <CaseIdBadge caseNumber={c.caseNumber} />
                      </td>
                      <td>
                        <div className="font-semibold text-ink">{c.institutionName}</div>
                        <SynthTag />
                      </td>
                      <td className="text-muted text-table">{c.category}</td>
                      <td className="text-table">{c.assignedBureauName}</td>
                      <td><PriorityChip priority={c.priority} /></td>
                      <td className="font-mono text-mono text-muted">{format(new Date(c.filedAt), 'dd MMM yyyy')}</td>
                      <td>
                        <span className={`font-mono text-mono ${overdue ? 'text-status-red font-semibold' : 'text-muted'}`}>
                          {format(new Date(c.responseDueAt), 'dd MMM yyyy')}
                          {overdue && <span className="ml-1 chip chip-sla-breached">OVERDUE</span>}
                        </span>
                      </td>
                      <td><StatusChip status={c.status} /></td>
                      <td>
                        <button
                          onClick={() => navigate(`/complaints/${c.id}`)}
                          className="btn-secondary px-3 py-1 text-chip"
                          style={{ minHeight: '36px' }}
                        >
                          View →
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2 border-t border-border bg-tint flex items-center justify-between flex-wrap gap-2">
          <span className="text-chip text-muted font-mono">
            Showing {paginated.length} of {filtered.length} complaints (total: {allComplaints.length}) · Zero auto-approval, zero auto-rejection
          </span>
          <Pagination page={page} total={filtered.length} perPage={PER_PAGE} onPage={setPage} />
        </div>
      </Panel>
    </PageShell>
  )
}
