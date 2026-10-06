import { Navigate, Route, Routes } from 'react-router-dom'
import { RequireAdmin } from './auth/RequireAdmin'
import { RequireAuth } from './auth/RequireAuth'
import { Layout } from './components/Layout'
import { AdminRouteShell } from './routes/AdminRouteShell'
import {
  AdminFortnightReportPage,
  AdminLogsPage,
  AdminSupportPage,
  AdminUserDetailPage,
  AdminUsersPage,
  AdminViewTimesheetPage,
} from './routes/lazyAdminPages'
import { CheckEmailPage } from './pages/CheckEmailPage'
import { ForgotPasswordPage } from './pages/ForgotPasswordPage'
import { LoginPage } from './pages/LoginPage'
import { ResetPasswordPage } from './pages/ResetPasswordPage'
import { VerifyEmailPage } from './pages/VerifyEmailPage'
import { ChangePasswordPage } from './pages/ChangePasswordPage'
import { ProfilePage } from './pages/ProfilePage'
import { PrivacyPage } from './pages/PrivacyPage'
import { RegisterPage } from './pages/RegisterPage'
import { SupportPage } from './pages/SupportPage'
import { TimesheetPage } from './pages/TimesheetPage'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route path="check-email" element={<CheckEmailPage />} />
        <Route path="verify-email" element={<VerifyEmailPage />} />
        <Route path="forgot-password" element={<ForgotPasswordPage />} />
        <Route path="reset-password" element={<ResetPasswordPage />} />
        <Route path="privacy" element={<PrivacyPage />} />
        <Route element={<RequireAuth />}>
          <Route index element={<TimesheetPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="change-password" element={<ChangePasswordPage />} />
          <Route path="help" element={<SupportPage />} />
          <Route path="admin" element={<RequireAdmin />}>
            <Route element={<AdminRouteShell />}>
              <Route index element={<AdminUsersPage />} />
              <Route path="timesheets" element={<AdminFortnightReportPage />} />
              <Route path="support" element={<AdminSupportPage />} />
              <Route path="logs" element={<AdminLogsPage />} />
              <Route path="users/:userId" element={<AdminUserDetailPage />} />
              <Route
                path="users/:userId/timesheets/:fortnightEnding"
                element={<AdminViewTimesheetPage />}
              />
            </Route>
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
