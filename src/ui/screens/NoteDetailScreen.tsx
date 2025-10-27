import React, { useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useNotesStore } from '../../state/notes.store';
import { useBankStore } from '../../state/bank.store';
import type { TranslatorStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<TranslatorStackParamList, 'NoteDetail'>;

const NoteDetailScreen: React.FC<Props> = ({ route, navigation }) => {
  const { noteId } = route.params;

  const note = useNotesStore(state => state.findNote(noteId));
  const updateNoteContent = useNotesStore(state => state.updateNoteContent);
  const deleteNote = useNotesStore(state => state.deleteNote);
  const loadNotes = useNotesStore(state => state.loadNotes);

  const bankItems = useBankStore(state => state.items);
  const loadBank = useBankStore(state => state.loadBank);

  const [editedContent, setEditedContent] = useState(note?.content ?? '');
  const [isEditing, setIsEditing] = useState(false);

  React.useEffect(() => {
    if (!note) {
      loadNotes().catch(() => undefined);
    }
    if (bankItems.length === 0) {
      loadBank().catch(() => undefined);
    }
  }, [note, loadNotes, bankItems.length, loadBank]);

  React.useEffect(() => {
    if (note) {
      setEditedContent(note.content);
    }
  }, [note]);

  const linkedItem = useMemo(
    () => bankItems.find(item => item.id === note?.vocabItemId) ?? null,
    [bankItems, note?.vocabItemId],
  );

  if (!note) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyText}>Note not found.</Text>
      </View>
    );
  }

  const handleSave = async () => {
    if (!editedContent.trim()) {
      Alert.alert('Note content cannot be empty.');
      return;
    }

    try {
      await updateNoteContent(note.id, editedContent.trim());
      setIsEditing(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update note.';
      Alert.alert('Error', message);
    }
  };

  const handleDelete = async () => {
    Alert.alert('Delete note', 'Are you sure you want to delete this note?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteNote(note.id);
            navigation.goBack();
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to delete note.';
            Alert.alert('Error', message);
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.label}>Linked vocabulary</Text>
        {linkedItem ? (
          <TouchableOpacity
            style={styles.linkedCard}
            onPress={() =>
              navigation.navigate('BankDetail', { itemId: linkedItem.id })
            }
          >
            <Text style={styles.linkedTerm}>{linkedItem.term}</Text>
            <Text style={styles.linkedMeaning}>{linkedItem.meaning}</Text>
            <Text style={styles.linkedAction}>View vocabulary details</Text>
          </TouchableOpacity>
        ) : (
          <Text style={styles.placeholder}>Vocabulary unavailable.</Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Content</Text>
        {isEditing ? (
          <TextInput
            style={[styles.input, styles.multiline]}
            value={editedContent}
            onChangeText={setEditedContent}
            multiline
          />
        ) : (
          <Text style={styles.contentText}>{note.content}</Text>
        )}
      </View>

      {note.answer ? (
        <View style={styles.section}>
          <Text style={styles.label}>Answer</Text>
          <Text style={styles.answerText}>{note.answer}</Text>
        </View>
      ) : null}

      <View style={styles.actionsRow}>
        {isEditing ? (
          <>
            <TouchableOpacity style={styles.primaryButton} onPress={handleSave}>
              <Text style={styles.primaryButtonLabel}>Save</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => {
                setEditedContent(note.content);
                setIsEditing(false);
              }}
            >
              <Text style={styles.secondaryButtonLabel}>Cancel</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity style={styles.primaryButton} onPress={() => setIsEditing(true)}>
            <Text style={styles.primaryButtonLabel}>Edit</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.dangerButton} onPress={handleDelete}>
          <Text style={styles.dangerButtonLabel}>Delete</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.metaRow}>
        <Text style={styles.metaText}>Created: {note.createdAt}</Text>
        <Text style={styles.metaText}>Updated: {note.updatedAt}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    padding: 16,
    gap: 20,
  },
  section: {
    gap: 8,
  },
  label: {
    fontWeight: '600',
    color: '#1f2937',
  },
  placeholder: {
    color: '#6b7280',
  },
  linkedCard: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    padding: 12,
    backgroundColor: '#f9fafb',
    gap: 4,
  },
  linkedTerm: {
    fontWeight: '600',
    color: '#111827',
  },
  linkedMeaning: {
    color: '#4b5563',
  },
  linkedAction: {
    color: '#2563eb',
    fontWeight: '600',
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
    minHeight: 160,
    textAlignVertical: 'top',
  },
  contentText: {
    color: '#111827',
    lineHeight: 22,
  },
  answerText: {
    color: '#047857',
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
  primaryButtonLabel: {
    color: '#ffffff',
    fontWeight: '600',
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#e5e7eb',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  secondaryButtonLabel: {
    color: '#111827',
    fontWeight: '600',
  },
  dangerButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#dc2626',
  },
  dangerButtonLabel: {
    color: '#ffffff',
    fontWeight: '600',
  },
  metaRow: {
    gap: 4,
  },
  metaText: {
    color: '#6b7280',
    fontSize: 12,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: '#6b7280',
  },
});

export default NoteDetailScreen;
