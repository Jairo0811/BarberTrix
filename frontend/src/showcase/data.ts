/** Estado sintético: nunca se comunica con la API ni contiene información real. */
export type DemoRole = 'Owner' | 'Barber' | 'Receptionist' | 'Client'
export type DemoView = 'overview' | 'queue' | 'appointments' | 'services' | 'customers' | 'reports' | 'tv'
export type TurnStatus = 'Waiting' | 'Called' | 'InService' | 'Completed' | 'Cancelled'
export type AppointmentStatus = 'Confirmed' | 'Completed' | 'Cancelled'

export type DemoTurn = {
  id: string
  ticket: string
  customer: string
  serviceId: string
  barberId: string | null
  status: TurnStatus
}
export type DemoAppointment = {
  id: string
  customer: string
  serviceId: string
  barberId: string
  startsAt: string
  status: AppointmentStatus
}
export type DemoState = { turns: DemoTurn[]; appointments: DemoAppointment[]; nextTicket: number }

export const services = [
  { id: 'cut', name: 'Corte clásico', minutes: 35, price: 650 },
  { id: 'fade', name: 'Fade premium', minutes: 45, price: 850 },
  { id: 'beard', name: 'Arreglo de barba', minutes: 25, price: 450 },
  { id: 'combo', name: 'Corte + barba', minutes: 60, price: 1050 },
] as const

export const barbers = [
  { id: 'barber-1', name: 'Carlos Méndez', chair: 1, available: true },
  { id: 'barber-2', name: 'Miguel Santos', chair: 2, available: true },
  { id: 'barber-3', name: 'Andrés Rivera', chair: 3, available: false },
] as const

export const customers = [
  { id: 'c1', name: 'Ana Pérez', visits: 8, preference: 'Fade premium' },
  { id: 'c2', name: 'José Ramírez', visits: 4, preference: 'Corte clásico' },
  { id: 'c3', name: 'Luis Fernández', visits: 12, preference: 'Corte + barba' },
] as const

const tomorrow = () => {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  d.setHours(10, 0, 0, 0)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T10:00`
}

export function initialState(): DemoState {
  return {
    nextTicket: 18,
    turns: [
      { id: 't14', ticket: 'BT-014', customer: 'Ana Pérez', serviceId: 'fade', barberId: 'barber-1', status: 'InService' },
      { id: 't15', ticket: 'BT-015', customer: 'José Ramírez', serviceId: 'cut', barberId: 'barber-2', status: 'Called' },
      { id: 't16', ticket: 'BT-016', customer: 'Luis Fernández', serviceId: 'combo', barberId: null, status: 'Waiting' },
      { id: 't17', ticket: 'BT-017', customer: 'María Gómez', serviceId: 'beard', barberId: null, status: 'Waiting' },
    ],
    appointments: [
      { id: 'a1', customer: 'Ana Pérez', serviceId: 'fade', barberId: 'barber-1', startsAt: tomorrow(), status: 'Confirmed' },
      { id: 'a2', customer: 'Luis Fernández', serviceId: 'combo', barberId: 'barber-2', startsAt: tomorrow().replace('T10:00', 'T11:30'), status: 'Confirmed' },
    ],
  }
}

export type TurnAction = 'call' | 'start' | 'complete' | 'cancel'

export const allowedTurnActions: Record<TurnStatus, TurnAction[]> = {
  Waiting: ['call', 'cancel'],
  Called: ['start', 'cancel'],
  InService: ['complete'],
  Completed: [],
  Cancelled: [],
}

export function addTurn(state: DemoState, customer: string, serviceId: string): DemoState {
  if (!customer.trim() || !services.some(s => s.id === serviceId)) return state
  const n = state.nextTicket
  return {
    ...state,
    nextTicket: n + 1,
    turns: [...state.turns, { id: `t${n}`, ticket: `BT-${String(n).padStart(3, '0')}`, customer: customer.trim().slice(0, 80), serviceId, barberId: null, status: 'Waiting' }],
  }
}

export function advanceTurn(state: DemoState, id: string, action: TurnAction): DemoState {
  const turn = state.turns.find(t => t.id === id)
  if (!turn || !allowedTurnActions[turn.status].includes(action)) return state
  const next: TurnStatus = action === 'call' ? 'Called' : action === 'start' ? 'InService' : action === 'complete' ? 'Completed' : 'Cancelled'
  return {
    ...state,
    turns: state.turns.map(t => t.id === id ? { ...t, status: next, barberId: action === 'call' ? (t.barberId ?? 'barber-1') : t.barberId } : t),
  }
}

export function addAppointment(state: DemoState, customer: string, serviceId: string, barberId: string, startsAt: string): DemoState {
  if (!customer.trim() || !services.some(s => s.id === serviceId) || !barbers.some(b => b.id === barberId) || !startsAt) return state
  const time = new Date(startsAt)
  if (!Number.isFinite(time.getTime()) || time.getTime() < Date.now()) return state
  if (state.appointments.some(a => a.barberId === barberId && a.startsAt === startsAt && a.status === 'Confirmed')) return state
  return {
    ...state,
    appointments: [...state.appointments, { id: `a${state.appointments.length + 1}`, customer: customer.trim().slice(0, 80), serviceId, barberId, startsAt, status: 'Confirmed' }],
  }
}

export function updateAppointment(state: DemoState, id: string, status: AppointmentStatus): DemoState {
  return { ...state, appointments: state.appointments.map(a => a.id === id && a.status === 'Confirmed' ? { ...a, status } : a) }
}

export const serviceName = (id: string) => services.find(s => s.id === id)?.name ?? 'Servicio'
export const barberName = (id: string | null) => barbers.find(b => b.id === id)?.name ?? 'Sin asignar'
export const amount = (n: number) => `RD$ ${n.toLocaleString('es-DO')}`
