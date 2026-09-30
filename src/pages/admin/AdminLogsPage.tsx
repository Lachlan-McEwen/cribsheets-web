import { useEffect, useState } from 'react'
import { AdminNav } from '../../components/admin/AdminNav.tsx'
import { PageAlert } from '../../feedback/PageAlert.tsx'
import { getAdminLogs, type AppErrorLogEntry, type SchemaMigrationResult } from '../../lib/api.ts'

function migrationBadgeClass(status: string): string {
  if (status === 'Applied' || status === 'Ready' || status === 'AlreadyApplied') return 'bg-success'
  if (status === 'Missing') return 'bg-warning text-dark'
  return 'bg-danger'
}

export function AdminLogsPage() {
  const [loggingAvailable, setLoggingAvailable] = useState(false)
  const [migrationRunUtc, setMigrationRunUtc] = useState<number | null>(null)
  const [migrationResults, setMigrationResults] = useState<SchemaMigrationResult[]>([])
  const [entries, setEntries] = useState<AppErrorLogEntry[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void getAdminLogs()
      .then((r) => {
        setLoggingAvailable(r.loggingAvailable)
        setMigrationRunUtc(r.migrationRunUtc)
        setMigrationResults(r.migrationResults)
        setEntries(r.entries)
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load logs'))
  }, [])

  const hasMigrationProblems = migrationResults.some((r) => r.status === 'Failed' || r.status === 'Missing')

  if (error) return <PageAlert variant="danger">{error}</PageAlert>

  return (
    <>
      <div className="page-header mb-4">
        <h1 className="page-title">Error log</h1>
        <p className="page-subtitle text-muted mb-0">Startup migrations and recent application errors</p>
      </div>
      <AdminNav />
      {migrationResults.length > 0 ? (
        <div className="form-card admin-table-card mb-4">
          <div className="d-flex justify-content-between align-items-center px-3 pt-3 pb-2">
            <h2 className="h5 mb-0">Startup migrations</h2>
            {migrationRunUtc ? (
              <span className="text-muted small">
                Last run {new Date(migrationRunUtc).toISOString().replace('T', ' ').slice(0, 19)} UTC
              </span>
            ) : null}
          </div>
          {hasMigrationProblems ? (
            <PageAlert variant="danger" className="mx-3">
              One or more migrations failed or required schema objects are still missing.
            </PageAlert>
          ) : null}
          <div className="table-responsive">
            <table className="table table-striped table-hover mb-0 align-middle">
              <thead>
                <tr>
                  <th>Migration</th>
                  <th>Status</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {migrationResults.map((result) => (
                  <tr key={result.migrationId}>
                    <td className="small font-monospace">{result.migrationId}</td>
                    <td><span className={`badge ${migrationBadgeClass(result.status)}`}>{result.status}</span></td>
                    <td>
                      <div>{result.message}</div>
                      {result.exception ? (
                        <details className="mt-2">
                          <summary className="small">Exception details</summary>
                          <pre className="small mb-0 mt-2 p-2 bg-light border rounded" style={{ whiteSpace: 'pre-wrap' }}>
                            {result.exception}
                          </pre>
                        </details>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
      <h2 className="h5 mb-3">Application errors</h2>
      {!loggingAvailable ? (
        <PageAlert variant="warning">Application error logging is not available.</PageAlert>
      ) : entries.length === 0 ? (
        <p className="text-muted">No recent errors logged.</p>
      ) : (
        <div className="form-card admin-table-card">
          <div className="table-responsive">
            <table className="table table-striped table-hover mb-0 align-middle small">
              <thead>
                <tr>
                  <th>When (UTC)</th>
                  <th>Level</th>
                  <th>Category</th>
                  <th>Message</th>
                  <th>Path</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id}>
                    <td>{new Date(entry.createdUtc).toISOString().replace('T', ' ').slice(0, 19)}</td>
                    <td>{entry.level}</td>
                    <td>{entry.category}</td>
                    <td>
                      <div>{entry.message}</div>
                      {entry.exception ? (
                        <details className="mt-1">
                          <summary>Stack</summary>
                          <pre className="mb-0 mt-1 p-2 bg-light border rounded" style={{ whiteSpace: 'pre-wrap' }}>
                            {entry.exception}
                          </pre>
                        </details>
                      ) : null}
                    </td>
                    <td>{entry.requestPath ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  )
}
