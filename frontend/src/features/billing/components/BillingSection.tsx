import { useCallback, useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { api } from '../../../api'
import { apiErrorMessage } from '../../../apiErrorMessages'
import { showError, showSuccessToast } from '../../../alerts'
import { useI18n } from '../../../i18n'
import LockedFeature from '../../../shared/components/LockedFeature'
import { adminPageHref } from '../../../portals/admin/adminRoutes'
import type { Capabilities, Shop, Subscription } from '../../../portals/admin/commercialTypes'
import { paidPlanFromSearch, readPendingPaidPlan, rememberPendingPaidPlan, type PaidPlan } from '../../../billingSelection'

type Props = { isDemo: boolean; shop: Shop | null; capabilities: Capabilities | null }

export default function BillingSection({ isDemo, shop, capabilities }: Props) {
  const { locale, t } = useI18n()
  const location = useLocation()
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [busy, setBusy] = useState(false)
  const isSystemAdmin = capabilities?.isSystemAdmin === true
  const routeSelectedPlan = paidPlanFromSearch(location.search)
  const selectedPlan = routeSelectedPlan ?? readPendingPaidPlan()

  useEffect(() => {
    if (routeSelectedPlan) rememberPendingPaidPlan(routeSelectedPlan)
  }, [routeSelectedPlan])

  const load = useCallback(async () => {
    if (isDemo || isSystemAdmin) { setSubscription(null); return }
    setSubscription(await api<Subscription>('/api/billing/subscription'))
  }, [isDemo, isSystemAdmin])
  useEffect(() => { void load().catch(() => undefined) }, [load])

  async function checkout(plan: PaidPlan) {
    setBusy(true)
    try {
      rememberPendingPaidPlan(plan)
      const response = await api<{ approvalUrl: string }>('/api/billing/checkout', { method: 'POST', body: JSON.stringify({ plan, returnUrl: `${location.origin}/#/billing-success`, cancelUrl: `${location.origin}/${adminPageHref('billing')}` }) })
      location.href = response.approvalUrl
    } catch (error) { await showError(t('billing.paypalError'), apiErrorMessage(error, locale, t('billing.paypalError'))) }
    finally { setBusy(false) }
  }

  async function cancelSubscription() {
    setBusy(true)
    try { await api('/api/billing/cancel?atPeriodEnd=false', { method: 'POST' }); await load(); void showSuccessToast(t('billing.cancelled')) }
    catch (error) { await showError(t('billing.cancelError'), apiErrorMessage(error, locale, t('billing.cancelError'))) }
    finally { setBusy(false) }
  }

  const status = subscription?.status ?? capabilities?.status ?? 'Active'
  const statusText = status === 'Active' ? t('commercial.active') : t('commercial.inactive')
  const barberLimit = capabilities?.barberLimit && capabilities.barberLimit > 1000 ? t('commercial.unlimited') : String(capabilities?.barberLimit ?? 0)
  const serviceLimit = capabilities?.serviceLimit && capabilities.serviceLimit > 1000 ? t('commercial.unlimited') : String(capabilities?.serviceLimit ?? 0)
  const locationLimit = capabilities?.locationLimit && capabilities.locationLimit > 1000 ? t('commercial.unlimitedFeminine') : String(capabilities?.locationLimit ?? 0)

  return (
    <section className="panel dashboard-section" id="billing-section">
      <p className="eyebrow">{t('billing.eyebrow')}</p>
      {isDemo ? <LockedFeature title={t('billing.lockedTitle')} text={t('billing.lockedText')} /> : isSystemAdmin ? <><h2>{t('billing.systemAdminTitle')}</h2><p>{t('billing.systemAdminText')}</p>{shop && capabilities?.canUseTv && <div className="billing-actions"><a href={`#/tv?shop=${shop.slug}`}>{t('billing.openTv')}</a></div>}</> : <><h2>{subscription?.plan ?? capabilities?.plan ?? 'Free'} · {statusText}</h2><p>{capabilities ? t('billing.activeBarbers', { active: capabilities.activeBarbers, limit: barberLimit }) : t('billing.loadingUsage')}</p>{capabilities && <p>{t('billing.activeServices', { active: capabilities.activeServices, limit: serviceLimit })}</p>}{capabilities && <p>{capabilities.monthlyTurnLimit > 1000 ? t('billing.turnsExpanded', { used: capabilities.turnsThisMonth }) : `${t('billing.turnsIncluded', { used: capabilities.turnsThisMonth, limit: capabilities.monthlyTurnLimit })}${capabilities.turnsThisMonth >= capabilities.monthlyTurnLimit ? t('billing.graceUntil', { grace: capabilities.monthlyTurnGraceLimit }) : ''}`}</p>}{capabilities && <p>{t('billing.activeLocations', { active: capabilities.activeLocations, limit: locationLimit })}</p>}{selectedPlan && <p><strong>✓ {selectedPlan}</strong> · {selectedPlan === 'Pro' ? 'US$40' : 'US$70'} · PayPal</p>}<div className="billing-actions"><button disabled={busy} aria-pressed={selectedPlan === 'Pro'} onClick={() => void checkout('Pro')}>{selectedPlan === 'Pro' ? '✓ ' : ''}Pro · US$40</button><button disabled={busy} aria-pressed={selectedPlan === 'Business'} onClick={() => void checkout('Business')}>{selectedPlan === 'Business' ? '✓ ' : ''}Business · US$70</button>{subscription?.provider !== 'Free' && subscription?.status === 'Active' && <button disabled={busy} onClick={() => void cancelSubscription()}>{t('billing.cancel')}</button>}{shop && capabilities?.canUseTv && <a href={`#/tv?shop=${shop.slug}`}>{t('billing.openTv')}</a>}</div></>}
    </section>
  )
}
