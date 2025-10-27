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

/** Schema describing a vocabulary item available to learners. */
export const VocabItemSchema = z.object({
  /** Unique identifier for the vocabulary item. */
  id: z.string().uuid(),
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
  /** CEFR or user-defined difficulty level associated with the item. */
  level: z.string().min(1),
  /** Timestamp indicating when the vocabulary item was created. */
  createdAt: z.string().datetime(),
  /** Timestamp indicating when the vocabulary item was last updated. */
  updatedAt: z.string().datetime(),
  /** Spaced repetition scheduling information for the vocabulary item. */
  srsData: SrsDataSchema.optional(),
});

/** Type describing a vocabulary item available to learners. */
export type VocabItem = z.infer<typeof VocabItemSchema>;

/** Schema describing learner-authored notes for a vocabulary item. */
export const NativeNoteSchema = z.object({
  /** Unique identifier for the note. */
  id: z.string().uuid(),
  /** Identifier of the vocabulary item the note is attached to. */
  vocabItemId: z.string().uuid(),
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
