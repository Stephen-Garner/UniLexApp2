import { Q } from '@nozbe/watermelondb';
import type { Collection } from '@nozbe/watermelondb';
import { getBankDatabase } from './database';
import { VideoModel } from './models/video';
import type { YouTubeVideo } from '../../contracts/models';
import type { VideoRepository } from '../../contracts/repositories';

const getVideoCollection = (): Collection<VideoModel> =>
  getBankDatabase().collections.get<VideoModel>('videos');

const serializeVideo = (video: YouTubeVideo) => ({
  title: video.title,
  channel_title: video.channelTitle,
  language_code: video.languageCode,
  duration_seconds: video.durationSeconds,
  published_at: video.publishedAt,
  thumbnail_url: video.thumbnailUrl,
  transcript: video.transcript ?? null,
  saved_at: new Date().toISOString(),
});

const deserializeVideo = (record: VideoModel): YouTubeVideo => {
  const getValue = <TValue = unknown>(key: string): TValue => record.getRawValue<TValue>(key);

  return {
    id: record.id,
    title: getValue<string>('title'),
    channelTitle: getValue<string>('channel_title'),
    videoId: record.id,
    languageCode: getValue<string>('language_code'),
    durationSeconds: Number(getValue<number>('duration_seconds')),
    publishedAt: getValue<string>('published_at'),
    thumbnailUrl: getValue<string>('thumbnail_url'),
    transcript: getValue<string | null>('transcript') ?? undefined,
  };
};

const isNotFoundError = (error: unknown): boolean =>
  error instanceof Error && /Record ID .* was not found/.test(error.message);

export class WatermelonVideoRepository implements VideoRepository {
  async getVideoById(videoId: string): Promise<YouTubeVideo | null> {
    const collection = getVideoCollection();
    try {
      const record = await collection.find(videoId);
      return deserializeVideo(record);
    } catch (error) {
      if (isNotFoundError(error)) {
        return null;
      }
      throw error;
    }
  }

  async listVideosByLanguage(languageCode: string): Promise<YouTubeVideo[]> {
    const collection = getVideoCollection();
    const records = await collection
      .query(Q.where('language_code', languageCode))
      .fetch()
      .catch(async () => collection.query().fetch());

    return records.map(deserializeVideo);
  }

  async listAllVideos(): Promise<YouTubeVideo[]> {
    const collection = getVideoCollection();
    const records = await collection.query().fetch();
    return records.map(deserializeVideo);
  }

  async saveVideo(video: YouTubeVideo): Promise<void> {
    const collection = getVideoCollection();
    const payload = serializeVideo(video);

    await getBankDatabase().write(async () => {
      try {
        const existing = await collection.find(video.videoId);
        await existing.update(record => {
          Object.entries(payload).forEach(([key, value]) => record._setRaw(key, value));
        });
      } catch (error) {
        if (!isNotFoundError(error)) {
          throw error;
        }

        await collection.create(record => {
          record._raw.id = video.videoId;
          Object.entries(payload).forEach(([key, value]) => record._setRaw(key, value));
        });
      }
    });
  }

  async deleteVideo(videoId: string): Promise<void> {
    const collection = getVideoCollection();

    await getBankDatabase().write(async () => {
      try {
        const record = await collection.find(videoId);
        await record.markAsDeleted();
        await record.destroyPermanently();
      } catch (error) {
        if (!isNotFoundError(error)) {
          throw error;
        }
      }
    });
  }
}

export const videoRepository = new WatermelonVideoRepository();
