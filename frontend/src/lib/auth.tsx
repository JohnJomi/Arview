import { createContext, useContext, useState } from 'react'
import type { ReactNode } from 'react'
import type { User } from '../data/seed'

const KEY = 'jr.session.v1'

interface AuthCtx {
  user: User | null
  signIn: (u: User) => void
  signOut: () => void
}

const Ctx = createContext<AuthCtx | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const raw = sessionStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as User) : null
  })
  const signIn = (u: User) => { sessionStorage.setItem(KEY, JSON.stringify(u)); setUser(u) }
  const signOut = () => { sessionStorage.removeItem(KEY); setUser(null) }
  return <Ctx.Provider value={{ user, signIn, signOut }}>{children}</Ctx.Provider>
}

export function useAuth() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useAuth must be used inside AuthProvider')
  return c
}

export const homeFor = (role: User['role']) => `/${role}`
