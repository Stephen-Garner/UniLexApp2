import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeNote } from '@/contracts/models';
import { useThemeStyles, type ThemeColors } from '@/shared/theme/useThemeStyles';
import { spacing, radii, typography, fontFamilies, shadows } from '@/shared/theme/tokens';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';
import { SwipeableRow } from './SwipeableRow';

type NoteListItemProps = {
  note: NativeNote;
  term?: string;
  statusBadge: React.ReactNode;
  selectMode: boolean;
  selected: boolean;
  onToggleSelect: (id: string) => void;
  onPress: (id: string) => void;
  onLongPress: (id: string) => void;
  onDelete: (id: string) => void;
};

const NoteListItem: React.FC<NoteListItemProps> = ({
  note,
  term,
  statusBadge,
  selectMode,
  selected,
  onToggleSelect,
  onPress,
  onLongPress,
  onDelete,
}) => {
  const styles = useThemeStyles(createStyles);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const lastUpdated = useMemo(
    () => new Date(note.updatedAt).toLocaleDateString(),
    [note.updatedAt],
  );

  return (
    <SwipeableRow onDelete={() => onDelete(note.id)}>
      <Pressable
        onPress={() => onPress(note.id)}
        onLongPress={() => onLongPress(note.id)}
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
        accessibilityRole="button"
        accessibilityLabel={`Open note ${note.title}`}
      >
        {selectMode && (
          <Pressable
            onPress={() => onToggleSelect(note.id)}
            style={[styles.selectionBadge, selected && styles.selectionBadgeSelected]}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: selected }}
            accessibilityLabel={`Select note ${note.title}`}
          >
            {selected ? <Text style={styles.selectionBadgeText}>✓</Text> : null}
          </Pressable>
        )}
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

export default NoteListItem;

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
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
  });
