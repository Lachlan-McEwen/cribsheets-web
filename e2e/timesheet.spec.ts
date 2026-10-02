import { expect, test } from '@playwright/test'
import { seedUserForTimesheetUi } from './helpers/auth'
import { clearEmailLogs } from './helpers/email-logs'
import { getTimesheetViaApi } from './helpers/timesheet-api'
import { fillTimesheetDayViaUi, saveTimesheetViaUi } from './helpers/ui-timesheet'

test.describe('timesheet', () => {
  test.describe.configure({ mode: 'serial' })

  test.beforeEach(async ({ request }) => {
    await clearEmailLogs(request)
  })

  test('fills a day and persists on save', async ({ page, request }) => {
    await seedUserForTimesheetUi(page, request)
    await page.goto('/')
    await fillTimesheetDayViaUi(page, 0, { start: '08:00', end: '16:00' })
    const fortnightEnding = await saveTimesheetViaUi(page)

    const stored = await getTimesheetViaApi(page, fortnightEnding)
    const day = stored.document.days[0]
    expect(day.done).toBe(true)
    expect(day.start).toMatch(/08:00/)
    expect(day.end).toMatch(/16:00/)
  })
})
