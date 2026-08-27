import { useCallback, useEffect, useRef, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faClock, faFlask, faRotate, faScissors, faTriangleExclamation, faUserTie } from '@fortawesome/free-solid-svg-icons'
import type { Auth } from './types'
import { buildSupportEmailHref } from './support'
import { useI18n } from './i18n'
import './demo-login.css'
import { API_URL, clearAuth, writeAuth } from './api'

const demoStorageKey = 'barberturn.demo'

export default function DemoLoginPage() {
  const { t } = useI18n()
  const [busy, setBusy] = useState(true)
  const [error, setError] = useState('')
  const [isTakingLong, setIsTakingLong] = useState(false)
  const started = useRef(false)

  const demoFeatures = [
    { icon: faClock, title: t('demo.feature.turns.title'), text: t('demo.feature.turns.text') },
    { icon: faUserTie, title: t('demo.feature.barbers.title'), text: t('demo.feature.barbers.text') },
    { icon: faScissors, title: t('demo.feature.services.title'), text: t('demo.feature.services.text') },
  ]

  const loginAsDemo = useCallback(async () => {
    setBusy(true)
    setError('')
    setIsTakingLong(false)

    try {
      const response = await fetch(`${API_URL}/api/auth/demo-login`, { method: 'POST', credentials: 'include' })

      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        throw new Error(payload?.detail ?? payload?.message ?? t('login.genericError'))
      }

      const auth = await response.json() as Auth
      clearAuth()
      writeAuth(auth, false)
      sessionStorage.setItem(demoStorageKey, 'true')
      window.location.hash = '#/login'
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : t('login.genericError'))
      setBusy(false)
    }
  }, [t])

  useEffect(() => {
    if (started.current) return
    started.current = true
    void loginAsDemo()
  }, [loginAsDemo])

  useEffect(() => {
    if (!busy) {
      setIsTakingLong(false)
      return
    }

    const timer = window.setTimeout(() => setIsTakingLong(true), 5000)
    return () => window.clearTimeout(timer)
  }, [busy])

  return (
    <main className="demo-login-page">
      <section className="demo-login-card" aria-labelledby="demo-login-title">
        <a className="demo-login-logo" href="#/" aria-label={t('common.backHome')}>
          <img src="/branding/barberturn-logo.png" alt="BarberTurn" />
        </a>

        <span className="demo-login-badge"><FontAwesomeIcon icon={faFlask} /> {t('demo.badge')}</span>

        <div className="demo-login-heading">
          <h1 id="demo-login-title">{t('demo.title')}</h1>
          <p>{t('demo.description')}</p>
        </div>

        <div className="demo-feature-grid">
          {demoFeatures.map(feature => (
            <article className="demo-feature-card" key={feature.title}>
              <span aria-hidden="true"><FontAwesomeIcon icon={feature.icon} /></span>
              <strong>{feature.title}</strong>
              <small>{feature.text}</small>
            </article>
          ))}
        </div>

        <div className="demo-login-status" role="status" aria-live="polite">
          <span className={`demo-login-status-icon${busy ? ' loading' : ' error'}`} aria-hidden="true">
            <FontAwesomeIcon icon={busy ? faRotate : faTriangleExclamation} spin={busy} />
          </span>
          <div>
            <strong>{busy ? t('demo.preparing') : t('demo.failed')}</strong>
            <span>{busy ? (isTakingLong ? t('demo.slow') : t('demo.connecting')) : t('demo.failedText')}</span>
          </div>
        </div>

        {isTakingLong && busy && <a className="demo-login-cancel-link" href="#/">{t('common.backHome')}</a>}
        {error && <p className="demo-login-error" role="alert">{error}</p>}

        {!busy && (
          <>
            <div className="demo-login-actions">
              <button className="demo-login-primary" type="button" onClick={() => void loginAsDemo()}>
                <FontAwesomeIcon icon={faRotate} /> {t('demo.retry')}
              </button>
              <a className="demo-login-secondary" href="#/login">{t('demo.backLogin')}</a>
            </div>
            <a className="recovery-support-link" href={buildSupportEmailHref('[BarberTurn] Demo access problem')}>
              {t('common.support')}
            </a>
          </>
        )}

        <p className="demo-login-note">{t('demo.note')}</p>
      </section>
    </main>
  )
}
