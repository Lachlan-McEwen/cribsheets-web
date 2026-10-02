import { resetE2eDataOnDisk } from './helpers/reset-e2e-data'

export default async function globalSetup() {
  resetE2eDataOnDisk()
}
