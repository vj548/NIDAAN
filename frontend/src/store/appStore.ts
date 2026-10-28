import { create } from 'zustand'
import type { User, Status, Priority, Complaint, CaseRelationship, AuditEntry, Notification } from '../data/seed'
import {
  complaints as seedComplaints,
  relationships as seedRelationships,
  auditEntries as seedAudit,
  notifications as seedNotifications,
  users,
  DEMO_CAPTCHA,
  demoAccounts,
} from '../data/seed'

type Language = 'en' | 'hi'
type TextScale = 'sm' | 'md' | 'lg'

interface AppState {
  // Auth
  currentUser: User | null
  isLoggedIn: boolean

  // UI
  language: Language
  textScale: TextScale
  activeNavItem: string

  // Data (mutable copy of seed — simulates backend)
  complaints: Complaint[]
  relationships: CaseRelationship[]
  auditEntries: AuditEntry[]
  notifications: Notification[]

  // Filters
  complaintFilters: {
    search: string
    status: Status | ''
    priority: Priority | ''
    bureauId: string
    category: string
  }

  // Actions — Auth
  login: (userId: string, password: string, captcha: string) => { ok: boolean; error?: string }
  logout: () => void

  // Actions — UI
  setLanguage: (lang: Language) => void
  setTextScale: (scale: TextScale) => void
  setActiveNav: (item: string) => void

  // Actions — Complaints
  setComplaintFilters: (filters: Partial<AppState['complaintFilters']>) => void
  clearComplaintFilters: () => void
  updateComplaintStatus: (
    id: string,
    newStatus: Status,
    reason: string,
    actorName: string
  ) => void
  assignComplaint: (
    id: string,
    officerId: string,
    officerName: string,
    bureauId: string,
    bureauName: string,
    actorName: string
  ) => void
  addComplaint: (complaint: Complaint) => void
  addAuditEntry: (entry: Omit<AuditEntry, 'id' | 'ledgerId' | 'previousHash' | 'currentHash'>) => void

  // Actions — Relationships
  reviewRelationship: (
    id: string,
    decision: 'CONFIRMED' | 'DISMISSED' | 'FLAGGED',
    reviewedBy: string,
    reason: string
  ) => void

  // Actions — Notifications
  markNotificationRead: (id: string) => void
  markAllNotificationsRead: () => void

  // Derived
  unreadNotificationCount: () => number
  dashboardStats: () => {
    open: number
    myAction: number
    slaAtRisk: number
    resolved: number
  }
}

// Simple demo hash
function demoHash(input: string): string {
  let h = 0
  for (let i = 0; i < input.length; i++) {
    h = (Math.imul(31, h) + input.charCodeAt(i)) | 0
  }
  return Math.abs(h).toString(16).padStart(16, '0')
}

export const useAppStore = create<AppState>((set, get) => ({
  currentUser: null,
  isLoggedIn: false,
  language: 'en',
  textScale: 'md',
  activeNavItem: 'Dashboard',
  complaints: [...seedComplaints],
  relationships: [...seedRelationships],
  auditEntries: [...seedAudit],
  notifications: [...seedNotifications],
  complaintFilters: {
    search: '',
    status: '',
    priority: '',
    bureauId: '',
    category: '',
  },

  login: (userId, password, captcha) => {
    if (captcha !== DEMO_CAPTCHA) {
      return { ok: false, error: 'CAPTCHA entry does not match. Please enter the exact characters shown.' }
    }
    const account = demoAccounts.find(a => a.userId === userId)
    if (!account || account.password !== password) {
      return { ok: false, error: 'User ID or password is incorrect. Check your credentials and try again.' }
    }
    // Find matching user by name (demo mode — no backend)
    const user = users.find(u => u.name === account.name)
    if (!user) {
      // Build a synthetic user from the demoAccount
      const syntheticUser: User = {
        id: `DEMO-${account.userId}`,
        name: account.name,
        role: account.role,
        bureauId: null,
        bureauName: account.bureauName,
        email: `${account.userId}@demo.aicte`,
      }
      // Write OFFICER_LOGIN audit
      get().addAuditEntry({
        actorName: syntheticUser.name,
        eventType: 'OFFICER_LOGIN',
        complaintId: null,
        caseNumber: null,
        detail: `Officer login: ${syntheticUser.name} (${syntheticUser.role}${syntheticUser.bureauName ? ', ' + syntheticUser.bureauName : ''}). Session established.`,
        createdAt: new Date().toISOString(),
      })
      set({ currentUser: syntheticUser, isLoggedIn: true })
      applyTextScale(get().textScale)
      return { ok: true }
    }

    // Write OFFICER_LOGIN audit
    get().addAuditEntry({
      actorName: user.name,
      eventType: 'OFFICER_LOGIN',
      complaintId: null,
      caseNumber: null,
      detail: `Officer login: ${user.name} (${user.role}${user.bureauName ? ', ' + user.bureauName : ''}). Session established.`,
      createdAt: new Date().toISOString(),
    })

    set({ currentUser: user, isLoggedIn: true })
    // Apply text scale class
    applyTextScale(get().textScale)
    return { ok: true }
  },

  logout: () => {
    set({ currentUser: null, isLoggedIn: false })
  },

  setLanguage: (lang) => set({ language: lang }),

  setTextScale: (scale) => {
    applyTextScale(scale)
    set({ textScale: scale })
  },

  setActiveNav: (item) => set({ activeNavItem: item }),

  setComplaintFilters: (filters) =>
    set(s => ({ complaintFilters: { ...s.complaintFilters, ...filters } })),

  clearComplaintFilters: () =>
    set({ complaintFilters: { search: '', status: '', priority: '', bureauId: '', category: '' } }),

  updateComplaintStatus: (id, newStatus, reason, actorName) => {
    const complaint = get().complaints.find(c => c.id === id)
    if (!complaint) return
    const prevStatus = complaint.status
    set(s => ({
      complaints: s.complaints.map(c =>
        c.id === id ? { ...c, status: newStatus, updatedAt: new Date().toISOString() } : c
      ),
    }))
    get().addAuditEntry({
      actorName,
      eventType: 'STATUS_TRANSITION',
      complaintId: id,
      caseNumber: complaint.caseNumber,
      detail: `Status changed from ${prevStatus} → ${newStatus}. Reason: ${reason}`,
      createdAt: new Date().toISOString(),
    })
  },

  assignComplaint: (id, officerId, officerName, bureauId, bureauName, actorName) => {
    const complaint = get().complaints.find(c => c.id === id)
    if (!complaint) return
    set(s => ({
      complaints: s.complaints.map(c =>
        c.id === id
          ? { ...c, assignedOfficerId: officerId, assignedOfficerName: officerName, assignedBureauId: bureauId, assignedBureauName: bureauName }
          : c
      ),
    }))
    get().addAuditEntry({
      actorName,
      eventType: 'CASE_ASSIGNED',
      complaintId: id,
      caseNumber: complaint.caseNumber,
      detail: `Assigned to ${officerName} (${bureauName}). Previous officer: ${complaint.assignedOfficerName ?? 'unassigned'}.`,
      createdAt: new Date().toISOString(),
    })
  },

  addComplaint: (complaint) => {
    set(s => ({
      complaints: [complaint, ...s.complaints],
      notifications: [
        {
          id: `NOTIF-${Date.now()}`,
          type: 'CASE_LODGED',
          message: `${complaint.caseNumber}: ${complaint.title} (${complaint.institutionName}) lodged and awaiting triage.`,
          complaintId: complaint.id,
          caseNumber: complaint.caseNumber,
          createdAt: new Date().toISOString(),
          readAt: null,
        },
        ...s.notifications,
      ],
    }))
    get().addAuditEntry({
      actorName: complaint.assignedOfficerName ?? 'System / Portal',
      eventType: 'COMPLAINT_LODGED',
      complaintId: complaint.id,
      caseNumber: complaint.caseNumber,
      detail: `New complaint lodged: ${complaint.caseNumber} for ${complaint.institutionName} [Category: ${complaint.category}, Priority: ${complaint.priority}].`,
      createdAt: new Date().toISOString(),
    })
  },

  addAuditEntry: (entry) => {
    const entries = get().auditEntries
    const prev = entries[entries.length - 1]
    const prevHash = prev?.currentHash ?? '0000000000000000'
    const canonical = JSON.stringify({ ...entry, prevHash })
    const currentHash = demoHash(canonical)
    const newEntry: AuditEntry = {
      id: `L${String(entries.length + 1).padStart(3, '0')}`,
      ledgerId: `#${1000 + entries.length + 1}`,
      previousHash: prevHash,
      currentHash,
      ...entry,
    }
    set(s => ({ auditEntries: [...s.auditEntries, newEntry] }))
  },

  reviewRelationship: (id, decision, reviewedBy, reason) => {
    set(s => ({
      relationships: s.relationships.map(r =>
        r.id === id
          ? { ...r, reviewStatus: decision, reviewedBy, reviewReason: reason }
          : r
      ),
    }))
    const rel = get().relationships.find(r => r.id === id)
    if (rel) {
      get().addAuditEntry({
        actorName: reviewedBy,
        eventType: decision === 'CONFIRMED' ? 'RELATIONSHIP_CONFIRMED' : decision === 'DISMISSED' ? 'RELATIONSHIP_DISMISSED' : 'STATUS_TRANSITION',
        complaintId: rel.sourceId,
        caseNumber: rel.sourceCaseNumber,
        detail: `Relationship ${rel.sourceCaseNumber} ↔ ${rel.targetCaseNumber} ${decision.toLowerCase()}. Reason: ${reason}`,
        createdAt: new Date().toISOString(),
      })
    }
  },

  markNotificationRead: (id) => {
    set(s => ({
      notifications: s.notifications.map(n =>
        n.id === id ? { ...n, readAt: new Date().toISOString() } : n
      ),
    }))
  },

  markAllNotificationsRead: () => {
    const now = new Date().toISOString()
    set(s => ({
      notifications: s.notifications.map(n => ({ ...n, readAt: n.readAt ?? now })),
    }))
  },

  unreadNotificationCount: () =>
    get().notifications.filter(n => !n.readAt).length,

  dashboardStats: () => {
    const complaints = get().complaints
    const user = get().currentUser
    return {
      open: complaints.filter(c =>
        !['RESOLVED', 'CLOSED'].includes(c.status)
      ).length,
      myAction: complaints.filter(c =>
        c.assignedOfficerId === user?.id && ['ACTION_REQUIRED', 'TRIAGE_PENDING'].includes(c.status)
      ).length,
      slaAtRisk: complaints.filter(c =>
        ['SLA_AT_RISK', 'SLA_BREACHED'].includes(c.status)
      ).length,
      resolved: complaints.filter(c =>
        ['RESOLVED', 'CLOSED'].includes(c.status)
      ).length,
    }
  },
}))

function applyTextScale(scale: TextScale) {
  const root = document.documentElement
  root.classList.remove('scale-sm', 'scale-lg')
  if (scale === 'sm') root.classList.add('scale-sm')
  if (scale === 'lg') root.classList.add('scale-lg')
}
