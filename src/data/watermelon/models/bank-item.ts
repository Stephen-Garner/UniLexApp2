import { Model } from '@nozbe/watermelondb';

/** WatermelonDB model representing a stored vocabulary item. */
export class BankItemModel extends Model {
  static table = 'bank_items';

  getRawValue<TValue = unknown>(key: string): TValue {
    // Watermelon stores column values on the _raw property at runtime.
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    return (this._raw as Record<string, TValue>)[key];
  }
}
