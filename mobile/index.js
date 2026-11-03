/**
 * @format
 */
import 'react-native-gesture-handler';
import './src/polyfills';
import React from 'react';
import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import { ErrorBoundary } from './src/ui/ErrorBoundary';

function Root() {
  return React.createElement(ErrorBoundary, null, React.createElement(App, null));
}

AppRegistry.registerComponent(appName, () => Root);
