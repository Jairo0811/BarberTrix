import { FormEvent, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowLeft, faEnvelope, faEye, faEyeSlash, faFlask, faLock } from '@fortawesome/free-solid-svg-icons'
import DashboardView from './DashboardView'
import type { Auth } from './types'

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
  const [auth, setAuth] = useState<Auth | null>(getStoredAuth)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const isDemo = sessionStorage.getItem(demoStorageKey) === 'true'

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError('')

    const data = new FormData(event.currentTarget)

    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: data.get('email'),
          password: data.get('password'),
        }),
      })

      if (!response.ok) {
        throw new Error('Correo o contraseña incorrectos.')
      }

      const nextAuth = await response.json() as Auth
      const remember = data.get('remember') === 'on'

      localStorage.removeItem(authStorageKey)
      sessionStorage.removeItem(authStorageKey)
      sessionStorage.removeItem(demoStorageKey)
      ;(remember ? localStorage : sessionStorage).setItem(authStorageKey, JSON.stringify(nextAuth))

      setAuth(nextAuth)
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : 'No se pudo iniciar sesión.')
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

  if (auth) {
    return <DashboardView auth={auth} isDemo={isDemo} onLogout={logout} />
  }

  return (
    <main className="login-shell login-split">
      <section className="login-panel">
        <div className="login-card">
          <a className="back-home-link" href="#/">
            <span className="back-home-icon" aria-hidden="true"><FontAwesomeIcon icon={faArrowLeft} /></span>
            Volver al inicio
          </a>

          <BarberTurnLogo />
          <h2>Bienvenido de nuevo</h2>
          <p className="login-subtitle">Inicia sesión para continuar</p>

          <form className="login-form" onSubmit={login}>
            <label className="login-field">
              <span>Correo electrónico</span>
              <div className="input-wrap">
                <span className="field-icon" aria-hidden="true"><FontAwesomeIcon icon={faEnvelope} /></span>
                <input
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="ejemplo@barberia.com"
                  required
                />
              </div>
            </label>

            <label className="login-field">
              <span>Contraseña</span>
              <div className="input-wrap">
                <span className="field-icon" aria-hidden="true"><FontAwesomeIcon icon={faLock} /></span>
                <input
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••••••"
                  required
                />
                <button
                  className="password-toggle"
                  type="button"
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  onClick={() => setShowPassword(value => !value)}
                >
                  <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} aria-hidden="true" />
                  <span>{showPassword ? 'Ocultar' : 'Ver'}</span>
                </button>
              </div>
            </label>

            <div className="login-options">
              <label className="remember-option">
                <input name="remember" type="checkbox" defaultChecked />
                <span>Recordarme</span>
              </label>

              <a className="forgot-link" href="#/forgot-password">
                ¿Olvidaste tu contraseña?
              </a>
            </div>

            <button className="login-submit" disabled={busy}>
              {busy ? 'Ingresando…' : 'Iniciar sesión'}
            </button>
          </form>

          <div className="login-separator"><span>o continúa con</span></div>

          <button
            className="demo-button"
            type="button"
            onClick={() => { window.location.hash = '#/demo' }}
          >
            <FontAwesomeIcon icon={faFlask} aria-hidden="true" />
            <span>Explorar BarberTurn en modo demo</span>
          </button>

          <p className="register-copy">¿No tienes cuenta? <span>Regístrate aquí</span></p>
          {error && <p className="login-error" role="alert">{error}</p>}
        </div>
      </section>
    </main>
  )
}
