export type EmailSendMode = 'send' | 'log'

export function emailSendMode(): EmailSendMode {
  const raw = process.env.EMAIL_SEND_MODE?.trim().toLowerCase()
  if (raw === 'log' || raw === 'off' || raw === 'false' || raw === '0') return 'log'
  return 'send'
}
