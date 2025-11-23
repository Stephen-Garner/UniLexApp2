import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/shared/theme/theme';
import { spacing, radii, typography, fontFamilies } from '@/shared/theme/tokens';
import type { VocabItem } from '@/contracts/models';
import SwipeableRow from './SwipeableRow';

type Props = {
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
};

const WordListItem: React.FC<Props> = ({
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
  const { colors } = useTheme();
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
          styles.card,
          { backgroundColor: colors.surface, borderColor: colors.border },
          expanded && { borderColor: colors.accent },
          selectMode && styles.cardSelectMode,
          selected && { backgroundColor: colors.accentSoft, borderColor: colors.accent },
        ]}
        accessibilityRole="button"
        accessibilityLabel={`${item.term} card`}
      >
        {selectMode && (
          <Pressable
            onPress={onToggleSelect}
            style={[
              styles.selectionBadge,
              { borderColor: colors.border },
              selected && { backgroundColor: colors.accent, borderColor: colors.accent },
            ]}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: selected }}
          >
            {selected && <Text style={styles.selectionBadgeText}>✓</Text>}
          </Pressable>
        )}
        <View style={styles.topRow}>
          <View style={styles.titleGroup}>
            <Text style={[styles.term, { color: colors.textPrimary }]}>{item.term}</Text>
            {item.reading && (
              <Text style={[styles.reading, { color: colors.textSecondary }]}>{item.reading}</Text>
            )}
          </View>
        </View>
        <Text style={[styles.meaning, { color: colors.textSecondary }]} numberOfLines={1}>
          {item.meaning}
        </Text>
        <View style={styles.foldersRow}>
          {item.folders.length === 0 ? (
            <View style={[styles.folderChip, { backgroundColor: colors.neutral }]}>
              <Text style={[styles.folderChipLabel, { color: colors.textSecondary }]}>No folders</Text>
            </View>
          ) : (
            item.folders.map(folder => (
              <View key={folder} style={[styles.folderChip, { backgroundColor: colors.accentSoft }]}>
                <Text style={[styles.folderChipLabel, { color: colors.accent }]}>{folder}</Text>
              </View>
            ))
          )}
        </View>
        {expanded && (
          <View style={[styles.expandedSection, { borderTopColor: colors.border }]}>
            <View style={styles.expandedRow}>
              <Text style={[styles.expandedLabel, { color: colors.textSecondary }]}>Level</Text>
              <Text style={[styles.expandedValue, { color: colors.textPrimary }]}>{item.level}</Text>
            </View>
            <View style={styles.expandedRow}>
              <Text style={[styles.expandedLabel, { color: colors.textSecondary }]}>Last practiced</Text>
              <Text style={[styles.expandedValue, { color: colors.textPrimary }]}>{formattedDate(lastReviewed)}</Text>
            </View>
            {dueAt && (
              <View style={styles.expandedRow}>
                <Text style={[styles.expandedLabel, { color: colors.textSecondary }]}>Next review</Text>
                <Text style={[styles.expandedValue, { color: colors.textPrimary }]}>{formattedDate(dueAt)}</Text>
              </View>
            )}
            {item.examples.length > 0 && (
              <View style={styles.examplesBlock}>
                <Text style={[styles.expandedLabel, { color: colors.textSecondary }]}>Examples</Text>
                {item.examples.map(example => (
                  <Text key={example} style={[styles.exampleLine, { color: colors.textPrimary }]}>
                    • {example}
                  </Text>
                ))}
              </View>
            )}
            <Pressable
              onPress={onOpenDetail}
              style={styles.detailLink}
              accessibilityRole="button"
            >
              <Text style={[styles.detailLinkLabel, { color: colors.accent }]}>Open full details</Text>
            </Pressable>
            <View style={styles.expandedActions}>
              <Pressable
                onPress={onEditFolders}
                style={[styles.actionButton, { borderColor: colors.border }]}
                accessibilityRole="button"
                accessibilityLabel={`Organise ${item.term}`}
              >
                <Text style={[styles.actionLabel, { color: colors.textSecondary }]}>Organise folders</Text>
              </Pressable>
            </View>
          </View>
        )}
      </Pressable>
    </SwipeableRow>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.surface,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.base * 1.5,
  },
  cardSelectMode: {
    paddingLeft: spacing.base * 6,
  },
  selectionBadge: {
    position: 'absolute',
    left: spacing.base,
    top: spacing.base * 1.5,
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectionBadgeText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.base * 0.5,
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.base * 0.5,
  },
  term: {
    fontFamily: fontFamilies.sans.medium,
    fontSize: typography.subhead.fontSize,
  },
  reading: {
    fontFamily: fontFamilies.sans.regular,
    fontSize: typography.caption.fontSize,
  },
  meaning: {
    fontFamily: fontFamilies.sans.regular,
    fontSize: typography.body.fontSize,
    marginBottom: spacing.base,
  },
  foldersRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.base * 0.5,
  },
  folderChip: {
    paddingHorizontal: spacing.base,
    paddingVertical: 2,
    borderRadius: radii.control,
  },
  folderChipLabel: {
    fontFamily: fontFamilies.sans.regular,
    fontSize: 12,
  },
  expandedSection: {
    marginTop: spacing.base * 1.5,
    paddingTop: spacing.base * 1.5,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: spacing.base,
  },
  expandedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  expandedLabel: {
    fontFamily: fontFamilies.sans.regular,
    fontSize: typography.caption.fontSize,
  },
  expandedValue: {
    fontFamily: fontFamilies.sans.medium,
    fontSize: typography.caption.fontSize,
  },
  examplesBlock: {
    marginTop: spacing.base * 0.5,
  },
  exampleLine: {
    fontFamily: fontFamilies.sans.regular,
    fontSize: typography.caption.fontSize,
    marginTop: 2,
  },
  detailLink: {
    marginTop: spacing.base,
  },
  detailLinkLabel: {
    fontFamily: fontFamilies.sans.medium,
    fontSize: typography.caption.fontSize,
  },
  expandedActions: {
    marginTop: spacing.base,
  },
  actionButton: {
    paddingVertical: spacing.base * 0.5,
    paddingHorizontal: spacing.base,
    borderRadius: radii.control,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
  },
  actionLabel: {
    fontFamily: fontFamilies.sans.regular,
    fontSize: typography.caption.fontSize,
  },
});

export default WordListItem;
