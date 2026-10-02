import { resetE2eDataOnDisk } from './helpers/reset-e2e-data'

export default async function globalTeardown() {
  resetE2eDataOnDisk()
}
