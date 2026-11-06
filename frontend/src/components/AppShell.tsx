import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { useAuth } from '../lib/auth'
import { BrandMark } from './ui'
import { JOURNAL } from '../data/seed'

const LINKS = {
  author: [{ to: '/author', label: 'My submissions', end: true }, { to: '/author/submit', label: 'New submission' }],
  admin: [
    { to: '/admin', label: 'Overview', end: true },
    { to: '/admin/articles', label: 'Articles' },
    { to: '/admin/users', label: 'Users' },
    { to: '/admin/reviewers', label: 'Reviewers' },
  ],
  reviewer: [{ to: '/reviewer', label: 'Assignments', end: true }],
}

const ROLE_LABEL = { author: 'Author', admin: 'Admin', reviewer: 'Reviewer' }

export default function AppShell() {
  const { user, signOut } = useAuth()
  const nav = useNavigate()
  if (!user) return null

  return (
    <>
      <header className="topbar">
        <div className="shell nav">
          <a className="brand" href={`/${user.role}`}>
            <BrandMark /> Journal Review
            <span className="brand-journal hide-sm">{JOURNAL.name}</span>
          </a>
          <nav className="topnav" aria-label="Main">
            {LINKS[user.role].map((l) => (
              <NavLink key={l.to} to={l.to} end={'end' in l ? l.end : false}>{l.label}</NavLink>
            ))}
          </nav>
          <div className="nav-right">
            <span className="whoami hide-sm">
              <strong>{user.name}</strong>
              <span className="label">{ROLE_LABEL[user.role]}</span>
            </span>
            <button className="btn btn-ghost btn-sm" onClick={() => { signOut(); nav('/login') }}>
              <LogOut size={15} /> Sign out
            </button>
          </div>
        </div>
      </header>
      <main className="shell app-main">
        <Outlet />
      </main>
    </>
  )
}
