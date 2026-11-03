import React from 'react';
import { ScrollView, StatusBar, StyleSheet, View, type ViewProps } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, space } from '../theme/tokens';

type Props = ViewProps & {
  scroll?: boolean;
  hero?: boolean;
  children: React.ReactNode;
  footer?: React.ReactNode;
};

export function Screen({ scroll, hero, children, footer, style, ...rest }: Props) {
  const insets = useSafeAreaInsets();
  const body = scroll ? (
    <ScrollView
      contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + space.xxl }]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.content, { paddingBottom: insets.bottom + space.lg }]}>{children}</View>
  );

  return (
    <View style={styles.root} {...rest}>
      <StatusBar barStyle="light-content" backgroundColor={colors.gradientStart} />
      {hero ? (
        <LinearGradient
          colors={[colors.gradientStart, colors.gradientMid, colors.gradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.hero, { paddingTop: insets.top + space.md }]}
        />
      ) : null}
      <View style={[styles.body, hero && styles.bodyHero, style]}>{body}</View>
      {footer ? (
        <View style={[styles.footer, { paddingBottom: insets.bottom + space.md }]}>{footer}</View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  hero: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 220,
  },
  body: { flex: 1 },
  bodyHero: { paddingTop: space.md },
  content: {
    flex: 1,
    paddingHorizontal: space.lg,
  },
  scrollContent: {
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    gap: space.md,
  },
  footer: {
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
    backgroundColor: colors.bgElevated,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
});
