import { useEffect, useRef } from 'react'

// This is the public site key; the secret is kept exclusively by the API.
export const turnstileSiteKey = (import.meta.env.VITE_TURNSTILE_SITE_KEY ?? '').trim()

type TurnstileApi = {
  render(container: HTMLElement, options: {
    sitekey: string
    callback: (token: string) => void
    'expired-callback': () => void
    'error-callback': () => void
  }): string
  remove(widgetId: string): void
}
declare global {
  interface Window { turnstile?: TurnstileApi }
}

export default function TurnstileWidget({ onToken }: { onToken(token: string): void }) {
  const container = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!turnstileSiteKey) return
    let active = true
    let widgetId: string | undefined
    let script = document.querySelector<HTMLScriptElement>('script[data-barbertrix-turnstile]')
    const render = () => {
      if (!active || widgetId !== undefined || !container.current || !window.turnstile) return
      widgetId = window.turnstile.render(container.current, {
        sitekey: turnstileSiteKey,
        callback: onToken,
        'expired-callback': () => onToken(''),
        'error-callback': () => onToken(''),
      })
    }
    const failed = () => onToken('')
    if (!script && !window.turnstile) {
      script = document.createElement('script')
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
      script.async = true
      script.defer = true
      script.dataset.barbertrixTurnstile = 'true'
      document.head.appendChild(script)
    }
    script?.addEventListener('load', render)
    script?.addEventListener('error', failed)
    render()
    return () => {
      active = false
      script?.removeEventListener('load', render)
      script?.removeEventListener('error', failed)
      if (widgetId !== undefined) window.turnstile?.remove(widgetId)
    }
  }, [onToken])

  if (!turnstileSiteKey) return null
  return <div className="barbertrix-turnstile" ref={container} aria-label="Verificación de seguridad" />
}
