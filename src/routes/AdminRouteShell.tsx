import { Suspense } from 'react'
import { Outlet } from 'react-router-dom'

export function AdminRouteShell() {
  return (
    <Suspense fallback={<p className="text-muted">Loading…</p>}>
      <Outlet />
    </Suspense>
  )
}
