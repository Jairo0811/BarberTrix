import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors } from '@/theme/tokens';

type Props = { height?: number; style?: StyleProp<ViewStyle> };

// Red / white / blue repeating diagonal bars, the barber-pole motif used on the web.
// Plain Views (no gradient dependency); the container clips the overflow.
const SEGMENT_WIDTH = 12;
const SEGMENTS = 64;
const PALETTE = [colors.poleRed, colors.poleWhite, colors.poleBlue, colors.poleWhite] as const;

export function PoleStripe({ height = 5, style }: Props) {
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" pointerEvents="none" style={[styles.track, { height }, style]}>
      {Array.from({ length: SEGMENTS }, (_, index) => (
        <View
          key={index}
          style={[styles.segment, { height: height + 6, backgroundColor: PALETTE[index % PALETTE.length] }]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { flexDirection: 'row', overflow: 'hidden', width: '100%' },
  segment: { width: SEGMENT_WIDTH, marginLeft: -2, marginTop: -3, transform: [{ skewX: '-35deg' }] },
});
