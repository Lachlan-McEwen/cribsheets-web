import { type FormEvent, useEffect, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { useToast } from '../feedback/ToastContext.tsx'
import { getRegistrationOpen, resendVerification } from '../lib/api'

export function LoginPage() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  const [registrationOpen, setRegistrationOpen] = useState(false)
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null)

  useEffect(() => {
    void getRegistrationOpen()
      .then((r) => setRegistrationOpen(r.open))
      .catch(() => setRegistrationOpen(false))
  }, [])

  if (user) {
    return <Navigate to={from} replace />
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    try {
      setUnverifiedEmail(null)
      await login(email, password)
      void rememberMe
      navigate(from, { replace: true })
    } catch (err) {
      if (err instanceof Error && err.message === 'email_not_verified') {
        setUnverifiedEmail(email)
        toast.error('Verify your email before logging in.')
      } else {
        toast.error('Invalid email or password.')
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <h1>Log in</h1>
      <div className="row">
        <div className="col-md-4">
          <section>
            <form id="account" onSubmit={(e) => void onSubmit(e)}>
              <hr />
              <div className="form-floating mb-3">
                <input
                  type="email"
                  className="form-control"
                  autoComplete="username"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  id="email"
                />
                <label htmlFor="email">Email</label>
              </div>
              <div className="form-floating mb-3">
                <input
                  type="password"
                  className="form-control"
                  autoComplete="current-password"
                  placeholder="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  id="password"
                />
                <label htmlFor="password">Password</label>
              </div>
              <div className="checkbox mb-3">
                <label className="form-label">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />{' '}
                  Remember me?
                </label>
              </div>
              <div>
                <button id="login-submit" type="submit" className="w-100 btn btn-lg btn-primary" disabled={busy}>
                  {busy ? 'Signing in…' : 'Log in'}
                </button>
              </div>
              {registrationOpen ? (
                <div className="mt-3">
                  <Link id="login-register" to="/register" className="w-100 btn btn-lg btn-outline-primary">
                    Register as a new user
                  </Link>
                </div>
              ) : null}
              <div className="mt-3">
                <p>
                  <Link to="/forgot-password">Forgot password?</Link>
                </p>
                {unverifiedEmail ? (
                  <p>
                    <button
                      type="button"
                      className="btn btn-link p-0"
                      onClick={() => void resendVerification(unverifiedEmail).then(() => toast.success('Verification email sent.'))}
                    >
                      Resend verification email
                    </button>
                  </p>
                ) : null}
              </div>
            </form>
          </section>
        </div>
      </div>
    </>
  )
}
