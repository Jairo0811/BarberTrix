import { useCallback, useEffect, useState } from 'react'
import { api } from '../../../api'
import type { Capabilities, Shop } from '../commercialTypes'

const requestTimeoutMs = 10_000

async function withTimeout<T>(request: (signal: AbortSignal) => Promise<T>): Promise<T> {
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), requestTimeoutMs)
  try {
    return await request(controller.signal)
  } finally {
    window.clearTimeout(timer)
  }
}

export function useCommercialContext() {
  const [shop, setShop] = useState<Shop | null>(null)
  const [capabilities, setCapabilities] = useState<Capabilities | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)

    const [shopResult, capabilitiesResult] = await Promise.allSettled([
      withTimeout(signal => api<Shop>('/api/shop/settings', { signal })),
      withTimeout(signal => api<Capabilities>('/api/capabilities', { signal })),
    ])

    if (shopResult.status === 'fulfilled') setShop(shopResult.value)
    if (capabilitiesResult.status === 'fulfilled') setCapabilities(capabilitiesResult.value)

    const failed: string[] = []
    if (shopResult.status === 'rejected') failed.push('configuración de la barbería')
    if (capabilitiesResult.status === 'rejected') failed.push('uso del plan')
    if (failed.length > 0) setError(`No se pudo cargar ${failed.join(' y ')}.`)

    setLoading(false)
  }, [])

  useEffect(() => { void refresh() }, [refresh])

  return { shop, capabilities, loading, error, refresh }
}
