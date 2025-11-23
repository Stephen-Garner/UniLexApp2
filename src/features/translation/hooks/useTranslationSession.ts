// src/features/translation/hooks/useTranslationSession.ts

import { useSession } from '@/features/common/hooks/useSession';
import { generateMockTranslationSession } from '@/domain/translation/mock-generator';

export const useTranslationSession = () => {
    return useSession(generateMockTranslationSession, 'translation');
}