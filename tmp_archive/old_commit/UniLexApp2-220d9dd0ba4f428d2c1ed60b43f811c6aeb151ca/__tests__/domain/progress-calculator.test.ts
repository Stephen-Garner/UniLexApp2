import { calculateProgressStats } from '../../src/domain/selectors/progress-calculator';
import type { DrillSession, VocabItem } from '../../src/contracts/models';

const createVocabItem = (overrides: Partial<VocabItem>): VocabItem => ({
  id: 'vocab-' + Math.random().toString(36).slice(2),
  term: 'term',
  meaning: 'meaning',
  examples: [],
  tags: [],
  folders: [],
  level: 'A1',
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: '2025-01-01T00:00:00.000Z',
  ...overrides,
});

const createSession = (overrides: Partial<DrillSession>): DrillSession => ({
  id: 'session-' + Math.random().toString(36).slice(2),
  vocabItemIds: [],
  startedAt: '2025-01-01T00:00:00.000Z',
  endedAt: '2025-01-01T01:00:00.000Z',
  score: 1,
  correctCount: 0,
  incorrectCount: 0,
  ...overrides,
});

describe('calculateProgressStats', () => {
  it('derives counts, streak, and last session information', () => {
    const now = new Date('2025-01-10T12:00:00.000Z');

    const vocabItems: VocabItem[] = [
      createVocabItem({
        id: 'learned-due',
        srsData: {
          id: 'srs-1',
          algorithm: 'sm2',
          streak: 3,
          intervalHours: 72,
          easeFactor: 2.4,
          dueAt: '2025-01-09T23:00:00.000Z',
          lastReviewedAt: '2025-01-06T12:00:00.000Z',
        },
      }),
      createVocabItem({
        id: 'learning',
        srsData: {
          id: 'srs-2',
          algorithm: 'sm2',
          streak: 2,
          intervalHours: 120,
          easeFactor: 2.5,
          dueAt: '2025-01-12T12:00:00.000Z',
          lastReviewedAt: '2025-01-07T12:00:00.000Z',
        },
      }),
      createVocabItem({
        id: 'newbie',
        srsData: undefined,
      }),
    ];

    const sessions: DrillSession[] = [
      createSession({
        endedAt: '2025-01-10T09:00:00.000Z',
      }),
      createSession({
        endedAt: '2025-01-09T09:00:00.000Z',
      }),
      createSession({
        endedAt: '2025-01-07T09:00:00.000Z',
      }),
    ];

    const stats = calculateProgressStats({
      userId: 'user-1',
      vocabItems,
      sessions,
      now,
      learnedStreakThreshold: 3,
    });

    expect(stats).toEqual({
      userId: 'user-1',
      totalVocabCount: 3,
      learnedVocabCount: 1,
      reviewDueCount: 1,
      streakDays: 2,
      lastSessionAt: '2025-01-10T09:00:00.000Z',
    });
  });

  it('handles empty input gracefully', () => {
    const now = new Date('2025-01-10T12:00:00.000Z');

    const stats = calculateProgressStats({
      userId: 'user-42',
      vocabItems: [],
      sessions: [],
      now,
    });

    expect(stats).toEqual({
      userId: 'user-42',
      totalVocabCount: 0,
      learnedVocabCount: 0,
      reviewDueCount: 0,
      streakDays: 0,
      lastSessionAt: null,
    });
  });
});
