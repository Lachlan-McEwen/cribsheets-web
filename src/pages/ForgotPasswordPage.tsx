import { type FormEvent, useState } from 'react'
import { Link } from 'react-router-dom'
import { useToast } from '../feedback/ToastContext.tsx'
import { forgotPassword } from '../lib/api'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const toast = useToast()

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    try {
      await forgotPassword(email)
      setSent(true)
    } catch {
      toast.error('Something went wrong. Try again later.')
    } finally {
      setBusy(false)
    }
  }

  if (sent) {
    return (
      <>
        <h1>Check your email</h1>
        <p className="text-muted">
          If an account exists for that address, we sent password reset instructions.
        </p>
        <p><Link to="/login">Back to log in</Link></p>
      </>
    )
  }

  return (
    <>
      <h1>Forgot password</h1>
      <div className="row">
        <div className="col-md-4">
          <form onSubmit={(e) => void onSubmit(e)}>
            <div className="form-floating mb-3">
              <input
                type="email"
                className="form-control"
                id="forgot-email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <label htmlFor="forgot-email">Email</label>
            </div>
            <button type="submit" className="w-100 btn btn-primary" disabled={busy}>
              {busy ? 'Sending…' : 'Send reset link'}
            </button>
          </form>
          <p className="mt-3"><Link to="/login">Back to log in</Link></p>
        </div>
      </div>
    </>
  )
}
