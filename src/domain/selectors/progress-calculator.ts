import { formatISO, parseISO } from 'date-fns';
import type { DrillSession, ProgressStats, VocabItem } from '../../contracts/models';

/** Configuration for deriving aggregate learner progress. */
export interface ProgressCalculatorOptions {
  /** Unique identifier for the learner the stats describe. */
  userId: string;
  /** Vocabulary items available to the learner. */
  vocabItems: VocabItem[];
  /** Drill sessions previously completed by the learner. */
  sessions: DrillSession[];
  /** Timestamp representing "now" for calculations. */
  now: Date;
  /** Spaced repetition streak threshold considered as "learned". */
  learnedStreakThreshold?: number;
}

/** Calculates aggregate study progress statistics for a learner. */
export const calculateProgressStats = (
  options: ProgressCalculatorOptions,
): ProgressStats => {
  const {
    userId,
    vocabItems,
    sessions,
    now,
    learnedStreakThreshold = 3,
  } = options;

  const totalVocabCount = vocabItems.length;
  let learnedVocabCount = 0;
  let reviewDueCount = 0;

  vocabItems.forEach(item => {
    const srs = item.srsData;
    if (!srs) {
      return;
    }

    if (srs.streak >= learnedStreakThreshold) {
      learnedVocabCount += 1;
    }

    const dueDate = parseISO(srs.dueAt);
    if (dueDate.getTime() <= now.getTime()) {
      reviewDueCount += 1;
    }
  });

  const endDates = sessions
    .map(session => parseISO(session.endedAt))
    .sort((a, b) => b.getTime() - a.getTime());

  const lastSession = endDates[0] ?? null;
  const lastSessionAt = lastSession ? lastSession.toISOString() : null;

  const streakDays = calculateStreakDays(endDates, now);

  return {
    userId,
    totalVocabCount,
    learnedVocabCount,
    reviewDueCount,
    streakDays,
    lastSessionAt,
  };
};

/** Determines consecutive session days counting back from the provided moment. */
const calculateStreakDays = (sessionDates: Date[], now: Date): number => {
  if (sessionDates.length === 0) {
    return 0;
  }

  const uniqueDates = new Set(sessionDates.map(date => formatISO(date, { representation: 'date' })));

  let streak = 0;
  let cursor = new Date(now);

  while (true) {
    const cursorKey = formatISO(cursor, { representation: 'date' });
    if (!uniqueDates.has(cursorKey)) {
      break;
    }

    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
};
