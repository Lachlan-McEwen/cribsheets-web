import { test } from '@playwright/test'
import { seedUserForTimesheetUi } from './helpers/auth'
import { clearEmailLogs } from './helpers/email-logs'
import {
  assertExportHasWorkedDayCells,
  downloadTimesheetExportViaApi,
  generateTimesheetViaApi,
  seedWorkedDayTimesheetViaApi,
} from './helpers/timesheet-api'

test.describe('timesheet generate', () => {
  test.describe.configure({ mode: 'serial' })

  test.beforeEach(async ({ request }) => {
    await clearEmailLogs(request)
  })

  test('generates export with rostered times in the spreadsheet', async ({ page, request }) => {
    test.setTimeout(150_000)
    const { name } = await seedUserForTimesheetUi(page, request)
    const { fortnightEnding, document, user } = await seedWorkedDayTimesheetViaApi(page)
    await generateTimesheetViaApi(page, fortnightEnding, document as Record<string, unknown>)

    const filePath = await downloadTimesheetExportViaApi(page, fortnightEnding)
    const surname = name.trim().slice(name.trim().lastIndexOf(' ') + 1)
    await assertExportHasWorkedDayCells(filePath, {
      start: '08:00',
      end: '16:00',
      employeeNumber: user.employeeNumber,
      unitStation: user.unitStation,
      surname,
    })
  })
})
