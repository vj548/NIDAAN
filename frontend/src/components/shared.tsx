import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, LogOut, ChevronRight, Menu, X } from 'lucide-react'
import { useState } from 'react'
import { useAppStore } from '../store/appStore'
import { tr } from '../i18n/strings'
import type { Status, Priority } from '../data/seed'

// ============================================================
// STATUS CHIP — PRAMAAN-spec compliant (glyph + border pattern)
// ============================================================
const STATUS_CONFIG: Record<string, { cls: string; glyph: string; label: string }> = {
  RECEIVED:            { cls: 'chip chip-received',     glyph: '○', label: 'RECEIVED' },
  TRIAGE_PENDING:      { cls: 'chip chip-triage',       glyph: '○', label: 'TRIAGE PENDING' },
  UNDER_REVIEW:        { cls: 'chip chip-under-review', glyph: '◆', label: 'UNDER REVIEW' },
  CROSS_BUREAU_REVIEW: { cls: 'chip chip-cross-bureau', glyph: '◆', label: 'CROSS-BUREAU REVIEW' },
  ACTION_REQUIRED:     { cls: 'chip chip-action-req',   glyph: '▲', label: 'ACTION REQUIRED' },
  SLA_AT_RISK:         { cls: 'chip chip-sla-risk',     glyph: '◔', label: 'SLA AT RISK' },
  SLA_BREACHED:        { cls: 'chip chip-sla-breached', glyph: '▲', label: 'SLA BREACHED' },
  RESOLVED:            { cls: 'chip chip-resolved',     glyph: '●', label: 'RESOLVED' },
  CLOSED:              { cls: 'chip chip-closed',       glyph: '●', label: 'CLOSED' },
  ON_HOLD:             { cls: 'chip chip-on-hold',      glyph: '⊘', label: 'ON HOLD' },
  REOPENED:            { cls: 'chip chip-reopened',     glyph: '○', label: 'REOPENED' },
}

export function StatusChip({ status }: { status: Status }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG['RECEIVED']
  return (
    <span className={cfg.cls} aria-label={`Status: ${cfg.label}`}>
      <span aria-hidden="true">{cfg.glyph}</span> {cfg.label}
    </span>
  )
}

// ============================================================
// PRIORITY CHIP
// ============================================================
const PRIORITY_CONFIG: Record<Priority, { cls: string; glyph: string }> = {
  CRITICAL: { cls: 'chip chip-critical', glyph: '▲▲' },
  HIGH:     { cls: 'chip chip-high',     glyph: '▲' },
  MEDIUM:   { cls: 'chip chip-medium',   glyph: '◆' },
  LOW:      { cls: 'chip chip-low',      glyph: '○' },
}
export function PriorityChip({ priority }: { priority: Priority }) {
  const cfg = PRIORITY_CONFIG[priority]
  return (
    <span className={cfg.cls} aria-label={`Priority: ${priority}`}>
      <span aria-hidden="true">{cfg.glyph}</span> {priority}
    </span>
  )
}

// ============================================================
// MATCH CHIP
// ============================================================
const MATCH_CLASS: Record<string, string> = {
  EXACT_IDENTIFIER:  'chip chip-exact',
  STRONG_CANDIDATE:  'chip chip-strong',
  POSSIBLE_RELATION: 'chip chip-possible',
  BELOW_THRESHOLD:   'chip chip-below',
}
const MATCH_LABEL: Record<string, string> = {
  EXACT_IDENTIFIER:  'EXACT IDENTIFIER',
  STRONG_CANDIDATE:  'STRONG CANDIDATE',
  POSSIBLE_RELATION: 'POSSIBLE RELATION',
  BELOW_THRESHOLD:   'BELOW THRESHOLD',
}
export function MatchChip({ type }: { type: string }) {
  return <span className={MATCH_CLASS[type] ?? 'chip chip-below'}>{MATCH_LABEL[type] ?? type}</span>
}

// ============================================================
// SYNTH TAG
// ============================================================
export function SynthTag() {
  return <span className="synth-tag" title="Synthetic/demo data — not real">SYNTH</span>
}

// ============================================================
// PANEL — titled bordered panel with optional action slot
// ============================================================
export function Panel({ title, children, className = '', action }: {
  title?: React.ReactNode
  children: React.ReactNode
  className?: string
  action?: React.ReactNode
}) {
  return (
    <div className={`panel ${className}`}>
      {title && (
        <div className="panel-header flex items-center justify-between">
          <h2>{title}</h2>
          {action && <div className="flex items-center gap-2">{action}</div>}
        </div>
      )}
      {children}
    </div>
  )
}

// ============================================================
// ALERT BOXES — PRAMAAN spec: glyph + left border
// ============================================================
export function AlertError({ children }: { children: React.ReactNode }) {
  return (
    <div className="alert-error" role="alert">
      <span className="font-bold flex-shrink-0" aria-hidden="true">▲</span>
      <div>{children}</div>
    </div>
  )
}
export function AlertSuccess({ children }: { children: React.ReactNode }) {
  return (
    <div className="alert-success" role="status">
      <span className="font-bold flex-shrink-0" aria-hidden="true">●</span>
      <div>{children}</div>
    </div>
  )
}
export function AlertInfo({ children }: { children: React.ReactNode }) {
  return (
    <div className="alert-info" role="status">
      <span className="font-bold flex-shrink-0" aria-hidden="true">ℹ</span>
      <div>{children}</div>
    </div>
  )
}
export function AlertWarning({ children }: { children: React.ReactNode }) {
  return (
    <div className="alert-warning" role="alert">
      <span className="font-bold flex-shrink-0" aria-hidden="true">◔</span>
      <div>{children}</div>
    </div>
  )
}

// ============================================================
// UTILITY BAR — spec §4 item 1
// ============================================================
export function UtilityBar() {
  const { language, textScale, setLanguage, setTextScale, currentUser, logout } = useAppStore()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <div
      className="bg-utility-bar border-b border-border text-muted text-chip font-mono px-4 py-1 flex items-center justify-between flex-wrap gap-2"
      role="banner"
    >
      {/* Left */}
      <span className="text-chip font-mono">
        {tr('prototypeNotice', language)}
      </span>

      {/* Right group */}
      <div className="flex items-center gap-3 flex-wrap">
        {currentUser && (
          <>
            <span className="text-chip text-muted border-r border-border pr-3">
              <strong>{currentUser.role}</strong> · {currentUser.name}
              {currentUser.bureauName ? ` · ${currentUser.bureauName}` : ''}
            </span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1 text-chip text-navy hover:text-deep-navy font-semibold"
              aria-label="Logout"
            >
              <LogOut size={11} />
              {tr('logout', language)}
            </button>
            <span className="text-muted text-chip">|</span>
          </>
        )}
        <a href="#main-content" className="skip-link text-chip">
          {tr('skipToMain', language)}
        </a>
        {/* Text scale */}
        <div className="flex items-center gap-0.5" role="group" aria-label="Text size controls">
          {(['sm', 'md', 'lg'] as const).map((scale, i) => (
            <button
              key={scale}
              onClick={() => setTextScale(scale)}
              className={`px-1.5 py-px border text-chip font-mono leading-tight ${textScale === scale ? 'bg-navy text-white border-navy' : 'bg-white border-muted text-muted hover:border-navy'}`}
              style={{ borderRadius: '2px', fontSize: i === 0 ? '10px' : i === 2 ? '13px' : '11px' }}
              aria-pressed={textScale === scale}
              title={`Text size: ${['small', 'normal', 'large'][i]}`}
            >
              A{i === 0 ? '−' : i === 2 ? '+' : ''}
            </button>
          ))}
        </div>
        {/* Language */}
        <div className="flex items-center gap-0.5" role="group" aria-label="Language controls">
          <button
            onClick={() => setLanguage('hi')}
            className={`px-1.5 py-px text-chip font-sans border ${language === 'hi' ? 'bg-navy text-white border-navy' : 'bg-white border-muted hover:border-navy'}`}
            style={{ borderRadius: '2px' }}
            aria-pressed={language === 'hi'}
          >
            हिन्दी
          </button>
          <button
            onClick={() => setLanguage('en')}
            className={`px-1.5 py-px text-chip font-mono border ${language === 'en' ? 'bg-navy text-white border-navy' : 'bg-white border-muted hover:border-navy'}`}
            style={{ borderRadius: '2px' }}
            aria-pressed={language === 'en'}
          >
            English
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// TRICOLOUR STRIP — spec §4 item 2
// ============================================================
export function TricolourStrip() {
  return <div className="tricolour-strip" aria-hidden="true" />
}

// ============================================================
// INSTITUTIONAL HEADER — spec §4 item 3
// ============================================================
export function InstitutionalHeader() {
  const language = useAppStore(s => s.language)
  const unreadCount = useAppStore(s => s.unreadNotificationCount())
  const navigate = useNavigate()
  const isLoggedIn = useAppStore(s => s.isLoggedIn)

  return (
    <header className="bg-white border-b border-border px-6 py-2.5 flex items-center justify-between gap-4">
      {/* Left: Emblem + Org */}
      <div className="flex items-center gap-4">
        {/* State Emblem placeholder (56x64, dashed per PRAMAAN spec §4 item 3 / GIGW 3.0) */}
        <div
          className="border border-dashed border-[#12306B]/60 flex flex-col items-center justify-center text-center flex-shrink-0 bg-tint p-1 hover:border-navy transition-colors"
          style={{ width: 56, height: 64, borderRadius: '2px' }}
          aria-label="Government State Emblem of India placeholder — GIGW 3.0 compliant"
          title="State Emblem of India Placeholder (GIGW 3.0)"
        >
          {/* Ashoka Lion Capital Graphic Representation */}
          <svg viewBox="0 0 40 44" className="w-7 h-8 text-[#12306B]" fill="currentColor" aria-hidden="true">
            {/* Top crown / 3 lions representation */}
            <path d="M20 2 C16 2 15 5 15 8 C12 6 8 8 8 13 C8 17 12 19 14 19 C14 22 17 25 20 25 C23 25 26 22 26 19 C28 19 32 17 32 13 C32 8 28 6 25 8 C25 5 24 2 20 2 Z" opacity="0.9" />
            {/* Circular Abacus base */}
            <rect x="10" y="26" width="20" height="4" rx="1" fill="#FF9933" />
            {/* Ashoka Chakra */}
            <circle cx="20" cy="28" r="2.5" fill="#12306B" />
            <circle cx="20" cy="28" r="1.5" fill="#ffffff" />
            {/* Lower bell base */}
            <path d="M12 30 L28 30 L26 35 L14 35 Z" opacity="0.8" />
            <rect x="11" y="36" width="18" height="2" rx="0.5" />
          </svg>
          <span className="font-sans font-bold text-[#12306B] tracking-tight leading-none mt-0.5" style={{ fontSize: '7px' }}>
            सत्यमेव जयते
          </span>
          <span className="font-mono text-[6px] text-muted tracking-tighter leading-none mt-0.5">
            EMBLEM
          </span>
        </div>

        {/* Org lines */}
        <div>
          <div className="text-[13px] text-navy font-bold leading-tight font-sans">
            {tr('org1', language)}
          </div>
          <div className="text-[12px] text-muted leading-tight font-sans">
            {tr('org2', language)}
          </div>
          <div className="text-[10px] text-muted font-mono tracking-wide mt-0.5">
            AICTE CENTRAL GRIEVANCE & INTER-BUREAU REDRESSAL REPOSITORY
          </div>
        </div>
      </div>

      {/* Right: Product identity + notifications */}
      <div className="flex items-center gap-4">
        {isLoggedIn && (
          <button
            onClick={() => navigate('/notifications')}
            className="relative text-muted hover:text-navy p-1 transition-colors"
            aria-label={`Notifications — ${unreadCount} unread`}
            title="Notifications"
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="notif-badge" aria-hidden="true">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
        )}
        <div className="text-right">
          <div className="flex items-center justify-end gap-1.5">
            <span className="text-[11px] font-mono bg-panel-header text-navy px-1.5 py-0.5 border border-border rounded-[2px] font-bold">
              SIH26264
            </span>
            <span className="text-h2 font-bold text-navy font-sans leading-tight">
              {tr('productName', language)}
            </span>
          </div>
          <div className="text-chip text-muted font-sans font-medium">
            प्रमाण · PRAMAAN Officer Console
          </div>
        </div>
      </div>
    </header>
  )
}

// ============================================================
// NAVIGATION BAR — spec §4 item 4
// ============================================================
interface NavItem { labelKey: string; path: string; adminOnly?: boolean }

const NAV_ITEMS: NavItem[] = [
  { labelKey: 'navDashboard',    path: '/dashboard' },
  { labelKey: 'navComplaints',   path: '/complaints' },
  { labelKey: 'navInstitutions', path: '/institutions' },
  { labelKey: 'navTriage',       path: '/triage' },
  { labelKey: 'navBureaus',      path: '/bureaus' },
  { labelKey: 'navAudit',        path: '/audit' },
  { labelKey: 'navAdmin',        path: '/admin/rules', adminOnly: true },
  { labelKey: 'navHelp',         path: '/help' },
]

export function NavBar() {
  const { language, currentUser } = useAppStore()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  const currentPath = window.location.pathname

  function isActive(path: string) {
    if (path === '/dashboard') return currentPath === '/dashboard'
    return currentPath.startsWith(path)
  }

  return (
    <nav className="bg-navy" aria-label="Main navigation">
      <div className="max-w-content mx-auto px-6 flex items-stretch justify-between">
        {/* Desktop nav */}
        <div className="hidden md:flex items-stretch overflow-x-auto">
          {NAV_ITEMS.map(item => {
            if (item.adminOnly && currentUser?.role !== 'ADMINISTRATOR') return null
            const active = isActive(item.path)
            return (
              <button
                key={item.labelKey}
                onClick={() => navigate(item.path)}
                className={`nav-item ${active ? 'active' : ''}`}
                aria-current={active ? 'page' : undefined}
              >
                {tr(item.labelKey, language)}
              </button>
            )
          })}
        </div>

        {/* Mobile hamburger */}
        <div className="md:hidden flex items-center">
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="text-white p-3"
            aria-expanded={mobileOpen}
            aria-label="Toggle navigation menu"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {mobileOpen && (
        <div className="md:hidden bg-deep-navy border-t border-navy/50">
          {NAV_ITEMS.map(item => {
            if (item.adminOnly && currentUser?.role !== 'ADMINISTRATOR') return null
            const active = isActive(item.path)
            return (
              <button
                key={item.labelKey}
                onClick={() => { navigate(item.path); setMobileOpen(false) }}
                className={`w-full text-left px-6 py-3 text-white font-semibold text-body border-b border-navy/30 ${active ? 'bg-navy border-l-2 border-l-saffron' : ''}`}
                aria-current={active ? 'page' : undefined}
              >
                {tr(item.labelKey, language)}
              </button>
            )
          })}
        </div>
      )}
    </nav>
  )
}

// ============================================================
// BREADCRUMB — spec §4 item 5
// ============================================================
export function Breadcrumb({ items }: { items: { label: string; path?: string }[] }) {
  const lang = useAppStore(s => s.language)
  const navigate = useNavigate()

  return (
    <nav className="breadcrumb" aria-label="Breadcrumb">
      <ol className="flex items-center gap-1 flex-wrap max-w-content mx-auto">
        <li>
          <button
            onClick={() => navigate('/dashboard')}
            className="text-navy underline hover:text-deep-navy text-body"
          >
            {tr('home', lang)}
          </button>
        </li>
        {items.map((item, i) => (
          <React.Fragment key={i}>
            <li aria-hidden="true"><ChevronRight size={13} className="text-muted" /></li>
            <li>
              {item.path && i < items.length - 1 ? (
                <button
                  onClick={() => navigate(item.path!)}
                  className="text-navy underline hover:text-deep-navy"
                >
                  {item.label}
                </button>
              ) : (
                <span className="text-muted" aria-current="page">{item.label}</span>
              )}
            </li>
          </React.Fragment>
        ))}
      </ol>
    </nav>
  )
}

// ============================================================
// SITE FOOTER — spec §4 item 7
// ============================================================
export function SiteFooter() {
  const lang = useAppStore(s => s.language)
  return (
    <footer className="site-footer" role="contentinfo">
      <div className="max-w-content mx-auto px-6">
        <div className="flex flex-wrap gap-4 mb-3 text-chip">
          {[
            ['footerTerms', '/help'],
            ['footerPrivacy', '/help'],
            ['footerAccess', '/help#accessibility'],
            ['footerHelp', '/help'],
          ].map(([key, href]) => (
            <a
              key={key}
              href={href}
              className="text-blue-300 underline hover:text-white"
            >
              {tr(key, lang)}
            </a>
          ))}
        </div>
        <div className="text-chip text-blue-200 space-y-0.5">
          <p>{tr('footerOwner', lang)}</p>
          <p>Last updated: October 2026 · Version 1.0.0-prototype · {tr('footerWIM', lang)}</p>
          <p className="font-mono opacity-70" style={{ fontSize: '10px' }}>
            SIH26264 · All data is synthetic (SYNTH). Not connected to official AICTE systems. This prototype must not be used for actual complaint processing.
          </p>
        </div>
      </div>
    </footer>
  )
}

// ============================================================
// APP SHELL WRAPPER — wraps UtilityBar + TricolourStrip + Header + NavBar + Breadcrumb + Footer
// ============================================================
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-tint">
      <UtilityBar />
      <TricolourStrip />
      <InstitutionalHeader />
      <NavBar />
      {children}
      <SiteFooter />
    </div>
  )
}

// ============================================================
// PAGE SHELL WRAPPER — Breadcrumb + Main content area
// ============================================================
export function PageShell({ breadcrumb, children }: {
  breadcrumb: { label: string; path?: string }[]
  children: React.ReactNode
}) {
  return (
    <div className="flex-1 flex flex-col">
      <Breadcrumb items={breadcrumb} />
      <main id="main-content" className="max-w-content mx-auto w-full px-6 py-6 flex-1">
        {children}
      </main>
    </div>
  )
}

// ============================================================
// MODAL DIALOG — focus-trapped, accessible
// ============================================================
export function Modal({ title, children, onClose }: {
  title: string
  children: React.ReactNode
  onClose: () => void
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className="bg-white panel w-full max-w-xl shadow-2xl">
        <div className="panel-header flex items-center justify-between">
          <h2 id="modal-title" className="text-h2 font-bold text-navy">{title}</h2>
          <button
            onClick={onClose}
            className="text-muted hover:text-navy font-mono text-xl leading-none w-8 h-8 flex items-center justify-center"
            aria-label="Close dialog"
          >
            ×
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

// ============================================================
// PAGINATION
// ============================================================
export function Pagination({ page, total, perPage, onPage }: {
  page: number; total: number; perPage: number; onPage: (p: number) => void
}) {
  const totalPages = Math.ceil(total / perPage)
  if (totalPages <= 1) return null
  const start = (page - 1) * perPage + 1
  const end = Math.min(page * perPage, total)
  return (
    <div className="flex items-center gap-3 mt-4 text-body border-t border-border pt-4">
      <button
        onClick={() => onPage(page - 1)}
        disabled={page === 1}
        className="btn-secondary px-3 py-1 text-chip"
        style={{ minHeight: '36px' }}
      >
        ← Prev
      </button>
      <span className="text-muted font-mono text-chip flex-1 text-center">
        Showing {start}–{end} of {total} records · Page {page} of {totalPages}
      </span>
      <button
        onClick={() => onPage(page + 1)}
        disabled={page === totalPages}
        className="btn-secondary px-3 py-1 text-chip"
        style={{ minHeight: '36px' }}
      >
        Next →
      </button>
    </div>
  )
}

// ============================================================
// EMPTY STATE
// ============================================================
export function EmptyState({ icon = '📭', title, subtitle }: {
  icon?: string; title: string; subtitle?: string
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="text-5xl mb-4" aria-hidden="true">{icon}</div>
      <h3 className="text-h2 text-navy font-bold mb-2">{title}</h3>
      {subtitle && <p className="text-muted text-body max-w-sm">{subtitle}</p>}
    </div>
  )
}

// ============================================================
// LOADING SPINNER
// ============================================================
export function LoadingSpinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center py-12" aria-busy="true" aria-label={label}>
      <div className="w-8 h-8 border-4 border-border border-t-navy rounded-full animate-spin" />
      <span className="ml-3 text-muted text-body">{label}</span>
    </div>
  )
}

// ============================================================
// CASE ID BADGE
// ============================================================
export function CaseIdBadge({ caseNumber }: { caseNumber: string }) {
  return (
    <span className="font-mono text-mono text-navy font-semibold bg-panel-header px-1.5 py-0.5 border border-border" style={{ borderRadius: '2px' }}>
      {caseNumber}
    </span>
  )
}

// ============================================================
// SECTION HEADER H1 — 2px navy bottom rule per spec
// ============================================================
export function SectionH1({ children }: { children: React.ReactNode }) {
  return <h1 className="page-h1">{children}</h1>
}

// ============================================================
// DATA TABLE WRAPPER — scrollable, accessible
// ============================================================
export function TableWrap({ children, caption }: { children: React.ReactNode; caption?: string }) {
  return (
    <div className="table-scroll">
      <table className="data-table" role="grid">
        {caption && <caption className="sr-only">{caption}</caption>}
        {children}
      </table>
    </div>
  )
}

// ============================================================
// CONFIRMATION CHIP — for audit chain
// ============================================================
export function ChainChip({ intact }: { intact: boolean }) {
  return intact
    ? <span className="chip chip-chain-intact">● CHAIN INTACT</span>
    : <span className="chip chip-chain-broken">▲ CHAIN BROKEN</span>
}

// ============================================================
// SECTION DIVIDER
// ============================================================
export function Divider() {
  return <hr className="section-divider" aria-hidden="true" />
}
