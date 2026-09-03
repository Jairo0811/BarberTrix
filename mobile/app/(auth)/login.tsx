import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MobileApiError } from '@/api/httpClient';
import { useAuth } from '@/auth/AuthProvider';
import { useI18n } from '@/i18n/I18nProvider';
import { colors, radius, spacing, typography } from '@/theme/tokens';

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
      if (exception instanceof MobileApiError && exception.code === 'AUTH_INVALID_CREDENTIALS') {
        setError(t('login.invalidCredentials'));
      } else {
        setError(t('login.failed'));
      }
    } finally {
      setSubmitting(false);
    }
  }

  const disabled = submitting || !email.trim() || !password;

  return (
    <SafeAreaView style={styles.safe}>
      <View pointerEvents="none" style={styles.backgroundDecor}>
        <View style={styles.glowPrimary} />
        <View style={styles.glowSecondary} />
        <View style={styles.gridLineOne} />
        <View style={styles.gridLineTwo} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.shell}>
            <View style={styles.brandRow}>
              <View style={styles.brandMark} accessibilityElementsHidden>
                <Text style={styles.brandMarkText}>BT</Text>
              </View>
              <View>
                <Text style={styles.brand}>BarberTrix</Text>
                <Text style={styles.brandMeta}>MOBILE</Text>
              </View>
            </View>

            <View style={styles.heroCopy}>
              <Text style={styles.eyebrow}>BARBERTRIX</Text>
              <Text style={styles.title}>{t('login.title')}</Text>
              <Text style={styles.subtitle}>{t('login.subtitle')}</Text>
            </View>

            <View style={styles.card}>
              <View style={styles.cardAccent} />

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>{t('login.email')}</Text>
                <View style={styles.inputShell}>
                  <View style={styles.inputIcon} accessibilityElementsHidden>
                    <Text style={styles.inputIconText}>@</Text>
                  </View>
                  <TextInput
                    accessibilityLabel={t('login.email')}
                    autoCapitalize="none"
                    autoComplete="email"
                    keyboardType="email-address"
                    placeholder={t('login.email')}
                    placeholderTextColor={colors.textSubtle}
                    value={email}
                    onChangeText={setEmail}
                    style={styles.input}
                  />
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>{t('login.password')}</Text>
                <View style={styles.inputShell}>
                  <View style={styles.inputIcon} accessibilityElementsHidden>
                    <Text style={styles.inputIconText}>●</Text>
                  </View>
                  <TextInput
                    accessibilityLabel={t('login.password')}
                    autoComplete="current-password"
                    placeholder={t('login.password')}
                    placeholderTextColor={colors.textSubtle}
                    secureTextEntry
                    value={password}
                    onChangeText={setPassword}
                    onSubmitEditing={submit}
                    style={styles.input}
                  />
                </View>
              </View>

              {error ? (
                <View style={styles.errorBox}>
                  <Text accessibilityRole="alert" style={styles.error}>{error}</Text>
                </View>
              ) : null}

              <Pressable
                accessibilityRole="button"
                accessibilityState={{ disabled }}
                disabled={disabled}
                onPress={submit}
                style={({ pressed }) => [
                  styles.button,
                  disabled && styles.buttonDisabled,
                  pressed && !disabled && styles.buttonPressed,
                ]}
              >
                <Text style={styles.buttonText}>
                  {submitting ? t('login.submitting') : t('login.submit')}
                </Text>
                <Text style={styles.buttonArrow} accessibilityElementsHidden>→</Text>
              </Pressable>
            </View>

            <View style={styles.customerCard}>
              <View style={styles.customerDot} />
              <Text style={styles.customerHint}>{t('login.customerHint')}</Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safe: { flex: 1, backgroundColor: colors.background },
  backgroundDecor: { ...StyleSheet.absoluteFillObject, overflow: 'hidden' },
  glowPrimary: {
    position: 'absolute',
    width: 360,
    height: 360,
    borderRadius: 180,
    backgroundColor: 'rgba(22, 135, 255, 0.13)',
    top: -150,
    right: -120,
  },
  glowSecondary: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(88, 168, 255, 0.06)',
    bottom: -110,
    left: -120,
  },
  gridLineOne: {
    position: 'absolute',
    width: 1,
    height: '100%',
    left: '18%',
    backgroundColor: 'rgba(88, 168, 255, 0.035)',
  },
  gridLineTwo: {
    position: 'absolute',
    width: 1,
    height: '100%',
    right: '14%',
    backgroundColor: 'rgba(88, 168, 255, 0.03)',
  },
  scrollContent: { flexGrow: 1, justifyContent: 'center' },
  shell: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxxl,
    gap: spacing.xl,
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  brandMark: {
    width: 50,
    height: 50,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    shadowColor: colors.primary,
    shadowOpacity: 0.28,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 7,
  },
  brandMarkText: { color: colors.primaryGlow, fontSize: 18, fontWeight: '900', letterSpacing: -1 },
  brand: { color: colors.text, fontSize: 22, fontWeight: '900', letterSpacing: -0.7 },
  brandMeta: { marginTop: 2, color: colors.primaryGlow, fontSize: 9, fontWeight: '900', letterSpacing: 2.1 },
  heroCopy: { gap: 10 },
  eyebrow: { ...typography.eyebrow, color: colors.primaryGlow },
  title: { ...typography.title, color: colors.text, maxWidth: 480 },
  subtitle: { ...typography.body, color: colors.textMuted, maxWidth: 460 },
  card: {
    position: 'relative',
    overflow: 'hidden',
    padding: spacing.xl,
    gap: spacing.lg,
    borderRadius: radius.xl,
    backgroundColor: 'rgba(10, 18, 33, 0.96)',
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.black,
    shadowOpacity: 0.38,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 18 },
    elevation: 12,
  },
  cardAccent: {
    position: 'absolute',
    top: 0,
    left: 24,
    right: 24,
    height: 2,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
    backgroundColor: colors.primary,
    opacity: 0.78,
  },
  fieldGroup: { gap: 8 },
  fieldLabel: { color: '#C9D1DF', fontSize: 13, fontWeight: '800' },
  inputShell: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#08111F',
    overflow: 'hidden',
  },
  inputIcon: { width: 48, alignItems: 'center', justifyContent: 'center' },
  inputIconText: { color: colors.primaryGlow, fontSize: 14, fontWeight: '900' },
  input: {
    flex: 1,
    minHeight: 54,
    paddingRight: 16,
    color: colors.text,
    fontSize: 16,
    outlineStyle: Platform.OS === 'web' ? 'none' : undefined,
  },
  errorBox: {
    paddingHorizontal: 13,
    paddingVertical: 11,
    borderRadius: radius.sm,
    backgroundColor: colors.dangerSoft,
    borderWidth: 1,
    borderColor: 'rgba(255, 122, 122, 0.24)',
  },
  error: { color: '#FFABAB', fontWeight: '800', lineHeight: 20, textAlign: 'center' },
  button: {
    minHeight: 56,
    marginTop: 2,
    borderRadius: radius.md,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: 0.28,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  buttonPressed: { backgroundColor: colors.primaryPressed, transform: [{ translateY: 1 }] },
  buttonDisabled: { opacity: 0.48, shadowOpacity: 0 },
  buttonText: { color: colors.white, fontWeight: '900', fontSize: 16 },
  buttonArrow: { position: 'absolute', right: 20, color: colors.white, fontSize: 22, fontWeight: '600' },
  customerCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: 'rgba(7, 16, 29, 0.68)',
    borderWidth: 1,
    borderColor: 'rgba(126, 157, 205, 0.10)',
  },
  customerDot: { width: 8, height: 8, marginTop: 6, borderRadius: 4, backgroundColor: colors.success },
  customerHint: { flex: 1, color: colors.textSubtle, fontSize: 12, lineHeight: 19 },
});
