import { FormEvent, useState } from 'react'
import './register.css'

type AuthResponse = {
  accessToken: string
  expiresAtUtc: string
  userId: string
  barberShopId: string
  name: string
  role: string
}

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8080'
const authStorageKey = 'barberturn.auth'

const benefits = [
  'Gestiona turnos fácilmente',
  'Organiza tus barberos y servicios',
  'Mejora la experiencia de tus clientes',
  'Reportes y estadísticas de tu negocio',
]

function buildShopSlug(name: string) {
  const normalized = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 36)

  return `${normalized || 'barberia'}-${crypto.randomUUID().slice(0, 6)}`
}

export default function RegisterPage() {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)

  async function register(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError('')

    const data = new FormData(event.currentTarget)
    const name = String(data.get('name') ?? '').trim()
    const email = String(data.get('email') ?? '').trim()
    const password = String(data.get('password') ?? '')
    const confirmPassword = String(data.get('confirmPassword') ?? '')

    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.')
      setBusy(false)
      return
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.')
      setBusy(false)
      return
    }

    try {
      const response = await fetch(`${API_URL}/api/auth/register-owner`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          barberShopName: `Barbería de ${name}`,
          barberShopSlug: buildShopSlug(name),
          name,
          email,
          password,
        }),
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        throw new Error(payload?.message ?? 'No se pudo crear la cuenta. Verifica la información e inténtalo de nuevo.')
      }

      const auth = await response.json() as AuthResponse
      localStorage.setItem(authStorageKey, JSON.stringify(auth))
      sessionStorage.removeItem(authStorageKey)
      window.location.hash = '#/login'
      window.location.reload()
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : 'No se pudo crear la cuenta.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="register-page" aria-labelledby="register-title">
      <section className="register-showcase" aria-label="Beneficios de BarberTurn">
        <div className="register-showcase-overlay" aria-hidden="true" />
        <div className="register-brand">
          <img src="/branding/barberturn-logo.png" alt="BarberTurn" />
        </div>

        <div className="register-copy-block">
          <p>Únete a BarberTurn y lleva tu barbería al siguiente nivel.</p>
          <div className="register-benefits">
            {benefits.map((benefit, index) => (
              <article key={benefit}>
                <span aria-hidden="true">{index + 1}</span>
                <strong>{benefit}</strong>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="register-panel">
        <div className="register-card">
          <header>
            <h1 id="register-title">Crear cuenta</h1>
            <p>Completa la información para crear tu cuenta</p>
          </header>

          <span id="register-password-requirements" className="visually-hidden">
            La contraseña debe tener al menos 8 caracteres.
          </span>

          <form
            className="register-form"
            onSubmit={register}
            aria-busy={busy}
            aria-describedby={error ? 'register-error' : undefined}
          >
            <label>
              <span>Nombre completo</span>
              <div className="register-input-wrap">
                <span className="register-field-icon" aria-hidden="true">♙</span>
                <input name="name" type="text" autoComplete="name" placeholder="Tu nombre completo" required />
              </div>
            </label>

            <label>
              <span>Correo electrónico</span>
              <div className="register-input-wrap">
                <span className="register-field-icon" aria-hidden="true">✉</span>
                <input name="email" type="email" autoComplete="email" inputMode="email" placeholder="ejemplo@barberia.com" required />
              </div>
            </label>

            <label>
              <span>Contraseña</span>
              <div className="register-input-wrap">
                <span className="register-field-icon" aria-hidden="true">♙</span>
                <input
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  minLength={8}
                  aria-describedby="register-password-requirements"
                  placeholder="Mínimo 8 caracteres"
                  required
                />
                <button
                  type="button"
                  className="register-password-toggle"
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword(value => !value)}
                >
                  {showPassword ? 'Ocultar' : 'Ver'}
                </button>
              </div>
            </label>

            <label>
              <span>Confirmar contraseña</span>
              <div className="register-input-wrap">
                <span className="register-field-icon" aria-hidden="true">♙</span>
                <input
                  name="confirmPassword"
                  type={showConfirmation ? 'text' : 'password'}
                  autoComplete="new-password"
                  minLength={8}
                  aria-describedby="register-password-requirements"
                  placeholder="Repite tu contraseña"
                  required
                />
                <button
                  type="button"
                  className="register-password-toggle"
                  aria-label={showConfirmation ? 'Ocultar confirmación de contraseña' : 'Mostrar confirmación de contraseña'}
                  aria-pressed={showConfirmation}
                  onClick={() => setShowConfirmation(value => !value)}
                >
                  {showConfirmation ? 'Ocultar' : 'Ver'}
                </button>
              </div>
            </label>

            <button className="register-submit" type="submit" disabled={busy}>{busy ? 'Creando cuenta…' : 'Crear cuenta'}</button>
          </form>

          {error && <p id="register-error" className="register-error" role="alert" aria-live="assertive">{error}</p>}

          <p className="register-login-copy">¿Ya tienes cuenta? <a href="#/login">Inicia sesión</a></p>
        </div>
      </section>
    </main>
  )
}
