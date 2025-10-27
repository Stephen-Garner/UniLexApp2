import { nanoid } from 'nanoid/non-secure';
import { create } from 'zustand';
import type { SrsData, VocabItem } from '../contracts/models';
import { bankRepository } from '../data/watermelon/bank-repository';

/** Represents a newly created vocabulary bank entry. */
export interface CreateBankItemInput {
  /** Primary vocabulary term to store. */
  term: string;
  /** Localised meaning associated with the term. */
  meaning: string;
  /** Optional pronunciation or reading guide. */
  reading?: string;
  /** Optional example sentences demonstrating the usage. */
  examples?: string[];
  /** Tags used to categorise the item. */
  tags?: string[];
  /** Difficulty level assigned to the item. */
  level?: string;
  /** Optional spaced repetition metadata. */
  srsData?: VocabItem['srsData'];
}

/** Zustand store describing the vocabulary bank UI state. */
interface BankState {
  /** Vocabulary items persisted in the bank. */
  items: VocabItem[];
  /** Search query supplied by the user. */
  query: string;
  /** Indicates whether a repository operation is in flight. */
  isLoading: boolean;
  /** Error message captured from the last operation, if any. */
  error?: string;
  /** Updates the search query used to filter the list. */
  setQuery: (value: string) => void;
  /** Loads the persisted vocabulary bank into memory. */
  loadBank: () => Promise<void>;
  /** Persists a new vocabulary entry and refreshes the store. */
  addBankItem: (input: CreateBankItemInput) => Promise<VocabItem>;
  /** Removes an existing vocabulary entry and refreshes the store. */
  removeBankItem: (id: string) => Promise<void>;
  /** Returns bank items filtered by the current query. */
  getFilteredItems: () => VocabItem[];
  /** Applies SRS metadata updates to a specific bank item. */
  updateSrsData: (itemId: string, data: SrsData) => Promise<void>;
}

const nowIso = () => new Date().toISOString();

const toVocabItem = (input: CreateBankItemInput): VocabItem => {
  const timestamp = nowIso();
  return {
    id: nanoid(),
    term: input.term,
    reading: input.reading,
    meaning: input.meaning,
    examples: input.examples ?? [],
    tags: input.tags ?? [],
    level: input.level ?? 'N/A',
    createdAt: timestamp,
    updatedAt: timestamp,
    srsData: input.srsData,
  };
};

export const useBankStore = create<BankState>((set, get) => ({
  items: [],
  query: '',
  isLoading: false,
  setQuery: value => set({ query: value }),
  loadBank: async () => {
    set({ isLoading: true, error: undefined });

    try {
      const collection = await bankRepository.listAllVocabItems();
      set({ items: collection, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load bank items.',
        isLoading: false,
      });
    }
  },
  addBankItem: async input => {
    set({ isLoading: true, error: undefined });
    const item = toVocabItem(input);

    try {
      await bankRepository.saveVocabItem(item);
      const nextItems = [...get().items.filter(existing => existing.id !== item.id), item];
      set({ items: nextItems, isLoading: false });
      return item;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to add item to bank.',
        isLoading: false,
      });
      throw error;
    }
  },
  removeBankItem: async id => {
    set({ isLoading: true, error: undefined });

    try {
      await bankRepository.deleteVocabItem(id);
      set({
        items: get().items.filter(item => item.id !== id),
        isLoading: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to remove bank item.',
        isLoading: false,
      });
      throw error;
    }
  },
  getFilteredItems: () => {
    const { items, query } = get();
    const trimmed = query.trim().toLowerCase();

    if (!trimmed) {
      return items.slice().sort((a, b) => a.term.localeCompare(b.term));
    }

    return items
      .filter(item => {
        const haystack = [item.term, item.meaning, item.reading, ...item.tags].join(' ');
        return haystack.toLowerCase().includes(trimmed);
      })
      .sort((a, b) => a.term.localeCompare(b.term));
  },
  updateSrsData: async (itemId, data) => {
    try {
      await bankRepository.updateSrsData(itemId, data);
      set({
        items: get().items.map(item =>
          item.id === itemId
            ? {
                ...item,
                srsData: data,
                updatedAt: data.lastReviewedAt ?? nowIso(),
              }
            : item,
        ),
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to update spaced repetition data.',
      });
      throw error;
    }
  },
}));
