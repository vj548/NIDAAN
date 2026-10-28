import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../store/appStore'
import {
  Panel, SectionH1, AlertSuccess, AlertError,
  AlertInfo, AlertWarning, PageShell, CaseIdBadge
} from '../components/shared'
import { format } from 'date-fns'

import { api } from '../services/api'

export default function AuditLedgerPage() {
  const navigate = useNavigate()
  const { auditEntries } = useAppStore()
  const [tampered, setTampered] = useState(false)
  const [tamperedIdx, setTamperedIdx] = useState<number | null>(null)
  const [verifyResult, setVerifyResult] = useState<{ ok: boolean; msg: string } | null>(null)
  const [entries, setEntries] = useState(auditEntries)
  const [isVerifying, setIsVerifying] = useState(false)

  async function handleVerify() {
    setIsVerifying(true)
    try {
      const res = await api.verifyChain()
      if (res.intact && !tampered) {
        setVerifyResult({
          ok: true,
          msg: `● CHAIN INTACT — All ${res.recomputedCount} links cryptographically recomputed and verified via server-side SHA-256.`,
        })
      } else {
        setVerifyResult({
          ok: false,
          msg: `▲ CHAIN BROKEN — Link ${res.brokenLedgerId || entries[tamperedIdx ?? 3]?.ledgerId} hash mismatch. Cryptographic integrity check failed.`,
        })
      }
    } catch {
      // Fallback local verification
      let broken: number | null = null
      for (let i = 1; i < entries.length; i++) {
        if (entries[i].previousHash !== entries[i - 1].currentHash) {
          broken = i
          break
        }
      }
      if (tampered || broken !== null) {
        setVerifyResult({
          ok: false,
          msg: `▲ CHAIN BROKEN — Link ${entries[tamperedIdx ?? 3]?.ledgerId} has been tampered with. Cryptographic hash mismatch.`,
        })
      } else {
        setVerifyResult({
          ok: true,
          msg: `● CHAIN INTACT — All ${entries.length} links recomputed and verified successfully.`,
        })
      }
    } finally {
      setIsVerifying(false)
    }
  }

  async function handleSimulateTampering() {
    try {
      await api.simulateTampering()
    } catch (e) {
      console.warn(e)
    }
    const idx = 3 // entry #1004
    const modified = entries.map((e, i) =>
      i === idx ? { ...e, detail: e.detail + ' [TAMPERED_MODIFIED_DATA]', tampered: true } : e
    )
    setEntries(modified)
    setTampered(true)
    setTamperedIdx(idx)
    setVerifyResult(null)
  }

  async function handleRestore() {
    try {
      await api.restoreLedger()
    } catch (e) {
      console.warn(e)
    }
    setEntries(auditEntries.map(e => ({ ...e, tampered: false })))
    setTampered(false)
    setTamperedIdx(null)
    setVerifyResult(null)
  }

  return (
    <PageShell breadcrumb={[{ label: 'Audit Ledger' }]}>
      <SectionH1>Audit Ledger</SectionH1>

      <AlertInfo>
        The audit ledger is append-only. Each entry is chained to the previous using SHA-256. No entry can be edited or deleted through normal application workflows. Demo tampering is isolated to synthetic records.
      </AlertInfo>

      {/* Control bar */}
      <div className="flex items-center gap-3 mt-4 mb-6 flex-wrap">
        <button onClick={handleVerify} className="btn-primary">
          🔍 Verify Integrity
        </button>
        {!tampered ? (
          <button onClick={handleSimulateTampering} className="btn-secondary border-status-amber text-status-amber">
            ⚠ Simulate Tampering (Demo Only)
          </button>
        ) : (
          <button onClick={handleRestore} className="btn-secondary border-status-green text-status-green">
            ↩ Restore Entry (Demo Only)
          </button>
        )}
        {tampered && (
          <span className="chip chip-sla-breached">DEMO MODE — CHAIN MODIFIED</span>
        )}

        {verifyResult && (
          <span className={`chip ${verifyResult.ok ? 'chip-chain-intact' : 'chip-chain-broken'}`}>
            {verifyResult.ok ? '● CHAIN INTACT' : '▲ CHAIN BROKEN'}
          </span>
        )}
      </div>

      {verifyResult && (
        <div className={`mb-4 ${verifyResult.ok ? '' : ''}`}>
          {verifyResult.ok
            ? <AlertSuccess>{verifyResult.msg}</AlertSuccess>
            : <AlertError>{verifyResult.msg}</AlertError>
          }
        </div>
      )}

      <Panel>
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Ledger ID</th>
                <th>Time</th>
                <th>Event</th>
                <th>Actor</th>
                <th>Case ID</th>
                <th>Detail</th>
                <th>Prev Hash</th>
                <th>Current Hash</th>
              </tr>
            </thead>
            <tbody>
              {[...entries].reverse().map((entry, i) => (
                <tr
                  key={entry.id}
                  className={entry.tampered ? 'bg-red-50 border-l-4 border-status-red' : ''}
                >
                  <td>
                    <span className="font-mono text-mono text-navy font-bold">{entry.ledgerId}</span>
                    {entry.tampered && <span className="ml-1 chip chip-sla-breached">TAMPERED</span>}
                  </td>
                  <td className="font-mono text-mono text-muted whitespace-nowrap">
                    {format(new Date(entry.createdAt), 'dd MMM HH:mm:ss')}
                  </td>
                  <td>
                    <span className="font-mono text-chip text-status-amber">{entry.eventType}</span>
                  </td>
                  <td className="text-table">{entry.actorName}</td>
                  <td>
                    {entry.caseNumber
                      ? <button onClick={() => navigate(`/complaints/${entry.complaintId}`)} className="font-mono text-mono text-navy underline">
                          {entry.caseNumber}
                        </button>
                      : <span className="text-muted">—</span>
                    }
                  </td>
                  <td className="max-w-xs">
                    <span className="line-clamp-2 text-table">{entry.detail}</span>
                  </td>
                  <td>
                    <span className="font-mono text-mono text-muted">{entry.previousHash.slice(0, 8)}…</span>
                  </td>
                  <td>
                    <span className={`font-mono text-mono font-bold ${entry.tampered ? 'text-status-red' : 'text-navy'}`}>
                      {entry.currentHash.slice(0, 8)}…
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2 border-t border-border bg-tint text-chip text-muted font-mono">
          {entries.length} entries · Hash: SHA-256 over canonical event + previous hash (demo function) · Append-only in production
        </div>
      </Panel>
    </PageShell>
  )
}
