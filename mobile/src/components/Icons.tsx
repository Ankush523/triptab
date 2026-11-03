import React from 'react';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';
import { colors } from '../theme/tokens';

type IconProps = { size?: number; color?: string };

export function IconWallet({ size = 24, color = colors.text }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={3} y={6} width={18} height={14} rx={3} stroke={color} strokeWidth={2} />
      <Path d="M3 10h18" stroke={color} strokeWidth={2} />
      <Circle cx={17} cy={14} r={1.5} fill={color} />
    </Svg>
  );
}

export function IconUsers({ size = 24, color = colors.text }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={9} cy={8} r={3.5} stroke={color} strokeWidth={2} />
      <Path d="M3 19c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke={color} strokeWidth={2} />
      <Circle cx={17} cy={9} r={2.5} stroke={color} strokeWidth={2} />
      <Path d="M14 19c.4-2.2 2-4 5-4" stroke={color} strokeWidth={2} />
    </Svg>
  );
}

export function IconRadio({ size = 24, color = colors.text }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={2} fill={color} />
      <Path d="M8 8a6 6 0 018 0M5 5a10 10 0 0114 0" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

export function IconPlus({ size = 24, color = colors.text }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Line x1={12} y1={5} x2={12} y2={19} stroke={color} strokeWidth={2.5} strokeLinecap="round" />
      <Line x1={5} y1={12} x2={19} y2={12} stroke={color} strokeWidth={2.5} strokeLinecap="round" />
    </Svg>
  );
}

export function IconCompass({ size = 24, color = colors.text }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={9} stroke={color} strokeWidth={2} />
      <Path d="M14.5 9.5L10 14l4.5-4.5z" fill={color} />
    </Svg>
  );
}

export function IconCheck({ size = 24, color = colors.text }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M5 12l5 5L20 7" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function IconChevronRight({ size = 20, color = colors.textMuted }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M9 6l6 6-6 6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
