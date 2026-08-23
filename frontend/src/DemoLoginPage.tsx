import { useCallback, useEffect, useRef, useState } from 'react'
import './auth-recovery.css'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8080'
const authStorageKey = 'barberturn.auth'

type Auth = {
  accessToken: string
  expiresAtUtc: string
  userId: string
  barberShopId: string
  name: string
  role: string
}

export default function DemoLoginPage() {
  const [busy, setBusy] = useState(true)
  const [error, setError] = useState('')
  const started = useRef(false)

  const loginAsDemo = useCallback(async () => {
    setBusy(true)
    setError('')

    try {
      const response = await fetch(`${API_URL}/api/auth/demo-login`, {
        method: 'POST',
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        throw new Error(payload?.detail ?? payload?.message ?? 'El usuario demo no está disponible.')
      }

      const auth = await response.json() as Auth

      localStorage.removeItem(authStorageKey)
      sessionStorage.removeItem(authStorageKey)
      sessionStorage.setItem(authStorageKey, JSON.stringify(auth))

      window.location.hash = '#/login'
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : 'No se pudo iniciar la sesión demo.')
      setBusy(false)
    }
  }, [])

  useEffect(() => {
    if (started.current) return
    started.current = true
    void loginAsDemo()
  }, [loginAsDemo])

  return (
    <main className="recovery-page">
      <section className="recovery-card" aria-labelledby="demo-login-title">
        <a className="recovery-logo" href="#/" aria-label="Volver al inicio de BarberTurn">
          <img src="/branding/barberturn-logo.png" alt="BarberTurn" />
        </a>

        <div className="recovery-icon" aria-hidden="true">◎</div>
        <h1 id="demo-login-title">Usuario demo</h1>
        <p className="recovery-description">
          {busy
            ? 'Preparando un entorno de demostración de BarberTurn…'
            : 'No pudimos abrir la demostración automáticamente.'}
        </p>

        {error && <p className="recovery-error" role="alert">{error}</p>}

        {!busy && (
          <button className="recovery-primary" type="button" onClick={() => void loginAsDemo()}>
            Reintentar acceso demo
          </button>
        )}
      </section>
    </main>
  )
}
