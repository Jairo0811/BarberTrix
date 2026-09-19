import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useI18n } from '@/i18n/I18nProvider';
import { colors, radius } from '@/theme/tokens';
export function Card({ children }: { children: ReactNode }) { return <View style={{ padding: 18, gap: 12, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radius.lg }}>{children}</View>; }
export function Action({ label, onPress, disabled = false }: { label: string; onPress: () => void; disabled?: boolean }) { return <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={{ minHeight: 48, padding: 12, justifyContent: 'center', borderRadius: radius.md, backgroundColor: colors.primarySoft, opacity: disabled ? 0.5 : 1 }}><Text style={{ color: colors.primaryGlow, fontWeight: '700' }}>{label}</Text></Pressable>; }
export function ScreenHeader({ title, context, realtime }: { title: string; context?: string; realtime?: string }) {
  const { t } = useI18n();
  return <View style={{ gap: 8 }}><View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}><Text accessibilityRole="header" style={{ flex: 1, fontSize: 26, fontWeight: '900', color: colors.text }}>{title}</Text><Action label={t('operations.settings')} onPress={() => router.push('/settings')} /></View>{context && <Text style={{ color: colors.textMuted }}>{context}</Text>}{realtime && <Text accessibilityLiveRegion="polite" style={{ color: realtime === 'Connected' ? colors.success : colors.warning }}>{t(`realtime.${realtime}`)}</Text>}</View>;
}
