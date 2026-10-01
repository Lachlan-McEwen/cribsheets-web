import { Link, useSearchParams } from 'react-router-dom'

export function CheckEmailPage() {
  const [params] = useSearchParams()
  const email = params.get('email')

  return (
    <>
      <h1>Check your email</h1>
      <p className="text-muted">
        {email
          ? `We sent a verification link to ${email}. Open it to activate your account, then log in.`
          : 'We sent a verification link to your email. Open it to activate your account, then log in.'}
      </p>
      <p>
        <Link to="/login">Back to log in</Link>
      </p>
    </>
  )
}
