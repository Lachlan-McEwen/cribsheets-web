import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

const verifyEmailPromises = new Map<string, Promise<boolean>>()

function verifyEmailCacheKey(token: string): string {
  return `cribsheets:verify-email:${token}`
}

function verifyEmailWithToken(token: string): Promise<boolean> {
  const cacheKey = verifyEmailCacheKey(token)
  if (sessionStorage.getItem(cacheKey) === 'ok') return Promise.resolve(true)

  const inFlight = verifyEmailPromises.get(token)
  if (inFlight) return inFlight

  const promise = fetch(`/api/auth/verify-email?token=${encodeURIComponent(token)}`, {
    credentials: 'include',
  })
    .then((res) => {
      const ok = res.ok
      if (ok) sessionStorage.setItem(cacheKey, 'ok')
      return ok
    })
    .catch(() => false)
    .finally(() => {
      verifyEmailPromises.delete(token)
    })

  verifyEmailPromises.set(token, promise)
  return promise
}

export function VerifyEmailPage() {
  const [params] = useSearchParams()
  const token = params.get('token')
  const [state, setState] = useState<'loading' | 'ok' | 'error'>('loading')

  useEffect(() => {
    if (!token) {
      setState('error')
      return
    }
    let active = true
    void verifyEmailWithToken(token).then((ok) => {
      if (active) setState(ok ? 'ok' : 'error')
    })
    return () => {
      active = false
    }
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
