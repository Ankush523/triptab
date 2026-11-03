import React from 'react';
import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { colors, radii, space, type } from '../theme/tokens';

type Props = TextInputProps & {
  label: string;
  hint?: string;
  error?: string;
};

export function AppTextField({ label, hint, error, style, ...rest }: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.textMuted}
        style={[styles.input, error && styles.inputError, style]}
        accessibilityLabel={label}
        {...rest}
      />
      {error ? (
        <Text style={styles.error} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : hint ? (
        <Text style={styles.hint}>{hint}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.sm },
  label: { ...type.label, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.6 },
  input: {
    ...type.body,
    color: colors.text,
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: space.md,
    paddingVertical: 14,
    minHeight: 52,
  },
  inputError: { borderColor: colors.danger },
  hint: { ...type.caption, color: colors.textMuted },
  error: { ...type.caption, color: colors.danger },
});
