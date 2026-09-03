import { Image, StyleSheet, View } from 'react-native';

type Props = {
  compact?: boolean;
};

const logoSource = require('../../assets/branding/barbertrix-logo.png');

export function BrandLogo({ compact = false }: Props) {
  return (
    <View accessibilityRole="image" accessibilityLabel="BarberTrix" style={[styles.container, compact && styles.compactContainer]}>
      <Image source={logoSource} resizeMode="contain" style={[styles.logo, compact && styles.compactLogo]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactContainer: {
    width: 'auto',
    alignItems: 'flex-start',
  },
  logo: {
    width: 270,
    maxWidth: '82%',
    height: 100,
  },
  compactLogo: {
    width: 176,
    maxWidth: 176,
    height: 58,
  },
});
