// src/features/flashcards/hooks/useFlashcardSession.ts

import { generateFlashcardSession } from '@/domain/flashcards/session-generator';
import { useSession } from '@/features/common/hooks/useSession';

export const useFlashcardSession = () => {
    return useSession(generateFlashcardSession, 'flashcard');
}