import React, { useEffect } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useVideoStore } from '../../state/video.store';
import type { VideosStackParamList } from '../../App';

type Props = NativeStackScreenProps<VideosStackParamList, 'SavedVideos'>;

const formatDuration = (totalSeconds: number) => {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

const SavedVideosScreen: React.FC<Props> = ({ navigation }) => {
  const loadSavedVideos = useVideoStore(state => state.loadSavedVideos);
  const savedVideos = useVideoStore(state => state.savedVideos);
  const isLoading = useVideoStore(state => state.isLoadingSaved);
  const removeVideo = useVideoStore(state => state.removeVideo);
  const error = useVideoStore(state => state.error);

  useEffect(() => {
    void loadSavedVideos();
  }, [loadSavedVideos]);

  return (
    <View style={styles.container}>
      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator />
        </View>
      ) : (
        <FlatList
          data={savedVideos}
          keyExtractor={item => item.videoId}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <TouchableOpacity
                onPress={() => navigation.navigate('VideoDetail', { videoId: item.videoId })}
              >
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.meta}>{item.channelTitle}</Text>
                <Text style={styles.meta}>Duration: {formatDuration(item.durationSeconds)}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => void removeVideo(item.videoId)}
              >
                <Text style={styles.removeButtonLabel}>Remove</Text>
              </TouchableOpacity>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.centered}>
              <Text>No saved videos yet.</Text>
            </View>
          }
        />
      )}
      <TouchableOpacity
        style={styles.searchLink}
        onPress={() => navigation.navigate('YouTubeSearch')}
      >
        <Text style={styles.searchLinkLabel}>Search for more videos</Text>
      </TouchableOpacity>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    padding: 16,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    gap: 12,
    paddingBottom: 24,
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
  removeButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#dc2626',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  removeButtonLabel: {
    color: '#ffffff',
    fontWeight: '600',
  },
  errorText: {
    color: '#dc2626',
    textAlign: 'center',
    marginTop: 12,
  },
  searchLink: {
    marginTop: 16,
    alignSelf: 'center',
  },
  searchLinkLabel: {
    color: '#2563eb',
    fontWeight: '600',
  },
});

export default SavedVideosScreen;
