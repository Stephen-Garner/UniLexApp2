import { Platform } from 'react-native';

const serifFont = (weight: 'regular' | 'semibold') =>
  Platform.select({
    ios: weight === 'semibold' ? 'Merriweather-Bold' : 'Merriweather-Regular',
    android: weight === 'semibold' ? 'Merriweather-Bold' : 'Merriweather-Regular',
    default: weight === 'semibold' ? 'Merriweather-Bold' : 'Merriweather-Regular',
  }) ?? 'Merriweather-Regular';

const plexSerifFont = (weight: 'regular' | 'medium' | 'semibold') =>
  Platform.select({
    ios:
      weight === 'semibold'
        ? 'IBMPlexSerif-SemiBold'
        : weight === 'medium'
          ? 'IBMPlexSerif-Medium'
          : 'IBMPlexSerif-Regular',
    android:
      weight === 'semibold'
        ? 'IBMPlexSerif-SemiBold'
        : weight === 'medium'
          ? 'IBMPlexSerif-Medium'
          : 'IBMPlexSerif-Regular',
    default:
      weight === 'semibold'
        ? 'IBMPlexSerif-SemiBold'
        : weight === 'medium'
          ? 'IBMPlexSerif-Medium'
          : 'IBMPlexSerif-Regular',
  }) ?? 'IBMPlexSerif-Regular';

const sansFont = (weight: 'regular' | 'medium' | 'semibold' | 'bold') =>
  Platform.select({
    ios:
      weight === 'medium'
        ? 'Inter-Medium'
        : weight === 'semibold'
          ? 'Inter-SemiBold'
          : weight === 'bold'
            ? 'Inter-Bold'
            : 'Inter-Regular',
    android:
      weight === 'medium'
        ? 'Inter-Medium'
        : weight === 'semibold'
          ? 'Inter-SemiBold'
          : weight === 'bold'
            ? 'Inter-Bold'
            : 'Inter-Regular',
    default:
      weight === 'medium'
        ? 'Inter-Medium'
        : weight === 'semibold'
          ? 'Inter-SemiBold'
          : weight === 'bold'
            ? 'Inter-Bold'
            : 'Inter-Regular',
  }) ?? 'Inter-Regular';

export const fontFamilies = {
  serif: {
    regular: serifFont('regular'),
    semibold: serifFont('semibold'),
  },
  plexSerif: {
    regular: plexSerifFont('regular'),
    medium: plexSerifFont('medium'),
    semibold: plexSerifFont('semibold'),
  },
  sans: {
    regular: sansFont('regular'),
    medium: sansFont('medium'),
    semibold: sansFont('semibold'),
    bold: sansFont('bold'),
  },
} as const;

export const colors = {
  paletteBlue: '#2B9EB3',
  paletteOrange: '#FCAB10',
  paletteGreen: '#44AF69',
  paletteRed: '#F8333C',
  paletteSand: '#DBD5B5',
  backgroundLight: '#F7F3E3',
  backgroundDark: '#101717',
  surface: '#FFFFFF',
  surfaceMuted: '#F0E7D4',
  border: '#D5C9AA',
  textPrimaryLight: '#21231C',
  textPrimaryDark: '#F3F5F1',
  textSecondary: '#5B6252',
  accent: '#2B9EB3',
  accentSecondary: '#FCAB10',
  accentSoft: '#D6EFF5',
  accentSecondarySoft: '#FDE5B7',
  success: '#44AF69',
  successSoft: '#D8F3E3',
  warning: '#FCAB10',
  warningSoft: '#FDE5B7',
  error: '#F8333C',
  errorSoft: '#FAD4D8',
  neutral: '#DBD5B5',
  overlay40: 'rgba(28, 32, 30, 0.35)',
};

export const spacing = {
  /** Base spacing unit derived from the 8 px baseline grid. */
  base: 8,
  /** Horizontal screen padding. */
  screenHorizontal: 16,
  /** Vertical block spacing rhythm. */
  block: 24,
};

export const radii = {
  /** Corner radius for elevated surfaces and cards. */
  surface: 12,
  /** Corner radius for controls and inputs. */
  control: 8,
  /** Corner radius for circular buttons / icons. */
  pill: 24,
};

export const shadows = {
  card: {
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  modal: {
    shadowColor: '#000000',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 10 },
    elevation: 5,
  },
};

export const typography = {
  headline: {
    fontSize: 24,
    lineHeight: 32,
    fontFamily: fontFamilies.serif.semibold,
  },
  title: {
    fontSize: 20,
    lineHeight: 26,
    fontFamily: fontFamilies.serif.semibold,
  },
  subhead: {
    fontSize: 18,
    lineHeight: 24,
    fontFamily: fontFamilies.sans.medium,
  },
  body: {
    fontSize: 16,
    lineHeight: 22,
    fontFamily: fontFamilies.sans.regular,
  },
  bodyStrong: {
    fontSize: 16,
    lineHeight: 22,
    fontFamily: fontFamilies.sans.semibold,
  },
  caption: {
    fontSize: 14,
    lineHeight: 18,
    fontFamily: fontFamilies.sans.regular,
  },
  captionStrong: {
    fontSize: 14,
    lineHeight: 18,
    fontFamily: fontFamilies.sans.medium,
  },
};

export const animation = {
  medium: 200,
  slow: 300,
  fast: 150,
};
