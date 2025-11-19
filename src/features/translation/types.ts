import type { TtxItem, TtxItemHistory } from '@/contracts/models';
import type { EvaluationResult } from '@/domain/translation/evaluator';

export type AnalysisState = {
  item: TtxItem;
  learnerAnswer: string;
  evaluation: EvaluationResult;
  attempt: TtxItemHistory;
};

export type ReviewSummary = {
  accuracy: number;
  avgTimeSeconds: number;
  strengths: Array<{ prompt: string; insight: string; score: number }>;
  focusAreas: Array<{ prompt: string; insight: string; score: number }>;
};
