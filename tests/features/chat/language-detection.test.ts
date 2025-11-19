import { containsSpanishMarkers, guessInputLanguage, hasNonAscii } from '@/features/chat/utils/language-detection';
import type { LanguageProfile } from '@/contracts/models';

const baseProfile: LanguageProfile = {
  profileId: 'profile-1',
  userId: 'user-1',
  nativeLanguage: 'en',
  targetLanguage: 'es',
  targetRegion: 'mx',
  preferredDifficulty: 'intermediate',
  stylePreferences: { slang: 0.4, idioms: 0.5, formal: 0.5 },
  savedSessions: [],
  srsState: [],
  errorLedger: [],
  lastFlagAsset: 'flag',
  updatedAt: new Date().toISOString(),
};

describe('language-detection helpers', () => {
  test('hasNonAscii flags accented strings', () => {
    expect(hasNonAscii('palabra')).toBe(false);
    expect(hasNonAscii('señor')).toBe(true);
  });

  test('containsSpanishMarkers detects Spanish punctuation/accents', () => {
    expect(containsSpanishMarkers('¡Hola!')).toBe(true);
    expect(containsSpanishMarkers('hello')).toBe(false);
  });

  test('guessInputLanguage defaults to native when no profile', () => {
    expect(guessInputLanguage('hello', undefined)).toBe('native');
  });

  test('guessInputLanguage respects accented input as target', () => {
    expect(guessInputLanguage('canción', baseProfile)).toBe('target');
  });

  test('guessInputLanguage uses Spanish markers for native/target hints', () => {
    const spanishNative = { ...baseProfile, nativeLanguage: 'es', targetLanguage: 'en' as const };
    expect(guessInputLanguage('¡Hola!', spanishNative)).toBe('native');
    expect(guessInputLanguage('¿Cómo estás?', baseProfile)).toBe('target');
  });

  test('guessInputLanguage uses English signals for native English', () => {
    expect(guessInputLanguage('the quick brown fox', baseProfile)).toBe('native');
  });
});
