import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AdminNav } from '../../components/admin/AdminNav.tsx'
import { PageAlert } from '../../feedback/PageAlert.tsx'
import { adminUserSignatureUrl, getAdminUser, type ApiUser, type TimesheetSummary } from '../../lib/api.ts'
import { parseIsoDate } from '../../lib/format.ts'

export function AdminUserDetailPage() {
  const { userId } = useParams()
  const [user, setUser] = useState<ApiUser | null>(null)
  const [timesheets, setTimesheets] = useState<TimesheetSummary[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!userId) return
    void getAdminUser(userId)
      .then((r) => {
        setUser(r.user)
        setTimesheets(r.timesheets)
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load user'))
  }, [userId])

  if (error) return <PageAlert variant="danger">{error}</PageAlert>
  if (!user) return <p className="text-muted">Loading…</p>

  return (
    <>
      <div className="page-header mb-4">
        <h1 className="page-title">{user.name.trim() ? user.name : user.email}</h1>
        <p className="page-subtitle text-muted mb-0">{user.email}</p>
      </div>
      <AdminNav />
      <div className="mb-3">
        <Link to="/admin" className="text-decoration-none">&larr; Back to users</Link>
      </div>
      <div className="row g-4">
        <div className="col-lg-5">
          <div className="form-card p-4">
            <h2 className="h5 mb-3">Profile</h2>
            <dl className="row mb-0 admin-detail-list">
              <dt className="col-sm-5">Name</dt>
              <dd className="col-sm-7">{user.name.trim() ? user.name : '—'}</dd>
              <dt className="col-sm-5">Employee number</dt>
              <dd className="col-sm-7">{user.employeeNumber.trim() ? user.employeeNumber : '—'}</dd>
              <dt className="col-sm-5">Unit / station</dt>
              <dd className="col-sm-7">{user.unitStation.trim() ? user.unitStation : '—'}</dd>
              <dt className="col-sm-5">Employment type</dt>
              <dd className="col-sm-7">{user.casual ? 'Casual' : 'Permanent'}</dd>
              <dt className="col-sm-5">Employment location</dt>
              <dd className="col-sm-7">{user.isCountryEmployee ? 'Country' : 'Metro'}</dd>
              <dt className="col-sm-5">Default shift</dt>
              <dd className="col-sm-7">
                {user.defaultShiftCode !== 'None' ? (
                  <>
                    {user.defaultShiftCode}
                    {user.defaultShiftHours != null ? (
                      <span className="text-muted"> ({user.defaultShiftHours} h)</span>
                    ) : null}
                  </>
                ) : (
                  <span className="text-muted">—</span>
                )}
              </dd>
              <dt className="col-sm-5">Profile status</dt>
              <dd className="col-sm-7">
                {user.profileIsComplete ? (
                  <span className="badge bg-success">Complete</span>
                ) : (
                  <span className="badge bg-warning text-dark">Incomplete</span>
                )}
              </dd>
              <dt className="col-sm-5">Signature</dt>
              <dd className="col-sm-7">{user.hasSignature ? 'On file' : 'Missing'}</dd>
              <dt className="col-sm-5">Admin</dt>
              <dd className="col-sm-7">{user.isAdmin ? 'Yes' : 'No'}</dd>
            </dl>
            {user.hasSignature ? (
              <div className="mt-3 pt-3 border-top">
                <div className="text-muted small mb-2">Signature</div>
                <img src={adminUserSignatureUrl(user.id)} alt="Signature" className="admin-signature-preview" />
              </div>
            ) : null}
          </div>
        </div>
        <div className="col-lg-7">
          <div className="form-card admin-table-card">
            <div className="p-3 border-bottom">
              <h2 className="h5 mb-0">Timesheet history</h2>
            </div>
            {timesheets.length === 0 ? (
              <p className="text-muted mb-0 p-3">No timesheets yet.</p>
            ) : (
              <div className="table-responsive">
                <table className="table table-striped table-hover mb-0 align-middle">
                  <thead>
                    <tr>
                      <th>Fortnight ending</th>
                      <th>Days done</th>
                      <th>Last updated</th>
                      <th>Uploaded</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {timesheets.map((ts) => (
                      <tr key={ts.fortnightEnding}>
                        <td>{parseIsoDate(ts.fortnightEnding).toLocaleDateString('en-AU')}</td>
                        <td>{`${ts.daysComplete}/${ts.totalDays}`}</td>
                        <td>{new Date(ts.lastUpdated).toLocaleString('en-AU')}</td>
                        <td>{ts.isUploaded ? 'Yes' : 'No'}</td>
                        <td className="text-end">
                          <Link
                            className="btn btn-sm btn-outline-primary"
                            to={`/admin/users/${user.id}/timesheets/${ts.fortnightEnding}`}
                          >
                            View
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
