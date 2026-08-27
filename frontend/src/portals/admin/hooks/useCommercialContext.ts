import { useCallback, useEffect, useState } from 'react'
import { api } from '../../../api'
import type { Capabilities, Shop } from '../commercialTypes'

export function useCommercialContext() {
  const [shop, setShop] = useState<Shop | null>(null)
  const [capabilities, setCapabilities] = useState<Capabilities | null>(null)

  const refresh = useCallback(async () => {
    const [nextShop, nextCapabilities] = await Promise.all([
      api<Shop>('/api/shop/settings'),
      api<Capabilities>('/api/capabilities'),
    ])
    setShop(nextShop)
    setCapabilities(nextCapabilities)
  }, [])

  useEffect(() => { void refresh().catch(() => undefined) }, [refresh])

  return { shop, capabilities, refresh }
}
