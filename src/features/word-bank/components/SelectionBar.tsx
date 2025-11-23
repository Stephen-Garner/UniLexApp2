import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/shared/theme/theme';
import { spacing, radii, typography, fontFamilies } from '@/shared/theme/tokens';

type Props = {
  count: number;
  noun: string;
  onCancel: () => void;
  onDelete: () => void;
};

const SelectionBar: React.FC<Props> = ({ count, noun, onCancel, onDelete }) => {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
      <Text style={[styles.label, { color: colors.textPrimary }]}>
        {count} {count === 1 ? noun : `${noun}s`} selected
      </Text>
      <View style={styles.actions}>
        <Pressable onPress={onCancel} style={styles.button}>
          <Text style={[styles.buttonLabel, { color: colors.textSecondary }]}>Cancel</Text>
        </Pressable>
        <Pressable onPress={onDelete} style={[styles.button, { backgroundColor: colors.error }]}>
          <Text style={[styles.deleteLabel, { color: colors.textOnAccent }]}>Delete</Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.screenHorizontal,
    paddingVertical: spacing.base * 1.5,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  label: {
    fontFamily: fontFamilies.sans.medium,
    fontSize: typography.body.fontSize,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.base,
  },
  button: {
    paddingHorizontal: spacing.base * 1.5,
    paddingVertical: spacing.base * 0.5,
    borderRadius: radii.control,
  },
  buttonLabel: {
    fontFamily: fontFamilies.sans.regular,
    fontSize: typography.caption.fontSize,
  },
  deleteLabel: {
    fontFamily: fontFamilies.sans.medium,
    fontSize: typography.caption.fontSize,
  },
});

export default SelectionBar;
