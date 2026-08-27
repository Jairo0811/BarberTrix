import { apiRequest } from '@/api/httpClient';
import type { MobileSession } from './types';

type LoginResponse = {
  accessToken?: string;
  token?: string;
  refreshToken?: string;
  name?: string;
  userName?: string;
  role?: string;
  barberShopId?: string;
};

export async function login(email: string, password: string): Promise<MobileSession> {
  const response = await apiRequest<LoginResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password, rememberMe: true }),
  });
  const accessToken = response.accessToken ?? response.token;
  if (!accessToken) throw new Error('El servidor no devolvió un access token.');
  return {
    accessToken,
    refreshToken: response.refreshToken,
    userName: response.userName ?? response.name,
    role: response.role,
    barberShopId: response.barberShopId,
  };
}
