import { describe, expect, it } from 'vitest'
import { adminPageHref, adminPagePath, isAdminAppPath, isBusinessPage, parseAdminPagePath } from './adminRoutes'

describe('admin route helpers', () => {
  it('builds stable admin paths and hashes', () => {
    expect(adminPagePath('overview')).toBe('/app/overview')
    expect(adminPageHref('overview')).toBe('#/app/overview')
    expect(adminPageHref('billing')).toBe('#/app/billing')
  })

  it('parses valid admin paths without coupling to window.location', () => {
    expect(parseAdminPagePath('/app')).toBe('overview')
    expect(parseAdminPagePath('/app/')).toBe('overview')
    expect(parseAdminPagePath('/app/queue')).toBe('queue')
    expect(parseAdminPagePath('/app/customers/')).toBe('customers')
    expect(parseAdminPagePath('/app/not-a-page')).toBeNull()
    expect(parseAdminPagePath('/login')).toBeNull()
  })

  it('classifies admin and business routes independently', () => {
    expect(isAdminAppPath('/app/reports')).toBe(true)
    expect(isAdminAppPath('/login')).toBe(false)
    expect(isBusinessPage('appointments')).toBe(true)
    expect(isBusinessPage('billing')).toBe(true)
    expect(isBusinessPage('queue')).toBe(false)
  })
})
