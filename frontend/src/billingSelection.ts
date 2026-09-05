export type PaidPlan = 'Pro' | 'Business'

const pendingPaidPlanStorageKey = 'barbertrix.pendingPaidPlan'
const pendingPayPalSubscriptionIdStorageKey = 'barbertrix.pendingPayPalSubscriptionId'

export function normalizePaidPlan(value: string | null | undefined): PaidPlan | null {
  const normalized = value?.trim().toLowerCase()
  if (normalized === 'pro') return 'Pro'
  if (normalized === 'business') return 'Business'
  return null
}

export function paidPlanFromSearch(search: string): PaidPlan | null {
  const query = search.startsWith('?') ? search.slice(1) : search
  return normalizePaidPlan(new URLSearchParams(query).get('plan'))
}

export function paidPlanFromHash(hash: string): PaidPlan | null {
  const queryIndex = hash.indexOf('?')
  if (queryIndex < 0) return null
  return paidPlanFromSearch(hash.slice(queryIndex + 1))
}

export function rememberPendingPaidPlan(plan: PaidPlan | null) {
  if (plan) sessionStorage.setItem(pendingPaidPlanStorageKey, plan)
  else sessionStorage.removeItem(pendingPaidPlanStorageKey)
}

export function readPendingPaidPlan(): PaidPlan | null {
  return normalizePaidPlan(sessionStorage.getItem(pendingPaidPlanStorageKey))
}

export function clearPendingPaidPlan() {
  sessionStorage.removeItem(pendingPaidPlanStorageKey)
}

export function rememberPendingPayPalSubscriptionId(providerOrderId: string | null) {
  const normalized = providerOrderId?.trim()
  if (normalized) sessionStorage.setItem(pendingPayPalSubscriptionIdStorageKey, normalized)
  else sessionStorage.removeItem(pendingPayPalSubscriptionIdStorageKey)
}

export function readPendingPayPalSubscriptionId() {
  return sessionStorage.getItem(pendingPayPalSubscriptionIdStorageKey)?.trim() || null
}

export function clearPendingPayPalSubscriptionId() {
  sessionStorage.removeItem(pendingPayPalSubscriptionIdStorageKey)
}

function planQuery(plan: PaidPlan | null) {
  return plan ? `?plan=${encodeURIComponent(plan)}` : ''
}

export function registerHash(plan: PaidPlan | null = null) {
  return `#/register${planQuery(plan)}`
}

export function loginHash(plan: PaidPlan | null = null) {
  return `#/login${planQuery(plan)}`
}

export function billingHash(plan: PaidPlan) {
  return `#/app/billing${planQuery(plan)}`
}

export function paypalReturnUrl(origin: string) {
  return `${origin.replace(/\/$/, '')}/?billing=paypal-success`
}

export function paypalCancelUrl(origin: string) {
  return `${origin.replace(/\/$/, '')}/?billing=paypal-cancel`
}

export function paypalCallbackHashFromSearch(search: string): string | null {
  const query = search.startsWith('?') ? search.slice(1) : search
  const values = new URLSearchParams(query)
  const callback = values.get('billing')

  if (callback === 'paypal-cancel') return '#/app/billing'
  if (callback !== 'paypal-success' && !values.has('subscription_id')) return null

  const subscriptionId = values.get('subscription_id')?.trim()
  return subscriptionId
    ? `#/billing-success?subscription_id=${encodeURIComponent(subscriptionId)}`
    : '#/billing-success'
}

export function providerOrderIdFromLocation(search: string, hash: string): string | null {
  const searchValues = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search)
  const searchId = searchValues.get('subscription_id')?.trim()
  if (searchId) return searchId

  const queryIndex = hash.indexOf('?')
  if (queryIndex < 0) return null
  const hashValues = new URLSearchParams(hash.slice(queryIndex + 1))
  return hashValues.get('subscription_id')?.trim() || null
}
