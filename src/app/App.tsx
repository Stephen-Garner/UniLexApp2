import React, { useEffect } from 'react';
import {
  NavigationContainer,
  DefaultTheme as NavigationLightTheme,
  DarkTheme as NavigationDarkTheme,
} from '@react-navigation/native';
import { StatusBar, StyleSheet, Text, TextInput, type TextStyle } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from '@/shared/theme/theme';
import { fontFamilies } from '@/shared/theme/tokens';
import { offlineController } from '@/services/container';
import { setOfflineState } from '@/state/offline.store';
import RootNavigator from './navigation/RootNavigator';
import { navigationRef } from './navigation/navigationRef';

const defaultTextStyle: TextStyle = { fontFamily: fontFamilies.sans.regular };
const textDefaults = Text as typeof Text & { defaultProps?: { style?: TextStyle } };
textDefaults.defaultProps = textDefaults.defaultProps ?? {};
textDefaults.defaultProps.style = StyleSheet.flatten([
  defaultTextStyle,
  textDefaults.defaultProps.style,
]) as TextStyle;

const defaultTextInputStyle: TextStyle = { fontFamily: fontFamilies.sans.regular };
const textInputDefaults = TextInput as typeof TextInput & { defaultProps?: { style?: TextStyle } };
textInputDefaults.defaultProps = textInputDefaults.defaultProps ?? {};
textInputDefaults.defaultProps.style = StyleSheet.flatten([
  defaultTextInputStyle,
  textInputDefaults.defaultProps.style,
]) as TextStyle;

const AppContent: React.FC = () => {
  const { mode } = useTheme();
  const isDarkMode = mode === 'dark';

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const initialise = async () => {
      const offline = await offlineController.isOffline();
      setOfflineState(offline);
      unsubscribe = offlineController.onConnectivityChange(setOfflineState);
    };

    initialise().catch(() => undefined);

    return () => {
      unsubscribe?.();
    };
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <NavigationContainer
        ref={navigationRef}
        theme={isDarkMode ? NavigationDarkTheme : NavigationLightTheme}
      >
        <RootNavigator />
      </NavigationContainer>
    </SafeAreaProvider>
  );
};

const App: React.FC = () => (
  <ThemeProvider>
    <AppContent />
  </ThemeProvider>
);

export default App;
