import { useState } from 'react'
import { API_URL } from './api'

export function barberPhotoUrl(shopId: string, barberId: string, version = 0) {
  return `${API_URL}/api/public/shop-media/${shopId}/barber-${barberId.replace(/-/g, '')}${version ? `?v=${version}` : ''}`
}

type Props = { shopId?: string | null; barberId: string; name: string; version?: number; className?: string }

/** Barber portrait with an initial as fallback (no photo uploaded yet, or the image failed to load). */
export function BarberAvatar({ shopId, barberId, name, version = 0, className = 'choice-avatar' }: Props) {
  const [failedKey, setFailedKey] = useState('')
  const key = `${shopId}:${barberId}:${version}`
  const initial = name.trim().charAt(0).toUpperCase()
  if (!shopId || failedKey === key) return <span className={className} aria-hidden="true">{initial}</span>
  return <span className={className} aria-hidden="true">
    <img src={barberPhotoUrl(shopId, barberId, version)} alt="" loading="lazy" decoding="async" onError={() => setFailedKey(key)} />
  </span>
}
