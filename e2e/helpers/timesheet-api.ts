import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { expect, type Page } from '@playwright/test'
import { dayCell, HEADER_CELLS } from '../../lib/timesheet-export/cells.ts'
import { extractTrackedCellsFromWorkbook } from '../../lib/timesheet-export/extract-cells.ts'
import { getCurrentFortnightEnding, toFortnightParam } from '../../src/lib/fortnight.ts'
import { createTimesheet } from '../../src/lib/timesheetModel.ts'
import type { ApiUser } from '../../src/lib/api.ts'

type TimesheetGetResponse = {
  fortnightEnding: string
  document: {
    days: Array<{
      date: string
      done?: boolean
      start?: string
      end?: string
    }>
  }
}

export async function getApiUser(page: Page): Promise<ApiUser> {
  const meRes = await page.request.get('/api/auth/me')
  expect(meRes.ok()).toBeTruthy()
  const me = (await meRes.json()) as { user: ApiUser }
  return me.user
}

export function currentFortnightParamForUser(user: ApiUser): string {
  return toFortnightParam(getCurrentFortnightEnding(user.casual))
}

export async function getTimesheetViaApi(page: Page, fortnightEnding: string): Promise<TimesheetGetResponse> {
  const res = await page.request.get(`/api/timesheets/${fortnightEnding}`)
  expect(res.ok()).toBeTruthy()
  return (await res.json()) as TimesheetGetResponse
}

/** PUT a timesheet with day 0 rostered 08:00–16:00 and marked done. */
export async function seedWorkedDayTimesheetViaApi(
  page: Page,
  opts?: { start?: string; end?: string; dayIndex?: number },
) {
  const user = await getApiUser(page)
  const fortnightEnding = currentFortnightParamForUser(user)
  const start = opts?.start ?? '08:00'
  const end = opts?.end ?? '16:00'
  const dayIndex = opts?.dayIndex ?? 0

  const endingDate = getCurrentFortnightEnding(user.casual)
  const document = createTimesheet(endingDate, user)
  const day = document.days[dayIndex]
  day.start = `${day.date}T${start}:00`
  day.end = `${day.date}T${end}:00`
  day.done = true

  const putRes = await page.request.put(`/api/timesheets/${fortnightEnding}`, {
    data: { document },
  })
  expect(putRes.ok()).toBeTruthy()
  return { fortnightEnding, document, user }
}

export async function generateTimesheetViaApi(
  page: Page,
  fortnightEnding: string,
  document: Record<string, unknown>,
) {
  const res = await page.request.post(`/api/timesheets/${fortnightEnding}/generate`, {
    data: { document },
  })
  expect(res.ok()).toBeTruthy()
  const body = (await res.json()) as { hasOutput: boolean; fortnightEnding: string }
  expect(body.hasOutput).toBe(true)
  return body
}

export async function downloadTimesheetExportViaApi(page: Page, fortnightEnding: string): Promise<string> {
  const res = await page.request.get(`/api/timesheets/${fortnightEnding}/export`)
  expect(res.ok()).toBeTruthy()
  const contentType = res.headers()['content-type'] ?? ''
  expect(contentType).toMatch(/ms-excel|spreadsheetml/)

  const buffer = await res.body()
  expect(buffer.byteLength).toBeGreaterThan(10_000)

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cribsheets-e2e-'))
  const filePath = path.join(dir, `timesheet-${fortnightEnding}.xlsm`)
  fs.writeFileSync(filePath, buffer)
  return filePath
}

export async function assertExportHasWorkedDayCells(
  filePath: string,
  opts: { start: string; end: string; employeeNumber: string; unitStation: string; surname: string },
  dayIndex = 0,
) {
  const cells = await extractTrackedCellsFromWorkbook(filePath, false)
  expect(cells[dayCell(dayIndex, 'C')]).toBe(opts.start)
  expect(cells[dayCell(dayIndex, 'D')]).toBe(opts.end)
  expect(cells[HEADER_CELLS.employeeNumber]).toBe(opts.employeeNumber)
  expect(cells[HEADER_CELLS.unitStation]).toBe(opts.unitStation)
  expect(cells[HEADER_CELLS.surname]).toBe(opts.surname)
}
