export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Trim and lowercase; empty input → null; invalid format → `'invalid'`. */
export function parseOptionalEmail(raw: unknown): string | null | 'invalid' {
  if (raw === undefined || raw === null) return null
  const trimmed = String(raw).trim().toLowerCase()
  if (!trimmed) return null
  if (!EMAIL_RE.test(trimmed)) return 'invalid'
  return trimmed
}
