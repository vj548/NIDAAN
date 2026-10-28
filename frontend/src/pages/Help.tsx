import { Panel, SectionH1, PageShell } from '../components/shared'

export default function HelpPage() {
  return (
    <PageShell breadcrumb={[{ label: 'Help & Accessibility' }]}>
      <SectionH1>Help, Accessibility & Reports</SectionH1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Panel 1 — How decisions work */}
        <Panel title="1. How Case Decisions Work">
          <div className="p-4 space-y-3 text-body text-ink">
            <h3 className="text-h2 font-bold text-navy">Complaint Lifecycle</h3>
            <ol className="list-decimal pl-5 space-y-1">
              <li><strong>RECEIVED</strong> — Complaint submitted and registered.</li>
              <li><strong>TRIAGE_PENDING</strong> — Awaiting classification and bureau assignment.</li>
              <li><strong>UNDER_REVIEW</strong> — Assigned to an officer for examination.</li>
              <li><strong>ACTION_REQUIRED</strong> — Additional information or action needed.</li>
              <li><strong>CROSS_BUREAU_REVIEW</strong> — Multiple bureaus involved in review.</li>
              <li><strong>RESOLVED</strong> — An authorized officer has recorded resolution.</li>
              <li><strong>CLOSED</strong> — Case fully closed with recorded reason.</li>
              <li><strong>REOPENED</strong> — Previously resolved case re-examined.</li>
            </ol>

            <h3 className="text-h2 font-bold text-navy mt-4">Officer Responsibilities</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>Officers review complaints assigned to their bureau.</li>
              <li>All status transitions require a written reason.</li>
              <li>Every action is permanently recorded in the audit ledger.</li>
              <li>Officers must not make assumptions about guilt based on complaint volume.</li>
            </ul>

            <h3 className="text-h2 font-bold text-navy mt-4">AI-Assisted Recommendations</h3>
            <div className="alert-info">
              <span>ℹ</span>
              <p>AI suggestions for triage, related cases, and bureau assignment are advisory only. Officers are responsible for all consequential decisions. Never treat a similarity score as proof that two complaints are identical or that an allegation is true.</p>
            </div>

            <h3 className="text-h2 font-bold text-navy mt-4">Resolution and Closure</h3>
            <p>Resolving a case records the officer's findings and reason. Closure requires a separate confirmation. Cases may be reopened if new information emerges — reopening is logged in the audit ledger.</p>
          </div>
        </Panel>

        {/* Panel 2 — Accessibility */}
        <Panel title="2. Accessibility Statement">
          <div id="accessibility" className="p-4 space-y-3 text-body text-ink">
            <p>CaseConnect AI aims to meet <strong>WCAG 2.1 AA</strong> and <strong>GIGW 3.0</strong> guidelines.</p>
            <h3 className="text-h2 font-bold text-navy">Keyboard Navigation</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>All interactive elements are keyboard accessible via Tab and Enter.</li>
              <li>A "Skip to main content" link is available at the top of every page.</li>
              <li>Menus, modals, and filters can be operated without a mouse.</li>
            </ul>
            <h3 className="text-h2 font-bold text-navy mt-3">Text Scaling</h3>
            <p>Use the A− / A / A+ controls in the utility bar to set text size to 93%, 100%, or 112%. The scale applies to the entire page consistently.</p>
            <h3 className="text-h2 font-bold text-navy mt-3">Status Communication</h3>
            <p>All statuses use both a glyph (symbol) and a text label, not colour alone. Status borders also vary by pattern (solid, dashed, hatched).</p>
            <h3 className="text-h2 font-bold text-navy mt-3">Tables</h3>
            <p>Data tables scroll within their own containers on narrow screens. Table headers remain visible during horizontal scroll.</p>
            <h3 className="text-h2 font-bold text-navy mt-3">Language Support</h3>
            <p>English/Hindi toggle is available in the utility bar. Navigation, page titles, and status labels are translated. Incomplete translations are explicitly marked.</p>
            <div className="alert-warning mt-3">
              <span>◔</span>
              <p><strong>Still to do:</strong> Full screen-reader audit, complete Hindi body text, real government emblem insertion per GIGW, and keyboard focus ring audit.</p>
            </div>
          </div>
        </Panel>

        {/* Panel 3 — Status Glossary */}
        <Panel title="3. Status Glossary">
          <div className="p-4">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Glyph</th>
                  <th>Meaning</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['RECEIVED', '○', 'Complaint submitted and registered. Awaiting triage.'],
                  ['TRIAGE_PENDING', '○', 'Classification and initial review pending.'],
                  ['UNDER_REVIEW', '◆', 'Assigned to an officer for active examination.'],
                  ['CROSS_BUREAU_REVIEW', '◆', 'Multiple bureaus are involved in review.'],
                  ['ACTION_REQUIRED', '▲', 'Additional information or officer action is required.'],
                  ['SLA_AT_RISK', '◔', 'Approaching the configured response deadline.'],
                  ['SLA_BREACHED', '▲', 'Response deadline has passed without completion.'],
                  ['RESOLVED', '●', 'An authorized officer has recorded resolution.'],
                  ['CLOSED', '●', 'Case fully closed with a recorded reason.'],
                  ['ON_HOLD', '⊘', 'Temporarily paused with a documented reason.'],
                  ['REOPENED', '○', 'Previously resolved/closed case re-examined.'],
                ].map(([status, glyph, meaning]) => (
                  <tr key={status as string}>
                    <td className="font-mono text-mono text-navy">{status}</td>
                    <td className="font-mono text-lg text-center">{glyph}</td>
                    <td className="text-muted text-table">{meaning}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <h3 className="text-h2 font-bold text-navy mt-4">Priority Levels</h3>
            <table className="data-table mt-2">
              <thead>
                <tr><th>Priority</th><th>Response Target</th><th>Definition</th></tr>
              </thead>
              <tbody>
                {[
                  ['CRITICAL', '3 days', 'Immediate student harm or regulatory violation'],
                  ['HIGH', '7 days', 'Serious violation requiring prompt attention'],
                  ['MEDIUM', '14 days', 'Non-urgent violation or complaint'],
                  ['LOW', '30 days', 'Informational or minor complaint'],
                ].map(([p, r, d]) => (
                  <tr key={p as string}>
                    <td className="font-mono text-mono">{p}</td>
                    <td className="font-mono text-mono">{r}</td>
                    <td className="text-muted text-table">{d}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        {/* Panel 4 — Contact */}
        <Panel title="4. Contact and Grievance">
          <div className="p-4 space-y-4 text-body text-ink">
            <div className="alert-warning">
              <span>◔</span>
              <p>The contacts below are placeholder entries for this prototype. Do not use these details for real AICTE complaints. For actual complaints, visit the official AICTE website.</p>
            </div>
            {[
              { label: 'AICTE Help Desk', value: '[Placeholder — insert official AICTE contact]' },
              { label: 'Technical Support', value: '[Placeholder — prototype support contact]' },
              { label: 'Grievance Officer', value: '[Placeholder — as per RTI Act 2005]' },
              { label: 'Website Information Manager', value: '[Placeholder — per GIGW requirement]' },
            ].map(c => (
              <div key={c.label}>
                <div className="font-semibold text-navy">{c.label}</div>
                <div className="text-muted">{c.value}</div>
              </div>
            ))}
            <div className="border-t border-border pt-4">
              <p className="font-semibold text-navy">Official AICTE Website</p>
              <p className="text-muted">This prototype is NOT connected to official AICTE systems. For official information, visit <span className="font-mono text-navy">aicte-india.org</span></p>
            </div>
          </div>
        </Panel>
      </div>
    </PageShell>
  )
}
