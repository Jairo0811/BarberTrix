import { api } from '../../../api'
import type { Customer, CustomerProfile } from '../../../portals/admin/commercialTypes'

export type CustomerInput = {
  name: string
  phone?: string
  email?: string
}

export function listCustomers(take = 200) {
  return api<Customer[]>(`/api/customers?take=${take}`)
}

export function createCustomer(input: CustomerInput) {
  return api<Customer>('/api/customers', { method: 'POST', body: JSON.stringify(input) })
}

export function updateCustomer(id: string, input: CustomerInput) {
  return api<Customer>(`/api/customers/${id}`, { method: 'PUT', body: JSON.stringify(input) })
}

export function getCustomerProfile(id: string) {
  return api<CustomerProfile>(`/api/customers/${id}/profile`)
}

export function updateCustomerNotes(id: string, notes?: string) {
  return api(`/api/customers/${id}/notes`, { method: 'PUT', body: JSON.stringify({ notes: notes || null }) })
}
