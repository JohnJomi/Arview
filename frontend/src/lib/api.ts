// Mock API. Function names mirror architecture.md §10 so a FastAPI client
// can replace this file later without touching the UI.
import { DEMO_PASSWORD, JOURNAL, REVIEWERS, SUBMISSIONS, USERS } from '../data/seed'
import type { Reviewer, Role, Submission, User } from '../data/seed'

const KEY = 'jr.submissions.v1'
const delay = (ms = 250) => new Promise((r) => setTimeout(r, ms))

function load(): Submission[] {
  const raw = localStorage.getItem(KEY)
  if (raw) {
    try { return JSON.parse(raw) as Submission[] } catch { /* fall through to seed */ }
  }
  localStorage.setItem(KEY, JSON.stringify(SUBMISSIONS))
  return [...SUBMISSIONS]
}
function save(list: Submission[]) { localStorage.setItem(KEY, JSON.stringify(list)) }

// POST /auth/login
export async function login(email: string, password: string, role: Role): Promise<User> {
  await delay()
  const user = USERS.find((u) => u.email.toLowerCase() === email.trim().toLowerCase())
  if (!user || password !== DEMO_PASSWORD) throw new Error('Incorrect email or password.')
  if (user.role !== role) throw new Error(`This account is not registered as ${role === 'author' ? 'an author' : `a ${role}`}.`)
  return user
}

// GET /submissions?author=
export async function getSubmissions(authorId?: string): Promise<Submission[]> {
  await delay()
  const all = load().sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  return authorId ? all.filter((s) => s.authorId === authorId) : all
}

// POST /submissions
export async function createSubmission(input: {
  authorId: string; title: string; abstract: string; keywords: string[]; file: File
}): Promise<Submission> {
  await delay(600)
  const sub: Submission = {
    id: `s${Date.now()}`,
    journalId: JOURNAL.id,
    authorId: input.authorId,
    title: input.title,
    abstract: input.abstract,
    keywords: input.keywords,
    fileName: input.file.name,
    fileSize: input.file.size,
    state: 'SUBMITTED',
    createdAt: new Date().toISOString(),
  }
  save([sub, ...load()])
  return sub
}

// GET /admin/users
export async function listUsers(): Promise<User[]> { await delay(); return USERS }
// GET /reviewers
export async function listReviewers(): Promise<Reviewer[]> { await delay(); return REVIEWERS }

export function userById(id: string) { return USERS.find((u) => u.id === id) }

export function resetDemoData() { localStorage.removeItem(KEY) }
