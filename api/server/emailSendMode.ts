import { e2eTestHooksEnabled } from './testHooks.js'

export type EmailSendMode = 'send' | 'log'

export function emailSendMode(): EmailSendMode {
  if (e2eTestHooksEnabled()) return 'log'
  const raw = process.env.EMAIL_SEND_MODE?.trim().toLowerCase()
  if (raw === 'log' || raw === 'off' || raw === 'false' || raw === '0') return 'log'
  return 'send'
}
