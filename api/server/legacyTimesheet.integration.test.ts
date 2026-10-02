import assert from 'node:assert/strict'
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { after, before, describe, it } from 'node:test'

const apiRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SECRET = 'integration-test-legacy-secret'
const USER_ID = '8449514a-2ad2-4f6a-bb76-34ab7d087ba6'
const FORTNIGHT = '2026-09-27'

let child: ChildProcessWithoutNullStreams
let port: number
let baseUrl: string

async function waitForHealth(timeoutMs = 20_000): Promise<void> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${baseUrl}/api/health`)
      if (res.ok) {
        const body = (await res.json()) as { legacyApi?: boolean }
        assert.equal(body.legacyApi, true)
        return
      }
    } catch {
      // retry until timeout
    }
    await new Promise((r) => setTimeout(r, 250))
  }
  throw new Error('API did not become healthy in time')
}

function legacyHeaders(userId = USER_ID): Record<string, string> {
  return {
    Authorization: `Bearer ${SECRET}`,
    'X-Legacy-User-Id': userId,
    'Content-Type': 'application/json',
  }
}

before(async () => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cribsheets-legacy-it-'))
  port = 38_000 + Math.floor(Math.random() * 2_000)
  baseUrl = `http://127.0.0.1:${port}`

  child = spawn('npx', ['tsx', 'server/index.ts'], {
    cwd: apiRoot,
    shell: true,
    env: {
      ...process.env,
      PORT: String(port),
      DATA_DIR: dataDir,
      LEGACY_API_SECRET: SECRET,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  child.stderr.on('data', (chunk) => {
    const text = String(chunk)
    if (text.includes('Error') || text.includes('EADDRINUSE')) {
      console.error('[legacy-it api]', text)
    }
  })

  await waitForHealth()
})

after(() => {
  child.kill('SIGTERM')
})

describe('legacy timesheet API (integration)', () => {
  it('rejects missing bearer token', async () => {
    const res = await fetch(`${baseUrl}/api/legacy/timesheets/${FORTNIGHT}`, {
      headers: { 'X-Legacy-User-Id': USER_ID },
    })
    assert.equal(res.status, 401)
    assert.deepEqual(await res.json(), { error: 'unauthorized' })
  })

  it('rejects invalid user id', async () => {
    const res = await fetch(`${baseUrl}/api/legacy/timesheets/${FORTNIGHT}`, {
      headers: legacyHeaders('not-a-guid'),
    })
    assert.equal(res.status, 400)
    assert.deepEqual(await res.json(), { error: 'invalid_user_id' })
  })

  it('GET is 404 until created', async () => {
    const res = await fetch(`${baseUrl}/api/legacy/timesheets/2026-10-11`, {
      headers: legacyHeaders(),
    })
    assert.equal(res.status, 404)
    assert.deepEqual(await res.json(), { error: 'not_found' })
  })

  it('PUT then GET round-trips timesheet and GoogleFileId', async () => {
    const path = `${baseUrl}/api/legacy/timesheets/${FORTNIGHT}`
    const marker = `it-${Date.now()}`

    const put = await fetch(path, {
      method: 'PUT',
      headers: legacyHeaders(),
      body: JSON.stringify({
        timesheet: {
          FortnightEnding: FORTNIGHT,
          Days: [{ Date: '2026-09-14T00:00:00', Done: true }],
          ExcessOnCallHoursClaimed: marker,
          GoogleFileId: 'drive-abc',
        },
      }),
    })
    assert.equal(put.status, 200)
    const putBody = (await put.json()) as {
      googleFileId: string
      timesheet: { ExcessOnCallHoursClaimed?: string; GoogleFileId?: string }
    }
    assert.equal(putBody.googleFileId, 'drive-abc')
    assert.equal(putBody.timesheet.ExcessOnCallHoursClaimed, marker)

    const get = await fetch(path, { headers: legacyHeaders() })
    assert.equal(get.status, 200)
    const getBody = (await get.json()) as {
      googleFileId: string
      timesheet: { ExcessOnCallHoursClaimed?: string }
    }
    assert.equal(getBody.googleFileId, 'drive-abc')
    assert.equal(getBody.timesheet.ExcessOnCallHoursClaimed, marker)
  })

  it('ifUnmodifiedSince returns 409 when stale', async () => {
    const fortnight = '2026-10-25'
    const path = `${baseUrl}/api/legacy/timesheets/${fortnight}`

    const first = await fetch(path, {
      method: 'PUT',
      headers: legacyHeaders(),
      body: JSON.stringify({
        timesheet: { FortnightEnding: fortnight, Days: [], ExcessOnCallHoursClaimed: 'v1' },
      }),
    })
    assert.equal(first.status, 200)
    const { lastUpdated } = (await first.json()) as { lastUpdated: number }

    const conflict = await fetch(path, {
      method: 'PUT',
      headers: legacyHeaders(),
      body: JSON.stringify({
        timesheet: { FortnightEnding: fortnight, Days: [], ExcessOnCallHoursClaimed: 'v2' },
        ifUnmodifiedSince: lastUpdated - 1,
      }),
    })
    assert.equal(conflict.status, 409)
    const body = (await conflict.json()) as { error: string; serverLastUpdated: number }
    assert.equal(body.error, 'conflict')
    assert.equal(body.serverLastUpdated, lastUpdated)
  })

  it('onlyIfServerLastUpdatedBefore skips when server is already newer', async () => {
    const fortnight = '2026-11-08'
    const path = `${baseUrl}/api/legacy/timesheets/${fortnight}`

    const first = await fetch(path, {
      method: 'PUT',
      headers: legacyHeaders(),
      body: JSON.stringify({
        timesheet: { FortnightEnding: fortnight, Days: [], ExcessOnCallHoursClaimed: 'keep' },
      }),
    })
    assert.equal(first.status, 200)
    const { lastUpdated } = (await first.json()) as { lastUpdated: number }

    const skipped = await fetch(path, {
      method: 'PUT',
      headers: legacyHeaders(),
      body: JSON.stringify({
        timesheet: { FortnightEnding: fortnight, Days: [], ExcessOnCallHoursClaimed: 'drop' },
        onlyIfServerLastUpdatedBefore: lastUpdated,
      }),
    })
    assert.equal(skipped.status, 200)
    const body = (await skipped.json()) as { skipped?: boolean; timesheet: { ExcessOnCallHoursClaimed?: string } }
    assert.equal(body.skipped, true)
    assert.equal(body.timesheet.ExcessOnCallHoursClaimed, 'keep')
  })
})
