import { createMMKV } from 'react-native-mmkv';
import type { MMKV } from 'react-native-mmkv';
import type { BankRepository } from '../../contracts/repositories';
import type { VocabItem, SrsData } from '../../contracts/models';

const STORAGE_ID = 'mmkv_bank_repository_v1';
const ITEMS_KEY = 'vocab_items';

const normalizeStringList = (values?: string[]): string[] => {
  if (!values || values.length === 0) {
    return [];
  }
  const seen = new Set<string>();
  return values
    .map(entry => entry.trim())
    .filter(entry => entry.length > 0)
    .filter(entry => {
      const key = entry.toLowerCase();
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
};

const cloneItem = (item: VocabItem): VocabItem => {
  const folders = normalizeStringList([...(item.folders ?? []), ...(item.tags ?? [])]);
  return {
    ...item,
    examples: [...item.examples],
    tags: [...folders],
    folders: [...folders],
    srsData: item.srsData ? { ...item.srsData } : undefined,
  };
};

export class MmkvBankRepository implements BankRepository {
  private readonly storage: MMKV;

  constructor(storage?: MMKV) {
    this.storage = storage ?? createMMKV({ id: STORAGE_ID });
  }

  async getVocabItemById(id: string): Promise<VocabItem | null> {
    const item = this.readItems().find(entry => entry.id === id);
    return item ? cloneItem(item) : null;
  }

  async listVocabItemsByTag(tag: string): Promise<VocabItem[]> {
    return this.readItems()
      .filter(item => item.tags.some(candidate => candidate.toLowerCase() === tag.toLowerCase()))
      .map(cloneItem);
  }

  async listAllVocabItems(): Promise<VocabItem[]> {
    return this.readItems().map(cloneItem);
  }

  async saveVocabItem(item: VocabItem): Promise<void> {
    const items = this.readItems();
    const index = items.findIndex(entry => entry.id === item.id);
    const folders = normalizeStringList([...(item.folders ?? []), ...(item.tags ?? [])]);
    const normalised: VocabItem = {
      ...item,
      tags: folders,
      folders,
      examples: [...item.examples],
      srsData: item.srsData ? { ...item.srsData } : undefined,
    };

    if (index >= 0) {
      items[index] = normalised;
    } else {
      items.push(normalised);
    }

    this.writeItems(items);
  }

  async deleteVocabItem(id: string): Promise<void> {
    const items = this.readItems().filter(item => item.id !== id);
    this.writeItems(items);
  }

  async updateSrsData(itemId: string, data: SrsData): Promise<void> {
    const items = this.readItems();
    const index = items.findIndex(item => item.id === itemId);
    if (index === -1) {
      return;
    }

    items[index] = {
      ...items[index],
      srsData: { ...data },
      updatedAt: new Date().toISOString(),
    };

    this.writeItems(items);
  }

  async replaceAll(items: VocabItem[]): Promise<void> {
    const normalised = items.map(cloneItem);
    this.writeItems(normalised);
  }

  private readItems(): VocabItem[] {
    const raw = this.storage.getString(ITEMS_KEY);
    if (!raw) {
      return [];
    }

    try {
      const parsed = JSON.parse(raw) as VocabItem[];
      return parsed.map(entry => {
        const rawFolders = Array.isArray(entry.folders) ? entry.folders : [];
        const rawTags = Array.isArray(entry.tags) ? entry.tags : [];
        const folders = normalizeStringList([...rawFolders, ...rawTags]);
        return {
          ...entry,
          examples: Array.isArray(entry.examples) ? entry.examples : [],
          tags: folders,
          folders,
          srsData: entry.srsData ? { ...entry.srsData } : undefined,
        };
      });
    } catch {
      return [];
    }
  }

  private writeItems(items: VocabItem[]) {
    this.storage.set(ITEMS_KEY, JSON.stringify(items));
  }
}

export const mmkvBankRepository = new MmkvBankRepository();
