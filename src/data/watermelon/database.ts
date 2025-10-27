import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import { BankItemModel } from './models/bank-item';
import { NoteModel } from './models/note';
import { VideoModel } from './models/video';
import { vocabularyBankSchema } from './schema';

let databaseInstance: Database | null = null;

/** Lazily initialized WatermelonDB instance shared across the app. */
export const getBankDatabase = (): Database => {
  if (databaseInstance) {
    return databaseInstance;
  }

  const adapter = new SQLiteAdapter({
    schema: vocabularyBankSchema,
  });

  databaseInstance = new Database({
    adapter,
    modelClasses: [BankItemModel, NoteModel, VideoModel],
  });

  return databaseInstance;
};
