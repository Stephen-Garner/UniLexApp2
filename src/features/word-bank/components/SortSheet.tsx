import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { useTheme } from '@/shared/theme/theme';
import { spacing, radii, typography, fontFamilies } from '@/shared/theme/tokens';
import { sortOptions, type SortMode } from '../types';

type Props = {
  visible: boolean;
  value: SortMode;
  onSelect: (mode: SortMode) => void;
  onClose: () => void;
};

const SortSheet: React.FC<Props> = ({ visible, value, onSelect, onClose }) => {
  const { colors } = useTheme();

  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { backgroundColor: colors.surface }]}
          onPress={event => event.stopPropagation()}
        >
          <Text style={[styles.title, { color: colors.textPrimary }]}>Sort by</Text>
          <ScrollView style={styles.list}>
            {sortOptions.map(option => {
              const active = option.id === value;
              return (
                <Pressable
                  key={option.id}
                  onPress={() => onSelect(option.id)}
                  style={[
                    styles.item,
                    active && { backgroundColor: colors.surfaceMuted },
                  ]}
                >
                  <Text style={[styles.itemLabel, { color: colors.textPrimary }]}>{option.label}</Text>
                  <Text style={[styles.itemState, { color: colors.textSecondary }]}>
                    {active ? 'Selected' : 'Tap to apply'}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
          <Pressable
            onPress={onClose}
            style={[styles.dismiss, { borderTopColor: colors.border }]}
          >
            <Text style={[styles.dismissLabel, { color: colors.accent }]}>Close</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: radii.surface,
    borderTopRightRadius: radii.surface,
    maxHeight: '60%',
  },
  title: {
    fontFamily: fontFamilies.sans.medium,
    fontSize: typography.subhead.fontSize,
    textAlign: 'center',
    paddingVertical: spacing.base * 1.5,
  },
  list: {
    paddingHorizontal: spacing.base * 1.5,
  },
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.base * 1.5,
    paddingHorizontal: spacing.base,
    borderRadius: radii.control,
    marginBottom: spacing.base * 0.5,
  },
  itemLabel: {
    fontFamily: fontFamilies.sans.regular,
    fontSize: typography.body.fontSize,
  },
  itemState: {
    fontFamily: fontFamilies.sans.regular,
    fontSize: typography.caption.fontSize,
  },
  dismiss: {
    padding: spacing.base * 1.5,
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  dismissLabel: {
    fontFamily: fontFamilies.sans.medium,
    fontSize: typography.body.fontSize,
  },
});

export default SortSheet;
