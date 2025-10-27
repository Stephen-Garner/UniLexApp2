import React, { useMemo, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { VideosStackParamList } from '../../navigation/types';
import { useNotesStore } from '../../state/notes.store';
import { useBankStore } from '../../state/bank.store';

type Props = NativeStackScreenProps<VideosStackParamList, 'AddTimestamp'>;

const parseTimestampToSeconds = (input: string): number | null => {
  const trimmed = input.trim();
  if (!trimmed) {
    return null;
  }

  if (/^\d+$/.test(trimmed)) {
    return Number(trimmed);
  }

  const parts = trimmed.split(':').map(part => Number(part));
  if (parts.some(part => Number.isNaN(part))) {
    return null;
  }

  if (parts.length === 2) {
    const [minutes, seconds] = parts;
    return minutes * 60 + seconds;
  }

  if (parts.length === 3) {
    const [hours, minutes, seconds] = parts;
    return hours * 3600 + minutes * 60 + seconds;
  }

  return null;
};

const AddTimestampScreen: React.FC<Props> = ({ route, navigation }) => {
  const { videoId } = route.params;
  const createNote = useNotesStore(state => state.createNote);
  const bankItems = useBankStore(state => state.items);
  const loadBank = useBankStore(state => state.loadBank);

  const [timestampInput, setTimestampInput] = useState('');
  const [content, setContent] = useState('');
  const [language, setLanguage] = useState('en');
  const [vocabSearch, setVocabSearch] = useState('');
  const [selectedVocabId, setSelectedVocabId] = useState<string | undefined>();

  React.useEffect(() => {
    if (bankItems.length === 0) {
      loadBank().catch(() => undefined);
    }
  }, [bankItems.length, loadBank]);

  const filteredBankItems = useMemo(() => {
    const query = vocabSearch.trim().toLowerCase();
    if (!query) {
      return bankItems;
    }
    return bankItems.filter(item =>
      [item.term, item.meaning]
        .join(' ')
        .toLowerCase()
        .includes(query),
    );
  }, [bankItems, vocabSearch]);

  const handleSave = async () => {
    const timestampSeconds = parseTimestampToSeconds(timestampInput);
    if (timestampSeconds == null) {
      Alert.alert('Invalid timestamp', 'Use seconds or hh:mm:ss format.');
      return;
    }

    if (!selectedVocabId) {
      Alert.alert('Select a vocabulary item before saving.');
      return;
    }

    if (!content.trim()) {
      Alert.alert('Note content cannot be empty.');
      return;
    }

    try {
      await createNote({
        vocabItemId: selectedVocabId,
        sourceLanguage: language.trim() || 'en',
        content: content.trim(),
        videoId,
        timestampSeconds,
      });
      navigation.goBack();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create timestamp note.';
      Alert.alert('Error', message);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.label}>Timestamp</Text>
      <TextInput
        style={styles.input}
        placeholder="mm:ss or seconds"
        value={timestampInput}
        onChangeText={setTimestampInput}
      />

      <Text style={styles.label}>Content</Text>
      <TextInput
        style={[styles.input, styles.multiline]}
        value={content}
        onChangeText={setContent}
        placeholder="Describe what happens at this timestamp"
        multiline
      />

      <Text style={styles.label}>Source language</Text>
      <TextInput
        style={styles.input}
        value={language}
        onChangeText={setLanguage}
        autoCapitalize="none"
      />

      <Text style={styles.label}>Link vocabulary</Text>
      <TextInput
        style={styles.input}
        placeholder="Search vocabulary…"
        value={vocabSearch}
        onChangeText={setVocabSearch}
      />

      <View style={styles.listContainer}>
        {filteredBankItems.map(item => {
          const isSelected = selectedVocabId === item.id;
          return (
            <TouchableOpacity
              key={item.id}
              style={[styles.itemRow, isSelected && styles.itemRowSelected]}
              onPress={() => setSelectedVocabId(item.id)}
            >
              <Text style={styles.itemTerm}>{item.term}</Text>
              <Text style={styles.itemMeaning}>{item.meaning}</Text>
            </TouchableOpacity>
          );
        })}
        {filteredBankItems.length === 0 ? (
          <Text style={styles.emptyList}>No matching vocabulary items.</Text>
        ) : null}
      </View>

      <TouchableOpacity style={styles.primaryButton} onPress={handleSave}>
        <Text style={styles.primaryButtonLabel}>Save timestamp note</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#ffffff',
    gap: 16,
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
  multiline: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  listContainer: {
    gap: 12,
  },
  itemRow: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    padding: 12,
    gap: 4,
    backgroundColor: '#f9fafb',
  },
  itemRowSelected: {
    borderColor: '#2563eb',
    backgroundColor: '#dbeafe',
  },
  itemTerm: {
    fontWeight: '600',
    color: '#111827',
  },
  itemMeaning: {
    color: '#4b5563',
  },
  emptyList: {
    textAlign: 'center',
    color: '#6b7280',
  },
  primaryButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  primaryButtonLabel: {
    color: '#ffffff',
    fontWeight: '600',
  },
});

export default AddTimestampScreen;
