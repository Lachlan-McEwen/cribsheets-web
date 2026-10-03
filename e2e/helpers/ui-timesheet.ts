import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { expect, type Page } from '@playwright/test'

export type ExpectApprovalMailtoOpts = {
  employeeName: string
  authorisingManagerEmail?: string
  fortnightEnding: string
  employeeNumber: string
  unitStation: string
  hasGeneratedSpreadsheet: boolean
}

function parseMailtoParams(href: string): URLSearchParams {
  expect(href.startsWith('mailto:?')).toBeTruthy()
  return new URLSearchParams(href.slice('mailto:?'.length))
}

export async function expectTimesheetApprovalMailtoViaUi(page: Page, opts: ExpectApprovalMailtoOpts) {
  const link = page.locator('#emailApprovalButton')
  await expect(link).toBeVisible()
  await expect(link).toHaveText('Email for approval')

  const href = await link.getAttribute('href')
  expect(href).toBeTruthy()
  const params = parseMailtoParams(href!)

  if (opts.authorisingManagerEmail) {
    expect(params.get('to')).toBe(opts.authorisingManagerEmail.trim().toLowerCase())
  }

  const subject = params.get('subject') ?? ''
  expect(subject).toContain('Timesheet for approval')
  expect(subject).toContain(opts.employeeName)

  const body = params.get('body') ?? ''
  expect(body).toBe('')

  if (opts.hasGeneratedSpreadsheet) {
    await expect(page.getByRole('link', { name: 'Download' })).toBeVisible()
  } else {
    await expect(page.locator('#generateButton')).toBeVisible()
  }
}

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

export async function downloadTimesheetViaUi(page: Page): Promise<string> {
  const link = page.getByRole('link', { name: 'Download' })
  await expect(link).toBeVisible({ timeout: 15_000 })

  const downloadPromise = page.waitForEvent('download', { timeout: 30_000 })
  await link.click()
  const download = await downloadPromise

  expect(download.suggestedFilename()).toMatch(/\.xlsm$/i)

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cribsheets-e2e-dl-'))
  const filePath = path.join(dir, download.suggestedFilename())
  await download.saveAs(filePath)

  const stat = fs.statSync(filePath)
  expect(stat.size).toBeGreaterThan(10_000)
  return filePath
}

export async function saveAndGenerateTimesheetViaUi(page: Page) {
  await saveTimesheetViaUi(page)
  await generateTimesheetViaUi(page)
}
