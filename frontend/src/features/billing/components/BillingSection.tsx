import { useCallback, useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { api, ApiClientError } from '../../../api'
import { apiErrorMessage } from '../../../apiErrorMessages'
import { showError, showSuccessToast } from '../../../alerts'
import { useI18n } from '../../../i18n'
import LockedFeature from '../../../shared/components/LockedFeature'
import type { Capabilities, Shop, Subscription } from '../../../portals/admin/commercialTypes'
import {
  paidPlanFromSearch,
  paypalCancelUrl,
  paypalReturnUrl,
  readPendingPaidPlan,
  rememberPendingPaidPlan,
  rememberPendingPayPalSubscriptionId,
  type PaidPlan,
} from '../../../billingSelection'

type Props = {
  isDemo: boolean
  shop: Shop | null
  capabilities: Capabilities | null
  commercialLoading?: boolean
  commercialError?: string | null
  onCommercialRefresh?: () => Promise<void>
}

export default function BillingSection({
  isDemo,
  shop,
  capabilities,
  commercialLoading = false,
  commercialError = null,
  onCommercialRefresh,
}: Props) {
  const { locale, t } = useI18n()
  const routerLocation = useLocation()
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [busy, setBusy] = useState(false)
  const [refreshingUsage, setRefreshingUsage] = useState(false)
  const isSystemAdmin = capabilities?.isSystemAdmin === true
  const routeSelectedPlan = paidPlanFromSearch(routerLocation.search)
  const selectedPlan = routeSelectedPlan ?? readPendingPaidPlan()

  useEffect(() => {
    if (routeSelectedPlan) rememberPendingPaidPlan(routeSelectedPlan)
  }, [routeSelectedPlan])

  const load = useCallback(async () => {
    if (isDemo || isSystemAdmin) { setSubscription(null); return }
    setSubscription(await api<Subscription>('/api/billing/subscription'))
  }, [isDemo, isSystemAdmin])
  useEffect(() => { void load().catch(() => undefined) }, [load])

  function billingFailureMessage(error: unknown) {
    const localized = apiErrorMessage(error, locale, t('billing.paypalError'))
    if (!(error instanceof ApiClientError)) return localized

    const details: string[] = []
    if (error.code === 'BILLING_INVALID' && error.message && error.message !== localized) details.push(error.message)
    if (error.correlationId) details.push(`ID de diagnóstico: ${error.correlationId}`)
    return details.length > 0 ? `${localized}\n\n${details.join('\n')}` : localized
  }

  async function checkout(plan: PaidPlan) {
    setBusy(true)
    try {
      rememberPendingPaidPlan(plan)
      rememberPendingPayPalSubscriptionId(null)
      const response = await api<{ providerOrderId: string; approvalUrl: string }>('/api/billing/checkout', {
        method: 'POST',
        body: JSON.stringify({
          plan,
          returnUrl: paypalReturnUrl(window.location.origin),
          cancelUrl: paypalCancelUrl(window.location.origin),
        }),
      })
      rememberPendingPayPalSubscriptionId(response.providerOrderId)
      window.location.href = response.approvalUrl
    } catch (error) {
      rememberPendingPayPalSubscriptionId(null)
      await showError(t('billing.paypalError'), billingFailureMessage(error))
    } finally {
      setBusy(false)
    }
  }

  async function cancelSubscription() {
    setBusy(true)
    try {
      await api('/api/billing/cancel?atPeriodEnd=false', { method: 'POST' })
      await load()
      void showSuccessToast(t('billing.cancelled'))
    } catch (error) {
      await showError(t('billing.cancelError'), apiErrorMessage(error, locale, t('billing.cancelError')))
    } finally {
      setBusy(false)
    }
  }

  async function refreshUsage() {
    if (!onCommercialRefresh) return
    setRefreshingUsage(true)
    try {
      await onCommercialRefresh()
    } finally {
      setRefreshingUsage(false)
    }
  }

  const status = subscription?.status ?? capabilities?.status ?? 'Active'
  const statusText = status === 'Active' ? t('commercial.active') : t('commercial.inactive')
  const barberLimit = capabilities?.barberLimit && capabilities.barberLimit > 1000 ? t('commercial.unlimited') : String(capabilities?.barberLimit ?? 0)
  const serviceLimit = capabilities?.serviceLimit && capabilities.serviceLimit > 1000 ? t('commercial.unlimited') : String(capabilities?.serviceLimit ?? 0)
  const locationLimit = capabilities?.locationLimit && capabilities.locationLimit > 1000 ? t('commercial.unlimitedFeminine') : String(capabilities?.locationLimit ?? 0)

  return (
    <section className="panel dashboard-section" id="billing-section">
      <p className="eyebrow">{t('billing.eyebrow')}</p>
      {isDemo ? (
        <LockedFeature title={t('billing.lockedTitle')} text={t('billing.lockedText')} />
      ) : isSystemAdmin ? (
        <>
          <h2>{t('billing.systemAdminTitle')}</h2>
          <p>{t('billing.systemAdminText')}</p>
          {shop && capabilities?.canUseTv && <div className="billing-actions"><a href={`#/tv?shop=${shop.slug}`}>{t('billing.openTv')}</a></div>}
        </>
      ) : (
        <>
          <h2>{subscription?.plan ?? capabilities?.plan ?? 'Free'} · {statusText}</h2>

          {capabilities ? (
            <>
              <p>{t('billing.activeBarbers', { active: capabilities.activeBarbers, limit: barberLimit })}</p>
              <p>{t('billing.activeServices', { active: capabilities.activeServices, limit: serviceLimit })}</p>
              <p>{capabilities.monthlyTurnLimit > 1000
                ? t('billing.turnsExpanded', { used: capabilities.turnsThisMonth })
                : `${t('billing.turnsIncluded', { used: capabilities.turnsThisMonth, limit: capabilities.monthlyTurnLimit })}${capabilities.turnsThisMonth >= capabilities.monthlyTurnLimit ? t('billing.graceUntil', { grace: capabilities.monthlyTurnGraceLimit }) : ''}`}</p>
              <p>{t('billing.activeLocations', { active: capabilities.activeLocations, limit: locationLimit })}</p>
            </>
          ) : commercialError ? (
            <div role="alert">
              <p>{commercialError} Puedes continuar con la suscripción o reintentar la carga.</p>
              <div className="billing-actions">
                <button disabled={refreshingUsage} onClick={() => void refreshUsage()}>{refreshingUsage ? 'Reintentando…' : 'Reintentar uso del plan'}</button>
              </div>
            </div>
          ) : commercialLoading ? (
            <p>{t('billing.loadingUsage')}</p>
          ) : (
            <p role="status">No fue posible cargar el uso del plan. Puedes continuar con la suscripción.</p>
          )}

          {selectedPlan && <p><strong>✓ {selectedPlan}</strong> · {selectedPlan === 'Pro' ? 'US$40' : 'US$70'} · PayPal</p>}

          <div className="billing-actions">
            <button disabled={busy} aria-pressed={selectedPlan === 'Pro'} onClick={() => void checkout('Pro')}>{selectedPlan === 'Pro' ? '✓ ' : ''}Pro · US$40</button>
            <button disabled={busy} aria-pressed={selectedPlan === 'Business'} onClick={() => void checkout('Business')}>{selectedPlan === 'Business' ? '✓ ' : ''}Business · US$70</button>
            {subscription?.provider !== 'Free' && subscription?.status === 'Active' && <button disabled={busy} onClick={() => void cancelSubscription()}>{t('billing.cancel')}</button>}
            {shop && capabilities?.canUseTv && <a href={`#/tv?shop=${shop.slug}`}>{t('billing.openTv')}</a>}
          </div>
        </>
      )}
    </section>
  )
}
