import { useEffect, useMemo, useState } from 'react'
import { getSubmissions, listUsers } from '../../lib/api'
import type { Role, Submission, User } from '../../data/seed'
import { fmtDate } from '../../components/ui'

type Filter = 'all' | Role
const ROLE_LABEL: Record<Role, string> = { author: 'Author', reviewer: 'Reviewer', admin: 'Admin' }

export default function Users() {
  const [users, setUsers] = useState<User[]>([])
  const [subs, setSubs] = useState<Submission[]>([])
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<Filter>('all')

  useEffect(() => { Promise.all([listUsers(), getSubmissions()]).then(([u, s]) => { setUsers(u); setSubs(s) }) }, [])

  const rows = useMemo(() => {
    const n = q.toLowerCase()
    return users.filter((u) => filter === 'all' || u.role === filter)
      .filter((u) => !n || u.name.toLowerCase().includes(n) || u.email.toLowerCase().includes(n))
  }, [users, q, filter])

  return (
    <>
      <div className="app-head">
        <span className="label">— Admin console</span>
        <h1>Users</h1>
      </div>
      <section className="card">
        <div className="toolbar">
          <div className="tabs" role="tablist">
            {(['all', 'author', 'reviewer', 'admin'] as Filter[]).map((f) => (
              <button key={f} role="tab" aria-selected={filter === f} onClick={() => setFilter(f)}>
                {f === 'all' ? 'All' : `${ROLE_LABEL[f]}s`}
              </button>
            ))}
          </div>
          <input type="text" placeholder="Search name or email" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Name</th><th>Role</th><th>Institution</th><th>Submissions</th><th>Joined</th></tr></thead>
            <tbody>
              {rows.map((u) => (
                <tr key={u.id}>
                  <td><strong>{u.name}</strong><div className="cell-sub">{u.email}</div></td>
                  <td><span className="chip">{ROLE_LABEL[u.role]}</span></td>
                  <td>{u.institution}</td>
                  <td>{u.role === 'author' ? subs.filter((s) => s.authorId === u.id).length : '—'}</td>
                  <td>{fmtDate(u.joined)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  )
}
