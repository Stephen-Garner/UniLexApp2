import { Q } from '@nozbe/watermelondb';
import type { Collection } from '@nozbe/watermelondb';
import { getBankDatabase } from './database';
import type { BankRepository } from '../../contracts/repositories';
import type { VocabItem, SrsData } from '../../contracts/models';
import { BankItemModel } from './models/bank-item';

const normaliseList = (values?: string[]): string[] => {
  if (!values || values.length === 0) {
    return [];
  }
  const seen = new Set<string>();
  return values
    .map(value => value.trim())
    .filter(value => value.length > 0)
    .filter(value => {
      const key = value.toLowerCase();
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
};

/** Serialises a vocabulary item into WatermelonDB column values. */
const isoToEpoch = (value: string): number => new Date(value).getTime();

const epochToIso = (value: number | string): string => new Date(Number(value)).toISOString();

const serializeItem = (item: VocabItem) => {
  const folderList = normaliseList([...(item.folders ?? []), ...(item.tags ?? [])]);
  return {
    term: item.term,
    reading: item.reading ?? null,
    meaning: item.meaning,
    examples: JSON.stringify(item.examples ?? []),
    tags: JSON.stringify(folderList),
    folders: JSON.stringify(folderList),
    level: item.level,
    created_at: isoToEpoch(item.createdAt),
    updated_at: isoToEpoch(item.updatedAt),
    srs_data: item.srsData ? JSON.stringify(item.srsData) : null,
  };
};

/** Deserialises a WatermelonDB record into a vocabulary item structure. */
const deserializeItem = (record: BankItemModel): VocabItem => {
  const getValue = <TValue = unknown>(key: string): TValue =>
    record.getRawValue<TValue>(key);

  const rawExamples = getValue<string>('examples') ?? '[]';
  const rawTags = getValue<string>('tags') ?? '[]';
  const rawFolders = getValue<string>('folders') ?? '[]';
  const folders = normaliseList([
    ...((() => {
      try {
        return JSON.parse(rawFolders) as string[];
      } catch {
        return [];
      }
    })()),
    ...((() => {
      try {
        return JSON.parse(rawTags) as string[];
      } catch {
        return [];
      }
    })()),
  ]);

  return {
    id: record.id,
    term: getValue<string>('term'),
    reading: getValue<string | null>('reading') ?? undefined,
    meaning: getValue<string>('meaning'),
    examples: (() => {
      try {
        return JSON.parse(rawExamples) as string[];
      } catch {
        return [];
      }
    })(),
    tags: folders,
    folders,
    level: getValue<string>('level'),
    createdAt: epochToIso(getValue<number>('created_at')),
    updatedAt: epochToIso(getValue<number>('updated_at')),
    srsData: (() => {
      const json = getValue<string | null>('srs_data');
      return json ? (JSON.parse(json) as SrsData) : undefined;
    })(),
  };
};

/** Applies vocabulary values to a WatermelonDB record. */
const applyItemToRecord = (record: BankItemModel, item: VocabItem) => {
  const payload = serializeItem(item);

  Object.entries(payload).forEach(([key, value]) => {
    record._setRaw(key, value);
  });
};

/** Handles Watermelon specific not-found errors gracefully. */
const isNotFoundError = (error: unknown): boolean =>
  error instanceof Error &&
  /Record ID .* was not found/.test(error.message);

/** Returns the Watermelon collection for bank items. */
const getBankCollection = (): Collection<BankItemModel> =>
  getBankDatabase().collections.get<BankItemModel>('bank_items');

/** WatermelonDB-backed vocabulary bank repository. */
export class WatermelonBankRepository implements BankRepository {
  async getVocabItemById(id: string): Promise<VocabItem | null> {
    const collection = getBankCollection();

    try {
      const record = await collection.find(id);
      return deserializeItem(record);
    } catch (error) {
      if (isNotFoundError(error)) {
        return null;
      }

      throw error;
    }
  }

  async listVocabItemsByTag(tag: string): Promise<VocabItem[]> {
    const collection = getBankCollection();
    const records = await collection
      .query(Q.where('tags', Q.like(`%${tag}%`)))
      .fetch()
      .catch(async () => collection.query().fetch());

    return records
      .map(deserializeItem)
      .filter(item => item.tags.includes(tag));
  }

  async listAllVocabItems(): Promise<VocabItem[]> {
    const collection = getBankCollection();
    const records = await collection.query().fetch();
    return records.map(deserializeItem);
  }

  async saveVocabItem(item: VocabItem): Promise<void> {
    const collection = getBankCollection();

    await getBankDatabase().write(async () => {
      try {
        const existing = await collection.find(item.id);
        await existing.update(record => {
          applyItemToRecord(record, item);
        });
      } catch (error) {
        if (!isNotFoundError(error)) {
          throw error;
        }

        await collection.create(record => {
          record._raw.id = item.id;
          applyItemToRecord(record, item);
        });
      }
    });
  }

  async deleteVocabItem(id: string): Promise<void> {
    const collection = getBankCollection();

    await getBankDatabase().write(async () => {
      try {
        const record = await collection.find(id);
        await record.markAsDeleted();
        await record.destroyPermanently();
      } catch (error) {
        if (!isNotFoundError(error)) {
          throw error;
        }
      }
    });
  }

  async updateSrsData(itemId: string, data: SrsData): Promise<void> {
    const collection = getBankCollection();

    await getBankDatabase().write(async () => {
      const record = await collection.find(itemId);
      await record.update(rec => {
        rec._setRaw('srs_data', JSON.stringify(data));
        rec._setRaw('updated_at', Date.now());
      });
    });
  }
}

export const bankRepository = new WatermelonBankRepository();
