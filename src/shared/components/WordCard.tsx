import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { VocabItem } from '../../contracts/models';
import { audioRecorderService, ttsService } from '../../services/container';
import { fontFamilies } from '../theme/tokens';

type CreateSoundFactory = typeof import('react-native-nitro-sound')['createSound'];

interface WordCardProps {
  /** Vocabulary item whose details should be displayed. */
  item: VocabItem;
}

type NitroSoundInstance = ReturnType<CreateSoundFactory>;

let createSoundFactory: CreateSoundFactory | undefined;
try {
  createSoundFactory = require('react-native-nitro-sound').createSound as CreateSoundFactory;
} catch (error) {
  if (__DEV__) {
    console.warn('react-native-nitro-sound is unavailable; recording controls will be disabled.', error);
  }
}

const produceSoundInstance = (): NitroSoundInstance | null => {
  if (!createSoundFactory) {
    return null;
  }

  try {
    return createSoundFactory();
  } catch (error) {
    console.warn('Failed to initialise Nitro sound instance.', error);
    return null;
  }
};

const WordCard: React.FC<WordCardProps> = ({ item }) => {
  const [recordingSessionId, setRecordingSessionId] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingUri, setRecordingUri] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const playerRef = useRef<NitroSoundInstance | null>(null);
  const audioUnavailable = createSoundFactory == null;

  const stopPlayback = useCallback(async () => {
    try {
      await playerRef.current?.stopPlayer();
    } catch (error) {
      console.warn('Failed to stop playback', error);
    }
    playerRef.current?.removePlaybackEndListener?.();
    playerRef.current = null;
    setIsPlaying(false);
  }, []);

  useEffect(() => {
    return () => {
      if (recordingSessionId) {
        audioRecorderService
          .cleanupRecording(recordingSessionId)
          .catch(() => undefined);
      }
      stopPlayback().catch(() => undefined);
    };
  }, [recordingSessionId, stopPlayback]);

  const handleSpeak = async () => {
    try {
      await ttsService.speak({
        text: item.term,
      });
    } catch (error) {
      console.warn('Failed to speak word', error);
    }
  };

  const handleRecordPress = async () => {
    try {
      if (audioUnavailable) {
        console.warn('Recording unavailable: sound engine not initialised.');
        return;
      }
      if (!isRecording) {
        if (recordingSessionId) {
          await audioRecorderService.cleanupRecording(recordingSessionId);
          setRecordingUri(null);
        }
        const sessionId = await audioRecorderService.startRecording();
        setRecordingSessionId(sessionId);
        setIsRecording(true);
      } else if (recordingSessionId) {
        await audioRecorderService.stopRecording(recordingSessionId);
        const uri = await audioRecorderService.getRecordingUri(recordingSessionId);
        setRecordingUri(uri);
        setIsRecording(false);
      }
    } catch (error) {
      console.warn('Recording error', error);
      setIsRecording(false);
    }
  };

  const handlePlayPress = async () => {
    if (!recordingUri || audioUnavailable) {
      if (audioUnavailable) {
        console.warn('Playback unavailable: sound engine not initialised.');
      }
      return;
    }

    if (isPlaying) {
      await stopPlayback();
      return;
    }

    try {
      const player = produceSoundInstance();
      if (!player) {
        return;
      }
      player.addPlaybackEndListener(() => {
        setIsPlaying(false);
        player.removePlaybackEndListener();
      });
      playerRef.current = player;
      setIsPlaying(true);
      await player.startPlayer(recordingUri);
    } catch (error) {
      console.warn('Playback error', error);
      setIsPlaying(false);
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.term}>{item.term}</Text>
        {item.reading ? <Text style={styles.reading}>{item.reading}</Text> : null}
      </View>
      <Text style={styles.meaning}>{item.meaning}</Text>
      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.secondaryButton} onPress={handleSpeak}>
          <Text style={styles.secondaryButtonLabel}>Speak</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.primaryButton,
            isRecording && styles.warningButton,
            audioUnavailable && styles.disabledButton,
          ]}
          onPress={handleRecordPress}
          disabled={audioUnavailable}
        >
          <Text style={styles.primaryButtonLabel}>
            {isRecording ? 'Stop' : 'Record'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.secondaryButton,
            (!recordingUri || audioUnavailable) && styles.disabledButton,
          ]}
          onPress={handlePlayPress}
          disabled={!recordingUri || audioUnavailable}
        >
          <Text style={styles.secondaryButtonLabel}>
            {isPlaying ? 'Stop' : 'Play'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 16,
    gap: 12,
    backgroundColor: '#f9fafb',
  },
  header: {
    gap: 4,
  },
  term: {
    fontSize: 22,
    lineHeight: 28,
    fontFamily: fontFamilies.serif.semibold,
    color: '#111827',
  },
  reading: {
    fontSize: 16,
    color: '#4b5563',
  },
  meaning: {
    color: '#1f2937',
    fontFamily: fontFamilies.sans.medium,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: '#2563eb',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  warningButton: {
    backgroundColor: '#dc2626',
  },
  primaryButtonLabel: {
    color: '#ffffff',
    fontFamily: fontFamilies.sans.semibold,
  },
  secondaryButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#2563eb',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryButtonLabel: {
    color: '#2563eb',
    fontFamily: fontFamilies.sans.semibold,
  },
  disabledButton: {
    opacity: 0.5,
  },
});

export default WordCard;
