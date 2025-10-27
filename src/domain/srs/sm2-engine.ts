import { addHours } from 'date-fns';
import type { SrsData } from '../../contracts/models';

/** Minimum ease factor allowed by the SM-2 algorithm. */
const MIN_EASE_FACTOR = 1.3;
/** Default ease factor assigned when no previous record exists. */
const INITIAL_EASE_FACTOR = 2.5;
/** Default minimum interval applied in hours. */
const DEFAULT_MIN_INTERVAL_HOURS = 24;

/** Shape describing the relevant portion of spaced repetition state. */
export type Sm2State = Pick<
  SrsData,
  'easeFactor' | 'intervalHours' | 'streak' | 'dueAt' | 'lastReviewedAt' | 'algorithm'
>;

/** Configuration supplied to the SM-2 review calculation. */
export interface Sm2ReviewOptions {
  /** Learner quality response scored from 0 (failed) to 5 (perfect). */
  quality: number;
  /** Timestamp representing when the review took place. */
  reviewDate: Date;
  /** Prior spaced repetition state to evolve, if available. */
  previous?: Partial<Sm2State>;
  /** Lower bound applied to the computed interval in hours. */
  minimumIntervalHours?: number;
}

/** Result emitted from an SM-2 review calculation. */
export interface Sm2ReviewResult extends Sm2State {
  /** Indicates whether the learner response met the success threshold. */
  wasSuccessful: boolean;
}

/**
 * Applies the SM-2 spaced repetition scheduling algorithm to the provided review.
 * @param options Configuration describing the review outcome and prior state.
 */
export const calculateSm2Review = (options: Sm2ReviewOptions): Sm2ReviewResult => {
  const { quality, reviewDate, previous, minimumIntervalHours } = options;

  if (!Number.isFinite(quality) || quality < 0 || quality > 5) {
    throw new RangeError('quality must be a number between 0 and 5 inclusive');
  }

  const minimumInterval = Math.max(
    DEFAULT_MIN_INTERVAL_HOURS,
    minimumIntervalHours ?? DEFAULT_MIN_INTERVAL_HOURS,
  );

  const previousEase = previous?.easeFactor ?? INITIAL_EASE_FACTOR;
  const previousStreak = previous?.streak ?? 0;
  const previousInterval = previous?.intervalHours ?? 0;
  const previousAlgorithm = previous?.algorithm ?? 'sm2';

  const qualityOffset = 5 - quality;
  const easeAdjustment = 0.1 - qualityOffset * (0.08 + qualityOffset * 0.02);
  const nextEaseFactor = Math.max(MIN_EASE_FACTOR, previousEase + easeAdjustment);

  const wasSuccessful = quality >= 3;
  let nextIntervalHours = minimumInterval;
  let nextStreak = wasSuccessful ? previousStreak + 1 : 0;

  if (wasSuccessful) {
    if (previousStreak === 0) {
      nextIntervalHours = minimumInterval;
    } else if (previousStreak === 1) {
      nextIntervalHours = 6 * DEFAULT_MIN_INTERVAL_HOURS;
    } else {
      const computedInterval =
        previousInterval > 0 ? Math.round(previousInterval * nextEaseFactor) : minimumInterval;
      nextIntervalHours = Math.max(minimumInterval, computedInterval);
    }
  } else {
    nextIntervalHours = minimumInterval;
    nextStreak = 0;
  }

  const dueAtDate = addHours(reviewDate, nextIntervalHours);

  return {
    algorithm: previousAlgorithm,
    easeFactor: Number(nextEaseFactor.toFixed(4)),
    intervalHours: nextIntervalHours,
    streak: nextStreak,
    dueAt: dueAtDate.toISOString(),
    lastReviewedAt: reviewDate.toISOString(),
    wasSuccessful,
  };
};
