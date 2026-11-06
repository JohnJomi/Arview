import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Check } from 'lucide-react'
import { login } from '../lib/api'
import { homeFor, useAuth } from '../lib/auth'
import { BrandMark } from '../components/ui'
import { DEMO_PASSWORD } from '../data/seed'
import type { Role } from '../data/seed'

const ROLES: { id: Role; label: string; demo: string; blurb: string }[] = [
  { id: 'author', label: 'Author', demo: 'author@demo.org', blurb: 'Submit manuscripts and track their progress.' },
  { id: 'reviewer', label: 'Reviewer', demo: 'reviewer@demo.org', blurb: 'Respond to invitations and submit reports.' },
  { id: 'admin', label: 'Admin', demo: 'admin@demo.org', blurb: 'Oversee users, reviewers and every submission.' },
]

export default function Login() {
  const [role, setRole] = useState<Role>('author')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const { signIn } = useAuth()
  const nav = useNavigate()
  const current = ROLES.find((r) => r.id === role)!

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(''); setBusy(true)
    try {
      const u = await login(email, password, role)
      signIn(u)
      nav(homeFor(u.role), { replace: true })
    } catch (err) {
      setError((err as Error).message)
    } finally { setBusy(false) }
  }

  return (
    <div className="shell login">
      <section>
        <span className="brand"><BrandMark /> Journal Review</span>
        <h1>AI recommends.<br /><em>Editors decide.</em></h1>
        <p className="lede">
          A review workflow for the <span className="mark">Academy of Management Journal</span>.
          Scope, plagiarism and subdomain screening with local models, and a human sign-off at every stage.
        </p>
        <ul className="assurances section-gap">
          {['Manuscripts never leave our infrastructure for an external LLM', 'Every AI recommendation shows its evidence', 'Every decision is recorded in an audit trail'].map((t) => (
            <li key={t}><Check className="tick" /> {t}</li>
          ))}
        </ul>
      </section>

      <section className="card card-lift">
        <div className="tabs" role="tablist" aria-label="Sign in as">
          {ROLES.map((r) => (
            <button key={r.id} role="tab" aria-selected={role === r.id} type="button"
              onClick={() => { setRole(r.id); setError('') }}>{r.label}</button>
          ))}
        </div>
        <span className="label label-accent">{current.label} sign in</span>
        <p className="muted" style={{ fontSize: 'var(--t-small)', margin: '0.5rem 0 1.5rem' }}>{current.blurb}</p>

        <form onSubmit={onSubmit} noValidate>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" type="text" autoComplete="username" value={email}
              onChange={(e) => setEmail(e.target.value)} placeholder="you@university.edu" />
          </div>
          <div className="field">
            <label htmlFor="pw">Password</label>
            <div className="input-row">
              <input id="pw" type={show ? 'text' : 'password'} autoComplete="current-password"
                value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
              <button type="button" className="reveal" onClick={() => setShow((s) => !s)}>{show ? 'Hide' : 'Show'}</button>
            </div>
          </div>
          {error && <p className="error-text" role="alert">{error}</p>}
          <button className="btn btn-accent btn-lg btn-block" disabled={busy || !email || !password}>
            {busy ? 'Signing in…' : <>Sign in <ArrowRight size={17} /></>}
          </button>
        </form>

        <div className="demo-creds">
          Demo account: <code>{current.demo}</code> / <code>{DEMO_PASSWORD}</code>{' '}
          <button type="button" className="reveal" style={{ padding: '0.25rem 0.7rem', marginLeft: '0.4rem' }}
            onClick={() => { setEmail(current.demo); setPassword(DEMO_PASSWORD) }}>Fill</button>
        </div>
      </section>
    </div>
  )
}
