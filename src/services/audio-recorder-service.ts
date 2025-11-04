import { NativeModules, PermissionsAndroid, Platform } from 'react-native';
import { nanoid } from 'nanoid/non-secure';
import type { AudioRecorderService } from '../contracts/services';
import { Buffer } from 'buffer';
type CreateSoundFactory = typeof import('react-native-nitro-sound')['createSound'];
type RnfsModule = typeof import('react-native-fs');

interface RecordingSession {
  path: string;
  createdAt: number;
}

const AUDIO_FILENAME = (id: string) => `rec-${id}.m4a`;

const ensureDirectoryExists = async (fs: RnfsModule, path: string) => {
  const exists = await fs.exists(path);
  if (!exists) {
    await fs.mkdir(path);
  }
};

const getRecordingDirectory = async (fs: RnfsModule): Promise<string> => {
  const basePath = Platform.select({
    ios: fs.CachesDirectoryPath,
    android: fs.CachesDirectoryPath,
    default: fs.CachesDirectoryPath,
  });

  const directory = `${basePath}/unilex-recordings`;
  await ensureDirectoryExists(fs, directory);
  return directory;
};

const base64ToArrayBuffer = (base64: string): ArrayBuffer => {
  const buffer = Buffer.from(base64, 'base64');
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
};

type NitroSoundInstance = ReturnType<CreateSoundFactory>;

const resolveSoundFactory = (): CreateSoundFactory | undefined => {
  try {
    const module = require('react-native-nitro-sound');
    return module.createSound as CreateSoundFactory;
  } catch (error) {
    if (__DEV__) {
      console.warn(
        'react-native-nitro-sound is unavailable; audio recording features will be disabled.',
        error,
      );
    }
    return undefined;
  }
};

const instantiateSound = (factory: CreateSoundFactory | undefined): NitroSoundInstance | undefined => {
  if (!factory) {
    return undefined;
  }

  try {
    return factory();
  } catch (error) {
    if (__DEV__) {
      console.warn('Failed to instantiate Nitro sound engine; falling back to no-op implementation.', error);
    }
    return undefined;
  }
};

const soundFactory = resolveSoundFactory();
let cachedFsModule: RnfsModule | null | undefined;
let hasWarnedFsUnavailable = false;

const isFsNativeModuleAvailable = () => NativeModules?.RNFSManager != null;

const resolveFsModule = (): RnfsModule | undefined => {
  if (cachedFsModule !== undefined) {
    return cachedFsModule ?? undefined;
  }

  if (!isFsNativeModuleAvailable()) {
    cachedFsModule = null;
    if (__DEV__ && !hasWarnedFsUnavailable) {
      console.warn('react-native-fs native module is unavailable; audio recording features will be disabled.');
      hasWarnedFsUnavailable = true;
    }
    return undefined;
  }

  try {
    cachedFsModule = require('react-native-fs') as RnfsModule;
    return cachedFsModule;
  } catch (error) {
    cachedFsModule = null;
    if (__DEV__ && !hasWarnedFsUnavailable) {
      console.warn(
        'Failed to load react-native-fs; audio recording features will be disabled.',
        error,
      );
      hasWarnedFsUnavailable = true;
    }
    return undefined;
  }
};

export class NitroAudioRecorderService implements AudioRecorderService {
  constructor(
    private readonly sound: NitroSoundInstance,
    private readonly fs: RnfsModule,
  ) {
    this.sound.setSubscriptionDuration?.(0.1);
  }

  private readonly sessions = new Map<string, RecordingSession>();

  private activeSessionId: string | null = null;

  private recordingState = false;

  async startRecording(): Promise<string> {
    if (this.recordingState) {
      throw new Error('A recording session is already active.');
    }

    await this.ensurePermission();

    const directory = await getRecordingDirectory(this.fs);
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

    const base64 = await this.fs.readFile(session.path, 'base64');
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
    const exists = await this.fs.exists(session.path);
    return exists ? session.path : null;
  }

  async cleanupRecording(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return;
    }
    try {
      const exists = await this.fs.exists(session.path);
      if (exists) {
        await this.fs.unlink(session.path);
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

class NoopAudioRecorderService implements AudioRecorderService {
  private buildError(): Error {
    return new Error('Audio recording is unavailable on this device.');
  }

  async startRecording(): Promise<string> {
    throw this.buildError();
  }

  async stopRecording(_sessionId: string): Promise<ArrayBuffer> {
    throw this.buildError();
  }

  async pauseRecording(_sessionId: string): Promise<void> {
    // noop
  }

  async resumeRecording(_sessionId: string): Promise<void> {
    // noop
  }

  async isRecording(_sessionId: string): Promise<boolean> {
    return false;
  }

  async getRecordingUri(_sessionId: string): Promise<string | null> {
    return null;
  }

  async cleanupRecording(_sessionId: string): Promise<void> {
    // noop
  }
}

const soundInstance = instantiateSound(soundFactory);

const fsModule = resolveFsModule();

export const audioRecorderService: AudioRecorderService = soundInstance && fsModule
  ? new NitroAudioRecorderService(soundInstance, fsModule)
  : new NoopAudioRecorderService();
