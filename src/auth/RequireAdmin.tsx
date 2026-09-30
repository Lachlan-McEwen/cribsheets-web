import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from './AuthContext'

export function RequireAdmin() {
  const { user, loading } = useAuth()

  if (loading) return <p className="text-muted">Loading…</p>
  if (!user) return <Navigate to="/login" replace />
  if (!user.isAdmin) return <Navigate to="/" replace />

  return <Outlet />
}
