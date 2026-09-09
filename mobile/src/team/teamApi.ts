import { apiRequest } from '@/api/httpClient';

export type TeamRole = 'Administrator' | 'Receptionist' | 'Barber';

export type TeamMember = {
  id: string;
  name: string;
  email: string;
  role: string;
  barberId: string | null;
  isActive: boolean;
  isEmailVerified: boolean;
};

export type OperationalBarber = {
  id: string;
  name: string;
  chairNumber: number;
  status: string;
  isActive: boolean;
};

export type JoinRequest = {
  id: string;
  userId: string;
  barberName: string;
  email: string;
  createdAtUtc: string;
};

export type Invitation = {
  id: string;
  email: string;
  role: string;
  expiresAtUtc: string;
  developmentAcceptanceUrl: string | null;
};

export const getTeam = (token: string) => apiRequest<TeamMember[]>('/api/team/', {}, token);
export const getOperationalBarbers = (token: string) => apiRequest<OperationalBarber[]>('/api/queue/barbers', {}, token);
export const getJoinRequests = (token: string) => apiRequest<JoinRequest[]>('/api/team/join-requests/', {}, token);

export const createOperationalBarber = (token: string, name: string, chairNumber: number) =>
  apiRequest<OperationalBarber>('/api/queue/barbers', {
    method: 'POST',
    body: JSON.stringify({ name, chairNumber }),
  }, token);

export const inviteTeamMember = (token: string, name: string, email: string, role: TeamRole, barberId: string | null, chairNumber?: number) =>
  apiRequest<Invitation>('/api/team/invitations', {
    method: 'POST',
    body: JSON.stringify({ name, email, role, barberId, chairNumber }),
  }, token);

export const approveJoinRequest = (token: string, requestId: string, chairNumber: number) =>
  apiRequest<void>(`/api/team/join-requests/${requestId}/approve`, {
    method: 'POST',
    body: JSON.stringify({ chairNumber }),
  }, token);

export const rejectJoinRequest = (token: string, requestId: string, note?: string) =>
  apiRequest<void>(`/api/team/join-requests/${requestId}/reject`, {
    method: 'POST',
    body: JSON.stringify({ note: note || null }),
  }, token);

export const deactivateTeamMember = (token: string, userId: string) =>
  apiRequest<void>(`/api/team/${userId}`, { method: 'DELETE' }, token);
