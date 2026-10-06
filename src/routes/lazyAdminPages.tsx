import { lazy } from 'react'

export const AdminUsersPage = lazy(() =>
  import('../pages/admin/AdminUsersPage').then((m) => ({ default: m.AdminUsersPage })),
)
export const AdminFortnightReportPage = lazy(() =>
  import('../pages/admin/AdminFortnightReportPage').then((m) => ({
    default: m.AdminFortnightReportPage,
  })),
)
export const AdminSupportPage = lazy(() =>
  import('../pages/admin/AdminSupportPage').then((m) => ({ default: m.AdminSupportPage })),
)
export const AdminLogsPage = lazy(() =>
  import('../pages/admin/AdminLogsPage').then((m) => ({ default: m.AdminLogsPage })),
)
export const AdminUserDetailPage = lazy(() =>
  import('../pages/admin/AdminUserDetailPage').then((m) => ({ default: m.AdminUserDetailPage })),
)
export const AdminViewTimesheetPage = lazy(() =>
  import('../pages/admin/AdminViewTimesheetPage').then((m) => ({
    default: m.AdminViewTimesheetPage,
  })),
)
