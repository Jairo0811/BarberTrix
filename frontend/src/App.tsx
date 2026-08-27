import { FormEvent, lazy, Suspense, useEffect, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowLeft, faEnvelope, faEye, faEyeSlash, faFlask, faLock } from '@fortawesome/free-solid-svg-icons'
import type { Auth } from './types'
import { useI18n } from './i18n'
import { API_URL, api, clearAuth, readAuth, writeAuth } from './api'
import SubscriptionBanner from './SubscriptionBanner'

const demoStorageKey = 'barberturn.demo'
const DashboardView = lazy(() => import('./DashboardView'))
const BarberPortal = lazy(() => import('./BarberPortal'))

function BarberTurnLogo() {
  return (
    <div className="official-logo" aria-label="BarberTurn">
      <img src="/branding/barberturn-logo.png" alt="BarberTurn" />
    </div>
  )
}

export default function App() {
  const { t } = useI18n()
  const [auth, setAuth] = useState<Auth | null>(readAuth)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const isDemo = sessionStorage.getItem(demoStorageKey) === 'true'

  useEffect(() => {
    if (auth) document.title = `${isDemo ? t('route.demo') : auth.role === 'Barber' ? 'Mi jornada' : 'Panel'} | BarberTurn`
  }, [auth, isDemo, t])

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError('')

    const data = new FormData(event.currentTarget)

    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: data.get('email'), password: data.get('password') }),
      })

      if (!response.ok) throw new Error(t('login.invalid'))

      const nextAuth = await response.json() as Auth
      const remember = data.get('remember') === 'on'

      sessionStorage.removeItem(demoStorageKey)
      writeAuth(nextAuth, remember)
      setAuth(nextAuth)
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : t('login.genericError'))
    } finally {
      setBusy(false)
    }
  }

  function logout() {
    void fetch(`${API_URL}/api/auth/logout`, { method: 'POST', credentials: 'include' })
    clearAuth()
    sessionStorage.removeItem(demoStorageKey)
    setAuth(null)
    window.location.hash = '#/login'
  }

  async function resendVerification() {
    setBusy(true); setError('')
    try { await api('/api/auth/send-verification', { method: 'POST' }); setError('Te enviamos un enlace nuevo. Revisa también tu carpeta de spam.') }
    catch (exception) { setError(exception instanceof Error ? exception.message : 'No se pudo reenviar el enlace.') }
    finally { setBusy(false) }
  }

  if (auth && !auth.isEmailVerified) return <main className="login-shell"><section className="login-card">
    <BarberTurnLogo /><h1>Verifica tu correo</h1><p className="login-subtitle">Antes de abrir el panel, confirma el enlace que enviamos a tu correo. El enlace vence en 24 horas.</p>
    <button className="login-submit" disabled={busy} onClick={() => void resendVerification()}>{busy ? 'Enviando…' : 'Reenviar enlace'}</button>
    <button className="demo-button" type="button" onClick={logout}>Cerrar sesión</button>
    {error && <p className="login-error" role="status">{error}</p>}
  </section></main>

  if (auth?.role === 'Barber') return <Suspense fallback={<main className="login-shell"><p>Cargando portal del barbero…</p></main>}><BarberPortal auth={auth} onLogout={logout} /></Suspense>

  if (auth) return <>
    <SubscriptionBanner auth={auth} isDemo={isDemo} />
    <Suspense fallback={<main className="login-shell"><p>Cargando panel…</p></main>}><DashboardView auth={auth} isDemo={isDemo} onLogout={logout} /></Suspense>
  </>

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
