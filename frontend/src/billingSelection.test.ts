import { beforeEach, describe, expect, it } from 'vitest'
import {
  billingHash,
  clearPendingPaidPlan,
  loginHash,
  normalizePaidPlan,
  paidPlanFromHash,
  paidPlanFromSearch,
  readPendingPaidPlan,
  registerHash,
  rememberPendingPaidPlan,
} from './billingSelection'

describe('billing selection', () => {
  beforeEach(() => clearPendingPaidPlan())

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

  it('builds plan-aware signup, login and billing hashes', () => {
    expect(registerHash('Pro')).toBe('#/register?plan=Pro')
    expect(loginHash('Business')).toBe('#/login?plan=Business')
    expect(billingHash('Pro')).toBe('#/app/billing?plan=Pro')
    expect(registerHash()).toBe('#/register')
  })
})
