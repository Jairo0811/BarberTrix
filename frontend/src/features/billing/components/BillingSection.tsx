import { useCallback, useEffect, useState } from 'react'
import { api } from '../../../api'
import { showError, showSuccessToast } from '../../../alerts'
import LockedFeature from '../../../shared/components/LockedFeature'
import type { Capabilities, Shop, Subscription } from '../../../portals/admin/commercialTypes'

type Props = { isDemo: boolean; shop: Shop | null; capabilities: Capabilities | null }

export default function BillingSection({ isDemo, shop, capabilities }: Props) {
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [busy, setBusy] = useState(false)
  const load = useCallback(async () => {
    if (isDemo) { setSubscription(null); return }
    setSubscription(await api<Subscription>('/api/billing/subscription'))
  }, [isDemo])
  useEffect(() => { void load().catch(() => undefined) }, [load])

  async function checkout(plan: string) {
    setBusy(true)
    try {
      const response = await api<{ approvalUrl: string }>('/api/billing/checkout', { method: 'POST', body: JSON.stringify({ plan, returnUrl: `${location.origin}/#/billing-success`, cancelUrl: `${location.origin}/#/login` }) })
      location.href = response.approvalUrl
    } catch (error) { await showError('No se pudo iniciar PayPal', error instanceof Error ? error.message : 'Error inesperado') }
    finally { setBusy(false) }
  }

  async function cancelSubscription() {
    setBusy(true)
    try { await api('/api/billing/cancel?atPeriodEnd=false', { method: 'POST' }); await load(); void showSuccessToast('Suscripción cancelada') }
    catch (error) { await showError('No se pudo cancelar la suscripción', error instanceof Error ? error.message : 'Error inesperado') }
    finally { setBusy(false) }
  }

  return (
    <section className="panel dashboard-section" id="billing-section">
      <p className="eyebrow">SUSCRIPCIÓN</p>
      {isDemo ? <LockedFeature title="Planes y suscripción" text="La demostración no permite iniciar pagos. Crea una cuenta real para elegir un plan." /> : <><h2>{subscription?.plan ?? capabilities?.plan ?? 'Starter'} · {subscription?.status ?? capabilities?.status ?? 'Trialing'}</h2><p>{capabilities ? `${capabilities.activeBarbers} de ${capabilities.barberLimit > 1000 ? 'ilimitados' : capabilities.barberLimit} barberos activos` : 'Cargando uso…'}</p>{capabilities && <p>{capabilities.activeLocations} de {capabilities.locationLimit} sucursales activas</p>}<div className="billing-actions"><button disabled={busy} onClick={() => void checkout('Starter')}>Starter · US$20</button><button disabled={busy} onClick={() => void checkout('Pro')}>Pro · US$40</button><button disabled={busy} onClick={() => void checkout('Business')}>Business · US$70</button>{subscription?.status === 'Active' && <button disabled={busy} onClick={() => void cancelSubscription()}>Cancelar suscripción</button>}{shop && capabilities?.canUseTv && <a href={`#/tv?shop=${shop.slug}`}>Abrir BarberTurn TV</a>}</div></>}
    </section>
  )
}
