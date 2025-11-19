import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Pressable } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { RootStackParamList, MainTabsParamList } from '@/navigation/types';
import { useNotesStore } from '@/state/notes.store';
import { useBankStore } from '@/state/bank.store';
import { colors, spacing, radii, typography, shadows, fontFamilies } from '@/shared/theme/tokens';
import ScreenContainer from '@/shared/components/ScreenContainer';

type Props = NativeStackScreenProps<RootStackParamList, 'CreateNote'>;

const template = (
  word: string | undefined,
  source?: string,
) => [
  `Source · ${source ?? 'Conversation / Media'}`,
  `Phrase · ${word ?? '—'}`,
  'Question · ',
  'Native insight · ',
].join('\n');

const CreateNoteScreen: React.FC<Props> = ({ navigation, route }) => {
  const { vocabItemId, seedContent, source } = route.params ?? {};

  const createNote = useNotesStore(state => state.createNote);
  const isLoading = useNotesStore(state => state.isLoading);
  const { items, loadBank } = useBankStore();

  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | undefined>(vocabItemId);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState(() => seedContent ?? '');

  useEffect(() => {
    if (items.length === 0) {
      loadBank().catch(() => undefined);
    }
  }, [items.length, loadBank]);

  useEffect(() => {
    if (!selectedId) {
      return;
    }
    const word = items.find(entry => entry.id === selectedId);
    if (!word) {
      return;
    }
    setTitle(prev => (prev.trim().length > 0 ? prev : `Question about ${word.term}`));
    if (!seedContent) {
      setContent(prev => (prev.trim().length > 0 ? prev : template(word.term, source)));
    }
  }, [items, selectedId, seedContent, source]);

  const filteredItems = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    if (!normalized) {
      return items.slice(0, 20);
    }
    return items.filter(item =>
      [item.term, item.meaning].join(' ').toLowerCase().includes(normalized),
    );
  }, [items, search]);

  const navigateToNativeNotes = () => {
    const tabs = navigation.getParent<BottomTabNavigationProp<MainTabsParamList>>();
    tabs?.navigate('NativeNotes');
  };

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigateToNativeNotes();
  };

  const handleSave = async () => {
    const trimmedTitle = title.trim();
    const trimmedContent = content.trim();
    if (!trimmedContent) {
      Alert.alert('Note cannot be empty.');
      return;
    }

    try {
      await createNote({
        title: trimmedTitle,
        content: trimmedContent,
        ...(selectedId ? { vocabItemId: selectedId } : {}),
      });
      navigateToNativeNotes();
      if (navigation.canGoBack()) {
        navigation.goBack();
      }
    } catch (error) {
      Alert.alert('Unable to save note', error instanceof Error ? error.message : '');
    }
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
        </View>
        <View style={styles.header}>
          <Text style={styles.title}>Capture a native insight</Text>
          <Text style={styles.subtitle}>
            Summarise your question, add the details, and optionally link the saved word.
          </Text>
        </View>

        <Text style={styles.label}>Title</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="Question about..."
          placeholderTextColor={colors.textSecondary}
        />

        <Text style={styles.label}>Note content</Text>
        <TextInput
          style={styles.editor}
          multiline
          value={content}
          onChangeText={setContent}
          placeholder="Describe the phrase or response you need help with..."
          placeholderTextColor={colors.textSecondary}
        />

        <Text style={styles.label}>Link to word (optional)</Text>
        <TextInput
          style={styles.input}
          value={search}
          onChangeText={setSearch}
          placeholder="Search saved vocabulary..."
          placeholderTextColor={colors.textSecondary}
        />

        <View style={styles.listContainer}>
          {filteredItems.map(item => {
            const isSelected = item.id === selectedId;
            return (
              <Pressable
                key={item.id}
                onPress={() =>
                  setSelectedId(current => (current === item.id ? undefined : item.id))
                }
                style={({ pressed }) => [
                  styles.listRow,
                  isSelected && styles.listRowSelected,
                  pressed && styles.listRowPressed,
                ]}
              >
                <Text style={styles.rowTerm}>{item.term}</Text>
                <Text style={styles.rowMeaning} numberOfLines={1}>
                  {item.meaning}
                </Text>
              </Pressable>
            );
          })}
          {filteredItems.length === 0 ? (
            <Text style={styles.emptyState}>No matching vocabulary items.</Text>
          ) : null}
        </View>

        <Pressable
          onPress={handleSave}
          style={({ pressed }) => [
            styles.primaryButton,
            pressed && styles.primaryButtonPressed,
            isLoading && styles.primaryButtonDisabled,
          ]}
          disabled={isLoading}
        >
          <Text style={styles.primaryLabel}>{isLoading ? 'Saving…' : 'Save note'}</Text>
        </Pressable>
      </ScrollView>
    </ScreenContainer>
  );
};

export default CreateNoteScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.backgroundLight,
  },
  container: {
    paddingHorizontal: spacing.screenHorizontal,
    paddingBottom: spacing.block * 2,
    paddingTop: spacing.block,
    gap: 16,
    backgroundColor: colors.backgroundLight,
  },
  header: {
    gap: 8,
  },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
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
  title: {
    ...typography.subhead,
    color: colors.textPrimaryLight,
  },
  subtitle: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  label: {
    ...typography.caption,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    borderRadius: radii.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    ...typography.body,
    color: colors.textPrimaryLight,
  },
  editor: {
    borderRadius: radii.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    minHeight: 180,
    textAlignVertical: 'top',
    backgroundColor: colors.surface,
    ...typography.body,
    color: colors.textPrimaryLight,
  },
  listContainer: {
    gap: 8,
  },
  listRow: {
    borderRadius: radii.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 4,
    backgroundColor: colors.backgroundLight,
  },
  listRowSelected: {
    borderColor: colors.accent,
  },
  listRowPressed: {
    backgroundColor: colors.surface,
  },
  rowTerm: {
    fontSize: 16,
    lineHeight: 22,
    fontFamily: fontFamilies.serif.semibold,
    color: colors.textPrimaryLight,
  },
  rowMeaning: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  emptyState: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: 24,
  },
  primaryButton: {
    borderRadius: radii.surface,
    backgroundColor: colors.accent,
    paddingVertical: 14,
    alignItems: 'center',
    ...shadows.card,
  },
  primaryButtonPressed: {
    opacity: 0.85,
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryLabel: {
    ...typography.bodyStrong,
    color: colors.backgroundLight,
  },
});
