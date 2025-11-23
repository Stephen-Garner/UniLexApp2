import React from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useTheme, type ThemeColors } from '@/shared/theme/theme';
import { useThemeStyles } from '@/shared/theme/useThemeStyles';
import { spacing, radii, typography, fontFamilies } from '@/shared/theme/tokens';
import { WordListItem, SelectionBar } from '..';
import type { VocabItem } from '@/contracts/models';
import type { MainTabsParamList, RootStackParamList } from '@/navigation/types';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

type WordBankNavigation = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabsParamList, 'WordBank'>,
  NativeStackNavigationProp<RootStackParamList>
>;

type WordsPaneProps = {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  setSortSheetVisible: (visible: boolean) => void;
  activeSortLabel: string;
  setFolderFilterVisible: (visible: boolean) => void;
  selectedFoldersFilter: string[];
  isWordSelectMode: boolean;
  setIsWordSelectMode: (isSelectMode: boolean) => void;
  clearWordSelection: () => void;
  filteredWords: VocabItem[];
  isLoading: boolean;
  loadBank: () => Promise<void>;
  selectedWordIds: string[];
  expandedWordId: string | null;
  handlePressWord: (item: VocabItem) => void;
  handleLongPressWord: (item: VocabItem) => void;
  toggleWordSelection: (id: string) => void;
  openFolderEditor: (item: VocabItem) => void;
  handleDeleteWord: (id: string) => void;
  navigation: WordBankNavigation;
  clearSelection: () => void;
  handleDeleteSelected: () => void;
};

export const WordsPane: React.FC<WordsPaneProps> = ({
  searchQuery,
  setSearchQuery,
  setSortSheetVisible,
  activeSortLabel,
  setFolderFilterVisible,
  selectedFoldersFilter,
  isWordSelectMode,
  setIsWordSelectMode,
  clearWordSelection,
  filteredWords,
  isLoading,
  loadBank,
  selectedWordIds,
  expandedWordId,
  handlePressWord,
  handleLongPressWord,
  toggleWordSelection,
  openFolderEditor,
  handleDeleteWord,
  navigation,
  clearSelection,
  handleDeleteSelected,
}) => {
  const styles = useThemeStyles(createStyles);
  const { colors } = useTheme();

  return (
    <View style={styles.wordsPane}>
      <TextInput
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder="Search saved words…"
        placeholderTextColor={colors.textSecondary}
        style={styles.searchInput}
        autoCapitalize="none"
      />

      <View style={styles.filterRow}>
        <Pressable
          onPress={() => setSortSheetVisible(true)}
          style={styles.sortButton}
        >
          <Text style={styles.sortButtonLabel}>{`Sort: ${activeSortLabel}`}</Text>
        </Pressable>
        <Pressable
          onPress={() => setFolderFilterVisible(true)}
          style={[
            styles.filterButton,
            selectedFoldersFilter.length > 0 && styles.filterButtonActive,
          ]}
        >
          <Text
            style={[
              styles.filterButtonLabel,
              selectedFoldersFilter.length > 0 && styles.filterButtonLabelActive,
            ]}
          >
            Folders
            {selectedFoldersFilter.length > 0
              ? ` (${selectedFoldersFilter.length})`
              : ''}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => {
            if (isWordSelectMode) {
              clearWordSelection();
            } else {
              setIsWordSelectMode(true);
            }
          }}
          style={[
            styles.filterButton,
            styles.selectButton,
            isWordSelectMode && styles.filterButtonActive,
          ]}
        >
          <Text
            style={[
              styles.filterButtonLabel,
              isWordSelectMode && styles.filterButtonLabelActive,
            ]}
          >
            {isWordSelectMode ? 'Cancel' : 'Select'}
          </Text>
        </Pressable>
      </View>

      <FlatList
        data={filteredWords}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.wordList}
        refreshing={isLoading}
        onRefresh={() => loadBank().catch(() => undefined)}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No words match your filters</Text>
            <Text style={styles.emptySubtitle}>
              Adjust your filters or save more vocabulary to see them here.
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const isSelected = selectedWordIds.includes(item.id);
          const expanded = expandedWordId === item.id;
          return (
            <WordListItem
              item={item}
              expanded={expanded}
              selectMode={isWordSelectMode}
              selected={isSelected}
              onPress={() => handlePressWord(item)}
              onLongPress={() => handleLongPressWord(item)}
              onToggleSelect={() => toggleWordSelection(item.id)}
              onEditFolders={() => openFolderEditor(item)}
              onDelete={() => handleDeleteWord(item.id)}
              onOpenDetail={() => navigation.navigate('WordDetail', { itemId: item.id })}
            />
          );
        }}
      />
      {isWordSelectMode && selectedWordIds.length > 0 ? (
        <SelectionBar
          count={selectedWordIds.length}
          noun="word"
          onCancel={clearSelection}
          onDelete={handleDeleteSelected}
        />
      ) : null}
    </View>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    wordsPane: {
      flex: 1,
      paddingHorizontal: spacing.screenHorizontal,
    },
    searchInput: {
      borderRadius: radii.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      paddingHorizontal: 16,
      paddingVertical: 12,
      ...typography.body,
      color: colors.textPrimary,
      backgroundColor: colors.surface,
      marginBottom: spacing.base,
    },
    filterRow: {
      flexDirection: 'row',
      gap: spacing.base,
      marginBottom: spacing.base,
    },
    sortButton: {
      flex: 1,
      borderRadius: radii.control,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      paddingHorizontal: 16,
      paddingVertical: 10,
      backgroundColor: colors.surface,
      justifyContent: 'center',
    },
    sortButtonLabel: {
      ...typography.caption,
      color: colors.textPrimary,
      fontFamily: fontFamilies.sans.medium,
    },
    filterButton: {
      flex: 1,
      borderRadius: radii.control,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      paddingVertical: 10,
      alignItems: 'center',
      backgroundColor: colors.surface,
    },
    selectButton: {
      flexGrow: 0,
      flexBasis: 120,
    },
    filterButtonActive: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
    },
    filterButtonLabel: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    filterButtonLabelActive: {
      color: colors.textOnAccent,
      fontFamily: fontFamilies.sans.medium,
    },
    wordList: {
      gap: 16,
      paddingBottom: spacing.block * 2,
    },
    emptyState: {
      alignItems: 'center',
      paddingVertical: 48,
      gap: 8,
    },
    emptyTitle: {
      ...typography.subhead,
      color: colors.textPrimary,
    },
    emptySubtitle: {
      ...typography.caption,
      color: colors.textSecondary,
      textAlign: 'center',
      maxWidth: 240,
    },
  });
