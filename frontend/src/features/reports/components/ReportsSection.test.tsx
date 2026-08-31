import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import ReportsSection from './ReportsSection'
import { I18nProvider } from '../../../i18n'
import type { Capabilities } from '../../../portals/admin/commercialTypes'

vi.mock('../../../api', () => ({ api: vi.fn() }))

const starterCapabilities: Capabilities = {
  plan: 'Starter', status: 'Active', activeBarbers: 1, barberLimit: 5,
  activeServices: 3, serviceLimit: Number.MAX_SAFE_INTEGER,
  activeLocations: 1, locationLimit: 1,
  turnsThisMonth: 20, monthlyTurnLimit: 1000, monthlyTurnGraceLimit: 1050,
  historyRetentionDays: 90,
  canUseAppointments: false, canUseTv: false,
  canUseAdvancedReports: false, canUseAdvancedAutomation: false,
  isDemo: false, isSystemAdmin: false,
}

describe('Reports capability paywall', () => {
  it('keeps a Starter-only feature visible with its Business CTA', () => {
    localStorage.setItem('barberturn.locale', 'es-419')
    render(<I18nProvider><ReportsSection isDemo={false} capabilities={starterCapabilities} /></I18nProvider>)
    expect(screen.getByText('🔒 Reportes avanzados')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Disponible con BarberTurn Business' })).toHaveAttribute('href', '#/app/billing')
  })
})