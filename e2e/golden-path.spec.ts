import { expect, test } from '@playwright/test'
import { loginViaUi, registerViaUi, verifyEmailViaUi } from './helpers/ui-auth'
import { completeProfileViaUi } from './helpers/ui-profile'
import { assertExportHasWorkedDayCells, getTimesheetViaApi } from './helpers/timesheet-api'
import { clearEmailLogs, uniqueE2eEmail } from './helpers/email-logs'
import {
  downloadTimesheetViaUi,
  expectTimesheetApprovalMailtoViaUi,
  fillTimesheetDayViaUi,
  generateTimesheetViaUi,
  saveTimesheetViaUi,
} from './helpers/ui-timesheet'

const DEFAULT_PASSWORD = 'password123'
const EMPLOYEE_NUMBER = '1002454'
const UNIT_STATION = 'BARMERA'
const MANAGER_EMAIL = 'e2e-manager@example.com'

test.describe('golden path', () => {
  test.describe.configure({ mode: 'serial' })

  test.beforeEach(async ({ request }) => {
    await clearEmailLogs(request)
  })

  test('sign up through timesheet save and generate', async ({ page, request, baseURL }) => {
    test.setTimeout(180_000)
    const email = uniqueE2eEmail('e2e-golden')
    const name = 'Golden Path User'

    await registerViaUi(page, request, {
      name,
      email,
      password: DEFAULT_PASSWORD,
      appOrigin: baseURL!,
    })

    await verifyEmailViaUi(page, request, email)
    await loginViaUi(page, { email, password: DEFAULT_PASSWORD })
    await completeProfileViaUi(page, {
      name,
      employeeNumber: EMPLOYEE_NUMBER,
      unitStation: UNIT_STATION,
      authorisingManagerEmail: MANAGER_EMAIL,
    })

    await fillTimesheetDayViaUi(page, 0, { start: '08:00', end: '16:00' })
    const fortnightEnding = await saveTimesheetViaUi(page)
    const stored = await getTimesheetViaApi(page, fortnightEnding)
    const day = stored.document.days[0]
    expect(day.done).toBe(true)
    expect(day.start).toMatch(/08:00/)
    expect(day.end).toMatch(/16:00/)

    const exportFortnight = await generateTimesheetViaUi(page)
    expect(exportFortnight).toBe(fortnightEnding)

    await expectTimesheetApprovalMailtoViaUi(page, {
      employeeName: name,
      authorisingManagerEmail: MANAGER_EMAIL,
      fortnightEnding,
      employeeNumber: EMPLOYEE_NUMBER,
      unitStation: UNIT_STATION,
      hasGeneratedSpreadsheet: true,
    })

    const filePath = await downloadTimesheetViaUi(page)
    await assertExportHasWorkedDayCells(filePath, {
      start: '08:00',
      end: '16:00',
      employeeNumber: EMPLOYEE_NUMBER,
      unitStation: UNIT_STATION,
      surname: 'User',
    })
  })
})
