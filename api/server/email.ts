import { Resend } from 'resend'
import { insertEmailLog, updateEmailLog, type EmailLogKind } from './emailLog.js'
import { emailSendMode } from './emailSendMode.js'

export type SendEmailInput = {
  to: string | string[]
  subject: string
  text: string
  html?: string
  replyTo?: string
}

export type DeliverEmailMeta = {
  kind: EmailLogKind
  userId?: string | null
}

export type EmailConfigStatus = {
  configured: boolean
  from: string | null
  sendMode: 'send' | 'log'
}

let client: Resend | null = null

function resendApiKey(): string | null {
  const key = process.env.RESEND_API_KEY?.trim()
  return key || null
}

function emailFrom(): string | null {
  const from = process.env.EMAIL_FROM?.trim()
  return from || null
}

export function emailConfigStatus(): EmailConfigStatus {
  const from = emailFrom()
  const configured = Boolean(resendApiKey() && from)
  return { configured, from: configured ? from : null, sendMode: emailSendMode() }
}

function getResend(): Resend {
  const key = resendApiKey()
  if (!key) throw new Error('RESEND_API_KEY is not set')
  if (!client) client = new Resend(key)
  return client
}

function primaryRecipient(to: string | string[]): string {
  if (Array.isArray(to)) return to[0] ?? ''
  return to
}

async function sendViaResend(input: SendEmailInput): Promise<{ id: string }> {
  const from = emailFrom()
  if (!from) throw new Error('EMAIL_FROM is not set')

  const replyTo = input.replyTo?.trim() || process.env.EMAIL_REPLY_TO?.trim()

  const { data, error } = await getResend().emails.send({
    from,
    to: input.to,
    subject: input.subject,
    text: input.text,
    html: input.html,
    ...(replyTo ? { replyTo } : {}),
  })

  if (error) throw new Error(error.message)
  if (!data?.id) throw new Error('Resend returned no message id')
  return { id: data.id }
}

export async function deliverEmail(input: SendEmailInput, meta: DeliverEmailMeta): Promise<{ id: string }> {
  const logId = insertEmailLog({
    kind: meta.kind,
    toEmail: primaryRecipient(input.to),
    subject: input.subject,
    textBody: input.text,
    htmlBody: input.html ?? null,
    userId: meta.userId ?? null,
  })

  if (emailSendMode() === 'log') {
    updateEmailLog(logId, { status: 'logged_only' })
    return { id: `log-${logId}` }
  }

  try {
    const { id } = await sendViaResend(input)
    updateEmailLog(logId, { status: 'sent', providerMessageId: id })
    return { id }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    updateEmailLog(logId, { status: 'failed', error: message })
    throw err
  }
}

/** @deprecated Prefer deliverEmail with a kind for logging. */
export async function sendEmail(input: SendEmailInput): Promise<{ id: string }> {
  return deliverEmail(input, { kind: 'generic' })
}
