import Tts from 'react-native-tts';
import RNFS from 'react-native-fs';
import { Buffer } from 'buffer';
import type { TtsService } from '../contracts/services';

const DEFAULT_SPEECH_RATE = 0.5;
const DEFAULT_PITCH = 1.0;

const base64ToArrayBuffer = (base64: string): ArrayBuffer => {
  const buffer = Buffer.from(base64, 'base64');
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
};

const temporaryTtsPath = async () => {
  const path = `${RNFS.CachesDirectoryPath}/tts-${Date.now()}.mp3`;
  return path;
};

export class ReactNativeTtsService implements TtsService {
  async synthesizeSpeech(params: {
    text: string;
    voiceId: string;
    speakingRate?: number;
  }): Promise<ArrayBuffer> {
    const { text, voiceId, speakingRate } = params;
    if (!text.trim()) {
      throw new Error('Text must be provided for synthesis.');
    }

    await Tts.setDefaultVoice(voiceId);
    if (speakingRate) {
      await Tts.setDefaultRate(speakingRate, true);
    }

    const targetPath = await temporaryTtsPath();
    await Tts.synthesizeToFile(text, { voice: voiceId }, targetPath);

    const base64 = await RNFS.readFile(targetPath, 'base64');
    await RNFS.unlink(targetPath).catch(() => undefined);
    return base64ToArrayBuffer(base64);
  }

  async listVoices(): Promise<string[]> {
    const voices = await Tts.voices();
    return voices.map(voice => voice.id);
  }

  async speak(params: {
    text: string;
    voiceId?: string;
    languageCode?: string;
    rate?: number;
    pitch?: number;
  }): Promise<void> {
    const { text, voiceId, languageCode, rate, pitch } = params;
    if (!text.trim()) {
      return;
    }

    if (languageCode) {
      try {
        await Tts.setDefaultLanguage(languageCode);
      } catch (error) {
        console.warn('Failed to set TTS language', error);
      }
    }

    if (voiceId) {
      try {
        await Tts.setDefaultVoice(voiceId);
      } catch (error) {
        console.warn('Failed to set TTS voice', error);
      }
    }

    await Tts.setDefaultRate(rate ?? DEFAULT_SPEECH_RATE, true);
    await Tts.setDefaultPitch(pitch ?? DEFAULT_PITCH);
    await Tts.speak(text, { voice: voiceId });
  }

  async stop(): Promise<void> {
    await Tts.stop();
  }

  async getVoices(): Promise<Array<{ id: string; name?: string }>> {
    const voices = await Tts.voices();
    return voices.map(voice => ({ id: voice.id, name: voice.name }));
  }
}

export const ttsService = new ReactNativeTtsService();
