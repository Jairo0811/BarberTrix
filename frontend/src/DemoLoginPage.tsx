import { useCallback, useEffect, useRef, useState } from 'react'
import type { Auth } from './types'
import { buildSupportEmailHref } from './support'
import './demo-login.css'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8080'
const authStorageKey = 'barberturn.auth'
const demoStorageKey = 'barberturn.demo'

const demoFeatures = [
  {
    icon: '◷',
    title: 'Gestionar turnos',
    text: 'Crea clientes en la fila y recorre los estados principales de atención.',
  },
  {
    icon: '♙',
    title: 'Probar barberos',
    text: 'Consulta disponibilidad, sillas y estados del equipo de trabajo.',
  },
  {
    icon: '✂',
    title: 'Explorar servicios',
    text: 'Visualiza y administra el catálogo disponible para generar turnos.',
  },
]

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
      sessionStorage.setItem(demoStorageKey, 'true')

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
    <main className="demo-login-page">
      <section className="demo-login-card" aria-labelledby="demo-login-title">
        <a className="demo-login-logo" href="#/" aria-label="Volver al inicio de BarberTurn">
          <img src="/branding/barberturn-logo.png" alt="BarberTurn" />
        </a>

        <span className="demo-login-badge">◎ EXPERIENCIA DE DEMOSTRACIÓN</span>

        <div className="demo-login-heading">
          <h1 id="demo-login-title">Explora BarberTurn sin crear una cuenta</h1>
          <p>
            Abriremos un entorno de prueba para que puedas recorrer el flujo operativo del sistema y entender cómo se gestiona una barbería desde BarberTurn.
          </p>
        </div>

        <div className="demo-feature-grid">
          {demoFeatures.map(feature => (
            <article className="demo-feature-card" key={feature.title}>
              <span aria-hidden="true">{feature.icon}</span>
              <strong>{feature.title}</strong>
              <small>{feature.text}</small>
            </article>
          ))}
        </div>

        <div className="demo-login-status" role="status" aria-live="polite">
          <span className="demo-login-status-icon" aria-hidden="true">{busy ? '↻' : '!'}</span>
          <div>
            <strong>{busy ? 'Preparando tu sesión demo…' : 'No pudimos abrir la demostración automáticamente'}</strong>
            <span>{busy ? 'Conectando con el entorno de prueba de BarberTurn.' : 'Puedes reintentar el acceso, volver al login o contactar soporte.'}</span>
          </div>
        </div>

        {error && <p className="demo-login-error" role="alert">{error}</p>}

        {!busy && (
          <>
            <div className="demo-login-actions">
              <button className="demo-login-primary" type="button" onClick={() => void loginAsDemo()}>
                Reintentar acceso demo
              </button>
              <a className="demo-login-secondary" href="#/login">Volver al login</a>
            </div>
            <a className="recovery-support-link" href={buildSupportEmailHref('[BarberTurn] Problema con acceso demo')}>
              Contactar soporte
            </a>
          </>
        )}

        <p className="demo-login-note">
          Esta sesión usa datos de demostración y se guarda únicamente durante la sesión actual del navegador.
        </p>
      </section>
    </main>
  )
}
