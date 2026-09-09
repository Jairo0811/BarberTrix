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

import { safeNotificationPath } from './pushPolicy';
import { useI18n } from '@/i18n/I18nProvider';
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

function safeNotificationRoute(value: unknown): Href | null {
  return safeNotificationPath(value) as Href | null;
}

function errorState(
  error: unknown,
): { status: PushOptInStatus; message: string } {
  if (error instanceof PushRegistrationError) {
    return {
      status: error.reason === 'denied' ? 'denied' : 'error',
      message: `pushState.${error.reason}`,
    };
  }

  return {
    status: 'error',
    message: 'errors.unexpected',
  };
}

export function PushNotificationsProvider({
  children,
}: PropsWithChildren) {
  const { session, status: authStatus } = useAuth();
  const { t } = useI18n();

  const [status, setStatus] = useState<PushOptInStatus>('idle');
  const [message, setMessage] = useState<string | null>(null);

  const pendingStaffRoute = useRef<Href | null>(null);
  const authStatusRef = useRef(authStatus);

  authStatusRef.current = authStatus;

  const handleWebUnsupported = useCallback(() => {
    setStatus('error');
    setMessage(
      'pushState.unsupported',
    );
  }, []);

  const enableForStaff = useCallback(async () => {
    if (!session || session.user.role === 'Client' || session.user.sessionScope === 'Onboarding') {
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

    const results = await Promise.allSettled(operations);
    if (results.some(result => result.status === 'rejected')) throw new Error('Push registration failed');
    if (results.length > 0) setStatus('enabled');
  }, [session]);

  useEffect(() => {
    if (isWeb || !session) {
      setStatus('idle');
      setMessage(null);
      return;
    }

    pushInstallationStore
      .readRegistry()
      .then((registry) => {
        if (registry.staffUserId !== session.user.id) {
          return;
        }

        return refreshEnabledSubscriptions();
      })
      .catch(error => { const next = errorState(error); setStatus(next.status); setMessage(next.message); });
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
      message: message ? t(message) : null,
      enableForStaff,
      enableForRequest,
      disableForRequest,
    }),
    [
      disableForRequest,
      enableForRequest,
      enableForStaff,
      message,
      t,
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
