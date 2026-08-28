import { apiRequest } from '@/api/httpClient';
import type { AvailabilitySlot, CreateTurnRequestInput, PublicShop, PublicTurnRequestResponse, TurnRequest } from './types';

export function getPublicShop(slug: string) {
  return apiRequest<PublicShop>(`/api/public/shops/${encodeURIComponent(slug)}`);
}

export function getAvailability(slug: string, serviceId: string, date: string, barberId?: string) {
  const params = new URLSearchParams({ serviceId, date });
  if (barberId) params.set('barberId', barberId);
  return apiRequest<AvailabilitySlot[]>(`/api/public/shops/${encodeURIComponent(slug)}/appointments/availability?${params.toString()}`);
}

export function createPublicTurnRequest(slug: string, input: CreateTurnRequestInput) {
  return apiRequest<PublicTurnRequestResponse>(`/api/public/shops/${encodeURIComponent(slug)}/turn-requests`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function getPublicTurnRequest(slug: string, requestId: string, lookupToken: string) {
  return apiRequest<TurnRequest>(`/api/public/shops/${encodeURIComponent(slug)}/turn-requests/${requestId}?token=${encodeURIComponent(lookupToken)}`);
}

export function cancelPublicTurnRequest(slug: string, requestId: string, lookupToken: string) {
  return apiRequest<void>(`/api/public/shops/${encodeURIComponent(slug)}/turn-requests/${requestId}?token=${encodeURIComponent(lookupToken)}`, { method: 'DELETE' });
}

export function acceptCounterProposal(slug: string, requestId: string, lookupToken: string) {
  return apiRequest<TurnRequest>(`/api/public/shops/${encodeURIComponent(slug)}/turn-requests/${requestId}/accept-counter?token=${encodeURIComponent(lookupToken)}`, { method: 'POST' });
}

export function getStaffTurnRequests(accessToken: string) {
  return apiRequest<TurnRequest[]>('/api/turn-requests', {}, accessToken);
}

export function acceptTurnRequest(requestId: string, accessToken: string) {
  return apiRequest<TurnRequest>(`/api/turn-requests/${requestId}/accept`, { method: 'POST' }, accessToken);
}

export function rejectTurnRequest(requestId: string, accessToken: string) {
  return apiRequest<TurnRequest>(`/api/turn-requests/${requestId}/reject`, { method: 'POST' }, accessToken);
}

export function counterProposeTurnRequest(requestId: string, startsAt: string, accessToken: string) {
  return apiRequest<TurnRequest>(`/api/turn-requests/${requestId}/counter`, {
    method: 'POST',
    body: JSON.stringify({ startsAt }),
  }, accessToken);
}
