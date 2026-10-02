import { type FormEvent, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useToast } from '../feedback/ToastContext.tsx'
import { resetPassword } from '../lib/api'

export function ResetPasswordPage() {
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const navigate = useNavigate()
  const toast = useToast()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!token) {
      toast.error('Missing reset token.')
      return
    }
    if (password !== confirmPassword) {
      toast.error('Passwords do not match.')
      return
    }
    setBusy(true)
    try {
      await resetPassword(token, password)
      toast.success('Password updated. You can log in now.')
      navigate('/login', { replace: true })
    } catch {
      toast.error('Reset link invalid or expired.')
    } finally {
      setBusy(false)
    }
  }

  if (!token) {
    return (
      <>
        <h1>Reset password</h1>
        <p className="text-muted">Missing or invalid reset link.</p>
        <p><Link to="/forgot-password">Request a new link</Link></p>
      </>
    )
  }

  return (
    <>
      <h1>Reset password</h1>
      <div className="row">
        <div className="col-md-4">
          <form onSubmit={(e) => void onSubmit(e)}>
            <div className="form-floating mb-3">
              <input
                type="password"
                className="form-control"
                id="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={8}
                autoComplete="new-password"
                required
              />
              <label htmlFor="new-password">New password</label>
            </div>
            <div className="form-floating mb-3">
              <input
                type="password"
                className="form-control"
                id="confirm-new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                minLength={8}
                autoComplete="new-password"
                required
              />
              <label htmlFor="confirm-new-password">Confirm new password</label>
            </div>
            <button type="submit" className="w-100 btn btn-primary" disabled={busy}>
              {busy ? 'Saving…' : 'Set new password'}
            </button>
          </form>
        </div>
      </div>
    </>
  )
}
