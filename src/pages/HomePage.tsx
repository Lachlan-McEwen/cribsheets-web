import { useAuth } from '../auth/AuthContext'

export function HomePage() {
  const { user } = useAuth()

  return (
    <section>
      <h1>Timesheet</h1>
      <p className="muted">
        Signed in as {user?.name} ({user?.employeeNumber || 'no employee #'} · {user?.unitStation || 'no unit'}).
      </p>
      <p>Timesheet UI and Excel generate/download will go here.</p>
    </section>
  )
}
