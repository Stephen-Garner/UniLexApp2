import React, { useEffect, useMemo } from 'react';
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
import { useNotesStore } from '../../state/notes.store';
import { useBankStore } from '../../state/bank.store';
import type { TranslatorStackParamList } from '../../App';

type Props = NativeStackScreenProps<TranslatorStackParamList, 'NotesList'>;

const NotesListScreen: React.FC<Props> = ({ navigation }) => {
  const loadNotes = useNotesStore(state => state.loadNotes);
  const setQuery = useNotesStore(state => state.setQuery);
  const setUnansweredOnly = useNotesStore(state => state.setUnansweredOnly);
  const getFilteredNotes = useNotesStore(state => state.getFilteredNotes);
  const query = useNotesStore(state => state.query);
  const unansweredOnly = useNotesStore(state => state.unansweredOnly);
  const isLoading = useNotesStore(state => state.isLoading);
  const error = useNotesStore(state => state.error);

  const bankItems = useBankStore(state => state.items);
  const loadBank = useBankStore(state => state.loadBank);

  const notes = getFilteredNotes();

  useEffect(() => {
    void loadNotes();
    void loadBank();
  }, [loadNotes, loadBank]);

  const vocabLabelMap = useMemo(() => {
    return bankItems.reduce<Record<string, string>>((acc, item) => {
      acc[item.id] = item.term;
      return acc;
    }, {});
  }, [bankItems]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Notes</Text>
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => navigation.navigate('CreateNote')}
        >
          <Text style={styles.createButtonLabel}>New note</Text>
        </TouchableOpacity>
      </View>

      <TextInput
        style={styles.input}
        placeholder="Search notes…"
        value={query}
        onChangeText={setQuery}
      />

      <View style={styles.filtersRow}>
        <TouchableOpacity
          style={[styles.filterChip, !unansweredOnly && styles.filterChipActive]}
          onPress={() => setUnansweredOnly(false)}
        >
          <Text style={[styles.filterChipLabel, !unansweredOnly && styles.filterChipLabelActive]}>
            All
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterChip, unansweredOnly && styles.filterChipActive]}
          onPress={() => setUnansweredOnly(true)}
        >
          <Text style={[styles.filterChipLabel, unansweredOnly && styles.filterChipLabelActive]}>
            Unanswered
          </Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.centered}> 
          <ActivityIndicator />
        </View>
      ) : (
        <FlatList
          data={notes}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.centered}>
              <Text>No notes yet.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => navigation.navigate('NoteDetail', { noteId: item.id })}
            >
              <Text style={styles.noteContent} numberOfLines={3}>
                {item.content}
              </Text>
              <Text style={styles.noteMeta}>
                Linked term: {vocabLabelMap[item.vocabItemId] ?? 'Unknown'}
              </Text>
              {item.videoId ? (
                <Text style={styles.noteMeta}>
                  Video link · timestamp {item.timestampSeconds ?? 0}s
                </Text>
              ) : null}
              {item.answer ? <Text style={styles.answeredLabel}>Answered</Text> : null}
            </TouchableOpacity>
          )}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  createButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  createButtonLabel: {
    color: '#ffffff',
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  filtersRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  filterChipActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  filterChipLabel: {
    color: '#4b5563',
  },
  filterChipLabelActive: {
    color: '#ffffff',
    fontWeight: '600',
  },
  listContent: {
    gap: 12,
    paddingBottom: 24,
  },
  card: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    padding: 16,
    backgroundColor: '#f9fafb',
    gap: 6,
  },
  noteContent: {
    color: '#111827',
  },
  noteMeta: {
    color: '#6b7280',
  },
  answeredLabel: {
    alignSelf: 'flex-start',
    color: '#047857',
    fontWeight: '600',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    color: '#b91c1c',
    textAlign: 'center',
  },
});

export default NotesListScreen;
