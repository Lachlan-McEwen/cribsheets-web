import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

export function VerifyEmailPage() {
  const [params] = useSearchParams()
  const token = params.get('token')
  const [state, setState] = useState<'loading' | 'ok' | 'error'>('loading')

  useEffect(() => {
    if (!token) {
      setState('error')
      return
    }
    void fetch(`/api/auth/verify-email?token=${encodeURIComponent(token)}`, { credentials: 'include' })
      .then((res) => setState(res.ok ? 'ok' : 'error'))
      .catch(() => setState('error'))
  }, [token])

  if (state === 'loading') return <p className="text-muted">Verifying…</p>
  if (state === 'ok') {
    return (
      <>
        <h1>Email verified</h1>
        <p>You can now log in.</p>
        <p><Link to="/login">Log in</Link></p>
      </>
    )
  }
  return (
    <>
      <h1>Verification failed</h1>
      <p className="text-muted">The link may have expired. Try registering again or request a new link from support.</p>
      <p><Link to="/login">Log in</Link></p>
    </>
  )
}
