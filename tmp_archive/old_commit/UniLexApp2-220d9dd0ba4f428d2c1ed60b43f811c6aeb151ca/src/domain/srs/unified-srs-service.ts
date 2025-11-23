import { nanoid } from 'nanoid/non-secure';
import { calculateSm2Review } from './sm2-engine';
import type { VocabItem, SrsData, PerformanceData } from '../../contracts/models';

/**
 * Activity type for SRS updates.
 * Recognition = passive recall (flashcards)
 * Production = active recall (translation, writing)
 */
export type ActivityType = 'recognition' | 'production';

/**
 * Outcome of a learning activity attempt.
 */
export interface ActivityOutcome {
  /** Type of activity performed. */
  activityType: ActivityType;
  /** Whether the attempt was successful. */
  wasCorrect: boolean;
  /** Optional score (0-1) for graded activities like translation. */
  score?: number;
  /** Timestamp when the activity was performed. */
  attemptedAt: Date;
}

/**
 * Result of updating SRS data for a vocabulary item.
 */
export interface SrsUpdateResult {
  /** Updated SRS scheduling data. */
  srsData: SrsData;
  /** Updated performance tracking data. */
  performanceData: PerformanceData;
}

/**
 * Maps an activity outcome to an SM-2 quality score (0-5).
 *
 * Recognition (Flashcards):
 * - Correct → 4 (good recall)
 * - Incorrect → 2 (failed recall)
 *
 * Production (Translation):
 * - Score ≥ 0.9 → 5 (perfect, indicates deep mastery)
 * - Score ≥ 0.7 → 4 (good)
 * - Score ≥ 0.5 → 3 (passing, needs reinforcement)
 * - Score ≥ 0.3 → 2 (poor, significant gaps)
 * - Score < 0.3 → 1 (very poor)
 *
 * Rationale: Production is harder than recognition, so successful production
 * indicates stronger mastery and should accelerate SRS scheduling more.
 */
const mapOutcomeToQuality = (outcome: ActivityOutcome): number => {
  if (outcome.activityType === 'recognition') {
    // Flashcard recognition: binary correct/incorrect
    return outcome.wasCorrect ? 4 : 2;
  }

  // Production (translation): use graduated quality based on score
  if (outcome.score === undefined) {
    // Fallback to binary if no score provided
    return outcome.wasCorrect ? 4 : 2;
  }

  const score = outcome.score;
  if (score >= 0.9) return 5;
  if (score >= 0.7) return 4;
  if (score >= 0.5) return 3;
  if (score >= 0.3) return 2;
  return 1;
};

/**
 * Updates the performance data based on the activity outcome.
 */
const updatePerformanceData = (
  previous: PerformanceData | undefined,
  outcome: ActivityOutcome,
): PerformanceData => {
  const base: PerformanceData = previous ?? {
    recognition: {
      correctCount: 0,
      incorrectCount: 0,
      lastAttemptAt: null,
    },
    production: {
      correctCount: 0,
      incorrectCount: 0,
      lastAttemptAt: null,
    },
  };

  if (outcome.activityType === 'recognition') {
    return {
      ...base,
      recognition: {
        correctCount: base.recognition.correctCount + (outcome.wasCorrect ? 1 : 0),
        incorrectCount: base.recognition.incorrectCount + (outcome.wasCorrect ? 0 : 1),
        lastAttemptAt: outcome.attemptedAt.toISOString(),
      },
    };
  }

  // Production
  return {
    ...base,
    production: {
      correctCount: base.production.correctCount + (outcome.wasCorrect ? 1 : 0),
      incorrectCount: base.production.incorrectCount + (outcome.wasCorrect ? 0 : 1),
      lastAttemptAt: outcome.attemptedAt.toISOString(),
    },
  };
};

/**
 * Updates SRS data and performance tracking for a vocabulary item based on an activity outcome.
 *
 * This is the unified entry point for both recognition (flashcards) and production (translation)
 * activities. It ensures consistent SRS scheduling while tracking activity-specific performance.
 *
 * @param vocabItem The vocabulary item being practiced.
 * @param outcome The outcome of the practice attempt.
 * @returns Updated SRS and performance data.
 */
export const updateVocabSrs = (
  vocabItem: VocabItem,
  outcome: ActivityOutcome,
): SrsUpdateResult => {
  // Map outcome to quality score based on activity type
  const quality = mapOutcomeToQuality(outcome);

  // Calculate new SRS schedule using SM-2 algorithm
  const reviewResult = calculateSm2Review({
    quality,
    reviewDate: outcome.attemptedAt,
    previous: vocabItem.srsData,
  });

  // Update performance tracking
  const performanceData = updatePerformanceData(vocabItem.performanceData, outcome);

  // Build complete SRS data
  const srsData: SrsData = {
    id: vocabItem.srsData?.id ?? nanoid(),
    algorithm: reviewResult.algorithm,
    easeFactor: reviewResult.easeFactor,
    intervalHours: reviewResult.intervalHours,
    streak: reviewResult.streak,
    dueAt: reviewResult.dueAt,
    lastReviewedAt: reviewResult.lastReviewedAt,
  };

  return {
    srsData,
    performanceData,
  };
};

/**
 * Calculates overall mastery level for a vocabulary item.
 *
 * Mastery is computed by combining:
 * - Recognition accuracy (weighted 40%)
 * - Production accuracy (weighted 60%)
 *
 * Production is weighted more heavily because it indicates deeper mastery.
 *
 * @param vocabItem The vocabulary item to evaluate.
 * @returns Mastery score between 0 and 1, or null if no practice data exists.
 */
export const calculateMasteryLevel = (vocabItem: VocabItem): number | null => {
  const perf = vocabItem.performanceData;
  if (!perf) return null;

  const recognitionTotal = perf.recognition.correctCount + perf.recognition.incorrectCount;
  const productionTotal = perf.production.correctCount + perf.production.incorrectCount;

  // Need at least one attempt to calculate mastery
  if (recognitionTotal === 0 && productionTotal === 0) {
    return null;
  }

  const recognitionAccuracy =
    recognitionTotal > 0 ? perf.recognition.correctCount / recognitionTotal : 0;
  const productionAccuracy =
    productionTotal > 0 ? perf.production.correctCount / productionTotal : 0;

  // Weighted combination: 40% recognition, 60% production
  // If only one type has data, use that exclusively
  if (recognitionTotal === 0) return productionAccuracy;
  if (productionTotal === 0) return recognitionAccuracy;

  return recognitionAccuracy * 0.4 + productionAccuracy * 0.6;
};

/**
 * Determines if a vocabulary item is considered "mastered" based on performance data.
 *
 * Mastery criteria:
 * - Mastery level ≥ 0.8 (80% accuracy)
 * - At least 3 successful reviews in total
 * - Current SRS streak ≥ 2
 *
 * @param vocabItem The vocabulary item to evaluate.
 * @returns True if the item is considered mastered.
 */
export const isItemMastered = (vocabItem: VocabItem): boolean => {
  const mastery = calculateMasteryLevel(vocabItem);
  if (mastery === null || mastery < 0.8) return false;

  const perf = vocabItem.performanceData;
  if (!perf) return false;

  const totalCorrect = perf.recognition.correctCount + perf.production.correctCount;
  if (totalCorrect < 3) return false;

  const currentStreak = vocabItem.srsData?.streak ?? 0;
  return currentStreak >= 2;
};

/**
 * Gets the number of days until the next review is due.
 *
 * @param vocabItem The vocabulary item to check.
 * @returns Number of days until due (negative if overdue), or null if no SRS data.
 */
export const getDaysUntilDue = (vocabItem: VocabItem): number | null => {
  if (!vocabItem.srsData?.dueAt) return null;

  const dueDate = new Date(vocabItem.srsData.dueAt);
  const now = new Date();
  const diffMs = dueDate.getTime() - now.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  return Math.round(diffDays * 10) / 10; // Round to 1 decimal place
};

/**
 * Determines if a vocabulary item is due for review.
 *
 * @param vocabItem The vocabulary item to check.
 * @returns True if the item is due for review (or overdue).
 */
export const isItemDue = (vocabItem: VocabItem): boolean => {
  if (!vocabItem.srsData?.dueAt) return false;

  const dueDate = new Date(vocabItem.srsData.dueAt);
  const now = new Date();

  return now >= dueDate;
};

/**
 * Gets a human-readable summary of performance for a vocabulary item.
 *
 * @param vocabItem The vocabulary item to summarize.
 * @returns Performance summary object.
 */
export const getPerformanceSummary = (vocabItem: VocabItem) => {
  const perf = vocabItem.performanceData;
  const mastery = calculateMasteryLevel(vocabItem);
  const daysUntilDue = getDaysUntilDue(vocabItem);
  const isMastered = isItemMastered(vocabItem);

  return {
    recognition: {
      correct: perf?.recognition.correctCount ?? 0,
      incorrect: perf?.recognition.incorrectCount ?? 0,
      total: (perf?.recognition.correctCount ?? 0) + (perf?.recognition.incorrectCount ?? 0),
      accuracy:
        (perf?.recognition.correctCount ?? 0) + (perf?.recognition.incorrectCount ?? 0) > 0
          ? (perf?.recognition.correctCount ?? 0) /
            ((perf?.recognition.correctCount ?? 0) + (perf?.recognition.incorrectCount ?? 0))
          : null,
    },
    production: {
      correct: perf?.production.correctCount ?? 0,
      incorrect: perf?.production.incorrectCount ?? 0,
      total: (perf?.production.correctCount ?? 0) + (perf?.production.incorrectCount ?? 0),
      accuracy:
        (perf?.production.correctCount ?? 0) + (perf?.production.incorrectCount ?? 0) > 0
          ? (perf?.production.correctCount ?? 0) /
            ((perf?.production.correctCount ?? 0) + (perf?.production.incorrectCount ?? 0))
          : null,
    },
    overall: {
      mastery,
      isMastered,
      streak: vocabItem.srsData?.streak ?? 0,
      daysUntilDue,
      isDue: isItemDue(vocabItem),
    },
  };
};
