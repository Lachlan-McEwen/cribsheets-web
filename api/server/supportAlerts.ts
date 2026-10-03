/** Admin inbox emails for new support requests (see supportNotify). */
export function supportAlertsEnabled(): boolean {
  const raw = process.env.SUPPORT_ALERTS?.trim().toLowerCase()
  if (raw === 'false' || raw === 'off' || raw === '0' || raw === 'no') return false
  if (raw === 'true' || raw === 'on' || raw === '1' || raw === 'yes') return true
  return process.env.NODE_ENV === 'production'
}
