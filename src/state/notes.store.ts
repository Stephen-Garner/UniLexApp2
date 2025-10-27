import { create } from 'zustand';
import type { NativeNote } from '../contracts/models';
import { notesRepository } from '../services/container';

/** Input payload required to create a new note. */
export interface CreateNoteInput {
  /** Identifier of the related vocabulary item. */
  vocabItemId: string;
  /** Language code describing the source language for the note. */
  sourceLanguage: string;
  /** Body content for the note. */
  content: string;
  /** Optional answer content associated with the note. */
  answer?: string | null;
  /** Identifier of the associated video, if the note references one. */
  videoId?: string;
  /** Timestamp in seconds within the associated video. */
  timestampSeconds?: number;
}

/** Zustand store describing note state and operations. */
interface NotesState {
  /** All notes loaded into memory. */
  notes: NativeNote[];
  /** Search query used to filter notes. */
  query: string;
  /** Vocabulary item filter applied to the note list. */
  vocabItemFilter?: string;
  /** Video filter applied to the note list. */
  videoFilter?: string;
  /** Whether only unanswered notes should be shown. */
  unansweredOnly: boolean;
  /** Indicates an asynchronous operation is in progress. */
  isLoading: boolean;
  /** Error captured from the last operation, if any. */
  error?: string;
  /** Updates the search query used for filtering. */
  setQuery: (value: string) => void;
  /** Updates the vocabulary item filter. */
  setVocabItemFilter: (value?: string) => void;
  /** Updates the linked video filter. */
  setVideoFilter: (value?: string) => void;
  /** Toggles whether only unanswered notes are returned. */
  setUnansweredOnly: (value: boolean) => void;
  /** Loads notes from persistence into memory. */
  loadNotes: () => Promise<void>;
  /** Persists a new note and adds it to the local state. */
  createNote: (input: CreateNoteInput) => Promise<NativeNote>;
  /** Updates note content in persistence. */
  updateNoteContent: (noteId: string, content: string) => Promise<void>;
  /** Removes a note from persistence and local state. */
  deleteNote: (noteId: string) => Promise<void>;
  /** Returns notes filtered by the current query and filters. */
  getFilteredNotes: () => NativeNote[];
  /** Retrieves a note by identifier from local state. */
  findNote: (noteId: string) => NativeNote | undefined;
}

const generateNoteId = () => {
  const scope = globalThis as unknown as {
    crypto?: { randomUUID?: () => string };
  };

  const randomUUID = scope.crypto?.randomUUID;
  return randomUUID ? randomUUID() : `note-${Math.random().toString(36).slice(2)}`;
};

const createNotePayload = (input: CreateNoteInput): NativeNote => {
  const timestamp = new Date().toISOString();
  const id = generateNoteId();

  return {
    id,
    vocabItemId: input.vocabItemId,
    content: input.content,
    sourceLanguage: input.sourceLanguage,
    createdAt: timestamp,
    updatedAt: timestamp,
    answer: input.answer ?? undefined,
    answeredAt: input.answer ? timestamp : undefined,
    videoId: input.videoId,
    timestampSeconds: input.timestampSeconds,
  };
};

export const useNotesStore = create<NotesState>((set, get) => ({
  notes: [],
  query: '',
  vocabItemFilter: undefined,
  videoFilter: undefined,
  unansweredOnly: false,
  isLoading: false,
  setQuery: value => set({ query: value }),
  setVocabItemFilter: value => set({ vocabItemFilter: value }),
  setVideoFilter: value => set({ videoFilter: value }),
  setUnansweredOnly: value => set({ unansweredOnly: value }),
  loadNotes: async () => {
    set({ isLoading: true, error: undefined });
    try {
      const notes = await notesRepository.listAllNotes();
      set({ notes, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load notes.',
        isLoading: false,
      });
    }
  },
  createNote: async input => {
    set({ isLoading: true, error: undefined });
    const note = createNotePayload(input);

    try {
      await notesRepository.createNote(note);
      set({ notes: [note, ...get().notes], isLoading: false });
      return note;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to create note.',
        isLoading: false,
      });
      throw error;
    }
  },
  updateNoteContent: async (noteId, content) => {
    set({ isLoading: true, error: undefined });
    try {
      await notesRepository.updateNoteContent(noteId, content);
      const timestamp = new Date().toISOString();
      set({
        notes: get().notes.map(note =>
          note.id === noteId
            ? {
                ...note,
                content,
                updatedAt: timestamp,
              }
            : note,
        ),
        isLoading: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to update note.',
        isLoading: false,
      });
      throw error;
    }
  },
  deleteNote: async noteId => {
    set({ isLoading: true, error: undefined });
    try {
      await notesRepository.deleteNote(noteId);
      set({
        notes: get().notes.filter(note => note.id !== noteId),
        isLoading: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to delete note.',
        isLoading: false,
      });
      throw error;
    }
  },
  getFilteredNotes: () => {
    const { notes, query, vocabItemFilter, videoFilter, unansweredOnly } = get();
    const normalizedQuery = query.trim().toLowerCase();

    return notes
      .filter(note => {
        if (vocabItemFilter && note.vocabItemId !== vocabItemFilter) {
          return false;
        }
        if (videoFilter && note.videoId !== videoFilter) {
          return false;
        }
        if (unansweredOnly && note.answer) {
          return false;
        }
        if (!normalizedQuery) {
          return true;
        }
        return [note.content, note.answer, note.videoId]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(normalizedQuery);
      })
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  },
  findNote: noteId => get().notes.find(note => note.id === noteId),
}));
