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
export type ReportMoneyBreakdown = { key: string; label: string; revenueByCurrency: Record<string, number>; count: number }
export type ReportBarberBreakdown = { barberId: string; barberName: string; completedServices: number; serviceMinutes: number; activitySharePercent: number; revenueByCurrency: Record<string, number> }
export type ReportServiceBreakdown = { serviceId: string; serviceName: string; completedServices: number; revenueByCurrency: Record<string, number> }
export type ReportHourBreakdown = { hour: number; completedServices: number }
export type ReportPeriodComparison = {
  from: string
  to: string
  completedTurns: number
  appointments: number
  noShows: number
  noShowRatePercent: number
  revenueByCurrency: Record<string, number>
  averageTicketByCurrency: Record<string, number>
}
export type Report = {
  from: string
  to: string
  completedTurns: number
  cancelledTurns: number
  noShows: number
  appointments: number
  noShowRatePercent: number
  revenueByCurrency: Record<string, number>
  averageTicketByCurrency: Record<string, number>
  revenueByMethod: ReportMoneyBreakdown[]
  revenueByBarber: ReportBarberBreakdown[]
  revenueByService: ReportServiceBreakdown[]
  peakHours: ReportHourBreakdown[]
  previousPeriod: ReportPeriodComparison
}
export type TeamMember = { id: string; name: string; email: string; role: string; isActive: boolean }
export type Subscription = { plan: string; status: string; provider: string; periodEndsAtUtc?: string; cancelAtPeriodEnd: boolean }
export type Capabilities = { plan: string; status: string; activeBarbers: number; barberLimit: number; activeServices: number; serviceLimit: number; activeLocations: number; locationLimit: number; turnsThisMonth: number; monthlyTurnLimit: number; monthlyTurnGraceLimit: number; historyRetentionDays: number; canUseAppointments: boolean; canUseTv: boolean; canUseAdvancedReports: boolean; canUseAdvancedAutomation: boolean; isDemo: boolean; isSystemAdmin: boolean }
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
