import { type FormEvent, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext.tsx'
import { useToast } from '../feedback/ToastContext.tsx'
import { changePassword } from '../lib/api.ts'

export function ChangePasswordPage() {
  const { user } = useAuth()
  const toast = useToast()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [busy, setBusy] = useState(false)

  if (!user) return null

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    try {
      await changePassword(currentPassword, newPassword)
      toast.success('Password updated.')
      setCurrentPassword('')
      setNewPassword('')
    } catch {
      toast.error('Could not update password.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div className="page-header mb-4">
        <h1 className="page-title">Change password</h1>
        <p className="page-subtitle text-muted mb-0">Update the password for {user.email}</p>
      </div>

      <div className="row">
        <div className="col-lg-6 col-xl-5">
          <div className="form-card">
            <form onSubmit={(e) => void onSubmit(e)}>
              <div className="form-floating mb-3">
                <input
                  type="password"
                  className="form-control"
                  id="current-password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
                <label htmlFor="current-password">Current password</label>
              </div>
              <div className="form-floating mb-3">
                <input
                  type="password"
                  className="form-control"
                  id="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
                <label htmlFor="new-password">New password</label>
              </div>
              <button type="submit" className="btn btn-primary" disabled={busy}>
                {busy ? 'Updating…' : 'Update password'}
              </button>
            </form>
          </div>
        </div>
      </div>

      <p className="mt-3">
        <Link to="/profile">Back to profile</Link>
      </p>
    </>
  )
}
