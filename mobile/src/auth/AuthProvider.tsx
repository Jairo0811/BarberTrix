import { router } from 'expo-router';
import { createContext, PropsWithChildren, useContext, useMemo, useState } from 'react';
import { login } from './authApi';
import { secureSessionStore } from './secureSessionStore';
import type { AuthStatus, MobileSession } from './types';

type AuthContextValue = {
  status: AuthStatus;
  session?: MobileSession;
  signIn(email: string, password: string): Promise<void>;
  signOut(): Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<MobileSession>();
  const status: AuthStatus = session ? 'authenticated' : 'anonymous';

  const value = useMemo<AuthContextValue>(() => ({
    status,
    session,
    async signIn(email, password) {
      const next = await login(email, password);
      setSession(next);
      if (next.refreshToken) await secureSessionStore.setRefreshToken(next.refreshToken);
      router.replace('/(app)');
    },
    async signOut() {
      setSession(undefined);
      await secureSessionStore.clearRefreshToken();
      router.replace('/(auth)/login');
    },
  }), [session, status]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider.');
  return value;
}
