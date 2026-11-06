import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FileText, Plus } from 'lucide-react'
import { getSubmissions } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import type { Submission } from '../../data/seed'
import { Empty, Pipeline, StatusBadge, fmtDate, fmtSize } from '../../components/ui'

export default function MySubmissions() {
  const { user } = useAuth()
  const [subs, setSubs] = useState<Submission[] | null>(null)
  const [selected, setSelected] = useState<string | null>(null)

  useEffect(() => {
    getSubmissions(user!.id).then((s) => { setSubs(s); setSelected(s[0]?.id ?? null) })
  }, [user])

  const active = subs?.find((s) => s.id === selected)

  return (
    <>
      <div className="app-head">
        <span className="label">— Author workspace</span>
        <div className="toolbar" style={{ marginBottom: 0 }}>
          <h1>My submissions</h1>
          <Link to="/author/submit" className="btn btn-accent"><Plus size={17} /> New submission</Link>
        </div>
      </div>

      <div className="work">
        <section className="card">
          {subs === null ? <p className="muted">Loading…</p> : subs.length === 0 ? (
            <Empty icon={<FileText />}>You haven't submitted anything yet. Upload your first manuscript to get started.</Empty>
          ) : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Manuscript</th><th>Submitted</th><th>Status</th></tr></thead>
                <tbody>
                  {subs.map((s) => (
                    <tr key={s.id} className={`clickable ${s.id === selected ? 'selected' : ''}`} onClick={() => setSelected(s.id)}>
                      <td><div className="cell-title">{s.title}</div><div className="cell-sub">{s.fileName} · {fmtSize(s.fileSize)}</div></td>
                      <td>{fmtDate(s.createdAt)}</td>
                      <td><StatusBadge state={s.state} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <aside className="aside">
          <div className="aside-card">
            <h3>Pipeline progress</h3>
            {active ? <Pipeline state={active.state} /> : <p className="muted" style={{ fontSize: 'var(--t-small)' }}>Select a submission to see its progress.</p>}
          </div>
          <div className="aside-card">
            <h3>How review works</h3>
            <p className="muted" style={{ fontSize: '0.8125rem' }}>
              Each manuscript is screened for scope, similarity and subdomain by local models.
              An editor confirms every step before it goes to reviewers.
            </p>
          </div>
        </aside>
      </div>
    </>
  )
}
