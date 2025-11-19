import { nanoid } from 'nanoid/non-secure';
import type { ReviewMode, VocabItem } from '@/contracts/models';

/** Generate a uuid, preserving an existing valid UUID when provided. */
export const ensureUuid = (value?: string | null): string => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (value && uuidRegex.test(value)) {
    return value;
  }
  const randomUuid = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto?.randomUUID;
  return randomUuid?.() ?? nanoid();
};

export type BuildVocabPoolArgs = {
  reviewMode: ReviewMode;
  questionCount: number;
  savedVocab: VocabItem[];
  targetLanguage: string;
  difficulty: string;
  topics: string;
};

export type BuildVocabPoolResult =
  | { type: 'ok'; items: VocabItem[] }
  | { type: 'empty'; message: string }
  | { type: 'insufficient'; message: string };

const createSyntheticVocab = (count: number, targetLanguage: string, difficulty: string, topic?: string): VocabItem[] =>
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
    } as VocabItem;
  });

export const buildVocabPool = ({
  reviewMode,
  questionCount,
  savedVocab,
  targetLanguage,
  difficulty,
  topics,
}: BuildVocabPoolArgs): BuildVocabPoolResult => {
  const topic = topics.split(',')[0]?.trim();
  const shuffledSaved = [...savedVocab];
  shuffledSaved.sort(() => Math.random() - 0.5);
  const unseen = shuffledSaved.filter(item => !item.srsData || !item.srsData.lastReviewedAt);
  const seen = shuffledSaved.filter(item => item.srsData?.lastReviewedAt);

  const pullFromBank = (source: VocabItem[], count: number, exclude: Set<string>) => {
    const picked: VocabItem[] = [];
    for (const entry of source) {
      if (picked.length >= count) {
        break;
      }
      if (exclude.has(entry.id)) {
        continue;
      }
      picked.push(entry);
      exclude.add(entry.id);
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
    const priorityPool = [...unseen, ...seen];
    const reviewItems = pullFromBank(priorityPool, half, used);
    const remaining = Math.max(questionCount - reviewItems.length, 0);
    const syntheticNeeded = Math.max(remaining - (priorityPool.length - reviewItems.length), 0);
    const additionalBank = pullFromBank(priorityPool, remaining - syntheticNeeded, used);
    const synthetic = syntheticNeeded
      ? createSyntheticVocab(syntheticNeeded, targetLanguage, difficulty, topic)
      : [];
    return { type: 'ok', items: [...reviewItems, ...additionalBank, ...synthetic] };
  }

  const used = new Set<string>();
  const newItems = pullFromBank(unseen, questionCount, used);
  if (newItems.length === questionCount) {
    return { type: 'ok', items: newItems };
  }
  const remainder = questionCount - newItems.length;
  const synthetic = createSyntheticVocab(remainder, targetLanguage, difficulty, topic);
  return { type: 'ok', items: [...newItems, ...synthetic] };
};
