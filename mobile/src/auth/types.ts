export type MobileSession = {
  accessToken: string;
  expiresAtUtc: string;
  refreshToken: string;
  refreshTokenExpiresAtUtc: string;
  userId: string;
  barberShopId: string;
  barberId?: string;
  userName: string;
  role: string;
  isEmailVerified: boolean;
};

export type AuthStatus = 'loading' | 'authenticated' | 'anonymous';
