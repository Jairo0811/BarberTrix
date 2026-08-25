import { useEffect, useMemo, useState } from 'react'
import { API_URL, clearAuth } from './api'

function queryToken() {
  return new URLSearchParams(location.hash.split('?')[1] ?? '').get('token') ?? ''
}

export default function VerifyEmailPage() {
  const token = useMemo(queryToken, [])
  const [message, setMessage] = useState(token ? 'Verificando tu correo…' : 'El enlace no contiene un token válido.')
  const [ok, setOk] = useState(false)

  useEffect(() => {
    if (!token) return
    void fetch(`${API_URL}/api/auth/verify-email`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }) })
      .then(async response => {
        const payload = await response.json().catch(() => null)
        if (!response.ok) throw new Error(payload?.message ?? 'El enlace es inválido o expiró.')
        clearAuth()
        setOk(true)
        setMessage('Tu correo quedó verificado. Ya puedes usar todas las funciones de BarberTurn.')
      })
      .catch(exception => setMessage(exception instanceof Error ? exception.message : 'No se pudo verificar el correo.'))
  }, [token])

  return <main className="login-shell"><section className="login-card">
    <img className="recovery-logo" src="/branding/barberturn-logo.png" alt="BarberTurn" />
    <h1>{ok ? 'Correo verificado' : 'Verificación de correo'}</h1>
    <p className={ok ? 'login-subtitle' : 'login-error'} role="status">{message}</p>
    <a className="login-submit recovery-link-button" href="#/login">Ir al panel</a>
  </section></main>
}
