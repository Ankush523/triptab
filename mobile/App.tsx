import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { Suspense, lazy, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  initialWindowMetrics,
  SafeAreaProvider,
  SafeAreaView,
} from 'react-native-safe-area-context';
import { HomeScreen, type HomeAction } from './src/screens/HomeScreen';
import type { TripStart } from './src/TripSession';
import { ErrorBoundary } from './src/ui/ErrorBoundary';
import { colors } from './src/theme/tokens';

const TripSession = lazy(() => import('./src/TripSession'));

const NAME_KEY = 'triptab.displayName';

export default function App() {
  const [name, setName] = useState('');
  const [session, setSession] = useState<TripStart | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(NAME_KEY)
      .then(stored => setName(stored ?? ''))
      .catch(() => setName(''));
  }, []);

  useEffect(() => {
    if (name) AsyncStorage.setItem(NAME_KEY, name).catch(() => {});
  }, [name]);

  const onHomeAction = (action: HomeAction) => {
    if (!name.trim()) return;
    if (action.kind === 'host') {
      setSession({ kind: 'host', title: action.title, currency: action.currency });
    } else {
      setSession({ kind: 'join' });
    }
  };

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        <ErrorBoundary>
          {session ? (
            <Suspense
              fallback={
                <SafeAreaView style={styles.boot} edges={['top', 'bottom', 'left', 'right']}>
                  <ActivityIndicator color={colors.primary} size="large" />
                </SafeAreaView>
              }
            >
              <TripSession name={name} start={session} onHome={() => setSession(null)} />
            </Suspense>
          ) : (
            <HomeScreen name={name} setName={setName} onAction={onHomeAction} />
          )}
        </ErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  boot: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
});
