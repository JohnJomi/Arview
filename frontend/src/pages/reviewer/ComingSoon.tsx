import { Hourglass } from 'lucide-react'

export default function ComingSoon() {
  return (
    <>
      <div className="app-head">
        <span className="label">— Reviewer portal</span>
        <h1>Assignments</h1>
      </div>
      <section className="card">
        <div className="empty">
          <Hourglass />
          <p><strong style={{ color: 'var(--ink)' }}>Coming soon.</strong> You'll be able to accept invitations, download manuscripts and submit reports here.</p>
        </div>
      </section>
    </>
  )
}
