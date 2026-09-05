import { useEffect, useMemo, useState } from 'react'
import { api } from './api'
import { useI18n } from './i18n'
import { adminPageHref } from './portals/admin/adminRoutes'
import {
  clearPendingPaidPlan,
  clearPendingPayPalSubscriptionId,
  providerOrderIdFromLocation,
  readPendingPayPalSubscriptionId,
} from './billingSelection'

function subscriptionId() {
  return providerOrderIdFromLocation(window.location.search, window.location.hash)
    ?? readPendingPayPalSubscriptionId()
    ?? ''
}

type BillingState = 'loading' | 'success' | 'error' | 'missing-id'

export default function BillingSuccessPage() {
  const { t } = useI18n()
  const id = useMemo(subscriptionId, [])
  const [state, setState] = useState<BillingState>(id ? 'loading' : 'missing-id')

  useEffect(() => {
    if (!id) return
    void api('/api/billing/capture', { method: 'POST', body: JSON.stringify({ providerOrderId: id }) })
      .then(() => {
        clearPendingPaidPlan()
        clearPendingPayPalSubscriptionId()
        setState('success')
      })
      .catch(() => setState('error'))
  }, [id])

  const message = state === 'loading'
    ? t('billingSuccess.confirming')
    : state === 'success'
      ? t('billingSuccess.success')
      : state === 'missing-id'
        ? t('billingSuccess.missingId')
        : t('billingSuccess.error')

  const title = state === 'success'
    ? t('billingSuccess.successTitle')
    : state === 'loading'
      ? t('billingSuccess.processingTitle')
      : t('billingSuccess.errorTitle')

  const failed = state === 'error' || state === 'missing-id'

  return <main className="login-shell"><section className="login-card billing-success-card">
    <img className="billing-success-logo" src="/branding/barbertrix-logo.png" alt="BarberTrix" />
    <h1>{title}</h1>
    <p className={failed ? 'login-error' : 'login-subtitle'} role="status">{message}</p>
    <a className="login-submit recovery-link-button" href={adminPageHref('billing')}>{t('billingSuccess.back')}</a>
  </section></main>
}
