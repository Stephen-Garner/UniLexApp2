import type { NotesRepository } from '../../contracts/repositories';
import type { NativeNote } from '../../contracts/models';
import { WatermelonNotesRepository } from '../watermelon/notes-repository';
import { MmkvNotesRepository } from '../mmkv/notes-repository';

type NoteOperation<T> = () => Promise<T>;

/** Wraps WatermelonDB notes storage with MMKV fallback for environments without SQLite. */
export class ResilientNotesRepository implements NotesRepository {
  private readonly primary: WatermelonNotesRepository;
  private readonly fallback: MmkvNotesRepository;
  private useFallback = false;

  constructor() {
    this.primary = new WatermelonNotesRepository();
    this.fallback = new MmkvNotesRepository();
  }

  async createNote(note: NativeNote): Promise<void> {
    await this.execute(
      () => this.primary.createNote(note),
      () => this.fallback.createNote(note),
    );
  }

  async getNoteById(noteId: string): Promise<NativeNote | null> {
    return this.execute(
      () => this.primary.getNoteById(noteId),
      () => this.fallback.getNoteById(noteId),
    );
  }

  async listNotesByVocabItem(vocabItemId: string): Promise<NativeNote[]> {
    return this.execute(
      () => this.primary.listNotesByVocabItem(vocabItemId),
      () => this.fallback.listNotesByVocabItem(vocabItemId),
    );
  }

  async listAllNotes(): Promise<NativeNote[]> {
    if (this.useFallback) {
      return this.fallback.listAllNotes();
    }

    try {
      const notes = await this.primary.listAllNotes();
      await this.fallback.replaceAll(notes).catch(() => undefined);
      return notes;
    } catch (error) {
      console.warn('[ResilientNotesRepository] Falling back to MMKV storage.', error);
      this.useFallback = true;
      return this.fallback.listAllNotes();
    }
  }

  async getUnansweredNotes(): Promise<NativeNote[]> {
    return this.execute(
      () => this.primary.getUnansweredNotes(),
      () => this.fallback.getUnansweredNotes(),
    );
  }

  async searchNotes(query: string): Promise<NativeNote[]> {
    return this.execute(
      () => this.primary.searchNotes(query),
      () => this.fallback.searchNotes(query),
    );
  }

  async updateNoteContent(noteId: string, payload: { title: string; content: string }): Promise<void> {
    await this.execute(
      () => this.primary.updateNoteContent(noteId, payload),
      () => this.fallback.updateNoteContent(noteId, payload),
    );
  }

  async updateNoteStatus(noteId: string, answeredAt: string | null): Promise<void> {
    await this.execute(
      () => this.primary.updateNoteStatus(noteId, answeredAt),
      () => this.fallback.updateNoteStatus(noteId, answeredAt),
    );
  }

  async deleteNote(noteId: string): Promise<void> {
    await this.execute(
      () => this.primary.deleteNote(noteId),
      () => this.fallback.deleteNote(noteId),
    );
  }

  private async execute<T>(
    primaryOp: NoteOperation<T>,
    fallbackOp: NoteOperation<T>,
  ): Promise<T> {
    if (this.useFallback) {
      return fallbackOp();
    }

    try {
      return await primaryOp();
    } catch (error) {
      console.warn('[ResilientNotesRepository] Falling back to MMKV storage.', error);
      this.useFallback = true;
      return fallbackOp();
    }
  }
}

export const notesRepository = new ResilientNotesRepository();
