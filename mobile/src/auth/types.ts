export type MobileSession = {
  accessToken: string;
  refreshToken?: string;
  userName?: string;
  role?: string;
  barberShopId?: string;
};

export type AuthStatus = 'loading' | 'authenticated' | 'anonymous';
