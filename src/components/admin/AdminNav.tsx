import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { getAdminDeployInfo, type AdminDeployInfo } from '../../lib/api.ts'

function formatDeployLabel(info: AdminDeployInfo): string {
  const parts = [`v${info.version}`]
  if (info.commit) parts.push(info.commit)
  return parts.join(' · ')
}

export function AdminNav() {
  const [deploy, setDeploy] = useState<AdminDeployInfo | null>(null)

  useEffect(() => {
    void getAdminDeployInfo()
      .then(setDeploy)
      .catch(() => {})
  }, [])

  return (
    <div className="mb-4">
      <ul className="nav nav-pills admin-nav">
        <li className="nav-item">
          <NavLink end className="nav-link" to="/admin">
            Users
          </NavLink>
        </li>
        <li className="nav-item">
          <NavLink className="nav-link" to="/admin/timesheets">
            Fortnight report
          </NavLink>
        </li>
        <li className="nav-item">
          <NavLink className="nav-link" to="/admin/support">
            Support
          </NavLink>
        </li>
        <li className="nav-item">
          <NavLink className="nav-link" to="/admin/logs">
            Logs
          </NavLink>
        </li>
      </ul>
      {deploy ? (
        <p className="text-muted small mb-0 mt-2" title={deploy.builtAt ? `Built ${deploy.builtAt}` : undefined}>
          Deployed {formatDeployLabel(deploy)}
        </p>
      ) : null}
    </div>
  )
}
