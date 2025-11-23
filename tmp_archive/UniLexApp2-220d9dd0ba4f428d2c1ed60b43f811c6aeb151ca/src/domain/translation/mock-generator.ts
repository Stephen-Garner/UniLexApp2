import { nanoid } from 'nanoid/non-secure';
import type {
  LanguageProfile,
  ReviewMode,
  TtxItem,
  TtxSession,
  VocabItem,
  TranslationStyleTag,
  TtxSessionProgress,
} from '../../contracts/models';

type RuntimeCrypto = {
  randomUUID?: () => string;
};

const runtimeCrypto: RuntimeCrypto | undefined =
  typeof globalThis !== 'undefined'
    ? (globalThis as typeof globalThis & { crypto?: RuntimeCrypto }).crypto
    : undefined;

const generateId = () => (runtimeCrypto?.randomUUID ? runtimeCrypto.randomUUID() : nanoid());

type StyleMix = {
  formal: number;
  slang: number;
  idioms: number;
};

type GenerateSessionParams = {
  profile: LanguageProfile;
  vocabPool: VocabItem[];
  styleMix: StyleMix;
  topicTags?: string[];
  reviewMode: ReviewMode;
  questionCount: number;
};

const pickStyleTags = (index: number, mix: StyleMix): TranslationStyleTag[] => {
  const tags: TranslationStyleTag[] = [];
  if (mix.formal >= 0.4 && index % 3 === 0) {
    tags.push('formal');
  }
  if (mix.slang >= 0.25 && index % 2 === 0) {
    tags.push('slang');
  }
  if (mix.idioms >= 0.25 && index % 4 === 0) {
    tags.push('idiom');
  }
  if (tags.length === 0) {
    tags.push('casual');
  }
  if (index % 3 === 1) {
    tags.push('dialogue');
  }
  return Array.from(new Set(tags));
};

const buildNativePrompt = (
  vocab: VocabItem,
  profile: LanguageProfile,
  tags: TranslationStyleTag[],
): { nativeText: string; context: string } => {
  const baseMeaning = vocab.meaning.split(/[.;]/)[0]?.trim() ?? vocab.meaning;
  const contextTag = tags.includes('slang') ? 'street meetup' : 'daily routine';
  const dialogue =
    tags.includes('dialogue') && tags.includes('slang')
      ? `Roommate: "Can you loan me some cash? I'm totally broke."\nYou: Respond using a ${profile.targetLanguage.toUpperCase()} phrase with ${vocab.term}.`
      : undefined;

  if (dialogue) {
    return {
      nativeText: dialogue,
      context: 'Two friends chatting with casual slang.',
    };
  }

  return {
    nativeText: `Translate into ${profile.targetLanguage.toUpperCase()}: "I need to remember how to say ${baseMeaning} when talking to a local."`,
    context: `Keep the tone ${contextTag}. Include ${vocab.term} explicitly.`,
  };
};

const buildRubric = (vocab: VocabItem) => ({
  mustInclude: [vocab.term.toLowerCase()],
  tolerate: vocab.examples?.slice(0, 1) ?? [],
  reject: [],
});

const buildPitfalls = (index: number) => {
  const options = [
    {
      type: 'false_cognate' as const,
      explanation: 'Avoid English look-alikes that change meaning in the target language.',
    },
    {
      type: 'register' as const,
      explanation: 'Match the tone (formal vs. slang) requested in the prompt.',
    },
    {
      type: 'gender' as const,
      explanation: 'Double-check noun gender and adjective agreement.',
    },
  ];
  return [options[index % options.length]];
};

const buildExpected = (vocab: VocabItem) => [
  {
    text: vocab.term,
    register: 'neutral',
    notes: 'Direct translation using the saved vocabulary term.',
  },
  {
    text: `${vocab.term} ${vocab.examples?.[0] ?? ''}`.trim(),
    register: 'casual',
    notes: 'Alternate phrasing that still features the anchor term.',
  },
];

export const generateMockTranslationSession = ({
  profile,
  vocabPool,
  styleMix,
  topicTags = [],
  reviewMode,
  questionCount,
}: GenerateSessionParams): TtxSession => {
  const sessionId = generateId();
  const timestamp = new Date().toISOString();
  const pool = vocabPool.length > 0 ? vocabPool : createFallbackVocabPool(questionCount);

  const items: TtxItem[] = Array.from({ length: questionCount }).map((_, index) => {
    const vocab = pool[index % pool.length];
    const tags = pickStyleTags(index, styleMix);
    const { nativeText, context } = buildNativePrompt(vocab, profile, tags);

    return {
      itemId: `${sessionId}-item-${index}`,
      nativeText,
      context,
      styleTags: tags,
      expectedTranslations: buildExpected(vocab),
      focusVocabIds: [vocab.id],
      commonPitfalls: buildPitfalls(index),
      gradingRubric: buildRubric(vocab),
      insightHook: `Remind the learner why "${vocab.term}" is the precise fit for "${vocab.meaning}".`,
      history: [],
      isFlagged: false,
    };
  });

  return {
    sessionId,
    profileId: profile.profileId,
    nativeLanguage: profile.nativeLanguage,
    targetLanguage: profile.targetLanguage,
    targetRegion: profile.targetRegion ?? null,
    difficulty: profile.preferredDifficulty,
    styleMix,
    topicTags,
    vocabPool: pool,
    createdAt: timestamp,
    model: 'mock-local',
    items,
    recap: null,
    reviewMode,
    questionCount,
    progress: buildInitialProgress(questionCount),
  };
};

const createFallbackVocabPool = (count: number): VocabItem[] =>
  Array.from({ length: Math.max(5, count) }).map((_, index) => ({
    id: generateId(),
    term: ['hola', 'gracias', 'perdón', 'amigo', 'familia'][index] ?? `term-${index}`,
    reading: undefined,
    meaning: ['hello', 'thanks', 'sorry', 'friend', 'family'][index] ?? 'phrase',
    examples: [],
    tags: [],
    folders: [],
    level: 'N/A',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    srsData: undefined,
  }));

const buildInitialProgress = (questionCount: number): TtxSessionProgress => ({
  currentIndex: 0,
  isComplete: questionCount === 0,
  lastOpenedAt: new Date().toISOString(),
});
