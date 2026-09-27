import { Redirect, Stack } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useI18n } from '@/i18n/I18nProvider';
import { useAuth } from '@/auth/AuthProvider';
import { colors } from '@/theme/tokens';
import { BrandedBackground } from '@/ui/BrandedBackground';

export default function AuthenticatedLayout() {
  const { t } = useI18n();
  const { status, session } = useAuth();

  if (status === 'loading') {
    return (
      <View accessibilityLabel={t('common.restoring')} style={styles.loading}>
        <BrandedBackground compact />
        <ActivityIndicator color={colors.primaryGlow} size="large" />
      </View>
    );
  }

  if (session?.user.role === 'Client' || session?.user.sessionScope === 'Client') return <Redirect href="/discover" />;
  if (status === 'onboarding') return <Redirect href="/onboarding" />;
  if (status !== 'authenticated') return <Redirect href="/(auth)/login" />;

  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }} />;
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
});
