import { Platform } from 'react-native';

/** Trip Tab design tokens — see design-system/trip-tab/MASTER.md */
export const colors = {
  primary: '#2563EB',
  primaryDark: '#1D4ED8',
  secondary: '#3B82F6',
  cta: '#F97316',
  ctaDark: '#EA580C',
  bg: '#F8FAFC',
  bgElevated: '#FFFFFF',
  text: '#1E293B',
  textSecondary: '#64748B',
  textMuted: '#94A3B8',
  border: '#E2E8F0',
  success: '#059669',
  danger: '#DC2626',
  credit: '#059669',
  debt: '#DC2626',
  glass: 'rgba(255,255,255,0.72)',
  glassBorder: 'rgba(255,255,255,0.35)',
  scrim: 'rgba(15,23,42,0.45)',
  gradientStart: '#2563EB',
  gradientMid: '#6366F1',
  gradientEnd: '#0EA5E9',
};

export const radii = {
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  pill: 999,
};

export const space = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const shadow = Platform.select({
  ios: {
    card: {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.08,
      shadowRadius: 24,
    },
    float: {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.12,
      shadowRadius: 32,
    },
  },
  default: {
    card: { elevation: 4 },
    float: { elevation: 8 },
  },
});

export const fonts = Platform.select({
  ios: {
    regular: 'System',
    medium: 'System',
    semibold: 'System',
    bold: 'System',
  },
  default: {
    regular: 'sans-serif',
    medium: 'sans-serif-medium',
    semibold: 'sans-serif-medium',
    bold: 'sans-serif',
  },
});

export const type = {
  hero: { fontSize: 34, lineHeight: 40, fontWeight: '700' as const },
  title: { fontSize: 22, lineHeight: 28, fontWeight: '700' as const },
  subtitle: { fontSize: 17, lineHeight: 24, fontWeight: '600' as const },
  body: { fontSize: 16, lineHeight: 24, fontWeight: '400' as const },
  label: { fontSize: 13, lineHeight: 18, fontWeight: '600' as const },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '500' as const },
  money: { fontSize: 28, lineHeight: 32, fontWeight: '700' as const, fontVariant: ['tabular-nums'] as ('tabular-nums')[] },
};
