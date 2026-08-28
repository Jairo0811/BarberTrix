import { router } from 'expo-router';
import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { MobileApiError } from '@/api/httpClient';
import { login, logout, refreshSession } from './authApi';
import { secureSessionStore } from './secureSessionStore';
import type { AuthStatus, MobileAuthResponse, MobileSession } from './types';

type AuthContextValue = {
  status: AuthStatus;
  session: MobileSession | null;
  signIn(email: string, password: string): Promise<void>;
  signOut(): Promise<void>;
  refresh(): Promise<string | null>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function toSession(response: MobileAuthResponse): MobileSession {
  return {
    accessToken: response.accessToken,
    accessTokenExpiresAtUtc: response.expiresAtUtc,
    user: {
      id: response.userId,
      barberShopId: response.barberShopId,
      barberId: response.barberId,
      name: response.name,
      role: response.role,
      isEmailVerified: response.isEmailVerified,
    },
  };
}

async function persistRefresh(response: MobileAuthResponse) {
  await secureSessionStore.write({
    refreshToken: response.refreshToken,
    expiresAtUtc: response.refreshTokenExpiresAtUtc,
  });
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [session, setSession] = useState<MobileSession | null>(null);

  const applyAuthResponse = useCallback(async (response: MobileAuthResponse) => {
    await persistRefresh(response);
    setSession(toSession(response));
    setStatus('authenticated');
  }, []);

  const clearSession = useCallback(async () => {
    await secureSessionStore.clear();
    setSession(null);
    setStatus('anonymous');
  }, []);

  const refresh = useCallback(async (): Promise<string | null> => {
    const stored = await secureSessionStore.read();
    if (!stored || Date.parse(stored.expiresAtUtc) <= Date.now()) {
      await clearSession();
      return null;
    }

    try {
      const response = await refreshSession(stored.refreshToken);
      await applyAuthResponse(response);
      return response.accessToken;
    } catch (exception) {
      if (exception instanceof MobileApiError && exception.status === 401) {
        await clearSession();
        return null;
      }
      throw exception;
    }
  }, [applyAuthResponse, clearSession]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const stored = await secureSessionStore.read();
        if (!active) return;
        if (!stored || Date.parse(stored.expiresAtUtc) <= Date.now()) {
          await clearSession();
          return;
        }
        const response = await refreshSession(stored.refreshToken);
        if (!active) return;
        await applyAuthResponse(response);
      } catch {
        if (active) await clearSession();
      }
    })();
    return () => { active = false; };
  }, [applyAuthResponse, clearSession]);

  const signIn = useCallback(async (email: string, password: string) => {
    const response = await login(email, password);
    await applyAuthResponse(response);
    router.replace('/(app)');
  }, [applyAuthResponse]);

  const signOut = useCallback(async () => {
    const stored = await secureSessionStore.read();
    if (stored) {
      try { await logout(stored.refreshToken); } catch { /* Local sign-out must still succeed. */ }
    }
    await clearSession();
    router.replace('/(auth)/login');
  }, [clearSession]);

  const value = useMemo<AuthContextValue>(() => ({ status, session, signIn, signOut, refresh }), [refresh, session, signIn, signOut, status]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider.');
  return context;
}
