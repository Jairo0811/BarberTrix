import { render, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import DemoLoginPage from './DemoLoginPage'
import { I18nProvider } from './i18n'
import type { Auth } from './types'

const demoAuth: Auth = {
  accessToken: 'demo-token', expiresAtUtc: '2099-01-01T00:00:00Z',
  userId: 'demo-user', barberShopId: 'demo-shop', name: 'Demo', role: 'Owner', isEmailVerified: true,
  sessionScope: 'Tenant',
}

describe('DemoLoginPage', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(demoAuth), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    })))
  })

  it('creates a temporary demo session and returns to login', async () => {
    render(<I18nProvider><DemoLoginPage /></I18nProvider>)

    await waitFor(() => expect(sessionStorage.getItem('barbertrix.demo')).toBe('true'))
    expect(JSON.parse(sessionStorage.getItem('barbertrix.auth') ?? '{}').accessToken).toBe('demo-token')
    expect(window.location.hash).toBe('#/login')
  })
})
