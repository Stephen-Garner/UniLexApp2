import type { VocabItem } from '@/contracts/models';
import { buildVocabPool } from '@/features/translation/utils/session-builder';

const vocab = (id: string, overrides: Partial<VocabItem> = {}): VocabItem => ({
  id,
  term: `term-${id}`,
  reading: undefined,
  meaning: `meaning-${id}`,
  examples: [],
  tags: [],
  folders: [],
  level: 'N/A',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  srsData: undefined,
  ...overrides,
});

describe('buildVocabPool', () => {
  it('returns empty result when no saved vocab for review-only', () => {
    const result = buildVocabPool({
      reviewMode: 'review_only',
      questionCount: 3,
      savedVocab: [],
      targetLanguage: 'es',
      difficulty: 'intermediate',
      topics: '',
    });
    expect(result.type).toBe('empty');
  });

  it('fills with synthetic vocab when not enough bank items', () => {
    const items = [vocab('1')];
    const result = buildVocabPool({
      reviewMode: 'new_only',
      questionCount: 3,
      savedVocab: items,
      targetLanguage: 'es',
      difficulty: 'intermediate',
      topics: 'travel',
    });
    expect(result.type).toBe('ok');
    if (result.type === 'ok') {
      expect(result.items).toHaveLength(3);
    }
  });
});
