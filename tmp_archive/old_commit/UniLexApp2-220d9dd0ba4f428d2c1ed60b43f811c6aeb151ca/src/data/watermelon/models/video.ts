import { Model } from '@nozbe/watermelondb';

/** WatermelonDB model representing stored YouTube video metadata. */
export class VideoModel extends Model {
  static table = 'videos';

  getRawValue<TValue = unknown>(key: string): TValue {
    const rawRecord = this._raw as unknown as Record<string, TValue>;
    return rawRecord[key];
  }
}
