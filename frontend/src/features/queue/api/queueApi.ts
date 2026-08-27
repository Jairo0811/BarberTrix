import { api } from '../../../api'
import type { Barber, BarberStatus, Service, Turn } from '../../../types'

export type QueueMetrics = {
  waiting: number
  called: number
  inService: number
  completedToday: number
  cancelledToday: number
  noShowToday: number
  availableBarbers: number
  estimatedWaitMinutes: number
}

export type QueueSnapshot = {
  barbers: Barber[]
  services: Service[]
  turns: Turn[]
  metrics: QueueMetrics
}

export async function getQueueSnapshot(): Promise<QueueSnapshot> {
  const [barbers, services, turns, metrics] = await Promise.all([
    api<Barber[]>('/api/queue/barbers'),
    api<Service[]>('/api/queue/services'),
    api<Turn[]>('/api/queue/turns'),
    api<QueueMetrics>('/api/queue/metrics'),
  ])

  return { barbers, services, turns, metrics }
}

export function createQueueTurn(body: { serviceId: FormDataEntryValue | null; customerName: FormDataEntryValue | null; barberId: FormDataEntryValue | null }) {
  return api<Turn>('/api/queue/turns', { method: 'POST', body: JSON.stringify(body) })
}

export function transitionQueueTurn(turnId: string, action: 'call' | 'start' | 'complete' | 'cancel' | 'no-show', barberId?: string) {
  const suffix = action === 'call' ? `/call/${barberId}` : `/${action}`
  return api<Turn>(`/api/queue/turns/${turnId}${suffix}`, { method: 'POST' })
}

export function createBarber(body: { name: FormDataEntryValue | null; chairNumber: number }) {
  return api<Barber>('/api/queue/barbers', { method: 'POST', body: JSON.stringify(body) })
}

export function updateBarber(barber: Barber, body: { name: string; chairNumber: number; isActive: boolean }) {
  return api<Barber>(`/api/queue/barbers/${barber.id}`, { method: 'PUT', body: JSON.stringify(body) })
}

export function updateBarberStatus(barberId: string, status: BarberStatus) {
  return api<Barber>(`/api/queue/barbers/${barberId}/status`, { method: 'PATCH', body: JSON.stringify({ status }) })
}

export function createService(body: { name: FormDataEntryValue | null; price: number; estimatedDurationMinutes: number; description: FormDataEntryValue | null }) {
  return api<Service>('/api/queue/services', { method: 'POST', body: JSON.stringify(body) })
}

export function updateService(service: Service, body: { name: string; price: number; estimatedDurationMinutes: number; description: string | null; isActive: boolean }) {
  return api<Service>(`/api/queue/services/${service.id}`, { method: 'PUT', body: JSON.stringify(body) })
}
