import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MobileApiError } from '@/api/httpClient';
import { useAuth } from '@/auth/AuthProvider';
import { useI18n } from '@/i18n/I18nProvider';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const { t } = useI18n();
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
        setError(t('login.invalidCredentials'));
      else
        setError(exception instanceof Error ? exception.message : t('login.failed'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <View style={styles.container}>
          <Text style={styles.brand}>BarberTurn</Text>
          <Text style={styles.title}>{t('login.title')}</Text>
          <Text style={styles.subtitle}>{t('login.subtitle')}</Text>
          <TextInput accessibilityLabel={t('login.email')} autoCapitalize="none" autoComplete="email" keyboardType="email-address" placeholder={t('login.email')} value={email} onChangeText={setEmail} style={styles.input} />
          <TextInput accessibilityLabel={t('login.password')} autoComplete="current-password" placeholder={t('login.password')} secureTextEntry value={password} onChangeText={setPassword} onSubmitEditing={submit} style={styles.input} />
          {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
          <Pressable accessibilityRole="button" accessibilityState={{ disabled: submitting || !email.trim() || !password }} disabled={submitting || !email.trim() || !password} onPress={submit} style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}>
            <Text style={styles.buttonText}>{submitting ? t('login.submitting') : t('login.submit')}</Text>
          </Pressable>
          <Text style={styles.customerHint}>{t('login.customerHint')}</Text>
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
