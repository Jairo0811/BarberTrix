import type { Auth } from './types'

export const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8080'
export const authStorageKey = 'barbertrix.auth'

export class ApiClientError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
    public readonly correlationId?: string,
  ) {
    super(message)
    this.name = 'ApiClientError'
  }
}

type ApiErrorPayload = {
  code?: string
  message?: string
  correlationId?: string
  errors?: Record<string, string[]>
}

export function readAuth(): Auth | null {
  const raw = localStorage.getItem(authStorageKey) ?? sessionStorage.getItem(authStorageKey)
  if (!raw) return null
  try { return JSON.parse(raw) as Auth } catch { clearAuth(); return null }
}

export function writeAuth(auth: Auth, remember?: boolean) {
  const useLocal = remember ?? localStorage.getItem(authStorageKey) !== null
  localStorage.removeItem(authStorageKey)
  sessionStorage.removeItem(authStorageKey)
  ;(useLocal ? localStorage : sessionStorage).setItem(authStorageKey, JSON.stringify(auth))
  window.dispatchEvent(new CustomEvent('barbertrix-auth-changed', { detail: auth }))
}

export function clearAuth() {
  localStorage.removeItem(authStorageKey)
  sessionStorage.removeItem(authStorageKey)
}

async function readError(response: Response): Promise<ApiClientError> {
  const payload = await response.json().catch(() => null) as ApiErrorPayload | null
  const validation = payload?.errors ? Object.values(payload.errors).flat().join(' ') : null
  const correlationId = payload?.correlationId ?? response.headers.get('X-Correlation-ID') ?? undefined
  const message = payload?.message ?? validation ?? `Error ${response.status}`
  return new ApiClientError(message, response.status, payload?.code, correlationId)
}

async function refreshAuth(): Promise<Auth | null> {
  const response = await fetch(`${API_URL}/api/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
  })
  if (!response.ok) return null
  const next = await response.json() as Auth
  writeAuth(next)
  return next
}

export async function api<T>(path: string, init?: RequestInit, retry = true): Promise<T> {
  const auth = readAuth()
  if (!auth) throw new ApiClientError('Tu sesión expiró. Inicia sesión nuevamente.', 401, 'AUTH_SESSION_EXPIRED')

  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.accessToken}`, ...init?.headers },
  })

  if (response.status === 401 && retry) {
    const refreshed = await refreshAuth()
    if (refreshed) return api<T>(path, init, false)
    clearAuth()
    window.location.hash = '#/login'
    window.location.reload()
    throw new ApiClientError('Tu sesión expiró. Inicia sesión nuevamente.', 401, 'AUTH_SESSION_EXPIRED')
  }

  if (!response.ok) throw await readError(response)
  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

export async function publicApi<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  })
  if (!response.ok) throw await readError(response)
  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}
