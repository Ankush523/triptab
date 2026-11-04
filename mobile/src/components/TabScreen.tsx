import React, { type ComponentProps } from 'react';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { Screen } from './Screen';

type ScreenProps = ComponentProps<typeof Screen>;

/** Tab content: inset layout + padding so lists clear the tab bar. */
export function TabScreen(props: ScreenProps) {
  const tabBarHeight = useBottomTabBarHeight();
  return <Screen {...props} inset extraBottom={tabBarHeight} />;
}
