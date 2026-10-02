export const LEGACY_API_SECRET = process.env.LEGACY_API_SECRET ?? 'playwright-legacy-api-secret'

/** Stable GUID for legacy API tests (stub user created on first write). */
export const LEGACY_TEST_USER_ID = '8449514a-2ad2-4f6a-bb76-34ab7d087ba6'

export const LEGACY_TEST_FORTNIGHT = '2026-09-27'

export function legacyApiHeaders(userId: string = LEGACY_TEST_USER_ID): Record<string, string> {
  return {
    Authorization: `Bearer ${LEGACY_API_SECRET}`,
    'X-Legacy-User-Id': userId,
    'Content-Type': 'application/json',
  }
}

export function legacyTimesheetPath(fortnightEnding: string = LEGACY_TEST_FORTNIGHT): string {
  return `/api/legacy/timesheets/${fortnightEnding}`
}
