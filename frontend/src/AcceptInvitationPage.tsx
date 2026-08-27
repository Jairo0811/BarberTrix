import { FormEvent, useMemo, useState } from 'react'
import { publicApi, writeAuth } from './api'
import { apiErrorMessage } from './apiErrorMessages'
import { useI18n } from './i18n'
import type { Auth } from './types'

function queryToken() {
  return new URLSearchParams(location.hash.split('?')[1] ?? '').get('token') ?? ''
}

export default function AcceptInvitationPage() {
  const { locale } = useI18n()
  const token = useMemo(queryToken, [])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function accept(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError('')
    const data = new FormData(event.currentTarget)
    const password = String(data.get('password') ?? '')

    if (password.length < 10 || !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/\d/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
      setError('La contraseña debe tener al menos 10 caracteres e incluir mayúscula, minúscula, número y símbolo.')
      setBusy(false)
      return
    }

    if (password !== String(data.get('confirmation') ?? '')) {
      setError('Las contraseñas no coinciden.')
      setBusy(false)
      return
    }

    try {
      const auth = await publicApi<Auth>('/api/auth/accept-invitation', {
        method: 'POST',
        body: JSON.stringify({ token, password, acceptedTerms: data.get('acceptedTerms') === 'on' }),
      })
      writeAuth(auth, true)
      location.hash = '#/login'
      location.reload()
    } catch (exception) {
      setError(apiErrorMessage(exception, locale, 'No se pudo aceptar la invitación.'))
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
