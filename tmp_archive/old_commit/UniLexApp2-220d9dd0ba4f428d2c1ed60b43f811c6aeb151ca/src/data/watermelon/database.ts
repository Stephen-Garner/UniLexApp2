import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import { BankItemModel } from './models/bank-item';
import { NoteModel } from './models/note';
import { VideoModel } from './models/video';
import { vocabularyBankSchema } from './schema';
import { vocabularyMigrations } from './migrations';

let databaseInstance: Database | null = null;

/** Lazily initialized WatermelonDB instance shared across the app. */
export const getBankDatabase = (): Database => {
  if (databaseInstance) {
    return databaseInstance;
  }

  let adapter: SQLiteAdapter;

  adapter = new SQLiteAdapter({
    schema: vocabularyBankSchema,
    migrations: vocabularyMigrations,
    onSetUpError: error => {
      console.error('Failed to initialise WatermelonDB. Resetting local database.', error);
      adapter.unsafeResetDatabase(() => {});
    },
  });

  databaseInstance = new Database({
    adapter,
    modelClasses: [BankItemModel, NoteModel, VideoModel],
  });

  return databaseInstance;
};
