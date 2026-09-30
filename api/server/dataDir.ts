import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadEnvFiles } from './env.js'

loadEnvFiles()

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export const DATA_DIR = (() => {
  const fromEnv = process.env.DATA_DIR?.trim()
  if (fromEnv) return path.resolve(fromEnv)
  return path.resolve(__dirname, '../data')
})()

export const DB_PATH = path.join(DATA_DIR, 'cribsheets.sqlite')
