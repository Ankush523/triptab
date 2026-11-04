import React from 'react';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { heroGradient, radii, space, type } from '../theme/tokens';
import { LogoMark } from './LogoMark';

type Props = {
  kicker: string;
  title: string;
  subtitle?: string;
  style?: ViewStyle;
  /** Gradient extends under the status bar; use with Screen `edgeToEdgeTop` + `header`. */
  bleedUnderStatusBar?: boolean;
};

export function HeroHeader({ kicker, title, subtitle, style, bleedUnderStatusBar }: Props) {
  const insets = useSafeAreaInsets();
  const topPad = bleedUnderStatusBar ? insets.top + space.md : space.lg;

  return (
    <View style={[styles.outer, style]}>
      <LinearGradient
        colors={heroGradient.colors}
        locations={heroGradient.locations}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.gradient,
          {
            paddingTop: topPad,
            paddingLeft: space.lg + insets.left,
            paddingRight: space.lg + insets.right,
          },
        ]}
      >
        <View style={styles.orbA} pointerEvents="none" />
        <View style={styles.orbB} pointerEvents="none" />
        <LogoMark onDark size={44} />
        <Text style={styles.kicker}>{kicker}</Text>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.sub}>{subtitle}</Text> : null}
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    width: '100%',
    alignSelf: 'stretch',
  },
  gradient: {
    width: '100%',
    paddingBottom: space.xxl,
    borderBottomLeftRadius: radii.xl,
    borderBottomRightRadius: radii.xl,
    overflow: 'hidden',
  },
  orbA: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(249,115,22,0.22)',
    top: -40,
    right: -60,
  },
  orbB: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(14,165,233,0.25)',
    bottom: 24,
    left: -40,
  },
  kicker: {
    ...type.label,
    color: 'rgba(255,255,255,0.9)',
    letterSpacing: 1.2,
    marginTop: space.md,
    marginBottom: space.sm,
  },
  title: {
    ...type.hero,
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  sub: {
    ...type.body,
    color: 'rgba(255,255,255,0.92)',
    marginTop: space.md,
  },
});
