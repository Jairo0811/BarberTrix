import { Redirect } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useAuth } from '@/auth/AuthProvider';

export default function IndexScreen() {
  const { status } = useAuth();

  if (status === 'loading') {
    return (
      <View accessibilityLabel="Cargando BarberTurn" style={styles.loading}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return <Redirect href={status === 'authenticated' ? '/(app)' : '/(auth)/login'} />;
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f7f7f5' },
});
