import { useState, useCallback, useMemo, useEffect } from 'react';
import { LayoutAnimation, Alert } from 'react-native';
import { useBankStore } from '@/state/bank.store';
import { useFolderStore, normaliseFolderName } from '@/state/folder.store';
import type { UndoState } from '../types';

export const useFolderManagement = (
  setUndoState: (undo: UndoState | null) => void,
  isFolderSelectMode: boolean,
  setIsFolderSelectMode: (isSelectMode: boolean) => void,
) => {
  const { items, updateFolders } = useBankStore(state => ({
    items: state.items,
    updateFolders: state.updateFolders,
  }));
  const { folders: folderOptions, addFolder, renameFolder, removeFolder } = useFolderStore();

  const [activeFolder, setActiveFolder] = useState<string | null>(null);
  const [selectedFolders, setSelectedFolders] = useState<string[]>([]);
  const [newFolderDraft, setNewFolderDraft] = useState('');
  const [renameDraft, setRenameDraft] = useState('');
  const [folderBeingRenamed, setFolderBeingRenamed] = useState<string | null>(null);
  const [folderError, setFolderError] = useState<string | null>(null);
  const [isAddingFolder, setIsAddingFolder] = useState(false);

  const toggleFolderSelection = useCallback((name: string) => {
    const normalised = normaliseFolderName(name);
    setSelectedFolders(prev =>
      prev.includes(normalised)
        ? prev.filter(entry => entry !== normalised)
        : [...prev, normalised],
    );
  }, []);

  const clearFolderSelection = useCallback(() => {
    setSelectedFolders([]);
    setIsFolderSelectMode(false);
  }, [setIsFolderSelectMode]);

  useEffect(() => {
    if (!isFolderSelectMode) {
      setSelectedFolders([]);
    }
  }, [isFolderSelectMode]);

  useEffect(() => {
    if (isFolderSelectMode) {
      setActiveFolder(null);
    }
  }, [isFolderSelectMode]);

  const folderSummaries = useMemo(() => {
    const totals = folderOptions.map(folder => {
      const normalized = folder.toLowerCase();
      const associated = items.filter(item =>
        item.folders.some(candidate => candidate.toLowerCase() === normalized),
      );
      return {
        name: folder,
        count: associated.length,
        sample: associated.slice(0, 3).map(item => item.term),
      };
    });

    return totals.sort((a, b) => a.name.localeCompare(b.name));
  }, [folderOptions, items]);

  useEffect(() => {
    if (
      activeFolder &&
      !folderSummaries.some(summary => normaliseFolderName(summary.name) === activeFolder)
    ) {
      setActiveFolder(null);
    }
  }, [activeFolder, folderSummaries]);

  const applyRemovalToWords = useCallback(
    async (target: string) => {
      const bankState = useBankStore.getState();
      const impacted = bankState.items.filter(item =>
        item.folders.some(folder => folder.toLowerCase() === target.toLowerCase()),
      );

      await Promise.all(
        impacted.map(item =>
          bankState.updateFolders(
            item.id,
            item.folders.filter(folder => folder.toLowerCase() !== target.toLowerCase()),
          ),
        ),
      );

      return impacted.map(item => ({
        id: item.id,
        folders: item.folders,
      }));
    },
    [],
  );

  const handleCreateFolder = useCallback(async () => {
    const trimmed = newFolderDraft.trim();
    if (!trimmed) {
      setFolderError('Enter a folder name.');
      return;
    }

    try {
      const created = await addFolder(trimmed);
      setNewFolderDraft('');
      setFolderError(null);
      setUndoState({
        message: `Created folder “${created}”`,
        actionLabel: 'Undo',
        onUndo: () => removeFolder(created),
      });
    } catch (error) {
      setFolderError(error instanceof Error ? error.message : 'Unable to create folder.');
    }
  }, [addFolder, newFolderDraft, removeFolder, setUndoState]);

  const handleRenameFolder = useCallback(
    async (_currentName: string) => {
      if (!folderBeingRenamed) {
        return;
      }

      const trimmed = renameDraft.trim();
      if (!trimmed) {
        setFolderError('Folder name cannot be empty.');
        return;
      }

      const normalisedCurrent = normaliseFolderName(folderBeingRenamed);
      const normalisedNext = normaliseFolderName(trimmed);
      if (normalisedCurrent.toLowerCase() === normalisedNext.toLowerCase()) {
        setFolderBeingRenamed(null);
        setRenameDraft('');
        setFolderError(null);
        return;
      }

      try {
        const bankState = useBankStore.getState();
        const impacted = bankState.items
          .filter(item =>
            item.folders.some(
              folder => folder.toLowerCase() === normalisedCurrent.toLowerCase(),
            ),
          )
          .map(item => ({
            id: item.id,
            previous: item.folders,
            next: item.folders.map(folder =>
              folder.toLowerCase() === normalisedCurrent.toLowerCase()
                ? normalisedNext
                : folder,
            ),
          }));

        await renameFolder(normalisedCurrent, normalisedNext);
        await Promise.all(
          impacted.map(entry =>
            useBankStore.getState().updateFolders(entry.id, entry.next),
          ),
        );
        setUndoState({
          message: `Renamed folder to “${normalisedNext}”`,
          actionLabel: 'Undo',
          onUndo: async () => {
            await renameFolder(normalisedNext, normalisedCurrent);
            await Promise.all(
              impacted.map(entry =>
                useBankStore.getState().updateFolders(entry.id, entry.previous),
              ),
            );
          },
        });
        setFolderBeingRenamed(null);
        setRenameDraft('');
        setFolderError(null);
      } catch (error) {
        setFolderError(
          error instanceof Error ? error.message : 'Unable to rename folder.',
        );
      }
    },
    [folderBeingRenamed, renameDraft, renameFolder, setUndoState],
  );

  const confirmDeleteFolder = useCallback(
    (folder: string) => {
      Alert.alert(
        'Delete folder',
        `Remove the “${folder}” folder? Words will remain in your bank.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              const normalised = normaliseFolderName(folder);
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              const previousAssignments = await applyRemovalToWords(normalised);
              await removeFolder(normalised);
              if (activeFolder === folder) {
                setActiveFolder(null);
              }
              setUndoState({
                message: `Deleted folder “${normalised}”`,
                actionLabel: 'Undo',
                onUndo: async () => {
                  await addFolder(normalised);
                  await Promise.all(
                    previousAssignments.map(entry =>
                      useBankStore.getState().updateFolders(entry.id, entry.folders),
                    ),
                  );
                },
              });
            },
          },
        ],
      );
    },
    [activeFolder, addFolder, applyRemovalToWords, removeFolder, setUndoState],
  );

  const handleDeleteSelectedFolders = useCallback(async () => {
    if (selectedFolders.length === 0) {
      return;
    }
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const payload = await Promise.all(
      selectedFolders.map(async folder => {
        const normalised = normaliseFolderName(folder);
        const assignments = await applyRemovalToWords(normalised);
        await removeFolder(normalised);
        return { name: normalised, assignments };
      }),
    );
    setSelectedFolders([]);
    setIsFolderSelectMode(false);
    if (payload.some(entry => entry.name === normaliseFolderName(activeFolder ?? ''))) {
      setActiveFolder(null);
    }
    if (payload.length === 0) {
      return;
    }
    setUndoState({
      message: `Deleted ${payload.length} folder${payload.length === 1 ? '' : 's'}`,
      actionLabel: 'Undo',
      onUndo: async () => {
        await Promise.all(
          payload.map(async entry => {
            try {
              await addFolder(entry.name);
            } catch {
              // ignore duplicate errors
            }
            await Promise.all(
              entry.assignments.map(item =>
                useBankStore.getState().updateFolders(item.id, item.folders),
              ),
            );
          }),
        );
      },
    });
  }, [
    activeFolder,
    addFolder,
    applyRemovalToWords,
    removeFolder,
    selectedFolders,
    setIsFolderSelectMode,
    setUndoState,
  ]);

  return {
    activeFolder,
    setActiveFolder,
    selectedFolders,
    toggleFolderSelection,
    clearFolderSelection,
    newFolderDraft,
    setNewFolderDraft,
    renameDraft,
    setRenameDraft,
    folderBeingRenamed,
    setFolderBeingRenamed,
    folderError,
    setFolderError,
    isAddingFolder,
    setIsAddingFolder,
    folderSummaries,
    handleCreateFolder,
    handleRenameFolder,
    confirmDeleteFolder,
    handleDeleteSelectedFolders,
  };
};
