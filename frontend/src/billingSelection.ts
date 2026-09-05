export type PaidPlan = 'Pro' | 'Business'

const pendingPaidPlanStorageKey = 'barbertrix.pendingPaidPlan'

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
