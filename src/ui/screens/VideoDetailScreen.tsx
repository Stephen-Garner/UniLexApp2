import React, { useEffect, useMemo, useState } from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { NavigationProp, ParamListBase } from '@react-navigation/native';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import type { YouTubeVideo } from '../../contracts/models';
import type { VideosStackParamList } from '../../navigation/types';
import { useVideoStore } from '../../state/video.store';
import { useNotesStore } from '../../state/notes.store';
import { useBankStore } from '../../state/bank.store';
import { youTubeService } from '../../services/container';

type Props = NativeStackScreenProps<VideosStackParamList, 'VideoDetail'>;

const formatDuration = (totalSeconds: number) => {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds
      .toString()
      .padStart(2, '0')}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

const formatTimestamp = (seconds: number | undefined) => {
  if (typeof seconds !== 'number') {
    return '—';
  }
  return formatDuration(seconds);
};

const VideoDetailScreen: React.FC<Props> = ({ route, navigation }) => {
  const { videoId } = route.params;

  const savedVideos = useVideoStore(state => state.savedVideos);
  const loadSavedVideos = useVideoStore(state => state.loadSavedVideos);

  const loadNotes = useNotesStore(state => state.loadNotes);
  const notes = useNotesStore(state => state.notes.filter(note => note.videoId === videoId));

  const bankItems = useBankStore(state => state.items);
  const loadBank = useBankStore(state => state.loadBank);

  const [video, setVideo] = useState<YouTubeVideo | null>(() =>
    savedVideos.find(item => item.videoId === videoId) ?? null,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    loadSavedVideos().catch(() => undefined);
    loadNotes().catch(() => undefined);
    loadBank().catch(() => undefined);
  }, [loadSavedVideos, loadNotes, loadBank]);

  useEffect(() => {
    const attempt = async () => {
      if (video) {
        return;
      }
      setIsLoading(true);
      setError(undefined);
      try {
        const info = await youTubeService.getVideoInfo(videoId);
        setVideo(info);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load video details.');
      } finally {
        setIsLoading(false);
      }
    };

    attempt().catch(() => undefined);
  }, [video, videoId]);

  useEffect(() => {
    const updated = savedVideos.find(item => item.videoId === videoId);
    if (updated) {
      setVideo(updated);
    }
  }, [savedVideos, videoId]);

  const noteRows = useMemo(() => {
    return notes
      .slice()
      .sort((a, b) => (a.timestampSeconds ?? 0) - (b.timestampSeconds ?? 0));
  }, [notes]);

  const vocabLookup = useMemo(() => {
    return bankItems.reduce<Record<string, string>>((acc, item) => {
      acc[item.id] = item.term;
      return acc;
    }, {});
  }, [bankItems]);

  if (isLoading && !video) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!video) {
    return (
      <View style={styles.centered}>
        <Text>{error ?? 'Video unavailable.'}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{video.title}</Text>
        <Text style={styles.meta}>{video.channelTitle}</Text>
        <Text style={styles.meta}>Duration: {formatDuration(video.durationSeconds)}</Text>
        <Text style={styles.meta}>Published: {video.publishedAt}</Text>
      </View>

      <TouchableOpacity
        style={styles.primaryButton}
        onPress={() => navigation.navigate('AddTimestamp', { videoId: video.videoId })}
      >
        <Text style={styles.primaryButtonLabel}>Add timestamp note</Text>
      </TouchableOpacity>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Timestamp notes</Text>
        {noteRows.length === 0 ? (
          <Text style={styles.placeholder}>No timestamp notes yet.</Text>
        ) : (
          noteRows.map(note => (
            <View key={note.id} style={styles.noteCard}>
              <Text style={styles.noteTimestamp}>{formatTimestamp(note.timestampSeconds)}</Text>
              <Text style={styles.noteContent}>{note.content}</Text>
              <View style={styles.noteMetaRow}>
                <Text style={styles.noteMeta}>
                  Linked term: {vocabLookup[note.vocabItemId] ?? 'Unknown'}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    const parentNavigator = navigation.getParent<NavigationProp<ParamListBase>>();
                    parentNavigator?.navigate('Translate', {
                      screen: 'BankDetail',
                      params: { itemId: note.vocabItemId },
                    });
                  }}
                >
                  <Text style={styles.noteLink}>View term</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    padding: 16,
    gap: 16,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    gap: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
  },
  meta: {
    color: '#6b7280',
  },
  primaryButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryButtonLabel: {
    color: '#ffffff',
    fontWeight: '600',
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontWeight: '700',
    color: '#111827',
  },
  placeholder: {
    color: '#6b7280',
  },
  noteCard: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    padding: 12,
    gap: 6,
    backgroundColor: '#f9fafb',
  },
  noteTimestamp: {
    fontWeight: '600',
    color: '#2563eb',
  },
  noteContent: {
    color: '#111827',
  },
  noteMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  noteMeta: {
    color: '#6b7280',
  },
  noteLink: {
    color: '#2563eb',
    fontWeight: '600',
  },
  errorText: {
    color: '#dc2626',
  },
});

export default VideoDetailScreen;
