import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import ReportsSection from './ReportsSection'
import { I18nProvider } from '../../../i18n'
import type { Capabilities } from '../../../portals/admin/commercialTypes'

vi.mock('../../../api', () => ({ api: vi.fn() }))

const starterCapabilities: Capabilities = {
  plan: 'Starter', status: 'Active', activeBarbers: 1, barberLimit: 2,
  activeLocations: 1, locationLimit: 1, canUseAppointments: false, canUseTv: false,
  canUseAdvancedReports: false, isDemo: false, isSystemAdmin: false,
}

describe('Reports capability paywall', () => {
  it('keeps a Starter-only feature visible with its Business CTA', () => {
    localStorage.setItem('barberturn.locale', 'es-419')
    render(<I18nProvider><ReportsSection isDemo={false} capabilities={starterCapabilities} /></I18nProvider>)
    expect(screen.getByText('🔒 Reportes avanzados')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Disponible con BarberTurn Business' })).toHaveAttribute('href', '#/app/billing')
  })
})