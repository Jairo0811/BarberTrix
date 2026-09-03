import { StyleSheet, View } from 'react-native';

type Props = {
  compact?: boolean;
};

export function BrandedBackground({ compact = false }: Props) {
  return (
    <View style={styles.root}>
      <View style={[styles.glowTop, compact && styles.glowTopCompact]} />
      <View style={styles.glowBottom} />
      <View style={styles.gridOne} />
      <View style={styles.gridTwo} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFill,
    overflow: 'hidden',
    pointerEvents: 'none',
  },
  glowTop: {
    position: 'absolute',
    width: 520,
    height: 520,
    borderRadius: 260,
    top: -300,
    right: -245,
    backgroundColor: 'rgba(22, 135, 255, 0.13)',
  },
  glowTopCompact: {
    width: 420,
    height: 420,
    borderRadius: 210,
    top: -250,
    right: -190,
  },
  glowBottom: {
    position: 'absolute',
    width: 360,
    height: 360,
    borderRadius: 180,
    bottom: -250,
    left: -210,
    backgroundColor: 'rgba(22, 135, 255, 0.065)',
  },
  gridOne: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '16%',
    width: 1,
    backgroundColor: 'rgba(88, 168, 255, 0.025)',
  },
  gridTwo: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: '13%',
    width: 1,
    backgroundColor: 'rgba(88, 168, 255, 0.02)',
  },
});
