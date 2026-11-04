import React from 'react';
import {
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  View,
  type ViewProps,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
  type Edge,
} from 'react-native-safe-area-context';
import { colors, space } from '../theme/tokens';

type Props = ViewProps & {
  scroll?: boolean;
  /** Renders above the scroll area — full device width (home hero) */
  header?: React.ReactNode;
  /** Under React Navigation header + tab bar (tab screens) */
  inset?: boolean;
  /** Home hero: shell edge-to-edge; hero applies top insets */
  edgeToEdgeTop?: boolean;
  /** Vertically center short content (loading / empty states) */
  centered?: boolean;
  /** Added to scroll/content bottom padding (tab bar height from TabScreen) */
  extraBottom?: number;
  statusBar?: 'light' | 'dark';
  children: React.ReactNode;
  footer?: React.ReactNode;
};

function shellEdges(inset: boolean | undefined, edgeToEdgeTop: boolean | undefined): Edge[] {
  if (inset) return ['left', 'right'];
  if (edgeToEdgeTop) return [];
  return ['top', 'left', 'right'];
}

export function Screen({
  scroll,
  header,
  inset,
  edgeToEdgeTop,
  centered,
  extraBottom = 0,
  statusBar = 'dark',
  children,
  footer,
  style,
  ...rest
}: Props) {
  const insets = useSafeAreaInsets();
  const edges = shellEdges(inset, edgeToEdgeTop);
  const tabPad = inset && !footer ? extraBottom : 0;

  const contentTopPad = inset ? space.sm : edgeToEdgeTop ? 0 : space.md;

  const scrollBottomPad =
    (footer ? space.xl : edgeToEdgeTop ? insets.bottom + space.xxl : inset ? space.lg : insets.bottom + space.xl) +
    tabPad;

  const staticBottomPad =
    (footer ? space.lg : inset ? space.lg : insets.bottom + space.lg) + tabPad;

  const body = scroll ? (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[
        styles.scrollContent,
        edgeToEdgeTop && styles.scrollContentBleed,
        centered && styles.scrollCentered,
        { paddingTop: contentTopPad, paddingBottom: scrollBottomPad },
      ]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      contentInsetAdjustmentBehavior={edgeToEdgeTop ? 'never' : 'automatic'}
    >
      {children}
    </ScrollView>
  ) : (
    <View
      style={[
        styles.content,
        centered && styles.contentCentered,
        { paddingTop: contentTopPad, paddingBottom: staticBottomPad },
      ]}
    >
      {children}
    </View>
  );

  const lightHero = edgeToEdgeTop && statusBar === 'light';

  const footerNode = footer ? (
    inset ? (
      <View style={styles.footer}>{footer}</View>
    ) : (
      <SafeAreaView edges={['bottom']} style={styles.footerSafe}>
        <View style={styles.footer}>{footer}</View>
      </SafeAreaView>
    )
  ) : null;

  return (
    <SafeAreaView style={styles.root} edges={edges}>
      <StatusBar
        translucent={lightHero}
        barStyle={statusBar === 'light' ? 'light-content' : 'dark-content'}
        backgroundColor={lightHero ? 'transparent' : colors.bg}
      />
      {header ? <View style={styles.headerSlot}>{header}</View> : null}
      <View style={[styles.body, style]} {...rest}>
        {body}
      </View>
      {footerNode}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  headerSlot: {
    width: '100%',
    alignSelf: 'stretch',
  },
  body: { flex: 1, minHeight: 0 },
  scroll: { flex: 1 },
  content: {
    flex: 1,
    paddingHorizontal: space.lg,
    minHeight: 0,
  },
  contentCentered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: space.lg,
    gap: space.md,
  },
  scrollContentBleed: {
    paddingHorizontal: 0,
  },
  scrollCentered: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  footerSafe: {
    backgroundColor: colors.bgElevated,
  },
  footer: {
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
    paddingBottom: space.sm,
    backgroundColor: colors.bgElevated,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    ...(Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
      },
      default: { elevation: 8 },
    }) as object),
  },
});
