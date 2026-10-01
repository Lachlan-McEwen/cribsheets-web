export function publicAppUrl(): string {
  const fromEnv =
    process.env.PUBLIC_APP_URL?.trim() ||
    process.env.CLIENT_ORIGIN?.trim() ||
    (process.env.NODE_ENV !== 'production' ? 'http://localhost:5173' : '')
  if (!fromEnv) {
    throw new Error('PUBLIC_APP_URL or CLIENT_ORIGIN must be set for auth email links')
  }
  return fromEnv.replace(/\/$/, '')
}
