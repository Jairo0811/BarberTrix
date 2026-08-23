import { FormEvent, useState } from 'react'
import './auth-recovery.css'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8080'

type ForgotPasswordResponse = {
  message: string
  developmentResetUrl?: string | null
}

export default function ForgotPasswordPage() {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<ForgotPasswordResponse | null>(null)

  async function requestReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError('')
    setResult(null)

    const data = new FormData(event.currentTarget)
    const email = String(data.get('email') ?? '').trim()

    try {
      const response = await fetch(`${API_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        throw new Error(payload?.message ?? 'No se pudo procesar la solicitud. Inténtalo de nuevo.')
      }

      setResult(await response.json() as ForgotPasswordResponse)
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : 'No se pudo procesar la solicitud.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="recovery-page">
      <section className="recovery-card" aria-labelledby="forgot-password-title">
        <a className="recovery-logo" href="#/" aria-label="Volver al inicio de BarberTurn">
          <img src="/branding/barberturn-logo.png" alt="BarberTurn" />
        </a>

        {!result ? (
          <>
            <div className="recovery-icon" aria-hidden="true">↺</div>
            <h1 id="forgot-password-title">¿Olvidaste tu contraseña?</h1>
            <p className="recovery-description">
              Escribe el correo asociado a tu cuenta. Si existe, te enviaremos las instrucciones para recuperar el acceso.
            </p>

            <form className="recovery-form" onSubmit={requestReset}>
              <label>
                <span>Correo electrónico</span>
                <div className="recovery-input-wrap">
                  <span aria-hidden="true">✉</span>
                  <input name="email" type="email" autoComplete="email" placeholder="ejemplo@barberia.com" required />
                </div>
              </label>

              <button className="recovery-primary" type="submit" disabled={busy}>
                {busy ? 'Enviando…' : 'Enviar instrucciones'}
              </button>
            </form>

            {error && <p className="recovery-error" role="alert">{error}</p>}
          </>
        ) : (
          <div className="recovery-success" role="status">
            <div className="recovery-icon success" aria-hidden="true">✓</div>
            <h1>Revisa tu correo</h1>
            <p>{result.message}</p>

            {result.developmentResetUrl && (
              <div className="development-reset">
                <strong>Modo desarrollo</strong>
                <span>Mientras configuramos el proveedor de correo, puedes probar el flujo con este enlace temporal.</span>
                <a href={result.developmentResetUrl}>Abrir enlace de recuperación</a>
              </div>
            )}
          </div>
        )}

        <a className="recovery-back" href="#/login">← Volver a iniciar sesión</a>
      </section>
    </main>
  )
}
