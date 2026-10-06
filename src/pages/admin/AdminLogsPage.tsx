import { useCallback, useEffect, useState } from 'react'
import { AdminNav } from '../../components/admin/AdminNav.tsx'
import { PageAlert } from '../../feedback/PageAlert.tsx'
import {
  adminErrorMessage,
  getAdminLogs,
  resendAdminEmailLog,
  type AppErrorLogEntry,
  type EmailLogEntry,
  type AdminEmailConfig,
  type SchemaMigrationResult,
} from '../../lib/api.ts'
import { useToast } from '../../feedback/ToastContext.tsx'

function migrationBadgeClass(status: string): string {
  if (status === 'Applied' || status === 'Ready' || status === 'AlreadyApplied') return 'bg-success'
  if (status === 'Missing') return 'bg-warning text-dark'
  return 'bg-danger'
}

function emailStatusBadgeClass(status: EmailLogEntry['status']): string {
  if (status === 'sent') return 'bg-success'
  if (status === 'logged_only') return 'bg-secondary'
  return 'bg-danger'
}

function formatUtc(ms: number): string {
  return new Date(ms).toISOString().replace('T', ' ').slice(0, 19)
}

function kindLabel(kind: string): string {
  switch (kind) {
    case 'verify_email':
      return 'Verify email'
    case 'password_reset':
      return 'Password reset'
    case 'admin_test':
      return 'Admin test'
    case 'support_alert':
      return 'Support alert'
    default:
      return kind
  }
}

export function AdminLogsPage() {
  const toast = useToast()
  const [loggingAvailable, setLoggingAvailable] = useState(false)
  const [migrationRunUtc, setMigrationRunUtc] = useState<number | null>(null)
  const [migrationResults, setMigrationResults] = useState<SchemaMigrationResult[]>([])
  const [entries, setEntries] = useState<AppErrorLogEntry[]>([])
  const [emailConfig, setEmailConfig] = useState<AdminEmailConfig | null>(null)
  const [emailLogs, setEmailLogs] = useState<EmailLogEntry[]>([])
  const [e2eHooks, setE2eHooks] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [resendingLogId, setResendingLogId] = useState<number | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    void getAdminLogs()
      .then((r) => {
        setLoggingAvailable(r.loggingAvailable)
        setMigrationRunUtc(r.migrationRunUtc)
        setMigrationResults(r.migrationResults)
        setEntries(r.entries)
        setEmailConfig(r.email)
        setEmailLogs(r.emailLogs)
        setE2eHooks(r.e2eTestHooksEnabled)
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load logs'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function onResendEmail(logId: number) {
    setResendingLogId(logId)
    try {
      await resendAdminEmailLog(logId)
      toast.success('Email queued again.')
      load()
    } catch (e) {
      toast.error(adminErrorMessage(e instanceof Error ? e.message : 'send_failed'))
    } finally {
      setResendingLogId(null)
    }
  }

  const hasMigrationProblems = migrationResults.some((r) => r.status === 'Failed' || r.status === 'Missing')

  if (error) return <PageAlert variant="danger">{error}</PageAlert>

  return (
    <>
      <div className="page-header mb-4 d-flex flex-wrap justify-content-between align-items-start gap-2">
        <div>
          <h1 className="page-title">Logs</h1>
          <p className="page-subtitle text-muted mb-0">Email delivery, migrations, and application errors</p>
        </div>
        <button type="button" className="btn btn-outline-secondary btn-sm" onClick={load} disabled={loading}>
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>
      <AdminNav />

      {emailConfig ? (
        <div className="form-card admin-table-card mb-4">
          <h2 className="h5 px-3 pt-3">Email</h2>
          <div className="px-3 pb-3">
            <dl className="row small mb-0">
              <dt className="col-sm-3">Send mode</dt>
              <dd className="col-sm-9">
                <span className={`badge ${emailConfig.sendMode === 'log' ? 'bg-warning text-dark' : 'bg-primary'}`}>
                  {emailConfig.sendMode === 'log' ? 'Log only (no provider send)' : 'Send via provider'}
                </span>
              </dd>
              <dt className="col-sm-3">Provider ready</dt>
              <dd className="col-sm-9">
                <span className={`badge ${emailConfig.configured ? 'bg-success' : 'bg-secondary'}`}>
                  {emailConfig.configured ? 'Configured' : 'Not configured'}
                </span>
              </dd>
              <dt className="col-sm-3">From</dt>
              <dd className="col-sm-9">{emailConfig.from ?? '—'}</dd>
              <dt className="col-sm-3">E2E test hooks</dt>
              <dd className="col-sm-9">
                {e2eHooks ? (
                  <span className="badge bg-warning text-dark">Enabled</span>
                ) : (
                  <span className="text-muted">Off</span>
                )}
              </dd>
            </dl>
          </div>
          <h3 className="h6 px-3 border-top pt-3">Recent outbound email (last 100)</h3>
          {emailLogs.length === 0 ? (
            <p className="text-muted px-3 pb-3 mb-0">No emails logged yet.</p>
          ) : (
            <div className="table-responsive">
              <table className="table table-striped table-hover mb-0 align-middle small">
                <thead>
                  <tr>
                    <th>When (UTC)</th>
                    <th>Kind</th>
                    <th>To</th>
                    <th>Subject</th>
                    <th>Status</th>
                    <th>Provider id</th>
                    <th aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {emailLogs.map((log) => (
                    <tr key={log.id}>
                      <td>{formatUtc(log.createdUtc)}</td>
                      <td>{kindLabel(log.kind)}</td>
                      <td className="font-monospace">{log.toEmail}</td>
                      <td>
                        <div>{log.subject}</div>
                        <details className="mt-1">
                          <summary>Body</summary>
                          <pre className="mb-0 mt-1 p-2 bg-light border rounded" style={{ whiteSpace: 'pre-wrap' }}>
                            {log.textBody}
                          </pre>
                          {log.htmlBody ? (
                            <pre className="mb-0 mt-1 p-2 bg-light border rounded" style={{ whiteSpace: 'pre-wrap' }}>
                              {log.htmlBody}
                            </pre>
                          ) : null}
                        </details>
                        {log.error ? (
                          <div className="text-danger mt-1">{log.error}</div>
                        ) : null}
                      </td>
                      <td>
                        <span className={`badge ${emailStatusBadgeClass(log.status)}`}>{log.status}</span>
                      </td>
                      <td className="font-monospace">{log.providerMessageId ?? '—'}</td>
                      <td className="text-end">
                        <button
                          type="button"
                          className="btn btn-outline-primary btn-sm"
                          disabled={resendingLogId === log.id || loading}
                          onClick={() => void onResendEmail(log.id)}
                        >
                          {resendingLogId === log.id ? 'Sending…' : 'Resend'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : null}

      {migrationResults.length > 0 ? (
        <div className="form-card admin-table-card mb-4">
          <div className="d-flex justify-content-between align-items-center px-3 pt-3 pb-2">
            <h2 className="h5 mb-0">Startup migrations</h2>
            {migrationRunUtc ? (
              <span className="text-muted small">Last run {formatUtc(migrationRunUtc)} UTC</span>
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
                  <th>User</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id}>
                    <td>{formatUtc(entry.createdUtc)}</td>
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
                    <td className="font-monospace">{entry.userId ?? '—'}</td>
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
