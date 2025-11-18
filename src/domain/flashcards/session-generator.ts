import { nanoid } from 'nanoid/non-secure';
import type {
  FtxCard,
  FtxSession,
  LanguageProfile,
  ReviewMode,
  VocabItem,
} from '../../contracts/models';
import { STYLE_PRESETS, type StylePresetKey } from '../translation/style-presets';
import { buildVocabSelection } from '../vocab/selectors';

export type FlashcardPresentationSide = 'term' | 'definition';

export type GenerateFlashcardSessionResult =
  | { type: 'ok'; session: FtxSession }
  | { type: 'empty'; message: string }
  | { type: 'insufficient'; message: string };

interface GenerateFlashcardSessionArgs {
  profile: LanguageProfile;
  bankItems: VocabItem[];
  reviewMode: ReviewMode;
  questionCount: number;
  topicTags: string[];
  stylePreset: StylePresetKey;
  presentationSide: FlashcardPresentationSide;
}

export const generateFlashcardSession = ({
  profile,
  bankItems,
  reviewMode,
  questionCount,
  topicTags,
  stylePreset,
  presentationSide,
}: GenerateFlashcardSessionArgs): GenerateFlashcardSessionResult => {
  const topic = topicTags[0];
  const selection = buildVocabSelection({
    reviewMode,
    questionCount,
    savedVocab: bankItems,
    targetLanguage: profile.targetLanguage,
    difficulty: profile.preferredDifficulty,
    topic,
  });

  if (selection.type !== 'ok') {
    return selection;
  }

  const prioritized = ensureLatestUnreviewed({
    items: selection.items,
    reviewMode,
    bankItems,
  });

  const stylised = styliseSyntheticItems({
    items: prioritized.slice(0, questionCount),
    stylePreset,
    difficulty: profile.preferredDifficulty,
    topic: topic ?? 'everyday life',
    targetLanguage: profile.targetLanguage,
  });

  const cards = stylised.map((item, index) => toFlashcard(item, index));

  const session: FtxSession = {
    sessionId: `ftx-${nanoid(10)}`,
    profileId: profile.profileId,
    nativeLanguage: profile.nativeLanguage,
    targetLanguage: profile.targetLanguage,
    targetRegion: profile.targetRegion,
    difficulty: profile.preferredDifficulty,
    reviewMode,
    questionCount: cards.length,
    topicTags,
    cards,
    createdAt: new Date().toISOString(),
    progress: {
      currentIndex: 0,
      isComplete: false,
    },
    presentationSide,
  };

  return { type: 'ok', session };
};

const ensureLatestUnreviewed = ({
  items,
  reviewMode,
  bankItems,
}: {
  items: VocabItem[];
  reviewMode: ReviewMode;
  bankItems: VocabItem[];
}): VocabItem[] => {
  if (reviewMode === 'review_only') {
    return items;
  }
  const latest = [...bankItems]
    .filter(vocab => !vocab.srsData?.lastReviewedAt)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

  if (!latest) {
    return items;
  }
  if (items.some(item => item.id === latest.id)) {
    return items;
  }
  if (items.length === 0) {
    return [latest];
  }

  const replacementIndex = items.findIndex(
    item => !item.srsData?.lastReviewedAt || item.id.startsWith('synthetic-'),
  );
  const next = [...items];
  if (replacementIndex >= 0) {
    next[replacementIndex] = latest;
    return next;
  }
  next[next.length - 1] = latest;
  return next;
};

const styliseSyntheticItems = ({
  items,
  stylePreset,
  difficulty,
  topic,
  targetLanguage,
}: {
  items: VocabItem[];
  stylePreset: StylePresetKey;
  difficulty: string;
  topic: string;
  targetLanguage: string;
}): VocabItem[] => {
  const toneDescriptor =
    stylePreset === 'formal' ? 'polite' : stylePreset === 'informal' ? 'colloquial' : 'natural';
  const cadence = STYLE_PRESETS[stylePreset]?.values || STYLE_PRESETS.balanced.values;

  return items.map((item, index) => {
    if (!item.id.startsWith('synthetic-')) {
      return item;
    }
    const nuance = cadence.idioms > 0.4 ? 'idiomatic' : 'core';
    return {
      ...item,
      term: `${targetLanguage.toUpperCase()} ${toneDescriptor} cue ${index + 1}`,
      meaning: `A ${difficulty} ${toneDescriptor} ${nuance} phrase about ${topic}.`,
      examples: [
        `(${toneDescriptor}) ${item.term} · Used while speaking about ${topic}.`,
        ...(item.examples ?? []).slice(0, 1),
      ],
    };
  });
};

const toFlashcard = (item: VocabItem, index: number): FtxCard => ({
  cardId: `${item.id}-${index}-${nanoid(6)}`,
  vocabId: item.id.startsWith('synthetic-') ? null : item.id,
  term: item.term,
  definition: item.meaning,
  example: item.examples[0] ?? null,
  isFlagged: false,
  history: [],
});
