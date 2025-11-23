import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/shared/theme/theme';
import type { ThemeColors } from '@/shared/theme/theme';
import { typography, spacing, radii } from '@/shared/theme/tokens';
import type { SortMode, NoteStatus } from '../hooks/useNativeNotes';

interface SortSheetProps {
  visible: boolean;
  sortValue: SortMode;
  filters: NoteStatus[];
  onSelectSort: (mode: SortMode) => void;
  onToggleFilter: (filter: NoteStatus) => void;
  onClear: () => void;
  onClose: () => void;
}

const filterOptions: Array<{ id: NoteStatus; label: string }> = [
    { id: 'unanswered', label: 'Unanswered' },
    { id: 'answered', label: 'Answered' },
  ];

export const SortSheet: React.FC<SortSheetProps> = ({
  visible,
  sortValue,
  filters,
  onSelectSort,
  onToggleFilter,
  onClear,
  onClose,
}) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
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

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    sheetOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: colors.surface,
      padding: 24,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      maxHeight: '80%',
    },
    sheetTitle: {
      ...typography.subhead,
      color: colors.textPrimary,
    },
    sheetSectionTitle: {
      ...typography.caption,
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
      ...typography.caption,
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
      alignSelf: 'center',
      paddingVertical: 8,
      paddingHorizontal: 12,
    },
    sheetDismissLabel: {
      ...typography.caption,
      color: colors.textSecondary,
    },
  });
