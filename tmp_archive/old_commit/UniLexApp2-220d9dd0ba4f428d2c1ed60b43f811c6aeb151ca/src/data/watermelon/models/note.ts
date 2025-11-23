import { Model } from '@nozbe/watermelondb';

/** WatermelonDB model representing a learner-authored note. */
export class NoteModel extends Model {
  static table = 'notes';

  getRawValue<TValue = unknown>(key: string): TValue {
    const rawRecord = this._raw as unknown as Record<string, TValue>;
    return rawRecord[key];
  }
}
