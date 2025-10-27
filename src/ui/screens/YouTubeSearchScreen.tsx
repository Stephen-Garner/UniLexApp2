import React, { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useVideoStore } from '../../state/video.store';
import type { VideosStackParamList } from '../../App';
import { useOfflineStore } from '../../state/offline.store';

type Props = NativeStackScreenProps<VideosStackParamList, 'YouTubeSearch'>;

const formatDuration = (totalSeconds: number) => {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const parts = [minutes.toString().padStart(2, '0'), seconds.toString().padStart(2, '0')];
  if (hours > 0) {
    parts.unshift(hours.toString());
  }
  return parts.join(':');
};

const YouTubeSearchScreen: React.FC<Props> = ({ navigation }) => {
  const [query, setQuery] = useState('');
  const searchVideos = useVideoStore(state => state.searchVideos);
  const saveVideo = useVideoStore(state => state.saveVideo);
  const results = useVideoStore(state => state.searchResults);
  const isSearching = useVideoStore(state => state.isSearching);
  const error = useVideoStore(state => state.error);
  const isOffline = useOfflineStore(state => state.isOffline);

  const handleSearch = () => {
    if (isOffline) {
      return;
    }
    void searchVideos(query, { limit: 15 });
  };

  const handleSave = (videoId: string) => {
    const video = results.find(item => item.videoId === videoId);
    if (video) {
      void saveVideo(video);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchRow}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search YouTube…"
          style={styles.input}
          onSubmitEditing={handleSearch}
        />
        <TouchableOpacity
          style={[styles.searchButton, (isSearching || isOffline) && styles.searchButtonDisabled]}
          onPress={handleSearch}
          disabled={isSearching || isOffline}
        >
          <Text style={styles.searchButtonLabel}>Search</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity
        style={styles.linkButton}
        onPress={() => navigation.navigate('SavedVideos')}
      >
        <Text style={styles.linkLabel}>View saved videos</Text>
      </TouchableOpacity>
      {isOffline ? (
        <Text style={styles.offlineText}>
          Offline mode: saved videos are available, but search requires a connection.
        </Text>
      ) : null}

      {isSearching ? (
        <View style={styles.centered}>
          <ActivityIndicator />
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={item => item.videoId}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.meta}>{item.channelTitle}</Text>
              <Text style={styles.meta}>Duration: {formatDuration(item.durationSeconds)}</Text>
              <View style={styles.cardActions}>
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={() => navigation.navigate('VideoDetail', { videoId: item.videoId })}
                >
                  <Text style={styles.primaryButtonLabel}>View</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={() => handleSave(item.videoId)}
                >
                  <Text style={styles.secondaryButtonLabel}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.centered}>
              <Text>Search for study videos to get started.</Text>
            </View>
          }
        />
      )}

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    padding: 16,
    gap: 12,
  },
  searchRow: {
    flexDirection: 'row',
    gap: 8,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 16,
    borderRadius: 8,
    justifyContent: 'center',
  },
  searchButtonDisabled: {
    opacity: 0.5,
  },
  searchButtonLabel: {
    color: '#ffffff',
    fontWeight: '600',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkButton: {
    alignSelf: 'flex-start',
  },
  linkLabel: {
    color: '#2563eb',
    fontWeight: '600',
  },
  offlineText: {
    color: '#6b7280',
  },
  listContent: {
    gap: 12,
    paddingBottom: 32,
  },
  card: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 16,
    gap: 8,
    backgroundColor: '#f9fafb',
  },
  title: {
    fontWeight: '700',
    color: '#0f172a',
  },
  meta: {
    color: '#6b7280',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 12,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: '#2563eb',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryButtonLabel: {
    color: '#ffffff',
    fontWeight: '600',
  },
  secondaryButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#2563eb',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  secondaryButtonLabel: {
    color: '#2563eb',
    fontWeight: '600',
  },
  errorText: {
    color: '#dc2626',
    textAlign: 'center',
  },
});

export default YouTubeSearchScreen;
