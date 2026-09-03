import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useI18n } from '@/i18n/I18nProvider';
import { colors, radius, spacing, typography } from '@/theme/tokens';
import type { PushOptInStatus } from './PushNotificationsProvider';

type Props = {
  status: PushOptInStatus;
  message: string | null;
  title: string;
  body: string;
  onEnable(): void;
};

export function PushOptInCard({ status, message, title, body, onEnable }: Props) {
  const { t } = useI18n();

  if (status === 'enabled') {
    return (
      <View accessibilityRole="summary" style={[styles.card, styles.enabled]}>
        <View style={[styles.icon, styles.enabledIcon]}>
          <Text style={styles.enabledGlyph}>✓</Text>
        </View>
        <View style={styles.copy}>
          <Text style={styles.title}>{t('push.enabledTitle')}</Text>
          <Text style={styles.body}>{t('push.enabledBody')}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.icon}>
        <Text style={styles.iconGlyph}>!</Text>
      </View>
      <View style={styles.copy}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.body}>{body}</Text>

        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: status === 'enabling' }}
          disabled={status === 'enabling'}
          onPress={onEnable}
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed, status === 'enabling' && styles.disabled]}
        >
          <Text style={styles.buttonText}>
            {status === 'enabling' ? t('push.enabling') : t('push.enable')}
          </Text>
        </Pressable>

        {message ? <Text accessibilityRole="alert" style={styles.error}>{message}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  enabled: {
    borderColor: 'rgba(84, 214, 138, 0.24)',
    backgroundColor: colors.successSoft,
  },
  icon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  enabledIcon: {
    backgroundColor: colors.successSoft,
    borderColor: 'rgba(84, 214, 138, 0.28)',
  },
  iconGlyph: { color: colors.primaryGlow, fontSize: 18, fontWeight: '900' },
  enabledGlyph: { color: colors.success, fontSize: 18, fontWeight: '900' },
  copy: { flex: 1, gap: 7 },
  title: { ...typography.sectionTitle, color: colors.text },
  body: { ...typography.body, color: colors.textMuted },
  button: {
    minHeight: 46,
    marginTop: spacing.xs,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  buttonPressed: { backgroundColor: colors.primaryPressed },
  buttonText: { color: colors.white, fontWeight: '900' },
  error: { marginTop: 2, color: colors.danger, fontWeight: '700', lineHeight: 19 },
  disabled: { opacity: 0.55 },
});
