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
  const customers: Array<Record<string, unknown>> = [{ id: 'customer-1', name: 'Ana Pérez', phone: '8095550101', email: 'ana@example.com', isActive: true, createdAtUtc: '2026-08-01T12:00:00Z' }]
  const customerNotes = new Map<string, string>()
  const payments: Array<Record<string, unknown>> = []
  const cashSessions: Array<Record<string, any>> = []
  let currentCashSession: Record<string, any> | null = null

  function refreshCashSession() {
    if (!currentCashSession) return
    const currency = currentCashSession.currency as string
    const openedAt = new Date(currentCashSession.openedAtUtc as string).getTime()
    const sessionPayments = payments.filter(payment =>
      payment.currency === currency
      && typeof payment.paidAtUtc === 'string'
      && new Date(payment.paidAtUtc).getTime() >= openedAt,
    )
    currentCashSession.cashSales = sessionPayments
      .filter(payment => payment.method === 'Cash' && (payment.status === 'Paid' || payment.status === 'Refunded'))
      .reduce((total, payment) => total + Number(payment.amount), 0)
    currentCashSession.nonCashSales = sessionPayments
      .filter(payment => payment.method !== 'Cash' && payment.status === 'Paid')
      .reduce((total, payment) => total + Number(payment.amount), 0)
    const movements = currentCashSession.movements as Array<Record<string, any>>
    currentCashSession.cashIn = movements.filter(item => item.type === 'CashIn').reduce((total, item) => total + Number(item.amount), 0)
    currentCashSession.cashOut = movements.filter(item => item.type === 'CashOut').reduce((total, item) => total + Number(item.amount), 0)
    currentCashSession.expectedCash = Number(currentCashSession.openingBalance) + Number(currentCashSession.cashSales) + Number(currentCashSession.cashIn) - Number(currentCashSession.cashOut)
  }

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
      body: status === 204 ? '' : JSON.stringify(body),
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

    if (path === '/api/customers' && method === 'GET') { await json(route, customers); return }
    if (path === '/api/customers' && method === 'POST') {
      const payload = request.postDataJSON() as { name: string; phone?: string; email?: string }
      const customer = { id: `customer-${customers.length + 1}`, name: payload.name, phone: payload.phone || null, email: payload.email || null, isActive: true, createdAtUtc: new Date().toISOString() }
      customers.push(customer)
      await json(route, customer, 201)
      return
    }
    const customerRoute = path.match(/^\/api\/customers\/([^/]+)$/)
    if (customerRoute && method === 'PUT') {
      const customer = customers.find(item => item.id === customerRoute[1])
      if (!customer) { await json(route, {}, 404); return }
      const payload = request.postDataJSON() as { name: string; phone?: string; email?: string }
      customer.name = payload.name
      customer.phone = payload.phone || null
      customer.email = payload.email || null
      await json(route, customer)
      return
    }
    const customerProfileRoute = path.match(/^\/api\/customers\/([^/]+)\/profile$/)
    if (customerProfileRoute && method === 'GET') {
      const customer = customers.find(item => item.id === customerProfileRoute[1])
      if (!customer) { await json(route, {}, 404); return }
      await json(route, {
        customer,
        notes: customerNotes.get(customerProfileRoute[1]) || null,
        completedVisits: 3,
        lastVisitAtUtc: '2026-08-28T15:30:00Z',
        lifetimeSpendByCurrency: { DOP: 1800 },
        recentAppointments: [
          { id: 'crm-appointment-1', startsAtUtc: '2026-08-28T15:00:00Z', endsAtUtc: '2026-08-28T15:30:00Z', serviceName: 'Corte clásico', barberName: 'Carlos', status: 'Completed' },
        ],
      })
      return
    }
    const customerNotesRoute = path.match(/^\/api\/customers\/([^/]+)\/notes$/)
    if (customerNotesRoute && method === 'PUT') {
      const customer = customers.find(item => item.id === customerNotesRoute[1])
      if (!customer) { await json(route, {}, 404); return }
      const payload = request.postDataJSON() as { notes?: string | null }
      customerNotes.set(customerNotesRoute[1], payload.notes || '')
      await json(route, {}, 204)
      return
    }

    if (path === '/api/cash/current' && method === 'GET') {
      if (!currentCashSession) { await json(route, {}, 204); return }
      refreshCashSession()
      await json(route, currentCashSession)
      return
    }
    if (path === '/api/cash/sessions' && method === 'GET') {
      refreshCashSession()
      await json(route, cashSessions.slice().reverse())
      return
    }
    if (path === '/api/cash/open' && method === 'POST') {
      if (currentCashSession) { await json(route, { message: 'A cash session is already open.' }, 400); return }
      const payload = request.postDataJSON() as { currency: string; openingBalance: number }
      currentCashSession = {
        id: `cash-session-${cashSessions.length + 1}`,
        currency: payload.currency,
        openingBalance: Number(payload.openingBalance),
        openedAtUtc: new Date().toISOString(),
        closedAtUtc: null,
        cashSales: 0,
        nonCashSales: 0,
        cashIn: 0,
        cashOut: 0,
        expectedCash: Number(payload.openingBalance),
        countedCash: null,
        difference: null,
        closingNote: null,
        movements: [],
      }
      cashSessions.push(currentCashSession)
      await json(route, currentCashSession, 201)
      return
    }
    if (path === '/api/cash/movements' && method === 'POST') {
      if (!currentCashSession) { await json(route, { message: 'There is no open cash session.' }, 400); return }
      const payload = request.postDataJSON() as { type: string; amount: number; reason: string }
      ;(currentCashSession.movements as Array<Record<string, unknown>>).push({
        id: `movement-${(currentCashSession.movements as unknown[]).length + 1}`,
        type: payload.type,
        amount: Number(payload.amount),
        reason: payload.reason,
        createdAtUtc: new Date().toISOString(),
      })
      refreshCashSession()
      await json(route, currentCashSession, 201)
      return
    }
    if (path === '/api/cash/close' && method === 'POST') {
      if (!currentCashSession) { await json(route, { message: 'There is no open cash session.' }, 400); return }
      refreshCashSession()
      const payload = request.postDataJSON() as { countedCash: number; note?: string | null }
      currentCashSession.countedCash = Number(payload.countedCash)
      currentCashSession.difference = Number(payload.countedCash) - Number(currentCashSession.expectedCash)
      currentCashSession.closingNote = payload.note || null
      currentCashSession.closedAtUtc = new Date().toISOString()
      const closed = currentCashSession
      currentCashSession = null
      await json(route, closed)
      return
    }

    if (path === '/api/payments' && method === 'GET') { await json(route, payments.slice().reverse()); return }
    if (path === '/api/payments' && method === 'POST') {
      const payload = request.postDataJSON() as { amount: number; currency: string; method: string; externalReference?: string | null }
      const payment = {
        id: `payment-${payments.length + 1}`,
        amount: Number(payload.amount),
        currency: payload.currency,
        method: payload.method,
        status: ['Cash', 'Card', 'Transfer'].includes(payload.method) ? 'Paid' : 'Pending',
        turnId: null,
        appointmentId: null,
        customerId: null,
        externalReference: payload.externalReference || null,
        paidAtUtc: new Date().toISOString(),
      }
      payments.push(payment)
      refreshCashSession()
      await json(route, payment, 201)
      return
    }
    const refundRoute = path.match(/^\/api\/payments\/([^/]+)\/refund$/)
    if (refundRoute && method === 'POST') {
      const payment = payments.find(item => item.id === refundRoute[1])
      if (!payment) { await json(route, {}, 404); return }
      if (payment.status !== 'Paid') { await json(route, { message: 'Only paid records can be refunded.' }, 400); return }
      if (payment.method === 'Cash') {
        if (!currentCashSession) { await json(route, { message: 'Open a cash session before refunding a cash payment.' }, 400); return }
        ;(currentCashSession.movements as Array<Record<string, unknown>>).push({
          id: `movement-${(currentCashSession.movements as unknown[]).length + 1}`,
          type: 'CashOut',
          amount: payment.amount,
          reason: `Refund ${payment.id}: Customer refund`,
          createdAtUtc: new Date().toISOString(),
        })
      }
      payment.status = 'Refunded'
      refreshCashSession()
      await json(route, payment)
      return
    }

    if (path === '/api/team' || path === '/api/locations') { await json(route, []); return }
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

  return { turns, appointments, customers, payments, cashSessions }
}

export async function seedAuth(page: Page, auth: Record<string, unknown>, demo = false) {
  await page.addInitScript(({ storedAuth, isDemo }) => {
    localStorage.setItem('barberturn.locale', 'es-419')
    localStorage.setItem('barberturn.auth', JSON.stringify(storedAuth))
    if (isDemo) sessionStorage.setItem('barberturn.demo', 'true')
  }, { storedAuth: auth, isDemo: demo })
}
