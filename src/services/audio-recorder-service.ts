import { PermissionsAndroid, Platform } from 'react-native';
import RNFS from 'react-native-fs';
import { nanoid } from 'nanoid/non-secure';
import { createSound } from 'react-native-nitro-sound';
import type { AudioRecorderService } from '../contracts/services';
import { Buffer } from 'buffer';

interface RecordingSession {
  path: string;
  createdAt: number;
}

const AUDIO_FILENAME = (id: string) => `rec-${id}.m4a`;

const ensureDirectoryExists = async (path: string) => {
  const exists = await RNFS.exists(path);
  if (!exists) {
    await RNFS.mkdir(path);
  }
};

const getRecordingDirectory = async (): Promise<string> => {
  const basePath = Platform.select({
    ios: RNFS.CachesDirectoryPath,
    android: RNFS.CachesDirectoryPath,
    default: RNFS.CachesDirectoryPath,
  });

  const directory = `${basePath}/unilex-recordings`;
  await ensureDirectoryExists(directory);
  return directory;
};

const base64ToArrayBuffer = (base64: string): ArrayBuffer => {
  const buffer = Buffer.from(base64, 'base64');
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
};

export class NitroAudioRecorderService implements AudioRecorderService {
  private readonly sound = createSound();

  private readonly sessions = new Map<string, RecordingSession>();

  private activeSessionId: string | null = null;

  private recordingState = false;

  constructor() {
    this.sound.setSubscriptionDuration(0.1);
  }

  async startRecording(): Promise<string> {
    if (this.recordingState) {
      throw new Error('A recording session is already active.');
    }

    await this.ensurePermission();

    const directory = await getRecordingDirectory();
    const sessionId = nanoid();
    const filePath = `${directory}/${AUDIO_FILENAME(sessionId)}`;

    await this.cleanupStaleSessions(sessionId);

    await this.sound.startRecorder(filePath, {
      AudioQuality: 'high',
      AudioChannels: 1,
      AudioSamplingRate: 44100,
      AudioEncodingBitRate: 96000,
    }, true);

    this.sessions.set(sessionId, {
      path: filePath,
      createdAt: Date.now(),
    });
    this.activeSessionId = sessionId;
    this.recordingState = true;
    return sessionId;
  }

  async stopRecording(sessionId: string): Promise<ArrayBuffer> {
    if (this.activeSessionId !== sessionId) {
      throw new Error('Recording session mismatch.');
    }

    await this.sound.stopRecorder();
    this.recordingState = false;
    this.activeSessionId = null;

    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Recording session not found.');
    }

    const base64 = await RNFS.readFile(session.path, 'base64');
    return base64ToArrayBuffer(base64);
  }

  async pauseRecording(sessionId: string): Promise<void> {
    if (this.activeSessionId !== sessionId) {
      return;
    }
    await this.sound.pauseRecorder();
  }

  async resumeRecording(sessionId: string): Promise<void> {
    if (this.activeSessionId !== sessionId) {
      return;
    }
    await this.sound.resumeRecorder();
  }

  async isRecording(sessionId: string): Promise<boolean> {
    return this.activeSessionId === sessionId && this.recordingState;
  }

  async getRecordingUri(sessionId: string): Promise<string | null> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return null;
    }
    const exists = await RNFS.exists(session.path);
    return exists ? session.path : null;
  }

  async cleanupRecording(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return;
    }
    try {
      const exists = await RNFS.exists(session.path);
      if (exists) {
        await RNFS.unlink(session.path);
      }
    } catch (error) {
      console.warn('Failed to cleanup recording', error);
    } finally {
      this.sessions.delete(sessionId);
    }
  }

  private async ensurePermission() {
    if (Platform.OS !== 'android') {
      return;
    }

    const hasPermission = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
    );

    if (hasPermission) {
      return;
    }

    const status = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
    );

    if (status !== PermissionsAndroid.RESULTS.GRANTED) {
      throw new Error('Microphone permission is required to record audio.');
    }
  }

  private async cleanupStaleSessions(activeSessionId: string) {
    const staleSessions = Array.from(this.sessions.keys()).filter(
      id => id !== activeSessionId,
    );
    await Promise.all(staleSessions.map(id => this.cleanupRecording(id)));
  }
}

export const audioRecorderService = new NitroAudioRecorderService();
