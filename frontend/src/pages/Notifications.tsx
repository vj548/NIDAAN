import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../store/appStore'
import { Panel, SectionH1, CaseIdBadge, AlertInfo, PageShell, EmptyState } from '../components/shared'
import { format } from 'date-fns'

const TYPE_ICON: Record<string, string> = {
  SLA_WARNING: '⏰', SLA_BREACHED: '⚠️', CASE_ASSIGNED: '👤',
  CASE_REOPENED: '🔁', RELATED_REVIEW: '🔗', INFORMATION_REQUESTED: '📧',
  STATUS_CHANGE: '🔄', CASE_TRANSFERRED: '➡️',
}

export default function NotificationsPage() {
  const navigate = useNavigate()
  const { notifications, markNotificationRead, markAllNotificationsRead } = useAppStore()

  const unread = notifications.filter(n => !n.readAt)
  const read = notifications.filter(n => n.readAt)

  function handleClick(n: typeof notifications[0]) {
    markNotificationRead(n.id)
    if (n.complaintId) navigate(`/complaints/${n.complaintId}`)
  }

  return (
    <PageShell breadcrumb={[{ label: 'Notifications' }]}>
      <div className="flex items-center justify-between mb-4">
        <SectionH1>Notifications</SectionH1>
        {unread.length > 0 && (
          <button onClick={markAllNotificationsRead} className="btn-secondary text-body">
            ✓ Mark all as read
          </button>
        )}
      </div>

      <AlertInfo>
        In-app notifications only. Email and SMS integrations are not active in this prototype.
      </AlertInfo>

      <div className="mt-6 space-y-6">
        {/* Unread */}
        <Panel title={`Unread (${unread.length})`}>
          {unread.length === 0 ? (
            <div className="p-6">
              <EmptyState icon="🔔" title="No unread notifications" subtitle="You are up to date." />
            </div>
          ) : (
            <div className="divide-y divide-border">
              {unread.map(n => (
                <button
                  key={n.id}
                  onClick={() => handleClick(n)}
                  className="w-full text-left px-4 py-3 hover:bg-tint transition-colors flex items-start gap-3 bg-blue-50"
                >
                  <span className="text-xl mt-0.5">{TYPE_ICON[n.type] ?? '📌'}</span>
                  <div className="flex-1">
                    <div className="text-body font-semibold text-navy">{n.message}</div>
                    {n.caseNumber && <CaseIdBadge caseNumber={n.caseNumber} />}
                    <div className="text-chip text-muted mt-1">{format(new Date(n.createdAt), 'dd MMM yyyy, HH:mm')}</div>
                  </div>
                  <span className="w-2 h-2 rounded-full bg-navy mt-2 flex-shrink-0" />
                </button>
              ))}
            </div>
          )}
        </Panel>

        {/* Read */}
        {read.length > 0 && (
          <Panel title={`Read (${read.length})`}>
            <div className="divide-y divide-border">
              {read.map(n => (
                <button
                  key={n.id}
                  onClick={() => handleClick(n)}
                  className="w-full text-left px-4 py-3 hover:bg-tint transition-colors flex items-start gap-3 opacity-70"
                >
                  <span className="text-xl mt-0.5">{TYPE_ICON[n.type] ?? '📌'}</span>
                  <div className="flex-1">
                    <div className="text-body text-ink">{n.message}</div>
                    {n.caseNumber && <CaseIdBadge caseNumber={n.caseNumber} />}
                    <div className="text-chip text-muted mt-1">{format(new Date(n.createdAt), 'dd MMM yyyy, HH:mm')}</div>
                  </div>
                </button>
              ))}
            </div>
          </Panel>
        )}
      </div>
    </PageShell>
  )
}
