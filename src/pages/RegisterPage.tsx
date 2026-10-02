import { type FormEvent, useEffect, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { useToast } from '../feedback/ToastContext.tsx'
import { getRegistrationOpen } from '../lib/api'

export function RegisterPage() {
  const { user, register } = useAuth()
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  const [open, setOpen] = useState<boolean | null>(null)

  useEffect(() => {
    void getRegistrationOpen()
      .then((r) => setOpen(r.open))
      .catch(() => setOpen(false))
  }, [])

  if (user) return <Navigate to="/" replace />

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (password !== confirmPassword) {
      toast.error('Passwords do not match.')
      return
    }
    setBusy(true)
    try {
      await register(name, email, password)
      navigate(`/check-email?email=${encodeURIComponent(email)}`, { replace: true })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Registration failed.')
    } finally {
      setBusy(false)
    }
  }

  if (open === null) return <p className="text-muted">Loading…</p>

  if (!open) {
    return (
      <>
        <h1>Register</h1>
        <p className="text-muted">New registrations are not open at the moment.</p>
        <p>
          <Link to="/login">Back to log in</Link>
        </p>
      </>
    )
  }

  return (
    <>
      <h1>Register</h1>
      <div className="row">
        <div className="col-md-4">
          <form onSubmit={(e) => void onSubmit(e)}>
            <hr />
            <div className="form-floating mb-3">
              <input
                className="form-control"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Name"
                required
              />
              <label htmlFor="name">Name</label>
            </div>
            <div className="form-floating mb-3">
              <input
                type="email"
                className="form-control"
                id="reg-email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                required
              />
              <label htmlFor="reg-email">Email</label>
            </div>
            <div className="form-floating mb-3">
              <input
                type="password"
                className="form-control"
                id="reg-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={8}
                placeholder="password"
                autoComplete="new-password"
                required
              />
              <label htmlFor="reg-password">Password</label>
            </div>
            <div className="form-floating mb-3">
              <input
                type="password"
                className="form-control"
                id="reg-confirm-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                minLength={8}
                placeholder="password"
                autoComplete="new-password"
                required
              />
              <label htmlFor="reg-confirm-password">Confirm password</label>
            </div>
            <button type="submit" className="w-100 btn btn-lg btn-primary" disabled={busy}>
              {busy ? 'Creating account…' : 'Register'}
            </button>
          </form>
          <p className="mt-3">
            Already have an account? <Link to="/login">Log in</Link>
          </p>
        </div>
      </div>
    </>
  )
}
