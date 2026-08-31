import { describe, expect, it } from 'vitest'
import { adminPageHref, isAdminAppHash, isBusinessPage, readAdminPage } from './adminRoutes'

describe('admin route helpers', () => {
  it('builds stable admin page hashes', () => {
    expect(adminPageHref('overview')).toBe('#/app/overview')
    expect(adminPageHref('billing')).toBe('#/app/billing')
  })

  it('parses valid admin pages and falls back safely', () => {
    expect(readAdminPage('#/app')).toBe('overview')
    expect(readAdminPage('#/app/')).toBe('overview')
    expect(readAdminPage('#/app/queue')).toBe('queue')
    expect(readAdminPage('#/app/customers?source=test')).toBe('customers')
    expect(readAdminPage('#/app/not-a-page')).toBe('overview')
    expect(readAdminPage('#/login')).toBe('overview')
  })

  it('keeps the legacy billing hash compatible', () => {
    expect(readAdminPage('#billing-section')).toBe('billing')
    expect(isAdminAppHash('#billing-section')).toBe(true)
  })

  it('classifies business pages independently from operational pages', () => {
    expect(isBusinessPage('appointments')).toBe(true)
    expect(isBusinessPage('billing')).toBe(true)
    expect(isBusinessPage('queue')).toBe(false)
  })
})
