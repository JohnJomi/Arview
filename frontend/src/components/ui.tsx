import type { ReactNode } from 'react'
import type { SubmissionState } from '../data/seed'

export function BrandMark() {
  return (
    <svg className="brand-mark" viewBox="0 0 22 22" aria-hidden="true">
      <rect x="1" y="1" width="20" height="20" rx="6" fill="#0D0E0A" />
      <path d="M6.5 11.5l3 3 6-7" stroke="#C8F04B" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

const STATE_META: Record<SubmissionState, { label: string; tone: 'ok' | 'bad' | 'wait' }> = {
  SUBMITTED: { label: 'Submitted', tone: 'wait' },
  EXTRACTING: { label: 'Extracting', tone: 'wait' },
  SCOPE_CHECK: { label: 'Scope check', tone: 'wait' },
  SCOPE_FLAGGED: { label: 'Scope flagged', tone: 'bad' },
  PLAGIARISM_CHECK: { label: 'Plagiarism check', tone: 'wait' },
  CLASSIFYING: { label: 'Classifying', tone: 'wait' },
  REVIEWER_RANKING: { label: 'Matching reviewers', tone: 'wait' },
  IN_REVIEW: { label: 'In review', tone: 'ok' },
  DESK_REJECTED: { label: 'Desk rejected', tone: 'bad' },
  DECIDED: { label: 'Decided', tone: 'ok' },
}

export function StatusBadge({ state }: { state: SubmissionState }) {
  const m = STATE_META[state]
  return <span className={`verdict verdict-${m.tone}`}>{m.label}</span>
}
export const stateLabel = (s: SubmissionState) => STATE_META[s].label
export const ALL_STATES = Object.keys(STATE_META) as SubmissionState[]

// Pipeline stages from Fig. 1, and how far a given state has progressed.
const STAGES = ['Ingestion', 'Scope matcher', 'Plagiarism', 'Classifier', 'Reviewer matcher', 'In review'] as const
const PROGRESS: Record<SubmissionState, { done: number; fail?: boolean }> = {
  SUBMITTED: { done: 0 }, EXTRACTING: { done: 0 }, SCOPE_CHECK: { done: 1 },
  SCOPE_FLAGGED: { done: 1, fail: true }, PLAGIARISM_CHECK: { done: 2 }, CLASSIFYING: { done: 3 },
  REVIEWER_RANKING: { done: 4 }, IN_REVIEW: { done: 5 }, DESK_REJECTED: { done: 1, fail: true }, DECIDED: { done: 6 },
}

export function Pipeline({ state }: { state: SubmissionState }) {
  const p = PROGRESS[state]
  return (
    <ol className="pipeline">
      {STAGES.map((name, i) => {
        const cls = i < p.done ? 'stage-done' : i === p.done ? (p.fail ? 'stage-fail' : 'stage-active') : 'stage-idle'
        const where = i < p.done ? 'Complete' : i === p.done ? (p.fail ? 'Awaiting editor' : 'In progress') : 'Pending'
        return (
          <li key={name} className={`stage ${cls}`}>
            <span className="dot" />
            <span className="stage-name">{name}</span>
            <span className="stage-where">{where}</span>
          </li>
        )
      })}
    </ol>
  )
}

export function Empty({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return <div className="empty">{icon}<p>{children}</p></div>
}

export const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
export const fmtSize = (b: number) => (b > 1e6 ? `${(b / 1e6).toFixed(1)} MB` : `${Math.round(b / 1e3)} KB`)
