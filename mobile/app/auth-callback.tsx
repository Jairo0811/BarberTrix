import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useI18n } from '@/i18n/I18nProvider';
import { useAuth } from '@/auth/AuthProvider';
import { consumePendingExternalOAuth } from '@/auth/socialOAuth';
import { colors, radius, spacing, typography } from '@/theme/tokens';
import { BrandedBackground } from '@/ui/BrandedBackground';

export default function AuthCallbackScreen() {
  const { t } = useI18n();
  const { code } = useLocalSearchParams<{ code?: string }>();
  const { completeExternalOAuth } = useAuth();
  const [error, setError] = useState<string>();
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    let active = true;
    (async () => {
      try {
        const handoffCode = Array.isArray(code) ? code[0] : code;
        const pending = await consumePendingExternalOAuth();
        if (!handoffCode || !pending)
          throw new Error('La autorización externa no pudo recuperarse.');
        await completeExternalOAuth(handoffCode, pending.codeVerifier);
      } catch {
        if (active) setError('errors.unexpected');
      }
    })();
    return () => { active = false; };
  }, [code, completeExternalOAuth]);

  return (
    <View style={styles.screen}>
      <BrandedBackground />
      <View style={styles.card}>
        {error ? (
          <>
            <Text style={styles.title}>{t('auth.callbackFailed')}</Text>
            <Text style={styles.body}>{t(error)}</Text>
            <Pressable accessibilityRole="button" onPress={() => router.replace('/(auth)/login')} style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>{t('auth.callbackRetry')}</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={() => router.replace('/discover')} style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>{t('auth.backHome')}</Text>
            </Pressable>
          </>
        ) : (
          <>
            <ActivityIndicator color={colors.primaryGlow} size="large" />
            <Text style={styles.title}>{t('auth.connecting')}</Text>
            <Text style={styles.body}>{t('auth.creatingSession')}</Text>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, backgroundColor: colors.background },
  card: { width: '100%', maxWidth: 520, gap: spacing.lg, padding: spacing.xxl, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: colors.surface, alignItems: 'center' },
  title: { ...typography.sectionTitle, color: colors.text, textAlign: 'center' },
  body: { ...typography.body, color: colors.textMuted, textAlign: 'center' },
  primaryButton: { width: '100%', minHeight: 52, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, backgroundColor: colors.primaryAction },
  primaryButtonText: { color: colors.white, fontWeight: '900' },
  secondaryButton: { width: '100%', minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, borderWidth: 1, borderColor: colors.borderStrong },
  secondaryButtonText: { color: colors.primaryGlow, fontWeight: '800' },
});
