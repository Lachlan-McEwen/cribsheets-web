import { test as setup } from '@playwright/test'
import { bootstrapE2eApi } from './helpers/email-logs'

setup('bootstrap e2e api', async ({ request }) => {
  await bootstrapE2eApi(request)
})
