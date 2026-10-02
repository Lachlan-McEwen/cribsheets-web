import { Fragment, useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AdminNav } from '../../components/admin/AdminNav.tsx'
import { PageAlert } from '../../feedback/PageAlert.tsx'
import { useToast } from '../../feedback/ToastContext.tsx'
import {
  getAdminSupportRequests,
  setAdminSupportRequestStatus,
  type SupportRequestRow,
} from '../../lib/api.ts'

function formatUtc(ms: number): string {
  return new Date(ms).toISOString().replace('T', ' ').slice(0, 19)
}

export function AdminSupportPage() {
  const toast = useToast()
  const [requests, setRequests] = useState<SupportRequestRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    void getAdminSupportRequests()
      .then((r) => setRequests(r.requests))
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load support requests'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function toggleStatus(row: SupportRequestRow) {
    const next = row.status === 'open' ? 'closed' : 'open'
    try {
      await setAdminSupportRequestStatus(row.id, next)
      setRequests((prev) =>
        prev.map((r) =>
          r.id === row.id
            ? { ...r, status: next, closedUtc: next === 'closed' ? Date.now() : null }
            : r,
        ),
      )
      toast.success(next === 'closed' ? 'Marked closed.' : 'Reopened.')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Update failed.')
    }
  }

  if (error) return <PageAlert variant="danger">{error}</PageAlert>

  const openCount = requests.filter((r) => r.status === 'open').length

  return (
    <>
      <div className="page-header mb-4 d-flex flex-wrap justify-content-between align-items-start gap-2">
        <div>
          <h1 className="page-title">Support</h1>
          <p className="text-muted mb-0">
            {loading ? 'Loading…' : `${openCount} open · ${requests.length} total`}
          </p>
        </div>
        <button type="button" className="btn btn-outline-secondary btn-sm" onClick={load} disabled={loading}>
          Refresh
        </button>
      </div>
      <AdminNav />
      {loading && requests.length === 0 ? (
        <p className="text-muted">Loading support requests…</p>
      ) : requests.length === 0 ? (
        <p className="text-muted">No support requests yet.</p>
      ) : (
        <div className="table-responsive">
          <table className="table table-sm align-middle">
            <thead>
              <tr>
                <th>When (UTC)</th>
                <th>User</th>
                <th>Subject</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {requests.map((row) => (
                <Fragment key={row.id}>
                  <tr>
                    <td className="text-nowrap">{formatUtc(row.createdUtc)}</td>
                    <td>
                      <div>{row.userName || row.userEmail}</div>
                      <div className="small text-muted">
                        <Link to={`/admin/users/${row.userId}`}>{row.userEmail}</Link>
                        {row.employeeNumber ? ` · #${row.employeeNumber}` : null}
                      </div>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-link btn-sm p-0 text-start"
                        onClick={() => setExpandedId(expandedId === row.id ? null : row.id)}
                      >
                        {row.subject}
                      </button>
                    </td>
                    <td>
                      <span className={`badge ${row.status === 'open' ? 'bg-warning text-dark' : 'bg-secondary'}`}>
                        {row.status}
                      </span>
                    </td>
                    <td className="text-end">
                      <button
                        type="button"
                        className="btn btn-outline-secondary btn-sm"
                        onClick={() => void toggleStatus(row)}
                      >
                        {row.status === 'open' ? 'Close' : 'Reopen'}
                      </button>
                    </td>
                  </tr>
                  {expandedId === row.id ? (
                    <tr>
                      <td colSpan={5}>
                        <pre className="mb-0 small bg-light p-3 rounded" style={{ whiteSpace: 'pre-wrap' }}>
                          {row.message}
                        </pre>
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
