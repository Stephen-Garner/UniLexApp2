import { selectDrillQueue } from '../../src/domain/selectors/drill-selector';
import type { VocabItem } from '../../src/contracts/models';

const createVocab = (overrides: Partial<VocabItem>): VocabItem => ({
  id: 'id-' + Math.random().toString(36).slice(2),
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

describe('selectDrillQueue', () => {
  it('prioritises due, upcoming, then new vocabulary items', () => {
    const now = new Date('2025-01-10T12:00:00.000Z');

    const dueOldest = createVocab({
      id: 'due-old',
      srsData: {
        id: 'srs-old',
        algorithm: 'sm2',
        streak: 3,
        intervalHours: 72,
        easeFactor: 2.4,
        dueAt: '2025-01-09T10:00:00.000Z',
        lastReviewedAt: '2025-01-03T10:00:00.000Z',
      },
    });

    const dueRecent = createVocab({
      id: 'due-recent',
      srsData: {
        id: 'srs-recent',
        algorithm: 'sm2',
        streak: 2,
        intervalHours: 120,
        easeFactor: 2.3,
        dueAt: '2025-01-10T10:00:00.000Z',
        lastReviewedAt: '2025-01-05T10:00:00.000Z',
      },
    });

    const upcomingSooner = createVocab({
      id: 'upcoming-sooner',
      srsData: {
        id: 'srs-up-sooner',
        algorithm: 'sm2',
        streak: 1,
        intervalHours: 48,
        easeFactor: 2.5,
        dueAt: '2025-01-10T18:00:00.000Z',
        lastReviewedAt: '2025-01-08T18:00:00.000Z',
      },
    });

    const upcomingLater = createVocab({
      id: 'upcoming-later',
      srsData: {
        id: 'srs-up-later',
        algorithm: 'sm2',
        streak: 1,
        intervalHours: 48,
        easeFactor: 2.5,
        dueAt: '2025-01-10T20:00:00.000Z',
        lastReviewedAt: '2025-01-08T20:00:00.000Z',
      },
    });

    const newItem = createVocab({
      id: 'new-item',
      srsData: undefined,
      createdAt: '2024-12-01T00:00:00.000Z',
    });

    const laterItem = createVocab({
      id: 'later-item',
      srsData: {
        id: 'srs-later',
        algorithm: 'sm2',
        streak: 4,
        intervalHours: 240,
        easeFactor: 2.7,
        dueAt: '2025-01-15T00:00:00.000Z',
        lastReviewedAt: '2024-12-20T00:00:00.000Z',
      },
    });

    const { queue, dueCount, upcomingCount, newCount } = selectDrillQueue(
      [laterItem, upcomingLater, dueRecent, newItem, dueOldest, upcomingSooner],
      {
        now,
        limit: 5,
        upcomingWindowHours: 12,
      },
    );

    expect(queue.map(item => item.id)).toEqual([
      'due-old',
      'due-recent',
      'upcoming-sooner',
      'upcoming-later',
      'new-item',
    ]);

    expect(dueCount).toBe(2);
    expect(upcomingCount).toBe(2);
    expect(newCount).toBe(1);
  });
});
