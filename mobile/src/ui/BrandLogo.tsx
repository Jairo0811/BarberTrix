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
    width: 300,
    maxWidth: '88%',
    height: 112,
  },
  compactLogo: {
    width: 180,
    maxWidth: 180,
    height: 58,
  },
});
