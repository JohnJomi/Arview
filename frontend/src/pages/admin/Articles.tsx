import { useEffect, useMemo, useState } from 'react'
import { FileText, X } from 'lucide-react'
import { getSubmissions, userById } from '../../lib/api'
import type { Submission } from '../../data/seed'
import { Empty, Pipeline, StatusBadge, fmtDate, fmtSize } from '../../components/ui'

type Filter = 'all' | 'active' | 'flagged' | 'review'
const FILTERS: { id: Filter; label: string; test: (s: Submission) => boolean }[] = [
  { id: 'all', label: 'All', test: () => true },
  { id: 'active', label: 'In pipeline', test: (s) => ['SUBMITTED', 'EXTRACTING', 'SCOPE_CHECK', 'PLAGIARISM_CHECK', 'CLASSIFYING', 'REVIEWER_RANKING'].includes(s.state) },
  { id: 'flagged', label: 'Flagged / rejected', test: (s) => ['SCOPE_FLAGGED', 'DESK_REJECTED'].includes(s.state) },
  { id: 'review', label: 'In review', test: (s) => ['IN_REVIEW', 'DECIDED'].includes(s.state) },
]

export default function Articles() {
  const [subs, setSubs] = useState<Submission[] | null>(null)
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [open, setOpen] = useState<Submission | null>(null)

  useEffect(() => { getSubmissions().then(setSubs) }, [])

  const rows = useMemo(() => {
    const f = FILTERS.find((x) => x.id === filter)!
    const needle = q.toLowerCase()
    return (subs ?? []).filter(f.test).filter((s) =>
      !needle || s.title.toLowerCase().includes(needle) || (userById(s.authorId)?.name ?? '').toLowerCase().includes(needle))
  }, [subs, q, filter])

  return (
    <>
      <div className="app-head">
        <span className="label">— Admin console</span>
        <h1>Articles</h1>
      </div>

      <section className="card">
        <div className="toolbar">
          <div className="tabs" role="tablist">
            {FILTERS.map((f) => (
              <button key={f.id} role="tab" aria-selected={filter === f.id} onClick={() => setFilter(f.id)}>{f.label}</button>
            ))}
          </div>
          <input type="text" placeholder="Search title or author" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>

        {subs === null ? <p className="muted">Loading…</p> : rows.length === 0 ? (
          <Empty icon={<FileText />}>No articles match this view.</Empty>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Title</th><th>Author</th><th>File</th><th>Submitted</th><th>Status</th></tr></thead>
              <tbody>
                {rows.map((s) => {
                  const a = userById(s.authorId)
                  return (
                    <tr key={s.id} className="clickable" onClick={() => setOpen(s)}>
                      <td><div className="cell-title">{s.title}</div></td>
                      <td>{a?.name ?? '—'}<div className="cell-sub">{a?.institution}</div></td>
                      <td className="cell-sub">{fmtSize(s.fileSize)}</td>
                      <td>{fmtDate(s.createdAt)}</td>
                      <td><StatusBadge state={s.state} /></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {open && (
        <>
          <div className="drawer-backdrop" onClick={() => setOpen(null)} />
          <aside className="drawer" role="dialog" aria-label="Article details">
            <div className="drawer-head">
              <span className="label">Article {open.id}</span>
              <button className="icon-btn" aria-label="Close" onClick={() => setOpen(null)}><X size={20} /></button>
            </div>
            <h2>{open.title}</h2>
            <StatusBadge state={open.state} />
            <dl>
              <dt>Author</dt><dd>{userById(open.authorId)?.name}</dd>
              <dt>Institution</dt><dd>{userById(open.authorId)?.institution}</dd>
              <dt>Submitted</dt><dd>{fmtDate(open.createdAt)}</dd>
              <dt>File</dt><dd>{open.fileName} · {fmtSize(open.fileSize)}</dd>
              <dt>Keywords</dt><dd><div className="chips">{open.keywords.map((k) => <span className="chip" key={k}>{k}</span>)}</div></dd>
            </dl>
            <span className="label">Abstract</span>
            <p className="muted" style={{ fontSize: 'var(--t-small)', margin: '0.5rem 0 1.75rem' }}>{open.abstract}</p>
            <span className="label">Pipeline</span>
            <div style={{ marginTop: '0.5rem' }}><Pipeline state={open.state} /></div>
          </aside>
        </>
      )}
    </>
  )
}
