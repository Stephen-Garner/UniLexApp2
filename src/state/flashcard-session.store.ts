import { create } from 'zustand';
import {
  FtxCard,
  FtxRecap,
  FtxRecapSchema,
  FtxSession,
  FtxSessionSchema,
  FlashcardHistorySchema,
  type FlashcardHistory,
} from '../contracts/models';
import { storageService } from '../services/storage-service';

const STORAGE_KEYS = {
  sessions: 'flashcardSessions.records.v1',
};

export interface FlashcardSessionState {
  sessions: Record<string, FtxSession>;
  isLoaded: boolean;
  isLoading: boolean;
  error?: string;
  loadSessions: () => Promise<void>;
  saveSession: (session: FtxSession) => Promise<void>;
  appendHistory: (params: {
    sessionId: string;
    cardId: string;
    outcome: 'correct' | 'incorrect';
  }) => Promise<void>;
  popHistory: (params: { sessionId: string; cardId: string }) => Promise<FlashcardHistory | null>;
  toggleFlagged: (sessionId: string, cardId: string, flagged: boolean) => Promise<void>;
  setProgress: (sessionId: string, progress: FtxSession['progress']) => Promise<void>;
  setRecap: (sessionId: string, recap: FtxRecap | null) => Promise<void>;
  markSessionOpened: (sessionId: string) => Promise<void>;
  removeSession: (sessionId: string) => Promise<void>;
  clearAll: () => Promise<void>;
}

const DEFAULT_STATE: Omit<
  FlashcardSessionState,
  | 'loadSessions'
  | 'saveSession'
  | 'appendHistory'
  | 'toggleFlagged'
  | 'popHistory'
  | 'setProgress'
  | 'setRecap'
  | 'markSessionOpened'
  | 'removeSession'
  | 'clearAll'
> = {
  sessions: {},
  isLoaded: false,
  isLoading: false,
  error: undefined,
};

const hydrateSessions = (raw: unknown): Record<string, FtxSession> => {
  if (!raw || typeof raw !== 'object') {
    return {};
  }
  return Object.entries(raw as Record<string, unknown>).reduce<Record<string, FtxSession>>(
    (acc, [sessionId, value]) => {
      const parsed = FtxSessionSchema.safeParse(value);
      if (parsed.success) {
        acc[sessionId] = parsed.data;
      }
      return acc;
    },
    {},
  );
};

const persistSessions = async (sessions: Record<string, FtxSession>) => {
  await storageService.setItem(STORAGE_KEYS.sessions, sessions);
};

export const useFlashcardSessionStore = create<FlashcardSessionState>((set, get) => ({
  ...DEFAULT_STATE,
  loadSessions: async () => {
    if (get().isLoaded || get().isLoading) {
      return;
    }
    set({ isLoading: true, error: undefined });
    try {
      const stored = await storageService.getItem<Record<string, FtxSession>>(STORAGE_KEYS.sessions);
      set({
        sessions: hydrateSessions(stored),
        isLoaded: true,
        isLoading: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load flashcard sessions.',
        isLoading: false,
      });
    }
  },
  saveSession: async session => {
    const parsed = FtxSessionSchema.parse(session);
    const snapshot = { ...get().sessions, [parsed.sessionId]: parsed };
    await persistSessions(snapshot);
    set({ sessions: snapshot });
  },
  appendHistory: async ({ sessionId, cardId, outcome }) => {
    const session = get().sessions[sessionId];
    if (!session) {
      throw new Error(`Session ${sessionId} does not exist.`);
    }
    const cards = session.cards.map(card => {
      if (card.cardId !== cardId) {
        return card;
      }
      const historyEntry = FlashcardHistorySchema.parse({
        attemptId: `${card.cardId}-${Date.now()}`,
        outcome,
        timestamp: new Date().toISOString(),
      });
      return {
        ...card,
        history: [...card.history, historyEntry],
      } satisfies FtxCard;
    });
    const updated: FtxSession = {
      ...session,
      cards,
    };
    const snapshot = { ...get().sessions, [sessionId]: updated };
    await persistSessions(snapshot);
    set({ sessions: snapshot });
  },
  toggleFlagged: async (sessionId, cardId, flagged) => {
    const session = get().sessions[sessionId];
    if (!session) {
      throw new Error(`Session ${sessionId} does not exist.`);
    }
    const cards = session.cards.map(card =>
      card.cardId === cardId ? { ...card, isFlagged: flagged } : card,
    );
    const snapshot = { ...get().sessions, [sessionId]: { ...session, cards } };
    await persistSessions(snapshot);
    set({ sessions: snapshot });
  },
  setProgress: async (sessionId, progress) => {
    const session = get().sessions[sessionId];
    if (!session) {
      throw new Error(`Session ${sessionId} does not exist.`);
    }
    const snapshot = { ...get().sessions, [sessionId]: { ...session, progress } };
    await persistSessions(snapshot);
    set({ sessions: snapshot });
  },
  setRecap: async (sessionId, recap) => {
    const session = get().sessions[sessionId];
    if (!session) {
      throw new Error(`Session ${sessionId} does not exist.`);
    }
    const nextRecap = recap === null ? null : FtxRecapSchema.parse(recap);
    const snapshot = { ...get().sessions, [sessionId]: { ...session, recap: nextRecap } };
    await persistSessions(snapshot);
    set({ sessions: snapshot });
  },
  popHistory: async ({ sessionId, cardId }) => {
    const session = get().sessions[sessionId];
    if (!session) {
      throw new Error(`Session ${sessionId} does not exist.`);
    }
    const cards = session.cards.map(card => {
      if (card.cardId !== cardId) {
        return card;
      }
      if (card.history.length === 0) {
        return card;
      }
      return {
        ...card,
        history: card.history.slice(0, -1),
      } satisfies FtxCard;
    });
    const removed = session.cards
      .find(card => card.cardId === cardId)
      ?.history.slice(-1)[0] as FlashcardHistory | undefined;
    const snapshot = { ...get().sessions, [sessionId]: { ...session, cards } };
    await persistSessions(snapshot);
    set({ sessions: snapshot });
    return removed ?? null;
  },
  markSessionOpened: async sessionId => {
    const session = get().sessions[sessionId];
    if (!session) {
      return;
    }
    const snapshot = {
      ...get().sessions,
      [sessionId]: {
        ...session,
        progress: {
          ...session.progress,
          lastOpenedAt: new Date().toISOString(),
        },
      },
    };
    await persistSessions(snapshot);
    set({ sessions: snapshot });
  },
  removeSession: async sessionId => {
    const sessions = { ...get().sessions };
    if (!sessions[sessionId]) {
      return;
    }
    delete sessions[sessionId];
    await persistSessions(sessions);
    set({ sessions });
  },
  clearAll: async () => {
    await storageService.removeItem(STORAGE_KEYS.sessions);
    set({ ...DEFAULT_STATE });
  },
}));

export const selectFlashcardSessionsForProfile = (profileId: string): FtxSession[] => {
  const state = useFlashcardSessionStore.getState();
  return Object.values(state.sessions).filter(session => session.profileId === profileId);
};
