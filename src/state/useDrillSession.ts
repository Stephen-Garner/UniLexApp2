import { useEffect, useMemo, useState } from 'react';
import { nanoid } from 'nanoid/non-secure';
import { calculateSm2Review } from '../domain/srs/sm2-engine';
import { selectDrillQueue } from '../domain/selectors/drill-selector';
import type { DrillSession, SrsData, VocabItem } from '../contracts/models';
import { useBankStore } from './bank.store';
import { progressRepository } from '../services/container';

/** Supported drill practice modes. */
export type DrillMode = 'recall' | 'recognition' | 'cloze' | 'listen';

/** Configuration values supplied to the drill session hook. */
export interface DrillSessionConfig {
  /** Drill mode executed for the session. */
  mode: DrillMode;
  /** Maximum number of items to include in the session. */
  limit?: number;
}

/** Submission payload describing the learner response for an item. */
export interface DrillSubmission {
  /** Learner answer or response content. */
  answer: string;
  /** Quality score from 0 (failed) to 5 (perfect). */
  quality: number;
}

/** Evaluation emitted by the drill session for a submission. */
export interface DrillEvaluation {
  /** Indicates whether the response met the success threshold. */
  wasCorrect: boolean;
  /** New spaced repetition metadata after grading. */
  srsData: SrsData;
}

/** Aggregated metrics describing the drill run. */
interface DrillMetrics {
  correct: number;
  incorrect: number;
}

/** Shape describing the information tracked for each response. */
interface DrillResponse {
  itemId: string;
  quality: number;
  wasCorrect: boolean;
  srsData: SrsData;
}

/** Exposes the state and actions for running a drill session. */
export const useDrillSession = (config: DrillSessionConfig) => {
  const { items, loadBank, updateSrsData } = useBankStore(state => ({
    items: state.items,
    loadBank: state.loadBank,
    updateSrsData: state.updateSrsData,
  }));

  const [queue, setQueue] = useState<VocabItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [responses, setResponses] = useState<DrillResponse[]>([]);
  const [startedAt, setStartedAt] = useState<Date | null>(null);
  const [endedAt, setEndedAt] = useState<Date | null>(null);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (items.length === 0) {
      void loadBank();
    }
  }, [items.length, loadBank]);

  const orderedQueue = useMemo(() => {
    const selection = selectDrillQueue(items, {
      now: new Date(),
      limit: config.limit ?? items.length,
    });
    return selection.queue;
  }, [items, config.limit]);

  useEffect(() => {
    setQueue(orderedQueue);
    setCurrentIndex(0);
    setResponses([]);
    setStartedAt(null);
    setEndedAt(null);
    setIsComplete(orderedQueue.length === 0);
  }, [orderedQueue]);

  const currentItem = queue[currentIndex] ?? null;
  const totalCount = queue.length;

  const metrics: DrillMetrics = useMemo(() => {
    const correct = responses.filter(response => response.wasCorrect).length;
    const incorrect = responses.length - correct;
    return { correct, incorrect };
  }, [responses]);

  const logSessionIfComplete = async (nextResponses: DrillResponse[]) => {
    if (nextResponses.length !== queue.length) {
      return;
    }

    const start = startedAt ?? new Date();
    const end = new Date();

    const session: DrillSession = {
      id: nanoid(),
      vocabItemIds: queue.map(item => item.id),
      startedAt: start.toISOString(),
      endedAt: end.toISOString(),
      score: nextResponses.filter(r => r.wasCorrect).length / queue.length,
      correctCount: nextResponses.filter(r => r.wasCorrect).length,
      incorrectCount: nextResponses.filter(r => !r.wasCorrect).length,
    };

    await progressRepository.logSession(session);
    setEndedAt(end);
    setIsComplete(true);
  };

  const submitAnswer = async (submission: DrillSubmission): Promise<DrillEvaluation | null> => {
    const item = currentItem;
    if (!item || isComplete) {
      return null;
    }

    const reviewDate = new Date();
    if (!startedAt) {
      setStartedAt(reviewDate);
    }

    const review = calculateSm2Review({
      quality: submission.quality,
      reviewDate,
      previous: item.srsData ?? undefined,
    });

    const srsData: SrsData = {
      id: item.srsData?.id ?? nanoid(),
      algorithm: review.algorithm,
      easeFactor: review.easeFactor,
      intervalHours: review.intervalHours,
      streak: review.streak,
      dueAt: review.dueAt,
      lastReviewedAt: review.lastReviewedAt,
    };

    await updateSrsData(item.id, srsData);

    const wasCorrect = submission.quality >= 3;
    const nextResponses = [
      ...responses,
      {
        itemId: item.id,
        quality: submission.quality,
        wasCorrect,
        srsData,
      },
    ];

    setResponses(nextResponses);

    if (currentIndex + 1 >= queue.length) {
      await logSessionIfComplete(nextResponses);
    } else {
      setCurrentIndex(currentIndex + 1);
    }

    return {
      wasCorrect,
      srsData,
    };
  };

  const resetSession = () => {
    setCurrentIndex(0);
    setResponses([]);
    setStartedAt(null);
    setEndedAt(null);
    setIsComplete(queue.length === 0);
  };

  return {
    currentItem,
    currentIndex,
    totalCount,
    isComplete,
    metrics,
    startedAt,
    endedAt,
    answeredCount: responses.length,
    submitAnswer,
    resetSession,
  };
};

export type UseDrillSessionReturn = ReturnType<typeof useDrillSession>;
