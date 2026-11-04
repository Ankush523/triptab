import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { colors, radii, space, type } from '../theme/tokens';

const DEFAULT = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'INR'] as const;

type Props = {
  value: string;
  onChange: (code: string) => void;
  options?: readonly string[];
};

export function CurrencyChips({ value, onChange, options = DEFAULT }: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      keyboardShouldPersistTaps="handled"
    >
      {options.map(code => {
        const active = value === code;
        return (
          <Pressable
            key={code}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(code)}
            style={[styles.chip, active && styles.chipActive]}
          >
            <Text style={[styles.text, active && styles.textActive]}>{code}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: space.sm, paddingVertical: space.xs },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgElevated,
  },
  chipActive: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(37,99,235,0.1)',
  },
  text: { ...type.caption, color: colors.textSecondary, fontWeight: '600' },
  textActive: { color: colors.primary },
});
