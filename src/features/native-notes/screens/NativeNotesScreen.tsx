import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
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
import {
  useNavigation,
  useFocusEffect,
} from '@react-navigation/native';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import ScreenHeader from '@/shared/components/ScreenHeader';
import ScreenContainer from '@/shared/components/ScreenContainer';
import { spacing, radii, typography, shadows, fontFamilies } from '@/shared/theme/tokens';
import { useNotesStore } from '@/state/notes.store';
import { useBankStore } from '@/state/bank.store';
import type { MainTabsParamList, RootStackParamList } from '@/navigation/types';
import { useTheme, type ThemeColors } from '@/shared/theme/theme';
import { useThemeStyles } from '@/shared/theme/useThemeStyles';
import type { NativeNote } from '@/contracts/models';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type NativeNotesNavigation = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabsParamList, 'NativeNotes'>,
  NativeStackNavigationProp<RootStackParamList>
>;

type NoteStatus = 'unanswered' | 'answered';

const STATUS_LABELS: Record<NoteStatus, string> = {
  unanswered: 'Unanswered',
  answered: 'Answered',
};

type SortMode = 'newest' | 'oldest' | 'titleAsc' | 'titleDesc';

const filterOptions: Array<{ id: NoteStatus; label: string }> = [
  { id: 'unanswered', label: 'Unanswered' },
  { id: 'answered', label: 'Answered' },
];

const NativeNotesScreen: React.FC = () => {
  const navigation = useNavigation<NativeNotesNavigation>();
  const styles = useThemeStyles(createStyles);
  const { colors } = useTheme();
  const statusPalettes = useMemo(
    () => ({
      unanswered: { background: colors.accent, text: colors.textOnAccent },
      answered: { background: colors.success, text: colors.textOnAccent },
    }),
    [colors],
  );
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortMode>('newest');
  const [statusFilters, setStatusFilters] = useState<NoteStatus[]>([]);
  const [sortSheetVisible, setSortSheetVisible] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const {
    notes,
    loadNotes,
    isLoading,
    deleteNote,
  } = useNotesStore();
  const { items: bankItems, loadBank } = useBankStore();

  useEffect(() => {
    loadNotes().catch(() => undefined);
    loadBank().catch(() => undefined);
  }, [loadNotes, loadBank]);

  useFocusEffect(
    useCallback(() => {
      loadNotes().catch(() => undefined);
      return () => undefined;
    }, [loadNotes]),
  );

  const vocabMap = useMemo(() => {
    return bankItems.reduce<Record<string, string>>((acc, item) => {
      acc[item.id] = item.term;
      return acc;
    }, {});
  }, [bankItems]);

  const sortLabel = useMemo(() => {
    switch (sort) {
      case 'oldest':
        return 'Oldest';
      case 'titleAsc':
        return 'Title A–Z';
      case 'titleDesc':
        return 'Title Z–A';
      case 'newest':
      default:
        return 'Newest';
    }
  }, [sort]);

  const filterSummary = useMemo(() => {
    if (statusFilters.length === 0 || statusFilters.length === filterOptions.length) {
      return 'All notes';
    }
    return statusFilters.map(status => STATUS_LABELS[status]).join(', ');
  }, [statusFilters]);

  const sortSummary = useMemo(
    () => `${sortLabel} · ${filterSummary}`,
    [sortLabel, filterSummary],
  );

  const toggleStatusFilter = useCallback((filter: NoteStatus) => {
    setStatusFilters(prev =>
      prev.includes(filter)
        ? prev.filter(item => item !== filter)
        : [...prev, filter],
    );
  }, []);

  const hasActiveFilters =
    statusFilters.length > 0 && statusFilters.length < filterOptions.length;
  const isCustomSort = sort !== 'newest';
  const sortButtonActive = isCustomSort || hasActiveFilters;

  const filteredNotes = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    const hasStatusFilter =
      statusFilters.length > 0 && statusFilters.length < filterOptions.length;
    const filtered = notes.filter(note => {
      const derivedStatus: NoteStatus = note.answeredAt ? 'answered' : 'unanswered';
      if (hasStatusFilter && !statusFilters.includes(derivedStatus)) {
        return false;
      }
      if (!normalized) {
        return true;
      }
      const linkedTerm = note.vocabItemId ? vocabMap[note.vocabItemId] ?? '' : '';
      return [note.title, note.content, note.answer ?? '', linkedTerm]
        .join(' ')
        .toLowerCase()
        .includes(normalized);
    });

    const sorted = filtered.slice().sort((a, b) => {
      switch (sort) {
        case 'oldest':
          return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
        case 'titleAsc':
          return a.title.localeCompare(b.title);
        case 'titleDesc':
          return b.title.localeCompare(a.title);
        case 'newest':
        default:
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      }
    });

    return sorted;
  }, [notes, statusFilters, search, vocabMap, sort]);

  const handleDeleteNote = useCallback(
    async (noteId: string) => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      try {
        await deleteNote(noteId);
        setSelectedIds(prev => prev.filter(id => id !== noteId));
      } catch {
        // ignore for now; store error state already reflects failure
      }
    },
    [deleteNote],
  );

  const statusShift = selectMode ? 26 : 0;

  const renderStatus = (noteId: string) => {
    const note = notes.find(entry => entry.id === noteId);
    if (!note) {
      return null;
    }
    const derived: NoteStatus = note.answeredAt ? 'answered' : 'unanswered';
    const palette = statusPalettes[derived];
    if (!palette) {
      return null;
    }
    return (
      <View
        style={[
          styles.statusBadge,
          {
            backgroundColor: palette.background,
            marginRight: statusShift,
          },
        ]}
      >
        <Text style={[styles.statusLabel, { color: palette.text }]}>
          {derived === 'answered' ? 'Answered' : 'Unanswered'}
        </Text>
      </View>
    );
  };

  return (
    <ScreenContainer style={styles.screen}>
      <ScreenHeader
        title="Native Notes"
        onProfilePress={() => navigation.navigate('Settings')}
      />

      <View style={styles.toolbar}>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search notes…"
          placeholderTextColor={colors.textSecondary}
          style={styles.searchInput}
          accessibilityLabel="Search saved notes"
        />
        <View style={styles.toolbarRow}>
          <Pressable
            onPress={() => setSortSheetVisible(true)}
            style={({ pressed }) => [
              styles.toolbarButton,
              sortButtonActive && styles.toolbarButtonActive,
              pressed && styles.toolbarButtonPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Sort and filter notes"
          >
            <Text
              style={[
                styles.toolbarButtonTitle,
                sortButtonActive && styles.toolbarButtonTitleActive,
              ]}
            >
              Sort & Filter
            </Text>
            <Text
              style={[
                styles.toolbarButtonSubtitle,
                sortButtonActive && styles.toolbarButtonSubtitleActive,
              ]}
              numberOfLines={1}
            >
              {sortSummary}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => {
              if (selectMode) {
                setSelectMode(false);
                setSelectedIds([]);
              } else {
                setSelectMode(true);
              }
            }}
            style={({ pressed }) => [
              styles.toolbarButton,
              selectMode && styles.toolbarButtonActive,
              pressed && styles.toolbarButtonPressed,
              styles.toolbarButtonCompact,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Toggle multi select mode"
          >
            <Text
              style={[
                styles.toolbarButtonSingle,
                selectMode && styles.toolbarButtonSingleActive,
              ]}
            >
              Select
            </Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.toolbarButton,
              styles.toolbarButtonPrimary,
              pressed && styles.toolbarButtonPrimaryPressed,
              styles.toolbarButtonCompact,
            ]}
            onPress={() => navigation.navigate('CreateNote', { source: 'native-notes' })}
            accessibilityRole="button"
            accessibilityLabel="Create a new note"
          >
            <Text style={[styles.toolbarButtonSingle, styles.toolbarButtonSinglePrimary]}>
              New Note
            </Text>
          </Pressable>
        </View>
      </View>

      <FlatList
        data={filteredNotes}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        refreshing={isLoading}
        onRefresh={() => loadNotes().catch(() => undefined)}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Nothing captured yet</Text>
            <Text style={styles.emptySubtitle}>
              Long-press dictionary answers to save clarifying questions from natives.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <NoteListItem
            note={item}
            term={item.vocabItemId ? vocabMap[item.vocabItemId] : undefined}
            statusBadge={renderStatus(item.id)}
            selectMode={selectMode}
            selected={selectedIds.includes(item.id)}
            onToggleSelect={() =>
              setSelectedIds(prev =>
                prev.includes(item.id)
                  ? prev.filter(id => id !== item.id)
                  : [...prev, item.id],
              )
            }
            onPress={() => {
              if (selectMode) {
                setSelectedIds(prev =>
                  prev.includes(item.id)
                    ? prev.filter(id => id !== item.id)
                    : [...prev, item.id],
                );
                return;
              }
              navigation.navigate('NoteDetail', { noteId: item.id });
            }}
            onLongPress={() => {
              if (!selectMode) {
                setSelectMode(true);
                setSelectedIds([item.id]);
              }
            }}
            onDelete={() => handleDeleteNote(item.id)}
          />
        )}
      />
      {selectMode && selectedIds.length > 0 ? (
        <SelectionBar
          count={selectedIds.length}
          noun="note"
          onCancel={() => {
            setSelectedIds([]);
            setSelectMode(false);
          }}
          onDelete={async () => {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            try {
              await Promise.all(selectedIds.map(id => deleteNote(id)));
            } catch {
              // ignore individual failures; store exposes error state separately
            }
            setSelectedIds([]);
            setSelectMode(false);
          }}
        />
      ) : null}

      <SortSheet
        visible={sortSheetVisible}
        sortValue={sort}
        filters={statusFilters}
        onSelectSort={setSort}
        onToggleFilter={toggleStatusFilter}
        onClear={() => {
          setSort('newest');
          setStatusFilters([]);
        }}
        onClose={() => setSortSheetVisible(false)}
      />
    </ScreenContainer>
  );
};

export default NativeNotesScreen;

const SWIPE_OPEN_VALUE = -84;
const SWIPE_THRESHOLD = -50;

  const SelectionBar: React.FC<{
    count: number;
    noun: string;
    onCancel: () => void;
    onDelete: () => void | Promise<void>;
  }> = ({ count, noun, onCancel, onDelete }) => {
    const styles = useThemeStyles(createStyles);
    const handleDelete = useCallback(() => {
      Promise.resolve(onDelete()).catch(() => undefined);
    }, [onDelete]);

  return (
    <View style={styles.selectionBar}>
      <Text style={styles.selectionBarLabel}>
        {count} {count === 1 ? noun : `${noun}s`} selected
      </Text>
      <View style={styles.selectionBarActions}>
        <Pressable onPress={onCancel} style={styles.selectionBarButton}>
          <Text style={styles.selectionBarButtonLabel}>Cancel</Text>
        </Pressable>
        <Pressable onPress={handleDelete} style={[styles.selectionBarButton, styles.selectionBarDelete]}>
          <Text style={styles.selectionBarDeleteLabel}>Delete</Text>
        </Pressable>
      </View>
    </View>
  );
};

const SortSheet: React.FC<{
  visible: boolean;
  sortValue: SortMode;
  filters: NoteStatus[];
  onSelectSort: (mode: SortMode) => void;
  onToggleFilter: (filter: NoteStatus) => void;
  onClear: () => void;
  onClose: () => void;
}> = ({ visible, sortValue, filters, onSelectSort, onToggleFilter, onClear, onClose }) => {
  const styles = useThemeStyles(createStyles);
  const hasAnyFilters = filters.length > 0;
  const canClear = hasAnyFilters || sortValue !== 'newest';

  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.sheetOverlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={event => event.stopPropagation()}>
          <Text style={styles.sheetTitle}>Sort & Filter</Text>
          <ScrollView style={styles.sheetList}>
            <Text style={styles.sheetSectionTitle}>Sort order</Text>
            {[
              { id: 'newest' as const, label: 'Newest first' },
              { id: 'oldest' as const, label: 'Oldest first' },
              { id: 'titleAsc' as const, label: 'Title A–Z' },
              { id: 'titleDesc' as const, label: 'Title Z–A' },
            ].map(option => {
              const active = option.id === sortValue;
              return (
                <Pressable
                  key={option.id}
                  onPress={() => onSelectSort(option.id)}
                  style={[
                    styles.sheetOptionRow,
                    active && styles.sheetOptionRowActive,
                  ]}
                >
                  <View style={styles.sheetOptionContent}>
                    <Text style={styles.sheetItemLabel}>{option.label}</Text>
                    <Text style={styles.sheetItemState}>
                      {active ? 'Active' : 'Tap to use'}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.sheetRadio,
                      active && styles.sheetRadioActive,
                    ]}
                  />
                </Pressable>
              );
            })}

            <Text style={styles.sheetSectionTitle}>Filters</Text>
            {filterOptions.map(option => {
              const active = filters.includes(option.id);
              return (
                <Pressable
                  key={option.id}
                  onPress={() => onToggleFilter(option.id)}
                  style={[
                    styles.sheetOptionRow,
                    active && styles.sheetOptionRowActive,
                  ]}
                >
                  <View style={styles.sheetOptionContent}>
                    <Text style={styles.sheetItemLabel}>{option.label}</Text>
                    <Text style={styles.sheetItemState}>
                      {active ? 'Included' : 'Tap to include'}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.sheetCheckbox,
                      active && styles.sheetCheckboxActive,
                    ]}
                  >
                    {active ? <Text style={styles.sheetCheckboxMark}>✓</Text> : null}
                  </View>
                </Pressable>
              );
            })}
            <Pressable
              onPress={onClear}
              style={[
                styles.sheetClear,
                !canClear && styles.sheetClearDisabled,
              ]}
              disabled={!canClear}
            >
              <Text
                style={[
                  styles.sheetClearLabel,
                  !canClear && styles.sheetClearLabelDisabled,
                ]}
              >
                Clear all
              </Text>
            </Pressable>
          </ScrollView>
          <Pressable onPress={onClose} style={styles.sheetDismiss}>
            <Text style={styles.sheetDismissLabel}>Close</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const SwipeableRow: React.FC<{
  onDelete: () => void;
  children: React.ReactNode;
}> = ({ onDelete, children }) => {
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

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, gesture) =>
          Math.abs(gesture.dx) > Math.abs(gesture.dy),
        onPanResponderGrant: () => {
          translateX.stopAnimation();
        },
        onPanResponderMove: (_, gesture) => {
          const offset = isOpen ? SWIPE_OPEN_VALUE : 0;
          const nextValue = Math.max(SWIPE_OPEN_VALUE - 20, Math.min(0, gesture.dx + offset));
          translateX.setValue(nextValue);
        },
        onPanResponderRelease: (_, gesture) => {
          const offset = isOpen ? SWIPE_OPEN_VALUE : 0;
          const finalX = gesture.dx + offset;
          if (finalX < SWIPE_THRESHOLD) {
            open();
          } else {
            close();
          }
        },
        onPanResponderTerminate: () => {
          close();
        },
      }),
    [close, isOpen, open, translateX],
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
          accessibilityLabel="Delete note"
        >
          <Text style={styles.deleteRailLabel}>X</Text>
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

const NoteListItem: React.FC<{
  note: NativeNote;
  term?: string;
  statusBadge: React.ReactNode;
  selectMode: boolean;
  selected: boolean;
  onToggleSelect: () => void;
  onPress: () => void;
  onLongPress: () => void;
  onDelete: () => void;
}> = ({ note, term, statusBadge, selectMode, selected, onToggleSelect, onPress, onLongPress, onDelete }) => {
  const styles = useThemeStyles(createStyles);
  const lastUpdated = useMemo(
    () => new Date(note.updatedAt).toLocaleDateString(),
    [note.updatedAt],
  );

  return (
    <SwipeableRow onDelete={onDelete}>
      <Pressable
        onPress={onPress}
        onLongPress={onLongPress}
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
        accessibilityRole="button"
        accessibilityLabel={`Open note ${note.title}`}
      >
        {selectMode ? (
          <Pressable
            onPress={onToggleSelect}
            style={[styles.selectionBadge, selected && styles.selectionBadgeSelected]}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: selected }}
            accessibilityLabel={`Select note ${note.title}`}
          >
            {selected ? <Text style={styles.selectionBadgeText}>X</Text> : null}
          </Pressable>
        ) : null}
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {note.title}
          </Text>
          {statusBadge}
        </View>
        {term ? (
          <View style={styles.cardTagRow}>
            <Text style={styles.cardTag} numberOfLines={1}>
              {term}
            </Text>
          </View>
        ) : null}
        <Text style={styles.cardPreview} numberOfLines={2}>
          {note.content}
        </Text>
        <View style={styles.cardFooter}>
          <Text style={styles.cardMeta}>Updated {lastUpdated}</Text>
          <Text style={styles.cardAction}>Open</Text>
        </View>
      </Pressable>
    </SwipeableRow>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },
    toolbar: {
      paddingHorizontal: spacing.screenHorizontal,
      paddingTop: 12,
      paddingBottom: 8,
      gap: 12,
    },
    toolbarRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    searchInput: {
      width: '100%',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      borderRadius: radii.surface,
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: colors.surface,
      ...typography.body,
      color: colors.textPrimary,
    },
    toolbarButton: {
      flex: 1,
      minHeight: 40,
      borderRadius: radii.control,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      paddingHorizontal: 12,
      paddingVertical: 6,
      justifyContent: 'center',
      alignItems: 'flex-start',
      gap: 2,
    },
    toolbarButtonPressed: {
      backgroundColor: colors.surfaceMuted,
    },
    toolbarButtonPrimary: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
    },
    toolbarButtonPrimaryPressed: {
      opacity: 0.85,
    },
    toolbarButtonCompact: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 6,
      gap: 0,
    },
    toolbarButtonActive: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
    },
    toolbarButtonTitle: {
      ...typography.captionStrong,
      fontSize: 11,
      letterSpacing: 0.35,
      color: colors.textSecondary,
      textTransform: 'uppercase',
    },
    toolbarButtonTitleActive: {
      color: colors.textOnAccent,
    },
    toolbarButtonSubtitle: {
      ...typography.body,
      fontSize: 14,
      fontFamily: fontFamilies.sans.medium,
      color: colors.textPrimary,
    },
    toolbarButtonSubtitleActive: {
      color: colors.textOnAccent,
    },
    toolbarButtonSingle: {
      ...typography.bodyStrong,
      fontFamily: fontFamilies.sans.semibold,
      fontSize: 14,
      color: colors.textPrimary,
    },
    toolbarButtonSingleActive: {
      color: colors.textOnAccent,
    },
    toolbarButtonSinglePrimary: {
      color: colors.textOnAccent,
    },
    listContent: {
      paddingHorizontal: spacing.screenHorizontal,
      paddingVertical: spacing.block,
      gap: 12,
    },
    swipeContainer: {
      position: 'relative',
      overflow: 'hidden',
      borderRadius: radii.surface,
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
    emptyState: {
      alignItems: 'center',
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
      maxWidth: 260,
    },
    card: {
      borderRadius: radii.surface,
      backgroundColor: colors.surface,
      paddingHorizontal: 16,
      paddingVertical: 14,
      gap: 8,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      ...shadows.card,
    },
    cardPressed: {
      opacity: 0.92,
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
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.surface,
      zIndex: 2,
    },
    selectionBadgeSelected: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
    },
    selectionBadgeText: {
      ...typography.caption,
      color: colors.textOnAccent,
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 12,
    },
    cardTitle: {
      flex: 1,
      fontSize: 16,
      lineHeight: 22,
      fontFamily: fontFamilies.serif.semibold,
      color: colors.textPrimary,
    },
    cardTagRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
    },
    cardTag: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: radii.control,
      backgroundColor: colors.surfaceMuted,
      ...typography.caption,
      color: colors.textSecondary,
    },
    statusBadge: {
      borderRadius: radii.control,
      paddingHorizontal: 12,
      paddingVertical: 4,
      backgroundColor: colors.surfaceMuted,
    },
    statusLabel: {
      ...typography.captionStrong,
      color: colors.textSecondary,
    },
    cardPreview: {
      ...typography.body,
      color: colors.textSecondary,
    },
    cardFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    cardMeta: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    cardAction: {
      ...typography.captionStrong,
      color: colors.accent,
    },
    selectionBar: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginHorizontal: spacing.screenHorizontal,
      marginBottom: spacing.base,
      borderRadius: radii.control,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: colors.surfaceMuted,
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
    },
    sheetTitle: {
      ...typography.subhead,
      color: colors.textPrimary,
    },
    sheetSectionTitle: {
      ...typography.captionStrong,
      color: colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
      marginTop: 8,
      marginBottom: 4,
    },
    sheetList: {
      maxHeight: 320,
    },
    sheetOptionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 14,
      paddingHorizontal: 16,
      borderRadius: radii.control,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      marginBottom: 8,
      gap: 12,
    },
    sheetOptionRowActive: {
      backgroundColor: colors.surfaceMuted,
      borderColor: colors.accent,
    },
    sheetOptionContent: {
      flex: 1,
      gap: 4,
    },
    sheetItemLabel: {
      ...typography.body,
      color: colors.textPrimary,
    },
    sheetItemState: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    sheetRadio: {
      width: 18,
      height: 18,
      borderRadius: 9,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    sheetRadioActive: {
      borderColor: colors.accent,
      backgroundColor: colors.accent,
    },
    sheetCheckbox: {
      width: 20,
      height: 20,
      borderRadius: radii.control,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surface,
    },
    sheetCheckboxActive: {
      borderColor: colors.accent,
      backgroundColor: colors.accent,
    },
    sheetCheckboxMark: {
      ...typography.captionStrong,
      color: colors.textOnAccent,
    },
    sheetClear: {
      alignSelf: 'flex-start',
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: radii.control,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      marginTop: 8,
    },
    sheetClearDisabled: {
      opacity: 0.5,
    },
    sheetClearLabel: {
      ...typography.captionStrong,
      color: colors.textPrimary,
    },
    sheetClearLabelDisabled: {
      color: colors.textSecondary,
    },
    sheetDismiss: {
      alignSelf: 'flex-end',
      paddingVertical: 8,
      paddingHorizontal: 12,
    },
    sheetDismissLabel: {
      ...typography.caption,
      color: colors.textSecondary,
    },
  });
