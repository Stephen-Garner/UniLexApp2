import type { ReviewMode, VocabItem } from '../../contracts/models';

export type VocabSelectionResult =
  | { type: 'ok'; items: VocabItem[] }
  | { type: 'empty'; message: string }
  | { type: 'insufficient'; message: string };

type BuildParams = {
  reviewMode: ReviewMode;
  questionCount: number;
  savedVocab: VocabItem[];
  targetLanguage: string;
  difficulty: string;
  topic?: string;
};

export const buildVocabSelection = ({
  reviewMode,
  questionCount,
  savedVocab,
  targetLanguage,
  difficulty,
  topic,
}: BuildParams): VocabSelectionResult => {
  const shuffled = shuffleItems(savedVocab);
  const unseen = shuffled.filter(item => !item.srsData || !item.srsData.lastReviewedAt);
  const seen = shuffled.filter(item => item.srsData?.lastReviewedAt);

  const pullFromBank = (source: VocabItem[], count: number, used: Set<string>) => {
    const picked: VocabItem[] = [];
    for (const item of source) {
      if (picked.length >= count) {
        break;
      }
      if (used.has(item.id)) {
        continue;
      }
      picked.push(item);
      used.add(item.id);
    }
    return picked;
  };

  if (reviewMode === 'review_only') {
    if (savedVocab.length === 0) {
      return {
        type: 'empty',
        message: 'No saved vocabulary yet. Add words to your bank or switch to new vocabulary.',
      };
    }
    const ordered = [...unseen, ...seen];
    if (ordered.length < questionCount) {
      return {
        type: 'insufficient',
        message: `Only ${ordered.length} saved items available. Reduce question count or add more words.`,
      };
    }
    return { type: 'ok', items: ordered.slice(0, questionCount) };
  }

  if (reviewMode === 'mixed') {
    const half = Math.max(1, Math.floor(questionCount / 2));
    const used = new Set<string>();
    const pool = [...unseen, ...seen];
    const reviewItems = pullFromBank(pool, half, used);
    const remaining = Math.max(questionCount - reviewItems.length, 0);
    const bankFill = pullFromBank(pool, remaining, used);
    if (reviewItems.length + bankFill.length === questionCount) {
      return { type: 'ok', items: [...reviewItems, ...bankFill] };
    }
    const syntheticNeeded = questionCount - (reviewItems.length + bankFill.length);
    const synthetic = createSyntheticVocab(syntheticNeeded, { targetLanguage, difficulty, topic });
    return { type: 'ok', items: [...reviewItems, ...bankFill, ...synthetic] };
  }

  const used = new Set<string>();
  const newItems = pullFromBank(unseen, questionCount, used);
  if (newItems.length === questionCount) {
    return { type: 'ok', items: newItems };
  }
  const synthetic = createSyntheticVocab(questionCount - newItems.length, {
    targetLanguage,
    difficulty,
    topic,
  });
  return { type: 'ok', items: [...newItems, ...synthetic] };
};

export const createSyntheticVocab = (
  count: number,
  {
    targetLanguage,
    difficulty,
    topic,
  }: { targetLanguage: string; difficulty: string; topic?: string },
): VocabItem[] =>
  Array.from({ length: count }).map((_, index) => {
    const id = `synthetic-${targetLanguage}-${Date.now()}-${index}`;
    const label = topic ? `${topic} idiom ${index + 1}` : `Conversation piece ${index + 1}`;
    return {
      id,
      term: `${targetLanguage.toUpperCase()} phrase ${index + 1}`,
      reading: undefined,
      meaning: `AI generated expression about ${label}`,
      examples: [`Contextual example involving ${label}.`],
      tags: [difficulty],
      folders: [],
      level: difficulty,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      srsData: undefined,
    };
  });

const shuffleItems = <T,>(items: T[]): T[] => {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};
