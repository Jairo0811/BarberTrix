import { useEffect, useState } from 'react'
import type { Auth } from './types'
import { api } from './api'
import { showError } from './alerts'
import { useI18n } from './i18n'
import { adminPageHref } from './portals/admin/adminRoutes'
import './role-portals.css'

type Subscription = { plan: string; status: string; provider: string; periodEndsAtUtc?: string; cancelAtPeriodEnd: boolean }
type Capabilities = { plan: string; status: string; canUseAppointments: boolean; canUseTv: boolean; canUseAdvancedReports: boolean; isDemo: boolean }

export default function SubscriptionBanner({ auth, isDemo }: { auth: Auth; isDemo: boolean }) {
  const { t } = useI18n()
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

  const paid = subscription.status === 'Active' && subscription.provider !== 'Trial' && subscription.provider !== 'Free'
  const premiumUnlocked = capabilities.canUseTv || capabilities.canUseAdvancedReports

  async function checkout(plan: 'Pro' | 'Business') {
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
    } catch {
      await showError(t('subscription.paymentStartError'), t('subscription.unexpectedError'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <aside className={`subscription-banner ${paid ? 'is-paid' : 'needs-upgrade'}`} aria-label={t('subscription.aria')}>
      <div>
        <strong>{paid ? t('subscription.activePlan', { plan: subscription.plan }) : t('subscription.activate')}</strong>
        <span>
          {paid
            ? premiumUnlocked ? t('subscription.premiumUnlocked') : t('subscription.starterEssential')
            : t('subscription.locked')}
        </span>
      </div>
      {!paid && <div className="subscription-banner-actions">
        <button disabled={busy} onClick={() => void checkout('Pro')}>{t('subscription.unlockPro')}</button>
        <button disabled={busy} onClick={() => void checkout('Business')}>Business · US$70</button>
      </div>}
    </aside>
  )
}
