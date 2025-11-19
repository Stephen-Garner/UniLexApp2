import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { MainTabsParamList, RootStackParamList } from '@/navigation/types';
import { useNotesStore } from '@/state/notes.store';
import { useBankStore } from '@/state/bank.store';
import { colors, spacing, radii, typography, shadows, fontFamilies } from '@/shared/theme/tokens';
import ScreenContainer from '@/shared/components/ScreenContainer';

type Props = NativeStackScreenProps<RootStackParamList, 'NoteDetail'>;

const NoteDetailScreen: React.FC<Props> = ({ route, navigation }) => {
  const { noteId } = route.params;
  const [isEditing, setIsEditing] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [contentDraft, setContentDraft] = useState('');
  const [statusUpdating, setStatusUpdating] = useState(false);

  const note = useNotesStore(state => state.findNote(noteId));
  const updateNoteContent = useNotesStore(state => state.updateNoteContent);
  const setNoteAnswered = useNotesStore(state => state.setNoteAnswered);
  const deleteNote = useNotesStore(state => state.deleteNote);
  const loadNotes = useNotesStore(state => state.loadNotes);

  const { items, loadBank } = useBankStore();

  useEffect(() => {
    if (!note) {
      loadNotes().catch(() => undefined);
    }
    if (items.length === 0) {
      loadBank().catch(() => undefined);
    }
  }, [note, loadNotes, items.length, loadBank]);

  useEffect(() => {
    if (note) {
      setTitleDraft(note.title);
      setContentDraft(note.content);
    }
  }, [note]);

  const linkedItem = useMemo(
    () => items.find(item => item.id === note?.vocabItemId),
    [items, note?.vocabItemId],
  );

  if (!note) {
    return (
      <ScreenContainer style={styles.safeArea}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Note not found locally.</Text>
        </View>
      </ScreenContainer>
    );
  }

  const handleSave = async () => {
    const trimmedTitle = titleDraft.trim();
    const trimmedContent = contentDraft.trim();
    if (!trimmedContent) {
      Alert.alert('Content cannot be empty.');
      return;
    }
    try {
      await updateNoteContent(note.id, {
        title: trimmedTitle,
        content: trimmedContent,
      });
      setIsEditing(false);
    } catch (error) {
      Alert.alert('Unable to update note', error instanceof Error ? error.message : '');
    }
  };

  const handleDelete = () => {
    Alert.alert('Delete note?', 'This action removes the note permanently.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteNote(note.id);
            navigation.goBack();
          } catch (error) {
            Alert.alert('Unable to delete', error instanceof Error ? error.message : '');
          }
        },
      },
    ]);
  };

  const handleToggleAnswered = async () => {
    if (statusUpdating) {
      return;
    }
    setStatusUpdating(true);
    try {
      await setNoteAnswered(note.id, !note.answeredAt);
    } catch (error) {
      Alert.alert(
        'Unable to update status',
        error instanceof Error ? error.message : 'Please try again in a moment.',
      );
    } finally {
      setStatusUpdating(false);
    }
  };

  const isAnswered = Boolean(note.answeredAt);
  const statusLabel = isAnswered ? 'Answered' : 'Unanswered';
  const statusTimestamp = isAnswered && note.answeredAt
    ? `Answered ${new Date(note.answeredAt).toLocaleString()}`
    : 'Awaiting response';

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation
      .getParent<BottomTabNavigationProp<MainTabsParamList>>()
      ?.navigate('NativeNotes');
  };

  return (
    <ScreenContainer style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.navRow}>
          <Pressable
            onPress={handleBack}
            style={({ pressed }) => [
              styles.backButton,
              pressed && styles.backButtonPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Go back to Native Notes"
          >
            <Text style={styles.backButtonLabel}>Back</Text>
          </Pressable>
          <Text style={styles.navTitle}>Native note</Text>
          <View style={styles.navSpacer} />
        </View>
        <View style={styles.headerCard}>
          <Pressable
            onPress={handleToggleAnswered}
            style={[
              styles.statusToggleButton,
              isAnswered ? styles.statusToggleButtonAnswered : styles.statusToggleButtonUnanswered,
              statusUpdating && styles.statusToggleButtonDisabled,
            ]}
            disabled={statusUpdating}
          >
            <Text style={styles.statusToggleLabel}>{statusLabel}</Text>
          </Pressable>
          <Text style={styles.statusMeta}>{statusTimestamp}</Text>
          <Text style={styles.timestamp}>
            Created {new Date(note.createdAt).toLocaleString()}
          </Text>
          <Text style={styles.timestamp}>
            Updated {new Date(note.updatedAt).toLocaleString()}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Title</Text>
          {isEditing ? (
            <TextInput
              value={titleDraft}
              onChangeText={setTitleDraft}
              style={styles.textField}
              placeholder="Summarise this note"
              placeholderTextColor={colors.textSecondary}
            />
          ) : (
            <View style={styles.readOnlyBox}>
              <Text style={styles.readOnlyText}>{note.title}</Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Note content</Text>
          {isEditing ? (
            <TextInput
              value={contentDraft}
              onChangeText={setContentDraft}
              multiline
              style={[styles.textField, styles.textArea]}
              placeholder="Add your clarification details..."
              placeholderTextColor={colors.textSecondary}
            />
          ) : (
            <View style={[styles.readOnlyBox, styles.readOnlyBoxTall]}>
              <Text style={styles.readOnlyText}>{note.content}</Text>
            </View>
          )}
        </View>

        <View style={styles.linkedBlock}>
          <Text style={styles.sectionLabel}>Linked vocabulary</Text>
          {linkedItem ? (
            <Pressable
              onPress={() => navigation.navigate('WordDetail', { itemId: linkedItem.id })}
              style={({ pressed }) => [
                styles.linkedCard,
                pressed && styles.linkedCardPressed,
              ]}
            >
              <Text style={styles.linkedTerm}>{linkedItem.term}</Text>
              <Text style={styles.linkedMeaning}>{linkedItem.meaning}</Text>
              <Text style={styles.viewWordLabel}>View word profile</Text>
            </Pressable>
          ) : (
            <Text style={styles.placeholder}>No word linked to this note.</Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Native response</Text>
          {note.answer ? (
            <View style={styles.readOnlyBox}>
              <Text style={styles.readOnlyText}>{note.answer}</Text>
            </View>
          ) : (
            <Text style={styles.placeholder}>Awaiting reply from your native mentor.</Text>
          )}
        </View>

      <View style={styles.actionsRow}>
        {isEditing ? (
          <>
            <Pressable
              onPress={handleSave}
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && styles.primaryButtonPressed,
              ]}
            >
              <Text style={styles.primaryLabel}>Save note</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                setTitleDraft(note.title);
                setContentDraft(note.content);
                setIsEditing(false);
              }}
              style={styles.secondaryButton}
            >
              <Text style={styles.secondaryLabel}>Cancel</Text>
            </Pressable>
          </>
        ) : (
          <Pressable
            onPress={() => setIsEditing(true)}
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.primaryButtonPressed,
            ]}
          >
            <Text style={styles.primaryLabel}>Edit note</Text>
          </Pressable>
        )}
        <Pressable onPress={handleDelete} style={styles.dangerButton}>
          <Text style={styles.dangerLabel}>Delete</Text>
        </Pressable>
      </View>

        <Pressable
          onPress={() =>
            navigation
              .getParent<BottomTabNavigationProp<MainTabsParamList>>()
              ?.navigate('Chat')
          }
          style={styles.contextLink}
        >
          <Text style={styles.contextLinkLabel}>View in context</Text>
        </Pressable>
    </ScrollView>
  </ScreenContainer>
  );
};

export default NoteDetailScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    paddingHorizontal: spacing.screenHorizontal,
    paddingBottom: spacing.block * 2,
    paddingTop: spacing.block,
    gap: 20,
    backgroundColor: colors.backgroundLight,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.backgroundLight,
  },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  headerCard: {
    borderRadius: radii.surface,
    backgroundColor: colors.surface,
    padding: 20,
    gap: 12,
    ...shadows.card,
    alignItems: 'flex-start',
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radii.control,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  backButtonPressed: {
    backgroundColor: colors.surfaceMuted,
  },
  backButtonLabel: {
    ...typography.captionStrong,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  navTitle: {
    ...typography.captionStrong,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  navSpacer: {
    width: 64,
  },
  statusToggleButton: {
    borderRadius: radii.control,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignSelf: 'flex-start',
  },
  statusToggleButtonAnswered: {
    backgroundColor: colors.success,
  },
  statusToggleButtonUnanswered: {
    backgroundColor: colors.error,
  },
  statusToggleButtonDisabled: {
    opacity: 0.7,
  },
  statusToggleLabel: {
    ...typography.captionStrong,
    color: colors.surface,
  },
  statusMeta: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  timestamp: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  section: {
    gap: 12,
  },
  sectionLabel: {
    ...typography.subhead,
    color: colors.textPrimaryLight,
  },
  textField: {
    borderRadius: radii.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    ...typography.body,
    color: colors.textPrimaryLight,
  },
  textArea: {
    minHeight: 160,
    textAlignVertical: 'top',
  },
  readOnlyBox: {
    borderRadius: radii.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.surface,
  },
  readOnlyBoxTall: {
    minHeight: 160,
    justifyContent: 'flex-start',
  },
  readOnlyText: {
    ...typography.body,
    color: colors.textPrimaryLight,
  },
  linkedBlock: {
    gap: 12,
  },
  placeholder: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  linkedCard: {
    borderRadius: radii.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 6,
    backgroundColor: colors.backgroundLight,
  },
  linkedCardPressed: {
    opacity: 0.9,
  },
  linkedTerm: {
    fontSize: 18,
    lineHeight: 24,
    fontFamily: fontFamilies.serif.semibold,
    color: colors.textPrimaryLight,
  },
  linkedMeaning: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  viewWordLabel: {
    ...typography.captionStrong,
    color: colors.accent,
  },
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  primaryButton: {
    borderRadius: radii.control,
    backgroundColor: colors.accent,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  primaryButtonPressed: {
    opacity: 0.85,
  },
  primaryLabel: {
    ...typography.captionStrong,
    color: colors.backgroundLight,
  },
  secondaryButton: {
    borderRadius: radii.control,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  secondaryLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  dangerButton: {
    borderRadius: radii.control,
    borderWidth: 1,
    borderColor: colors.error,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  dangerLabel: {
    ...typography.captionStrong,
    color: colors.error,
  },
  contextLink: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
  },
  contextLinkLabel: {
    ...typography.captionStrong,
    color: colors.accent,
  },
});
