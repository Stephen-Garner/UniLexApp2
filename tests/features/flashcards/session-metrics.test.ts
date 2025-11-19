import { buildRecap, computeOutcomes } from '@/features/flashcards/utils/session-metrics';
import type { FtxCard, FlashcardHistory } from '@/contracts/models';

const historyEntry = (outcome: 'correct' | 'incorrect'): FlashcardHistory => ({
  attemptId: `a-${outcome}`,
  outcome,
  timestamp: new Date().toISOString(),
});

const makeCard = (id: string, outcomes: Array<'correct' | 'incorrect'>): FtxCard => ({
  cardId: id,
  vocabId: id,
  term: `term-${id}`,
  definition: `def-${id}`,
  example: null,
  isFlagged: false,
  history: outcomes.map(historyEntry),
});

describe('flashcard session metrics', () => {
  test('computeOutcomes aggregates correct/incorrect counts', () => {
    const cards: FtxCard[] = [
      makeCard('1', ['correct', 'incorrect']),
      makeCard('2', ['correct']),
      makeCard('3', []),
    ];

    expect(computeOutcomes(cards)).toEqual({ correct: 2, incorrect: 1 });
  });

  test('buildRecap builds recap payload with srs queue', () => {
    const cards: FtxCard[] = [
      { ...makeCard('1', ['correct']), isFlagged: true },
      makeCard('2', ['incorrect']),
    ];
    const srsDue = new Map<string, string>([
      ['1', '2025-01-01T00:00:00.000Z'],
      ['2', '2025-01-02T00:00:00.000Z'],
    ]);

    const recap = buildRecap(cards, srsDue);
    expect(recap.correctCount).toBe(1);
    expect(recap.incorrectCount).toBe(1);
    expect(recap.flaggedCardIds).toEqual(['1']);
    expect(recap.srsQueue).toEqual([
      { vocabId: '1', dueAt: '2025-01-01T00:00:00.000Z' },
      { vocabId: '2', dueAt: '2025-01-02T00:00:00.000Z' },
    ]);
  });
});
