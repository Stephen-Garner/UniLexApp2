import { create } from 'zustand';
import type { YouTubeVideo } from '../contracts/models';
import { youTubeService, videoRepository } from '../services/container';

interface SearchOptions {
  languageCode?: string;
  limit?: number;
}

interface CachedSearchEntry {
  timestamp: number;
  results: YouTubeVideo[];
}

interface VideoState {
  savedVideos: YouTubeVideo[];
  searchResults: YouTubeVideo[];
  isSearching: boolean;
  isLoadingSaved: boolean;
  error?: string;
  recentSearches: Record<string, CachedSearchEntry>;
  searchVideos: (query: string, options?: SearchOptions) => Promise<YouTubeVideo[]>;
  loadSavedVideos: () => Promise<void>;
  saveVideo: (video: YouTubeVideo) => Promise<void>;
  removeVideo: (videoId: string) => Promise<void>;
  getSavedVideoById: (videoId: string) => YouTubeVideo | undefined;
}

const CACHE_TTL_MS = 5 * 60 * 1000;

const buildCacheKey = (query: string, options?: SearchOptions) =>
  JSON.stringify({
    query: query.trim().toLowerCase(),
    limit: options?.limit ?? 10,
    languageCode: options?.languageCode?.toLowerCase(),
  });

export const useVideoStore = create<VideoState>((set, get) => ({
  savedVideos: [],
  searchResults: [],
  isSearching: false,
  isLoadingSaved: false,
  error: undefined,
  recentSearches: {},
  searchVideos: async (query, options) => {
    if (!query.trim()) {
      set({ searchResults: [] });
      return [];
    }

    const cacheKey = buildCacheKey(query, options);
    const cache = get().recentSearches[cacheKey];
    const now = Date.now();

    if (cache && now - cache.timestamp < CACHE_TTL_MS) {
      set({ searchResults: cache.results });
      return cache.results;
    }

    set({ isSearching: true, error: undefined });

    try {
      const results = await youTubeService.searchVideos({
        query,
        limit: options?.limit,
        languageCode: options?.languageCode,
      });
      set(state => ({
        searchResults: results,
        isSearching: false,
        recentSearches: {
          ...state.recentSearches,
          [cacheKey]: { timestamp: now, results },
        },
      }));
      return results;
    } catch (error) {
      set({
        isSearching: false,
        error: error instanceof Error ? error.message : 'Failed to search videos.',
      });
      throw error;
    }
  },
  loadSavedVideos: async () => {
    set({ isLoadingSaved: true, error: undefined });
    try {
      const videos = await videoRepository.listAllVideos();
      set({ savedVideos: videos, isLoadingSaved: false });
    } catch (error) {
      set({
        isLoadingSaved: false,
        error: error instanceof Error ? error.message : 'Failed to load saved videos.',
      });
    }
  },
  saveVideo: async video => {
    set({ error: undefined });
    try {
      await videoRepository.saveVideo(video);
      set(state => ({
        savedVideos: [video, ...state.savedVideos.filter(item => item.videoId !== video.videoId)],
      }));
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to save video.' });
      throw error;
    }
  },
  removeVideo: async videoId => {
    set({ error: undefined });
    try {
      await videoRepository.deleteVideo(videoId);
      set(state => ({
        savedVideos: state.savedVideos.filter(video => video.videoId !== videoId),
      }));
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to remove video.' });
      throw error;
    }
  },
  getSavedVideoById: videoId => get().savedVideos.find(video => video.videoId === videoId),
}));
