import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import ReportsSection from './ReportsSection'
import type { Capabilities } from '../../../portals/admin/commercialTypes'

vi.mock('../../../api', () => ({ api: vi.fn() }))

const starterCapabilities: Capabilities = {
  plan: 'Starter', status: 'Active', activeBarbers: 1, barberLimit: 2,
  activeLocations: 1, locationLimit: 1, canUseAppointments: false, canUseTv: false,
  canUseAdvancedReports: false, isDemo: false,
}

describe('Reports capability paywall', () => {
  it('keeps a Starter-only feature visible with its Business CTA', () => {
    render(<ReportsSection isDemo={false} capabilities={starterCapabilities} />)
    expect(screen.getByText('🔒 Reportes avanzados')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Disponible con BarberTurn Business' })).toHaveAttribute('href', '#billing-section')
  })
})
