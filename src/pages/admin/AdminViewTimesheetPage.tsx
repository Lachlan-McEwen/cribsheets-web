import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import type { TimeSheetDay } from '../../../lib/timesheet-export/legacy-types.ts'
import { AdminNav } from '../../components/admin/AdminNav.tsx'
import { PageAlert } from '../../feedback/PageAlert.tsx'
import { getAdminViewTimesheet } from '../../lib/api.ts'
import { parseIsoDate } from '../../lib/format.ts'

function formatTime(value: unknown): string {
  if (!value || typeof value !== 'string') return '—'
  const m = /^(\d{2}):(\d{2})/.exec(value)
  return m ? `${m[1]}:${m[2]}` : value
}

export function AdminViewTimesheetPage() {
  const { userId, fortnightEnding } = useParams()
  const [state, setState] = useState<{
    email: string
    name: string
    userId: string
    lastUpdated: number
    googleFileId: string | null
    days: TimeSheetDay[]
  } | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!userId || !fortnightEnding) return
    void getAdminViewTimesheet(userId, fortnightEnding)
      .then((r) => {
        const days = Array.isArray(r.document.days) ? (r.document.days as TimeSheetDay[]) : []
        setState({
          email: r.email,
          name: r.user.name,
          userId: r.user.id,
          lastUpdated: r.lastUpdated,
          googleFileId: r.googleFileId,
          days,
        })
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load timesheet'))
  }, [userId, fortnightEnding])

  if (error) return <PageAlert variant="danger">{error}</PageAlert>
  if (!state || !fortnightEnding) return <p className="text-muted">Loading…</p>

  return (
    <>
      <div className="page-header mb-4">
        <h1 className="page-title">Timesheet</h1>
        <p className="page-subtitle text-muted mb-0">
          {state.name.trim() ? state.name : state.email} · Fortnight ending{' '}
          {parseIsoDate(fortnightEnding).toLocaleDateString('en-AU', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
        </p>
      </div>
      <AdminNav />
      <div className="mb-3 d-flex flex-wrap gap-3 align-items-center">
        <Link to={`/admin/users/${state.userId}`} className="text-decoration-none">&larr; Back to user</Link>
        {state.googleFileId ? (
          <a
            className="btn btn-sm btn-outline-secondary"
            href={`https://drive.google.com/open?id=${state.googleFileId}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Open in Google Drive
          </a>
        ) : null}
        <span className="text-muted small ms-auto">
          Last updated {new Date(state.lastUpdated).toLocaleString('en-AU')}
        </span>
      </div>
      <div className="form-card admin-table-card">
        <div className="table-responsive">
          <table className="table table-striped mb-0 align-middle">
            <thead>
              <tr>
                <th>Date</th>
                <th>Complete</th>
                <th>Start</th>
                <th>End</th>
                <th>Shift</th>
                <th>Leave</th>
                <th>Rostered</th>
                <th>Overtime</th>
                <th>Kms</th>
              </tr>
            </thead>
            <tbody>
              {state.days.map((day) => (
                <tr key={day.date} className={day.done ? '' : 'text-muted'}>
                  <td>{parseIsoDate(day.date).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })}</td>
                  <td>{day.done ? '✓' : '—'}</td>
                  <td>{formatTime(day.start)}</td>
                  <td>{formatTime(day.end)}</td>
                  <td>{day.shiftCode && day.shiftCode !== 'None' ? day.shiftCode : '—'}</td>
                  <td>{day.leaveType && day.leaveType !== 'None' ? day.leaveType : '—'}</td>
                  <td>
                    {day.rosteredHours != null || day.rosteredMinutes != null
                      ? `${day.rosteredHours ?? 0}:${String(day.rosteredMinutes ?? 0).padStart(2, '0')}`
                      : '—'}
                  </td>
                  <td>
                    {day.overtimeHours != null || day.overtimeMinutes != null
                      ? `${day.overtimeHours ?? 0}:${String(day.overtimeMinutes ?? 0).padStart(2, '0')}`
                      : '—'}
                  </td>
                  <td>{day.kms ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
