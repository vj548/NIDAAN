// CaseConnect AI / PRAMAAN Typed API Client Service

export interface TriagePrediction {
  suggested_bureau_id: string
  suggested_bureau_name: string
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
  priority_reason: string
  confidence: number
  matched_keywords: string[]
  sla: {
    response_days: number
    resolution_days: number
  }
}

export interface VerifyChainResult {
  intact: boolean
  brokenIndex: number
  brokenLedgerId: string | null
  message: string
  recomputedCount: number
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {}
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
  }

  const res = await fetch(endpoint, {
    ...options,
    headers: {
      ...headers,
      ...options.headers,
    },
  })

  if (!res.ok) {
    let errorMsg = `Server error ${res.status}`
    try {
      const errJson = await res.json()
      if (errJson.detail) errorMsg = errJson.detail
    } catch {
      // fallback error
    }
    throw new Error(errorMsg)
  }

  return res.json()
}

export const api = {
  // Stats
  getStats: () => request<{ open: number; myAction: number; slaAtRisk: number; resolved: number; total: number }>('/api/stats'),

  // Auth
  login: (userId: string, password: string, captcha: string) =>
    request<{ ok: boolean; user: any; token: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ userId, password, captcha }),
    }),

  // Complaints
  getComplaints: (params?: { search?: string; status?: string; priority?: string; bureauId?: string; institutionId?: string }) => {
    const query = new URLSearchParams()
    if (params?.search) query.set('search', params.search)
    if (params?.status) query.set('status', params.status)
    if (params?.priority) query.set('priority', params.priority)
    if (params?.bureauId) query.set('bureauId', params.bureauId)
    if (params?.institutionId) query.set('institutionId', params.institutionId)
    const qStr = query.toString()
    return request<any[]>(`/api/complaints${qStr ? '?' + qStr : ''}`)
  },

  getComplaintById: (id: string) => request<any>(`/api/complaints/${id}`),

  createComplaint: (data: {
    institutionId: string
    institutionName: string
    title: string
    description: string
    category: string
    priority?: string
    suggestedBureauId?: string
    complainantName?: string
    complainantRole?: string
  }) =>
    request<any>('/api/complaints', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  validateComplaint: (id: string) =>
    request<{ ok: boolean; complaint: any; message: string }>(`/api/complaints/${id}/validate`, {
      method: 'POST',
    }),

  submitDecision: (id: string, decision: 'CONFIRM' | 'DISMISS' | 'RESUBMISSION' | 'RESOLVE' | 'CLOSE', reason: string, actorName: string) =>
    request<{ ok: boolean; complaint: any }>(`/api/complaints/${id}/decision`, {
      method: 'POST',
      body: JSON.stringify({ decision, reason, actorName }),
    }),

  transitionComplaint: (id: string, newStatus: string, reason: string, actorName: string) =>
    request<{ ok: boolean; complaint: any }>(`/api/complaints/${id}/transition`, {
      method: 'POST',
      body: JSON.stringify({ newStatus, reason, actorName }),
    }),

  transferComplaint: (id: string, targetBureauId: string, reason: string, actorName: string) =>
    request<{ ok: boolean; complaint: any }>(`/api/complaints/${id}/transfer`, {
      method: 'POST',
      body: JSON.stringify({ targetBureauId, reason, actorName }),
    }),

  getCaseEvents: (id: string) => request<any[]>(`/api/complaints/${id}/events`),

  getCaseCandidates: (id: string) => request<any>(`/api/complaints/${id}/candidates`),

  // Institutions & Bureaus
  getInstitutions: () => request<any[]>('/api/institutions'),
  getInstitutionById: (id: string) => request<any>(`/api/institutions/${id}`),
  getBureaus: () => request<any[]>('/api/bureaus'),

  // Relationships / Cognitive Linking
  getRelationships: () => request<any[]>('/api/relationships'),
  submitRelationshipDecision: (id: string, decision: 'CONFIRM' | 'DISMISS' | 'FLAG', reason: string, actorName: string) =>
    request<{ ok: boolean; relationship: any }>(`/api/relationships/${id}/decision`, {
      method: 'POST',
      body: JSON.stringify({ decision, reason, actorName }),
    }),

  // SLA Monitoring
  getSlaSummary: () => request<any>('/api/sla/summary'),

  // In-App Notifications
  getNotifications: () => request<{ unreadCount: number; notifications: any[] }>('/api/notifications'),
  markNotificationRead: (id: string) => request<any>(`/api/notifications/${id}/read`, { method: 'PATCH' }),
  markAllNotificationsRead: () => request<any>('/api/notifications/mark-all-read', { method: 'POST' }),

  // Evidence Management
  uploadEvidence: (complaintId: string, file: File, uploadedBy: string = 'Officer Arjun Sharma') => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('uploadedBy', uploadedBy)
    return request<any>(`/api/complaints/${complaintId}/evidence`, {
      method: 'POST',
      body: formData,
    })
  },
  getCaseEvidence: (complaintId: string) => request<any[]>(`/api/complaints/${complaintId}/evidence`),
  getEvidenceDownloadUrl: (evidenceId: string) => `/api/evidence/${evidenceId}/download`,

  // Smart Triage AI
  classifyText: (title: string, description: string, category?: string) =>
    request<TriagePrediction>('/api/triage/classify', {
      method: 'POST',
      body: JSON.stringify({ title, description, category }),
    }),

  // Cryptographic Audit Ledger
  getAuditLedger: () => request<any[]>('/api/audit'),
  verifyChain: () => request<VerifyChainResult>('/api/audit/verify', { method: 'POST' }),
  simulateTampering: () => request<{ ok: boolean; tamperedLedgerId: string; message: string }>('/api/audit/tamper', { method: 'POST' }),
  restoreLedger: () => request<{ ok: boolean; message: string }>('/api/audit/restore', { method: 'POST' }),

  // Rules & Data Sources
  getRules: () => request<any[]>('/api/rules'),
  publishRules: (version: string, actorName: string) =>
    request<{ ok: boolean; version: string; message: string }>('/api/rules/publish', {
      method: 'POST',
      body: JSON.stringify({ version, actorName }),
    }),
  getSources: () => request<any[]>('/api/sources'),
  refetchSource: (sourceId: string) =>
    request<{ ok: boolean; source: any }>(`/api/sources/${sourceId}/refetch`, { method: 'POST' }),

  // Analytics & Reports
  getAnalytics: () => request<any>('/api/analytics'),
  getExportCsvUrl: () => '/api/export/complaints/csv',
}
