import { Resend } from 'resend'

export type SendEmailInput = {
  to: string | string[]
  subject: string
  text: string
  html?: string
}

export type EmailConfigStatus = {
  configured: boolean
  from: string | null
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
  return { configured, from: configured ? from : null }
}

function getResend(): Resend {
  const key = resendApiKey()
  if (!key) throw new Error('RESEND_API_KEY is not set')
  if (!client) client = new Resend(key)
  return client
}

export async function sendEmail(input: SendEmailInput): Promise<{ id: string }> {
  const from = emailFrom()
  if (!from) throw new Error('EMAIL_FROM is not set')

  const replyTo = process.env.EMAIL_REPLY_TO?.trim()

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
