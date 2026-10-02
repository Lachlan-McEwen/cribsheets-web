import { defineConfig, devices } from '@playwright/test'

const e2ePort = 5174
const e2eApiPort = 3850
const baseURL = `http://localhost:${e2ePort}`

export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.ts',
  globalTeardown: './e2e/global-teardown.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // Shared e2e SQLite + email log hooks; parallel workers race on clearEmailLogs.
  workers: 1,
  reporter: process.env.CI ? 'github' : 'html',
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'setup',
      testMatch: /e2e\.setup\.ts/,
    },
    {
      name: 'chromium',
      dependencies: ['setup'],
      testIgnore: /e2e\.setup\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: `concurrently -n api,ui -c magenta,cyan "npm run dev:api" "vite --port ${e2ePort}"`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      ...process.env,
      PORT: String(e2eApiPort),
      VITE_API_PROXY: `http://localhost:${e2eApiPort}`,
      E2E_TEST_HOOKS: 'true',
      E2E_TEST_SECRET: process.env.E2E_TEST_SECRET ?? 'playwright-e2e-secret',
      LEGACY_API_SECRET: process.env.LEGACY_API_SECRET ?? 'playwright-legacy-api-secret',
      DATA_DIR: 'data-e2e',
      ALLOW_REGISTRATION: 'true',
      PUBLIC_APP_URL: baseURL,
    },
  },
})
