export type AuthStatus = 'loading' | 'anonymous' | 'authenticated';

export type MobileUser = {
  id: string;
  barberShopId: string;
  barberId?: string | null;
  name: string;
  role: 'Owner' | 'Administrator' | 'Receptionist' | 'Barber' | string;
  isEmailVerified: boolean;
};

export type MobileSession = {
  accessToken: string;
  accessTokenExpiresAtUtc: string;
  user: MobileUser;
};

export type MobileAuthResponse = {
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

export type StoredRefreshSession = {
  refreshToken: string;
  expiresAtUtc: string;
};
