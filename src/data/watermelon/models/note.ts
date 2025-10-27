import { Model } from '@nozbe/watermelondb';

/** WatermelonDB model representing a learner-authored note. */
export class NoteModel extends Model {
  static table = 'notes';

  getRawValue<TValue = unknown>(key: string): TValue {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    return (this._raw as Record<string, TValue>)[key];
  }
}
