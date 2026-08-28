import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuth } from '@/auth/AuthProvider';
import { PushOptInCard } from '@/notifications/PushOptInCard';
import { usePushNotifications } from '@/notifications/PushNotificationsProvider';

export default function HomeScreen() {
  const { session, signOut } = useAuth();
  const push = usePushNotifications();

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.eyebrow}>BARBERTURN MOBILE</Text>
        <Text style={styles.title}>Hola, {session?.user.name ?? 'equipo'}.</Text>
        <Text style={styles.role}>{session?.user.role ?? ''}</Text>
        <Text style={styles.body}>M3 mantiene al equipo al tanto de nuevas solicitudes, incluso cuando BarberTurn está en segundo plano.</Text>
        <Pressable accessibilityRole="button" onPress={() => router.push('/(app)/turn-requests')} style={styles.card}>
          <Text style={styles.cardTitle}>Solicitudes de turno</Text>
          <Text style={styles.cardText}>Gestiona solicitudes pendientes y recibe cambios en tiempo real.</Text>
        </Pressable>
        <PushOptInCard
          status={push.status}
          message={push.message}
          title="No pierdas nuevas solicitudes"
          body="Activa avisos del sistema para responder a tiempo. El contenido visible no incluye datos personales del cliente."
          onEnable={() => push.enableForStaff()}
        />
        <Pressable accessibilityRole="button" onPress={signOut} style={styles.button}>
          <Text style={styles.buttonText}>Cerrar sesión</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f7f7f5' },
  container: { flex: 1, padding: 24, justifyContent: 'center', gap: 14 },
  eyebrow: { fontSize: 12, letterSpacing: 1.5, fontWeight: '900', color: '#676760' },
  title: { fontSize: 34, lineHeight: 40, fontWeight: '900', color: '#111' },
  role: { alignSelf: 'flex-start', backgroundColor: '#e9e9e4', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, fontWeight: '800' },
  body: { fontSize: 17, lineHeight: 25, color: '#383833' },
  card: { padding: 18, borderWidth: 1, borderColor: '#111', borderRadius: 16, backgroundColor: '#fff', gap: 6 },
  cardTitle: { fontWeight: '900', fontSize: 18 },
  cardText: { lineHeight: 21, color: '#55554f' },
  button: { marginTop: 8, minHeight: 52, borderRadius: 14, borderWidth: 1, borderColor: '#111', alignItems: 'center', justifyContent: 'center' },
  buttonText: { fontWeight: '800' },
});
