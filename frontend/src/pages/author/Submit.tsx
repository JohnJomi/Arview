import { useRef, useState } from 'react'
import type { DragEvent, FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle2, FileText, UploadCloud, X } from 'lucide-react'
import { createSubmission } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { fmtSize } from '../../components/ui'
import type { Submission } from '../../data/seed'

const MAX = 20 * 1024 * 1024

export default function Submit() {
  const { user } = useAuth()
  const input = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [over, setOver] = useState(false)
  const [title, setTitle] = useState('')
  const [abstract, setAbstract] = useState('')
  const [keywords, setKeywords] = useState('')
  const [consent, setConsent] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState<Submission | null>(null)

  function pick(f?: File | null) {
    setError('')
    if (!f) return
    if (f.type !== 'application/pdf' && !f.name.toLowerCase().endsWith('.pdf')) return setError('Only PDF files are accepted.')
    if (f.size > MAX) return setError('File is larger than 20 MB.')
    setFile(f)
    if (!title) setTitle(f.name.replace(/\.pdf$/i, '').replace(/[_-]+/g, ' '))
  }

  function onDrop(e: DragEvent) { e.preventDefault(); setOver(false); pick(e.dataTransfer.files[0]) }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!file) return setError('Attach your manuscript PDF.')
    setBusy(true)
    try {
      const sub = await createSubmission({
        authorId: user!.id, title: title.trim(), abstract: abstract.trim(),
        keywords: keywords.split(',').map((k) => k.trim()).filter(Boolean), file,
      })
      setDone(sub)
    } catch (err) { setError((err as Error).message) } finally { setBusy(false) }
  }

  function reset() { setFile(null); setTitle(''); setAbstract(''); setKeywords(''); setConsent(false); setDone(null) }

  if (done) {
    return (
      <div className="centred-action">
        <div className="banner banner-ok">
          <CheckCircle2 className="banner-icon" color="var(--lime-deep)" />
          <div>
            <h3>Manuscript received</h3>
            <p>"{done.title}" is in the queue. Ingestion and scope screening start next, and you can follow progress in My submissions.</p>
          </div>
        </div>
        <div className="hero-actions">
          <Link to="/author" className="btn btn-accent">View my submissions</Link>
          <button className="btn btn-ghost" onClick={reset}>Submit another</button>
        </div>
      </div>
    )
  }

  const ready = file && title.trim() && abstract.trim() && consent

  return (
    <>
      <div className="app-head">
        <span className="label">— New submission</span>
        <h1>Upload a manuscript</h1>
      </div>

      <form className="work" onSubmit={onSubmit} noValidate>
        <section className="card">
          <div className="field">
            <label>Manuscript PDF</label>
            {file ? (
              <div className="file-pill">
                <FileText size={22} />
                <div className="grow"><div>{file.name}</div><span className="cell-sub">{fmtSize(file.size)}</span></div>
                <button type="button" className="icon-btn" aria-label="Remove file" onClick={() => setFile(null)}><X size={18} /></button>
              </div>
            ) : (
              <div className={`dropzone ${over ? 'over' : ''}`} role="button" tabIndex={0}
                onClick={() => input.current?.click()}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && input.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setOver(true) }} onDragLeave={() => setOver(false)} onDrop={onDrop}>
                <UploadCloud />
                <strong>Drop your PDF here or click to browse</strong>
                <span>PDF only, up to 20 MB</span>
              </div>
            )}
            <input ref={input} type="file" accept="application/pdf,.pdf" hidden onChange={(e) => pick(e.target.files?.[0])} />
          </div>

          <div className="field">
            <label htmlFor="title">Title</label>
            <input id="title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Full manuscript title" />
          </div>
          <div className="field">
            <label htmlFor="abstract">Abstract</label>
            <textarea id="abstract" value={abstract} onChange={(e) => setAbstract(e.target.value)} placeholder="Paste your abstract" />
            <p className="field-note">Scope matching uses the abstract, so paste the full text.</p>
          </div>
          <div className="field">
            <label htmlFor="kw">Keywords</label>
            <input id="kw" type="text" value={keywords} onChange={(e) => setKeywords(e.target.value)} placeholder="e.g. leadership, team dynamics, field study" />
            <p className="field-note">Separate keywords with commas.</p>
          </div>

          <label className="check">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
            I consent to my manuscript being screened for similarity, which may include sending it to Turnitin/iThenticate.
            It will not be shared with any external AI service.
          </label>

          {error && <p className="error-text" role="alert">{error}</p>}
          <button className="btn btn-accent btn-lg" disabled={!ready || busy}>{busy ? 'Uploading…' : 'Submit manuscript'}</button>
        </section>

        <aside className="aside">
          <div className="aside-card">
            <h3>What happens next</h3>
            <ol className="pipeline">
              {['Ingestion: text and metadata', 'Scope check against the AMJ profile', 'Plagiarism screening', 'Subdomain classification', 'Reviewer matching'].map((s) => (
                <li key={s} className="stage stage-idle" style={{ opacity: 0.75 }}>
                  <span className="dot" /><span className="stage-name">{s}</span><span />
                </li>
              ))}
            </ol>
          </div>
        </aside>
      </form>
    </>
  )
}
