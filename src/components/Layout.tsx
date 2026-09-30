import { Link, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

export function Layout() {
  const { user, logout } = useAuth()

  return (
    <div className="app-shell">
      <header className="app-header">
        <Link to="/" className="brand">
          CribSheets
        </Link>
        <nav>
          {user ? (
            <>
              <span className="nav-user">{user.name || user.email}</span>
              <button type="button" className="link-button" onClick={() => void logout()}>
                Log out
              </button>
            </>
          ) : (
            <>
              <Link to="/login">Log in</Link>
            </>
          )}
        </nav>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  )
}
