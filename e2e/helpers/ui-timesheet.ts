import { expect, type Page } from '@playwright/test'

export async function fillTimesheetDayViaUi(
  page: Page,
  dayIndex = 0,
  opts?: { start?: string; end?: string },
) {
  const start = opts?.start ?? '08:00'
  const end = opts?.end ?? '16:00'

  await expect(page.getByRole('heading', { name: 'Timesheet' })).toBeVisible()
  await page.locator('.dateDropDown').nth(dayIndex).click()
  await page.locator(`#rosteredStart${dayIndex}`).fill(start)
  await page.locator(`#rosteredEnd${dayIndex}`).fill(end)
  await page.locator(`#date${dayIndex} .done-check`).check()
  await expect(page.locator('.dateRow').nth(dayIndex).locator('.day-tick')).toBeVisible()
}

export async function saveTimesheetViaUi(page: Page): Promise<string> {
  const saveResponse = page.waitForResponse(
    (res) => {
      if (res.request().method() !== 'PUT' || !res.ok()) return false
      const { pathname } = new URL(res.url())
      return /^\/api\/timesheets\/\d{4}-\d{2}-\d{2}$/.test(pathname)
    },
    { timeout: 30_000 },
  )
  await page.locator('#save-button').click()
  const response = await saveResponse
  const payload = (await response.json()) as { fortnightEnding: string }
  await expect(page.getByText('Timesheet saved.')).toBeVisible({ timeout: 15_000 })
  return payload.fortnightEnding
}

export async function generateTimesheetViaUi(page: Page): Promise<string> {
  const generate = page.locator('#generateButton')
  await expect(generate).toBeVisible()
  const generateResponse = page.waitForResponse(
    (res) => {
      if (res.request().method() !== 'POST' || !res.ok()) return false
      const { pathname } = new URL(res.url())
      return /^\/api\/timesheets\/\d{4}-\d{2}-\d{2}\/generate$/.test(pathname)
    },
    { timeout: 120_000 },
  )
  await generate.click()
  const response = await generateResponse
  const payload = (await response.json()) as {
    hasOutput: boolean
    fortnightEnding: string
  }
  expect(payload.hasOutput).toBe(true)

  await expect(page.getByText('Timesheet generated. You can download the spreadsheet.')).toBeVisible({
    timeout: 15_000,
  })

  const download = page.getByRole('link', { name: 'Download' })
  await expect(download).toBeVisible({ timeout: 15_000 })
  await expect(download).toHaveAttribute(
    'href',
    `/api/timesheets/${payload.fortnightEnding}/export`,
  )
  return payload.fortnightEnding
}

export async function saveAndGenerateTimesheetViaUi(page: Page) {
  await saveTimesheetViaUi(page)
  await generateTimesheetViaUi(page)
}
