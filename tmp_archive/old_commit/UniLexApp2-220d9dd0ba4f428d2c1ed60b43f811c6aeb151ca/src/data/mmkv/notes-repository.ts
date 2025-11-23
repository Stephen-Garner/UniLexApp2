import { createMMKV } from 'react-native-mmkv';
import type { MMKV } from 'react-native-mmkv';
import type { NativeNote } from '../../contracts/models';
import type { NotesRepository } from '../../contracts/repositories';

const STORAGE_ID = 'mmkv_notes_repository_v1';
const NOTES_KEY = 'native_notes';

const cloneNote = (note: NativeNote): NativeNote => ({
  ...note,
  title: note.title ?? 'Untitled note',
  vocabItemId: note.vocabItemId ?? null,
  answer: note.answer,
  answeredAt: note.answeredAt,
  videoId: note.videoId,
  timestampSeconds: note.timestampSeconds,
});

export class MmkvNotesRepository implements NotesRepository {
  private readonly storage: MMKV;

  constructor(storage?: MMKV) {
    this.storage = storage ?? createMMKV({ id: STORAGE_ID });
  }

  async createNote(note: NativeNote): Promise<void> {
    const notes = this.readNotes();
    notes.unshift(cloneNote(note));
    this.writeNotes(notes);
  }

  async getNoteById(noteId: string): Promise<NativeNote | null> {
    const note = this.readNotes().find(entry => entry.id === noteId);
    return note ? cloneNote(note) : null;
  }

  async listNotesByVocabItem(vocabItemId: string): Promise<NativeNote[]> {
    return this.readNotes()
      .filter(note => note.vocabItemId === vocabItemId)
      .map(cloneNote);
  }

  async listAllNotes(): Promise<NativeNote[]> {
    return this.readNotes().map(cloneNote);
  }

  async getUnansweredNotes(): Promise<NativeNote[]> {
    return this.readNotes()
      .filter(note => !note.answer)
      .map(cloneNote);
  }

  async searchNotes(query: string): Promise<NativeNote[]> {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) {
      return this.listAllNotes();
    }

    return this.readNotes()
      .filter(note =>
        [note.title, note.content, note.answer, note.sourceLanguage]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(trimmed),
      )
      .map(cloneNote);
  }

  async updateNoteContent(noteId: string, payload: { title: string; content: string }): Promise<void> {
    const notes = this.readNotes();
    const index = notes.findIndex(note => note.id === noteId);
    if (index === -1) {
      return;
    }

    notes[index] = {
      ...notes[index],
      title: payload.title,
      content: payload.content,
      updatedAt: new Date().toISOString(),
    };

    this.writeNotes(notes);
  }

  async updateNoteStatus(noteId: string, answeredAt: string | null): Promise<void> {
    const notes = this.readNotes();
    const index = notes.findIndex(note => note.id === noteId);
    if (index === -1) {
      return;
    }

    notes[index] = {
      ...notes[index],
      answeredAt: answeredAt ?? undefined,
      updatedAt: new Date().toISOString(),
    };

    this.writeNotes(notes);
  }

  async deleteNote(noteId: string): Promise<void> {
    const notes = this.readNotes().filter(note => note.id !== noteId);
    this.writeNotes(notes);
  }

  async replaceAll(notes: NativeNote[]): Promise<void> {
    this.writeNotes(notes.map(cloneNote));
  }

  private readNotes(): NativeNote[] {
    const raw = this.storage.getString(NOTES_KEY);
    if (!raw) {
      return [];
    }

    try {
      return (JSON.parse(raw) as NativeNote[]).map(cloneNote);
    } catch {
      return [];
    }
  }

  private writeNotes(notes: NativeNote[]) {
    this.storage.set(NOTES_KEY, JSON.stringify(notes));
  }
}

export const mmkvNotesRepository = new MmkvNotesRepository();
