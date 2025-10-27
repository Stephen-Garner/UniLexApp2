import type { YouTubeService } from '../contracts/services';
import type { YouTubeVideo } from '../contracts/models';
import { getYoutubeApiKey } from '../state/settings.store';

interface SearchCacheEntry {
  expiresAt: number;
  results: YouTubeVideo[];
}

interface YoutubeServiceConfig {
  cacheTtlMs?: number;
}

const DEFAULT_CONFIG: Required<YoutubeServiceConfig> = {
  cacheTtlMs: 5 * 60 * 1000,
};

const SEARCH_ENDPOINT = 'https://www.googleapis.com/youtube/v3/search';
const VIDEOS_ENDPOINT = 'https://www.googleapis.com/youtube/v3/videos';

const parseIsoDuration = (duration: string): number => {
  const regex = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/;
  const match = regex.exec(duration);
  if (!match) {
    return 0;
  }

  const [, hours, minutes, seconds] = match;
  const h = hours ? Number(hours) : 0;
  const m = minutes ? Number(minutes) : 0;
  const s = seconds ? Number(seconds) : 0;
  return h * 3600 + m * 60 + s;
};

const normalizeQueryKey = (query: string, limit: number, languageCode?: string) =>
  JSON.stringify({ query: query.trim().toLowerCase(), limit, languageCode: languageCode?.toLowerCase() });

export class YouTubeApiService implements YouTubeService {
  private readonly cache = new Map<string, SearchCacheEntry>();
  private readonly cacheTtlMs: number;

  constructor(config: YoutubeServiceConfig = {}) {
    const merged = { ...DEFAULT_CONFIG, ...config };
    this.cacheTtlMs = merged.cacheTtlMs;
  }

  async searchVideos(params: {
    query: string;
    limit?: number;
    languageCode?: string;
  }): Promise<YouTubeVideo[]> {
    const { query, limit = 10, languageCode } = params;
    const cacheKey = normalizeQueryKey(query, limit, languageCode);
    const now = Date.now();

    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > now) {
      return cached.results;
    }

    const apiKey = await this.requireApiKey();
    const searchUrl = new URL(SEARCH_ENDPOINT);
    searchUrl.searchParams.set('part', 'snippet');
    searchUrl.searchParams.set('maxResults', String(limit));
    searchUrl.searchParams.set('q', query);
    searchUrl.searchParams.set('type', 'video');
    searchUrl.searchParams.set('key', apiKey);
    if (languageCode) {
      searchUrl.searchParams.set('relevanceLanguage', languageCode);
    }

    const searchResponse = await fetch(searchUrl.toString());
    if (!searchResponse.ok) {
      throw new Error(`YouTube search failed with status ${searchResponse.status}`);
    }

    const searchJson: any = await searchResponse.json();
    const videoIds: string[] = (searchJson.items ?? [])
      .map((item: any) => item?.id?.videoId)
      .filter(Boolean);

    if (videoIds.length === 0) {
      return [];
    }

    const videos = await this.fetchVideosByIds(videoIds, apiKey);

    const results = videoIds
      .map(id => videos.get(id))
      .filter((video): video is YouTubeVideo => Boolean(video));

    this.cache.set(cacheKey, {
      expiresAt: now + this.cacheTtlMs,
      results,
    });

    return results;
  }

  async getVideoInfo(videoId: string): Promise<YouTubeVideo | null> {
    const apiKey = await this.requireApiKey();
    const videos = await this.fetchVideosByIds([videoId], apiKey);
    return videos.get(videoId) ?? null;
  }

  fetchVideo(videoId: string): Promise<YouTubeVideo | null> {
    return this.getVideoInfo(videoId);
  }

  async fetchCaptions(_params: { videoId: string; languageCode: string }): Promise<string | null> {
    // Caption retrieval requires OAuth credentials; defer for future implementation.
    return null;
  }

  private async fetchVideosByIds(videoIds: string[], apiKey: string): Promise<Map<string, YouTubeVideo>> {
    const url = new URL(VIDEOS_ENDPOINT);
    url.searchParams.set('part', 'snippet,contentDetails');
    url.searchParams.set('id', videoIds.join(','));
    url.searchParams.set('key', apiKey);

    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`YouTube videos request failed with status ${response.status}`);
    }

    const json: any = await response.json();
    const map = new Map<string, YouTubeVideo>();

    (json.items ?? []).forEach((item: any) => {
      const snippet = item.snippet ?? {};
      const contentDetails = item.contentDetails ?? {};
      const languageCode = snippet.defaultAudioLanguage ?? snippet.defaultLanguage ?? 'en';
      const durationSeconds = parseIsoDuration(contentDetails.duration ?? 'PT0S');
      const videoId: string = item.id;

      map.set(videoId, {
        id: videoId,
        videoId,
        title: snippet.title ?? 'Untitled',
        channelTitle: snippet.channelTitle ?? 'Unknown channel',
        languageCode,
        durationSeconds,
        publishedAt: snippet.publishedAt ?? new Date().toISOString(),
        thumbnailUrl: snippet.thumbnails?.high?.url ?? snippet.thumbnails?.default?.url ?? '',
        transcript: undefined,
      });
    });

    return map;
  }

  private async requireApiKey(): Promise<string> {
    const apiKey = await getYoutubeApiKey();
    if (!apiKey) {
      throw new Error('YouTube API key is not configured.');
    }
    return apiKey;
  }
}

export const youTubeService = new YouTubeApiService();
