import { Redirect, Stack } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useAuth } from '@/auth/AuthProvider';
import { colors } from '@/theme/tokens';
import { BrandedBackground } from '@/ui/BrandedBackground';

export default function AuthenticatedLayout() {
  const { status } = useAuth();

  if (status === 'loading') {
    return (
      <View accessibilityLabel="Restaurando sesión" style={styles.loading}>
        <BrandedBackground compact />
        <ActivityIndicator color={colors.primaryGlow} size="large" />
      </View>
    );
  }

  if (status === 'onboarding') return <Redirect href="/onboarding" />;

  if (status !== 'authenticated') {
    return <Redirect href="/(auth)/login" />;
  }

  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }} />;
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
});
