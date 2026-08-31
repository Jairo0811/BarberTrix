import { useEffect, useState } from 'react'
import type { Auth } from './types'
import { api } from './api'
import { showError } from './alerts'
import { adminPageHref } from './portals/admin/adminRoutes'
import './role-portals.css'

type Subscription = { plan: string; status: string; provider: string; periodEndsAtUtc?: string; cancelAtPeriodEnd: boolean }
type Capabilities = { plan: string; status: string; canUseAppointments: boolean; canUseTv: boolean; canUseAdvancedReports: boolean; isDemo: boolean }

export default function SubscriptionBanner({ auth, isDemo }: { auth: Auth; isDemo: boolean }) {
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [capabilities, setCapabilities] = useState<Capabilities | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (auth.role !== 'Owner' || isDemo) return
    void Promise.all([
      api<Subscription>('/api/billing/subscription'),
      api<Capabilities>('/api/capabilities'),
    ]).then(([nextSubscription, nextCapabilities]) => {
      setSubscription(nextSubscription)
      setCapabilities(nextCapabilities)
    }).catch(() => undefined)
  }, [auth.role, isDemo])

  if (auth.role !== 'Owner' || isDemo || !subscription || !capabilities) return null

  const paid = subscription.status === 'Active' && subscription.provider !== 'Trial'
  const premiumUnlocked = capabilities.canUseAppointments || capabilities.canUseTv || capabilities.canUseAdvancedReports

  async function checkout(plan: 'Starter' | 'Pro' | 'Business') {
    setBusy(true)
    try {
      const response = await api<{ approvalUrl: string }>('/api/billing/checkout', {
        method: 'POST',
        body: JSON.stringify({
          plan,
          returnUrl: `${location.origin}/#/billing-success`,
          cancelUrl: `${location.origin}/${adminPageHref('billing')}`,
        }),
      })
      location.href = response.approvalUrl
    } catch (error) {
      await showError('No se pudo iniciar el pago', error instanceof Error ? error.message : 'Error inesperado')
    } finally {
      setBusy(false)
    }
  }

  return (
    <aside className={`subscription-banner ${paid ? 'is-paid' : 'needs-upgrade'}`} aria-label="Estado de suscripción">
      <div>
        <strong>{paid ? `Plan ${subscription.plan} activo` : 'Activa tu suscripción de BarberTurn'}</strong>
        <span>
          {paid
            ? premiumUnlocked ? 'Tus funciones incluidas están habilitadas según tu plan.' : 'Tu plan Starter mantiene activas las funciones esenciales.'
            : 'Mientras no exista una suscripción activa, las funciones Pro y Business permanecen bloqueadas.'}
        </span>
      </div>
      {!paid && <div className="subscription-banner-actions">
        <button disabled={busy} onClick={() => void checkout('Starter')}>Starter · US$20</button>
        <button disabled={busy} onClick={() => void checkout('Pro')}>Desbloquear Pro · US$40</button>
        <button disabled={busy} onClick={() => void checkout('Business')}>Business · US$70</button>
      </div>}
    </aside>
  )
}
