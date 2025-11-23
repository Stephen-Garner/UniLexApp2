import { create } from 'zustand';
import {
  LanguageProfileSchema,
  type LanguageProfile,
  type SrsData,
  type TranslationPitfallType,
  TranslationDifficultySchema,
} from '../contracts/models';
import { storageService } from '../services/storage-service';
import { resolveFlagGlyph } from '../data/language-library';

const STORAGE_KEYS = {
  profiles: 'languageProfiles.records.v1',
  activeProfileId: 'languageProfiles.activeId.v1',
};

const DEFAULT_STYLE_PREFS = {
  slang: 0.2,
  idioms: 0.2,
  formal: 0.6,
} as const;

const ensureLower = (value?: string | null) =>
  value ? value.trim().toLowerCase() : undefined;

export interface EnsureProfileParams {
  userId: string;
  nativeLanguage: string;
  targetLanguage: string;
  targetRegion?: string | null;
  preferredDifficulty?: LanguageProfile['preferredDifficulty'];
  stylePreferences?: Partial<LanguageProfile['stylePreferences']>;
  makeActive?: boolean;
}

interface LanguageProfileState {
  profiles: Record<string, LanguageProfile>;
  activeProfileId?: string;
  isLoaded: boolean;
  isLoading: boolean;
  error?: string;
  loadProfiles: () => Promise<void>;
  selectProfile: (profileId: string) => Promise<void>;
  upsertProfile: (profile: LanguageProfile, options?: { activate?: boolean }) => Promise<void>;
  ensureProfile: (params: EnsureProfileParams) => Promise<LanguageProfile>;
  appendSavedSession: (profileId: string, sessionId: string) => Promise<void>;
  recordError: (profileId: string, payload: { vocabId: string; errorTag: TranslationPitfallType }) => Promise<void>;
  updateSrsState: (profileId: string, srsState: SrsData[]) => Promise<void>;
  updateStylePreferences: (
    profileId: string,
    prefs: Partial<LanguageProfile['stylePreferences']>,
  ) => Promise<void>;
  reset: () => Promise<void>;
}

const DEFAULT_STATE: Omit<LanguageProfileState, 'loadProfiles' | 'selectProfile' | 'upsertProfile' | 'ensureProfile' | 'appendSavedSession' | 'recordError' | 'updateSrsState' | 'updateStylePreferences' | 'reset'> =
  {
    profiles: {},
    activeProfileId: undefined,
    isLoaded: false,
    isLoading: false,
    error: undefined,
  };

export const buildLanguageProfileId = (
  userId: string,
  targetLanguage: string,
  targetRegion?: string | null,
): string => {
  const language = ensureLower(targetLanguage) ?? 'unknown';
  const region = ensureLower(targetRegion);
  return region
    ? `profile-${userId}-${language}-${region}`
    : `profile-${userId}-${language}`;
};

const deriveFlagAsset = (targetLanguage: string, targetRegion?: string | null) =>
  resolveFlagGlyph(targetLanguage, targetRegion);

const sanitizeProfile = (profile: LanguageProfile): LanguageProfile => {
  const parsed = LanguageProfileSchema.safeParse(profile);
  if (parsed.success) {
    return parsed.data;
  }
  throw new Error('Invalid language profile payload');
};

const hydrateProfiles = (raw: unknown): Record<string, LanguageProfile> => {
  if (!raw || typeof raw !== 'object') {
    return {};
  }

  return Object.entries(raw as Record<string, unknown>).reduce<Record<string, LanguageProfile>>(
    (acc, [profileId, value]) => {
      const parsed = LanguageProfileSchema.safeParse(value);
      if (parsed.success) {
        acc[profileId] = parsed.data;
      }
      return acc;
    },
    {},
  );
};

const persistProfiles = async (profiles: Record<string, LanguageProfile>) => {
  await storageService.setItem(STORAGE_KEYS.profiles, profiles);
};

const persistActiveProfileId = async (profileId?: string) => {
  if (profileId) {
    await storageService.setItem(STORAGE_KEYS.activeProfileId, profileId);
  } else {
    await storageService.removeItem(STORAGE_KEYS.activeProfileId);
  }
};

const createProfilePayload = ({
  userId,
  nativeLanguage,
  targetLanguage,
  targetRegion,
  preferredDifficulty,
  stylePreferences,
}: EnsureProfileParams): LanguageProfile => {
  const normalizedTarget = ensureLower(targetLanguage) ?? targetLanguage;
  const normalizedRegion = ensureLower(targetRegion);
  const profileId = buildLanguageProfileId(userId, normalizedTarget, normalizedRegion);
  const now = new Date().toISOString();
  const difficulty = preferredDifficulty ?? TranslationDifficultySchema.enum.intro;

  return sanitizeProfile({
    profileId,
    userId,
    nativeLanguage: ensureLower(nativeLanguage) ?? nativeLanguage,
    targetLanguage: normalizedTarget,
    targetRegion: normalizedRegion ?? null,
    preferredDifficulty: difficulty,
    stylePreferences: {
      slang: stylePreferences?.slang ?? DEFAULT_STYLE_PREFS.slang,
      idioms: stylePreferences?.idioms ?? DEFAULT_STYLE_PREFS.idioms,
      formal: stylePreferences?.formal ?? DEFAULT_STYLE_PREFS.formal,
    },
    savedSessions: [],
    srsState: [],
    errorLedger: [],
    lastFlagAsset: deriveFlagAsset(normalizedTarget, normalizedRegion),
    updatedAt: now,
  });
};

export const useLanguageProfileStore = create<LanguageProfileState>((set, get) => ({
  ...DEFAULT_STATE,
  loadProfiles: async () => {
    if (get().isLoaded || get().isLoading) {
      return;
    }

    set({ isLoading: true, error: undefined });
    try {
      const [storedProfiles, storedActiveId] = await Promise.all([
        storageService.getItem<Record<string, LanguageProfile>>(STORAGE_KEYS.profiles),
        storageService.getItem<string>(STORAGE_KEYS.activeProfileId),
      ]);

      set({
        profiles: hydrateProfiles(storedProfiles),
        activeProfileId: storedActiveId ?? undefined,
        isLoaded: true,
        isLoading: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load language profiles.',
        isLoading: false,
      });
    }
  },
  selectProfile: async profileId => {
    if (!get().profiles[profileId]) {
      throw new Error(`Profile ${profileId} does not exist.`);
    }
    await persistActiveProfileId(profileId);
    set({ activeProfileId: profileId });
  },
  upsertProfile: async (profile, options) => {
    const sanitized = sanitizeProfile({
      ...profile,
      updatedAt: new Date().toISOString(),
    });
    const snapshot = { ...get().profiles, [sanitized.profileId]: sanitized };
    await persistProfiles(snapshot);
    set({ profiles: snapshot });

    if (options?.activate) {
      await persistActiveProfileId(sanitized.profileId);
      set({ activeProfileId: sanitized.profileId });
    }
  },
  ensureProfile: async params => {
    const state = get();
    const profileId = buildLanguageProfileId(
      params.userId,
      params.targetLanguage,
      params.targetRegion,
    );
    const existing = state.profiles[profileId];

    if (existing) {
      if (params.makeActive) {
        await state.selectProfile(profileId);
      }
      return existing;
    }

    const payload = createProfilePayload(params);
    await state.upsertProfile(payload, { activate: params.makeActive ?? true });
    return payload;
  },
  appendSavedSession: async (profileId, sessionId) => {
    const profile = get().profiles[profileId];
    if (!profile) {
      throw new Error(`Profile ${profileId} does not exist.`);
    }

    if (profile.savedSessions.includes(sessionId)) {
      return;
    }

    const updatedProfile: LanguageProfile = {
      ...profile,
      savedSessions: [sessionId, ...profile.savedSessions],
      updatedAt: new Date().toISOString(),
    };

    await get().upsertProfile(updatedProfile);
  },
  recordError: async (profileId, { vocabId, errorTag }) => {
    const profile = get().profiles[profileId];
    if (!profile) {
      throw new Error(`Profile ${profileId} does not exist.`);
    }

    const ledger = [...profile.errorLedger];
    const entryIndex = ledger.findIndex(item => item.vocabId === vocabId);
    if (entryIndex >= 0) {
      const entry = ledger[entryIndex];
      const errorTags = entry.errorTags.includes(errorTag)
        ? entry.errorTags
        : [...entry.errorTags, errorTag];
      ledger[entryIndex] = {
        vocabId,
        errorTags,
        count: entry.count + 1,
      };
    } else {
      ledger.unshift({
        vocabId,
        errorTags: [errorTag],
        count: 1,
      });
    }

    await get().upsertProfile({
      ...profile,
      errorLedger: ledger,
    });
  },
  updateSrsState: async (profileId, srsState) => {
    const profile = get().profiles[profileId];
    if (!profile) {
      throw new Error(`Profile ${profileId} does not exist.`);
    }

    await get().upsertProfile({
      ...profile,
      srsState,
    });
  },
  updateStylePreferences: async (profileId, prefs) => {
    const profile = get().profiles[profileId];
    if (!profile) {
      throw new Error(`Profile ${profileId} does not exist.`);
    }

    await get().upsertProfile({
      ...profile,
      stylePreferences: {
        ...profile.stylePreferences,
        ...prefs,
      },
    });
  },
  reset: async () => {
    await Promise.all([
      storageService.removeItem(STORAGE_KEYS.profiles),
      storageService.removeItem(STORAGE_KEYS.activeProfileId),
    ]);
    set({ ...DEFAULT_STATE });
  },
}));

export const getActiveLanguageProfile = (): LanguageProfile | undefined => {
  const state = useLanguageProfileStore.getState();
  if (!state.activeProfileId) {
    return undefined;
  }
  return state.profiles[state.activeProfileId];
};
