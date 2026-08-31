import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { I18nProvider } from './i18n'
import type { Auth } from './types'

vi.mock('./DashboardView', () => ({ default: ({ auth }: { auth: Auth }) => <div data-testid="admin-dashboard">Admin dashboard: {auth.name}</div> }))
vi.mock('./BarberPortal', () => ({ default: ({ auth }: { auth: Auth }) => <div data-testid="barber-portal">Barber portal: {auth.name}</div> }))
vi.mock('./SubscriptionBanner', () => ({ default: () => null }))

const ownerAuth: Auth = {
  accessToken: 'access-token', expiresAtUtc: '2099-01-01T00:00:00Z',
  userId: 'owner-1', barberShopId: 'shop-1', name: 'Jairo', role: 'Owner', isEmailVerified: true,
  sessionScope: 'Tenant',
}

function renderApp() {
  return render(<I18nProvider><App /></I18nProvider>)
}

describe('App authentication and role routing', () => {
  beforeEach(() => {
    localStorage.setItem('barberturn.locale', 'es-419')
    vi.stubGlobal('fetch', vi.fn())
  })

  it('logs in with valid credentials and opens the admin dashboard', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify(ownerAuth), { status: 200, headers: { 'Content-Type': 'application/json' } }))
    const user = userEvent.setup()
    renderApp()

    await user.type(screen.getByPlaceholderText('ejemplo@barberia.com'), 'jairo@example.com')
    await user.type(screen.getByPlaceholderText('••••••••••••'), 'Secure123!')
    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }))

    expect(await screen.findByTestId('admin-dashboard')).toHaveTextContent('Jairo')
    expect(JSON.parse(localStorage.getItem('barberturn.auth') ?? '{}').role).toBe('Owner')
  })

  it('shows a localized error for invalid credentials', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({
      code: 'AUTH_INVALID_CREDENTIALS', message: 'Invalid credentials', correlationId: 'corr-1',
    }), { status: 401, headers: { 'Content-Type': 'application/json' } }))
    const user = userEvent.setup()
    renderApp()

    await user.type(screen.getByPlaceholderText('ejemplo@barberia.com'), 'wrong@example.com')
    await user.type(screen.getByPlaceholderText('••••••••••••'), 'Wrong123!')
    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Correo o contraseña incorrectos.')
  })

  it('redirects a Barber role to the barber portal', async () => {
    localStorage.setItem('barberturn.auth', JSON.stringify({ ...ownerAuth, role: 'Barber', barberId: 'barber-1' }))
    renderApp()
    expect(await screen.findByTestId('barber-portal')).toHaveTextContent('Barber portal: Jairo')
    expect(screen.queryByTestId('admin-dashboard')).not.toBeInTheDocument()
  })
})
