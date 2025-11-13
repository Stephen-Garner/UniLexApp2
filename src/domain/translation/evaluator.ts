import type { TtxItem, TranslationPitfallType } from '../../contracts/models';

export type EvaluationResult = {
  score: number;
  feedback: string;
  errorTags: TranslationPitfallType[];
};

const normalise = (value: string) => value.trim().toLowerCase();

export const evaluateTranslationAnswer = (item: TtxItem, answer: string): EvaluationResult => {
  const normalizedAnswer = normalise(answer);
  const rubric = item.gradingRubric;
  const missing = rubric.mustInclude.filter(token => !normalizedAnswer.includes(token.toLowerCase()));
  const rejected = rubric.reject.find(token => normalizedAnswer.includes(token.toLowerCase()));

  let score = 0;
  if (rejected) {
    score = 0;
  } else if (missing.length === 0) {
    score = 1;
  } else {
    score = 0.5;
  }

  const errorTags: TranslationPitfallType[] = score === 1 ? [] : item.commonPitfalls.map(p => p.type);
  const bestMatch = item.expectedTranslations.find(expected =>
    normalizedAnswer.includes(normalise(expected.text)),
  );

  const feedback =
    score === 1
      ? 'Nice work! You captured the exact phrasing the tutor expected.'
      : bestMatch
          ? `Close! ${bestMatch.notes} — ${item.insightHook}`
          : `Review: ${item.insightHook}`;

  return {
    score,
    feedback,
    errorTags,
  };
};
