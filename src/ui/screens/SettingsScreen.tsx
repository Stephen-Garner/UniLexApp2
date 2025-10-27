import React, { useEffect, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSettingsStore } from '../../state/settings.store';
import { youTubeService, aiTutorService } from '../../services/container';
import { useOfflineStore } from '../../state/offline.store';

const SettingsScreen: React.FC = () => {
  const {
    dailyGoalMinutes,
    theme,
    preferredVoiceId,
    voices,
    loadSettings,
    updateYoutubeApiKey,
    updateAiTutorApiKey,
    updateDailyGoalMinutes,
    updateTheme,
    updatePreferredVoice,
    refreshVoices,
  } = useSettingsStore();

  const isOffline = useOfflineStore(state => state.isOffline);
  const [youtubeDraft, setYoutubeDraft] = useState('');
  const [aiDraft, setAiDraft] = useState('');
  const [goalDraft, setGoalDraft] = useState(String(dailyGoalMinutes));

  useEffect(() => {
    const hydrate = async () => {
      await loadSettings();
      const state = useSettingsStore.getState();
      setYoutubeDraft(state.youtubeApiKey);
      setAiDraft(state.aiTutorApiKey);
      setGoalDraft(String(state.dailyGoalMinutes));
      await refreshVoices();
    };

    hydrate().catch(() => undefined);
  }, [loadSettings, refreshVoices]);

  const handleSave = async () => {
    try {
      await Promise.all([
        updateYoutubeApiKey(youtubeDraft.trim()),
        updateAiTutorApiKey(aiDraft.trim()),
        updateDailyGoalMinutes(Math.max(5, Number(goalDraft) || dailyGoalMinutes)),
      ]);
      Alert.alert('Settings saved');
    } catch (error) {
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'Unable to save settings.',
      );
    }
  };

  const handleTestYoutubeKey = async () => {
    if (isOffline) {
      Alert.alert('Offline', 'Connect to the internet to test the YouTube key.');
      return;
    }

    try {
      await updateYoutubeApiKey(youtubeDraft.trim());
      await youTubeService.searchVideos({ query: 'language learning', limit: 1 });
      Alert.alert('Success', 'YouTube API key appears to be valid.');
    } catch (error) {
      Alert.alert(
        'Test failed',
        error instanceof Error ? error.message : 'Unable to verify YouTube key.',
      );
    }
  };

  const handleTestAiKey = async () => {
    try {
      await updateAiTutorApiKey(aiDraft.trim());
      await aiTutorService.translate({
        text: 'test',
        sourceLanguage: 'en',
        targetLanguage: 'ja',
      });
      Alert.alert('Success', 'AI tutor key saved.');
    } catch (error) {
      Alert.alert(
        'Test failed',
        error instanceof Error ? error.message : 'Unable to verify AI tutor key.',
      );
    }
  };

  const handleRefreshVoices = async () => {
    try {
      await refreshVoices();
      Alert.alert('Voices updated');
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Unable to refresh voices.');
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Settings</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>API Keys</Text>
        <Text style={styles.label}>YouTube API key</Text>
        <TextInput
          style={styles.input}
          value={youtubeDraft}
          autoCapitalize="none"
          onChangeText={setYoutubeDraft}
          placeholder="Enter YouTube API key"
        />
        <TouchableOpacity style={styles.button} onPress={handleTestYoutubeKey}>
          <Text style={styles.buttonLabel}>Test YouTube Key</Text>
        </TouchableOpacity>

        <Text style={styles.label}>AI Tutor API key</Text>
        <TextInput
          style={styles.input}
          value={aiDraft}
          autoCapitalize="none"
          onChangeText={setAiDraft}
          placeholder="Enter AI Tutor API key"
        />
        <TouchableOpacity style={styles.button} onPress={handleTestAiKey}>
          <Text style={styles.buttonLabel}>Test AI Tutor Key</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Goals</Text>
        <Text style={styles.label}>Daily goal (minutes)</Text>
        <TextInput
          style={styles.input}
          value={goalDraft}
          keyboardType="numeric"
          onChangeText={setGoalDraft}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Appearance</Text>
        <View style={styles.themeRow}>
          {(['system', 'light', 'dark'] as const).map(option => (
            <TouchableOpacity
              key={option}
              style={[styles.themeChip, theme === option && styles.themeChipActive]}
              onPress={() => updateTheme(option)}
            >
              <Text style={[styles.themeLabel, theme === option && styles.themeLabelActive]}>
                {option.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Voices</Text>
        <TouchableOpacity style={styles.button} onPress={handleRefreshVoices}>
          <Text style={styles.buttonLabel}>Refresh Voices</Text>
        </TouchableOpacity>
        {voices.length === 0 ? (
          <Text style={styles.placeholder}>No voices available.</Text>
        ) : (
          voices.map(voice => (
            <TouchableOpacity
              key={voice.id}
              style={[styles.voiceRow, preferredVoiceId === voice.id && styles.voiceRowActive]}
              onPress={() => updatePreferredVoice(voice.id)}
            >
              <Text style={styles.voiceName}>{voice.name ?? voice.id}</Text>
              {preferredVoiceId === voice.id ? <Text style={styles.voiceActive}>Selected</Text> : null}
            </TouchableOpacity>
          ))
        )}
      </View>

      <TouchableOpacity style={styles.primaryButton} onPress={handleSave}>
        <Text style={styles.primaryButtonLabel}>Save Settings</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 24,
    backgroundColor: '#ffffff',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  label: {
    fontWeight: '600',
    color: '#1f2937',
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
  },
  button: {
    alignSelf: 'flex-start',
    backgroundColor: '#2563eb',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  buttonLabel: {
    color: '#ffffff',
    fontWeight: '600',
  },
  primaryButton: {
    backgroundColor: '#059669',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  primaryButtonLabel: {
    color: '#ffffff',
    fontWeight: '600',
  },
  themeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  themeChip: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  themeChipActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  themeLabel: {
    color: '#1f2937',
    fontWeight: '600',
  },
  themeLabelActive: {
    color: '#ffffff',
  },
  voiceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
  },
  voiceRowActive: {
    backgroundColor: '#dbeafe',
    borderRadius: 8,
    paddingHorizontal: 8,
  },
  voiceName: {
    color: '#111827',
    flex: 1,
  },
  voiceActive: {
    color: '#2563eb',
    fontWeight: '600',
  },
  placeholder: {
    color: '#6b7280',
  },
});

export default SettingsScreen;
