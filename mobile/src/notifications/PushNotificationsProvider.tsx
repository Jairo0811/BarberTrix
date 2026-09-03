import * as Notifications from 'expo-notifications';
import { Href, router } from 'expo-router';
import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Platform } from 'react-native';

import { useAuth } from '@/auth/AuthProvider';
import { publicRequestStore } from '@/turnRequests/publicRequestStore';

import { pushInstallationStore } from './installationStore';
import {
  registerPublicPush,
  registerStaffPush,
  unregisterPublicPush,
} from './pushApi';
import {
  createPushSubscriptionInput,
  PushRegistrationError,
} from './pushRegistration';

const isWeb = Platform.OS === 'web';

if (!isWeb) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

export type PushOptInStatus =
  | 'idle'
  | 'enabling'
  | 'enabled'
  | 'denied'
  | 'error';

type PushContextValue = {
  status: PushOptInStatus;
  message: string | null;
  enableForStaff(): Promise<void>;
  enableForRequest(
    slug: string,
    requestId: string,
    lookupToken: string,
  ): Promise<void>;
  disableForRequest(
    slug: string,
    requestId: string,
    lookupToken: string,
  ): Promise<void>;
};

const PushContext = createContext<PushContextValue | null>(null);

const staffRoute = '/(app)/turn-requests';

const publicRoutePattern =
  /^\/request-status\/[a-z0-9-]+\/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function safeNotificationRoute(value: unknown): Href | null {
  if (value === staffRoute) {
    return staffRoute;
  }

  return typeof value === 'string' && publicRoutePattern.test(value)
    ? (value as Href)
    : null;
}

function errorState(
  error: unknown,
): { status: PushOptInStatus; message: string } {
  if (error instanceof PushRegistrationError) {
    return {
      status: error.reason === 'denied' ? 'denied' : 'error',
      message: error.message,
    };
  }

  return {
    status: 'error',
    message: 'No pudimos activar los avisos. Inténtalo de nuevo.',
  };
}

export function PushNotificationsProvider({
  children,
}: PropsWithChildren) {
  const { session, status: authStatus } = useAuth();

  const [status, setStatus] = useState<PushOptInStatus>('idle');
  const [message, setMessage] = useState<string | null>(null);

  const pendingStaffRoute = useRef<Href | null>(null);
  const authStatusRef = useRef(authStatus);

  authStatusRef.current = authStatus;

  const handleWebUnsupported = useCallback(() => {
    setStatus('error');
    setMessage(
      'Las notificaciones push están disponibles en Android y iOS.',
    );
  }, []);

  const enableForStaff = useCallback(async () => {
    if (!session) {
      return;
    }

    if (isWeb) {
      handleWebUnsupported();
      return;
    }

    setStatus('enabling');
    setMessage(null);

    try {
      const input = await createPushSubscriptionInput();

      await registerStaffPush(input, session.accessToken);

      await pushInstallationStore.rememberStaff(session.user.id);

      setStatus('enabled');
    } catch (error) {
      const next = errorState(error);

      setStatus(next.status);
      setMessage(next.message);
    }
  }, [handleWebUnsupported, session]);

  const enableForRequest = useCallback(
    async (
      slug: string,
      requestId: string,
      lookupToken: string,
    ) => {
      if (isWeb) {
        handleWebUnsupported();
        return;
      }

      setStatus('enabling');
      setMessage(null);

      try {
        const input = await createPushSubscriptionInput();

        await registerPublicPush(
          slug,
          requestId,
          lookupToken,
          input,
        );

        await pushInstallationStore.rememberPublicRequest(
          slug,
          requestId,
        );

        setStatus('enabled');
      } catch (error) {
        const next = errorState(error);

        setStatus(next.status);
        setMessage(next.message);
      }
    },
    [handleWebUnsupported],
  );

  const disableForRequest = useCallback(
    async (
      slug: string,
      requestId: string,
      lookupToken: string,
    ) => {
      if (isWeb) {
        handleWebUnsupported();
        return;
      }

      const installationId =
        await pushInstallationStore.getOrCreateInstallationId();

      try {
        await unregisterPublicPush(
          slug,
          requestId,
          lookupToken,
          installationId,
        );
      } finally {
        await pushInstallationStore.forgetPublicRequest(
          slug,
          requestId,
        );

        setStatus('idle');
        setMessage(null);
      }
    },
    [handleWebUnsupported],
  );

  const refreshEnabledSubscriptions = useCallback(async () => {
    if (isWeb) {
      return;
    }

    const registry = await pushInstallationStore.readRegistry();

    if (
      !registry.staffUserId &&
      registry.publicRequests.length === 0
    ) {
      return;
    }

    const input = await createPushSubscriptionInput(false);

    const operations: Promise<unknown>[] = [];

    if (
      session &&
      registry.staffUserId === session.user.id
    ) {
      operations.push(
        registerStaffPush(input, session.accessToken),
      );
    }

    for (const item of registry.publicRequests) {
      const lookupToken = await publicRequestStore.read(
        item.requestId,
      );

      if (lookupToken) {
        operations.push(
          registerPublicPush(
            item.slug,
            item.requestId,
            lookupToken,
            input,
          ),
        );
      }
    }

    await Promise.allSettled(operations);
  }, [session]);

  useEffect(() => {
    if (isWeb || !session) {
      return;
    }

    pushInstallationStore
      .readRegistry()
      .then((registry) => {
        if (registry.staffUserId !== session.user.id) {
          return;
        }

        setStatus('enabled');

        return refreshEnabledSubscriptions();
      })
      .catch(() => undefined);
  }, [refreshEnabledSubscriptions, session]);

  useEffect(() => {
    if (isWeb) {
      return;
    }

    const tokenSubscription =
      Notifications.addPushTokenListener(() => {
        refreshEnabledSubscriptions().catch(
          () => undefined,
        );
      });

    return () => {
      tokenSubscription.remove();
    };
  }, [refreshEnabledSubscriptions]);

  useEffect(() => {
    if (isWeb) {
      return;
    }

    const navigate = (
      notification: Notifications.Notification,
    ) => {
      const route = safeNotificationRoute(
        notification.request.content.data?.url,
      );

      if (!route) {
        return;
      }

      if (
        route === staffRoute &&
        authStatusRef.current !== 'authenticated'
      ) {
        pendingStaffRoute.current = route;

        router.push('/(auth)/login');

        return;
      }

      router.push(route);
    };

    const lastResponse =
      Notifications.getLastNotificationResponse();

    if (lastResponse?.notification) {
      navigate(lastResponse.notification);
    }

    const responseSubscription =
      Notifications.addNotificationResponseReceivedListener(
        (response) => {
          navigate(response.notification);
        },
      );

    return () => {
      responseSubscription.remove();
    };
  }, []);

  useEffect(() => {
    if (
      authStatus !== 'authenticated' ||
      !pendingStaffRoute.current
    ) {
      return;
    }

    const route = pendingStaffRoute.current;

    pendingStaffRoute.current = null;

    router.push(route);
  }, [authStatus]);

  const value = useMemo<PushContextValue>(
    () => ({
      status,
      message,
      enableForStaff,
      enableForRequest,
      disableForRequest,
    }),
    [
      disableForRequest,
      enableForRequest,
      enableForStaff,
      message,
      status,
    ],
  );

  return (
    <PushContext.Provider value={value}>
      {children}
    </PushContext.Provider>
  );
}

export function usePushNotifications() {
  const context = useContext(PushContext);

  if (!context) {
    throw new Error(
      'usePushNotifications must be used within PushNotificationsProvider.',
    );
  }

  return context;
}
