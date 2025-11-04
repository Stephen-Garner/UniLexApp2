import { create } from 'zustand';

export interface MemoryEntry {
  id: string;
  prompt: string;
  response: string;
  summary: string;
  createdAt: string;
}

interface MemoryState {
  entries: MemoryEntry[];
  logUnderstanding: (payload: Omit<MemoryEntry, 'id' | 'createdAt'>) => MemoryEntry;
}

const generateId = () => `memory-${Math.random().toString(36).slice(2, 10)}`;

export const useMemoryStore = create<MemoryState>((set, get) => ({
  entries: [],
  logUnderstanding: ({ prompt, response, summary }) => {
    const entry = {
      id: generateId(),
      prompt,
      response,
      summary,
      createdAt: new Date().toISOString(),
    };
    set({ entries: [entry, ...get().entries] });
    return entry;
  },
}));
