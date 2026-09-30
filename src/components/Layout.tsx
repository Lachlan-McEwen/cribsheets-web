import { Link, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext.tsx'
import { getRegistrationOpen } from '../lib/api.ts'
import { useEffect, useState } from 'react'

export function Layout() {
  const { user, logout, loading } = useAuth()
  const navigate = useNavigate()
  const [registrationOpen, setRegistrationOpen] = useState(false)

  useEffect(() => {
    document.documentElement.dataset.theme = 'default'
  }, [])

  useEffect(() => {
    void getRegistrationOpen()
      .then((r) => setRegistrationOpen(r.open))
      .catch(() => setRegistrationOpen(false))
  }, [])

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
                      <Link className="nav-link" to="/profile">
                        Profile
                      </Link>
                    </li>
                    <li className="nav-item">
                      <a className="nav-link" href="mailto:contact@cribsheets.com.au">
                        Help
                      </a>
                    </li>
                    {user.isAdmin ? (
                      <li className="nav-item">
                        <Link className="nav-link" to="/admin">
                          Admin
                        </Link>
                      </li>
                    ) : null}
                  </>
                ) : null}
              </ul>
              <ul className="navbar-nav">
                {loading ? null : user ? (
                  <li className="nav-item">
                    <button
                      type="button"
                      className="nav-link btn btn-link"
                      onClick={() => void logout().then(() => navigate('/login'))}
                    >
                      Logout
                    </button>
                  </li>
                ) : (
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
          <span>&copy; 2026 Cribsheets</span>
          <Link to="/privacy">Privacy</Link>
        </div>
      </footer>
    </>
  )
}
