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
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { mapMobileError } from '@/api/errorPolicy';
import { MobileApiError } from '@/api/httpClient';
import { useAuth } from '@/auth/AuthProvider';
import { getLoginExtrasCopy } from '@/auth/loginExtras';
import { startExternalOAuth } from '@/auth/socialOAuth';
import type { ExternalAuthProvider } from '@/auth/authApi';
import { useI18n } from '@/i18n/I18nProvider';
import { colors, radius, spacing } from '@/theme/tokens';
import { BrandLogo } from '@/ui/BrandLogo';
import { BrandedBackground } from '@/ui/BrandedBackground';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const { t, locale } = useI18n();
  const copy = getLoginExtrasCopy(locale);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const [socialProvider, setSocialProvider] = useState<ExternalAuthProvider>();

  async function submit() {
    if (!email.trim() || !password || submitting || socialProvider) return;

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

  async function submitExternal(provider: ExternalAuthProvider) {
    if (submitting || socialProvider) return;
    setSocialProvider(provider);
    setError(undefined);
    try {
      await startExternalOAuth(provider);
    } catch (exception) {
      setError(t(mapMobileError(exception).key));
      setSocialProvider(undefined);
    }
  }

  const disabled = submitting || !!socialProvider || !email.trim() || !password;

  return (
    <SafeAreaView style={styles.safe}>
      <BrandedBackground />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.panel}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={copy.backHome}
              onPress={() => router.replace('/')}
              style={({ pressed }) => [styles.homeButton, pressed && styles.secondaryPressed]}
            >
              <Text style={styles.homeButtonText}>← {copy.backHome}</Text>
            </Pressable>

            <View style={styles.card}>
              <View style={styles.cardTopAccent} />

              <BrandLogo />

              <View style={styles.heading}>
                <Text style={styles.title}>{t('login.title')}</Text>
                <Text style={styles.subtitle}>{t('login.subtitle')}</Text>
              </View>

              <View style={styles.socialGroup}>
                <Pressable
                  accessibilityRole="button"
                  disabled={!!socialProvider || submitting}
                  onPress={() => submitExternal('google')}
                  style={({ pressed }) => [styles.socialButton, pressed && styles.secondaryPressed]}
                >
                  <Text style={styles.googleMark}>G</Text>
                  <Text style={styles.socialButtonText}>{socialProvider === 'google' ? '…' : copy.continueGoogle}</Text>
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  disabled={!!socialProvider || submitting}
                  onPress={() => submitExternal('apple')}
                  style={({ pressed }) => [styles.appleButton, pressed && styles.secondaryPressed]}
                >
                  <Text style={styles.appleMark}></Text>
                  <Text style={styles.appleButtonText}>{socialProvider === 'apple' ? '…' : copy.continueApple}</Text>
                </Pressable>

                <View style={styles.dividerRow}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>{copy.divider}</Text>
                  <View style={styles.dividerLine} />
                </View>
              </View>

              <View style={styles.form}>
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>{t('login.email')}</Text>
                  <View style={styles.inputShell}>
                    <Text accessibilityElementsHidden style={styles.fieldIcon}>@</Text>
                    <TextInput
                      accessibilityLabel={t('login.email')}
                      autoCapitalize="none"
                      autoComplete="email"
                      autoCorrect={false}
                      keyboardType="email-address"
                      onChangeText={setEmail}
                      placeholder={t('login.email')}
                      placeholderTextColor={colors.textSubtle}
                      returnKeyType="next"
                      style={styles.input}
                      value={email}
                    />
                  </View>
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>{t('login.password')}</Text>
                  <View style={styles.inputShell}>
                    <Text accessibilityElementsHidden style={styles.fieldIcon}>●</Text>
                    <TextInput
                      accessibilityLabel={t('login.password')}
                      autoComplete="current-password"
                      onChangeText={setPassword}
                      onSubmitEditing={submit}
                      placeholder="••••••••••••"
                      placeholderTextColor={colors.textSubtle}
                      returnKeyType="done"
                      secureTextEntry={!showPassword}
                      style={styles.passwordInput}
                      value={password}
                    />
                    <Pressable
                      accessibilityLabel={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                      accessibilityRole="button"
                      accessibilityState={{ expanded: showPassword }}
                      onPress={() => setShowPassword(value => !value)}
                      style={({ pressed }) => [styles.passwordToggle, pressed && styles.passwordTogglePressed]}
                    >
                      <Text style={styles.passwordToggleText}>{showPassword ? 'Ocultar' : 'Mostrar'}</Text>
                    </Pressable>
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
                    styles.submitButton,
                    disabled && styles.submitButtonDisabled,
                    pressed && !disabled && styles.submitButtonPressed,
                  ]}
                >
                  <Text style={styles.submitButtonText}>
                    {submitting ? t('login.submitting') : t('login.submit')}
                  </Text>
                </Pressable>
              </View>

              <View style={styles.customerInfo}>
                <View style={styles.customerDot} />
                <Text style={styles.customerHint}>{copy.customerMessage}</Text>
              </View>
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
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
  },
  panel: {
    width: '100%',
    maxWidth: 650,
    alignSelf: 'center',
    paddingHorizontal: spacing.xl,
  },
  homeButton: {
    alignSelf: 'flex-start',
    minHeight: 44,
    justifyContent: 'center',
    marginBottom: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  homeButtonText: {
    color: colors.primaryGlow,
    fontSize: 14,
    fontWeight: '900',
  },
  card: {
    position: 'relative',
    overflow: 'hidden',
    width: '100%',
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
    borderRadius: radius.lg,
    backgroundColor: 'rgba(11, 20, 35, 0.98)',
    borderWidth: 1,
    borderColor: 'rgba(126, 157, 205, 0.20)',
  },
  cardTopAccent: {
    position: 'absolute',
    top: 0,
    left: 26,
    right: 26,
    height: 2,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
    backgroundColor: colors.primary,
  },
  heading: {
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  title: {
    color: colors.text,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: -0.65,
  },
  subtitle: {
    color: colors.textSubtle,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
  },
  socialGroup: {
    gap: spacing.sm,
    marginTop: spacing.xxl,
  },
  socialButton: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: 'rgba(140, 170, 214, 0.32)',
    backgroundColor: colors.white,
  },
  socialButtonText: { color: '#111827', fontSize: 15, fontWeight: '900' },
  googleMark: { color: '#4285F4', fontSize: 18, fontWeight: '900' },
  appleButton: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
    backgroundColor: '#000000',
  },
  appleButtonText: { color: colors.white, fontSize: 15, fontWeight: '900' },
  appleMark: { color: colors.white, fontSize: 20, fontWeight: '900' },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm },
  dividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(140, 170, 214, 0.18)' },
  dividerText: { color: colors.textSubtle, fontSize: 12, fontWeight: '700' },
  form: {
    gap: spacing.lg,
    marginTop: spacing.lg,
  },
  fieldGroup: { gap: 8 },
  fieldLabel: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '800',
  },
  inputShell: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: 'rgba(140, 170, 214, 0.22)',
    backgroundColor: 'rgba(9, 17, 30, 0.94)',
  },
  fieldIcon: {
    width: 46,
    color: colors.textSubtle,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '900',
  },
  input: {
    flex: 1,
    minHeight: 52,
    paddingRight: 16,
    color: colors.text,
    fontSize: 16,
  },
  passwordInput: {
    flex: 1,
    minHeight: 52,
    paddingRight: 8,
    color: colors.text,
    fontSize: 16,
  },
  passwordToggle: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  passwordTogglePressed: { opacity: 0.72 },
  passwordToggleText: {
    color: colors.primaryGlow,
    fontSize: 12,
    fontWeight: '900',
  },
  errorBox: {
    paddingHorizontal: 13,
    paddingVertical: 11,
    borderRadius: radius.sm,
    backgroundColor: colors.dangerSoft,
    borderWidth: 1,
    borderColor: 'rgba(255, 122, 122, 0.24)',
  },
  error: {
    color: colors.danger,
    fontWeight: '800',
    lineHeight: 20,
    textAlign: 'center',
  },
  submitButton: {
    minHeight: 54,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryAction,
  },
  submitButtonPressed: {
    backgroundColor: colors.primaryPressed,
    transform: [{ translateY: 1 }],
  },
  submitButtonDisabled: { opacity: 0.60 },
  submitButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '900',
  },
  secondaryPressed: { opacity: 0.72 },
  customerInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: spacing.xl,
    padding: spacing.md,
    borderRadius: radius.sm,
    backgroundColor: 'rgba(5, 12, 23, 0.56)',
    borderWidth: 1,
    borderColor: 'rgba(120, 153, 198, 0.14)',
  },
  customerDot: {
    width: 8,
    height: 8,
    marginTop: 6,
    borderRadius: 4,
    backgroundColor: colors.success,
  },
  customerHint: {
    flex: 1,
    color: colors.textSubtle,
    fontSize: 12,
    lineHeight: 19,
  },
});
