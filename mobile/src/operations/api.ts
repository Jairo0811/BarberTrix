import { apiRequest } from '@/api/httpClient';
export type TodayTurn = { id: string; ticketNumber: string; customerName?: string; serviceName: string; barberId?: string; status: 'Waiting' | 'Called' | 'InService' | 'Completed' | 'Cancelled' | 'NoShow' };
export type Today = {
  shopName: string; shopSlug: string; timeZoneId: string; updatedAtUtc: string;
  turns: TodayTurn[]; barbers: { id: string; name: string; status: string }[];
  appointments: { id: string; startsAtUtc: string; customerName: string; serviceName: string; status: string }[];
  pendingRequests: number; estimatedWaitMinutes: number;
};
export const getToday = (token: string) => apiRequest<Today>('/api/operations/today', {}, token);
export const operateTurn = (token: string, id: string, action: string) => apiRequest(`/api/queue/turns/${id}/${action}`, { method: 'POST' }, token);
export const changeAvailability = (token: string, id: string, status: 'Available' | 'Break' | 'Offline') => apiRequest(`/api/queue/barbers/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }, token);
