import { useEffect, useMemo, useState } from 'react'
import { api } from './api'

function subscriptionId() {
  const values = new URLSearchParams(location.hash.split('?')[1] ?? '')
  return values.get('subscription_id') ?? values.get('ba_token') ?? ''
}

export default function BillingSuccessPage() {
  const id = useMemo(subscriptionId, [])
  const [state, setState] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('Confirmando tu suscripción con PayPal…')

  useEffect(() => {
    if (!id) { setState('error'); setMessage('PayPal no devolvió un identificador de suscripción.'); return }
    void api('/api/billing/capture', { method: 'POST', body: JSON.stringify({ providerSubscriptionId: id }) })
      .then(() => { setState('success'); setMessage('Tu plan quedó activo y ya puedes usar sus beneficios.') })
      .catch(exception => { setState('error'); setMessage(exception instanceof Error ? exception.message : 'No se pudo confirmar la suscripción.') })
  }, [id])

  return <main className="login-shell"><section className="login-card">
    <img className="recovery-logo" src="/branding/barberturn-logo.png" alt="BarberTurn" />
    <h1>{state === 'success' ? 'Suscripción activada' : state === 'error' ? 'No pudimos activar el plan' : 'Procesando pago'}</h1>
    <p className={state === 'error' ? 'login-error' : 'login-subtitle'} role="status">{message}</p>
    <a className="login-submit recovery-link-button" href="#/login">Volver al panel</a>
  </section></main>
}
