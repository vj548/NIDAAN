import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../store/appStore'
import { AlertError, TricolourStrip, SynthTag } from '../components/shared'
import { DEMO_CAPTCHA, demoAccounts } from '../data/seed'
import { tr } from '../i18n/strings'

const CAPTCHA_CODE = DEMO_CAPTCHA

export default function LoginPage() {
  const navigate = useNavigate()
  const login = useAppStore(s => s.login)
  const language = useAppStore(s => s.language)
  const setLanguage = useAppStore(s => s.setLanguage)
  const textScale = useAppStore(s => s.textScale)
  const setTextScale = useAppStore(s => s.setTextScale)

  const [userId, setUserId] = useState('')
  const [role, setRole] = useState('OFFICER')
  const [password, setPassword] = useState('')
  const [captchaInput, setCaptchaInput] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!userId.trim() || !password.trim()) {
      setError('User ID and password are required fields.')
      return
    }
    if (!captchaInput.trim()) {
      setError('Please enter the CAPTCHA text shown in the image.')
      return
    }
    if (captchaInput !== CAPTCHA_CODE) {
      setError(`CAPTCHA mismatch. Please enter the text exactly as shown (case-sensitive): ${CAPTCHA_CODE}`)
      setCaptchaInput('')
      return
    }
    setLoading(true)
    setTimeout(() => {
      const result = login(userId, password, captchaInput)
      if (result.ok) {
        navigate('/dashboard')
      } else {
        setError(result.error ?? 'Login failed. Please check your credentials.')
      }
      setLoading(false)
    }, 600)
  }

  function handleReset() {
    setUserId('')
    setPassword('')
    setCaptchaInput('')
    setError('')
  }

  return (
    <div className="min-h-screen flex flex-col bg-tint">
      {/* ── Utility bar (login variant — no logout) ── */}
      <div
        className="bg-utility-bar border-b border-border px-4 py-1 flex items-center justify-between flex-wrap gap-2"
        role="banner"
      >
        <span className="text-chip font-mono text-muted">
          {tr('prototypeNotice', language)}
        </span>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-0.5" role="group" aria-label="Text size">
            {(['sm', 'md', 'lg'] as const).map((s, i) => (
              <button
                key={s}
                onClick={() => setTextScale(s)}
                className={`px-1.5 py-px border text-chip font-mono leading-tight ${textScale === s ? 'bg-navy text-white border-navy' : 'bg-white border-muted text-muted'}`}
                style={{ borderRadius: '2px', fontSize: i === 0 ? '10px' : i === 2 ? '13px' : '11px' }}
                aria-pressed={textScale === s}
              >
                A{i === 0 ? '−' : i === 2 ? '+' : ''}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-0.5" role="group" aria-label="Language">
            <button
              onClick={() => setLanguage('hi')}
              className={`px-1.5 py-px text-chip border ${language === 'hi' ? 'bg-navy text-white border-navy' : 'bg-white border-muted'}`}
              style={{ borderRadius: '2px' }}
              aria-pressed={language === 'hi'}
            >
              हिन्दी
            </button>
            <button
              onClick={() => setLanguage('en')}
              className={`px-1.5 py-px text-chip font-mono border ${language === 'en' ? 'bg-navy text-white border-navy' : 'bg-white border-muted'}`}
              style={{ borderRadius: '2px' }}
              aria-pressed={language === 'en'}
            >
              English
            </button>
          </div>
        </div>
      </div>

      {/* ── Tricolour strip ── */}
      <TricolourStrip />

      {/* ── Institutional Header ── */}
      <header className="bg-white border-b border-border px-6 py-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div
            className="border-2 border-dashed border-muted flex flex-col items-center justify-center text-center flex-shrink-0 bg-tint"
            style={{ width: 52, height: 60, borderRadius: '2px' }}
            aria-label="Government emblem placeholder"
            title="Emblem placeholder — authorised State Emblem must be inserted for production per GIGW 3.0"
          >
            <span style={{ fontSize: '22px' }}>🏛️</span>
            <span className="font-mono text-muted" style={{ fontSize: '7px', lineHeight: '1.2' }}>EMBLEM</span>
          </div>
          <div>
            <div className="text-chip font-semibold text-muted leading-tight">{tr('org1', language)}</div>
            <div className="text-chip text-muted leading-tight">{tr('org2', language)}</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-h2 font-bold text-navy">{tr('productName', language)}</div>
          <div className="text-chip text-muted">{tr('productTagline', language)}</div>
        </div>
      </header>

      {/* ── Page title bar ── */}
      <div className="bg-white border-b border-border px-6 py-2">
        <a href="#main-content" className="skip-link text-chip">
          {tr('skipToMain', language)}
        </a>
        <span className="text-chip text-muted font-mono">Home</span>
      </div>

      {/* ── Two-column main layout ── */}
      <main id="main-content" className="flex-1 max-w-content mx-auto px-6 py-8 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">

          {/* ── Left: About + Instructions ── */}
          <div className="space-y-4">

            {/* About */}
            <div className="panel">
              <div className="panel-header">
                <h2>About CaseConnect AI · केसकनेक्ट एआई के बारे में</h2>
              </div>
              <div className="p-4 space-y-3 text-body text-ink">
                <p>
                  <strong>CaseConnect AI</strong> is a centralized monitoring and case-management platform
                  for AICTE-related institutional complaints. It enables authorized officers to receive,
                  organize, assign, investigate, and resolve institution-related complaints across multiple
                  bureaus and cells.
                </p>
                <ul className="list-disc pl-5 space-y-1 text-body">
                  <li>Unified complaint registry across AICTE bureaus</li>
                  <li>Cross-bureau assignment and coordination</li>
                  <li>Role-based access control (Officer / Coordinator / Supervisor / Administrator)</li>
                  <li>SLA tracking with early-warning alerts</li>
                  <li>Evidence and attachment management</li>
                  <li>Hash-chained immutable audit ledger</li>
                  <li>Related-complaint relationship intelligence</li>
                  <li>Smart AI-assisted triage and categorisation</li>
                </ul>
                <div className="alert-warning mt-3">
                  <span className="font-bold" aria-hidden="true">◔</span>
                  <p>
                    <strong>Prototype Notice.</strong> This is a demonstration prototype for Smart India
                    Hackathon 2026 (SIH26264). All data is synthetic and visibly tagged{' '}
                    <SynthTag />. This system is not connected to official AICTE systems and must not
                    be used for actual complaint processing.
                  </p>
                </div>
              </div>
            </div>

            {/* Instructions for officers */}
            <div className="panel">
              <div className="panel-header">
                <h2>Instructions for Officers · अधिकारियों के लिए निर्देश</h2>
              </div>
              <div className="p-4 space-y-2 text-body text-ink">
                <ol className="list-decimal pl-5 space-y-2">
                  <li>Enter your AICTE officer User ID and password as issued by the system administrator.</li>
                  <li>Select your current role from the dropdown.</li>
                  <li>Enter the text shown in the CAPTCHA image exactly as displayed (case-sensitive).</li>
                  <li>Click <strong>Login</strong>. Do not share your credentials with anyone.</li>
                  <li>Your session will be logged to the audit ledger upon successful login.</li>
                  <li>For access issues, contact your bureau's system administrator.</li>
                </ol>
                <div className="alert-info mt-3">
                  <span aria-hidden="true">ℹ</span>
                  <p>
                    <strong>Demo mode:</strong> Any user ID and password are accepted. The CAPTCHA code
                    is <strong className="font-mono">{CAPTCHA_CODE}</strong>. Use the quick-login buttons
                    below to sign in as different roles.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ── Right: Sign-in panel ── */}
          <div className="space-y-4">
            <div className="panel">
              <div className="panel-header">
                <h2>Sign in · साइन इन करें</h2>
              </div>
              <div className="p-5">

                {error && (
                  <div className="mb-4" role="alert">
                    <AlertError>{error}</AlertError>
                  </div>
                )}

                <form onSubmit={handleSubmit} noValidate>
                  <div className="space-y-4">

                    {/* User ID */}
                    <div>
                      <label htmlFor="login-userid" className="form-label">
                        User ID <span className="text-status-red">*</span>
                      </label>
                      <input
                        id="login-userid"
                        type="text"
                        className="form-input"
                        value={userId}
                        onChange={e => setUserId(e.target.value)}
                        autoComplete="username"
                        placeholder="e.g. officer1@demo.aicte"
                        required
                        aria-required="true"
                        aria-describedby="userid-hint"
                      />
                      <span id="userid-hint" className="text-chip text-muted mt-0.5 block">
                        Enter your AICTE officer user ID
                      </span>
                    </div>

                    {/* Role */}
                    <div>
                      <label htmlFor="login-role" className="form-label">
                        Role <span className="text-status-red">*</span>
                      </label>
                      <select
                        id="login-role"
                        className="form-select"
                        value={role}
                        onChange={e => setRole(e.target.value)}
                        required
                        aria-required="true"
                      >
                        <option value="OFFICER">Officer</option>
                        <option value="COORDINATOR">Coordinator</option>
                        <option value="SUPERVISOR">Supervisor</option>
                        <option value="ADMINISTRATOR">Administrator</option>
                      </select>
                    </div>

                    {/* Password */}
                    <div>
                      <label htmlFor="login-password" className="form-label">
                        Password <span className="text-status-red">*</span>
                      </label>
                      <input
                        id="login-password"
                        type="password"
                        className="form-input"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        autoComplete="current-password"
                        placeholder="Enter your password"
                        required
                        aria-required="true"
                      />
                    </div>

                    {/* CAPTCHA */}
                    <div>
                      <label htmlFor="login-captcha" className="form-label">
                        CAPTCHA <span className="text-status-red">*</span>
                      </label>
                      <div className="flex gap-3 items-center mb-2">
                        <div
                          className="px-4 py-2 bg-panel-header border-2 border-navy font-mono text-h2 font-bold text-navy tracking-[0.35em] select-none"
                          style={{
                            borderRadius: '2px',
                            letterSpacing: '0.35em',
                            background: 'repeating-linear-gradient(0deg, transparent, transparent 5px, rgba(18,48,107,0.04) 5px, rgba(18,48,107,0.04) 6px)',
                          }}
                          aria-label={`CAPTCHA image showing the text: ${CAPTCHA_CODE}`}
                          role="img"
                        >
                          {CAPTCHA_CODE}
                        </div>
                        <div className="text-chip text-muted">
                          Enter exactly as shown.<br />Case-sensitive.
                        </div>
                      </div>
                      <input
                        id="login-captcha"
                        type="text"
                        className="form-input"
                        value={captchaInput}
                        onChange={e => setCaptchaInput(e.target.value)}
                        placeholder={`Type the ${CAPTCHA_CODE.length} characters shown above`}
                        required
                        aria-required="true"
                        aria-describedby="captcha-hint"
                        autoComplete="off"
                      />
                      <span id="captcha-hint" className="text-chip text-muted mt-0.5 block">
                        Type the text exactly as shown in the image above
                      </span>
                    </div>

                    {/* Buttons */}
                    <div className="flex gap-3 mt-2">
                      <button
                        type="submit"
                        className="btn-primary flex-1"
                        disabled={loading}
                        aria-busy={loading}
                      >
                        {loading ? '⟳ Signing in…' : tr('login', language)}
                      </button>
                      <button
                        type="button"
                        onClick={handleReset}
                        className="btn-secondary"
                        disabled={loading}
                      >
                        {tr('reset', language)}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>

            {/* Quick-login demo accounts */}
            <div className="panel">
              <div className="panel-header">
                <h2>Quick Login (Demo Accounts)</h2>
              </div>
              <div className="p-4 space-y-2">
                <p className="text-chip text-muted mb-3">
                  Click any account to auto-fill credentials. CAPTCHA is still required: <strong className="font-mono">{CAPTCHA_CODE}</strong>
                </p>
                {demoAccounts.map(acc => (
                  <button
                    key={acc.userId}
                    type="button"
                    onClick={() => {
                      setUserId(acc.userId)
                      setRole(acc.role)
                      setPassword(acc.password)
                      setError('')
                    }}
                    className="w-full text-left px-3 py-2 border border-border hover:border-navy hover:bg-tint transition-colors"
                    style={{ borderRadius: '2px' }}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-semibold text-navy">{acc.name}</span>
                        <span className="mx-2 text-muted">·</span>
                        <span className="font-mono text-mono text-muted">{acc.userId}</span>
                      </div>
                      <span className={`chip text-chip ${acc.role === 'ADMINISTRATOR' ? 'chip-under-review' : 'chip-received'}`}>
                        {acc.role}
                      </span>
                    </div>
                    {acc.bureauName && (
                      <div className="text-chip text-muted mt-0.5">{acc.bureauName}</div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="site-footer" role="contentinfo">
        <div className="max-w-content mx-auto px-6">
          <div className="flex flex-wrap gap-4 mb-3 text-chip">
            <a href="#" className="text-blue-300 underline">Terms</a>
            <a href="#" className="text-blue-300 underline">Privacy</a>
            <a href="#" className="text-blue-300 underline">Accessibility</a>
            <a href="#" className="text-blue-300 underline">Help &amp; Feedback</a>
          </div>
          <div className="text-chip text-blue-200 space-y-0.5">
            <p>Content owned by AICTE (Prototype — not official)</p>
            <p>Last updated: October 2026 · Version 1.0.0-prototype · Website Information Manager: [Placeholder]</p>
            <p className="font-mono opacity-70" style={{ fontSize: '10px' }}>
              SIH26264 · All data is synthetic (SYNTH). Not connected to official AICTE systems.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
