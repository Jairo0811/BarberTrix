import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import BarberPortal from './BarberPortal'
import type { Auth } from './types'

const { apiMock } = vi.hoisted(() => ({ apiMock: vi.fn() }))
vi.mock('./api', () => ({ api: apiMock }))
vi.mock('./alerts', () => ({ showError: vi.fn(), showSuccessToast: vi.fn() }))

const barberAuth: Auth = {
  accessToken: 'barber-token', expiresAtUtc: '2099-01-01T00:00:00Z',
  userId: 'user-1', barberShopId: 'shop-1', barberId: 'barber-1',
  name: 'Carlos', role: 'Barber', isEmailVerified: true,
}

describe('BarberPortal', () => {
  beforeEach(() => {
    apiMock.mockImplementation((path: string) => {
      if (path === '/api/queue/barbers') return Promise.resolve([{ id: 'barber-1', name: 'Carlos', chairNumber: 2, status: 'Available', isActive: true }])
      if (path === '/api/queue/turns') return Promise.resolve([])
      if (path === '/api/capabilities') return Promise.resolve({ canUseAppointments: false, isDemo: false })
      return Promise.resolve([])
    })
  })

  it('shows only the operational workspace for a barber', async () => {
    render(<BarberPortal auth={barberAuth} onLogout={vi.fn()} />)

    expect(await screen.findByRole('heading', { name: 'Tu trabajo de hoy, sin ruido administrativo.' })).toBeInTheDocument()
    expect(await screen.findByText('Available')).toBeInTheDocument()
    expect(screen.getByText('Disponible con BarberTurn Pro')).toBeInTheDocument()
    expect(screen.queryByText('Suscripción')).not.toBeInTheDocument()
  })
})
