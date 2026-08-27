import { router } from 'expo-router';
import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';
import { login, logout, refreshSession } from './authApi';
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
  const [status, setStatus] = useState<AuthStatus>('loading');

  useEffect(() => {
    let cancelled = false;

    async function restore() {
      const refreshToken = await secureSessionStore.getRefreshToken();
      if (!refreshToken) {
        if (!cancelled) setStatus('anonymous');
        return;
      }

      try {
        const restored = await refreshSession(refreshToken);
        if (cancelled) return;
        setSession(restored);
        setStatus('authenticated');
        await secureSessionStore.setRefreshToken(restored.refreshToken);
      } catch {
        await secureSessionStore.clearRefreshToken();
        if (!cancelled) setStatus('anonymous');
      }
    }

    void restore();
    return () => { cancelled = true; };
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    status,
    session,
    async signIn(email, password) {
      const next = await login(email, password);
      await secureSessionStore.setRefreshToken(next.refreshToken);
      setSession(next);
      setStatus('authenticated');
      router.replace('/(app)');
    },
    async signOut() {
      const refreshToken = session?.refreshToken ?? await secureSessionStore.getRefreshToken();
      try {
        if (refreshToken) await logout(refreshToken);
      } finally {
        setSession(undefined);
        setStatus('anonymous');
        await secureSessionStore.clearRefreshToken();
        router.replace('/(auth)/login');
      }
    },
  }), [session, status]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider.');
  return value;
}
