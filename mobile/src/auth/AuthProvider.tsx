import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { MobileApiError } from '@/api/httpClient';
import { exchangeExternalOAuth, login, loginExternal, logout, refreshSession, type ExternalAuthProvider } from './authApi';
import { secureSessionStore } from './secureSessionStore';
import { singleFlight } from './singleFlight';
import { disableDevicePush } from '@/notifications/pushLifecycle';
import type { AuthStatus, MobileAuthResponse, MobileSession } from './types';

type AuthContextValue = {
  status: AuthStatus;
  session: MobileSession | null;
  signIn(email: string, password: string): Promise<void>;
  signInExternal(provider: ExternalAuthProvider, identityToken: string): Promise<void>;
  completeExternalOAuth(code: string, codeVerifier: string): Promise<void>;
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
      sessionScope: response.sessionScope,
    },
  };
}

function isClient(response: MobileAuthResponse) {
  return response.role === 'Client';
}

async function persistRefresh(response: MobileAuthResponse) {
  await secureSessionStore.write({
    refreshToken: response.refreshToken,
    expiresAtUtc: response.refreshTokenExpiresAtUtc,
  });
}

export function AuthProvider({ children }: PropsWithChildren) {
  const queryClient = useQueryClient();
  const sessionEpoch = useRef(0);
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [session, setSession] = useState<MobileSession | null>(null);

  const applyAuthResponse = useCallback(async (response: MobileAuthResponse) => {
    await persistRefresh(response);
    setSession(toSession(response));
    setStatus(response.sessionScope === 'Onboarding' && !isClient(response) ? 'onboarding' : 'authenticated');
  }, []);

  const clearSession = useCallback(async () => {
    queryClient.clear();
    await secureSessionStore.clear();
    setSession(null);
    setStatus('anonymous');
  }, [queryClient]);

  const refresh = useMemo(() => singleFlight(async (): Promise<string | null> => {
    const epoch = sessionEpoch.current;
    const stored = await secureSessionStore.read();
    if (!stored || Date.parse(stored.expiresAtUtc) <= Date.now()) {
      await clearSession();
      return null;
    }

    try {
      const response = await refreshSession(stored.refreshToken);
      if (epoch !== sessionEpoch.current) return null;
      await applyAuthResponse(response);
      return response.accessToken;
    } catch (exception) {
      if (exception instanceof MobileApiError && exception.status === 401) {
        await clearSession();
        return null;
      }
      throw exception;
    }
  }), [applyAuthResponse, clearSession]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        await refresh();
      } catch {
        // A temporary network failure must not destroy the rotating credential.
        // No authenticated data is displayed until the API restores the session.
        if (active) setStatus('anonymous');
      }
    })();
    return () => { active = false; };
  }, [refresh]);

  const routeAfterSignIn = useCallback((response: MobileAuthResponse) => {
    if (isClient(response)) {
      router.replace('/discover');
      return;
    }
    router.replace(response.sessionScope === 'Onboarding' ? '/onboarding' : '/(app)');
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const response = await login(email, password);
    await applyAuthResponse(response);
    routeAfterSignIn(response);
  }, [applyAuthResponse, routeAfterSignIn]);

  const signInExternal = useCallback(async (provider: ExternalAuthProvider, identityToken: string) => {
    const response = await loginExternal(provider, identityToken);
    await applyAuthResponse(response);
    routeAfterSignIn(response);
  }, [applyAuthResponse, routeAfterSignIn]);

  const completeExternalOAuth = useCallback(async (code: string, codeVerifier: string) => {
    const response = await exchangeExternalOAuth(code, codeVerifier);
    await applyAuthResponse(response);
    routeAfterSignIn(response);
  }, [applyAuthResponse, routeAfterSignIn]);

  const signOut = useCallback(async () => {
    sessionEpoch.current++;
    const stored = await secureSessionStore.read();
    try { if (session) await disableDevicePush(session.accessToken, session.user.id); } catch { /* Remote cleanup can fail offline; local sign-out still succeeds. */ }
    if (stored) {
      try { await logout(stored.refreshToken); } catch { /* Local sign-out must still succeed. */ }
    }
    await clearSession();
    router.replace('/discover');
  }, [clearSession, session]);

  const value = useMemo<AuthContextValue>(() => ({ status, session, signIn, signInExternal, completeExternalOAuth, signOut, refresh }), [completeExternalOAuth, refresh, session, signIn, signInExternal, signOut, status]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider.');
  return context;
}
