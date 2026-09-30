import fs from 'node:fs'
import type http from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export const STATIC_ROOT = path.resolve(__dirname, '../../dist')

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
}

export function hasStaticUi(): boolean {
  return fs.existsSync(path.join(STATIC_ROOT, 'index.html'))
}

export function trySendStatic(req: http.IncomingMessage, res: http.ServerResponse): boolean {
  if (req.method !== 'GET' && req.method !== 'HEAD') return false
  if (!hasStaticUi()) return false

  let url = req.url?.split('?')[0] || '/'
  if (url === '/') url = '/index.html'
  const safe = path.normalize(url).replace(/^(\.\.[\\/])+/, '')
  const filePath = path.join(STATIC_ROOT, safe)
  if (!filePath.startsWith(STATIC_ROOT)) {
    res.writeHead(403).end()
    return true
  }

  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    const index = path.join(STATIC_ROOT, 'index.html')
    if (!fs.existsSync(index)) return false
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
    if (req.method === 'HEAD') {
      res.end()
      return true
    }
    res.end(fs.readFileSync(index))
    return true
  }

  const ext = path.extname(filePath)
  const type = MIME[ext] ?? 'application/octet-stream'
  res.writeHead(200, { 'Content-Type': type })
  if (req.method === 'HEAD') {
    res.end()
    return true
  }
  res.end(fs.readFileSync(filePath))
  return true
}
