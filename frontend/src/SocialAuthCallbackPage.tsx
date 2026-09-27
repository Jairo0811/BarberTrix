import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import type { Auth } from './types'
import { publicApi, writeAuth } from './api'
import { consumePendingSocialAuth } from './socialOAuth'
import { useI18n } from './i18n'

export default function SocialAuthCallbackPage() {
  const { t } = useI18n()
  const location = useLocation()
  const [error, setError] = useState('')
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    started.current = true

    void (async () => {
      const code = new URLSearchParams(location.search).get('code')
      const pending = consumePendingSocialAuth()
      if (!code || !pending) {
        setError(t('login.socialExpired'))
        return
      }

      try {
        const auth = await publicApi<Auth>('/api/auth/oauth/exchange', {
          method: 'POST',
          body: JSON.stringify({ code, codeVerifier: pending.codeVerifier }),
        })
        writeAuth(auth, true)
        window.location.hash = auth.role === 'Client' ? '#/' : '#/login'
      } catch {
        setError(t('login.socialError'))
      }
    })()
  }, [location.search, t])

  return <main className="login-shell">
    <section className="login-card social-callback-card" aria-live="polite">
      <img src="/branding/barbertrix-logo.png" alt="BarberTrix" />
      {error ? (
        <>
          <p className="login-error" role="alert">{error}</p>
          <a className="demo-button" href="#/login">{t('login.socialBack')}</a>
        </>
      ) : (
        <>
          <span className="social-callback-spinner" aria-hidden="true" />
          <p className="login-subtitle">{t('login.socialCompleting')}</p>
        </>
      )}
    </section>
  </main>
}
