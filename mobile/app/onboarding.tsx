import { Redirect } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '@/auth/AuthProvider';

export default function OnboardingScreen() {
  const { status, session, signOut } = useAuth();
  if (status === 'loading') return null;
  if (status === 'anonymous') return <Redirect href="/(auth)/login" />;
  if (status === 'authenticated') return <Redirect href="/(app)" />;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Tu perfil de barbero está listo</Text>
      <Text style={styles.body}>Hola {session?.user.name}. Aún no perteneces a una barbería. Pronto podrás aceptar invitaciones o solicitar ingreso desde aquí.</Text>
      <Pressable accessibilityRole="button" style={styles.button} onPress={() => void signOut()}>
        <Text style={styles.buttonText}>Cerrar sesión</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 28, gap: 18, backgroundColor: '#f7f7f5' },
  title: { fontSize: 28, fontWeight: '700' },
  body: { fontSize: 16, lineHeight: 24 },
  button: { paddingVertical: 14, paddingHorizontal: 18, borderRadius: 10, borderWidth: 1, alignItems: 'center' },
  buttonText: { fontSize: 16, fontWeight: '600' },
});
