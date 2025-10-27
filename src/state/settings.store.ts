import { create } from 'zustand';
import { storageService } from '../services/storage-service';
import { ttsService } from '../services/tts-service';

type ThemePreference = 'system' | 'light' | 'dark';

interface SettingsState {
  youtubeApiKey: string;
  aiTutorApiKey: string;
  dailyGoalMinutes: number;
  theme: ThemePreference;
  preferredVoiceId?: string;
  voices: Array<{ id: string; name?: string }>;
  isLoaded: boolean;
  isLoading: boolean;
  error?: string;
  loadSettings: () => Promise<void>;
  updateYoutubeApiKey: (value: string) => Promise<void>;
  updateAiTutorApiKey: (value: string) => Promise<void>;
  updateDailyGoalMinutes: (value: number) => Promise<void>;
  updateTheme: (value: ThemePreference) => Promise<void>;
  updatePreferredVoice: (value?: string) => Promise<void>;
  refreshVoices: () => Promise<void>;
}

const STORAGE_KEYS = {
  youtubeApiKey: 'settings.youtubeApiKey',
  aiTutorApiKey: 'settings.aiTutorApiKey',
  dailyGoalMinutes: 'settings.dailyGoalMinutes',
  theme: 'settings.theme',
  preferredVoiceId: 'settings.preferredVoiceId',
};

const DEFAULT_STATE = {
  youtubeApiKey: '',
  aiTutorApiKey: '',
  dailyGoalMinutes: 20,
  theme: 'system' as ThemePreference,
  preferredVoiceId: undefined,
  voices: [] as Array<{ id: string; name?: string }>,
  isLoaded: false,
  isLoading: false,
  error: undefined as string | undefined,
};

export const useSettingsStore = create<SettingsState>((set, get) => ({
  ...DEFAULT_STATE,
  loadSettings: async () => {
    if (get().isLoaded || get().isLoading) {
      return;
    }

    set({ isLoading: true, error: undefined });

    try {
      const [
        youtubeApiKey,
        aiTutorApiKey,
        dailyGoalMinutes,
        theme,
        preferredVoiceId,
      ] = await Promise.all([
        storageService.getItem<string>(STORAGE_KEYS.youtubeApiKey),
        storageService.getItem<string>(STORAGE_KEYS.aiTutorApiKey),
        storageService.getItem<number>(STORAGE_KEYS.dailyGoalMinutes),
        storageService.getItem<ThemePreference>(STORAGE_KEYS.theme),
        storageService.getItem<string>(STORAGE_KEYS.preferredVoiceId),
      ]);

      set({
        youtubeApiKey: youtubeApiKey ?? '',
        aiTutorApiKey: aiTutorApiKey ?? '',
        dailyGoalMinutes: dailyGoalMinutes ?? DEFAULT_STATE.dailyGoalMinutes,
        theme: theme ?? DEFAULT_STATE.theme,
        preferredVoiceId: preferredVoiceId ?? undefined,
        isLoaded: true,
        isLoading: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load settings.',
        isLoading: false,
      });
    }
  },
  updateYoutubeApiKey: async value => {
    await storageService.setItem(STORAGE_KEYS.youtubeApiKey, value);
    set({ youtubeApiKey: value });
  },
  updateAiTutorApiKey: async value => {
    await storageService.setItem(STORAGE_KEYS.aiTutorApiKey, value);
    set({ aiTutorApiKey: value });
  },
  updateDailyGoalMinutes: async value => {
    await storageService.setItem(STORAGE_KEYS.dailyGoalMinutes, value);
    set({ dailyGoalMinutes: value });
  },
  updateTheme: async value => {
    await storageService.setItem(STORAGE_KEYS.theme, value);
    set({ theme: value });
  },
  updatePreferredVoice: async value => {
    if (value) {
      await storageService.setItem(STORAGE_KEYS.preferredVoiceId, value);
    } else {
      await storageService.removeItem(STORAGE_KEYS.preferredVoiceId);
    }
    set({ preferredVoiceId: value });
  },
  refreshVoices: async () => {
    try {
      const voices = await ttsService.getVoices();
      set({ voices });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Unable to retrieve voices.',
      });
    }
  },
}));

export const getYoutubeApiKey = async (): Promise<string | null> => {
  const state = useSettingsStore.getState();
  if (!state.isLoaded && !state.isLoading) {
    await state.loadSettings();
  }
  return useSettingsStore.getState().youtubeApiKey || null;
};

export const getThemePreference = async (): Promise<ThemePreference> => {
  const state = useSettingsStore.getState();
  if (!state.isLoaded && !state.isLoading) {
    await state.loadSettings();
  }
  return useSettingsStore.getState().theme;
};
