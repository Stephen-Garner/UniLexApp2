import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from 'react';
import { useColorScheme } from 'react-native';
import { useSettingsStore } from '../../state/settings.store';
import { colors as tokensColors } from './tokens';

export type ThemeMode = 'light' | 'dark';

export interface ThemeColors {
  background: string;
  surface: string;
  surfaceMuted: string;
  border: string;
  accent: string;
  accentSoft: string;
  accentSecondary: string;
  accentSecondarySoft: string;
  textOnAccent: string;
  textPrimary: string;
  textSecondary: string;
  success: string;
  successSoft: string;
  warning: string;
  warningSoft: string;
  error: string;
  errorSoft: string;
  neutral: string;
  overlay: string;
}

interface ThemeContextValue {
  mode: ThemeMode;
  colors: ThemeColors;
}

const lightColors: ThemeColors = {
  background: tokensColors.backgroundLight,
  surface: tokensColors.surface,
  surfaceMuted: tokensColors.surfaceMuted,
  border: tokensColors.border,
  accent: tokensColors.accent,
  accentSoft: tokensColors.accentSoft,
  accentSecondary: tokensColors.accentSecondary,
  accentSecondarySoft: tokensColors.accentSecondarySoft,
  textOnAccent: '#FFFFFF',
  textPrimary: tokensColors.textPrimaryLight,
  textSecondary: tokensColors.textSecondary,
  success: tokensColors.success,
  successSoft: tokensColors.successSoft,
  warning: tokensColors.warning,
  warningSoft: tokensColors.warningSoft,
  error: tokensColors.error,
  errorSoft: tokensColors.errorSoft,
  neutral: tokensColors.neutral,
  overlay: tokensColors.overlay40,
};

const darkColors: ThemeColors = {
  background: tokensColors.backgroundDark,
  surface: '#161F1F',
  surfaceMuted: '#1F2A2B',
  border: '#283536',
  accent: tokensColors.paletteBlue,
  accentSoft: '#1A4B56',
  accentSecondary: tokensColors.paletteOrange,
  accentSecondarySoft: '#4E3504',
  textOnAccent: '#081014',
  textPrimary: tokensColors.textPrimaryDark,
  textSecondary: '#A9B0A2',
  success: tokensColors.paletteGreen,
  successSoft: '#1B4C32',
  warning: tokensColors.paletteOrange,
  warningSoft: '#4E3504',
  error: tokensColors.paletteRed,
  errorSoft: '#5E1D26',
  neutral: '#2F3A3A',
  overlay: 'rgba(5, 8, 8, 0.65)',
};

const ThemeContext = createContext<ThemeContextValue>({
  mode: 'light',
  colors: lightColors,
});

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const preference = useSettingsStore(state => state.theme);
  const loadSettings = useSettingsStore(state => state.loadSettings);
  const isLoaded = useSettingsStore(state => state.isLoaded);
  const systemScheme = useColorScheme();

  useEffect(() => {
    if (!isLoaded) {
      loadSettings().catch(() => undefined);
    }
  }, [isLoaded, loadSettings]);

  const mode: ThemeMode =
    preference === 'system'
      ? systemScheme === 'dark'
        ? 'dark'
        : 'light'
      : preference;

  const colors = useMemo(() => (mode === 'dark' ? darkColors : lightColors), [mode]);

  const contextValue = useMemo<ThemeContextValue>(
    () => ({ mode, colors }),
    [mode, colors],
  );

  return (
    <ThemeContext.Provider value={contextValue}>{children}</ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextValue => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
