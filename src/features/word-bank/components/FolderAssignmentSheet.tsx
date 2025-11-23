import React, { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTheme } from '@/shared/theme/theme';
import { spacing, radii, typography, fontFamilies } from '@/shared/theme/tokens';
import type { VocabItem } from '@/contracts/models';

type Props = {
  item: VocabItem | null;
  folders: string[];
  onClose: () => void;
  onSubmit: (item: VocabItem, nextFolders: string[]) => Promise<void>;
  onCreateFolder: (name: string) => Promise<string>;
};

const FolderAssignmentSheet: React.FC<Props> = ({
  item,
  folders,
  onClose,
  onSubmit,
  onCreateFolder,
}) => {
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
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { backgroundColor: colors.surface }]}
          onPress={event => event.stopPropagation()}
        >
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            Organise "{item.term}"
          </Text>
          <ScrollView style={styles.list}>
            {folders.length === 0 ? (
              <Text style={[styles.empty, { color: colors.textSecondary }]}>
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
                      styles.item,
                      active && { backgroundColor: colors.surfaceMuted },
                    ]}
                  >
                    <Text style={[styles.itemLabel, { color: colors.textPrimary }]}>{folder}</Text>
                    <Text style={[styles.itemState, { color: colors.textSecondary }]}>
                      {active ? 'Added' : 'Tap to add'}
                    </Text>
                  </Pressable>
                );
              })
            )}
          </ScrollView>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <Text style={[styles.subtitle, { color: colors.textPrimary }]}>Create new folder</Text>
          <View style={styles.createRow}>
            <TextInput
              value={newFolder}
              onChangeText={text => {
                setNewFolder(text);
                setError(null);
              }}
              placeholder="Folder name"
              placeholderTextColor={colors.textSecondary}
              style={[styles.createInput, { color: colors.textPrimary, borderColor: colors.border }]}
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
              style={[styles.createButton, { backgroundColor: colors.accent }]}
            >
              <Text style={[styles.createButtonLabel, { color: colors.textOnAccent }]}>Add</Text>
            </Pressable>
          </View>
          {error && <Text style={[styles.error, { color: colors.error }]}>{error}</Text>}
          <View style={[styles.actions, { borderTopColor: colors.border }]}>
            <Pressable onPress={onClose} style={styles.actionButton}>
              <Text style={[styles.actionLabel, { color: colors.textSecondary }]}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={() => onSubmit(item, draft)}
              style={[styles.actionButton, { backgroundColor: colors.accent }]}
            >
              <Text style={[styles.actionPrimaryLabel, { color: colors.textOnAccent }]}>Save</Text>
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
    maxHeight: '70%',
  },
  title: {
    fontFamily: fontFamilies.sans.medium,
    fontSize: typography.subhead.fontSize,
    textAlign: 'center',
    paddingVertical: spacing.base * 1.5,
  },
  list: {
    paddingHorizontal: spacing.base * 1.5,
    maxHeight: 200,
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
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: spacing.base,
  },
  subtitle: {
    fontFamily: fontFamilies.sans.medium,
    fontSize: typography.body.fontSize,
    paddingHorizontal: spacing.base * 1.5,
    marginBottom: spacing.base,
  },
  createRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.base * 1.5,
    gap: spacing.base,
  },
  createInput: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.control,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.base * 0.5,
    fontFamily: fontFamilies.sans.regular,
    fontSize: typography.body.fontSize,
  },
  createButton: {
    paddingHorizontal: spacing.base * 1.5,
    paddingVertical: spacing.base * 0.5,
    borderRadius: radii.control,
    justifyContent: 'center',
  },
  createButtonLabel: {
    fontFamily: fontFamilies.sans.medium,
    fontSize: typography.caption.fontSize,
  },
  error: {
    fontFamily: fontFamilies.sans.regular,
    fontSize: typography.caption.fontSize,
    paddingHorizontal: spacing.base * 1.5,
    marginTop: spacing.base * 0.5,
  },
  actions: {
    flexDirection: 'row',
    padding: spacing.base * 1.5,
    gap: spacing.base,
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: spacing.base,
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

export default FolderAssignmentSheet;
