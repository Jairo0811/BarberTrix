import { apiRequest } from '@/api/httpClient';
import type { MobileAuthResponse } from './types';

export type ExternalAuthProvider = 'google' | 'apple';

export function login(email: string, password: string) {
  return apiRequest<MobileAuthResponse>('/api/auth/mobile/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export function loginExternal(provider: ExternalAuthProvider, identityToken: string) {
  return apiRequest<MobileAuthResponse>('/api/auth/mobile/external', {
    method: 'POST',
    body: JSON.stringify({ provider, identityToken }),
  });
}

export function refreshSession(refreshToken: string) {
  return apiRequest<MobileAuthResponse>('/api/auth/mobile/refresh', {
    method: 'POST',
    body: JSON.stringify({ refreshToken }),
  });
}

export async function logout(refreshToken: string) {
  await apiRequest<void>('/api/auth/mobile/logout', {
    method: 'POST',
    body: JSON.stringify({ refreshToken }),
  });
}
