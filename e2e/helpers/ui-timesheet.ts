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

export async function saveAndGenerateTimesheetViaUi(page: Page) {
  await page.locator('#save-button').click()
  await expect(page.getByText('Timesheet saved.')).toBeVisible({ timeout: 15_000 })

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
    document: { days: { done?: boolean }[] }
  }
  expect(payload.hasOutput).toBe(true)
  expect(payload.document.days.some((d) => d.done)).toBe(true)

  await expect(page.getByText('Timesheet generated. You can download the spreadsheet.')).toBeVisible({
    timeout: 15_000,
  })

  const exportRes = await page.request.get(`/api/timesheets/${payload.fortnightEnding}/export`)
  expect(exportRes.ok()).toBeTruthy()
  expect(exportRes.headers()['content-type']).toMatch(/spreadsheet|excel|macro/i)
}
