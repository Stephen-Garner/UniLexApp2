import { MMKV } from 'react-native-mmkv';
import type {
  AiTutorService,
  TranslateTextParams,
} from '../contracts/services';
import type { DrillSession, ProgressStats, VocabItem } from '../contracts/models';

/** Storage namespace used for caching translated text. */
const TRANSLATION_CACHE_NAMESPACE = 'ai_tutor_translation_cache_v1';

/** Contract for the underlying AI tutor backend implementation. */
export interface AiTutorBackend {
  /** Executes a translation request against the upstream provider. */
  translate(params: TranslateTextParams): Promise<string>;
  /** Generates a contextual hint from the upstream provider. */
  generateHint(params: {
    item: VocabItem;
    learnerAnswer: string;
  }): Promise<string>;
  /** Produces drill session feedback from the upstream provider. */
  generateSessionFeedback(session: DrillSession): Promise<string>;
  /** Creates a study plan recommendation from the upstream provider. */
  createStudyPlan(stats: ProgressStats): Promise<string>;
}

/** Generates a cache key for translation results. */
const buildTranslationCacheKey = (params: TranslateTextParams): string => {
  const { sourceLanguage, targetLanguage, text, context } = params;
  return [
    TRANSLATION_CACHE_NAMESPACE,
    sourceLanguage.toLowerCase(),
    targetLanguage.toLowerCase(),
    text.trim(),
    context?.trim() ?? '',
  ].join('|');
};

/** AI tutor service that caches translation responses using MMKV. */
export class CachedAiTutorService implements AiTutorService {
  private readonly storage: MMKV;

  constructor(
    private readonly backend: AiTutorBackend,
    storage?: MMKV,
  ) {
    this.storage =
      storage ??
      new MMKV({
        id: TRANSLATION_CACHE_NAMESPACE,
      });
  }

  async translate(params: TranslateTextParams): Promise<string> {
    const cacheKey = buildTranslationCacheKey(params);
    const cached = this.storage.getString(cacheKey);
    if (cached) {
      return cached;
    }

    const translated = await this.backend.translate(params);
    this.storage.set(cacheKey, translated);
    return translated;
  }

  generateHint(params: { item: VocabItem; learnerAnswer: string }): Promise<string> {
    return this.backend.generateHint(params);
  }

  generateSessionFeedback(session: DrillSession): Promise<string> {
    return this.backend.generateSessionFeedback(session);
  }

  createStudyPlan(stats: ProgressStats): Promise<string> {
    return this.backend.createStudyPlan(stats);
  }
}

/** Simple backend implementation that mirrors text for offline usage. */
export class EchoAiTutorBackend implements AiTutorBackend {
  async translate(params: TranslateTextParams): Promise<string> {
    const { text, targetLanguage } = params;
    return `[${targetLanguage}] ${text}`;
  }

  async generateHint(): Promise<string> {
    return 'Hints are unavailable offline.';
  }

  async generateSessionFeedback(): Promise<string> {
    return 'Feedback is unavailable offline.';
  }

  async createStudyPlan(): Promise<string> {
    return 'A study plan will be available when connected.';
  }
}
