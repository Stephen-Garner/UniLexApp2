import Tts from 'react-native-tts';
import type { TtsService } from '../contracts/services';

const DEFAULT_SPEECH_RATE = 0.5;
const DEFAULT_PITCH = 1.0;

export class ReactNativeTtsService implements TtsService {
  async synthesizeSpeech(params: {
    text: string;
    voiceId: string;
    speakingRate?: number;
  }): Promise<ArrayBuffer> {
    const { text } = params;
    if (!text.trim()) {
      throw new Error('Text must be provided for synthesis.');
    }

    throw new Error('Offline synthesis is not supported on this platform.');
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
    await Tts.speak(text);
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
