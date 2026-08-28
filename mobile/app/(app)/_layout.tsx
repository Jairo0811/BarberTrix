import { Redirect, Stack } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useAuth } from '@/auth/AuthProvider';

export default function AuthenticatedLayout() {
  const { status } = useAuth();

  if (status === 'loading') {
    return (
      <View accessibilityLabel="Restaurando sesión" style={styles.loading}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (status !== 'authenticated') {
    return <Redirect href="/(auth)/login" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f7f7f5' },
});
