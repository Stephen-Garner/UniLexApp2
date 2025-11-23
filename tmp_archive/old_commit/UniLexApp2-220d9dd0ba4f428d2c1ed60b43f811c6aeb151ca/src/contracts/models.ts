import { z } from 'zod';

/** Schema describing spaced repetition metadata for a study item. */
export const SrsDataSchema = z.object({
  /** Unique identifier for the spaced repetition record. */
  id: z.string().uuid(),
  /** Name of the scheduling algorithm that produced the intervals. */
  algorithm: z.string().min(1),
  /** Number of consecutive successful reviews for the item. */
  streak: z.number().int().nonnegative(),
  /** Current review interval in hours. */
  intervalHours: z.number().nonnegative(),
  /** Ease factor that influences future interval growth. */
  easeFactor: z.number().positive(),
  /** ISO timestamp indicating when the next review is due. */
  dueAt: z.string().datetime(),
  /** ISO timestamp for the most recent completed review, if any. */
  lastReviewedAt: z.string().datetime().nullable(),
});

/** Type describing spaced repetition metadata for a study item. */
export type SrsData = z.infer<typeof SrsDataSchema>;

/** Schema describing performance tracking for recognition-based practice. */
export const RecognitionPerformanceSchema = z.object({
  /** Number of correct recognition attempts (e.g., flashcard correct swipes). */
  correctCount: z.number().int().nonnegative().default(0),
  /** Number of incorrect recognition attempts. */
  incorrectCount: z.number().int().nonnegative().default(0),
  /** Timestamp of the most recent recognition attempt. */
  lastAttemptAt: z.string().datetime().nullable().default(null),
});

/** Type describing recognition performance tracking. */
export type RecognitionPerformance = z.infer<typeof RecognitionPerformanceSchema>;

/** Schema describing performance tracking for production-based practice. */
export const ProductionPerformanceSchema = z.object({
  /** Number of correct production attempts (e.g., successful translations). */
  correctCount: z.number().int().nonnegative().default(0),
  /** Number of incorrect production attempts. */
  incorrectCount: z.number().int().nonnegative().default(0),
  /** Timestamp of the most recent production attempt. */
  lastAttemptAt: z.string().datetime().nullable().default(null),
});

/** Type describing production performance tracking. */
export type ProductionPerformance = z.infer<typeof ProductionPerformanceSchema>;

/** Schema describing combined performance data across activity types. */
export const PerformanceDataSchema = z.object({
  /** Recognition-based practice performance (e.g., flashcards). */
  recognition: RecognitionPerformanceSchema.default({
    correctCount: 0,
    incorrectCount: 0,
    lastAttemptAt: null,
  }),
  /** Production-based practice performance (e.g., translation). */
  production: ProductionPerformanceSchema.default({
    correctCount: 0,
    incorrectCount: 0,
    lastAttemptAt: null,
  }),
});

/** Type describing combined performance data across activity types. */
export type PerformanceData = z.infer<typeof PerformanceDataSchema>;

/** Formality level for vocabulary items. */
export const FormalityLevelSchema = z.enum([
  'formal',
  'neutral',
  'informal',
  'slang',
  'vulgar',
]);

/** Type describing formality level. */
export type FormalityLevel = z.infer<typeof FormalityLevelSchema>;

/** Register classification for vocabulary items. */
export const RegisterTypeSchema = z.enum([
  'literary',
  'standard',
  'colloquial',
  'vulgar',
]);

/** Type describing register classification. */
export type RegisterType = z.infer<typeof RegisterTypeSchema>;

/** Frequency classification for vocabulary items. */
export const FrequencyLevelSchema = z.enum(['common', 'uncommon', 'rare']);

/** Type describing frequency level. */
export type FrequencyLevel = z.infer<typeof FrequencyLevelSchema>;

/** Schema describing additional linguistic metadata for vocabulary items. */
export const VocabMetadataSchema = z.object({
  /** Formality level of the vocabulary item. */
  formality: FormalityLevelSchema.optional(),
  /** Register classification of the vocabulary item. */
  register: RegisterTypeSchema.optional(),
  /** Regional variant identifier (e.g., "mx", "es", "ar"). */
  region: z.string().min(2).max(8).optional(),
  /** Frequency classification of the vocabulary item. */
  frequency: FrequencyLevelSchema.optional(),
  /** Language profile identifier that owns this vocabulary item. */
  profileId: z.string().min(1).optional(),
  /** Source language code used when this entry was created. */
  sourceLanguage: z.string().min(2).max(8).optional(),
  /** Target language code used when this entry was created. */
  targetLanguage: z.string().min(2).max(8).optional(),
});

/** Type describing additional linguistic metadata. */
export type VocabMetadata = z.infer<typeof VocabMetadataSchema>;

/** Schema describing a vocabulary item available to learners. */
export const VocabItemSchema = z.object({
  /** Unique identifier for the vocabulary item. */
  id: z.string().min(1),
  /** Primary written form of the vocabulary item. */
  term: z.string().min(1),
  /** Pronunciation or reading for the vocabulary item. */
  reading: z.string().min(1).optional(),
  /** Learner-facing definition or gloss for the vocabulary item. */
  meaning: z.string().min(1),
  /** Example usages of the vocabulary item presented as full sentences. */
  examples: z.array(z.string().min(1)),
  /** Topical tags used to organize the vocabulary item. */
  tags: z.array(z.string().min(1)),
  /** Organisational folders the vocabulary item belongs to. */
  folders: z.array(z.string().min(1)).catch(() => []),
  /** CEFR or user-defined difficulty level associated with the item. */
  level: z.string().min(1),
  /** Timestamp indicating when the vocabulary item was created. */
  createdAt: z.string().datetime(),
  /** Timestamp indicating when the vocabulary item was last updated. */
  updatedAt: z.string().datetime(),
  /** Spaced repetition scheduling information for the vocabulary item. */
  srsData: SrsDataSchema.optional(),
  /** Performance tracking across recognition and production activities. */
  performanceData: PerformanceDataSchema.optional(),
  /** Additional linguistic metadata for the vocabulary item. */
  metadata: VocabMetadataSchema.optional(),
});

/** Type describing a vocabulary item available to learners. */
export type VocabItem = z.infer<typeof VocabItemSchema>;

/** Schema describing learner-authored notes for a vocabulary item. */
export const NativeNoteSchema = z.object({
  /** Unique identifier for the note. */
  id: z.string().uuid(),
  /** Identifier of the vocabulary item the note is attached to. */
  vocabItemId: z.string().uuid().nullable().optional(),
  /** Title summarising the note. */
  title: z.string().min(1),
  /** Free-form note content authored by the learner. */
  content: z.string().min(1),
  /** Language code representing the language used in the note. */
  sourceLanguage: z.string().min(2).max(8),
  /** Timestamp indicating when the note was created. */
  createdAt: z.string().datetime(),
  /** Timestamp indicating when the note was last updated. */
  updatedAt: z.string().datetime(),
  /** AI-generated or tutor-provided answer associated with the note, if any. */
  answer: z.string().min(1).nullable().optional(),
  /** Timestamp recording when the note received an answer, if any. */
  answeredAt: z.string().datetime().nullable().optional(),
  /** Identifier of the video the note references, if applicable. */
  videoId: z.string().min(1).optional(),
  /** Timestamp in seconds within the associated video, if applicable. */
  timestampSeconds: z.number().int().nonnegative().optional(),
});

/** Type describing learner-authored notes for a vocabulary item. */
export type NativeNote = z.infer<typeof NativeNoteSchema>;

/** Schema describing metadata for a supporting YouTube video. */
export const YouTubeVideoSchema = z.object({
  /** Unique identifier for the stored video record. */
  id: z.string().min(1),
  /** Human-readable title for the YouTube video. */
  title: z.string().min(1),
  /** Display name of the channel that published the video. */
  channelTitle: z.string().min(1),
  /** YouTube video identifier used for playback. */
  videoId: z.string().min(1),
  /** ISO 639 language code representing the video's primary language. */
  languageCode: z.string().min(2).max(8),
  /** Duration of the video in seconds. */
  durationSeconds: z.number().nonnegative(),
  /** Timestamp indicating when the video was published. */
  publishedAt: z.string().datetime(),
  /** HTTPS URL pointing to the video's thumbnail image. */
  thumbnailUrl: z.string().url(),
  /** Transcript content for the video, if available. */
  transcript: z.string().min(1).optional(),
});

/** Type describing metadata for a supporting YouTube video. */
export type YouTubeVideo = z.infer<typeof YouTubeVideoSchema>;

/** Schema describing a drill session completed by a learner. */
export const DrillSessionSchema = z.object({
  /** Unique identifier for the drill session. */
  id: z.string().uuid(),
  /** Ordered list of vocabulary item identifiers practiced in the session. */
  vocabItemIds: z.array(z.string().uuid()),
  /** Timestamp indicating when the session started. */
  startedAt: z.string().datetime(),
  /** Timestamp indicating when the session ended. */
  endedAt: z.string().datetime(),
  /** Score achieved during the session, normalized between 0 and 1. */
  score: z.number().min(0).max(1),
  /** Number of correct responses recorded in the session. */
  correctCount: z.number().int().nonnegative(),
  /** Number of incorrect responses recorded in the session. */
  incorrectCount: z.number().int().nonnegative(),
});

/** Type describing a drill session completed by a learner. */
export type DrillSession = z.infer<typeof DrillSessionSchema>;

/** Schema describing aggregate progress statistics for a learner. */
export const ProgressStatsSchema = z.object({
  /** Unique identifier for the learner the statistics belong to. */
  userId: z.string().uuid(),
  /** Total number of vocabulary items available to the learner. */
  totalVocabCount: z.number().int().nonnegative(),
  /** Number of vocabulary items the learner has marked as learned. */
  learnedVocabCount: z.number().int().nonnegative(),
  /** Number of vocabulary reviews currently due. */
  reviewDueCount: z.number().int().nonnegative(),
  /** Current streak length in days for consecutive study sessions. */
  streakDays: z.number().int().nonnegative(),
  /** Timestamp indicating when the learner last completed a session. */
  lastSessionAt: z.string().datetime().nullable(),
});

/** Type describing aggregate progress statistics for a learner. */
export type ProgressStats = z.infer<typeof ProgressStatsSchema>;

/** Supported translation tutor difficulty tiers. */
export const TranslationDifficultySchema = z.enum([
  'intro',
  'intermediate',
  'advanced',
  'expert',
]);

export type TranslationDifficulty = z.infer<typeof TranslationDifficultySchema>;

/** Schema describing learner-specific preferences per target language. */
export const LanguageProfileSchema = z.object({
  /** Generated key scoped to (user, target language, region). */
  profileId: z.string().min(1),
  /** Underlying learner identifier. */
  userId: z.string().min(1),
  /** ISO code for the learner's native language (UI + instructions). */
  nativeLanguage: z.string().min(2).max(8),
  /** ISO code for the active study language. */
  targetLanguage: z.string().min(2).max(8),
  /** Optional dialect/region code (e.g., es-mx, pt-br). */
  targetRegion: z.string().min(2).max(8).nullable().optional(),
  /** Preferred difficulty tier for new sessions. */
  preferredDifficulty: TranslationDifficultySchema,
  /** Default stylistic mix to seed generation prompts. */
  stylePreferences: z.object({
    slang: z.number().min(0).max(1),
    idioms: z.number().min(0).max(1),
    formal: z.number().min(0).max(1),
  }),
  /** Locally saved translation session identifiers. */
  savedSessions: z.array(z.string().min(1)),
  /** Spaced repetition state scoped to this language profile. */
  srsState: z.array(SrsDataSchema),
  /** Aggregated learner mistakes for targeting future prompts. */
  errorLedger: z.array(
    z.object({
      vocabId: z.string().min(1),
      errorTags: z.array(z.string().min(1)),
      count: z.number().int().nonnegative(),
    }),
  ),
  /** Asset key for rendering the flag icon on the home screen. */
  lastFlagAsset: z.string().min(1),
  /** Timestamp for the most recent profile update. */
  updatedAt: z.string().datetime(),
});

export type LanguageProfile = z.infer<typeof LanguageProfileSchema>;

/** Narrow typing for translation tutor style tags. */
export const TranslationStyleTagSchema = z.enum([
  'formal',
  'casual',
  'slang',
  'idiom',
  'business',
  'dialogue',
  'narrative',
]);

export type TranslationStyleTag = z.infer<typeof TranslationStyleTagSchema>;

/** Common root causes flagged during grading. */
export const TranslationPitfallTypeSchema = z.enum([
  'false_cognate',
  'gender',
  'aspect',
  'register',
  'agreement',
  'word_order',
  'politeness',
]);

export type TranslationPitfallType = z.infer<typeof TranslationPitfallTypeSchema>;

/** Modes for mixing review vs. new vocabulary. */
export const ReviewModeSchema = z.enum(['review_only', 'mixed', 'new_only']);
export type ReviewMode = z.infer<typeof ReviewModeSchema>;

/** Schema describing a single learner attempt within a translation item. */
export const TtxItemHistorySchema = z.object({
  attemptId: z.string().min(1),
  answer: z.string(),
  score: z.number().min(0).max(1),
  feedback: z.string(),
  errorTags: z.array(TranslationPitfallTypeSchema).default([]),
  gradedAt: z.string().datetime(),
});

export type TtxItemHistory = z.infer<typeof TtxItemHistorySchema>;

/** Schema describing the grading rubric and metadata for one prompt. */
export const TtxItemSchema = z.object({
  itemId: z.string().min(1),
  nativeText: z.string().min(1),
  context: z.string().max(280).optional(),
  styleTags: z.array(TranslationStyleTagSchema).default([]),
  expectedTranslations: z
    .array(
      z.object({
        text: z.string().min(1),
        register: z.string().min(1),
        notes: z.string().min(1),
      }),
    )
    .min(1),
  focusVocabIds: z.array(z.string().min(1)),
  commonPitfalls: z.array(
    z.object({
      type: TranslationPitfallTypeSchema,
      explanation: z.string().min(1),
    }),
  ),
  gradingRubric: z.object({
    mustInclude: z.array(z.string().min(1)).default([]),
    tolerate: z.array(z.string().min(1)).default([]),
    reject: z.array(z.string().min(1)).default([]),
  }),
  insightHook: z.string().min(1),
  history: z.array(TtxItemHistorySchema).default([]),
  isFlagged: z.boolean().default(false),
});

export type TtxItem = z.infer<typeof TtxItemSchema>;

/** Schema describing post-block analytics for a translation session. */
export const TtxRecapSchema = z.object({
  accuracy: z.number().min(0).max(1),
  durationsSeconds: z.array(z.number().nonnegative()),
  recommendedActions: z.array(z.string().min(1)).default([]),
  srsQueue: z.array(
    z.object({
      vocabId: z.string().min(1),
      dueAt: z.string().datetime(),
    }),
  ),
});

export type TtxRecap = z.infer<typeof TtxRecapSchema>;

export const TtxSessionProgressSchema = z.object({
  currentIndex: z.number().int().min(0),
  isComplete: z.boolean(),
  lastOpenedAt: z.string().datetime().optional(),
});

export type TtxSessionProgress = z.infer<typeof TtxSessionProgressSchema>;

/** Schema describing a 10-question translation tutor batch. */
export const TtxSessionSchema = z.object({
  sessionId: z.string().min(1),
  profileId: z.string().min(1),
  nativeLanguage: z.string().min(2).max(8),
  targetLanguage: z.string().min(2).max(8),
  targetRegion: z.string().min(2).max(8).nullable().optional(),
  difficulty: TranslationDifficultySchema,
  styleMix: z.object({
    formal: z.number().min(0).max(1),
    slang: z.number().min(0).max(1),
    idioms: z.number().min(0).max(1),
  }),
  reviewMode: ReviewModeSchema,
  questionCount: z.number().int().min(5).max(25),
  topicTags: z.array(z.string().min(1)).default([]),
  vocabPool: z.array(VocabItemSchema),
  createdAt: z.string().datetime(),
  model: z.string().min(1),
  items: z.array(TtxItemSchema).min(1),
  recap: TtxRecapSchema.nullable().optional(),
  progress: TtxSessionProgressSchema,
});

export type TtxSession = z.infer<typeof TtxSessionSchema>;

/** Swipe outcomes for flashcard training. */
export const FlashcardOutcomeSchema = z.enum(['correct', 'incorrect']);

export type FlashcardOutcome = z.infer<typeof FlashcardOutcomeSchema>;

export const FlashcardHistorySchema = z.object({
  attemptId: z.string().min(1),
  outcome: FlashcardOutcomeSchema,
  timestamp: z.string().datetime(),
});

export type FlashcardHistory = z.infer<typeof FlashcardHistorySchema>;

export const FlashcardPresentationSideSchema = z.enum(['term', 'definition']);

export type FlashcardPresentationSide = z.infer<typeof FlashcardPresentationSideSchema>;

export const FtxCardSchema = z.object({
  cardId: z.string().min(1),
  vocabId: z.string().min(1).nullable(),
  term: z.string().min(1),
  definition: z.string().min(1),
  example: z.string().min(1).nullable().optional(),
  isFlagged: z.boolean().default(false),
  history: z.array(FlashcardHistorySchema).default([]),
});

export type FtxCard = z.infer<typeof FtxCardSchema>;

export const FtxRecapSchema = z.object({
  accuracy: z.number().min(0).max(1),
  correctCount: z.number().int().nonnegative(),
  incorrectCount: z.number().int().nonnegative(),
  flaggedCardIds: z.array(z.string().min(1)).default([]),
  srsQueue: z.array(
    z.object({
      vocabId: z.string().min(1),
      dueAt: z.string().datetime(),
    }),
  ),
});

export type FtxRecap = z.infer<typeof FtxRecapSchema>;

export const FtxSessionSchema = z.object({
  sessionId: z.string().min(1),
  profileId: z.string().min(1),
  nativeLanguage: z.string().min(2).max(8),
  targetLanguage: z.string().min(2).max(8),
  targetRegion: z.string().min(2).max(8).nullable().optional(),
  difficulty: TranslationDifficultySchema,
  reviewMode: ReviewModeSchema,
  questionCount: z.number().int().min(5).max(50),
  topicTags: z.array(z.string().min(1)).default([]),
  cards: z.array(FtxCardSchema).min(1),
  createdAt: z.string().datetime(),
  progress: TtxSessionProgressSchema,
  recap: FtxRecapSchema.nullable().optional(),
  presentationSide: FlashcardPresentationSideSchema.default('term'),
});

export type FtxSession = z.infer<typeof FtxSessionSchema>;
