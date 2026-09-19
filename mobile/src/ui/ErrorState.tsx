import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { mapMobileError } from '@/api/errorPolicy';
import { useI18n } from '@/i18n/I18nProvider';
import { colors } from '@/theme/tokens';
export function ErrorState({ error, retry }: { error: unknown; retry?: () => void }) {
  const { t } = useI18n(); const [details, setDetails] = useState(false); const safe = mapMobileError(error);
  return <View style={{ padding: 16, gap: 12 }}>
    <Text accessibilityRole="alert" style={{ color: colors.danger }}>{t(safe.key)}</Text>
    {retry && <Pressable accessibilityRole="button" onPress={retry} style={{ minHeight: 48, justifyContent: 'center' }}><Text style={{ color: colors.primaryGlow }}>{t('common.retry')}</Text></Pressable>}
    {safe.correlationId && <><Pressable accessibilityRole="button" onPress={() => setDetails(!details)} style={{ minHeight: 48, justifyContent: 'center' }}><Text style={{ color: colors.textMuted }}>{t('common.support')}</Text></Pressable>{details && <Text selectable style={{ color: colors.textMuted }}>{safe.correlationId}</Text>}</>}
  </View>;
}
