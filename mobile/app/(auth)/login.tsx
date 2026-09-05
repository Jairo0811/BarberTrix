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
import { MobileApiError } from '@/api/httpClient';
import { useAuth } from '@/auth/AuthProvider';
import { getLoginExtrasCopy } from '@/auth/loginExtras';
import { startExternalOAuth } from '@/auth/socialOAuth';
import type { ExternalAuthProvider } from '@/auth/authApi';
import { useI18n } from '@/i18n/I18nProvider';
import { colors, radius, spacing, typography } from '@/theme/tokens';
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
      if (exception instanceof MobileApiError && exception.code === 'AUTH_INVALID_CREDENTIALS') setError(t('login.invalidCredentials'));
      else setError(t('login.failed'));
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
      setError(exception instanceof MobileApiError ? exception.message : t('login.failed'));
      setSocialProvider(undefined);
    }
  }

  const disabled = submitting || !!socialProvider || !email.trim() || !password;

  return (
    <SafeAreaView style={styles.safe}>
      <BrandedBackground />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.panel}>
            <View style={styles.topbar}>
              <BrandLogo compact />
              <Pressable accessibilityRole="button" accessibilityLabel={copy.backHome} onPress={() => router.replace('/')} style={({ pressed }) => [styles.homeButton, pressed && styles.secondaryPressed]}>
                <Text style={styles.homeButtonText}>← {copy.backHome}</Text>
              </Pressable>
            </View>

            <View style={styles.hero}>
              <View style={styles.secureBadge}><View style={styles.secureDot} /><Text style={styles.secureText}>BARBERTRIX SECURE ACCESS</Text></View>
              <Text style={styles.heroTitle}>{t('login.title')}</Text>
              <Text style={styles.heroSubtitle}>{t('login.subtitle')}</Text>
              <View style={styles.rolesRow}>
                {[t('mobile.role.Client'), t('mobile.role.Barber'), t('mobile.role.Owner')].map(role => <View key={role} style={styles.roleChip}><Text style={styles.roleChipText}>{role}</Text></View>)}
              </View>
            </View>

            <View style={styles.card}>
              <View style={styles.socialGroup}>
                <Pressable accessibilityRole="button" disabled={!!socialProvider || submitting} onPress={() => submitExternal('google')} style={({ pressed }) => [styles.socialButton, pressed && styles.secondaryPressed]}>
                  <Text style={styles.googleMark}>G</Text>
                  <Text style={styles.socialButtonText}>{socialProvider === 'google' ? '…' : copy.continueGoogle}</Text>
                </Pressable>
                <Pressable accessibilityRole="button" disabled={!!socialProvider || submitting} onPress={() => submitExternal('apple')} style={({ pressed }) => [styles.appleButton, pressed && styles.secondaryPressed]}>
                  <Text style={styles.appleMark}></Text>
                  <Text style={styles.appleButtonText}>{socialProvider === 'apple' ? '…' : copy.continueApple}</Text>
                </Pressable>
                <View style={styles.dividerRow}><View style={styles.dividerLine} /><Text style={styles.dividerText}>{copy.divider}</Text><View style={styles.dividerLine} /></View>
              </View>

              <View style={styles.form}>
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>{t('login.email')}</Text>
                  <View style={styles.inputShell}>
                    <Text accessibilityElementsHidden style={styles.fieldIcon}>@</Text>
                    <TextInput accessibilityLabel={t('login.email')} autoCapitalize="none" autoComplete="email" autoCorrect={false} keyboardType="email-address" onChangeText={setEmail} placeholder={t('login.email')} placeholderTextColor={colors.textSubtle} returnKeyType="next" style={styles.input} value={email} />
                  </View>
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>{t('login.password')}</Text>
                  <View style={styles.inputShell}>
                    <Text accessibilityElementsHidden style={styles.fieldIcon}>●</Text>
                    <TextInput accessibilityLabel={t('login.password')} autoComplete="current-password" onChangeText={setPassword} onSubmitEditing={submit} placeholder="••••••••••••" placeholderTextColor={colors.textSubtle} returnKeyType="done" secureTextEntry={!showPassword} style={styles.passwordInput} value={password} />
                    <Pressable accessibilityLabel={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'} accessibilityRole="button" accessibilityState={{ expanded: showPassword }} onPress={() => setShowPassword(value => !value)} style={({ pressed }) => [styles.passwordToggle, pressed && styles.passwordTogglePressed]}>
                      <Text style={styles.passwordToggleText}>{showPassword ? 'Ocultar' : 'Mostrar'}</Text>
                    </Pressable>
                  </View>
                </View>

                {error ? <View style={styles.errorBox}><Text accessibilityRole="alert" style={styles.error}>{error}</Text></View> : null}

                <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={submit} style={({ pressed }) => [styles.submitButton, disabled && styles.submitButtonDisabled, pressed && !disabled && styles.submitButtonPressed]}>
                  <Text style={styles.submitButtonText}>{submitting ? t('login.submitting') : t('login.submit')}</Text>
                  <Text style={styles.submitArrow}>→</Text>
                </Pressable>
              </View>

              <View style={styles.customerInfo}>
                <View style={styles.customerIcon}><Text style={styles.customerIconText}>✦</Text></View>
                <View style={styles.customerCopy}><Text style={styles.customerTitle}>{t('mobile.role.Client')}</Text><Text style={styles.customerHint}>{copy.customerMessage}</Text></View>
              </View>
              <Pressable accessibilityRole="button" onPress={() => router.replace('/discover')} style={({ pressed }) => [styles.discoveryButton, pressed && styles.secondaryPressed]}>
                <Text style={styles.discoveryButtonText}>Explorar BarberTrix Discovery →</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 }, safe: { flex: 1, backgroundColor: colors.background },
  scrollContent: { flexGrow: 1, justifyContent: 'center', paddingVertical: spacing.xxl },
  panel: { width: '100%', maxWidth: 680, alignSelf: 'center', paddingHorizontal: spacing.xl, gap: spacing.lg },
  topbar: { minHeight: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  homeButton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: spacing.sm },
  homeButtonText: { color: colors.primaryGlow, fontSize: 13, fontWeight: '900' },
  hero: { alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md },
  secureBadge: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 11, paddingVertical: 6, borderRadius: radius.pill, backgroundColor: colors.successSoft, borderWidth: 1, borderColor: 'rgba(84,214,138,.22)' },
  secureDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.success },
  secureText: { color: colors.success, fontSize: 9, fontWeight: '900', letterSpacing: 1.2 },
  heroTitle: { ...typography.title, color: colors.text, textAlign: 'center', fontSize: 31, lineHeight: 37 },
  heroSubtitle: { ...typography.body, color: colors.textMuted, textAlign: 'center', maxWidth: 520 },
  rolesRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 7, marginTop: 2 },
  roleChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  roleChipText: { color: colors.textSubtle, fontSize: 11, fontWeight: '800' },
  card: { width: '100%', padding: spacing.xl, borderRadius: radius.xl, backgroundColor: 'rgba(10,18,33,.96)', borderWidth: 1, borderColor: colors.borderStrong },
  socialGroup: { gap: spacing.sm },
  socialButton: { minHeight: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, borderRadius: radius.md, borderWidth: 1, borderColor: 'rgba(140,170,214,.32)', backgroundColor: colors.white },
  socialButtonText: { color: '#111827', fontSize: 15, fontWeight: '900' }, googleMark: { color: '#4285F4', fontSize: 18, fontWeight: '900' },
  appleButton: { minHeight: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, borderRadius: radius.md, borderWidth: 1, borderColor: 'rgba(255,255,255,.28)', backgroundColor: '#000' },
  appleButtonText: { color: colors.white, fontSize: 15, fontWeight: '900' }, appleMark: { color: colors.white, fontSize: 20, fontWeight: '900' },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginVertical: spacing.sm }, dividerLine: { flex: 1, height: 1, backgroundColor: colors.border }, dividerText: { color: colors.textSubtle, fontSize: 12, fontWeight: '700' },
  form: { gap: spacing.lg }, fieldGroup: { gap: 8 }, fieldLabel: { color: colors.text, fontSize: 13, fontWeight: '800' },
  inputShell: { minHeight: 58, flexDirection: 'row', alignItems: 'center', borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceStrong },
  fieldIcon: { width: 46, color: colors.primaryGlow, textAlign: 'center', fontSize: 14, fontWeight: '900' },
  input: { flex: 1, minHeight: 56, paddingRight: 16, color: colors.text, fontSize: 16 }, passwordInput: { flex: 1, minHeight: 56, paddingRight: 8, color: colors.text, fontSize: 16 },
  passwordToggle: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 14 }, passwordTogglePressed: { opacity: .72 }, passwordToggleText: { color: colors.primaryGlow, fontSize: 12, fontWeight: '900' },
  errorBox: { paddingHorizontal: 13, paddingVertical: 11, borderRadius: radius.md, backgroundColor: colors.dangerSoft, borderWidth: 1, borderColor: 'rgba(255,122,122,.24)' }, error: { color: '#FFABAB', fontWeight: '800', lineHeight: 20, textAlign: 'center' },
  submitButton: { minHeight: 58, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', backgroundColor: colors.primary }, submitButtonPressed: { backgroundColor: colors.primaryPressed, transform: [{ translateY: 1 }] }, submitButtonDisabled: { opacity: .55 }, submitButtonText: { color: colors.white, fontSize: 16, fontWeight: '900' }, submitArrow: { position: 'absolute', right: 20, color: colors.white, fontSize: 20, fontWeight: '900' },
  customerInfo: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.xl, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.primarySoft, borderWidth: 1, borderColor: colors.borderStrong },
  customerIcon: { width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceStrong }, customerIconText: { color: colors.primaryGlow, fontSize: 16, fontWeight: '900' }, customerCopy: { flex: 1, gap: 2 }, customerTitle: { color: colors.text, fontWeight: '900' }, customerHint: { color: colors.textMuted, fontSize: 12, lineHeight: 18 },
  discoveryButton: { minHeight: 48, marginTop: spacing.sm, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md }, discoveryButtonText: { color: colors.primaryGlow, fontWeight: '900' }, secondaryPressed: { opacity: .72 },
});
