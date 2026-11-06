import { Navigate, Route, Routes } from 'react-router-dom'
import type { ReactNode } from 'react'
import { homeFor, useAuth } from './lib/auth'
import type { Role } from './data/seed'
import AppShell from './components/AppShell'
import Login from './pages/Login'
import MySubmissions from './pages/author/MySubmissions'
import Submit from './pages/author/Submit'
import Overview from './pages/admin/Overview'
import Articles from './pages/admin/Articles'
import Users from './pages/admin/Users'
import Reviewers from './pages/admin/Reviewers'
import ComingSoon from './pages/reviewer/ComingSoon'

function Guard({ role, children }: { role: Role; children: ReactNode }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== role) return <Navigate to={homeFor(user.role)} replace />
  return <>{children}</>
}

export default function App() {
  const { user } = useAuth()
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to={homeFor(user.role)} replace /> : <Login />} />
      <Route path="/author" element={<Guard role="author"><AppShell /></Guard>}>
        <Route index element={<MySubmissions />} />
        <Route path="submit" element={<Submit />} />
      </Route>
      <Route path="/admin" element={<Guard role="admin"><AppShell /></Guard>}>
        <Route index element={<Overview />} />
        <Route path="articles" element={<Articles />} />
        <Route path="users" element={<Users />} />
        <Route path="reviewers" element={<Reviewers />} />
      </Route>
      <Route path="/reviewer" element={<Guard role="reviewer"><AppShell /></Guard>}>
        <Route index element={<ComingSoon />} />
      </Route>
      <Route path="*" element={<Navigate to={user ? homeFor(user.role) : '/login'} replace />} />
    </Routes>
  )
}
