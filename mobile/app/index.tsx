import { Redirect } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useAuth } from '@/auth/AuthProvider';
import { colors } from '@/theme/tokens';

export default function IndexScreen() {
  const { status, session } = useAuth();

  if (status === 'loading') {
    return (
      <View accessibilityLabel="Cargando BarberTrix" style={styles.loading}>
        <ActivityIndicator color={colors.primaryGlow} size="large" />
      </View>
    );
  }

  if (session?.user.role === 'Client') return <Redirect href="/discover" />;
  if (status === 'onboarding') return <Redirect href="/onboarding" />;
  return <Redirect href={status === 'authenticated' ? '/(app)' : '/discover'} />;
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
});
