import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AdminNav } from '../../components/admin/AdminNav.tsx'
import { PageAlert } from '../../feedback/PageAlert.tsx'
import { useToast } from '../../feedback/ToastContext.tsx'
import {
  adminErrorMessage,
  deleteAdminUser,
  getAdminUsers,
  setAdminUser,
  type AdminUserRow,
} from '../../lib/api.ts'

export function AdminUsersPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const search = searchParams.get('search') ?? ''
  const toast = useToast()
  const [users, setUsers] = useState<AdminUserRow[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const load = () => {
    setLoading(true)
    void getAdminUsers(search)
      .then((r) => {
        setUsers(r.users)
        setLoadError(null)
      })
      .catch((e) => setLoadError(e instanceof Error ? e.message : 'Failed to load users'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [search])

  async function onSetAdmin(userId: string, isAdmin: boolean) {
    try {
      await setAdminUser(userId, isAdmin)
      toast.success(isAdmin ? 'Admin access granted.' : 'Admin access removed.')
      load()
    } catch (e) {
      toast.error(adminErrorMessage(e instanceof Error ? e.message : ''))
    }
  }

  async function onDelete(userId: string, email: string) {
    if (!window.confirm(`Delete ${email}? This permanently removes their account, profile, and timesheets.`)) {
      return
    }
    try {
      await deleteAdminUser(userId)
      toast.success('User deleted.')
      load()
    } catch (e) {
      toast.error(adminErrorMessage(e instanceof Error ? e.message : ''))
    }
  }

  return (
    <>
      <div className="page-header mb-4">
        <h1 className="page-title">Admin</h1>
        <p className="page-subtitle text-muted mb-0">Manage users and roles</p>
      </div>
      <AdminNav />
      {loadError ? <PageAlert variant="danger">{loadError}</PageAlert> : null}
      <form
        className="mb-3"
        onSubmit={(e) => {
          e.preventDefault()
          const fd = new FormData(e.currentTarget)
          const q = String(fd.get('search') ?? '')
          setSearchParams(q ? { search: q } : {})
        }}
      >
        <div className="input-group" style={{ maxWidth: '28rem' }}>
          <input
            type="search"
            name="search"
            value={search}
            onChange={(e) => setSearchParams(e.target.value ? { search: e.target.value } : {})}
            className="form-control"
            placeholder="Search email, name, employee #, station…"
          />
          <button type="submit" className="btn btn-primary">Search</button>
          {search ? (
            <button type="button" className="btn btn-outline-secondary" onClick={() => setSearchParams({})}>
              Clear
            </button>
          ) : null}
        </div>
      </form>
      {loading ? (
        <p className="text-muted">Loading…</p>
      ) : (
        <div className="form-card admin-table-card">
          <div className="table-responsive">
            <table className="table table-striped table-hover mb-0 align-middle">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Name</th>
                  <th>Employee #</th>
                  <th>Station</th>
                  <th>Type</th>
                  <th>Profile</th>
                  <th>Admin</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <Link to={`/admin/users/${user.id}`} className="text-decoration-none">{user.email}</Link>
                      {user.isCurrentUser ? <span className="text-muted"> (you)</span> : null}
                    </td>
                    <td>{user.name.trim() ? user.name : '—'}</td>
                    <td>{user.employeeNumber.trim() ? user.employeeNumber : '—'}</td>
                    <td>{user.unitStation.trim() ? user.unitStation : '—'}</td>
                    <td>
                      {user.casual ? 'Casual' : 'Permanent'}
                      <span className="text-muted"> · {user.isCountryEmployee ? 'Country' : 'Metro'}</span>
                    </td>
                    <td>
                      {user.profileIsComplete ? (
                        <span className="badge bg-success">Complete</span>
                      ) : (
                        <>
                          <span className="badge bg-warning text-dark">Incomplete</span>
                          {!user.hasSignature ? (
                            <span className="text-muted small d-block">No signature</span>
                          ) : null}
                        </>
                      )}
                    </td>
                    <td>{user.isAdmin ? 'Yes' : 'No'}</td>
                    <td className="text-end">
                      <div className="dropdown">
                        <button
                          className="btn btn-sm btn-outline-secondary dropdown-toggle"
                          type="button"
                          data-bs-toggle="dropdown"
                        >
                          Actions
                        </button>
                        <ul className="dropdown-menu dropdown-menu-end">
                          <li>
                            <Link className="dropdown-item" to={`/admin/users/${user.id}`}>View</Link>
                          </li>
                          <li>
                            <button
                              type="button"
                              className="dropdown-item"
                              disabled={user.isCurrentUser && user.isAdmin}
                              onClick={() => void onSetAdmin(user.id, !user.isAdmin)}
                            >
                              {user.isAdmin ? 'Remove admin' : 'Make admin'}
                            </button>
                          </li>
                          <li><hr className="dropdown-divider" /></li>
                          <li>
                            <button
                              type="button"
                              className="dropdown-item text-danger"
                              disabled={user.isCurrentUser}
                              onClick={() => void onDelete(user.id, user.email)}
                            >
                              Delete
                            </button>
                          </li>
                        </ul>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {users.length === 0 ? <p className="text-muted mb-0 p-3">No users match your search.</p> : null}
        </div>
      )}
      <p className="text-muted small mt-2">{users.length} user{users.length === 1 ? '' : 's'} shown</p>
    </>
  )
}
