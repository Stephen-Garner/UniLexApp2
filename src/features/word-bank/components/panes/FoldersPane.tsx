import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useTheme, type ThemeColors } from '@/shared/theme/theme';
import { useThemeStyles } from '@/shared/theme/useThemeStyles';
import { spacing, radii, typography, shadows, fontFamilies } from '@/shared/theme/tokens';
import { SwipeableRow, SelectionBar } from '..';
import { normaliseFolderName } from '@/state/folder.store';

type FolderSummary = {
    name: string;
    count: number;
    sample: string[];
};

type FoldersPaneProps = {
    isAddingFolder: boolean;
    setIsAddingFolder: (isAdding: boolean) => void;
    newFolderDraft: string;
    setNewFolderDraft: (draft: string) => void;
    setFolderError: (error: string | null) => void;
    handleCreateFolder: () => void;
    folderError: string | null;
    isFolderSelectMode: boolean;
    setIsFolderSelectMode: (isSelectMode: boolean) => void;
    clearFolderSelection: () => void;
    folderSummaries: FolderSummary[];
    folderBeingRenamed: string | null;
    selectedFolders: string[];
    activeFolder: string | null;
    confirmDeleteFolder: (folder: string) => void;
    toggleFolderSelection: (folder: string) => void;
    handleOpenFolder: (folderName: string) => void;
    renameDraft: string;
    setRenameDraft: (draft: string) => void;
    handleRenameFolder: (name: string) => void;
    setFolderBeingRenamed: (name: string | null) => void;
    handleDeleteSelectedFolders: () => void;
};

export const FoldersPane: React.FC<FoldersPaneProps> = ({
  isAddingFolder,
  setIsAddingFolder,
  newFolderDraft,
  setNewFolderDraft,
  setFolderError,
  handleCreateFolder,
  folderError,
  isFolderSelectMode,
  setIsFolderSelectMode,
  clearFolderSelection,
  folderSummaries,
  folderBeingRenamed,
  selectedFolders,
  activeFolder,
  confirmDeleteFolder,
  toggleFolderSelection,
  handleOpenFolder,
  renameDraft,
  setRenameDraft,
  handleRenameFolder,
  setFolderBeingRenamed,
  handleDeleteSelectedFolders,
}) => {
  const styles = useThemeStyles(createStyles);
  const { colors } = useTheme();

  return (
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

      {isFolderSelectMode && selectedFolders.length > 0 ? (
        <SelectionBar
          count={selectedFolders.length}
          noun="folder"
          onCancel={clearFolderSelection}
          onDelete={handleDeleteSelectedFolders}
        />
      ) : null}
    </ScrollView>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
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
  });
