import { nanoid } from 'nanoid/non-secure';
import { create } from 'zustand';
import type {
  SrsData,
  VocabItem,
  PerformanceData,
  VocabMetadata,
} from '../contracts/models';
import { bankRepository } from '../services/container';
import { updateVocabSrs, type ActivityOutcome } from '../domain/srs/unified-srs-service';

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
  /** Tags used to categorise the item. Mirrors folders for compatibility. */
  tags?: string[];
  /** Folders used to organise the item. */
  folders?: string[];
  /** Difficulty level assigned to the item. */
  level?: string;
  /** Optional spaced repetition metadata. */
  srsData?: VocabItem['srsData'];
  /** Optional metadata describing the vocabulary context. */
  metadata?: VocabMetadata;
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
  /** Clears the SRS metadata for the specified bank item. */
  clearSrsData: (itemId: string) => Promise<void>;
  /** Updates performance data for a specific bank item. */
  updatePerformanceData: (itemId: string, data: PerformanceData) => Promise<void>;
  /**
   * Updates both SRS and performance data based on an activity outcome.
   * This is the recommended method for tracking learning progress.
   */
  recordActivityOutcome: (itemId: string, outcome: ActivityOutcome) => Promise<void>;
  /** Replaces the tag list associated with a bank item. */
  updateTags: (itemId: string, tags: string[]) => Promise<void>;
  /** Replaces the folder list associated with a bank item. */
  updateFolders: (itemId: string, folders: string[]) => Promise<void>;
}

const nowIso = () => new Date().toISOString();

const normaliseList = (values?: string[]): string[] => {
  if (!values || values.length === 0) {
    return [];
  }
  const seen = new Set<string>();
  return values
    .map(value => value.trim())
    .filter(value => value.length > 0)
    .filter(value => {
      const key = value.toLowerCase();
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
};

const normaliseTerm = (value: string): string => value.trim().toLowerCase();

const syncFolders = (item: VocabItem, override?: string[]): VocabItem => {
  const combined = normaliseList(
    override ?? [...(item.folders ?? []), ...(item.tags ?? [])],
  );
  return {
    ...item,
    folders: combined,
    tags: combined,
  };
};

const dedupeByTerm = (items: VocabItem[]) => {
  const map = new Map<string, VocabItem>();
  const duplicates: VocabItem[] = [];

  items.forEach(item => {
    const key = normaliseTerm(item.term);
    const existing = map.get(key);
    if (!existing) {
      map.set(key, item);
      return;
    }

    const existingDate = new Date(existing.updatedAt).getTime();
    const candidateDate = new Date(item.updatedAt).getTime();

    if (candidateDate > existingDate) {
      duplicates.push(existing);
      map.set(key, item);
    } else {
      duplicates.push(item);
    }
  });

  return {
    unique: Array.from(map.values()),
    duplicates,
  };
};

const toVocabItem = (input: CreateBankItemInput): VocabItem => {
  const timestamp = nowIso();
  const folders = normaliseList([
    ...(input.folders ?? []),
    ...(input.tags ?? []),
  ]);
  return {
    id: nanoid(),
    term: input.term,
    reading: input.reading,
    meaning: input.meaning,
    examples: input.examples ?? [],
    tags: folders,
    folders,
    level: input.level ?? 'N/A',
    createdAt: timestamp,
    updatedAt: timestamp,
    srsData: input.srsData,
    metadata: input.metadata,
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
      const normalised = collection.map(entry => syncFolders(entry));
      const { unique, duplicates } = dedupeByTerm(normalised);
      set({ items: unique, isLoading: false });

      if (duplicates.length > 0) {
        Promise.allSettled(duplicates.map(item => bankRepository.deleteVocabItem(item.id))).catch(
          () => undefined,
        );
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load bank items.',
        isLoading: false,
      });
    }
  },
  addBankItem: async input => {
    set({ isLoading: true, error: undefined });
    const existing = get().items.find(
      item => normaliseTerm(item.term) === normaliseTerm(input.term),
    );
    if (existing) {
      set({ isLoading: false });
      return existing;
    }
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
        const haystack = [item.term, item.meaning, item.reading, ...item.tags, ...item.folders].join(' ');
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
        error: undefined,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to update spaced repetition data.',
      });
      throw error;
    }
  },
  clearSrsData: async itemId => {
    try {
      await bankRepository.clearSrsData(itemId);
      set({
        items: get().items.map(item =>
          item.id === itemId
            ? {
                ...item,
                srsData: undefined,
                updatedAt: nowIso(),
              }
            : item,
        ),
        error: undefined,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to clear spaced repetition data.',
      });
      throw error;
    }
  },
  updatePerformanceData: async (itemId, data) => {
    const target = get().items.find(item => item.id === itemId);
    if (!target) {
      set({ error: 'Vocabulary item not found.' });
      throw new Error('Item not found');
    }

    const updated: VocabItem = {
      ...target,
      performanceData: data,
      updatedAt: nowIso(),
    };

    try {
      await bankRepository.saveVocabItem(updated);
      set({
        items: get().items.map(item => (item.id === itemId ? updated : item)),
        error: undefined,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to update performance data.',
      });
      throw error;
    }
  },
  recordActivityOutcome: async (itemId, outcome) => {
    const target = get().items.find(item => item.id === itemId);
    if (!target) {
      set({ error: 'Vocabulary item not found.' });
      throw new Error('Item not found');
    }

    // Use unified SRS service to calculate updates
    const { srsData, performanceData } = updateVocabSrs(target, outcome);

    const updated: VocabItem = {
      ...target,
      srsData,
      performanceData,
      updatedAt: nowIso(),
    };

    try {
      await bankRepository.saveVocabItem(updated);
      set({
        items: get().items.map(item => (item.id === itemId ? updated : item)),
        error: undefined,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to record activity outcome.',
      });
      throw error;
    }
  },
  updateTags: async (itemId, tags) => get().updateFolders(itemId, tags),
  updateFolders: async (itemId, folders) => {
    const target = get().items.find(item => item.id === itemId);
    if (!target) {
      set({ error: 'Vocabulary item not found.' });
      throw new Error('Item not found');
    }

    const updated = syncFolders(
      {
        ...target,
        updatedAt: nowIso(),
      },
      folders,
    );

    try {
      await bankRepository.saveVocabItem(updated);
      set({
        items: get().items.map(item => (item.id === itemId ? updated : item)),
        error: undefined,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to update folders.',
      });
      throw error;
    }
  },
}));
