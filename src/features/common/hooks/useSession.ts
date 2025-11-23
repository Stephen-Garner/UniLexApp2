// src/features/common/hooks/useSession.ts
import { useState, useCallback } from 'react';
import type { FtxSession, ReviewMode, StylePresetKey, FlashcardPresentationSide, VocabItem, LanguageProfile } from '@/contracts/models';

type SessionType = 'flashcard' | 'translation';

type GenerateSessionOptions = {
    profile: LanguageProfile,
    bankItems: VocabItem[],
    reviewMode: ReviewMode,
    questionCount: number,
    topicTags: string[],
    stylePreset?: StylePresetKey,
    presentationSide?: FlashcardPresentationSide,
};

type SessionGenerationFunction = (options: GenerateSessionOptions) => FtxSession | { type: 'error', message: string };

export const useSession = (generateSessionFn: SessionGenerationFunction, sessionType: SessionType) => {
  const [session, setSession] = useState<FtxSession | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateSession = useCallback(
    async (options: Omit<GenerateSessionOptions, 'profile' | 'bankItems'>) => {
        // This is a placeholder for the actual implementation
        // In a real application, you would fetch the profile and bank items
        // from a data store.
        const profile: LanguageProfile = {
            userId: '1',
            nativeLanguage: 'en',
            targetLanguage: 'es',
            targetRegion: 'mx',
            preferredDifficulty: 'B1'
        };
        const bankItems: VocabItem[] = [];

      setIsLoading(true);
      setError(null);
      try {
        const result = generateSessionFn({
            profile,
            bankItems,
            ...options
        });
        if ('type' in result && result.type === 'error') {
            setError(result.message);
        } else {
            setSession(result as FtxSession);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : `An unknown error occurred while generating the ${sessionType} session.`);
      } finally {
        setIsLoading(false);
      }
    },
    [generateSessionFn, sessionType],
  );

  return { session, isLoading, error, generateSession };
};
