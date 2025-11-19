import type { LanguageProfile } from '@/contracts/models';

export const hasNonAscii = (value: string) => /[\u0080-\uFFFF]/.test(value);

export const containsSpanishMarkers = (value: string) => /[áéíóúüñ¿¡]/i.test(value);

export const guessInputLanguage = (
  value: string,
  profile?: LanguageProfile,
): 'native' | 'target' => {
  if (!profile) {
    return 'native';
  }

  const trimmed = value.trim();
  const lower = trimmed.toLowerCase();

  if (profile.targetLanguage === 'es' && containsSpanishMarkers(lower)) {
    return 'target';
  }
  if (profile.nativeLanguage === 'es' && containsSpanishMarkers(lower)) {
    return 'native';
  }

  if (hasNonAscii(lower)) {
    return 'target';
  }

  if (profile.nativeLanguage === 'en') {
    const englishPattern = /\b(the|and|of|to|is|in)\b/;
    if (englishPattern.test(lower)) {
      return 'native';
    }
  }

  return 'target';
};
