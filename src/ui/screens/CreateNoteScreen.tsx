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
import { useNotesStore } from '../../state/notes.store';
import { useBankStore } from '../../state/bank.store';
import type { TranslatorStackParamList } from '../../App';

type Props = NativeStackScreenProps<TranslatorStackParamList, 'CreateNote'>;

const CreateNoteScreen: React.FC<Props> = ({ navigation }) => {
  const createNote = useNotesStore(state => state.createNote);
  const isLoading = useNotesStore(state => state.isLoading);
  const bankItems = useBankStore(state => state.items);
  const loadBank = useBankStore(state => state.loadBank);

  const [content, setContent] = useState('');
  const [sourceLanguage, setSourceLanguage] = useState('en');
  const [vocabSearch, setVocabSearch] = useState('');
  const [selectedVocabId, setSelectedVocabId] = useState<string | undefined>();

  React.useEffect(() => {
    if (bankItems.length === 0) {
      void loadBank();
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

  const handleCreate = async () => {
    if (!selectedVocabId) {
      Alert.alert('Select a vocabulary item before saving.');
      return;
    }

    if (!content.trim()) {
      Alert.alert('Note content cannot be empty.');
      return;
    }

    try {
      const note = await createNote({
        vocabItemId: selectedVocabId,
        sourceLanguage: sourceLanguage.trim() || 'en',
        content: content.trim(),
      });
      navigation.replace('NoteDetail', { noteId: note.id });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create note.';
      Alert.alert('Error', message);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.label}>Source language</Text>
      <TextInput
        style={styles.input}
        value={sourceLanguage}
        onChangeText={setSourceLanguage}
        autoCapitalize="none"
      />

      <Text style={styles.label}>Content</Text>
      <TextInput
        style={[styles.input, styles.multiline]}
        value={content}
        onChangeText={setContent}
        placeholder="Write your note here"
        multiline
      />

      <Text style={styles.label}>Link to vocabulary item</Text>
      <TextInput
        style={styles.input}
        placeholder="Search vocabulary…"
        value={vocabSearch}
        onChangeText={setVocabSearch}
      />

      <View style={styles.listContainer}>
        {filteredBankItems.map(item => {
          const isSelected = item.id === selectedVocabId;
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

      <TouchableOpacity
        style={[styles.primaryButton, isLoading && styles.primaryButtonDisabled]}
        onPress={handleCreate}
        disabled={isLoading}
      >
        <Text style={styles.primaryButtonLabel}>
          {isLoading ? 'Saving…' : 'Save note'}
        </Text>
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
    backgroundColor: '#f9fafb',
    gap: 4,
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
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonLabel: {
    color: '#ffffff',
    fontWeight: '600',
  },
});

export default CreateNoteScreen;
