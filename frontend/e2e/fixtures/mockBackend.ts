import type { Page, Route } from '@playwright/test'

type Plan = 'Starter' | 'Pro' | 'Business'
type MockOptions = { plan?: Plan; subscriptionStatus?: string; demo?: boolean }

const ownerAuth = { accessToken: 'e2e-owner-token', expiresAtUtc: '2099-01-01T00:00:00Z', userId: 'owner-1', barberShopId: 'shop-1', name: 'Jairo', role: 'Owner', isEmailVerified: true }
const demoAuth = { ...ownerAuth, accessToken: 'e2e-demo-token', userId: 'demo-1', barberShopId: 'demo-shop', name: 'Demo Owner' }

export function barberAuth() {
  return { ...ownerAuth, accessToken: 'e2e-barber-token', userId: 'barber-user', name: 'Carlos', role: 'Barber', barberId: 'barber-1' }
}

function capabilities(plan: Plan, demo: boolean) {
  return {
    plan, status: demo ? 'Demo' : 'Active', activeBarbers: 1, barberLimit: plan === 'Starter' ? 2 : 10000,
    activeLocations: 1, locationLimit: plan === 'Business' ? 20 : 1,
    canUseAppointments: plan !== 'Starter', canUseTv: plan !== 'Starter', canUseAdvancedReports: plan === 'Business', isDemo: demo, isSystemAdmin: false,
  }
}

export async function installMockBackend(page: Page, options: MockOptions = {}) {
  const plan = options.plan ?? 'Business'
  const isDemo = options.demo ?? false
  const barbers = [{ id: 'barber-1', name: 'Carlos', chairNumber: 1, status: 'Available', isActive: true }]
  const services = [{ id: 'service-1', name: 'Corte clásico', description: null, price: 500, estimatedDurationMinutes: 30, isActive: true }]
  const turns: Array<Record<string, unknown>> = []
  const appointments: Array<Record<string, unknown>> = []

  async function json(route: Route, body: unknown, status = 200) {
    await route.fulfill({
      status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': 'http://127.0.0.1:4173',
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-Correlation-ID',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      },
      body: JSON.stringify(body),
    })
  }

  await page.route('http://localhost:8080/**', async route => {
    const request = route.request()
    const method = request.method()
    const url = new URL(request.url())
    const path = url.pathname
    if (method === 'OPTIONS') { await json(route, {}, 204); return }

    if (path === '/api/auth/register-owner' && method === 'POST') { await json(route, ownerAuth); return }
    if (path === '/api/auth/login' && method === 'POST') { await json(route, ownerAuth); return }
    if (path === '/api/auth/demo-login' && method === 'POST') { await json(route, demoAuth); return }
    if (path === '/api/auth/logout' && method === 'POST') { await json(route, {}, 204); return }

    if (path === '/api/capabilities') { await json(route, capabilities(plan, isDemo)); return }
    if (path === '/api/billing/subscription') { await json(route, { plan, status: options.subscriptionStatus ?? (isDemo ? 'Demo' : 'Active'), provider: isDemo ? 'Demo' : 'PayPal', cancelAtPeriodEnd: false }); return }
    if (path === '/api/billing/checkout' && method === 'POST') { await json(route, { approvalUrl: 'https://www.sandbox.paypal.com/checkoutnow?token=e2e' }); return }

    if (path === '/api/queue/barbers' && method === 'GET') { await json(route, barbers); return }
    if (path === '/api/queue/services' && method === 'GET') { await json(route, services); return }
    if (path === '/api/queue/turns' && method === 'GET') { await json(route, turns); return }
    if (path === '/api/queue/turns' && method === 'POST') {
      const payload = request.postDataJSON() as { customerName?: string }
      const turn = { id: 'turn-1', ticketNumber: 'BT-001', customerName: payload.customerName || null, status: 'Waiting', serviceId: 'service-1', serviceName: 'Corte clásico', barberId: null, barberName: null, chairNumber: null }
      turns.splice(0, turns.length, turn)
      await json(route, turn, 201)
      return
    }
    if (path === '/api/queue/metrics') {
      await json(route, { waiting: turns.filter(x => x.status === 'Waiting').length, called: turns.filter(x => x.status === 'Called').length, inService: turns.filter(x => x.status === 'InService').length, completedToday: turns.filter(x => x.status === 'Completed').length, cancelledToday: 0, noShowToday: 0, availableBarbers: barbers.filter(x => x.status === 'Available').length, estimatedWaitMinutes: 5 })
      return
    }
    const transition = path.match(/^\/api\/queue\/turns\/([^/]+)\/(call\/[^/]+|start|complete|cancel|no-show)$/)
    if (transition && method === 'POST') {
      const turn = turns.find(x => x.id === transition[1])
      const action = transition[2]
      if (turn) {
        if (action.startsWith('call/')) { turn.status = 'Called'; turn.barberId = 'barber-1'; turn.barberName = 'Carlos'; turn.chairNumber = 1 }
        if (action === 'start') turn.status = 'InService'
        if (action === 'complete') turn.status = 'Completed'
        if (action === 'cancel') turn.status = 'Cancelled'
        if (action === 'no-show') turn.status = 'NoShow'
      }
      await json(route, turn ?? {}, 200)
      return
    }
    if (/^\/api\/queue\/barbers\/[^/]+\/status$/.test(path) && method === 'PATCH') {
      barbers[0].status = (request.postDataJSON() as { status: string }).status
      await json(route, barbers[0])
      return
    }

    if (path === '/api/shop/settings') { await json(route, { name: 'Barbería Central', slug: 'central', timeZoneId: 'America/Santo_Domingo' }); return }
    if (path === '/api/appointments' && method === 'GET') { await json(route, appointments); return }
    if (path === '/api/appointments' && method === 'POST') {
      const payload = request.postDataJSON() as { serviceId: string; barberId: string; startsAt: string; customerName: string; customerPhone?: string; customerEmail?: string }
      const start = new Date(payload.startsAt)
      const appointment = {
        id: `appointment-${appointments.length + 1}`,
        serviceId: payload.serviceId,
        serviceName: 'Corte clásico',
        barberId: payload.barberId,
        barberName: 'Carlos',
        startsAtUtc: start.toISOString(),
        endsAtUtc: new Date(start.getTime() + 30 * 60_000).toISOString(),
        customerName: payload.customerName,
        customerPhone: payload.customerPhone || null,
        customerEmail: payload.customerEmail || null,
        status: 'Confirmed',
      }
      appointments.push(appointment)
      await json(route, appointment, 201)
      return
    }
    const appointmentRoute = path.match(/^\/api\/appointments\/([^/]+)$/)
    if (appointmentRoute && method === 'PUT') {
      const appointment = appointments.find(item => item.id === appointmentRoute[1])
      if (!appointment) { await json(route, {}, 404); return }
      const payload = request.postDataJSON() as { barberId: string; startsAt: string }
      const start = new Date(payload.startsAt)
      appointment.barberId = payload.barberId
      appointment.barberName = 'Carlos'
      appointment.startsAtUtc = start.toISOString()
      appointment.endsAtUtc = new Date(start.getTime() + 30 * 60_000).toISOString()
      await json(route, appointment)
      return
    }
    if (appointmentRoute && method === 'DELETE') {
      const appointment = appointments.find(item => item.id === appointmentRoute[1])
      if (appointment) appointment.status = 'Cancelled'
      await json(route, appointment ?? {}, appointment ? 200 : 404)
      return
    }
    const appointmentAction = path.match(/^\/api\/appointments\/([^/]+)\/(check-in|complete|no-show)$/)
    if (appointmentAction && method === 'POST') {
      const appointment = appointments.find(item => item.id === appointmentAction[1])
      if (appointment) {
        if (appointmentAction[2] === 'check-in') appointment.status = 'CheckedIn'
        if (appointmentAction[2] === 'complete') appointment.status = 'Completed'
        if (appointmentAction[2] === 'no-show') appointment.status = 'NoShow'
      }
      await json(route, appointment ?? {}, appointment ? 200 : 404)
      return
    }
    if (path === '/api/customers' || path === '/api/team' || path === '/api/payments' || path === '/api/locations') { await json(route, []); return }
    if (path === '/api/reports/business') { await json(route, { completedTurns: 0, cancelledTurns: 0, noShows: 0, appointments: appointments.length, grossRevenue: 0 }); return }

    if (path === '/api/public/shops/central/capabilities') { await json(route, { canUseAppointments: plan !== 'Starter', canUseTv: plan !== 'Starter' }); return }
    if (path === '/api/public/shops/central/queue') { await json(route, { estimatedWaitMinutes: 5, turns: [] }); return }
    if (path === '/api/public/shops/central') { await json(route, { name: 'Barbería Central', slug: 'central', timeZoneId: 'America/Santo_Domingo', services, barbers }); return }
    if (path === '/api/public/shops/central/appointments/availability' && method === 'GET') {
      const date = url.searchParams.get('date') ?? '2099-01-01'
      await json(route, [
        { startsAtUtc: `${date}T14:00:00.000Z`, endsAtUtc: `${date}T14:30:00.000Z`, barberId: 'barber-1', barberName: 'Carlos' },
        { startsAtUtc: `${date}T15:00:00.000Z`, endsAtUtc: `${date}T15:30:00.000Z`, barberId: 'barber-1', barberName: 'Carlos' },
      ])
      return
    }

    if (path.startsWith('/hubs/queue')) { await json(route, { code: 'REALTIME_UNAVAILABLE_IN_E2E' }, 404); return }
    await json(route, { code: 'E2E_ROUTE_NOT_CONFIGURED', message: `${method} ${path}` }, 404)
  })

  return { turns, appointments }
}

export async function seedAuth(page: Page, auth: Record<string, unknown>, demo = false) {
  await page.addInitScript(({ storedAuth, isDemo }) => {
    localStorage.setItem('barberturn.locale', 'es-419')
    localStorage.setItem('barberturn.auth', JSON.stringify(storedAuth))
    if (isDemo) sessionStorage.setItem('barberturn.demo', 'true')
  }, { storedAuth: auth, isDemo: demo })
}
