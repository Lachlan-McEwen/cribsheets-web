import type http from 'node:http'

export function json(
  res: http.ServerResponse,
  status: number,
  body: unknown,
  extraHeaders?: Record<string, string>,
): void {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json; charset=utf-8',
    ...extraHeaders,
  }
  res.writeHead(status, headers)
  res.end(JSON.stringify(body))
}

export async function readJson<T>(req: http.IncomingMessage): Promise<T> {
  const chunks: Buffer[] = []
  for await (const chunk of req) chunks.push(chunk as Buffer)
  const text = Buffer.concat(chunks).toString('utf8')
  if (!text) return {} as T
  return JSON.parse(text) as T
}

export function isValidUserId(userId: string | undefined): boolean {
  if (!userId?.trim()) return false
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userId)
}
