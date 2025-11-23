import React, { useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useThemeStyles } from '@/shared/theme/useThemeStyles';
import { spacing, radii, typography } from '@/shared/theme/tokens';

type SelectionBarProps = {
  count: number;
  noun: string;
  onCancel: () => void;
  onDelete: () => void;
};

export const SelectionBar: React.FC<SelectionBarProps> = ({
  count,
  noun,
  onCancel,
  onDelete,
}) => {
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

const createStyles = (colors) =>
  StyleSheet.create({
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
  });
