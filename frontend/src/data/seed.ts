export type Role = 'author' | 'reviewer' | 'admin'

export type SubmissionState =
  | 'SUBMITTED'
  | 'EXTRACTING'
  | 'SCOPE_CHECK'
  | 'SCOPE_FLAGGED'
  | 'PLAGIARISM_CHECK'
  | 'CLASSIFYING'
  | 'REVIEWER_RANKING'
  | 'IN_REVIEW'
  | 'DESK_REJECTED'
  | 'DECIDED'

export interface User {
  id: string
  name: string
  email: string
  role: Role
  institution: string
  joined: string
}

export interface Reviewer {
  id: string
  name: string
  email: string
  institution: string
  domains: string[]
  workload: number
  workloadCap: number
  active: boolean
}

export interface Submission {
  id: string
  journalId: string
  authorId: string
  title: string
  abstract: string
  keywords: string[]
  fileName: string
  fileSize: number
  state: SubmissionState
  createdAt: string
}

export const JOURNAL = { id: 'amj', name: 'Academy of Management Journal' }

// Demo credentials: shown on the login screen.
export const DEMO_PASSWORD = 'demo123'

export const USERS: User[] = [
  { id: 'u1', name: 'Priya Raman', email: 'author@demo.org', role: 'author', institution: 'IIM Bangalore', joined: '2026-08-12' },
  { id: 'u2', name: 'Daniel Okafor', email: 'daniel.okafor@lse.ac.uk', role: 'author', institution: 'London School of Economics', joined: '2026-09-02' },
  { id: 'u3', name: 'Mei Lin', email: 'mei.lin@nus.edu.sg', role: 'author', institution: 'National University of Singapore', joined: '2026-09-18' },
  { id: 'u4', name: 'Lucas Becker', email: 'l.becker@wu.ac.at', role: 'author', institution: 'WU Vienna', joined: '2026-10-05' },
  { id: 'u5', name: 'Sarah Whitfield', email: 'reviewer@demo.org', role: 'reviewer', institution: 'Wharton School', joined: '2026-07-21' },
  { id: 'u6', name: 'Admin', email: 'admin@demo.org', role: 'admin', institution: 'Editorial Office', joined: '2026-07-01' },
]

const r = (id: string, name: string, email: string, institution: string, domains: string[], workload: number, workloadCap: number, active = true): Reviewer =>
  ({ id, name, email, institution, domains, workload, workloadCap, active })

export const REVIEWERS: Reviewer[] = [
  r('r1', 'Sarah Whitfield', 'reviewer@demo.org', 'Wharton School', ['Organizational Behavior', 'Leadership'], 2, 4),
  r('r2', 'Hiroshi Tanaka', 'h.tanaka@hit-u.ac.jp', 'Hitotsubashi University', ['Strategy', 'International Business'], 3, 3),
  r('r3', 'Amara Nwosu', 'a.nwosu@insead.edu', 'INSEAD', ['Entrepreneurship', 'Innovation'], 1, 4),
  r('r4', 'Carlos Medina', 'cmedina@ie.edu', 'IE Business School', ['Human Resource Management'], 0, 3),
  r('r5', 'Elena Petrova', 'e.petrova@lbs.edu', 'London Business School', ['Strategy', 'Corporate Governance'], 2, 5),
  r('r6', 'James Holloway', 'jholloway@stanford.edu', 'Stanford GSB', ['Organizational Theory', 'Networks'], 4, 4),
  r('r7', 'Fatima Al-Sayed', 'f.alsayed@kfupm.edu.sa', 'KFUPM', ['International Business', 'Emerging Markets'], 1, 3),
  r('r8', 'Ravi Menon', 'ravi.menon@iima.ac.in', 'IIM Ahmedabad', ['Entrepreneurship', 'Family Business'], 2, 4),
  r('r9', 'Ingrid Solberg', 'ingrid.solberg@bi.no', 'BI Norwegian Business School', ['Organizational Behavior', 'Teams'], 0, 2, false),
  r('r10', 'Thomas Reed', 't.reed@mit.edu', 'MIT Sloan', ['Technology Management', 'Innovation'], 3, 4),
  r('r11', 'Grace Mbeki', 'g.mbeki@uct.ac.za', 'University of Cape Town', ['Human Resource Management', 'Diversity'], 1, 3),
  r('r12', 'Marco Bianchi', 'marco.bianchi@unibocconi.it', 'Bocconi University', ['Strategy', 'Mergers & Acquisitions'], 2, 3),
]

export const SUBMISSIONS: Submission[] = [
  {
    id: 's1', journalId: 'amj', authorId: 'u2',
    title: 'Psychological Safety and Voice in Distributed Teams: A Multilevel Field Study',
    abstract: 'Drawing on survey data from 212 teams across 14 firms, we examine how psychological safety shapes employee voice when teams work remotely.',
    keywords: ['psychological safety', 'voice', 'remote work'],
    fileName: 'okafor_psych_safety.pdf', fileSize: 1_840_000, state: 'IN_REVIEW', createdAt: '2026-09-14T10:20:00Z',
  },
  {
    id: 's2', journalId: 'amj', authorId: 'u3',
    title: 'Founder Identity and Pivot Decisions in Early-Stage Ventures',
    abstract: 'Using longitudinal data on 340 Singaporean startups, we show that founder identity type predicts the timing and scope of strategic pivots.',
    keywords: ['entrepreneurship', 'founder identity', 'pivots'],
    fileName: 'lin_founder_identity.pdf', fileSize: 2_310_000, state: 'CLASSIFYING', createdAt: '2026-10-21T08:05:00Z',
  },
  {
    id: 's3', journalId: 'amj', authorId: 'u4',
    title: 'A Conceptual Model of Board Attention Allocation',
    abstract: 'We develop a theoretical framework explaining how corporate boards allocate attention across competing strategic issues.',
    keywords: ['corporate governance', 'attention', 'boards'],
    fileName: 'becker_board_attention.pdf', fileSize: 980_000, state: 'SCOPE_FLAGGED', createdAt: '2026-10-30T15:42:00Z',
  },
  {
    id: 's4', journalId: 'amj', authorId: 'u1',
    title: 'Algorithmic Management and Gig Worker Commitment',
    abstract: 'Across three studies with platform workers in India, we test how algorithmic control affects affective commitment and turnover intentions.',
    keywords: ['algorithmic management', 'gig economy', 'commitment'],
    fileName: 'raman_algorithmic_mgmt.pdf', fileSize: 1_420_000, state: 'PLAGIARISM_CHECK', createdAt: '2026-11-03T09:12:00Z',
  },
  {
    id: 's5', journalId: 'amj', authorId: 'u2',
    title: 'Teaching Strategy with Simulations: Evidence from MBA Classrooms',
    abstract: 'We evaluate a simulation-based strategy course across four MBA cohorts and report learning outcomes.',
    keywords: ['management education', 'simulation'],
    fileName: 'okafor_teaching_sims.pdf', fileSize: 760_000, state: 'DESK_REJECTED', createdAt: '2026-08-29T13:00:00Z',
  },
]
