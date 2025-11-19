import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Animated,
  FlatList,
  LayoutAnimation,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  UIManager,
  View,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import ScreenHeader from '@/shared/components/ScreenHeader';
import ScreenContainer from '@/shared/components/ScreenContainer';
import { useTheme, type ThemeColors } from '@/shared/theme/theme';
import { useThemeStyles } from '@/shared/theme/useThemeStyles';
import { spacing, radii, typography, shadows, fontFamilies } from '@/shared/theme/tokens';
import { useBankStore } from '@/state/bank.store';
import { useFolderStore, normaliseFolderName } from '@/state/folder.store';
import type { MainTabsParamList, RootStackParamList } from '@/navigation/types';
import type { VocabItem } from '@/contracts/models';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type WordBankNavigation = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabsParamList, 'WordBank'>,
  NativeStackNavigationProp<RootStackParamList>
>;

type WordBankPane = 'words' | 'folders';

type SortMode =
  | 'newest'
  | 'oldest'
  | 'alphabetical'
  | 'reverseAlphabetical'
  | 'dueSoon'
  | 'difficultyHigh'
  | 'difficultyLow';

const sortOptions: Array<{ id: SortMode; label: string }> = [
  { id: 'newest', label: 'Newest' },
  { id: 'oldest', label: 'Oldest' },
  { id: 'alphabetical', label: 'A–Z' },
  { id: 'reverseAlphabetical', label: 'Z–A' },
  { id: 'dueSoon', label: 'Due Soon' },
  { id: 'difficultyHigh', label: 'Hardest' },
  { id: 'difficultyLow', label: 'Easiest' },
];

type UndoState = {
  message: string;
  actionLabel?: string;
  onUndo: () => Promise<void> | void;
};

const difficultyScore = (level: string): number => {
  const trimmed = level.trim().toLowerCase();
  const numeric = trimmed.match(/\\d+/);
  if (numeric) {
    return Number(numeric[0]);
  }
  switch (trimmed) {
    case 'beginner':
    case 'a1':
      return 1;
    case 'elementary':
    case 'a2':
      return 2;
    case 'intermediate':
    case 'b1':
      return 3;
    case 'upper-intermediate':
    case 'b2':
      return 4;
    case 'advanced':
    case 'c1':
      return 5;
    case 'master':
    case 'c2':
      return 6;
    default:
      return 0;
  }
};

const WordBankScreen: React.FC = () => {
  const navigation = useNavigation<WordBankNavigation>();
  const styles = useThemeStyles(createStyles);
  const { colors } = useTheme();

  const items = useBankStore(state => state.items);
  const loadBank = useBankStore(state => state.loadBank);
  const isLoading = useBankStore(state => state.isLoading);
  const updateFolders = useBankStore(state => state.updateFolders);
  const removeBankItem = useBankStore(state => state.removeBankItem);

  const loadFolders = useFolderStore(state => state.loadFolders);
  const folderOptions = useFolderStore(state => state.folders);
  const addFolder = useFolderStore(state => state.addFolder);
  const renameFolder = useFolderStore(state => state.renameFolder);
  const removeFolder = useFolderStore(state => state.removeFolder);

  const [pane, setPane] = useState<WordBankPane>('words');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('newest');
  const [sortSheetVisible, setSortSheetVisible] = useState(false);
  const [selectedFoldersFilter, setSelectedFoldersFilter] = useState<string[]>([]);
  const [folderFilterVisible, setFolderFilterVisible] = useState(false);
  const [folderEditorItem, setFolderEditorItem] = useState<VocabItem | null>(null);
  const [expandedWordId, setExpandedWordId] = useState<string | null>(null);
  const [isWordSelectMode, setIsWordSelectMode] = useState(false);
  const [selectedWordIds, setSelectedWordIds] = useState<string[]>([]);
  const [activeFolder, setActiveFolder] = useState<string | null>(null);
  const [isFolderSelectMode, setIsFolderSelectMode] = useState(false);
  const [selectedFolders, setSelectedFolders] = useState<string[]>([]);
  const [undoState, setUndoState] = useState<UndoState | null>(null);
  const [newFolderDraft, setNewFolderDraft] = useState('');
  const [renameDraft, setRenameDraft] = useState('');
  const [folderBeingRenamed, setFolderBeingRenamed] = useState<string | null>(null);
  const [folderError, setFolderError] = useState<string | null>(null);
  const [isAddingFolder, setIsAddingFolder] = useState(false);

  useEffect(() => {
    if (!undoState) {
      return;
    }
    const timer = setTimeout(() => setUndoState(null), 6000);
    return () => clearTimeout(timer);
  }, [undoState]);

  useEffect(() => {
    loadBank().catch(() => undefined);
    loadFolders().catch(() => undefined);
  }, [loadBank, loadFolders]);

  useFocusEffect(
    useCallback(() => {
      loadBank().catch(() => undefined);
      loadFolders().catch(() => undefined);
      return () => undefined;
    }, [loadBank, loadFolders]),
  );

  const filteredWords = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const folderSet = selectedFoldersFilter.map(folder =>
      normaliseFolderName(folder).toLowerCase(),
    );

    const base = items.filter(item => {
      if (folderSet.length > 0) {
        const itemFolders = item.folders.map(folder => folder.toLowerCase());
        const hasAllFolders = folderSet.every(folder => itemFolders.includes(folder));
        if (!hasAllFolders) {
          return false;
        }
      }

      if (!query) {
        return true;
      }

      const haystack = [item.term, item.meaning, item.reading, ...item.folders]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(query);
    });

    const sorter: Record<SortMode, (a: VocabItem, b: VocabItem) => number> = {
      newest: (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      oldest: (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      alphabetical: (a, b) => a.term.localeCompare(b.term),
      reverseAlphabetical: (a, b) => b.term.localeCompare(a.term),
      dueSoon: (a, b) => {
        const aDue = a.srsData ? new Date(a.srsData.dueAt).getTime() : Number.POSITIVE_INFINITY;
        const bDue = b.srsData ? new Date(b.srsData.dueAt).getTime() : Number.POSITIVE_INFINITY;
        return aDue - bDue;
      },
      difficultyHigh: (a, b) => difficultyScore(b.level) - difficultyScore(a.level),
      difficultyLow: (a, b) => difficultyScore(a.level) - difficultyScore(b.level),
    };

    const sorted = base.slice().sort(sorter[sortMode]);
    return sorted;
  }, [items, searchQuery, selectedFoldersFilter, sortMode]);

  const activeSortLabel = useMemo(() => {
    const option = sortOptions.find(candidate => candidate.id === sortMode);
    return option ? option.label : 'Newest';
  }, [sortMode]);

  const wordsInActiveFolder = useMemo(() => {
    if (!activeFolder) {
      return [];
    }
    const target = activeFolder.toLowerCase();
    return items.filter(item =>
      item.folders.some(folder => folder.toLowerCase() === target),
    );
  }, [activeFolder, items]);

  const toggleWordSelection = useCallback((id: string) => {
    setSelectedWordIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id],
    );
  }, []);

  const clearWordSelection = useCallback(() => {
    setSelectedWordIds([]);
    setIsWordSelectMode(false);
  }, []);

  const handleOpenFolder = useCallback(
    (folderName: string) => {
      const normalised = normaliseFolderName(folderName);
      setActiveFolder(normalised);
      setExpandedWordId(null);
      setIsWordSelectMode(false);
      setSelectedWordIds([]);
      navigation.navigate('FolderDetail', { folderName: normalised });
    },
    [
      navigation,
      setActiveFolder,
      setExpandedWordId,
      setIsWordSelectMode,
      setSelectedWordIds,
    ],
  );

  useEffect(() => {
    if (!isWordSelectMode) {
      setSelectedWordIds([]);
    }
  }, [isWordSelectMode]);
  useEffect(() => {
    if (isWordSelectMode) {
      setExpandedWordId(null);
    }
  }, [isWordSelectMode]);

  const toggleFolderSelection = useCallback((name: string) => {
    const normalised = normaliseFolderName(name);
    setSelectedFolders(prev =>
      prev.includes(normalised)
        ? prev.filter(entry => entry !== normalised)
        : [...prev, normalised],
    );
  }, []);

  const clearFolderSelection = useCallback(() => {
    setSelectedFolders([]);
    setIsFolderSelectMode(false);
  }, []);

  useEffect(() => {
    if (!isFolderSelectMode) {
      setSelectedFolders([]);
    }
  }, [isFolderSelectMode]);
  useEffect(() => {
    if (isFolderSelectMode) {
      setActiveFolder(null);
    }
  }, [isFolderSelectMode]);
  useEffect(() => {
    if (pane === 'words') {
      setIsFolderSelectMode(false);
      setSelectedFolders([]);
      setIsAddingFolder(false);
    } else {
      setIsWordSelectMode(false);
      setSelectedWordIds([]);
    }
  }, [pane]);

  const handleDeleteWord = useCallback(
    async (id: string) => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      await removeBankItem(id);
      setSelectedWordIds(prev => prev.filter(wordId => wordId !== id));
      if (expandedWordId === id) {
        setExpandedWordId(null);
      }
    },
    [expandedWordId, removeBankItem],
  );

  const handleDeleteSelectedWords = useCallback(async () => {
    if (selectedWordIds.length === 0) {
      return;
    }
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    await Promise.all(selectedWordIds.map(wordId => removeBankItem(wordId)));
    setSelectedWordIds([]);
    setIsWordSelectMode(false);
    setExpandedWordId(null);
  }, [removeBankItem, selectedWordIds]);

  const folderSummaries = useMemo(() => {
    const totals = folderOptions.map(folder => {
      const normalized = folder.toLowerCase();
      const associated = items.filter(item =>
        item.folders.some(candidate => candidate.toLowerCase() === normalized),
      );
      return {
        name: folder,
        count: associated.length,
        sample: associated.slice(0, 3).map(item => item.term),
      };
    });

    return totals.sort((a, b) => a.name.localeCompare(b.name));
  }, [folderOptions, items]);

  useEffect(() => {
    if (
      activeFolder &&
      !folderSummaries.some(summary => normaliseFolderName(summary.name) === activeFolder)
    ) {
      setActiveFolder(null);
    }
  }, [activeFolder, folderSummaries]);

  const handleUpdateFolders = useCallback(
    async (item: VocabItem, nextFolders: string[]) => {
      const normalised = nextFolders.map(normaliseFolderName);
      const previous = item.folders;
      const same =
        previous.length === normalised.length &&
        previous.every(folder => normalised.includes(folder));
      if (same) {
        return;
      }

      await updateFolders(item.id, normalised);
      setUndoState({
        message: `Updated folders for “${item.term}”`,
        actionLabel: 'Undo',
        onUndo: () => updateFolders(item.id, previous),
      });
    },
    [updateFolders],
  );

  const applyRemovalToWords = useCallback(async (target: string) => {
    const bankState = useBankStore.getState();
    const impacted = bankState.items.filter(item =>
      item.folders.some(folder => folder.toLowerCase() === target.toLowerCase()),
    );

    await Promise.all(
      impacted.map(item =>
        bankState.updateFolders(
          item.id,
          item.folders.filter(folder => folder.toLowerCase() !== target.toLowerCase()),
        ),
      ),
    );

    return impacted.map(item => ({
      id: item.id,
      folders: item.folders,
    }));
  }, []);

  const handleCreateFolder = useCallback(async () => {
    const trimmed = newFolderDraft.trim();
    if (!trimmed) {
      setFolderError('Enter a folder name.');
      return;
    }

    try {
      const created = await addFolder(trimmed);
      setNewFolderDraft('');
      setFolderError(null);
      setUndoState({
        message: `Created folder “${created}”`,
        actionLabel: 'Undo',
        onUndo: () => removeFolder(created),
      });
    } catch (error) {
      setFolderError(error instanceof Error ? error.message : 'Unable to create folder.');
    }
  }, [addFolder, newFolderDraft, removeFolder]);

  const handleRenameFolder = useCallback(
    async (_currentName: string) => {
      if (!folderBeingRenamed) {
        return;
      }

      const trimmed = renameDraft.trim();
      if (!trimmed) {
        setFolderError('Folder name cannot be empty.');
        return;
      }

      const normalisedCurrent = normaliseFolderName(folderBeingRenamed);
      const normalisedNext = normaliseFolderName(trimmed);
      if (normalisedCurrent.toLowerCase() === normalisedNext.toLowerCase()) {
        setFolderBeingRenamed(null);
        setRenameDraft('');
        setFolderError(null);
        return;
      }

      try {
        const bankState = useBankStore.getState();
        const impacted = bankState.items
          .filter(item =>
            item.folders.some(folder => folder.toLowerCase() === normalisedCurrent.toLowerCase()),
          )
          .map(item => ({
            id: item.id,
            previous: item.folders,
            next: item.folders.map(folder =>
              folder.toLowerCase() === normalisedCurrent.toLowerCase() ? normalisedNext : folder,
            ),
          }));

        await renameFolder(normalisedCurrent, normalisedNext);
        await Promise.all(
          impacted.map(entry => useBankStore.getState().updateFolders(entry.id, entry.next)),
        );
        setUndoState({
          message: `Renamed folder to “${normalisedNext}”`,
          actionLabel: 'Undo',
          onUndo: async () => {
            await renameFolder(normalisedNext, normalisedCurrent);
            await Promise.all(
              impacted.map(entry =>
                useBankStore.getState().updateFolders(entry.id, entry.previous),
              ),
            );
          },
        });
        setFolderBeingRenamed(null);
        setRenameDraft('');
        setFolderError(null);
      } catch (error) {
        setFolderError(error instanceof Error ? error.message : 'Unable to rename folder.');
      }
    },
    [folderBeingRenamed, renameDraft, renameFolder],
  );

  const confirmDeleteFolder = useCallback(
    (folder: string) => {
      Alert.alert(
        'Delete folder',
        `Remove the “${folder}” folder? Words will remain in your bank.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              const normalised = normaliseFolderName(folder);
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              const previousAssignments = await applyRemovalToWords(normalised);
              await removeFolder(normalised);
              if (activeFolder === folder) {
                setActiveFolder(null);
              }
              setUndoState({
                message: `Deleted folder “${normalised}”`,
                actionLabel: 'Undo',
                onUndo: async () => {
                  await addFolder(normalised);
                  await Promise.all(
                    previousAssignments.map(entry =>
                      useBankStore.getState().updateFolders(entry.id, entry.folders),
                    ),
                  );
                },
              });
            },
          },
        ],
      );
    },
    [activeFolder, addFolder, applyRemovalToWords, removeFolder],
  );

  const handleDeleteSelectedFolders = useCallback(async () => {
    if (selectedFolders.length === 0) {
      return;
    }
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const payload = await Promise.all(
      selectedFolders.map(async folder => {
        const normalised = normaliseFolderName(folder);
        const assignments = await applyRemovalToWords(normalised);
        await removeFolder(normalised);
        return { name: normalised, assignments };
      }),
    );
    setSelectedFolders([]);
    setIsFolderSelectMode(false);
    if (payload.some(entry => entry.name === normaliseFolderName(activeFolder ?? ''))) {
      setActiveFolder(null);
    }
    if (payload.length === 0) {
      return;
    }
    setUndoState({
      message: `Deleted ${payload.length} folder${payload.length === 1 ? '' : 's'}`,
      actionLabel: 'Undo',
      onUndo: async () => {
        await Promise.all(
          payload.map(async entry => {
            try {
              await addFolder(entry.name);
            } catch {
              // ignore duplicate errors
            }
            await Promise.all(
              entry.assignments.map(item =>
                useBankStore.getState().updateFolders(item.id, item.folders),
              ),
            );
          }),
        );
      },
    });
  }, [activeFolder, addFolder, applyRemovalToWords, removeFolder, selectedFolders]);

  const handleUndo = useCallback(async () => {
    if (!undoState) {
      return;
    }
    await undoState.onUndo();
    setUndoState(null);
  }, [undoState]);

  const openFolderEditor = (item: VocabItem) => {
    setFolderEditorItem(item);
  };

  const closeFolderEditor = () => {
    setFolderEditorItem(null);
  };

  return (
    <ScreenContainer style={styles.screen}>
      <ScreenHeader
        title="Word Bank"
        onProfilePress={() => navigation.navigate('Settings')}
      />

      <View style={styles.paneSwitch}>
        <Pressable
          onPress={() => setPane('words')}
          style={[
            styles.paneButton,
            pane === 'words' && styles.paneButtonActive,
          ]}
        >
          <Text
            style={[
              styles.paneButtonLabel,
              pane === 'words' && styles.paneButtonLabelActive,
            ]}
          >
            Words
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setPane('folders')}
          style={[
            styles.paneButton,
            pane === 'folders' && styles.paneButtonActive,
          ]}
        >
          <Text
            style={[
              styles.paneButtonLabel,
              pane === 'folders' && styles.paneButtonLabelActive,
            ]}
          >
            Folders
          </Text>
        </Pressable>
      </View>

      {pane === 'words' ? (
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
              const handlePress = () => {
                if (isWordSelectMode) {
                  toggleWordSelection(item.id);
                  return;
                }
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                setExpandedWordId(prev => (prev === item.id ? null : item.id));
              };
              const handleLongPress = () => {
                if (!isWordSelectMode) {
                  setIsWordSelectMode(true);
                  setSelectedWordIds([item.id]);
                }
              };
              return (
                <WordListItem
                  item={item}
                  expanded={expanded}
                  selectMode={isWordSelectMode}
                  selected={isSelected}
                  onPress={handlePress}
                  onLongPress={handleLongPress}
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
              onCancel={clearWordSelection}
              onDelete={handleDeleteSelectedWords}
            />
          ) : null}
        </View>
      ) : (
        <ScrollView
          style={styles.foldersPane}
          contentContainerStyle={styles.foldersContent}
        >
          <View style={styles.folderToolbar}>
            <Pressable
              onPress={() => {
                setIsAddingFolder(prev => {
                  if (prev) {
                    setNewFolderDraft('');
                    setFolderError(null);
                  }
                  return !prev;
                });
              }}
              style={[
                styles.folderToolbarButton,
                isAddingFolder && styles.folderToolbarButtonActive,
              ]}
            >
              <Text
                style={[
                  styles.folderToolbarLabel,
                  isAddingFolder && styles.folderToolbarLabelActive,
                ]}
              >
                {isAddingFolder ? 'Close' : 'Add Folder'}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => {
                if (isFolderSelectMode) {
                  clearFolderSelection();
                } else {
                  setIsFolderSelectMode(true);
                }
              }}
              style={[
                styles.folderToolbarButton,
                isFolderSelectMode && styles.folderToolbarButtonActive,
              ]}
            >
              <Text
                style={[
                  styles.folderToolbarLabel,
                  isFolderSelectMode && styles.folderToolbarLabelActive,
                ]}
              >
                {isFolderSelectMode ? 'Cancel Selection' : 'Select Folders'}
              </Text>
            </Pressable>
          </View>

          {isAddingFolder ? (
            <View style={styles.folderCreateCard}>
              <View style={styles.folderCreateRow}>
                <TextInput
                  value={newFolderDraft}
                  onChangeText={text => {
                    setNewFolderDraft(text);
                    setFolderError(null);
                  }}
                  placeholder="e.g. Business, Slang, Argentina"
                  placeholderTextColor={colors.textSecondary}
                  style={styles.folderCreateInput}
                  autoFocus
                  onSubmitEditing={handleCreateFolder}
                />
                <Pressable onPress={handleCreateFolder} style={styles.folderCreateButton}>
                  <Text style={styles.folderCreateButtonLabel}>Add</Text>
                </Pressable>
              </View>
              {folderError ? <Text style={styles.folderError}>{folderError}</Text> : null}
            </View>
          ) : null}

          {folderSummaries.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No folders yet</Text>
              <Text style={styles.emptySubtitle}>
                Create folders to organise your vocabulary into collections.
              </Text>
            </View>
          ) : (
            folderSummaries.map(summary => {
              const normalisedName = normaliseFolderName(summary.name);
              const isRenaming = folderBeingRenamed === summary.name;
              const isSelected = selectedFolders.includes(normalisedName);
              const isActive = activeFolder === normalisedName;
              const swipeEnabled = !isFolderSelectMode && !isRenaming;
              return (
                <SwipeableRow
                  key={summary.name}
                  onDelete={() => confirmDeleteFolder(summary.name)}
                  disabled={!swipeEnabled}
                >
                  <Pressable
                    onPress={() => {
                      if (isFolderSelectMode) {
                        toggleFolderSelection(summary.name);
                        return;
                      }
                      if (!isRenaming) {
                        handleOpenFolder(summary.name);
                      }
                    }}
                    style={[
                      styles.folderCard,
                      isActive && styles.folderCardActive,
                      isFolderSelectMode && styles.folderCardSelectable,
                      isSelected && styles.folderCardSelected,
                    ]}
                  >
                    {isFolderSelectMode ? (
                      <Pressable
                        onPress={() => toggleFolderSelection(summary.name)}
                        style={[
                          styles.selectionBadge,
                          isSelected && styles.selectionBadgeSelected,
                        ]}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: isSelected }}
                      >
                        {isSelected ? <Text style={styles.selectionBadgeText}>✓</Text> : null}
                      </Pressable>
                    ) : null}
                    {isRenaming ? (
                      <View style={styles.folderRenameRow}>
                        <TextInput
                          value={renameDraft}
                          onChangeText={text => {
                            setRenameDraft(text);
                            setFolderError(null);
                          }}
                          style={styles.folderRenameInput}
                          autoFocus
                          onSubmitEditing={() => handleRenameFolder(summary.name)}
                          onBlur={() => handleRenameFolder(summary.name)}
                        />
                      </View>
                    ) : (
                      <View style={styles.folderHeaderRow}>
                        <Pressable
                          onPress={() => {
                            if (isFolderSelectMode) {
                              toggleFolderSelection(summary.name);
                              return;
                            }
                            setFolderBeingRenamed(summary.name);
                            setRenameDraft(summary.name);
                            setFolderError(null);
                          }}
                        >
                          <Text style={styles.folderName}>{summary.name}</Text>
                        </Pressable>
                        <Text style={styles.folderCount}>
                          {summary.count} {summary.count === 1 ? 'word' : 'words'}
                        </Text>
                      </View>
                    )}
                    {summary.sample.length > 0 ? (
                      <Text style={styles.folderExamples}>
                        {summary.sample.join(', ')}
                        {summary.count > summary.sample.length ? '…' : ''}
                      </Text>
                    ) : (
                      <Text style={styles.folderExamplesMuted}>No words yet.</Text>
                    )}
                    {isRenaming ? (
                      <View style={styles.folderRenameActions}>
                        <Pressable
                          onPress={() => handleRenameFolder(summary.name)}
                          style={styles.folderRenameButton}
                        >
                          <Text style={styles.folderRenameButtonLabel}>Save</Text>
                        </Pressable>
                        <Pressable
                          onPress={() => {
                            setFolderBeingRenamed(null);
                            setRenameDraft('');
                            setFolderError(null);
                          }}
                          style={styles.folderRenameButton}
                        >
                          <Text style={styles.folderRenameButtonLabel}>Cancel</Text>
                        </Pressable>
                      </View>
                    ) : null}
                  </Pressable>
                </SwipeableRow>
              );
            })
          )}

          {folderError && !isAddingFolder ? (
            <Text style={styles.folderError}>{folderError}</Text>
          ) : null}

          {activeFolder ? (
            <View style={styles.folderWordSection}>
              <View style={styles.folderWordHeader}>
                <Text style={styles.folderWordTitle}>Words in “{activeFolder}”</Text>
                <Pressable onPress={() => setActiveFolder(null)}>
                  <Text style={styles.folderWordClose}>Close</Text>
                </Pressable>
              </View>
              {wordsInActiveFolder.length === 0 ? (
                <Text style={styles.folderExamplesMuted}>No words assigned yet.</Text>
              ) : (
                wordsInActiveFolder.map(word => {
                  const isSelectedWord = selectedWordIds.includes(word.id);
                  const expanded = expandedWordId === word.id;
                  const handlePress = () => {
                    if (isWordSelectMode) {
                      toggleWordSelection(word.id);
                      return;
                    }
                    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                    setExpandedWordId(prev => (prev === word.id ? null : word.id));
                  };
                  const handleLongPress = () => {
                    if (!isWordSelectMode) {
                      setIsWordSelectMode(true);
                      setSelectedWordIds([word.id]);
                    }
                  };
                  return (
                    <WordListItem
                      key={word.id}
                      item={word}
                      expanded={expanded}
                      selectMode={isWordSelectMode}
                      selected={isSelectedWord}
                      onPress={handlePress}
                      onLongPress={handleLongPress}
                      onToggleSelect={() => toggleWordSelection(word.id)}
                      onEditFolders={() => openFolderEditor(word)}
                      onDelete={() => handleDeleteWord(word.id)}
                      onOpenDetail={() => navigation.navigate('WordDetail', { itemId: word.id })}
                    />
                  );
                })
              )}
            </View>
          ) : null}

          {isFolderSelectMode && selectedFolders.length > 0 ? (
            <SelectionBar
              count={selectedFolders.length}
              noun="folder"
              onCancel={clearFolderSelection}
              onDelete={handleDeleteSelectedFolders}
            />
          ) : null}
        </ScrollView>
      )}
      <SortSheet
        visible={sortSheetVisible}
        value={sortMode}
        onSelect={mode => {
          setSortMode(mode);
          setSortSheetVisible(false);
        }}
        onClose={() => setSortSheetVisible(false)}
      />

      <FolderFilterSheet
        visible={folderFilterVisible}
        folders={folderOptions}
        selected={selectedFoldersFilter}
        onClose={() => setFolderFilterVisible(false)}
        onApply={next => {
          setSelectedFoldersFilter(next);
          setFolderFilterVisible(false);
        }}
        onClear={() => setSelectedFoldersFilter([])}
      />

      <FolderAssignmentSheet
        item={folderEditorItem}
        folders={folderOptions}
        onClose={closeFolderEditor}
        onSubmit={async (item, next) => {
          await handleUpdateFolders(item, next);
          closeFolderEditor();
        }}
        onCreateFolder={async name => {
          const created = await addFolder(name);
          setUndoState({
            message: `Created folder “${created}”`,
            actionLabel: 'Undo',
            onUndo: () => removeFolder(created),
          });
          return created;
        }}
      />

      <UndoToast visible={!!undoState} message={undoState?.message ?? ''} onUndo={handleUndo} />
    </ScreenContainer>
  );
};

const SWIPE_OPEN_VALUE = -84;
const SWIPE_THRESHOLD = -50;

const SwipeableRow: React.FC<{
  onDelete: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}> = ({ onDelete, disabled = false, children }) => {
  const styles = useThemeStyles(createStyles);
  const translateX = useMemo(() => new Animated.Value(0), []);
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => {
    Animated.timing(translateX, {
      toValue: SWIPE_OPEN_VALUE,
      duration: 160,
      useNativeDriver: true,
    }).start(() => setIsOpen(true));
  }, [translateX]);

  const close = useCallback(() => {
    Animated.timing(translateX, {
      toValue: 0,
      duration: 160,
      useNativeDriver: true,
    }).start(() => setIsOpen(false));
  }, [translateX]);

  useEffect(() => {
    if (disabled && isOpen) {
      close();
    }
  }, [close, disabled, isOpen]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, gesture) =>
          !disabled && Math.abs(gesture.dx) > Math.abs(gesture.dy),
        onPanResponderGrant: () => {
          translateX.stopAnimation();
        },
        onPanResponderMove: (_, gesture) => {
          if (disabled) {
            return;
          }
          const offset = isOpen ? SWIPE_OPEN_VALUE : 0;
          const nextValue = Math.max(SWIPE_OPEN_VALUE - 20, Math.min(0, gesture.dx + offset));
          translateX.setValue(nextValue);
        },
        onPanResponderRelease: (_, gesture) => {
          if (disabled) {
            return;
          }
          const offset = isOpen ? SWIPE_OPEN_VALUE : 0;
          const finalX = gesture.dx + offset;
          if (finalX < SWIPE_THRESHOLD) {
            open();
          } else {
            close();
          }
        },
        onPanResponderTerminate: () => {
          if (!disabled) {
            close();
          }
        },
      }),
    [close, disabled, isOpen, open, translateX],
  );

  return (
    <View style={styles.swipeContainer}>
      <View style={styles.deleteRail}>
        <Pressable
          onPress={() => {
            onDelete();
            close();
          }}
          style={styles.deleteRailButton}
          accessibilityRole="button"
          accessibilityLabel="Delete word"
        >
          <Text style={styles.deleteRailLabel}>✕</Text>
        </Pressable>
      </View>
      <Animated.View
        style={[styles.swipeContent, { transform: [{ translateX }] }]}
        {...panResponder.panHandlers}
      >
        {children}
      </Animated.View>
    </View>
  );
};

const WordListItem: React.FC<{
  item: VocabItem;
  expanded: boolean;
  selectMode: boolean;
  selected: boolean;
  onPress: () => void;
  onLongPress: () => void;
  onToggleSelect: () => void;
  onEditFolders: () => void;
  onDelete: () => void;
  onOpenDetail: () => void;
}> = ({
  item,
  expanded,
  selectMode,
  selected,
  onPress,
  onLongPress,
  onToggleSelect,
  onEditFolders,
  onDelete,
  onOpenDetail,
}) => {
  const styles = useThemeStyles(createStyles);
  const lastReviewed = item.srsData?.lastReviewedAt ?? null;
  const dueAt = item.srsData?.dueAt ?? null;

  const formattedDate = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString() : 'Not reviewed';

  return (
    <SwipeableRow onDelete={onDelete} disabled={selectMode}>
      <Pressable
        onPress={selectMode ? onToggleSelect : onPress}
        onLongPress={onLongPress}
        style={[
          styles.wordCard,
          expanded && styles.wordCardExpanded,
          selectMode && styles.wordCardSelectable,
          selected && styles.wordCardSelected,
        ]}
        accessibilityRole="button"
        accessibilityLabel={`${item.term} card`}
      >
        {selectMode ? (
          <Pressable
            onPress={onToggleSelect}
            style={[
              styles.selectionBadge,
              selected && styles.selectionBadgeSelected,
            ]}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: selected }}
          >
            {selected ? <Text style={styles.selectionBadgeText}>✓</Text> : null}
          </Pressable>
        ) : null}
        <View style={styles.wordTopRow}>
          <View style={styles.wordTitleGroup}>
            <Text style={styles.wordTerm}>{item.term}</Text>
            {item.reading ? (
              <Text style={styles.wordReading}>{item.reading}</Text>
            ) : null}
          </View>
        </View>
        <Text style={styles.wordMeaning} numberOfLines={1}>
          {item.meaning}
        </Text>
        <View style={styles.wordFoldersRow}>
          {item.folders.length === 0 ? (
            <View style={styles.wordFolderChipMuted}>
              <Text style={styles.wordFolderChipLabelMuted}>No folders</Text>
            </View>
          ) : (
            item.folders.map(folder => (
              <View key={folder} style={styles.wordFolderChip}>
                <Text style={styles.wordFolderChipLabel}>{folder}</Text>
              </View>
            ))
          )}
        </View>
        {expanded ? (
          <View style={styles.wordExpandedSection}>
            <View style={styles.wordExpandedRow}>
              <Text style={styles.wordExpandedLabel}>Level</Text>
              <Text style={styles.wordExpandedValue}>{item.level}</Text>
            </View>
            <View style={styles.wordExpandedRow}>
              <Text style={styles.wordExpandedLabel}>Last practiced</Text>
              <Text style={styles.wordExpandedValue}>{formattedDate(lastReviewed)}</Text>
            </View>
            {dueAt ? (
              <View style={styles.wordExpandedRow}>
                <Text style={styles.wordExpandedLabel}>Next review</Text>
                <Text style={styles.wordExpandedValue}>{formattedDate(dueAt)}</Text>
              </View>
            ) : null}
            {item.examples.length > 0 ? (
              <View style={styles.wordExamplesBlock}>
                <Text style={styles.wordExpandedLabel}>Examples</Text>
                {item.examples.map(example => (
                  <Text key={example} style={styles.wordExampleLine}>
                    • {example}
                  </Text>
                ))}
              </View>
            ) : null}
            <Pressable
              onPress={onOpenDetail}
              style={styles.wordDetailLink}
              accessibilityRole="button"
            >
              <Text style={styles.wordDetailLinkLabel}>Open full details</Text>
            </Pressable>
            <View style={styles.wordExpandedActions}>
              <Pressable
                onPress={onEditFolders}
                style={styles.wordExpandedActionButton}
                accessibilityRole="button"
                accessibilityLabel={`Organise ${item.term}`}
              >
                <Text style={styles.wordExpandedActionLabel}>Organise folders</Text>
              </Pressable>
            </View>
          </View>
        ) : null}
      </Pressable>
    </SwipeableRow>
  );
};

const SelectionBar: React.FC<{
  count: number;
  noun: string;
  onCancel: () => void;
  onDelete: () => void;
}> = ({ count, noun, onCancel, onDelete }) => {
  const styles = useThemeStyles(createStyles);
  return (
    <View style={styles.selectionBar}>
      <Text style={styles.selectionBarLabel}>
        {count} {count === 1 ? noun : `${noun}s`} selected
      </Text>
      <View style={styles.selectionBarActions}>
        <Pressable onPress={onCancel} style={styles.selectionBarButton}>
          <Text style={styles.selectionBarButtonLabel}>Cancel</Text>
        </Pressable>
        <Pressable onPress={onDelete} style={[styles.selectionBarButton, styles.selectionBarDelete]}>
          <Text style={styles.selectionBarDeleteLabel}>Delete</Text>
        </Pressable>
      </View>
    </View>
  );
};

const SortSheet: React.FC<{
  visible: boolean;
  value: SortMode;
  onSelect: (mode: SortMode) => void;
  onClose: () => void;
}> = ({ visible, value, onSelect, onClose }) => {
  const styles = useThemeStyles(createStyles);
  const { colors } = useTheme();

  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.sheetOverlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={event => event.stopPropagation()}>
          <Text style={styles.sheetTitle}>Sort by</Text>
          <ScrollView style={styles.sheetList}>
            {sortOptions.map(option => {
              const active = option.id === value;
              return (
                <Pressable
                  key={option.id}
                  onPress={() => onSelect(option.id)}
                  style={[
                    styles.sheetItem,
                    active && { backgroundColor: colors.surfaceMuted },
                  ]}
                >
                  <Text style={styles.sheetItemLabel}>{option.label}</Text>
                  <Text style={styles.sheetItemState}>{active ? 'Selected' : 'Tap to apply'}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
          <Pressable onPress={onClose} style={styles.sheetDismiss}>
            <Text style={styles.sheetDismissLabel}>Close</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const FolderFilterSheet: React.FC<{
  visible: boolean;
  folders: string[];
  selected: string[];
  onApply: (next: string[]) => void;
  onClear: () => void;
  onClose: () => void;
}> = ({ visible, folders, selected, onApply, onClose, onClear }) => {
  const styles = useThemeStyles(createStyles);
  const { colors } = useTheme();
  const [draft, setDraft] = useState<string[]>(selected);

  useEffect(() => {
    setDraft(selected);
  }, [selected, visible]);

  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.sheetOverlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={event => event.stopPropagation()}>
          <Text style={styles.sheetTitle}>Filter by folders</Text>
          <ScrollView style={styles.sheetList}>
            {folders.length === 0 ? (
              <Text style={styles.sheetEmpty}>No folders yet. Create one first.</Text>
            ) : (
              folders.map(folder => {
                const active = draft.includes(folder);
                return (
                  <Pressable
                    key={folder}
                    onPress={() => {
                      setDraft(prev =>
                        prev.includes(folder)
                          ? prev.filter(value => value !== folder)
                          : [...prev, folder],
                      );
                    }}
                    style={[
                      styles.sheetItem,
                      active && { backgroundColor: colors.surfaceMuted },
                    ]}
                  >
                    <Text style={styles.sheetItemLabel}>{folder}</Text>
                    <Text style={styles.sheetItemState}>{active ? 'Selected' : 'Tap to add'}</Text>
                  </Pressable>
                );
              })
            )}
          </ScrollView>
          <View style={styles.sheetActions}>
            <Pressable onPress={() => { onClear(); onClose(); }} style={styles.sheetActionButton}>
              <Text style={styles.sheetActionLabel}>Clear</Text>
            </Pressable>
            <Pressable
              onPress={() => onApply(draft)}
              style={[styles.sheetActionButton, styles.sheetActionPrimary]}
            >
              <Text style={styles.sheetActionPrimaryLabel}>Apply</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const FolderAssignmentSheet: React.FC<{
  item: VocabItem | null;
  folders: string[];
  onClose: () => void;
  onSubmit: (item: VocabItem, nextFolders: string[]) => Promise<void>;
  onCreateFolder: (name: string) => Promise<string>;
}> = ({ item, folders, onClose, onSubmit, onCreateFolder }) => {
  const styles = useThemeStyles(createStyles);
  const { colors } = useTheme();
  const [draft, setDraft] = useState<string[]>(item?.folders ?? []);
  const [newFolder, setNewFolder] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDraft(item?.folders ?? []);
    setNewFolder('');
    setError(null);
  }, [item]);

  if (!item) {
    return null;
  }

  return (
    <Modal transparent visible animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.sheetOverlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={event => event.stopPropagation()}>
          <Text style={styles.sheetTitle}>Organise “{item.term}”</Text>
          <ScrollView style={styles.sheetList}>
            {folders.length === 0 ? (
              <Text style={styles.sheetEmpty}>
                No folders created yet. Add one below to get started.
              </Text>
            ) : (
              folders.map(folder => {
                const active = draft.includes(folder);
                return (
                  <Pressable
                    key={folder}
                    onPress={() => {
                      setDraft(prev =>
                        prev.includes(folder)
                          ? prev.filter(value => value !== folder)
                          : [...prev, folder],
                      );
                    }}
                    style={[
                      styles.sheetItem,
                      active && { backgroundColor: colors.surfaceMuted },
                    ]}
                  >
                    <Text style={styles.sheetItemLabel}>{folder}</Text>
                    <Text style={styles.sheetItemState}>{active ? 'Added' : 'Tap to add'}</Text>
                  </Pressable>
                );
              })
            )}
          </ScrollView>
          <View style={styles.sheetDivider} />
          <Text style={styles.sheetSubtitle}>Create new folder</Text>
          <View style={styles.sheetCreateRow}>
            <TextInput
              value={newFolder}
              onChangeText={text => {
                setNewFolder(text);
                setError(null);
              }}
              placeholder="Folder name"
              placeholderTextColor={colors.textSecondary}
              style={styles.sheetCreateInput}
            />
            <Pressable
              onPress={async () => {
                const trimmed = newFolder.trim();
                if (!trimmed) {
                  setError('Enter a folder name.');
                  return;
                }
                try {
                  const created = await onCreateFolder(trimmed);
                  setDraft(prev => [...prev, created]);
                  setNewFolder('');
                  setError(null);
                } catch (creationError) {
                  setError(
                    creationError instanceof Error
                      ? creationError.message
                      : 'Unable to create folder.',
                  );
                }
              }}
              style={styles.sheetCreateButton}
            >
              <Text style={styles.sheetCreateButtonLabel}>Add</Text>
            </Pressable>
          </View>
          {error ? <Text style={styles.sheetError}>{error}</Text> : null}
          <View style={styles.sheetActions}>
            <Pressable onPress={onClose} style={styles.sheetActionButton}>
              <Text style={styles.sheetActionLabel}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={() => onSubmit(item, draft)}
              style={[styles.sheetActionButton, styles.sheetActionPrimary]}
            >
              <Text style={styles.sheetActionPrimaryLabel}>Save</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const UndoToast: React.FC<{ visible: boolean; message: string; onUndo: () => void }> = ({
  visible,
  message,
  onUndo,
}) => {
  const styles = useThemeStyles(createStyles);
  if (!visible) {
    return null;
  }
  return (
    <View style={styles.undoContainer}>
      <Text style={styles.undoMessage}>{message}</Text>
      <Pressable onPress={onUndo} style={styles.undoButton}>
        <Text style={styles.undoButtonLabel}>Undo</Text>
      </Pressable>
    </View>
  );
};

export default WordBankScreen;

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },
    paneSwitch: {
      flexDirection: 'row',
      marginHorizontal: spacing.screenHorizontal,
      marginBottom: spacing.base,
      backgroundColor: colors.neutral,
      borderRadius: radii.control,
      padding: 4,
      gap: 4,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    paneButton: {
      flex: 1,
      paddingVertical: 10,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radii.control,
    },
    paneButtonActive: {
      backgroundColor: colors.accent,
      shadowColor: colors.accent,
      shadowOpacity: 0.25,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 6 },
      elevation: 3,
    },
    paneButtonLabel: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    paneButtonLabelActive: {
      color: colors.textOnAccent,
      fontFamily: fontFamilies.sans.medium,
    },
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
    swipeContainer: {
      position: 'relative',
      overflow: 'hidden',
      borderRadius: radii.surface,
      marginBottom: 0,
    },
    deleteRail: {
      position: 'absolute',
      top: 0,
      right: 0,
      bottom: 0,
      width: Math.abs(SWIPE_OPEN_VALUE),
      justifyContent: 'center',
      alignItems: 'flex-end',
      backgroundColor: colors.background,
    },
    deleteRailButton: {
      width: Math.abs(SWIPE_OPEN_VALUE) - 8,
      height: '100%',
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.error,
      borderRadius: radii.surface,
      marginLeft: 8,
    },
    deleteRailLabel: {
      ...typography.headline,
      color: colors.textOnAccent,
    },
    swipeContent: {
      borderRadius: radii.surface,
    },
    wordCard: {
      position: 'relative',
      borderRadius: radii.surface,
      backgroundColor: colors.surface,
      padding: 12,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      gap: 8,
      ...shadows.card,
    },
    wordCardExpanded: {
      backgroundColor: colors.surface,
    },
    wordCardSelectable: {
      borderColor: colors.accentSecondary,
    },
    wordCardSelected: {
      borderColor: colors.accent,
      backgroundColor: colors.accentSoft,
    },
    selectionBadge: {
      position: 'absolute',
      top: 12,
      right: 12,
      width: 24,
      height: 24,
      borderRadius: 12,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surface,
    },
    selectionBadgeSelected: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
    },
    selectionBadgeText: {
      ...typography.caption,
      color: colors.textOnAccent,
      fontFamily: fontFamilies.sans.medium,
    },
    wordTopRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 12,
    },
    wordTitleGroup: {
      flexShrink: 1,
    },
    wordTerm: {
      fontSize: 18,
      lineHeight: 22,
      fontFamily: fontFamilies.plexSerif.semibold,
      color: colors.textPrimary,
    },
    wordReading: {
      ...typography.caption,
      color: colors.textSecondary,
      marginTop: 2,
    },
    wordMeaning: {
      ...typography.captionStrong,
      color: colors.textPrimary,
    },
    wordFoldersRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 4,
    },
    wordFolderChip: {
      borderRadius: radii.control,
      paddingHorizontal: 10,
      paddingVertical: 4,
      backgroundColor: colors.accentSecondarySoft,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    wordFolderChipMuted: {
      borderRadius: radii.control,
      paddingHorizontal: 10,
      paddingVertical: 4,
      backgroundColor: colors.surfaceMuted,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    wordFolderChipLabel: {
      ...typography.caption,
      color: colors.accentSecondary,
    },
    wordFolderChipLabelMuted: {
      ...typography.caption,
      color: colors.textSecondary,
      fontStyle: 'italic',
    },
    wordExpandedActions: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 6,
    },
    wordExpandedActionButton: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: radii.control,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    wordExpandedActionLabel: {
      ...typography.caption,
      color: colors.accent,
      fontFamily: fontFamilies.sans.medium,
    },
    wordExpandedSection: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
      paddingTop: 10,
      gap: 8,
    },
    wordExpandedRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    wordExpandedLabel: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    wordExpandedValue: {
      ...typography.caption,
      color: colors.textPrimary,
    },
    wordExamplesBlock: {
      gap: 4,
    },
    wordExampleLine: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    wordDetailLink: {
      alignSelf: 'flex-start',
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: radii.control,
      backgroundColor: colors.accentSoft,
    },
    wordDetailLinkLabel: {
      ...typography.caption,
      color: colors.accent,
      fontFamily: fontFamilies.sans.medium,
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
    foldersPane: {
      flex: 1,
    },
    foldersContent: {
      paddingHorizontal: spacing.screenHorizontal,
      paddingBottom: spacing.block * 2,
      gap: 16,
    },
    folderToolbar: {
      flexDirection: 'row',
      gap: spacing.base,
    },
    folderToolbarButton: {
      flex: 1,
      borderRadius: radii.control,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      paddingVertical: 10,
      alignItems: 'center',
      backgroundColor: colors.surface,
    },
    folderToolbarButtonActive: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
    },
    folderToolbarLabel: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    folderToolbarLabelActive: {
      color: colors.textOnAccent,
      fontFamily: fontFamilies.sans.medium,
    },
    folderCreateCard: {
      borderRadius: radii.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      padding: 16,
      gap: 12,
      ...shadows.card,
    },
    folderCreateRow: {
      flexDirection: 'row',
      gap: 12,
      alignItems: 'center',
    },
    folderCreateInput: {
      flex: 1,
      borderRadius: radii.control,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      paddingHorizontal: 12,
      paddingVertical: 10,
      ...typography.caption,
      color: colors.textPrimary,
      backgroundColor: colors.surface,
    },
    folderCreateButton: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: radii.control,
      backgroundColor: colors.accent,
    },
    folderCreateButtonLabel: {
      ...typography.captionStrong,
      color: colors.textOnAccent,
    },
    folderError: {
      ...typography.caption,
      color: colors.error,
    },
    folderCard: {
      borderRadius: radii.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      padding: 16,
      gap: 10,
      ...shadows.card,
    },
    folderCardSelectable: {
      borderColor: colors.accentSecondary,
    },
    folderCardSelected: {
      borderColor: colors.accent,
      backgroundColor: colors.accentSoft,
    },
    folderCardActive: {
      borderColor: colors.accentSecondary,
      backgroundColor: colors.accentSecondarySoft,
    },
    folderHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    folderName: {
      ...typography.subhead,
      color: colors.textPrimary,
      fontFamily: fontFamilies.plexSerif.semibold,
    },
    folderCount: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    folderExamples: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    folderExamplesMuted: {
      ...typography.caption,
      color: colors.textSecondary,
      fontStyle: 'italic',
    },
    folderRenameRow: {
      borderRadius: radii.control,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      backgroundColor: colors.surfaceMuted,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    folderRenameInput: {
      width: '100%',
      borderRadius: radii.control,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      paddingHorizontal: 12,
      paddingVertical: 8,
      ...typography.caption,
      color: colors.textPrimary,
      backgroundColor: colors.surface,
    },
    folderRenameActions: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 10,
    },
    folderRenameButton: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: radii.control,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      alignItems: 'center',
      backgroundColor: colors.surface,
    },
    folderRenameButtonLabel: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    folderWordSection: {
      marginTop: spacing.block,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
      paddingTop: spacing.base,
      gap: spacing.base,
    },
    folderWordHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    folderWordTitle: {
      ...typography.subhead,
      color: colors.textPrimary,
    },
    folderWordClose: {
      ...typography.captionStrong,
      color: colors.accent,
    },
    selectionBar: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: radii.control,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      backgroundColor: colors.surfaceMuted,
      marginTop: spacing.base,
      gap: spacing.base,
    },
    selectionBarLabel: {
      ...typography.captionStrong,
      color: colors.textPrimary,
    },
    selectionBarActions: {
      flexDirection: 'row',
      gap: 8,
    },
    selectionBarButton: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: radii.control,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    selectionBarButtonLabel: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    selectionBarDelete: {
      backgroundColor: colors.error,
      borderColor: colors.error,
    },
    selectionBarDeleteLabel: {
      ...typography.captionStrong,
      color: colors.textOnAccent,
    },
    sheetOverlay: {
      flex: 1,
      backgroundColor: colors.overlay,
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: colors.surface,
      padding: 24,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      gap: 16,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      maxHeight: '80%',
    },
    sheetTitle: {
      ...typography.subhead,
      color: colors.textPrimary,
    },
    sheetSubtitle: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    sheetList: {
      maxHeight: 320,
    },
    sheetItem: {
      borderRadius: radii.control,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      padding: 14,
      marginBottom: 12,
      backgroundColor: colors.surface,
    },
    sheetItemLabel: {
      ...typography.body,
      color: colors.textPrimary,
    },
    sheetItemState: {
      ...typography.caption,
      color: colors.textSecondary,
      marginTop: 4,
    },
    sheetEmpty: {
      ...typography.caption,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    sheetActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 12,
    },
    sheetDismiss: {
      alignSelf: 'center',
      paddingHorizontal: 18,
      paddingVertical: 10,
      borderRadius: radii.control,
      backgroundColor: colors.surfaceMuted,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    sheetDismissLabel: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    sheetActionButton: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: radii.control,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    sheetActionPrimary: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
    },
    sheetActionLabel: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    sheetActionPrimaryLabel: {
      ...typography.captionStrong,
      color: colors.textOnAccent,
    },
    sheetDivider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.border,
    },
    sheetCreateRow: {
      flexDirection: 'row',
      gap: 12,
      alignItems: 'center',
    },
    sheetCreateInput: {
      flex: 1,
      borderRadius: radii.control,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      paddingHorizontal: 12,
      paddingVertical: 10,
      ...typography.caption,
      color: colors.textPrimary,
      backgroundColor: colors.surface,
    },
    sheetCreateButton: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: radii.control,
      backgroundColor: colors.accent,
    },
    sheetCreateButtonLabel: {
      ...typography.captionStrong,
      color: colors.textOnAccent,
    },
    sheetError: {
      ...typography.caption,
      color: colors.error,
    },
    undoContainer: {
      position: 'absolute',
      bottom: spacing.block,
      left: spacing.screenHorizontal,
      right: spacing.screenHorizontal,
      borderRadius: radii.surface,
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      ...shadows.card,
    },
    undoMessage: {
      ...typography.caption,
      color: colors.textPrimary,
      flex: 1,
    },
    undoButton: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: radii.control,
      backgroundColor: colors.accent,
    },
    undoButtonLabel: {
      ...typography.captionStrong,
      color: colors.textOnAccent,
    },
  });
