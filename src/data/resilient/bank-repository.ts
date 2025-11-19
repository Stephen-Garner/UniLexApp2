import type { BankRepository } from '../../contracts/repositories';
import type { VocabItem, SrsData } from '../../contracts/models';
import { WatermelonBankRepository } from '../watermelon/bank-repository';
import { MmkvBankRepository } from '../mmkv/bank-repository';

type BankOperation<T> = () => Promise<T>;

/** Wraps a primary Watermelon repository and falls back to MMKV storage if needed. */
export class ResilientBankRepository implements BankRepository {
  private readonly primary: WatermelonBankRepository;
  private readonly fallback: MmkvBankRepository;
  private useFallback = false;

  constructor() {
    this.primary = new WatermelonBankRepository();
    this.fallback = new MmkvBankRepository();
  }

  async getVocabItemById(id: string): Promise<VocabItem | null> {
    return this.execute(
      () => this.primary.getVocabItemById(id),
      () => this.fallback.getVocabItemById(id),
    );
  }

  async listVocabItemsByTag(tag: string): Promise<VocabItem[]> {
    return this.execute(
      () => this.primary.listVocabItemsByTag(tag),
      () => this.fallback.listVocabItemsByTag(tag),
    );
  }

  async listAllVocabItems(): Promise<VocabItem[]> {
    if (this.useFallback) {
      return this.fallback.listAllVocabItems();
    }

    try {
      const items = await this.primary.listAllVocabItems();
      await this.fallback.replaceAll(items).catch(() => undefined);
      return items;
    } catch (error) {
      console.warn('[ResilientBankRepository] Falling back to MMKV storage.', error);
      this.useFallback = true;
      return this.fallback.listAllVocabItems();
    }
  }

  async saveVocabItem(item: VocabItem): Promise<void> {
    if (this.useFallback) {
      await this.fallback.saveVocabItem(item);
      return;
    }

    try {
      await this.primary.saveVocabItem(item);
      await this.fallback.saveVocabItem(item).catch(() => undefined);
    } catch (error) {
      console.warn('[ResilientBankRepository] Falling back to MMKV storage.', error);
      this.useFallback = true;
      await this.fallback.saveVocabItem(item);
    }
  }

  async deleteVocabItem(id: string): Promise<void> {
    if (this.useFallback) {
      await this.fallback.deleteVocabItem(id);
      return;
    }

    try {
      await this.primary.deleteVocabItem(id);
    } catch (error) {
      console.warn('[ResilientBankRepository] Falling back to MMKV storage.', error);
      this.useFallback = true;
      await this.fallback.deleteVocabItem(id);
      return;
    }

    await this.fallback.deleteVocabItem(id).catch(() => undefined);
  }

  async updateSrsData(itemId: string, data: SrsData): Promise<void> {
    if (this.useFallback) {
      await this.fallback.updateSrsData(itemId, data);
      return;
    }

    try {
      await this.primary.updateSrsData(itemId, data);
    } catch (error) {
      console.warn('[ResilientBankRepository] Falling back to MMKV storage.', error);
      this.useFallback = true;
      await this.fallback.updateSrsData(itemId, data);
      return;
    }

    await this.fallback.updateSrsData(itemId, data).catch(() => undefined);
  }

  async clearSrsData(itemId: string): Promise<void> {
    if (this.useFallback) {
      await this.fallback.clearSrsData(itemId);
      return;
    }

    try {
      await this.primary.clearSrsData(itemId);
    } catch (error) {
      console.warn('[ResilientBankRepository] Falling back to MMKV storage.', error);
      this.useFallback = true;
      await this.fallback.clearSrsData(itemId);
      return;
    }

    await this.fallback.clearSrsData(itemId).catch(() => undefined);
  }

  private async execute<T>(
    primaryOp: BankOperation<T>,
    fallbackOp: BankOperation<T>,
  ): Promise<T> {
    if (this.useFallback) {
      try {
        const result = await primaryOp();
        this.useFallback = false;
        return result;
      } catch {
        return fallbackOp();
      }
    }

    try {
      return await primaryOp();
    } catch (error) {
      console.warn('[ResilientBankRepository] Falling back to MMKV storage.', error);
      this.useFallback = true;
      return fallbackOp();
    }
  }
}

export const bankRepository = new ResilientBankRepository();
