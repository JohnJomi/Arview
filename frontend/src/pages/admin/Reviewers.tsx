import { useEffect, useMemo, useState } from 'react'
import { listReviewers } from '../../lib/api'
import type { Reviewer } from '../../data/seed'

export default function Reviewers() {
  const [list, setList] = useState<Reviewer[]>([])
  const [q, setQ] = useState('')
  const [domain, setDomain] = useState('all')

  useEffect(() => { listReviewers().then(setList) }, [])

  const domains = useMemo(() => [...new Set(list.flatMap((r) => r.domains))].sort(), [list])
  const rows = useMemo(() => {
    const n = q.toLowerCase()
    return list.filter((r) => domain === 'all' || r.domains.includes(domain))
      .filter((r) => !n || r.name.toLowerCase().includes(n) || r.institution.toLowerCase().includes(n))
  }, [list, q, domain])

  return (
    <>
      <div className="app-head">
        <span className="label">— Admin console</span>
        <h1>Reviewers</h1>
        <p className="muted" style={{ fontSize: 'var(--t-small)' }}>Mock reviewer pool for development. The real reviewer database will be connected later through an import adapter.</p>
      </div>
      <section className="card">
        <div className="toolbar">
          <select value={domain} onChange={(e) => setDomain(e.target.value)} className="select">
            <option value="all">All domains</option>
            {domains.map((d) => <option key={d}>{d}</option>)}
          </select>
          <input type="text" placeholder="Search name or institution" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Reviewer</th><th>Institution</th><th>Domains</th><th>Workload</th><th>Status</th></tr></thead>
            <tbody>
              {rows.map((r) => {
                const full = r.workload >= r.workloadCap
                return (
                  <tr key={r.id}>
                    <td><strong>{r.name}</strong><div className="cell-sub">{r.email}</div></td>
                    <td>{r.institution}</td>
                    <td className="wrap"><div className="chips">{r.domains.map((d) => <span className="chip" key={d}>{d}</span>)}</div></td>
                    <td>
                      <span className={`meter ${full ? 'full' : ''}`}><span style={{ width: `${(r.workload / r.workloadCap) * 100}%` }} /></span>
                      {r.workload}/{r.workloadCap}
                    </td>
                    <td>{!r.active ? <span className="verdict verdict-bad">Inactive</span> : full ? <span className="verdict verdict-wait">At capacity</span> : <span className="verdict verdict-ok">Available</span>}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>
    </>
  )
}
