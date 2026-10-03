import { test } from '@playwright/test'
import { completeProfileViaApi, loginViaApi, registerVerifiedUser } from './helpers/auth'
import { clearEmailLogs } from './helpers/email-logs'
import { generateTimesheetViaApi, seedWorkedDayTimesheetViaApi } from './helpers/timesheet-api'
import { expectTimesheetApprovalMailtoViaUi } from './helpers/ui-timesheet'

const MANAGER_EMAIL = 'e2e-manager@example.com'
const EMPLOYEE_NUMBER = '1002454'
const UNIT_STATION = 'BARMERA'

test.describe('timesheet approval mailto', () => {
  test.describe.configure({ mode: 'serial' })

  test.beforeEach(async ({ request }) => {
    await clearEmailLogs(request)
  })

  test('prefills manager and subject after generate (empty mail body)', async ({ page, request }) => {
    test.setTimeout(150_000)
    const name = 'Mailto Test User'
    const { email, password } = await registerVerifiedUser(request, {
      name,
      emailPrefix: 'e2e-mailto',
    })
    await loginViaApi(page, { email, password })
    await completeProfileViaApi(page, {
      name,
      employeeNumber: EMPLOYEE_NUMBER,
      unitStation: UNIT_STATION,
      authorisingManagerEmail: MANAGER_EMAIL,
    })

    const { fortnightEnding, document } = await seedWorkedDayTimesheetViaApi(page)
    await generateTimesheetViaApi(page, fortnightEnding, document as Record<string, unknown>)

    await page.goto('/')
    await expectTimesheetApprovalMailtoViaUi(page, {
      employeeName: name,
      authorisingManagerEmail: MANAGER_EMAIL,
      fortnightEnding,
      employeeNumber: EMPLOYEE_NUMBER,
      unitStation: UNIT_STATION,
      hasGeneratedSpreadsheet: true,
    })
  })
})
