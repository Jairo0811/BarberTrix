import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MobileApiError } from '@/api/httpClient';
import { useAuth } from '@/auth/AuthProvider';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (!email.trim() || !password || submitting) return;
    setSubmitting(true);
    setError(undefined);
    try {
      await signIn(email.trim(), password);
    } catch (exception) {
      if (exception instanceof MobileApiError && exception.code === 'AUTH_INVALID_CREDENTIALS')
        setError('Correo o contraseña incorrectos.');
      else
        setError(exception instanceof Error ? exception.message : 'No pudimos iniciar sesión.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <View style={styles.container}>
          <Text style={styles.brand}>BarberTurn</Text>
          <Text style={styles.title}>Tu barbería, también en tu bolsillo.</Text>
          <Text style={styles.subtitle}>Acceso para Owner, Administrator, Receptionist y Barber.</Text>
          <TextInput accessibilityLabel="Correo" autoCapitalize="none" autoComplete="email" keyboardType="email-address" placeholder="Correo" value={email} onChangeText={setEmail} style={styles.input} />
          <TextInput accessibilityLabel="Contraseña" autoComplete="current-password" placeholder="Contraseña" secureTextEntry value={password} onChangeText={setPassword} onSubmitEditing={submit} style={styles.input} />
          {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
          <Pressable accessibilityRole="button" accessibilityState={{ disabled: submitting || !email.trim() || !password }} disabled={submitting || !email.trim() || !password} onPress={submit} style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}>
            <Text style={styles.buttonText}>{submitting ? 'Entrando…' : 'Iniciar sesión'}</Text>
          </Pressable>
          <Text style={styles.customerHint}>El acceso de clientes seguirá siendo sin cuenta obligatoria y se incorporará en M2.</Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safe: { flex: 1, backgroundColor: '#f7f7f5' },
  container: { flex: 1, justifyContent: 'center', padding: 24, gap: 14 },
  brand: { fontSize: 20, fontWeight: '900', letterSpacing: -0.4 },
  title: { fontSize: 32, lineHeight: 38, fontWeight: '900', marginTop: 8 },
  subtitle: { fontSize: 15, lineHeight: 22, color: '#5a5a55', marginBottom: 10 },
  input: { minHeight: 54, borderWidth: 1, borderColor: '#d3d3cf', borderRadius: 14, paddingHorizontal: 16, backgroundColor: '#fff', fontSize: 16 },
  button: { minHeight: 54, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#111' },
  buttonPressed: { opacity: 0.82 },
  buttonText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  error: { color: '#a21414', lineHeight: 20 },
  customerHint: { marginTop: 8, color: '#6d6d67', fontSize: 13, lineHeight: 19 },
});
