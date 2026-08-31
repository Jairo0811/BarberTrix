export type Customer = { id: string; name: string; phone?: string | null; email?: string | null; isActive?: boolean; createdAtUtc?: string }
export type CustomerAppointment = {
  id: string
  startsAtUtc: string
  endsAtUtc: string
  serviceName: string
  barberName: string
  status: string
}
export type CustomerProfile = {
  customer: Customer
  notes?: string | null
  completedVisits: number
  lastVisitAtUtc?: string | null
  lifetimeSpendByCurrency: Record<string, number>
  recentAppointments: CustomerAppointment[]
}
export type Appointment = {
  id: string
  serviceId: string
  serviceName: string
  barberId: string
  barberName: string
  startsAtUtc: string
  endsAtUtc: string
  customerName: string
  customerPhone?: string | null
  customerEmail?: string | null
  status: string
}
export type Report = { completedTurns: number; cancelledTurns: number; noShows: number; appointments: number; grossRevenue: number }
export type TeamMember = { id: string; name: string; email: string; role: string; isActive: boolean }
export type Subscription = { plan: string; status: string; provider: string; periodEndsAtUtc?: string; cancelAtPeriodEnd: boolean }
export type Capabilities = { plan: string; status: string; activeBarbers: number; barberLimit: number; activeLocations: number; locationLimit: number; canUseAppointments: boolean; canUseTv: boolean; canUseAdvancedReports: boolean; isDemo: boolean; isSystemAdmin: boolean }
export type Shop = { name: string; slug: string; timeZoneId: string }
export type Location = { id: string; name: string; slug: string; address?: string; timeZoneId: string; isActive: boolean }
export type Payment = {
  id: string
  amount: number
  currency: string
  method: string
  status: string
  turnId?: string | null
  appointmentId?: string | null
  customerId?: string | null
  externalReference?: string | null
  paidAtUtc?: string | null
}
export type CashMovement = {
  id: string
  type: 'CashIn' | 'CashOut'
  amount: number
  reason: string
  createdAtUtc: string
}
export type CashSession = {
  id: string
  currency: string
  openingBalance: number
  openedAtUtc: string
  closedAtUtc?: string | null
  cashSales: number
  nonCashSales: number
  cashIn: number
  cashOut: number
  expectedCash: number
  countedCash?: number | null
  difference?: number | null
  closingNote?: string | null
  movements: CashMovement[]
}
