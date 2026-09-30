const jsonHeaders = { Accept: 'application/json', 'Content-Type': 'application/json' }

export type ApiUser = {
  id: string
  email: string
  name: string
  isAdmin: boolean
  employeeNumber: string
  unitStation: string
  casual: boolean
  isCountryEmployee: boolean
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    credentials: 'include',
    ...init,
    headers: { ...jsonHeaders, ...init?.headers },
  })
  const body = (await res.json().catch(() => ({}))) as T & { error?: string }
  if (!res.ok) {
    throw new Error(body.error ?? res.statusText)
  }
  return body as T
}

export function getHealth() {
  return apiFetch<{ ok: boolean }>('/api/health')
}

export function getMe() {
  return apiFetch<{ user: ApiUser }>('/api/auth/me')
}

export function login(email: string, password: string) {
  return apiFetch<{ user: ApiUser }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

export function register(name: string, email: string, password: string) {
  return apiFetch<{ user: ApiUser }>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password }),
  })
}

export function getRegistrationOpen() {
  return apiFetch<{ open: boolean }>('/api/auth/registration')
}

export function logout() {
  return apiFetch<{ ok: boolean }>('/api/auth/logout', { method: 'POST' })
}
