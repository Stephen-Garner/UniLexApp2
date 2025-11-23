import { create } from 'zustand';
import { storageService } from '../services/storage-service';

export type ActivityType = 'flashcard' | 'translation';

export type VocabActivityRecord = {
  id: string;
  vocabId: string;
  type: ActivityType;
  createdAt: string;
};

type VocabActivityState = {
  records: Record<string, VocabActivityRecord[]>;
  isLoaded: boolean;
  isLoading: boolean;
  loadRecords: () => Promise<void>;
  appendRecords: (vocabIds: string[], activityId: string, type: ActivityType) => Promise<void>;
};

const STORAGE_KEY = 'vocabActivity.records.v1';
const MAX_RECORDS_PER_WORD = 7;

export const useVocabActivityStore = create<VocabActivityState>((set, get) => ({
  records: {},
  isLoaded: false,
  isLoading: false,
  loadRecords: async () => {
    if (get().isLoaded || get().isLoading) {
      return;
    }
    set({ isLoading: true });
    try {
      const stored = (await storageService.getItem<Record<string, VocabActivityRecord[]>>(
        STORAGE_KEY,
      )) ?? {};
      set({ records: stored, isLoaded: true, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },
  appendRecords: async (vocabIds, activityId, type) => {
    const now = new Date().toISOString();
    const next = { ...get().records };

    vocabIds.forEach(vocabId => {
      const existing = next[vocabId] ?? [];
      const filtered = existing.filter(record => record.id !== activityId || record.type !== type);
      const updated: VocabActivityRecord[] = [
        { id: activityId, vocabId, type, createdAt: now },
        ...filtered,
      ].slice(0, MAX_RECORDS_PER_WORD);
      next[vocabId] = updated;
    });

    await storageService.setItem(STORAGE_KEY, next);
    set({ records: next });
  },
}));
