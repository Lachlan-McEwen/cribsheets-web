/** Routes that use the minimal header (no Login / Register in the navbar). */
export const AUTH_ROUTE_PATHS = new Set([
  '/login',
  '/register',
  '/check-email',
  '/verify-email',
  '/forgot-password',
  '/reset-password',
])

export function isAuthRoute(pathname: string): boolean {
  return AUTH_ROUTE_PATHS.has(pathname)
}
