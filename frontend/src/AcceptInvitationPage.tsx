import { FormEvent, useMemo, useState } from 'react'
import { API_URL, writeAuth } from './api'
import type { Auth } from './types'

function queryToken() {
  return new URLSearchParams(location.hash.split('?')[1] ?? '').get('token') ?? ''
}

export default function AcceptInvitationPage() {
  const token = useMemo(queryToken, [])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function accept(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError('')
    const data = new FormData(event.currentTarget)
    const password = String(data.get('password') ?? '')
    if (password !== String(data.get('confirmation') ?? '')) {
      setError('Las contraseñas no coinciden.')
      setBusy(false)
      return
    }

    try {
      const response = await fetch(`${API_URL}/api/auth/accept-invitation`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password, acceptedTerms: data.get('acceptedTerms') === 'on' }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.message ?? 'La invitación no es válida o ya expiró.')
      writeAuth(payload as Auth, true)
      location.hash = '#/login'
      location.reload()
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : 'No se pudo aceptar la invitación.')
    } finally {
      setBusy(false)
    }
  }

  return <main className="login-shell"><section className="login-card">
    <a className="back-home-link" href="#/login">← Volver al acceso</a>
    <img className="recovery-logo" src="/branding/barberturn-logo.png" alt="BarberTurn" />
    <h1>Únete al equipo</h1>
    <p className="login-subtitle">Crea tu contraseña para activar la invitación.</p>
    {!token ? <p className="login-error" role="alert">El enlace no incluye una invitación válida.</p> : <form className="login-form" onSubmit={accept}>
      <label className="login-field"><span>Contraseña</span><div className="input-wrap"><input name="password" type="password" minLength={10} required autoComplete="new-password" /></div></label>
      <label className="login-field"><span>Confirmar contraseña</span><div className="input-wrap"><input name="confirmation" type="password" minLength={10} required autoComplete="new-password" /></div></label>
      <label className="remember-option"><input name="acceptedTerms" type="checkbox" required /><span>Acepto los términos y la política de privacidad.</span></label>
      <button className="login-submit" disabled={busy}>{busy ? 'Activando…' : 'Activar mi cuenta'}</button>
    </form>}
    {error && <p className="login-error" role="alert">{error}</p>}
  </section></main>
}
