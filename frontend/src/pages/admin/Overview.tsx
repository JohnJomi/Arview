import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { getSubmissions, listReviewers, listUsers, userById } from '../../lib/api'
import type { Reviewer, Submission, User } from '../../data/seed'
import { StatusBadge, fmtDate } from '../../components/ui'

const NEEDS_EDITOR = ['SCOPE_FLAGGED', 'SUBMITTED']

export default function Overview() {
  const [users, setUsers] = useState<User[]>([])
  const [reviewers, setReviewers] = useState<Reviewer[]>([])
  const [subs, setSubs] = useState<Submission[]>([])

  useEffect(() => {
    Promise.all([listUsers(), listReviewers(), getSubmissions()]).then(([u, r, s]) => { setUsers(u); setReviewers(r); setSubs(s) })
  }, [])

  const authors = users.filter((u) => u.role === 'author').length
  const activeRev = reviewers.filter((r) => r.active).length
  const inReview = subs.filter((s) => s.state === 'IN_REVIEW').length
  const attention = subs.filter((s) => NEEDS_EDITOR.includes(s.state)).length

  return (
    <>
      <div className="app-head">
        <span className="label">— Admin console</span>
        <h1>Overview</h1>
      </div>

      <div className="stats">
        <div className="stat"><span className="label">Articles</span><div className="stat-n">{subs.length}<small>{attention} need attention</small></div></div>
        <div className="stat"><span className="label">In review</span><div className="stat-n">{inReview}</div></div>
        <div className="stat"><span className="label">Authors</span><div className="stat-n">{authors}<small>{users.length} users</small></div></div>
        <div className="stat"><span className="label">Reviewers</span><div className="stat-n">{activeRev}<small>of {reviewers.length} active</small></div></div>
      </div>

      <section className="card">
        <div className="toolbar">
          <h3 style={{ fontSize: 'var(--t-h3)' }}>Recent submissions</h3>
          <Link to="/admin/articles" className="btn btn-ghost btn-sm">All articles <ArrowRight size={15} /></Link>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Title</th><th>Author</th><th>Submitted</th><th>Status</th></tr></thead>
            <tbody>
              {subs.slice(0, 5).map((s) => (
                <tr key={s.id}>
                  <td><div className="cell-title">{s.title}</div></td>
                  <td>{userById(s.authorId)?.name ?? '—'}</td>
                  <td>{fmtDate(s.createdAt)}</td>
                  <td><StatusBadge state={s.state} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  )
}
