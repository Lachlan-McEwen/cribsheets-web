import { test } from '@playwright/test'
import { seedUserForTimesheetUi } from './helpers/auth'
import { clearEmailLogs } from './helpers/email-logs'
import { fillTimesheetDayViaUi, saveAndGenerateTimesheetViaUi } from './helpers/ui-timesheet'

test.describe('timesheet', () => {
  test.describe.configure({ mode: 'serial' })

  test.beforeEach(async ({ request }) => {
    await clearEmailLogs(request)
  })

  test('fills a day, saves, and generates the spreadsheet', async ({ page, request }) => {
    test.setTimeout(150_000)
    await seedUserForTimesheetUi(page, request)
    await page.goto('/')
    await fillTimesheetDayViaUi(page)
    await saveAndGenerateTimesheetViaUi(page)
  })
})
