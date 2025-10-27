import { Model } from '@nozbe/watermelondb';

/** WatermelonDB model representing a stored vocabulary item. */
export class BankItemModel extends Model {
  static table = 'bank_items';

  getRawValue<TValue = unknown>(key: string): TValue {
    const rawRecord = this._raw as unknown as Record<string, TValue>;
    return rawRecord[key];
  }
}
