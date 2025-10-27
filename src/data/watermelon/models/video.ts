import { Model } from '@nozbe/watermelondb';

/** WatermelonDB model representing stored YouTube video metadata. */
export class VideoModel extends Model {
  static table = 'videos';

  getRawValue<TValue = unknown>(key: string): TValue {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    return (this._raw as Record<string, TValue>)[key];
  }
}
