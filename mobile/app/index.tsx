import { Redirect } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useI18n } from '@/i18n/I18nProvider';
import { useAuth } from '@/auth/AuthProvider';
import { colors } from '@/theme/tokens';

export default function IndexScreen() {
  const { t } = useI18n();
  const { status, session } = useAuth();

  if (status === 'loading') {
    return (
      <View accessibilityLabel={t('common.loading')} style={styles.loading}>
        <ActivityIndicator color={colors.primaryGlow} size="large" />
      </View>
    );
  }

  if (session?.user.role === 'Client') return <Redirect href="/discover" />;
  if (status === 'onboarding') return <Redirect href="/onboarding" />;
  return <Redirect href={status === 'authenticated' ? '/(app)' : '/discover'} />;
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
});
