import { API_URL } from './api'

export type SocialAuthProvider = 'google' | 'apple'

const pendingKey = 'barbertrix.social.oauth.pending'
const maximumAgeMs = 10 * 60 * 1000

type PendingSocialAuth = {
  provider: SocialAuthProvider
  codeVerifier: string
  createdAt: number
}

export async function startSocialAuth(provider: SocialAuthProvider) {
  const codeVerifier = randomBase64Url(64)
  const codeChallenge = await sha256Base64Url(codeVerifier)
  const returnUri = `${window.location.origin}${window.location.pathname}#/auth-callback`

  sessionStorage.setItem(pendingKey, JSON.stringify({
    provider,
    codeVerifier,
    createdAt: Date.now(),
  } satisfies PendingSocialAuth))

  const url = `${API_URL}/api/auth/mobile/oauth/${provider}/start` +
    `?returnUri=${encodeURIComponent(returnUri)}` +
    `&codeChallenge=${encodeURIComponent(codeChallenge)}`
  window.location.assign(url)
}

export function consumePendingSocialAuth(): PendingSocialAuth | null {
  const raw = sessionStorage.getItem(pendingKey)
  sessionStorage.removeItem(pendingKey)
  if (!raw) return null

  try {
    const pending = JSON.parse(raw) as PendingSocialAuth
    if (!pending.codeVerifier || !pending.provider || Date.now() - pending.createdAt > maximumAgeMs)
      return null
    return pending
  } catch {
    return null
  }
}

function randomBase64Url(byteLength: number) {
  const bytes = crypto.getRandomValues(new Uint8Array(byteLength))
  return base64Url(bytes)
}

async function sha256Base64Url(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return base64Url(new Uint8Array(digest))
}

function base64Url(bytes: Uint8Array) {
  let binary = ''
  bytes.forEach(byte => { binary += String.fromCharCode(byte) })
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/g, '')
}
