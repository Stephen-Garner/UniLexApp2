import { Q } from '@nozbe/watermelondb';
import type { Collection } from '@nozbe/watermelondb';
import { getBankDatabase } from './database';
import type { NativeNote } from '../../contracts/models';
import type { NotesRepository } from '../../contracts/repositories';
import { NoteModel } from './models/note';

/** Serialises a native note for persistence. */
const isoToEpoch = (value: string): number => new Date(value).getTime();

const epochToIso = (value: number | string): string => new Date(Number(value)).toISOString();

const serializeNote = (note: NativeNote) => ({
  vocab_item_id: note.vocabItemId ?? null,
  title: note.title,
  content: note.content,
  source_language: note.sourceLanguage,
  created_at: isoToEpoch(note.createdAt),
  updated_at: isoToEpoch(note.updatedAt),
  answer: note.answer ?? null,
  answered_at: note.answeredAt ? isoToEpoch(note.answeredAt) : null,
  video_id: note.videoId ?? null,
  timestamp_seconds: note.timestampSeconds ?? null,
});

/** Deserialises a WatermelonDB record back into a native note. */
const deserializeNote = (record: NoteModel): NativeNote => {
  const getValue = <TValue = unknown>(key: string): TValue => record.getRawValue<TValue>(key);

  return {
    id: record.id,
    vocabItemId: getValue<string | null>('vocab_item_id') ?? undefined,
    title: (() => {
      const value = getValue<string | null>('title');
      return value && value.length > 0 ? value : 'Untitled note';
    })(),
    content: getValue<string>('content'),
    sourceLanguage: getValue<string>('source_language'),
    createdAt: epochToIso(getValue<number>('created_at')),
    updatedAt: epochToIso(getValue<number>('updated_at')),
    answer: getValue<string | null>('answer') ?? undefined,
    answeredAt: (() => {
      const value = getValue<number | null>('answered_at');
      return value == null ? undefined : epochToIso(value);
    })(),
    videoId: getValue<string | null>('video_id') ?? undefined,
    timestampSeconds: (() => {
      const value = getValue<number | null>('timestamp_seconds');
      return value == null ? undefined : value;
    })(),
  };
};

/** Applies note values to a WatermelonDB record. */
const applyNoteToRecord = (record: NoteModel, note: NativeNote) => {
  const payload = serializeNote(note);
  Object.entries(payload).forEach(([key, value]) => {
    record._setRaw(key, value);
  });
};

const getNotesCollection = (): Collection<NoteModel> =>
  getBankDatabase().collections.get<NoteModel>('notes');

const isNotFoundError = (error: unknown): boolean =>
  error instanceof Error && /Record ID .* was not found/.test(error.message);

/** WatermelonDB-backed notes repository implementation. */
export class WatermelonNotesRepository implements NotesRepository {
  async createNote(note: NativeNote): Promise<void> {
    const collection = getNotesCollection();

    await getBankDatabase().write(async () => {
      await collection.create(record => {
        record._raw.id = note.id;
        applyNoteToRecord(record, note);
      });
    });
  }

  async getNoteById(noteId: string): Promise<NativeNote | null> {
    const collection = getNotesCollection();

    try {
      const record = await collection.find(noteId);
      return deserializeNote(record);
    } catch (error) {
      if (isNotFoundError(error)) {
        return null;
      }
      throw error;
    }
  }

  async listNotesByVocabItem(vocabItemId: string): Promise<NativeNote[]> {
    const collection = getNotesCollection();
    const records = await collection.query(Q.where('vocab_item_id', vocabItemId)).fetch();
    return records.map(deserializeNote);
  }

  async listAllNotes(): Promise<NativeNote[]> {
    const collection = getNotesCollection();
    const records = await collection.query().fetch();
    return records.map(deserializeNote).sort((a, b) =>
      b.updatedAt.localeCompare(a.updatedAt),
    );
  }

  async getUnansweredNotes(): Promise<NativeNote[]> {
    const collection = getNotesCollection();
    const records = await collection.query(Q.where('answer', null)).fetch();
    return records.map(deserializeNote);
  }

  async searchNotes(query: string): Promise<NativeNote[]> {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) {
      return this.listAllNotes();
    }

    const collection = getNotesCollection();
    const records = await collection.query().fetch();
    return records
      .map(deserializeNote)
      .filter(note =>
        [note.content, note.answer, note.sourceLanguage]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(trimmed),
      );
  }

  async updateNoteContent(noteId: string, payload: { title: string; content: string }): Promise<void> {
    const collection = getNotesCollection();

    await getBankDatabase().write(async () => {
      const record = await collection.find(noteId);
      await record.update(rec => {
        rec._setRaw('title', payload.title);
        rec._setRaw('content', payload.content);
        rec._setRaw('updated_at', Date.now());
      });
    });
  }

  async updateNoteStatus(noteId: string, answeredAt: string | null): Promise<void> {
    const collection = getNotesCollection();

    await getBankDatabase().write(async () => {
      const record = await collection.find(noteId);
      await record.update(rec => {
        rec._setRaw('answered_at', answeredAt ? isoToEpoch(answeredAt) : null);
        rec._setRaw('updated_at', Date.now());
      });
    });
  }

  async deleteNote(noteId: string): Promise<void> {
    const collection = getNotesCollection();

    await getBankDatabase().write(async () => {
      try {
        const record = await collection.find(noteId);
        await record.markAsDeleted();
        await record.destroyPermanently();
      } catch (error) {
        if (!isNotFoundError(error)) {
          throw error;
        }
      }
    });
  }
}

export const notesRepository = new WatermelonNotesRepository();
