import { api } from '../../../api'
import type { Barber, Service } from '../../../types'
import type { Appointment } from '../../../portals/admin/commercialTypes'

export type AvailabilitySlot = {
  startsAtUtc: string
  endsAtUtc: string
  barberId: string
  barberName: string
}

export type CreateAppointmentInput = {
  serviceId: string
  barberId: string
  startsAt: string
  customerName: string
  customerPhone?: string
  customerEmail?: string
}

export type RescheduleAppointmentInput = {
  barberId: string
  startsAt: string
}

export function listAppointments(from: Date, to: Date) {
  return api<Appointment[]>(`/api/appointments?from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}`)
}

export function listAppointmentBarbers() {
  return api<Barber[]>('/api/queue/barbers')
}

export function listAppointmentServices() {
  return api<Service[]>('/api/queue/services')
}

export function listAvailability(shopSlug: string, serviceId: string, date: string, barberId: string) {
  const query = new URLSearchParams({ serviceId, date, barberId })
  return api<AvailabilitySlot[]>(`/api/public/shops/${encodeURIComponent(shopSlug)}/appointments/availability?${query}`)
}

export function createAppointment(input: CreateAppointmentInput) {
  return api<Appointment>('/api/appointments', { method: 'POST', body: JSON.stringify(input) })
}

export function rescheduleAppointment(id: string, input: RescheduleAppointmentInput) {
  return api<Appointment>(`/api/appointments/${id}`, { method: 'PUT', body: JSON.stringify(input) })
}

export function runAppointmentAction(id: string, action: 'check-in' | 'complete' | 'no-show' | 'cancel') {
  return api(`/api/appointments/${id}${action === 'cancel' ? '' : `/${action}`}`, { method: action === 'cancel' ? 'DELETE' : 'POST' })
}
