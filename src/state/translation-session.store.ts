import { create } from 'zustand';
import {
  TtxItemHistorySchema,
  type TtxItemHistory,
  type TtxRecap,
  TtxRecapSchema,
  type TtxSession,
  TtxSessionSchema,
} from '../contracts/models';
import { storageService } from '../services/storage-service';

const STORAGE_KEYS = {
  sessions: 'translationSessions.records.v1',
};

export interface TranslationSessionState {
  sessions: Record<string, TtxSession>;
  isLoaded: boolean;
  isLoading: boolean;
  error?: string;
  loadSessions: () => Promise<void>;
  saveSession: (session: TtxSession) => Promise<void>;
  appendHistory: (params: {
    sessionId: string;
    itemId: string;
    entry: TtxItemHistory;
  }) => Promise<void>;
  setRecap: (sessionId: string, recap: TtxRecap) => Promise<void>;
  setProgress: (sessionId: string, progress: TtxSession['progress']) => Promise<void>;
  toggleFlagged: (sessionId: string, itemId: string, flagged: boolean) => Promise<void>;
  markSessionOpened: (sessionId: string) => Promise<void>;
  removeSession: (sessionId: string) => Promise<void>;
  clearAll: () => Promise<void>;
}

const DEFAULT_STATE: Omit<
  TranslationSessionState,
  | 'loadSessions'
  | 'saveSession'
  | 'appendHistory'
  | 'setRecap'
  | 'removeSession'
  | 'clearAll'
  | 'setProgress'
  | 'toggleFlagged'
  | 'markSessionOpened'
> = {
  sessions: {},
  isLoaded: false,
  isLoading: false,
  error: undefined,
};

const hydrateSessions = (raw: unknown): Record<string, TtxSession> => {
  if (!raw || typeof raw !== 'object') {
    return {};
  }

  return Object.entries(raw as Record<string, unknown>).reduce<Record<string, TtxSession>>(
    (acc, [sessionId, value]) => {
      const parsed = TtxSessionSchema.safeParse(value);
      if (parsed.success) {
        acc[sessionId] = ensureProgressIntegrity(parsed.data);
      }
      return acc;
    },
    {},
  );
};

const persistSessions = async (sessions: Record<string, TtxSession>) => {
  await storageService.setItem(STORAGE_KEYS.sessions, sessions);
};

const sanitizeHistoryEntry = (entry: TtxItemHistory): TtxItemHistory => {
  const parsed = TtxItemHistorySchema.safeParse(entry);
  if (parsed.success) {
    return parsed.data;
  }
  throw new Error('Invalid translation history payload.');
};

const sanitizeRecap = (recap: TtxRecap): TtxRecap => {
  const parsed = TtxRecapSchema.safeParse(recap);
  if (parsed.success) {
    return parsed.data;
  }
  throw new Error('Invalid translation recap payload.');
};

const buildProgressFromItems = (session: TtxSession): TtxSession['progress'] => {
  const firstPendingIndex = session.items.findIndex(item => item.history.length === 0);
  const isComplete = firstPendingIndex === -1;
  const index = isComplete ? Math.max(session.items.length - 1, 0) : Math.max(firstPendingIndex, 0);
  return {
    currentIndex: index,
    isComplete,
    lastOpenedAt: new Date().toISOString(),
  };
};

const ensureProgressIntegrity = (session: TtxSession): TtxSession => {
  if (session.progress) {
    return session;
  }
  return {
    ...session,
    progress: buildProgressFromItems(session),
  };
};

export const useTranslationSessionStore = create<TranslationSessionState>((set, get) => ({
  ...DEFAULT_STATE,
  loadSessions: async () => {
    if (get().isLoaded || get().isLoading) {
      return;
    }

    set({ isLoading: true, error: undefined });
    try {
      const stored = await storageService.getItem<Record<string, TtxSession>>(STORAGE_KEYS.sessions);
      set({
        sessions: hydrateSessions(stored),
        isLoaded: true,
        isLoading: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load translation sessions.',
        isLoading: false,
      });
    }
  },
  saveSession: async session => {
    const parsed = ensureProgressIntegrity(TtxSessionSchema.parse(session));
    const snapshot = { ...get().sessions, [parsed.sessionId]: parsed };
    await persistSessions(snapshot);
    set({ sessions: snapshot });
  },
  appendHistory: async ({ sessionId, itemId, entry }) => {
    const session = get().sessions[sessionId];
    if (!session) {
      throw new Error(`Session ${sessionId} does not exist.`);
    }

    const historyEntry = sanitizeHistoryEntry(entry);
    const items = session.items.map(item => {
      if (item.itemId !== itemId) {
        return item;
      }
      return {
        ...item,
        history: [...item.history, historyEntry],
      };
    });

    const updatedSession: TtxSession = ensureProgressIntegrity({
      ...session,
      items,
    });

    const snapshot = { ...get().sessions, [sessionId]: updatedSession };
    await persistSessions(snapshot);
    set({ sessions: snapshot });
  },
  setRecap: async (sessionId, recap) => {
    const session = get().sessions[sessionId];
    if (!session) {
      throw new Error(`Session ${sessionId} does not exist.`);
    }

    const updatedSession: TtxSession = {
      ...session,
      recap: sanitizeRecap(recap),
    };

    const snapshot = { ...get().sessions, [sessionId]: updatedSession };
    await persistSessions(snapshot);
    set({ sessions: snapshot });
  },
  setProgress: async (sessionId, progress) => {
    const session = get().sessions[sessionId];
    if (!session) {
      throw new Error(`Session ${sessionId} does not exist.`);
    }
    const updatedSession: TtxSession = {
      ...session,
      progress,
    };
    const snapshot = { ...get().sessions, [sessionId]: updatedSession };
    await persistSessions(snapshot);
    set({ sessions: snapshot });
  },
  toggleFlagged: async (sessionId, itemId, flagged) => {
    const session = get().sessions[sessionId];
    if (!session) {
      throw new Error(`Session ${sessionId} does not exist.`);
    }
    const items = session.items.map(item =>
      item.itemId === itemId ? { ...item, isFlagged: flagged } : item,
    );
    const updatedSession: TtxSession = {
      ...session,
      items,
    };
    const snapshot = { ...get().sessions, [sessionId]: updatedSession };
    await persistSessions(snapshot);
    set({ sessions: snapshot });
  },
  markSessionOpened: async sessionId => {
    const session = get().sessions[sessionId];
    if (!session) {
      return;
    }
    const updatedSession: TtxSession = {
      ...session,
      progress: {
        ...session.progress,
        lastOpenedAt: new Date().toISOString(),
      },
    };
    const snapshot = { ...get().sessions, [sessionId]: updatedSession };
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

export const selectSessionsForProfile = (profileId: string): TtxSession[] => {
  const state = useTranslationSessionStore.getState();
  return Object.values(state.sessions).filter(session => session.profileId === profileId);
};
