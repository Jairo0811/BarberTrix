import { StyleSheet, Text, View } from 'react-native';
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
  const hasCoordinates = latitude != null && longitude != null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Mapa disponible en iOS y Android</Text>
      <Text style={styles.body}>
        {hasCoordinates
          ? `Ubicación guardada: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
          : 'Usa “Usar mi ubicación actual” desde un dispositivo móvil para fijar el punto exacto.'}
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
