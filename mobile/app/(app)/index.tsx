import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/auth/AuthProvider';

export default function HomeScreen() {
  const { session, signOut } = useAuth();
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.eyebrow}>BARBERTURN MOBILE</Text>
        <Text style={styles.title}>Bienvenido{session?.userName ? `, ${session.userName}` : ''}.</Text>
        <Text style={styles.body}>La base móvil está lista. El próximo módulo conectará solicitudes de turno cliente → barbero y notificaciones push.</Text>
        <Pressable accessibilityRole="button" onPress={signOut} style={styles.button}><Text style={styles.buttonText}>Cerrar sesión</Text></Pressable>
      </View>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f7f7f5' },
  container: { flex: 1, padding: 24, justifyContent: 'center', gap: 16 },
  eyebrow: { fontSize: 12, letterSpacing: 1.4, fontWeight: '800' },
  title: { fontSize: 32, fontWeight: '800' },
  body: { fontSize: 17, lineHeight: 25 },
  button: { marginTop: 12, minHeight: 50, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  buttonText: { fontWeight: '700' },
});
