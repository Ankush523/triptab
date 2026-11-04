import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors, radii, shadow } from '../theme/tokens';

type Props = { size?: number; onDark?: boolean };

export function LogoMark({ size = 48, onDark }: Props) {
  const fg = onDark ? '#FFFFFF' : colors.primary;
  const bg = onDark ? 'rgba(255,255,255,0.18)' : colors.bgElevated;
  return (
    <View style={[styles.mark, { width: size, height: size, borderRadius: size * 0.28, backgroundColor: bg }, shadow.card as object]}>
      <Svg width={size * 0.55} height={size * 0.55} viewBox="0 0 24 24" fill="none">
        <Path
          d="M4 18V6l8 4.5L20 6v12l-8-4.5L4 18z"
          stroke={fg}
          strokeWidth={2}
          strokeLinejoin="round"
        />
        <Path d="M12 10.5v7" stroke={fg} strokeWidth={2} strokeLinecap="round" />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  mark: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.25)',
  },
});
