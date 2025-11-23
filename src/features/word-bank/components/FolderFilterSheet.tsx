import React, { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/shared/theme/theme';
import { spacing, radii, typography, fontFamilies } from '@/shared/theme/tokens';

type Props = {
  visible: boolean;
  folders: string[];
  selected: string[];
  onApply: (next: string[]) => void;
  onClear: () => void;
  onClose: () => void;
};

const FolderFilterSheet: React.FC<Props> = ({
  visible,
  folders,
  selected,
  onApply,
  onClose,
  onClear,
}) => {
  const { colors } = useTheme();
  const [draft, setDraft] = useState<string[]>(selected);

  useEffect(() => {
    setDraft(selected);
  }, [selected, visible]);

  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { backgroundColor: colors.surface }]}
          onPress={event => event.stopPropagation()}
        >
          <Text style={[styles.title, { color: colors.textPrimary }]}>Filter by folders</Text>
          <ScrollView style={styles.list}>
            {folders.length === 0 ? (
              <Text style={[styles.empty, { color: colors.textSecondary }]}>
                No folders yet. Create one first.
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
                      styles.item,
                      active && { backgroundColor: colors.surfaceMuted },
                    ]}
                  >
                    <Text style={[styles.itemLabel, { color: colors.textPrimary }]}>{folder}</Text>
                    <Text style={[styles.itemState, { color: colors.textSecondary }]}>
                      {active ? 'Selected' : 'Tap to add'}
                    </Text>
                  </Pressable>
                );
              })
            )}
          </ScrollView>
          <View style={[styles.actions, { borderTopColor: colors.border }]}>
            <Pressable
              onPress={() => {
                onClear();
                onClose();
              }}
              style={styles.actionButton}
            >
              <Text style={[styles.actionLabel, { color: colors.textSecondary }]}>Clear</Text>
            </Pressable>
            <Pressable
              onPress={() => onApply(draft)}
              style={[styles.actionButton, { backgroundColor: colors.accent }]}
            >
              <Text style={[styles.actionPrimaryLabel, { color: colors.textOnAccent }]}>Apply</Text>
            </Pressable>
          </View>
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
  empty: {
    fontFamily: fontFamilies.sans.regular,
    fontSize: typography.caption.fontSize,
    textAlign: 'center',
    paddingVertical: spacing.base * 2,
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
  actions: {
    flexDirection: 'row',
    padding: spacing.base * 1.5,
    gap: spacing.base,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  actionButton: {
    flex: 1,
    paddingVertical: spacing.base,
    alignItems: 'center',
    borderRadius: radii.control,
  },
  actionLabel: {
    fontFamily: fontFamilies.sans.medium,
    fontSize: typography.body.fontSize,
  },
  actionPrimaryLabel: {
    fontFamily: fontFamilies.sans.medium,
    fontSize: typography.body.fontSize,
  },
});

export default FolderFilterSheet;
