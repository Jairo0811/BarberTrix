import { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { colors } from '@/theme/tokens';
import { resolveMediaUrl } from '@/ui/mediaUrl';

type Props = { shopId?: string | null; barberId?: string | null; name: string; size?: number; version?: number };

/** Barber portrait served by the public media route; falls back to the initial when there is no photo yet. */
export function BarberAvatar({ shopId, barberId, name, size = 44, version = 0 }: Props) {
  const [failedKey, setFailedKey] = useState('');
  const key = `${shopId}:${barberId}:${version}`;
  const uri = shopId && barberId
    ? resolveMediaUrl(`/api/public/shop-media/${shopId}/barber-${barberId.replace(/-/g, '')}${version ? `?v=${version}` : ''}`)
    : null;
  const box = { width: size, height: size, borderRadius: size / 2 };

  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[styles.box, box]}>
      {uri && failedKey !== key
        ? <Image source={{ uri }} resizeMode="cover" onError={() => setFailedKey(key)} style={box} />
        : <Text style={[styles.initial, { fontSize: size * 0.4 }]}>{name.trim().slice(0, 1).toUpperCase()}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden', backgroundColor: colors.surfaceStrong },
  initial: { color: colors.text, fontWeight: '900' },
});
