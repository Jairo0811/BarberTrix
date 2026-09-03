import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useI18n } from '@/i18n/I18nProvider';
import { colors, radius, spacing } from '@/theme/tokens';

type ActiveItem = 'home' | 'requests';

type Props = {
  active: ActiveItem;
};

type Labels = {
  home: string;
  requests: string;
};

const defaultLabels: Labels = {
  home: 'Home',
  requests: 'Requests',
};

const labelsByLocale: Record<string, Labels> = {
  'es-419': { home: 'Inicio', requests: 'Solicitudes' },
  'es-ES': { home: 'Inicio', requests: 'Solicitudes' },
  en: defaultLabels,
  'pt-BR': { home: 'Início', requests: 'Solicitações' },
  fr: { home: 'Accueil', requests: 'Demandes' },
  ht: { home: 'Akèy', requests: 'Demann' },
  de: { home: 'Start', requests: 'Anfragen' },
  it: { home: 'Home', requests: 'Richieste' },
  ja: { home: 'ホーム', requests: 'リクエスト' },
  ko: { home: '홈', requests: '요청' },
  'zh-CN': { home: '首页', requests: '请求' },
};

export function MobileBottomNav({ active }: Props) {
  const { locale } = useI18n();
  const labels: Labels = labelsByLocale[locale] ?? defaultLabels;

  return (
    <View accessibilityRole="tablist" style={styles.shell}>
      <Pressable
        accessibilityRole="tab"
        accessibilityState={{ selected: active === 'home' }}
        onPress={() => router.replace('/(app)')}
        style={({ pressed }) => [styles.item, active === 'home' && styles.itemActive, pressed && styles.itemPressed]}
      >
        <Text style={[styles.icon, active === 'home' && styles.textActive]}>⌂</Text>
        <Text style={[styles.label, active === 'home' && styles.textActive]}>{labels.home}</Text>
      </Pressable>

      <Pressable
        accessibilityRole="tab"
        accessibilityState={{ selected: active === 'requests' }}
        onPress={() => router.replace('/(app)/turn-requests')}
        style={({ pressed }) => [styles.item, active === 'requests' && styles.itemActive, pressed && styles.itemPressed]}
      >
        <Text style={[styles.icon, active === 'requests' && styles.textActive]}>≡</Text>
        <Text style={[styles.label, active === 'requests' && styles.textActive]}>{labels.requests}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: 6,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(8, 17, 31, 0.96)',
  },
  item: {
    flex: 1,
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: radius.md,
  },
  itemActive: {
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  itemPressed: {
    opacity: 0.78,
  },
  icon: {
    color: colors.textSubtle,
    fontSize: 20,
    fontWeight: '900',
  },
  label: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '900',
  },
  textActive: {
    color: colors.primaryGlow,
  },
});
