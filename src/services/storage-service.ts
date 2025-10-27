import { createMMKV } from 'react-native-mmkv';
import type { MMKV } from 'react-native-mmkv';
import type { StorageService } from '../contracts/services';

/** MMKV-backed storage service providing key-value persistence. */
export class MmkvStorageService implements StorageService {
  private readonly storage: MMKV;

  constructor(id: string = 'app_storage_v1') {
    this.storage = createMMKV({ id });
  }

  async setItem<TValue>(key: string, value: TValue): Promise<void> {
    this.storage.set(key, JSON.stringify(value));
  }

  async getItem<TValue>(key: string): Promise<TValue | null> {
    const raw = this.storage.getString(key);
    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw) as TValue;
    } catch {
      return null;
    }
  }

  async removeItem(key: string): Promise<void> {
    this.storage.remove(key);
  }

  async listKeys(): Promise<string[]> {
    return this.storage.getAllKeys();
  }

  async clear(): Promise<void> {
    this.storage.clearAll();
  }
}

export const storageService = new MmkvStorageService();
