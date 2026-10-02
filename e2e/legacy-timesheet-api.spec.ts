import { expect, test } from '@playwright/test'
import {
  LEGACY_API_SECRET,
  LEGACY_TEST_FORTNIGHT,
  LEGACY_TEST_USER_ID,
  legacyApiHeaders,
  legacyTimesheetPath,
} from './helpers/legacy-timesheet-api'

test.describe('legacy timesheet API', () => {
  let legacyApiEnabled = false

  test.beforeAll(async ({ request }) => {
    const res = await request.get('/api/health')
    if (res.ok()) {
      const body = (await res.json()) as { legacyApi?: boolean }
      legacyApiEnabled = body.legacyApi === true
    }
  })

  test.beforeEach(() => {
    test.skip(
      !legacyApiEnabled,
      'API has no LEGACY_API_SECRET (set in api/.env or run tests via playwright webServer, not a bare dev server)',
    )
  })

  test('health reports legacy API enabled', async ({ request }) => {
    const res = await request.get('/api/health')
    expect(res.ok()).toBeTruthy()
    const body = (await res.json()) as { legacyApi?: boolean }
    expect(body.legacyApi).toBe(true)
  })

  test('rejects missing or invalid auth', async ({ request }) => {
    const path = legacyTimesheetPath()

    const noAuth = await request.get(path)
    expect(noAuth.status()).toBe(401)
    expect(await noAuth.json()).toEqual({ error: 'unauthorized' })

    const badSecret = await request.get(path, {
      headers: { Authorization: 'Bearer wrong-secret', 'X-Legacy-User-Id': LEGACY_TEST_USER_ID },
    })
    expect(badSecret.status()).toBe(401)

    const badUser = await request.get(path, {
      headers: { Authorization: `Bearer ${LEGACY_API_SECRET}`, 'X-Legacy-User-Id': 'not-a-guid' },
    })
    expect(badUser.status()).toBe(400)
    expect(await badUser.json()).toEqual({ error: 'invalid_user_id' })
  })

  test('GET returns 404 until timesheet exists', async ({ request }) => {
    const missingFortnight = '2026-10-11'
    const res = await request.get(legacyTimesheetPath(missingFortnight), {
      headers: legacyApiHeaders(),
    })
    expect(res.status()).toBe(404)
    expect(await res.json()).toEqual({ error: 'not_found' })
  })

  test('PUT creates and GET returns persisted timesheet', async ({ request }) => {
    const path = legacyTimesheetPath()
    const marker = `legacy-e2e-${Date.now()}`

    const put = await request.put(path, {
      headers: legacyApiHeaders(),
      data: {
        timesheet: {
          FortnightEnding: LEGACY_TEST_FORTNIGHT,
          Days: [{ Date: '2026-09-14T00:00:00', Done: true }],
          ExcessOnCallHoursClaimed: marker,
          GoogleFileId: 'drive-file-123',
        },
      },
    })
    expect(put.ok()).toBeTruthy()
    const putBody = (await put.json()) as {
      lastUpdated: number
      googleFileId: string
      timesheet: { ExcessOnCallHoursClaimed?: string; GoogleFileId?: string }
    }
    expect(putBody.googleFileId).toBe('drive-file-123')
    expect(putBody.timesheet.ExcessOnCallHoursClaimed).toBe(marker)
    expect(putBody.timesheet.GoogleFileId).toBe('drive-file-123')
    expect(putBody.lastUpdated).toBeGreaterThan(0)

    const get = await request.get(path, { headers: legacyApiHeaders() })
    expect(get.ok()).toBeTruthy()
    const getBody = (await get.json()) as {
      lastUpdated: number
      googleFileId: string
      timesheet: { ExcessOnCallHoursClaimed?: string }
    }
    expect(getBody.lastUpdated).toBe(putBody.lastUpdated)
    expect(getBody.googleFileId).toBe('drive-file-123')
    expect(getBody.timesheet.ExcessOnCallHoursClaimed).toBe(marker)
  })

  test('ifUnmodifiedSince returns 409 on stale write', async ({ request }) => {
    const path = legacyTimesheetPath('2026-10-25')

    const first = await request.put(path, {
      headers: legacyApiHeaders(),
      data: { timesheet: { Days: [], FortnightEnding: '2026-10-25', ExcessOnCallHoursClaimed: 'v1' } },
    })
    expect(first.ok()).toBeTruthy()
    const { lastUpdated } = (await first.json()) as { lastUpdated: number }

    const second = await request.put(path, {
      headers: legacyApiHeaders(),
      data: {
        timesheet: { Days: [], FortnightEnding: '2026-10-25', ExcessOnCallHoursClaimed: 'v2' },
        ifUnmodifiedSince: lastUpdated - 1,
      },
    })
    expect(second.status()).toBe(409)
    const conflict = (await second.json()) as { error: string; serverLastUpdated: number }
    expect(conflict.error).toBe('conflict')
    expect(conflict.serverLastUpdated).toBe(lastUpdated)

    const get = await request.get(path, { headers: legacyApiHeaders() })
    const current = (await get.json()) as { timesheet: { ExcessOnCallHoursClaimed?: string } }
    expect(current.timesheet.ExcessOnCallHoursClaimed).toBe('v1')
  })

  test('onlyIfServerLastUpdatedBefore skips when server is newer', async ({ request }) => {
    const path = legacyTimesheetPath('2026-11-08')

    const first = await request.put(path, {
      headers: legacyApiHeaders(),
      data: { timesheet: { Days: [], FortnightEnding: '2026-11-08', ExcessOnCallHoursClaimed: 'keep-me' } },
    })
    expect(first.ok()).toBeTruthy()
    const { lastUpdated } = (await first.json()) as { lastUpdated: number }

    const skipped = await request.put(path, {
      headers: legacyApiHeaders(),
      data: {
        timesheet: { Days: [], FortnightEnding: '2026-11-08', ExcessOnCallHoursClaimed: 'should-not-apply' },
        onlyIfServerLastUpdatedBefore: lastUpdated,
      },
    })
    expect(skipped.ok()).toBeTruthy()
    const skipBody = (await skipped.json()) as { skipped?: boolean; timesheet: { ExcessOnCallHoursClaimed?: string } }
    expect(skipBody.skipped).toBe(true)
    expect(skipBody.timesheet.ExcessOnCallHoursClaimed).toBe('keep-me')
  })
})
