export type FlashcardOutcome = 'correct' | 'incorrect';

export type FtxCard = {
  cardId: string;
  vocabId: string | null;
  term: string;
  definition: string;
  example: string | null;
  history: Array<{ outcome: FlashcardOutcome; timestamp: string }>;
  isFlagged: boolean;
};

export type FtxSession = {
  sessionId: string;
  profileId: string;
  targetLanguage: string;
  nativeLanguage: string;
  stylePreset: string;
  presentationSide: FlashcardPresentationSide;
  createdAt: string;
  cards: FtxCard[];
  progress: {
    currentIndex: number;
    isComplete: boolean;
    lastOpenedAt: string;
  } | null;
  recap: {
    correct: number;
    incorrect: number;
    total: number;
  } | null;
};

export type WordBankPane = 'words' | 'folders';

export type SortMode =
  | 'newest'
  | 'oldest'
  | 'alphabetical'
  | 'reverseAlphabetical'
  | 'dueSoon'
  | 'difficultyHigh'
  | 'difficultyLow';

export type UndoState = {
  message: string;
  actionLabel: string;
  onUndo: () => Promise<void>;
};

export type ReviewMode = 'review_only' | 'mixed' | 'new_only';

export type FlashcardPresentationSide = 'term' | 'definition';

export type ActivityOutcome = {
  activityType: 'recognition' | 'production';
  wasCorrect: boolean;
  attemptedAt: Date;
};
