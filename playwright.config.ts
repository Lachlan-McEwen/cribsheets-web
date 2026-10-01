import { defineConfig, devices } from '@playwright/test'

const baseURL = 'http://localhost:5173'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'github' : 'html',
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      ...process.env,
      EMAIL_SEND_MODE: 'log',
      E2E_TEST_HOOKS: 'true',
      E2E_TEST_SECRET: process.env.E2E_TEST_SECRET ?? 'playwright-e2e-secret',
      DATA_DIR: 'api/data-e2e',
      ALLOW_REGISTRATION: 'true',
      PUBLIC_APP_URL: baseURL,
    },
  },
})
