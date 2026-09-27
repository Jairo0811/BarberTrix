import { StyleSheet, View } from 'react-native';

type Props = {
  compact?: boolean;
};

export function BrandedBackground({ compact = false }: Props) {
  return (
    <View style={styles.root}>
      <View style={[styles.glowTop, compact && styles.glowTopCompact]} />
      <View style={styles.glowMid} />
      <View style={styles.glowBottom} />
      <View style={styles.gridOne} />
      <View style={styles.gridTwo} />
      <View style={styles.horizon} />
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
    width: 560,
    height: 560,
    borderRadius: 280,
    top: -320,
    right: -250,
    backgroundColor: 'rgba(22, 135, 255, 0.15)',
  },
  glowTopCompact: {
    width: 430,
    height: 430,
    borderRadius: 215,
    top: -270,
    right: -190,
  },
  glowMid: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    top: '38%',
    left: -210,
    backgroundColor: 'rgba(74, 126, 255, 0.045)',
  },
  glowBottom: {
    position: 'absolute',
    width: 390,
    height: 390,
    borderRadius: 195,
    bottom: -275,
    left: -220,
    backgroundColor: 'rgba(22, 135, 255, 0.075)',
  },
  gridOne: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '15%',
    width: 1,
    backgroundColor: 'rgba(98, 177, 255, 0.032)',
  },
  gridTwo: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: '13%',
    width: 1,
    backgroundColor: 'rgba(98, 177, 255, 0.026)',
  },
  horizon: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '58%',
    height: 1,
    backgroundColor: 'rgba(98, 177, 255, 0.018)',
  },
});
