import { type FormEvent, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext.tsx'
import { useToast } from '../feedback/ToastContext.tsx'
import { submitSupportRequest } from '../lib/api.ts'

const TOPICS = [
  'Timesheet or export',
  'Account or login',
  'Profile or signature',
  'Other',
] as const

export function SupportPage() {
  const { user } = useAuth()
  const toast = useToast()
  const [topic, setTopic] = useState<string>(TOPICS[0])
  const [subjectDetail, setSubjectDetail] = useState('')
  const [message, setMessage] = useState('')
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)

  if (!user) return null

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    const detail = subjectDetail.trim()
    const subject = detail ? `${topic}: ${detail}` : topic
    setBusy(true)
    try {
      await submitSupportRequest({ subject, message: message.trim() })
      setSent(true)
    } catch (err) {
      const code = err instanceof Error ? err.message : ''
      if (code.includes('invalid_subject')) {
        toast.error('Please enter a short summary (3–200 characters).')
      } else if (code.includes('invalid_message')) {
        toast.error('Please describe the issue in at least 10 characters.')
      } else {
        toast.error('Could not send your request. Try again later.')
      }
    } finally {
      setBusy(false)
    }
  }

  if (sent) {
    return (
      <>
        <div className="page-header mb-4">
          <h1 className="page-title">Help</h1>
        </div>
        <p className="text-muted">
          Thanks — we received your message and will get back to you at <strong>{user.email}</strong>.
        </p>
        <p><Link to="/">Back to timesheets</Link></p>
      </>
    )
  }

  return (
    <>
      <div className="page-header mb-4">
        <h1 className="page-title">Help</h1>
        <p className="text-muted mb-0">
          Send a message to the Cribsheets team. We will email you at {user.email}.
        </p>
      </div>
      <div className="row">
        <div className="col-lg-6">
          <form onSubmit={(e) => void onSubmit(e)}>
            <div className="mb-3">
              <label className="form-label" htmlFor="support-topic">Topic</label>
              <select
                id="support-topic"
                className="form-select"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
              >
                {TOPICS.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div className="mb-3">
              <label className="form-label" htmlFor="support-subject">Short summary (optional)</label>
              <input
                id="support-subject"
                type="text"
                className="form-control"
                maxLength={160}
                value={subjectDetail}
                onChange={(e) => setSubjectDetail(e.target.value)}
                placeholder="e.g. export missing Friday shift"
              />
            </div>
            <div className="mb-3">
              <label className="form-label" htmlFor="support-message">Message</label>
              <textarea
                id="support-message"
                className="form-control"
                rows={6}
                required
                minLength={10}
                maxLength={5000}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="What happened? Include fortnight dates or steps if relevant."
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? 'Sending…' : 'Send message'}
            </button>
          </form>
        </div>
      </div>
    </>
  )
}
