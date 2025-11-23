import { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { useTheme, type ThemeColors } from './theme';

export const useThemeStyles = <T extends StyleSheet.NamedStyles<T> | StyleSheet.NamedStyles<any>>(
  factory: (colors: ThemeColors) => T,
): T => {
  const { colors } = useTheme();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => factory(colors), [colors]);
};
