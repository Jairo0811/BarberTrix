import { apiRequest } from '@/api/httpClient';

export type BarberShopDirectoryItem = {
  id: string;
  name: string;
  slug: string;
  timeZoneId: string;
};

export type BarberJoinRequest = {
  id: string;
  barberShopId: string;
  barberShopName: string;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Withdrawn';
  createdAtUtc: string;
  reviewedAtUtc?: string | null;
  reviewNote?: string | null;
};

export function searchShops(accessToken: string, query = '') {
  const suffix = query.trim() ? `?query=${encodeURIComponent(query.trim())}` : '';
  return apiRequest<BarberShopDirectoryItem[]>(`/api/onboarding/shops${suffix}`, {}, accessToken);
}

export function getMyJoinRequests(accessToken: string) {
  return apiRequest<BarberJoinRequest[]>('/api/onboarding/join-requests', {}, accessToken);
}

export function requestJoin(accessToken: string, barberShopId: string) {
  return apiRequest<BarberJoinRequest>(`/api/onboarding/join-requests/${barberShopId}`, { method: 'POST' }, accessToken);
}

export function withdrawJoinRequest(accessToken: string, requestId: string) {
  return apiRequest<void>(`/api/onboarding/join-requests/${requestId}`, { method: 'DELETE' }, accessToken);
}
