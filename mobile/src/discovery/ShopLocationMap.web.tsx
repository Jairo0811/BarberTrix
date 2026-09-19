import { StyleSheet, Text, View } from 'react-native';
import { useI18n } from '@/i18n/I18nProvider';
import { colors, radius, spacing } from '@/theme/tokens';

export type GeoCoordinate = {
  latitude: number;
  longitude: number;
};

type Props = {
  latitude: number | null;
  longitude: number | null;
  onChange(coordinate: GeoCoordinate): void;
};

export function ShopLocationMap({ latitude, longitude }: Props) {
  const { t, locale } = useI18n();
  const format = (value: number) => new Intl.NumberFormat(locale, { maximumFractionDigits: 6 }).format(value);
  const hasCoordinates = latitude != null && longitude != null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('common.mapNative')}</Text>
      <Text style={styles.body}>
        {hasCoordinates
          ? t('common.locationSaved', { latitude: format(latitude), longitude: format(longitude) })
          : t('common.locationHint')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 150,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceStrong,
  },
  title: { color: colors.text, fontWeight: '900', textAlign: 'center' },
  body: { color: colors.textMuted, textAlign: 'center', lineHeight: 20 },
});
