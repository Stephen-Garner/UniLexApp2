import {
  updateVocabSrs,
  calculateMasteryLevel,
  isItemMastered,
  getDaysUntilDue,
  isItemDue,
  type ActivityOutcome,
} from '../../src/domain/srs/unified-srs-service';
import type { VocabItem } from '../../src/contracts/models';

const createMockVocabItem = (overrides?: Partial<VocabItem>): VocabItem => ({
  id: 'test-vocab-1',
  term: 'hola',
  meaning: 'hello',
  examples: ['Hola, ¿cómo estás?'],
  tags: ['greeting'],
  folders: [],
  level: 'A1',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

describe('updateVocabSrs', () => {
  it('updates recognition performance for flashcard correct answer', () => {
    const vocab = createMockVocabItem();
    const outcome: ActivityOutcome = {
      activityType: 'recognition',
      wasCorrect: true,
      attemptedAt: new Date('2025-01-01T00:00:00.000Z'),
    };

    const result = updateVocabSrs(vocab, outcome);

    expect(result.performanceData.recognition.correctCount).toBe(1);
    expect(result.performanceData.recognition.incorrectCount).toBe(0);
    expect(result.performanceData.production.correctCount).toBe(0);
    expect(result.srsData.streak).toBe(1);
    expect(result.srsData.intervalHours).toBe(24);
  });

  it('updates recognition performance for flashcard incorrect answer', () => {
    const vocab = createMockVocabItem();
    const outcome: ActivityOutcome = {
      activityType: 'recognition',
      wasCorrect: false,
      attemptedAt: new Date('2025-01-01T00:00:00.000Z'),
    };

    const result = updateVocabSrs(vocab, outcome);

    expect(result.performanceData.recognition.correctCount).toBe(0);
    expect(result.performanceData.recognition.incorrectCount).toBe(1);
    expect(result.srsData.streak).toBe(0);
  });

  it('updates production performance with score-based quality for translation', () => {
    const vocab = createMockVocabItem();
    const outcome: ActivityOutcome = {
      activityType: 'production',
      wasCorrect: true,
      score: 0.95,
      attemptedAt: new Date('2025-01-01T00:00:00.000Z'),
    };

    const result = updateVocabSrs(vocab, outcome);

    expect(result.performanceData.production.correctCount).toBe(1);
    expect(result.performanceData.production.incorrectCount).toBe(0);
    expect(result.performanceData.recognition.correctCount).toBe(0);
    expect(result.srsData.streak).toBe(1);
    // Quality 5 (perfect) should be used for score >= 0.9
    expect(result.srsData.easeFactor).toBeGreaterThan(2.5);
  });

  it('uses lower quality for partial translation success', () => {
    const vocab = createMockVocabItem();
    const highScoreOutcome: ActivityOutcome = {
      activityType: 'production',
      wasCorrect: true,
      score: 0.6,
      attemptedAt: new Date('2025-01-01T00:00:00.000Z'),
    };

    const highResult = updateVocabSrs(vocab, highScoreOutcome);

    const vocab2 = createMockVocabItem({ id: 'test-vocab-2' });
    const lowScoreOutcome: ActivityOutcome = {
      activityType: 'production',
      wasCorrect: false,
      score: 0.4,
      attemptedAt: new Date('2025-01-01T00:00:00.000Z'),
    };

    const lowResult = updateVocabSrs(vocab2, lowScoreOutcome);

    // Higher score should result in better ease factor
    expect(highResult.srsData.easeFactor).toBeGreaterThan(lowResult.srsData.easeFactor);
  });

  it('accumulates performance data across multiple attempts', () => {
    const vocab = createMockVocabItem({
      performanceData: {
        recognition: {
          correctCount: 2,
          incorrectCount: 1,
          lastAttemptAt: new Date('2025-01-01T00:00:00.000Z').toISOString(),
        },
        production: {
          correctCount: 0,
          incorrectCount: 0,
          lastAttemptAt: null,
        },
      },
    });

    const outcome: ActivityOutcome = {
      activityType: 'recognition',
      wasCorrect: true,
      attemptedAt: new Date('2025-01-02T00:00:00.000Z'),
    };

    const result = updateVocabSrs(vocab, outcome);

    expect(result.performanceData.recognition.correctCount).toBe(3);
    expect(result.performanceData.recognition.incorrectCount).toBe(1);
  });
});

describe('calculateMasteryLevel', () => {
  it('returns null when no performance data exists', () => {
    const vocab = createMockVocabItem();
    expect(calculateMasteryLevel(vocab)).toBeNull();
  });

  it('calculates weighted mastery from recognition and production', () => {
    const vocab = createMockVocabItem({
      performanceData: {
        recognition: {
          correctCount: 8,
          incorrectCount: 2,
          lastAttemptAt: new Date().toISOString(),
        },
        production: {
          correctCount: 7,
          incorrectCount: 3,
          lastAttemptAt: new Date().toISOString(),
        },
      },
    });

    const mastery = calculateMasteryLevel(vocab);

    // recognition: 8/10 = 0.8, production: 7/10 = 0.7
    // weighted: 0.8 * 0.4 + 0.7 * 0.6 = 0.32 + 0.42 = 0.74
    expect(mastery).toBeCloseTo(0.74, 2);
  });

  it('uses only recognition data when production is empty', () => {
    const vocab = createMockVocabItem({
      performanceData: {
        recognition: {
          correctCount: 9,
          incorrectCount: 1,
          lastAttemptAt: new Date().toISOString(),
        },
        production: {
          correctCount: 0,
          incorrectCount: 0,
          lastAttemptAt: null,
        },
      },
    });

    const mastery = calculateMasteryLevel(vocab);
    expect(mastery).toBeCloseTo(0.9, 2);
  });

  it('uses only production data when recognition is empty', () => {
    const vocab = createMockVocabItem({
      performanceData: {
        recognition: {
          correctCount: 0,
          incorrectCount: 0,
          lastAttemptAt: null,
        },
        production: {
          correctCount: 4,
          incorrectCount: 1,
          lastAttemptAt: new Date().toISOString(),
        },
      },
    });

    const mastery = calculateMasteryLevel(vocab);
    expect(mastery).toBeCloseTo(0.8, 2);
  });
});

describe('isItemMastered', () => {
  it('returns false when mastery is below threshold', () => {
    const vocab = createMockVocabItem({
      performanceData: {
        recognition: {
          correctCount: 3,
          incorrectCount: 2,
          lastAttemptAt: new Date().toISOString(),
        },
        production: {
          correctCount: 2,
          incorrectCount: 3,
          lastAttemptAt: new Date().toISOString(),
        },
      },
      srsData: {
        id: 'srs-1',
        algorithm: 'sm2',
        streak: 2,
        intervalHours: 144,
        easeFactor: 2.5,
        dueAt: new Date(Date.now() + 86400000).toISOString(),
        lastReviewedAt: new Date().toISOString(),
      },
    });

    expect(isItemMastered(vocab)).toBe(false);
  });

  it('returns true when all mastery criteria are met', () => {
    const vocab = createMockVocabItem({
      performanceData: {
        recognition: {
          correctCount: 4,
          incorrectCount: 1,
          lastAttemptAt: new Date().toISOString(),
        },
        production: {
          correctCount: 3,
          incorrectCount: 0,
          lastAttemptAt: new Date().toISOString(),
        },
      },
      srsData: {
        id: 'srs-1',
        algorithm: 'sm2',
        streak: 3,
        intervalHours: 144,
        easeFactor: 2.6,
        dueAt: new Date(Date.now() + 86400000).toISOString(),
        lastReviewedAt: new Date().toISOString(),
      },
    });

    expect(isItemMastered(vocab)).toBe(true);
  });
});

describe('getDaysUntilDue', () => {
  it('returns null when no SRS data exists', () => {
    const vocab = createMockVocabItem();
    expect(getDaysUntilDue(vocab)).toBeNull();
  });

  it('calculates positive days for future due date', () => {
    const twoDaysFromNow = new Date(Date.now() + 2 * 86400000);
    const vocab = createMockVocabItem({
      srsData: {
        id: 'srs-1',
        algorithm: 'sm2',
        streak: 1,
        intervalHours: 48,
        easeFactor: 2.5,
        dueAt: twoDaysFromNow.toISOString(),
        lastReviewedAt: new Date().toISOString(),
      },
    });

    const days = getDaysUntilDue(vocab);
    expect(days).toBeCloseTo(2, 0);
  });

  it('calculates negative days for overdue items', () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 86400000);
    const vocab = createMockVocabItem({
      srsData: {
        id: 'srs-1',
        algorithm: 'sm2',
        streak: 1,
        intervalHours: 48,
        easeFactor: 2.5,
        dueAt: twoDaysAgo.toISOString(),
        lastReviewedAt: new Date().toISOString(),
      },
    });

    const days = getDaysUntilDue(vocab);
    expect(days).toBeCloseTo(-2, 0);
  });
});

describe('isItemDue', () => {
  it('returns false when no SRS data exists', () => {
    const vocab = createMockVocabItem();
    expect(isItemDue(vocab)).toBe(false);
  });

  it('returns true when item is overdue', () => {
    const yesterday = new Date(Date.now() - 86400000);
    const vocab = createMockVocabItem({
      srsData: {
        id: 'srs-1',
        algorithm: 'sm2',
        streak: 1,
        intervalHours: 24,
        easeFactor: 2.5,
        dueAt: yesterday.toISOString(),
        lastReviewedAt: new Date().toISOString(),
      },
    });

    expect(isItemDue(vocab)).toBe(true);
  });

  it('returns false when item is not yet due', () => {
    const tomorrow = new Date(Date.now() + 86400000);
    const vocab = createMockVocabItem({
      srsData: {
        id: 'srs-1',
        algorithm: 'sm2',
        streak: 1,
        intervalHours: 24,
        easeFactor: 2.5,
        dueAt: tomorrow.toISOString(),
        lastReviewedAt: new Date().toISOString(),
      },
    });

    expect(isItemDue(vocab)).toBe(false);
  });
});
