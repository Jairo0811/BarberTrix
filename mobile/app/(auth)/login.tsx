import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/auth/AuthProvider';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    setSubmitting(true);
    setError(undefined);
    try {
      await signIn(email.trim(), password);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pudimos iniciar sesión.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.brand}>BarberTurn</Text>
        <Text style={styles.title}>Tu barbería, también en tu bolsillo.</Text>
        <TextInput accessibilityLabel="Correo" autoCapitalize="none" keyboardType="email-address" placeholder="Correo" value={email} onChangeText={setEmail} style={styles.input} />
        <TextInput accessibilityLabel="Contraseña" placeholder="Contraseña" secureTextEntry value={password} onChangeText={setPassword} style={styles.input} />
        {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
        <Pressable accessibilityRole="button" disabled={submitting || !email || !password} onPress={submit} style={styles.button}>
          <Text style={styles.buttonText}>{submitting ? 'Entrando…' : 'Iniciar sesión'}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f7f7f5' },
  container: { flex: 1, justifyContent: 'center', padding: 24, gap: 14 },
  brand: { fontSize: 18, fontWeight: '800' },
  title: { fontSize: 30, lineHeight: 36, fontWeight: '800', marginBottom: 12 },
  input: { minHeight: 52, borderWidth: 1, borderColor: '#d3d3cf', borderRadius: 12, paddingHorizontal: 16, backgroundColor: '#fff' },
  button: { minHeight: 52, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#111' },
  buttonText: { color: '#fff', fontWeight: '700' },
  error: { color: '#a21414' },
});
