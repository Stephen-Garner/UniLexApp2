import { useState, useCallback } from 'react';
import { LayoutAnimation } from 'react-native';

export const useNoteSelection = (deleteNote: (noteId: string) => Promise<void>) => {
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const onToggleSelect = useCallback((id: string) => {
    setSelectedIds(prev =>
      prev.includes(id)
        ? prev.filter(noteId => noteId !== id)
        : [...prev, id],
    );
  }, []);

  const onLongPressNote = useCallback((id: string) => {
    if (!selectMode) {
      setSelectMode(true);
      setSelectedIds([id]);
    }
  }, [selectMode]);

  const onCancelSelection = useCallback(() => {
    setSelectedIds([]);
    setSelectMode(false);
  }, []);

  const onDeleteSelected = useCallback(async () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    try {
      await Promise.all(selectedIds.map(id => deleteNote(id)));
    } catch {
      // ignore individual failures; store exposes error state separately
    }
    setSelectedIds([]);
    setSelectMode(false);
  }, [deleteNote, selectedIds]);

  return {
    selectMode,
    setSelectMode,
    selectedIds,
    setSelectedIds,
    onToggleSelect,
    onLongPressNote,
    onCancelSelection,
    onDeleteSelected,
  };
};
