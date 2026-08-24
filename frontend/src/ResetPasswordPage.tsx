import { FormEvent, useMemo, useState } from 'react'
import './auth-recovery.css'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8080'

function getResetToken() {
  const query = window.location.hash.split('?')[1] ?? ''
  return new URLSearchParams(query).get('token') ?? ''
}

export default function ResetPasswordPage() {
  const token = useMemo(getResetToken, [])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)

  async function resetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError('')

    const data = new FormData(event.currentTarget)
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
      const response = await fetch(`${API_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: password }),
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        const validationMessage = payload?.errors?.token?.[0] ?? payload?.errors?.credentials?.[0]
        throw new Error(validationMessage ?? 'No se pudo restablecer la contraseña.')
      }

      setSuccess(true)
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : 'No se pudo restablecer la contraseña.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="recovery-page" aria-labelledby="reset-password-title">
      <section className="recovery-card">
        <a className="recovery-logo" href="#/" aria-label="Volver al inicio de BarberTurn">
          <img src="/branding/barberturn-logo.png" alt="BarberTurn" />
        </a>

        {!token ? (
          <div className="recovery-success" role="alert" aria-live="assertive">
            <div className="recovery-icon invalid" aria-hidden="true">!</div>
            <h1 id="reset-password-title">Enlace inválido</h1>
            <p>El enlace de recuperación no contiene un token válido. Solicita uno nuevo para continuar.</p>
            <a className="recovery-primary recovery-action-link" href="#/forgot-password">Solicitar nuevo enlace</a>
          </div>
        ) : success ? (
          <div className="recovery-success" role="status" aria-live="polite" aria-atomic="true">
            <div className="recovery-icon success" aria-hidden="true">✓</div>
            <h1 id="reset-password-title">Contraseña actualizada</h1>
            <p>Tu nueva contraseña ya está activa. Puedes volver a BarberTurn e iniciar sesión.</p>
            <a className="recovery-primary recovery-action-link" href="#/login">Iniciar sesión</a>
          </div>
        ) : (
          <>
            <div className="recovery-icon" aria-hidden="true">◇</div>
            <h1 id="reset-password-title">Crea una nueva contraseña</h1>
            <p className="recovery-description">
              Usa una contraseña de al menos 8 caracteres que no hayas compartido con otras personas.
            </p>
            <span id="reset-password-requirements" className="visually-hidden">
              La contraseña debe tener al menos 8 caracteres.
            </span>

            <form
              className="recovery-form"
              onSubmit={resetPassword}
              aria-busy={busy}
              aria-describedby={error ? 'reset-password-error' : undefined}
            >
              <label>
                <span>Nueva contraseña</span>
                <div className="recovery-input-wrap">
                  <span aria-hidden="true">●</span>
                  <input
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    minLength={8}
                    aria-describedby="reset-password-requirements"
                    placeholder="Mínimo 8 caracteres"
                    required
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? 'Ocultar nueva contraseña' : 'Mostrar nueva contraseña'}
                    aria-pressed={showPassword}
                    onClick={() => setShowPassword(value => !value)}
                  >
                    {showPassword ? 'Ocultar' : 'Ver'}
                  </button>
                </div>
              </label>

              <label>
                <span>Confirmar contraseña</span>
                <div className="recovery-input-wrap">
                  <span aria-hidden="true">●</span>
                  <input
                    name="confirmPassword"
                    type={showConfirmation ? 'text' : 'password'}
                    autoComplete="new-password"
                    minLength={8}
                    aria-describedby="reset-password-requirements"
                    placeholder="Repite tu contraseña"
                    required
                  />
                  <button
                    type="button"
                    aria-label={showConfirmation ? 'Ocultar confirmación de contraseña' : 'Mostrar confirmación de contraseña'}
                    aria-pressed={showConfirmation}
                    onClick={() => setShowConfirmation(value => !value)}
                  >
                    {showConfirmation ? 'Ocultar' : 'Ver'}
                  </button>
                </div>
              </label>

              <button className="recovery-primary" type="submit" disabled={busy}>
                {busy ? 'Actualizando…' : 'Actualizar contraseña'}
              </button>
            </form>

            {error && <p id="reset-password-error" className="recovery-error" role="alert" aria-live="assertive">{error}</p>}
          </>
        )}

        <a className="recovery-back" href="#/login">← Volver a iniciar sesión</a>
      </section>
    </main>
  )
}
