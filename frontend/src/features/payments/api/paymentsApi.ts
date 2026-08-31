import { api } from '../../../api'
import type { CashSession, Payment } from '../../../portals/admin/commercialTypes'

export async function getCurrentCashSession() {
  return api<CashSession | undefined>('/api/cash/current')
}

export async function getRecentCashSessions(take = 8) {
  return api<CashSession[]>(`/api/cash/sessions?take=${take}`)
}

export async function openCashSession(currency: string, openingBalance: number) {
  return api<CashSession>('/api/cash/open', {
    method: 'POST',
    body: JSON.stringify({ currency, openingBalance }),
  })
}

export async function addCashMovement(type: 'CashIn' | 'CashOut', amount: number, reason: string) {
  return api<CashSession>('/api/cash/movements', {
    method: 'POST',
    body: JSON.stringify({ type, amount, reason }),
  })
}

export async function closeCashSession(countedCash: number, note?: string) {
  return api<CashSession>('/api/cash/close', {
    method: 'POST',
    body: JSON.stringify({ countedCash, note: note || null }),
  })
}

export async function getPayments(from: Date, to: Date) {
  return api<Payment[]>(`/api/payments?from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}`)
}

export async function createPayment(payload: {
  amount: number
  currency: string
  method: string
  customerId?: string | null
  appointmentId?: string | null
  turnId?: string | null
  externalReference?: string | null
}) {
  return api<Payment>('/api/payments', { method: 'POST', body: JSON.stringify(payload) })
}

export async function refundPayment(paymentId: string, reason?: string) {
  return api<Payment>(`/api/payments/${paymentId}/refund`, {
    method: 'POST',
    body: JSON.stringify({ reason: reason || null }),
  })
}
