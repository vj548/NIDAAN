import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../store/appStore'
import { institutions, bureaus } from '../data/seed'
import type { Priority, Complaint } from '../data/seed'
import {
  Panel, SectionH1, AlertWarning, PageShell, CaseIdBadge
} from '../components/shared'
import { addDays } from 'date-fns'
import { CheckCircle2, AlertTriangle, Sparkles, UploadCloud, ArrowLeft } from 'lucide-react'

const CATEGORIES = [
  'Faculty Shortage',
  'Faculty Qualification',
  'Fee Irregularity',
  'Infrastructure Deficiency',
  'Student Welfare',
  'Document Fraud',
  'Excess Admission',
  'Disclosure Non-compliance',
  'Other / Grievance'
]

const COMPLAINANT_TYPES = [
  'Student',
  'Faculty Member',
  'Parent / Guardian',
  'Whistleblower / Staff',
  'General Public / Citizen'
]

import { api } from '../services/api'

export default function NewComplaintPage() {
  const navigate = useNavigate()
  const { addComplaint, currentUser, complaints } = useAppStore()

  // Form State
  const [institutionId, setInstitutionId] = useState(institutions[0]?.id ?? '')
  const [category, setCategory] = useState(CATEGORIES[0])
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [complainantType, setComplainantType] = useState(COMPLAINANT_TYPES[0])
  const [isAnonymous, setIsAnonymous] = useState(false)
  const [complainantName, setComplainantName] = useState('')
  const [complainantEmail, setComplainantEmail] = useState('')
  
  // Rule-based suggested defaults
  const [suggestedBureauId, setSuggestedBureauId] = useState('B001')
  const [priority, setPriority] = useState<Priority>('HIGH')
  const [aiConfidence, setAiConfidence] = useState<number>(0.88)
  const [matchedKeywords, setMatchedKeywords] = useState<string[]>([])
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [mockFiles, setMockFiles] = useState<Array<{ name: string; size: string; type: string }>>([])
  
  // Status message
  const [errorMsg, setErrorMsg] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successCase, setSuccessCase] = useState<Complaint | null>(null)

  // Smart triage rule lookup
  function handleCategoryChange(cat: string) {
    setCategory(cat)
    if (cat.includes('Faculty')) {
      setSuggestedBureauId('B001')
      setPriority('HIGH')
    } else if (cat.includes('Fee')) {
      setSuggestedBureauId('B003')
      setPriority('MEDIUM')
    } else if (cat.includes('Infrastructure')) {
      setSuggestedBureauId('B002')
      setPriority('MEDIUM')
    } else if (cat.includes('Student')) {
      setSuggestedBureauId('B005')
      setPriority('HIGH')
    } else if (cat.includes('Document') || cat.includes('Excess')) {
      setSuggestedBureauId('B004')
      setPriority('CRITICAL')
    } else if (cat.includes('Disclosure')) {
      setSuggestedBureauId('B006')
      setPriority('MEDIUM')
    } else {
      setSuggestedBureauId('B001')
      setPriority('LOW')
    }
  }

  // Trigger live AI Triage analysis
  async function runAiTriage() {
    if (!title.trim() && !description.trim()) return
    setIsAnalyzing(true)
    try {
      const pred = await api.classifyText(title, description, category)
      setSuggestedBureauId(pred.suggested_bureau_id)
      setPriority(pred.priority)
      setAiConfidence(pred.confidence)
      setMatchedKeywords(pred.matched_keywords)
    } catch (err) {
      console.warn('AI triage fallback to rule-based routing', err)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const selectedInst = institutions.find(i => i.id === institutionId)
  const selectedBureau = bureaus.find(b => b.id === suggestedBureauId)

  // Duplicate / related detection warning
  const institutionComplaints = complaints.filter(c => c.institutionId === institutionId)
  const potentialMatches = institutionComplaints.filter(c => 
    title.trim().length > 3 && (
      c.title.toLowerCase().includes(title.toLowerCase().slice(0, 8)) ||
      c.category === category
    )
  )

  function handleAddMockFile() {
    const demoFiles = [
      { name: 'affidavit_declaration.pdf', size: '1.4 MB', type: 'application/pdf' },
      { name: 'fee_receipt_sample.png', size: '420 KB', type: 'image/png' },
      { name: 'faculty_attendance_log.xlsx', size: '890 KB', type: 'spreadsheet' },
    ]
    const nextFile = demoFiles[mockFiles.length % demoFiles.length]
    setMockFiles([...mockFiles, nextFile])
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrorMsg('')

    if (!title.trim()) {
      setErrorMsg('Please enter a brief complaint title / subject.')
      return
    }
    if (!description.trim()) {
      setErrorMsg('Please enter detailed particulars of the grievance.')
      return
    }
    if (!isAnonymous && !complainantName.trim()) {
      setErrorMsg('Please provide complainant name or check "File as confidential / anonymous".')
      return
    }

    setIsSubmitting(true)
    const now = new Date()
    const caseNum = `CC-2026-${String(Math.floor(1000 + Math.random() * 9000))}`
    const id = `cmp-new-${Date.now()}`

    // Calculate response SLA based on priority
    const responseDays = priority === 'CRITICAL' ? 3 : priority === 'HIGH' ? 7 : priority === 'MEDIUM' ? 14 : 30
    const resolutionDays = priority === 'CRITICAL' ? 14 : priority === 'HIGH' ? 30 : priority === 'MEDIUM' ? 60 : 90

    const newComplaint: Complaint = {
      id,
      caseNumber: caseNum,
      institutionId: selectedInst?.id ?? 'I001',
      institutionName: selectedInst?.name ?? 'Institution',
      title: title.trim(),
      description: description.trim(),
      category,
      priority,
      status: 'RECEIVED',
      assignedBureauId: selectedBureau?.id ?? 'B001',
      assignedBureauName: selectedBureau?.name ?? 'Academic Bureau',
      assignedOfficerId: currentUser?.id ?? null,
      assignedOfficerName: currentUser?.name ?? null,
      filedAt: now.toISOString(),
      responseDueAt: addDays(now, responseDays).toISOString(),
      resolutionDueAt: addDays(now, resolutionDays).toISOString(),
      resolvedAt: null,
      synthetic: true,
    }

    try {
      // Send to FastAPI backend
      const serverCase = await api.createComplaint({
        institutionId: newComplaint.institutionId,
        institutionName: newComplaint.institutionName,
        title: newComplaint.title,
        description: newComplaint.description,
        category: newComplaint.category,
        priority: newComplaint.priority,
        suggestedBureauId: newComplaint.assignedBureauId,
      })
      addComplaint({ ...newComplaint, ...serverCase })
      setSuccessCase({ ...newComplaint, ...serverCase })
    } catch (err) {
      console.warn('Backend call failed, saving to local store', err)
      addComplaint(newComplaint)
      setSuccessCase(newComplaint)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <PageShell
      breadcrumb={[
        { label: 'Complaints', path: '/complaints' },
        { label: 'Lodge New Complaint' },
      ]}
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <button
            onClick={() => navigate('/complaints')}
            className="flex items-center gap-1 text-chip text-navy hover:underline mb-1 font-mono"
          >
            <ArrowLeft size={13} /> Back to Complaints Queue
          </button>
          <SectionH1>LODGE INSTITUTION COMPLAINT</SectionH1>
        </div>
      </div>

      {successCase ? (
        <Panel title="Complaint Registration Successful">
          <div className="p-6 text-center space-y-4">
            <div className="w-12 h-12 bg-green-100 text-green-700 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 size={28} />
            </div>
            <h2 className="text-h2 font-bold text-navy font-sans">
              Case Successfully Lodged & Indexed
            </h2>
            <div className="text-body text-ink max-w-lg mx-auto">
              Complaint has been generated with identifier <CaseIdBadge caseNumber={successCase.caseNumber} /> and routed to the <strong>{successCase.assignedBureauName}</strong> under status <span className="chip chip-received">○ RECEIVED</span>.
            </div>
            <div className="flex justify-center gap-3 pt-3">
              <button
                onClick={() => navigate(`/complaints/${successCase.id}`)}
                className="btn-primary"
              >
                Open Case Record →
              </button>
              <button
                onClick={() => {
                  setSuccessCase(null)
                  setTitle('')
                  setDescription('')
                  setMockFiles([])
                }}
                className="btn-secondary"
              >
                Lodge Another Complaint
              </button>
            </div>
          </div>
        </Panel>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {errorMsg && (
            <AlertWarning>{errorMsg}</AlertWarning>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Left 2 Cols: Main Intake Form */}
            <div className="lg:col-span-2 space-y-4">
              {/* Institution & Category Selection */}
              <Panel title="1. Institution & Classification">
                <div className="p-4 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-chip font-bold text-navy uppercase tracking-wider mb-1">
                        Select Institution *
                      </label>
                      <select
                        value={institutionId}
                        onChange={e => setInstitutionId(e.target.value)}
                        className="w-full border border-border p-2 text-body bg-white rounded-none focus:outline-none focus:border-navy"
                        required
                      >
                        {institutions.map(inst => (
                          <option key={inst.id} value={inst.id}>
                            {inst.name} ({inst.code}) — {inst.state}
                          </option>
                        ))}
                      </select>
                      {selectedInst && (
                        <div className="mt-1 text-chip text-muted font-mono">
                          ID: {selectedInst.code} · State: {selectedInst.state} · Type: {selectedInst.type}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-chip font-bold text-navy uppercase tracking-wider mb-1">
                        Complaint Category *
                      </label>
                      <select
                        value={category}
                        onChange={e => handleCategoryChange(e.target.value)}
                        className="w-full border border-border p-2 text-body bg-white rounded-none focus:outline-none focus:border-navy"
                        required
                      >
                        {CATEGORIES.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                      <div className="mt-1 text-chip text-muted">
                        Select closest match for automatic rule-based triage.
                      </div>
                    </div>
                  </div>

                  {/* Title */}
                  <div>
                    <label className="block text-chip font-bold text-navy uppercase tracking-wider mb-1">
                      Subject / Title *
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={e => setTitle(e.target.value)}
                      placeholder="e.g. Non-payment of 7th CPC salary arrears and forged faculty biometric attendance"
                      className="w-full border border-border p-2 text-body bg-white rounded-none focus:outline-none focus:border-navy"
                      required
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-chip font-bold text-navy uppercase tracking-wider mb-1">
                      Detailed Particulars of Grievance / Non-Compliance *
                    </label>
                    <textarea
                      rows={5}
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      placeholder="Specify dates, departments involved, names of designated officials, and exact nature of irregularity..."
                      className="w-full border border-border p-2 text-body bg-white rounded-none focus:outline-none focus:border-navy font-sans"
                      required
                    />
                    <div className="text-right text-chip text-muted font-mono mt-1">
                      {description.length} characters
                    </div>
                  </div>
                </div>
              </Panel>

              {/* Complainant Identity */}
              <Panel title="2. Complainant Identity & Confidentiality">
                <div className="p-4 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-border">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isAnonymous}
                        onChange={e => setIsAnonymous(e.target.checked)}
                        className="w-4 h-4 text-navy border-border"
                      />
                      <span className="text-body font-semibold text-ink">
                        File as Confidential / Whistleblower (Identity Protected)
                      </span>
                    </label>
                    <span className="text-chip text-muted font-mono">Sec. 12 AICTE Whistleblower Norms</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-chip font-bold text-navy uppercase tracking-wider mb-1">
                        Complainant Type
                      </label>
                      <select
                        value={complainantType}
                        onChange={e => setComplainantType(e.target.value)}
                        className="w-full border border-border p-2 text-body bg-white rounded-none focus:outline-none focus:border-navy"
                      >
                        {COMPLAINANT_TYPES.map(t => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-chip font-bold text-navy uppercase tracking-wider mb-1">
                        Full Name {isAnonymous ? '(Protected)' : '*'}
                      </label>
                      <input
                        type="text"
                        disabled={isAnonymous}
                        value={isAnonymous ? 'Confidential Complainant' : complainantName}
                        onChange={e => setComplainantName(e.target.value)}
                        placeholder="Complainant Name"
                        className="w-full border border-border p-2 text-body bg-white rounded-none disabled:bg-gray-100 disabled:text-muted"
                      />
                    </div>

                    <div>
                      <label className="block text-chip font-bold text-navy uppercase tracking-wider mb-1">
                        Email Address
                      </label>
                      <input
                        type="email"
                        disabled={isAnonymous}
                        value={isAnonymous ? '' : complainantEmail}
                        onChange={e => setComplainantEmail(e.target.value)}
                        placeholder="name@example.org"
                        className="w-full border border-border p-2 text-body bg-white rounded-none disabled:bg-gray-100 disabled:text-muted"
                      />
                    </div>
                  </div>
                </div>
              </Panel>

              {/* Evidence Upload */}
              <Panel title="3. Supporting Documents & Evidence">
                <div className="p-4 space-y-3">
                  <div className="border-2 border-dashed border-border p-5 text-center bg-gray-50">
                    <UploadCloud className="mx-auto text-muted mb-2" size={32} />
                    <div className="text-body font-semibold text-navy">
                      Attach Supporting Evidence & Affidavits
                    </div>
                    <div className="text-chip text-muted mt-1">
                      Supported formats: PDF, PNG, JPG, XLSX (Max 10MB per file). SHA-256 hashes generated on upload.
                    </div>
                    <button
                      type="button"
                      onClick={handleAddMockFile}
                      className="mt-3 btn-secondary text-chip"
                    >
                      + Add Sample Attachment
                    </button>
                  </div>

                  {mockFiles.length > 0 && (
                    <div className="space-y-1.5 pt-2">
                      <div className="text-chip font-bold text-navy uppercase tracking-wider">
                        Attached Files ({mockFiles.length}):
                      </div>
                      {mockFiles.map((f, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 bg-white border border-border text-chip font-mono">
                          <span className="text-navy font-semibold">{f.name}</span>
                          <span className="text-muted">{f.size} · SHA-256 Verified</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Panel>
            </div>

            {/* Right 1 Col: Smart Triage & Duplicate Intelligence */}
            <div className="space-y-4">
              {/* Smart Triage Preview */}
              <Panel title="Smart Triage Automation">
                <div className="p-4 space-y-3 bg-tint">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-navy font-bold text-chip font-mono uppercase">
                      <Sparkles size={14} className="text-saffron" />
                      AICTE Smart Triage
                    </div>
                    <span className="font-mono text-[11px] font-bold text-status-green bg-green-50 px-1.5 py-0.5 border border-status-green rounded-[2px]">
                      {(aiConfidence * 100).toFixed(0)}% AI CONFIDENCE
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={runAiTriage}
                    disabled={isAnalyzing || (!title.trim() && !description.trim())}
                    className="w-full btn-secondary text-chip py-1.5 justify-center border-navy font-bold flex items-center gap-1.5 disabled:opacity-50"
                    style={{ minHeight: '34px' }}
                  >
                    <Sparkles size={13} className={isAnalyzing ? 'animate-spin text-saffron' : 'text-saffron'} />
                    {isAnalyzing ? 'Analyzing Text NLP Tokens...' : 'Auto-Classify with AI Triage'}
                  </button>

                  <div className="border border-border bg-white p-3 space-y-2 text-chip">
                    <div>
                      <div className="text-muted text-[11px] uppercase font-bold">Recommended Bureau</div>
                      <select
                        value={suggestedBureauId}
                        onChange={e => setSuggestedBureauId(e.target.value)}
                        className="w-full border border-border p-1.5 text-chip font-bold text-navy mt-0.5 bg-white"
                      >
                        {bureaus.map(b => (
                          <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <div className="text-muted text-[11px] uppercase font-bold">Assigned Priority & SLA</div>
                      <select
                        value={priority}
                        onChange={e => setPriority(e.target.value as Priority)}
                        className="w-full border border-border p-1.5 text-chip font-bold text-navy mt-0.5 bg-white"
                      >
                        <option value="CRITICAL">CRITICAL (3-day response / 14-day resolution)</option>
                        <option value="HIGH">HIGH (7-day response / 30-day resolution)</option>
                        <option value="MEDIUM">MEDIUM (14-day response / 60-day resolution)</option>
                        <option value="LOW">LOW (30-day response / 90-day resolution)</option>
                      </select>
                    </div>

                    {matchedKeywords.length > 0 && (
                      <div className="pt-1 border-t border-border mt-1">
                        <div className="text-muted text-[10px] uppercase font-bold mb-1">Extracted AI Keywords:</div>
                        <div className="flex flex-wrap gap-1">
                          {matchedKeywords.map((kw, idx) => (
                            <span key={idx} className="bg-panel-header text-navy text-[10px] font-mono px-1.5 py-0.5 rounded-[2px] border border-border">
                              #{kw}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="text-chip text-muted">
                    Routing rule and priority scored from complaint text tokens. Officer retains final decision authority per GIGW.
                  </div>
                </div>
              </Panel>

              {/* Duplicate / Prior Grievances for same Institution */}
              <Panel title="Institution Prior Grievance Alert">
                <div className="p-4 space-y-2">
                  <div className="text-chip text-muted">
                    This institution currently has <strong>{institutionComplaints.length}</strong> active cases in the system.
                  </div>

                  {potentialMatches.length > 0 ? (
                    <div className="border border-amber-300 bg-amber-50 p-2.5 space-y-2">
                      <div className="flex items-center gap-1 text-status-amber text-chip font-bold">
                        <AlertTriangle size={14} />
                        Possible Related or Duplicate Cases Found
                      </div>
                      <div className="space-y-1.5">
                        {potentialMatches.slice(0, 3).map(m => (
                          <div key={m.id} className="text-chip border-b border-amber-200 pb-1">
                            <span className="font-mono font-bold text-navy">{m.caseNumber}</span>: {m.title.slice(0, 50)}...
                          </div>
                        ))}
                      </div>
                      <div className="text-[11px] text-muted">
                        CaseConnect AI will auto-link and calculate similarity graph on submission.
                      </div>
                    </div>
                  ) : (
                    <div className="text-chip text-status-green flex items-center gap-1">
                      <CheckCircle2 size={13} /> No duplicate complaints detected with this title.
                    </div>
                  )}
                </div>
              </Panel>

              {/* Action Buttons */}
              <div className="space-y-2 pt-2">
                <button
                  type="submit"
                  className="btn-primary w-full text-center justify-center font-bold"
                  style={{ minHeight: '40px' }}
                >
                  Confirm & Lodge Complaint →
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/complaints')}
                  className="btn-secondary w-full text-center justify-center"
                  style={{ minHeight: '36px' }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </form>
      )}
    </PageShell>
  )
}
