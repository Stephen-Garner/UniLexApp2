import { create } from 'zustand';
import type { NativeNote } from '../contracts/models';
import { notesRepository } from '../services/container';

/** Input payload required to create a new note. */
export interface CreateNoteInput {
  /** Short title describing the note. */
  title: string;
  /** Body content for the note. */
  content: string;
  /** Identifier of the related vocabulary item, if any. */
  vocabItemId?: string;
  /** Language code describing the source language for the note. */
  sourceLanguage?: string;
  /** Optional answer content associated with the note. */
  answer?: string | null;
  /** Identifier of the associated video, if the note references one. */
  videoId?: string;
  /** Timestamp in seconds within the associated video. */
  timestampSeconds?: number;
}

export interface UpdateNotePayload {
  /** Replacement note title authored by the learner. */
  title: string;
  /** Replacement note content authored by the learner. */
  content: string;
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
  updateNoteContent: (noteId: string, payload: UpdateNotePayload) => Promise<void>;
  /** Updates the answered status metadata for a note. */
  setNoteAnswered: (noteId: string, answered: boolean) => Promise<void>;
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

const buildUntitledTitle = (index: number | null): string =>
  index == null || index < 1 ? 'Untitled note' : `Untitled note (${index})`;

const assignUntitledTitle = (existing: NativeNote[], preferred?: string): string => {
  const trimmed = preferred?.trim();
  if (trimmed) {
    return trimmed;
  }

  const base = 'Untitled note';
  const untitledTitles = existing
    .map(note => note.title)
    .filter(title => title.toLowerCase().startsWith(base))
    .map(title => {
      const match = title.match(/\((\d+)\)$/);
      return match ? Number(match[1]) : 0;
    });

  if (!untitledTitles.includes(0)) {
    return base;
  }

  let suffix = 1;
  while (untitledTitles.includes(suffix)) {
    suffix += 1;
  }

  return buildUntitledTitle(suffix);
};

const normaliseNote = (note: NativeNote, existing: NativeNote[] = []): NativeNote => {
  const title = note.title && note.title.trim().length > 0
    ? note.title.trim()
    : assignUntitledTitle(existing, undefined);

  return {
    ...note,
    title,
    vocabItemId: note.vocabItemId ?? undefined,
  };
};

const createNotePayload = (input: CreateNoteInput, existing: NativeNote[]): NativeNote => {
  const timestamp = new Date().toISOString();
  const id = generateNoteId();

  return {
    id,
    title: assignUntitledTitle(existing, input.title),
    vocabItemId: input.vocabItemId?.trim() || undefined,
    content: input.content,
    sourceLanguage: (input.sourceLanguage ?? 'en').trim() || 'en',
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
      const normalised = notes.map((note, index, array) =>
        normaliseNote(note, array.slice(0, index)),
      );
      set({ notes: normalised, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load notes.',
        isLoading: false,
      });
    }
  },
  createNote: async input => {
    set({ isLoading: true, error: undefined });
    const existingNotes = get().notes;
    const note = createNotePayload(input, existingNotes);

    try {
      await notesRepository.createNote(note);
      const nextNotes = [note, ...existingNotes];
      const normalised = nextNotes.map((entry, index) =>
        normaliseNote(entry, nextNotes.slice(0, index)),
      );
      set({ notes: normalised, isLoading: false });
      return normaliseNote(note, existingNotes);
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to create note.',
        isLoading: false,
      });
      throw error;
    }
  },
  updateNoteContent: async (noteId, payload) => {
    set({ isLoading: true, error: undefined });
    try {
      await notesRepository.updateNoteContent(noteId, payload);
      const timestamp = new Date().toISOString();
      set(state => {
        const updated = state.notes.map(note =>
          note.id === noteId
            ? {
                ...note,
                title: payload.title,
                content: payload.content,
                updatedAt: timestamp,
              }
            : note,
        );

        const normalised = updated.map((entry, index) =>
          normaliseNote(entry, updated.slice(0, index)),
        );

        return {
          notes: normalised,
          isLoading: false,
        };
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to update note.',
        isLoading: false,
      });
      throw error;
    }
  },
  setNoteAnswered: async (noteId, answered) => {
    set({ isLoading: true, error: undefined });
    const timestamp = new Date().toISOString();
    const answeredAt = answered ? timestamp : undefined;

    try {
      await notesRepository.updateNoteStatus(noteId, answered ? timestamp : null);
      set(state => {
        const updated = state.notes.map(note =>
          note.id === noteId
            ? {
                ...note,
                answeredAt,
                updatedAt: timestamp,
              }
            : note,
        );

        const normalised = updated.map((entry, index) =>
          normaliseNote(entry, updated.slice(0, index)),
        );

        return {
          notes: normalised,
          isLoading: false,
        };
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to update note status.',
        isLoading: false,
      });
      throw error;
    }
  },
  deleteNote: async noteId => {
    set({ isLoading: true, error: undefined });
    try {
      await notesRepository.deleteNote(noteId);
      set(state => {
        const filtered = state.notes.filter(note => note.id !== noteId);
        const normalised = filtered.map((entry, index) =>
          normaliseNote(entry, filtered.slice(0, index)),
        );
        return {
          notes: normalised,
          isLoading: false,
        };
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
        if (unansweredOnly && note.answeredAt) {
          return false;
        }
        if (!normalizedQuery) {
          return true;
        }
        return [note.title, note.content, note.answer, note.videoId]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(normalizedQuery);
      })
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  },
  findNote: noteId => get().notes.find(note => note.id === noteId),
}));
