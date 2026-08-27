import type { Auth } from './types'

export const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8080'
export const authStorageKey = 'barberturn.auth'

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
  window.dispatchEvent(new CustomEvent('barberturn-auth-changed', { detail: auth }))
}

export function clearAuth() {
  localStorage.removeItem(authStorageKey)
  sessionStorage.removeItem(authStorageKey)
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
  if (!auth) throw new Error('Tu sesión expiró. Inicia sesión nuevamente.')
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
    throw new Error('Tu sesión expiró. Inicia sesión nuevamente.')
  }
  if (!response.ok) {
    const error = await response.json().catch(() => null)
    const validation = error?.errors ? Object.values(error.errors).flat().join(' ') : null
    throw new Error(error?.message ?? validation ?? `Error ${response.status}`)
  }
  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}
