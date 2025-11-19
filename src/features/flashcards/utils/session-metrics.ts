import type { FtxCard } from '@/contracts/models';

export type OutcomeCounts = {
  correct: number;
  incorrect: number;
};

/** Aggregate outcomes from card histories for progress counters. */
export const computeOutcomes = (cards: FtxCard[]): OutcomeCounts =>
  cards.reduce<OutcomeCounts>(
    (acc, item) => {
      item.history.forEach(entry => {
        if (entry.outcome === 'correct') {
          acc.correct += 1;
        } else {
          acc.incorrect += 1;
        }
      });
      return acc;
    },
    { correct: 0, incorrect: 0 },
  );

/** Build a recap payload from completed cards with flagged/id metadata. */
export const buildRecap = (cards: FtxCard[], srsDue: Map<string, string>) => {
  const latest = cards
    .map(item => item.history[item.history.length - 1])
    .filter((entry): entry is NonNullable<(typeof item.history)[number]> => Boolean(entry));
  const correctCount = latest.filter(entry => entry.outcome === 'correct').length;
  const incorrectCount = latest.filter(entry => entry.outcome === 'incorrect').length;
  const total = Math.max(cards.length, latest.length || 1);

  return {
    accuracy: correctCount / total,
    correctCount,
    incorrectCount,
    flaggedCardIds: cards.filter(item => item.isFlagged).map(item => item.cardId),
    srsQueue: Array.from(srsDue.entries()).map(([vocabId, dueAt]) => ({
      vocabId,
      dueAt,
    })),
  };
};
