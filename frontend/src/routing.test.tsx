import { describe, expect, it } from 'vitest'
import { adminPagePath, isAdminAppPath, parseAdminPagePath } from './portals/admin/adminRoutes'

describe('formal router contracts', () => {
  it('keeps canonical admin paths stable for HashRouter', () => {
    for (const page of ['overview', 'appointments', 'customers', 'payments', 'reports', 'billing'] as const) {
      const path = adminPagePath(page)
      expect(isAdminAppPath(path)).toBe(true)
      expect(parseAdminPagePath(path)).toBe(page)
    }
  })

  it('rejects nested or unknown admin paths instead of partially matching them', () => {
    expect(parseAdminPagePath('/app/customers/details')).toBeNull()
    expect(parseAdminPagePath('/app/unknown')).toBeNull()
  })
})
