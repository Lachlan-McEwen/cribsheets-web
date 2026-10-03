import { deliverEmail } from './email.js'
import { supportAlertsEnabled } from './supportAlerts.js'
import type { SupportRequestWithUser } from './supportRequests.js'
import { listAdminNotificationEmails } from './supportRequests.js'

export async function notifyAdminsOfSupportRequest(request: SupportRequestWithUser): Promise<void> {
  if (!supportAlertsEnabled()) return

  const recipients = listAdminNotificationEmails()
  if (recipients.length === 0) return

  const userLabel = request.userName.trim() || request.userEmail
  const subject = `Crib Sheets support: ${request.subject}`
  const text = [
    `New support request from ${userLabel} <${request.userEmail}>`,
    request.employeeNumber ? `Employee #: ${request.employeeNumber}` : null,
    request.unitStation ? `Station: ${request.unitStation}` : null,
    '',
    `Subject: ${request.subject}`,
    '',
    request.message,
    '',
    `Request id: ${request.id}`,
  ]
    .filter((line) => line !== null)
    .join('\n')

  const html = `<p>New support request from <strong>${escapeHtml(userLabel)}</strong> &lt;${escapeHtml(request.userEmail)}&gt;</p>
${request.employeeNumber ? `<p>Employee #: ${escapeHtml(request.employeeNumber)}</p>` : ''}
${request.unitStation ? `<p>Station: ${escapeHtml(request.unitStation)}</p>` : ''}
<p><strong>Subject:</strong> ${escapeHtml(request.subject)}</p>
<pre style="white-space:pre-wrap;font-family:inherit">${escapeHtml(request.message)}</pre>
<p style="color:#666;font-size:12px">Request id: ${escapeHtml(request.id)}</p>`

  await deliverEmail(
    {
      to: recipients,
      subject,
      text,
      html,
      replyTo: request.userEmail,
    },
    { kind: 'support_alert', userId: request.userId },
  )
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
