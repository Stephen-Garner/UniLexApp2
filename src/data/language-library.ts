export type RegionOption = {
  code: string;
  label: string;
  flag: string;
};

export type LanguageOption = {
  code: string;
  label: string;
  nativeLabel: string;
  defaultRegion?: string;
  flag: string;
  regions: RegionOption[];
};

export const LANGUAGE_LIBRARY: LanguageOption[] = [
  {
    code: 'en',
    label: 'English',
    nativeLabel: 'English',
    flag: '🇺🇸',
    defaultRegion: 'us',
    regions: [
      { code: 'us', label: 'United States', flag: '🇺🇸' },
      { code: 'uk', label: 'United Kingdom', flag: '🇬🇧' },
      { code: 'au', label: 'Australia', flag: '🇦🇺' },
    ],
  },
  {
    code: 'es',
    label: 'Spanish',
    nativeLabel: 'Español',
    flag: '🇪🇸',
    defaultRegion: 'es',
    regions: [
      { code: 'es', label: 'Spain', flag: '🇪🇸' },
      { code: 'mx', label: 'Mexico', flag: '🇲🇽' },
      { code: 'ar', label: 'Argentina', flag: '🇦🇷' },
    ],
  },
  {
    code: 'pt',
    label: 'Portuguese',
    nativeLabel: 'Português',
    flag: '🇵🇹',
    defaultRegion: 'br',
    regions: [
      { code: 'br', label: 'Brazil', flag: '🇧🇷' },
      { code: 'pt', label: 'Portugal', flag: '🇵🇹' },
    ],
  },
  {
    code: 'fr',
    label: 'French',
    nativeLabel: 'Français',
    flag: '🇫🇷',
    defaultRegion: 'fr',
    regions: [
      { code: 'fr', label: 'France', flag: '🇫🇷' },
      { code: 'ca', label: 'Canada (Québec)', flag: '🇨🇦' },
    ],
  },
  {
    code: 'de',
    label: 'German',
    nativeLabel: 'Deutsch',
    flag: '🇩🇪',
    defaultRegion: 'de',
    regions: [
      { code: 'de', label: 'Germany', flag: '🇩🇪' },
      { code: 'at', label: 'Austria', flag: '🇦🇹' },
      { code: 'ch', label: 'Switzerland', flag: '🇨🇭' },
    ],
  },
];

const flagFallback = '🏳️';

export const findLanguageOption = (code?: string | null): LanguageOption | undefined =>
  LANGUAGE_LIBRARY.find(option => option.code === (code ?? '').toLowerCase());

export const findRegionOption = (
  languageCode?: string | null,
  regionCode?: string | null,
): RegionOption | undefined => {
  const language = findLanguageOption(languageCode);
  if (!language) {
    return undefined;
  }
  if (!regionCode) {
    return undefined;
  }
  return language.regions.find(region => region.code === regionCode.toLowerCase());
};

export const resolveFlagGlyph = (languageCode?: string | null, regionCode?: string | null): string => {
  const region = findRegionOption(languageCode, regionCode);
  if (region) {
    return region.flag;
  }
  const language = findLanguageOption(languageCode);
  if (language) {
    return language.flag;
  }
  return flagFallback;
};

export const listRegionOptions = (languageCode?: string | null): RegionOption[] => {
  const language = findLanguageOption(languageCode);
  return language?.regions ?? [];
};
