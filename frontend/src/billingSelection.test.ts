import { beforeEach, describe, expect, it } from 'vitest'
import {
  billingHash,
  clearPendingPaidPlan,
  clearPendingPayPalSubscriptionId,
  loginHash,
  normalizePaidPlan,
  paidPlanFromHash,
  paidPlanFromSearch,
  paypalCallbackHashFromSearch,
  paypalCancelUrl,
  paypalReturnUrl,
  providerOrderIdFromLocation,
  readPendingPaidPlan,
  readPendingPayPalSubscriptionId,
  registerHash,
  rememberPendingPaidPlan,
  rememberPendingPayPalSubscriptionId,
} from './billingSelection'

describe('billing selection', () => {
  beforeEach(() => {
    clearPendingPaidPlan()
    clearPendingPayPalSubscriptionId()
  })

  it('normalizes only purchasable plans', () => {
    expect(normalizePaidPlan('pro')).toBe('Pro')
    expect(normalizePaidPlan(' BUSINESS ')).toBe('Business')
    expect(normalizePaidPlan('Free')).toBeNull()
    expect(normalizePaidPlan('Starter')).toBeNull()
  })

  it('reads the plan from router search and hash values', () => {
    expect(paidPlanFromSearch('?plan=Pro')).toBe('Pro')
    expect(paidPlanFromHash('#/register?plan=Business')).toBe('Business')
    expect(paidPlanFromHash('#/register')).toBeNull()
  })

  it('persists a pending paid plan only for the current session', () => {
    rememberPendingPaidPlan('Pro')
    expect(readPendingPaidPlan()).toBe('Pro')
    clearPendingPaidPlan()
    expect(readPendingPaidPlan()).toBeNull()
  })

  it('persists the PayPal provider subscription id across the external redirect', () => {
    rememberPendingPayPalSubscriptionId(' I-TEST123 ')
    expect(readPendingPayPalSubscriptionId()).toBe('I-TEST123')
    clearPendingPayPalSubscriptionId()
    expect(readPendingPayPalSubscriptionId()).toBeNull()
  })

  it('builds plan-aware signup, login and billing hashes', () => {
    expect(registerHash('Pro')).toBe('#/register?plan=Pro')
    expect(loginHash('Business')).toBe('#/login?plan=Business')
    expect(billingHash('Pro')).toBe('#/app/billing?plan=Pro')
    expect(registerHash()).toBe('#/register')
  })

  it('uses query-string PayPal callbacks instead of hash fragments', () => {
    expect(paypalReturnUrl('http://localhost:5173/')).toBe('http://localhost:5173/?billing=paypal-success')
    expect(paypalCancelUrl('http://localhost:5173')).toBe('http://localhost:5173/?billing=paypal-cancel')
  })

  it('normalizes PayPal callbacks into HashRouter routes', () => {
    expect(paypalCallbackHashFromSearch('?billing=paypal-success&subscription_id=I-123')).toBe('#/billing-success?subscription_id=I-123')
    expect(paypalCallbackHashFromSearch('?billing=paypal-success')).toBe('#/billing-success')
    expect(paypalCallbackHashFromSearch('?billing=paypal-cancel')).toBe('#/app/billing')
    expect(paypalCallbackHashFromSearch('?foo=bar')).toBeNull()
  })

  it('reads the provider subscription id from real or hash query strings', () => {
    expect(providerOrderIdFromLocation('?subscription_id=I-REAL', '#/')).toBe('I-REAL')
    expect(providerOrderIdFromLocation('', '#/billing-success?subscription_id=I-HASH')).toBe('I-HASH')
    expect(providerOrderIdFromLocation('', '#/billing-success')).toBeNull()
  })
})
