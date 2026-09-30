import dotenv from 'dotenv'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export function loadEnvFiles(): void {
  const candidates = [
    path.resolve(__dirname, '../.env'),
    path.resolve(process.cwd(), 'api', '.env'),
    path.resolve(process.cwd(), '.env'),
  ]
  for (const envPath of candidates) {
    if (!fs.existsSync(envPath)) continue
    dotenv.config({ path: envPath })
  }
}
