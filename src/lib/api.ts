const jsonHeaders = { Accept: 'application/json', 'Content-Type': 'application/json' }

export type ApiUser = {
  id: string
  email: string
  name: string
  isAdmin: boolean
  employeeNumber: string
  unitStation: string
  casual: boolean
  isCountryEmployee: boolean
  defaultShiftHours: number | null
  defaultShiftCode: string
  hasSignature: boolean
  profileIsComplete: boolean
  emailVerified: boolean
  authorisingManagerEmail: string
}

export type TimesheetSummary = {
  userId: string
  fortnightEnding: string
  lastUpdated: number
  googleFileId: string | null
  daysComplete: number
  totalDays: number
  isUploaded: boolean
}

export type AdminUserRow = {
  id: string
  email: string
  name: string
  employeeNumber: string
  unitStation: string
  casual: boolean
  isCountryEmployee: boolean
  profileIsComplete: boolean
  hasSignature: boolean
  isAdmin: boolean
  isCurrentUser: boolean
}

export type AdminFortnightReport = {
  fortnightEnding: string
  fortnightOptions: string[]
  currentPermanentFortnight: string
  currentCasualFortnight: string
  totalUsers: number
  incompleteProfiles: number
  withTimesheet: number
  uploaded: number
  rows: {
    userId: string
    email: string
    name: string
    employeeNumber: string
    unitStation: string
    casual: boolean
    isCountryEmployee: boolean
    profileIsComplete: boolean
    appliesToSelectedFortnight: boolean
    timesheet: TimesheetSummary | null
  }[]
}

export type AppErrorLogEntry = {
  id: number
  createdUtc: number
  level: string
  category: string
  message: string
  exception: string | null
  requestPath: string | null
  userId: string | null
  traceId: string | null
}

export type SchemaMigrationResult = {
  migrationId: string
  status: string
  message: string
  exception: string | null
}

export class TimesheetConflictError extends Error {
  serverLastUpdated: number
  constructor(serverLastUpdated: number) {
    super('conflict')
    this.name = 'TimesheetConflictError'
    this.serverLastUpdated = serverLastUpdated
  }
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    credentials: 'include',
    ...init,
    headers: { ...jsonHeaders, ...init?.headers },
  })
  const body = (await res.json().catch(() => ({}))) as T & {
    error?: string
    serverLastUpdated?: number
  }
  if (!res.ok) {
    if (res.status === 409 && body.error === 'conflict' && body.serverLastUpdated != null) {
      throw new TimesheetConflictError(body.serverLastUpdated)
    }
    throw new Error(body.error ?? res.statusText)
  }
  return body as T
}

export function getHealth() {
  return apiFetch<{ ok: boolean }>('/api/health')
}

export function getMe() {
  return apiFetch<{ user: ApiUser }>('/api/auth/me')
}

export function login(email: string, password: string) {
  return apiFetch<{ user: ApiUser }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

export function register(name: string, email: string, password: string) {
  return apiFetch<{ ok: boolean; needsEmailVerification: boolean }>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password }),
  })
}

export function forgotPassword(email: string) {
  return apiFetch<{ ok: boolean }>('/api/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  })
}

export function resetPassword(token: string, password: string) {
  return apiFetch<{ ok: boolean }>('/api/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token, password }),
  })
}

export function resendVerification(email: string) {
  return apiFetch<{ ok: boolean }>('/api/auth/resend-verification', {
    method: 'POST',
    body: JSON.stringify({ email }),
  })
}

export function changePassword(currentPassword: string, newPassword: string) {
  return apiFetch<{ ok: boolean }>('/api/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({ currentPassword, newPassword }),
  })
}

export function getRegistrationOpen() {
  return apiFetch<{ open: boolean }>('/api/auth/registration')
}

export function logout() {
  return apiFetch<{ ok: boolean }>('/api/auth/logout', { method: 'POST' })
}

export type ProfileUpdatePayload = {
  name: string
  employeeNumber: string
  unitStation: string
  casual: boolean
  isCountryEmployee: boolean
  defaultShiftHours: number | null
  defaultShiftCode: string
  authorisingManagerEmail: string
  signatureDataUrl?: string | null
}

export function updateProfile(payload: ProfileUpdatePayload) {
  return apiFetch<{ user: ApiUser }>('/api/profile', {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export function profileSignatureUrl(): string {
  return '/api/profile/signature'
}

export function adminUserSignatureUrl(userId: string): string {
  return `/api/admin/users/${userId}/signature`
}

export type TimesheetResponse = {
  fortnightEnding: string
  lastUpdated: number
  googleFileId: string | null
  outputFileName: string | null
  hasOutput: boolean
  document: Record<string, unknown>
}

export function getTemplateVersion(casual: boolean) {
  return apiFetch<{ version: string }>(`/api/timesheets/meta/template-version?casual=${casual}`)
}

export function getTimesheet(fortnightEnding: string) {
  return apiFetch<TimesheetResponse>(`/api/timesheets/${fortnightEnding}`)
}

export function saveTimesheet(
  fortnightEnding: string,
  document: Record<string, unknown>,
  ifUnmodifiedSince: number | null,
) {
  return apiFetch<TimesheetResponse>(`/api/timesheets/${fortnightEnding}`, {
    method: 'PUT',
    body: JSON.stringify({ document, ifUnmodifiedSince }),
  })
}

export function generateTimesheet(
  fortnightEnding: string,
  document: Record<string, unknown>,
  ifUnmodifiedSince: number | null,
) {
  return apiFetch<TimesheetResponse>(`/api/timesheets/${fortnightEnding}/generate`, {
    method: 'POST',
    body: JSON.stringify({ document, ifUnmodifiedSince }),
  })
}

export function timesheetExportUrl(fortnightEnding: string): string {
  return `/api/timesheets/${fortnightEnding}/export`
}

export type AdminRegistrationSettings = {
  open: boolean
  acceptingSignups: boolean
  userCount: number
  maxUsers: number | null
  atUserCap: boolean
}

export function getAdminRegistration() {
  return apiFetch<AdminRegistrationSettings>('/api/admin/registration')
}

export function setAdminRegistration(open: boolean) {
  return apiFetch<AdminRegistrationSettings>('/api/admin/registration', {
    method: 'POST',
    body: JSON.stringify({ open }),
  })
}

export function getAdminUsers(search?: string) {
  const q = search?.trim() ? `?search=${encodeURIComponent(search.trim())}` : ''
  return apiFetch<{ users: AdminUserRow[] }>(`/api/admin/users${q}`)
}

export function getAdminUser(userId: string) {
  return apiFetch<{ user: ApiUser; timesheets: TimesheetSummary[] }>(`/api/admin/users/${userId}`)
}

export function setAdminUser(userId: string, isAdmin: boolean) {
  return apiFetch<{ ok: boolean }>(`/api/admin/users/${userId}/admin`, {
    method: 'POST',
    body: JSON.stringify({ isAdmin }),
  })
}

export function deleteAdminUser(userId: string) {
  return apiFetch<{ ok: boolean }>(`/api/admin/users/${userId}`, { method: 'DELETE' })
}

export function getAdminFortnightReport(fortnightEnding?: string) {
  const q = fortnightEnding ? `?fortnightEnding=${encodeURIComponent(fortnightEnding)}` : ''
  return apiFetch<AdminFortnightReport>(`/api/admin/timesheets/report${q}`)
}

export function getAdminViewTimesheet(userId: string, fortnightEnding: string) {
  return apiFetch<{
    email: string
    user: ApiUser
    fortnightEnding: string
    lastUpdated: number
    googleFileId: string | null
    document: Record<string, unknown>
  }>(`/api/admin/users/${userId}/timesheets/${fortnightEnding}`)
}

export type EmailLogEntry = {
  id: number
  createdUtc: number
  kind: string
  toEmail: string
  subject: string
  status: 'logged_only' | 'sent' | 'failed'
  providerMessageId: string | null
  textBody: string
  htmlBody: string | null
  error: string | null
  userId: string | null
}

export type AdminEmailConfig = {
  configured: boolean
  from: string | null
  sendMode: 'send' | 'log'
}

export type SupportRequestRow = {
  id: string
  userId: string
  subject: string
  message: string
  status: 'open' | 'closed'
  createdUtc: number
  closedUtc: number | null
  userEmail: string
  userName: string
  employeeNumber: string
  unitStation: string
}

export function submitSupportRequest(payload: { subject: string; message: string }) {
  return apiFetch<{ ok: boolean; id: string }>('/api/support', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function getAdminSupportRequests() {
  return apiFetch<{ requests: SupportRequestRow[] }>('/api/admin/support')
}

export function setAdminSupportRequestStatus(id: string, status: 'open' | 'closed') {
  return apiFetch<{ request: Pick<SupportRequestRow, 'id' | 'status' | 'closedUtc'> }>(
    `/api/admin/support/${encodeURIComponent(id)}`,
    { method: 'POST', body: JSON.stringify({ status }) },
  )
}

export function getAdminLogs() {
  return apiFetch<{
    loggingAvailable: boolean
    migrationRunUtc: number | null
    migrationResults: SchemaMigrationResult[]
    entries: AppErrorLogEntry[]
    email: AdminEmailConfig
    e2eTestHooksEnabled: boolean
    emailLogs: EmailLogEntry[]
  }>('/api/admin/logs')
}

export function adminErrorMessage(code: string): string {
  switch (code) {
    case 'cannot_remove_own_admin':
      return 'You cannot remove your own admin access.'
    case 'last_admin':
      return 'Cannot remove or delete the last admin account.'
    case 'cannot_delete_self':
      return 'You cannot delete your own account.'
    default:
      return code
  }
}
