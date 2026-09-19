import { focusManager, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AppState } from 'react-native';
import { useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '@/auth/AuthProvider';
import { I18nProvider } from '@/i18n/I18nProvider';
import { PushNotificationsProvider } from '@/notifications/PushNotificationsProvider';
import { colors } from '@/theme/tokens';

export default function RootLayout() {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        retry: 1,
        staleTime: 30_000,
        refetchOnReconnect: true,
      },
    },
  }));

  useEffect(() => {
    focusManager.setFocused(AppState.currentState === 'active');
    const subscription = AppState.addEventListener('change', state => focusManager.setFocused(state === 'active'));
    return () => subscription.remove();
  }, []);

  return (
    <SafeAreaProvider>
      <I18nProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <PushNotificationsProvider>
              <StatusBar style="light" />
              <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }} />
            </PushNotificationsProvider>
          </AuthProvider>
        </QueryClientProvider>
      </I18nProvider>
    </SafeAreaProvider>
  );
}
