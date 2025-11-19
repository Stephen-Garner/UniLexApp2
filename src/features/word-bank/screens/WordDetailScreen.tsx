import React, { useEffect, useMemo, useState } from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { colors, spacing, radii, typography, shadows, fontFamilies } from '@/shared/theme/tokens';
import ScreenContainer from '@/shared/components/ScreenContainer';
import type { MainTabsParamList, RootStackParamList } from '@/navigation/types';
import { useBankStore } from '@/state/bank.store';
import { useNotesStore } from '@/state/notes.store';

type Props = NativeStackScreenProps<RootStackParamList, 'WordDetail'>;

type TabKey = 'overview' | 'notes' | 'review';

const tabLabels: Record<TabKey, string> = {
  overview: 'Overview',
  notes: 'Notes',
  review: 'Review History',
};

const WordDetailScreen: React.FC<Props> = ({ route, navigation }) => {
  const { itemId } = route.params;
  const [tab, setTab] = useState<TabKey>('overview');

  const { items, loadBank } = useBankStore();
  const { notes, loadNotes } = useNotesStore();

  useEffect(() => {
    loadBank().catch(() => undefined);
    loadNotes().catch(() => undefined);
  }, [loadBank, loadNotes]);

  const item = useMemo(
    () => items.find(entry => entry.id === itemId) ?? null,
    [items, itemId],
  );

  const linkedNotes = useMemo(
    () => notes.filter(note => note.vocabItemId === itemId),
    [notes, itemId],
  );

  if (!item) {
    return (
      <ScreenContainer style={styles.safeArea}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Word not found locally.</Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer style={styles.safeArea}>
      <ScrollView
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.wordHeader}>
        <View>
          <Text style={styles.term}>{item.term}</Text>
          {item.reading ? <Text style={styles.reading}>{item.reading}</Text> : null}
        </View>
        <Pressable
          style={({ pressed }) => [
            styles.contextButton,
            pressed && styles.contextButtonPressed,
          ]}
          onPress={() =>
            navigation
              .getParent<BottomTabNavigationProp<MainTabsParamList>>()
              ?.navigate('Chat')
          }
        >
          <Text style={styles.contextButtonLabel}>View in Context</Text>
        </Pressable>
      </View>
      <Text style={styles.meaning}>{item.meaning}</Text>

      <View style={styles.tabsRow}>
        {(Object.keys(tabLabels) as TabKey[]).map(key => (
          <Pressable
            key={key}
            onPress={() => setTab(key)}
            style={[
              styles.tabButton,
              tab === key && styles.tabButtonActive,
            ]}
          >
            <Text
              style={[
                styles.tabLabel,
                tab === key && styles.tabLabelActive,
              ]}
            >
              {tabLabels[key]}
            </Text>
          </Pressable>
        ))}
      </View>

      {tab === 'overview' ? (
        <View style={styles.tabCard}>
          <Text style={styles.sectionTitle}>Examples</Text>
          {item.examples.length > 0 ? (
            item.examples.map(example => (
              <Text key={example} style={styles.sectionItem}>
                • {example}
              </Text>
            ))
          ) : (
            <Text style={styles.sectionPlaceholder}>No examples added yet.</Text>
          )}

          <Text style={styles.sectionTitle}>Folders</Text>
          {item.folders.length > 0 ? (
            <View style={styles.folderRow}>
              {item.folders.map(folder => (
                <View key={folder} style={styles.folderChip}>
                  <Text style={styles.folderLabel}>{folder}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.sectionPlaceholder}>Not assigned to a folder yet.</Text>
          )}

          <Text style={styles.sectionTitle}>Difficulty</Text>
          <Text style={styles.sectionItem}>CEFR {item.level}</Text>
        </View>
      ) : null}

      {tab === 'notes' ? (
        <View style={styles.tabCard}>
          <View style={styles.notesHeader}>
            <Text style={styles.sectionTitle}>Linked Native Notes</Text>
            <Pressable
              onPress={() =>
                navigation.navigate('CreateNote', {
                  vocabItemId: itemId,
                  source: 'word-detail',
                })
              }
              style={({ pressed }) => [
                styles.addNoteButton,
                pressed && styles.addNoteButtonPressed,
              ]}
            >
              <Text style={styles.addNoteLabel}>+ New Note</Text>
            </Pressable>
          </View>

          {linkedNotes.length === 0 ? (
            <Text style={styles.sectionPlaceholder}>
              Capture clarifications from native speakers with the NN button in chat.
            </Text>
          ) : (
            linkedNotes.map(note => (
              <Pressable
                key={note.id}
                onPress={() => navigation.navigate('NoteDetail', { noteId: note.id })}
                style={({ pressed }) => [
                  styles.noteCard,
                  pressed && styles.noteCardPressed,
                ]}
              >
                <Text style={styles.noteContent} numberOfLines={3}>
                  {note.content}
                </Text>
                {note.answer ? (
                  <Text style={styles.noteAnswer}>Answer: {note.answer}</Text>
                ) : (
                  <Text style={styles.notePending}>Awaiting native response</Text>
                )}
              </Pressable>
            ))
          )}
        </View>
      ) : null}

      {tab === 'review' ? (
        <View style={styles.tabCard}>
          <Text style={styles.sectionTitle}>Spaced repetition</Text>
          {item.srsData ? (
            <View style={styles.reviewRows}>
              <Text style={styles.sectionItem}>Interval: {item.srsData.intervalHours}h</Text>
              <Text style={styles.sectionItem}>Ease factor: {item.srsData.easeFactor.toFixed(2)}</Text>
              <Text style={styles.sectionItem}>Streak: {item.srsData.streak}</Text>
              <Text style={styles.sectionItem}>
                Next due: {new Date(item.srsData.dueAt).toLocaleString()}
              </Text>
              <Text style={styles.sectionItem}>
                Last reviewed: {item.srsData.lastReviewedAt
                  ? new Date(item.srsData.lastReviewedAt).toLocaleString()
                  : '—'}
              </Text>
            </View>
          ) : (
            <Text style={styles.sectionPlaceholder}>
              No reviews logged yet. Complete an adaptive session to schedule it.
            </Text>
          )}
        </View>
      ) : null}
    </ScrollView>
  </ScreenContainer>
  );
};

export default WordDetailScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    paddingHorizontal: spacing.screenHorizontal,
    paddingBottom: spacing.block * 2,
    gap: 20,
    backgroundColor: colors.backgroundLight,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.block,
    backgroundColor: colors.backgroundLight,
  },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  wordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  term: {
    fontSize: 24,
    lineHeight: 32,
    fontFamily: fontFamilies.serif.semibold,
    color: colors.textPrimaryLight,
  },
  reading: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 4,
  },
  contextButton: {
    borderRadius: radii.control,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  contextButtonPressed: {
    backgroundColor: colors.surface,
  },
  contextButtonLabel: {
    ...typography.captionStrong,
    color: colors.accent,
  },
  meaning: {
    ...typography.body,
    color: colors.textPrimaryLight,
  },
  tabsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  tabButton: {
    flex: 1,
    borderRadius: radii.control,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 10,
    alignItems: 'center',
  },
  tabButtonActive: {
    backgroundColor: colors.surface,
  },
  tabLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  tabLabelActive: {
    color: colors.textPrimaryLight,
    fontFamily: fontFamilies.sans.medium,
  },
  tabCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.surface,
    padding: 20,
    gap: 16,
    ...shadows.card,
  },
  sectionTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontFamily: fontFamilies.serif.semibold,
    color: colors.textPrimaryLight,
  },
  sectionItem: {
    ...typography.body,
    color: colors.textPrimaryLight,
  },
  sectionPlaceholder: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  folderRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  folderChip: {
    borderRadius: radii.control,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.backgroundLight,
  },
  folderLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  notesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  addNoteButton: {
    borderRadius: radii.control,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  addNoteButtonPressed: {
    backgroundColor: colors.backgroundLight,
  },
  addNoteLabel: {
    ...typography.captionStrong,
    color: colors.accent,
  },
  noteCard: {
    borderRadius: radii.control,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 8,
    backgroundColor: colors.backgroundLight,
  },
  noteCardPressed: {
    opacity: 0.9,
  },
  noteContent: {
    ...typography.body,
    color: colors.textPrimaryLight,
  },
  noteAnswer: {
    ...typography.caption,
    color: colors.success,
  },
  notePending: {
    ...typography.caption,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  reviewRows: {
    gap: 8,
  },
});
