import { apiRequest } from '@/api/httpClient';
import type { MobileSession } from './types';

type MobileAuthResponse = {
  accessToken: string;
  expiresAtUtc: string;
  refreshToken: string;
  refreshTokenExpiresAtUtc: string;
  userId: string;
  barberShopId: string;
  barberId?: string | null;
  name: string;
  role: string;
  isEmailVerified: boolean;
};

function mapSession(response: MobileAuthResponse): MobileSession {
  return {
    accessToken: response.accessToken,
    expiresAtUtc: response.expiresAtUtc,
    refreshToken: response.refreshToken,
    refreshTokenExpiresAtUtc: response.refreshTokenExpiresAtUtc,
    userId: response.userId,
    barberShopId: response.barberShopId,
    barberId: response.barberId ?? undefined,
    userName: response.name,
    role: response.role,
    isEmailVerified: response.isEmailVerified,
  };
}

export async function login(email: string, password: string): Promise<MobileSession> {
  const response = await apiRequest<MobileAuthResponse>('/api/auth/mobile/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  return mapSession(response);
}

export async function refreshSession(refreshToken: string): Promise<MobileSession> {
  const response = await apiRequest<MobileAuthResponse>('/api/auth/mobile/refresh', {
    method: 'POST',
    body: JSON.stringify({ refreshToken }),
  });
  return mapSession(response);
}

export async function logout(refreshToken: string): Promise<void> {
  await apiRequest<void>('/api/auth/mobile/logout', {
    method: 'POST',
    body: JSON.stringify({ refreshToken }),
  });
}
