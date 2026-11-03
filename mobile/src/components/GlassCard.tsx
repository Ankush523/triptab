import React from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';
import { colors, radii, shadow, space } from '../theme/tokens';

export function GlassCard({ style, children, ...rest }: ViewProps) {
  return (
    <View style={[styles.card, style]} {...rest}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.glass,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    padding: space.lg,
    ...(shadow.card as object),
  },
});
