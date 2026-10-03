import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { isAuthRoute } from '../routes/authPaths.ts'
import { useAuth } from '../auth/AuthContext.tsx'
import { getRegistrationOpen } from '../lib/api.ts'
import { useEffect, useState } from 'react'

export function Layout() {
  const { user, logout, loading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const hideAuthNavLinks = isAuthRoute(location.pathname)
  const [registrationOpen, setRegistrationOpen] = useState(false)

  useEffect(() => {
    document.documentElement.dataset.theme = 'default'
  }, [])

  useEffect(() => {
    void getRegistrationOpen()
      .then((r) => setRegistrationOpen(r.open))
      .catch(() => setRegistrationOpen(false))
  }, [])

  const handleLogout = () => void logout().then(() => navigate('/login'))

  return (
    <>
      <header>
        <nav className="navbar navbar-expand-sm navbar-toggleable-sm navbar-dark site-navbar mb-0">
          <div className="container">
            <Link className="navbar-brand fw-semibold" to="/">
              Cribsheets
            </Link>
            <button
              className="navbar-toggler"
              type="button"
              data-bs-toggle="collapse"
              data-bs-target="#navbarSupportedContent"
              aria-controls="navbarSupportedContent"
              aria-expanded="false"
              aria-label="Toggle navigation"
            >
              <span className="navbar-toggler-icon" />
            </button>
            <div className="navbar-collapse collapse d-sm-inline-flex justify-content-between" id="navbarSupportedContent">
              <ul className="navbar-nav flex-grow-1">
                {user ? (
                  <>
                    <li className="nav-item">
                      <Link className="nav-link" to="/">
                        Timesheets
                      </Link>
                    </li>
                    <li className="nav-item">
                      <Link className="nav-link" to="/help">
                        Help
                      </Link>
                    </li>
                    {user.isAdmin ? (
                      <li className="nav-item">
                        <Link className="nav-link" to="/admin">
                          Admin
                        </Link>
                      </li>
                    ) : null}
                    <li className="nav-item d-sm-none">
                      <Link className="nav-link" to="/profile">
                        Profile
                      </Link>
                    </li>
                    <li className="nav-item d-sm-none">
                      <Link className="nav-link" to="/change-password">
                        Change password
                      </Link>
                    </li>
                    <li className="nav-item d-sm-none">
                      <button type="button" className="nav-link site-navbar-logout" onClick={handleLogout}>
                        Logout
                      </button>
                    </li>
                  </>
                ) : null}
              </ul>
              <ul className="navbar-nav">
                {loading ? null : user ? (
                  <li className="nav-item dropdown d-none d-sm-block">
                    <button
                      type="button"
                      className="nav-link profile-menu-toggle d-flex align-items-center justify-content-center"
                      id="userMenu"
                      data-bs-toggle="dropdown"
                      aria-expanded="false"
                      aria-label="Account menu"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="22"
                        height="22"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden
                      >
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                    </button>
                    <ul className="dropdown-menu dropdown-menu-end shadow" aria-labelledby="userMenu">
                      <li>
                        <Link className="dropdown-item" to="/profile">
                          Profile
                        </Link>
                      </li>
                      <li>
                        <Link className="dropdown-item" to="/change-password">
                          Change password
                        </Link>
                      </li>
                      <li>
                        <hr className="dropdown-divider" />
                      </li>
                      <li>
                        <button
                          type="button"
                          className="dropdown-item"
                          onClick={handleLogout}
                        >
                          Logout
                        </button>
                      </li>
                    </ul>
                  </li>
                ) : hideAuthNavLinks ? null : (
                  <>
                    {registrationOpen ? (
                      <li className="nav-item">
                        <Link className="nav-link" to="/register">
                          Register
                        </Link>
                      </li>
                    ) : null}
                    <li className="nav-item">
                      <Link className="nav-link" to="/login">
                        Login
                      </Link>
                    </li>
                  </>
                )}
              </ul>
            </div>
          </div>
        </nav>
      </header>
      <div className="container page-container">
        <main role="main" className="pb-4">
          <Outlet />
        </main>
      </div>
      <footer className="site-footer">
        <div className="container d-flex justify-content-between align-items-center">
          <span>
            &copy; 2026{' '}
            <a href="https://cribsheets.com.au" rel="noopener noreferrer">Cribsheets.com.au</a>
          </span>
          <Link to="/privacy">Privacy</Link>
        </div>
      </footer>
    </>
  )
}
