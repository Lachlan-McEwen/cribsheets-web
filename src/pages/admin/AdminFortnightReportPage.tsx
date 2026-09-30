import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AdminNav } from '../../components/admin/AdminNav.tsx'
import { PageAlert } from '../../feedback/PageAlert.tsx'
import { getAdminFortnightReport, type AdminFortnightReport } from '../../lib/api.ts'
import { formatDateAu, parseIsoDate } from '../../lib/format.ts'
import { fortnightOptionLabel, isFortnightEndingForType } from '../../lib/fortnight.ts'

export function AdminFortnightReportPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [report, setReport] = useState<AdminFortnightReport | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fortnightEnding = searchParams.get('fortnightEnding') ?? undefined

  useEffect(() => {
    void getAdminFortnightReport(fortnightEnding)
      .then(setReport)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load report'))
  }, [fortnightEnding])

  if (error) {
    return (
      <>
        <AdminNav />
        <PageAlert variant="danger">{error}</PageAlert>
      </>
    )
  }

  if (!report) return <p className="text-muted">Loading…</p>

  const endingDate = parseIsoDate(report.fortnightEnding)
  const cycleLabel =
    isFortnightEndingForType(endingDate, true) && isFortnightEndingForType(endingDate, false)
      ? 'casual and permanent'
      : isFortnightEndingForType(endingDate, true)
        ? 'casual'
        : 'permanent'

  return (
    <>
      <div className="page-header mb-4">
        <h1 className="page-title">Fortnight report</h1>
        <p className="page-subtitle text-muted mb-0">Timesheet submission status for a pay period</p>
      </div>
      <AdminNav />
      <div className="row g-3 mb-4">
        {[
          ['Staff on this cycle', report.totalUsers],
          ['Incomplete profiles', report.incompleteProfiles],
          ['Timesheets started', report.withTimesheet],
          ['Uploaded to Drive', report.uploaded],
        ].map(([label, value]) => (
          <div key={label} className="col-sm-6 col-lg-3">
            <div className="form-card admin-stat-card">
              <div className="admin-stat-value">{value}</div>
              <div className="admin-stat-label text-muted">{label}</div>
            </div>
          </div>
        ))}
      </div>
      <form className="form-card p-3 mb-4">
        <div className="row g-3 align-items-end">
          <div className="col-md-6 col-lg-4">
            <label className="form-label" htmlFor="fortnightEnding">Fortnight ending</label>
            <select
              id="fortnightEnding"
              className="form-select"
              value={report.fortnightEnding}
              onChange={(e) => setSearchParams({ fortnightEnding: e.target.value })}
            >
              {report.fortnightOptions.map((iso) => (
                <option key={iso} value={iso}>{fortnightOptionLabel(parseIsoDate(iso))}</option>
              ))}
            </select>
          </div>
          <div className="col-md-6 col-lg-8">
            <span className="text-muted small">
              Quick jump:
              <Link to={`/admin/timesheets?fortnightEnding=${report.currentPermanentFortnight}`}>
                {' '}Current permanent ({formatDateAu(parseIsoDate(report.currentPermanentFortnight))})
              </Link>
              {' · '}
              <Link to={`/admin/timesheets?fortnightEnding=${report.currentCasualFortnight}`}>
                Current casual ({formatDateAu(parseIsoDate(report.currentCasualFortnight))})
              </Link>
            </span>
          </div>
        </div>
      </form>
      <div className="form-card admin-table-card">
        <div className="table-responsive">
          <table className="table table-striped table-hover mb-0 align-middle">
            <thead>
              <tr>
                <th>Name</th>
                <th>Employee #</th>
                <th>Station</th>
                <th>Type</th>
                <th>Profile</th>
                <th>Days done</th>
                <th>Last updated</th>
                <th>Uploaded</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {report.rows
                .filter((r) => r.appliesToSelectedFortnight)
                .map((row) => (
                  <tr key={row.userId}>
                    <td>
                      <Link to={`/admin/users/${row.userId}`} className="text-decoration-none">
                        {row.name.trim() ? row.name : row.email}
                      </Link>
                    </td>
                    <td>{row.employeeNumber.trim() ? row.employeeNumber : '—'}</td>
                    <td>{row.unitStation.trim() ? row.unitStation : '—'}</td>
                    <td>{row.casual ? 'Casual' : 'Permanent'}</td>
                    <td>
                      {row.profileIsComplete ? (
                        <span className="badge bg-success">Complete</span>
                      ) : (
                        <span className="badge bg-warning text-dark">Incomplete</span>
                      )}
                    </td>
                    <td>
                      {row.timesheet ? `${row.timesheet.daysComplete}/${row.timesheet.totalDays}` : '—'}
                    </td>
                    <td>
                      {row.timesheet
                        ? new Date(row.timesheet.lastUpdated).toLocaleString('en-AU')
                        : '—'}
                    </td>
                    <td>
                      {row.timesheet?.isUploaded ? (
                        <span className="badge bg-success">Yes</span>
                      ) : row.timesheet ? (
                        <span className="badge bg-secondary">No</span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="text-end text-nowrap">
                      {row.timesheet ? (
                        <>
                          <Link
                            className="btn btn-sm btn-outline-primary"
                            to={`/admin/users/${row.userId}/timesheets/${report.fortnightEnding}`}
                          >
                            View
                          </Link>
                          {row.timesheet.googleFileId ? (
                            <a
                              className="btn btn-sm btn-outline-secondary ms-1"
                              href={`https://drive.google.com/open?id=${row.timesheet.googleFileId}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              Drive
                            </a>
                          ) : null}
                        </>
                      ) : null}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
      <p className="text-muted small mt-2">
        Showing staff on the {cycleLabel} cycle for fortnight ending{' '}
        {endingDate.toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}.
      </p>
    </>
  )
}
