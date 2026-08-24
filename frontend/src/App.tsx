import { FormEvent, useEffect, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowLeft, faEnvelope, faEye, faEyeSlash, faFlask, faLock } from '@fortawesome/free-solid-svg-icons'
import DashboardView from './DashboardView'
import type { Auth } from './types'
import { useI18n } from './i18n'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8080'
const authStorageKey = 'barberturn.auth'
const demoStorageKey = 'barberturn.demo'

function getStoredAuth(): Auth | null {
  const value = localStorage.getItem(authStorageKey) ?? sessionStorage.getItem(authStorageKey)
  return value ? JSON.parse(value) as Auth : null
}

function BarberTurnLogo() {
  return (
    <div className="official-logo" aria-label="BarberTurn">
      <img src="/branding/barberturn-logo.png" alt="BarberTurn" />
    </div>
  )
}

export default function App() {
  const { t } = useI18n()
  const [auth, setAuth] = useState<Auth | null>(getStoredAuth)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const isDemo = sessionStorage.getItem(demoStorageKey) === 'true'

  useEffect(() => {
    if (auth) document.title = `${isDemo ? t('route.demo') : 'Panel'} | BarberTurn`
  }, [auth, isDemo, t])

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError('')

    const data = new FormData(event.currentTarget)

    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: data.get('email'), password: data.get('password') }),
      })

      if (!response.ok) throw new Error(t('login.invalid'))

      const nextAuth = await response.json() as Auth
      const remember = data.get('remember') === 'on'

      localStorage.removeItem(authStorageKey)
      sessionStorage.removeItem(authStorageKey)
      sessionStorage.removeItem(demoStorageKey)
      ;(remember ? localStorage : sessionStorage).setItem(authStorageKey, JSON.stringify(nextAuth))
      setAuth(nextAuth)
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : t('login.genericError'))
    } finally {
      setBusy(false)
    }
  }

  function logout() {
    localStorage.removeItem(authStorageKey)
    sessionStorage.removeItem(authStorageKey)
    sessionStorage.removeItem(demoStorageKey)
    setAuth(null)
    window.location.hash = '#/login'
  }

  if (auth) return <DashboardView auth={auth} isDemo={isDemo} onLogout={logout} />

  return (
    <main className="login-shell login-split" aria-labelledby="login-title">
      <section className="login-panel">
        <div className="login-card">
          <a className="back-home-link" href="#/">
            <span className="back-home-icon" aria-hidden="true"><FontAwesomeIcon icon={faArrowLeft} /></span>
            {t('common.backHome')}
          </a>

          <BarberTurnLogo />
          <h1 id="login-title">{t('login.welcome')}</h1>
          <p className="login-subtitle">{t('login.subtitle')}</p>

          <form
            className="login-form"
            onSubmit={login}
            aria-busy={busy}
            aria-describedby={error ? 'login-error' : undefined}
          >
            <label className="login-field">
              <span>{t('common.email')}</span>
              <div className="input-wrap">
                <span className="field-icon" aria-hidden="true"><FontAwesomeIcon icon={faEnvelope} /></span>
                <input name="email" type="email" autoComplete="email" inputMode="email" placeholder="ejemplo@barberia.com" required />
              </div>
            </label>

            <label className="login-field">
              <span>{t('common.password')}</span>
              <div className="input-wrap">
                <span className="field-icon" aria-hidden="true"><FontAwesomeIcon icon={faLock} /></span>
                <input name="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" placeholder="••••••••••••" required />
                <button
                  className="password-toggle"
                  type="button"
                  aria-label={showPassword ? t('common.hide') : t('common.show')}
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword(value => !value)}
                >
                  <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} aria-hidden="true" />
                  <span>{showPassword ? t('common.hide') : t('common.show')}</span>
                </button>
              </div>
            </label>

            <div className="login-options">
              <label className="remember-option">
                <input name="remember" type="checkbox" defaultChecked />
                <span>{t('login.remember')}</span>
              </label>
              <a className="forgot-link" href="#/forgot-password">{t('login.forgot')}</a>
            </div>

            <button className="login-submit" type="submit" disabled={busy}>
              {busy ? t('login.submitting') : t('login.submit')}
            </button>
          </form>

          <div className="login-separator" aria-hidden="true"><span>{t('login.separator')}</span></div>

          <button className="demo-button" type="button" onClick={() => { window.location.hash = '#/demo' }}>
            <FontAwesomeIcon icon={faFlask} aria-hidden="true" />
            <span>{t('login.demo')}</span>
          </button>

          <p className="register-copy">
            {t('login.noAccount')} <a className="register-link" href="#/register">{t('login.registerHere')}</a>
          </p>
          {error && <p id="login-error" className="login-error" role="alert" aria-live="assertive">{error}</p>}
        </div>
      </section>
    </main>
  )
}
