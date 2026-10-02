import { NavLink } from 'react-router-dom'

export function AdminNav() {
  return (
    <ul className="nav nav-pills admin-nav mb-4">
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
  )
}
