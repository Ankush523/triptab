import React from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';
import { colors, radii, shadow, space } from '../theme/tokens';

type Props = ViewProps & {
  /** Slightly stronger elevation for hero metrics */
  elevated?: boolean;
};

export function GlassCard({ style, children, elevated, ...rest }: Props) {
  return (
    <View style={[styles.card, elevated && styles.elevated, style]} {...rest}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bgElevated,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: space.lg,
    ...(shadow.card as object),
  },
  elevated: {
    ...(shadow.float as object),
    borderColor: 'rgba(37,99,235,0.12)',
  },
});
