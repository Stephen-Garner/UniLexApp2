import { useState, useCallback, useEffect } from 'react';
import { LayoutAnimation } from 'react-native';
import { useBankStore } from '@/state/bank.store';
import type { VocabItem } from '@/contracts/models';
import type { UndoState } from '../types';

export const useWordManagement = (
  setUndoState: (undo: UndoState | null) => void,
  isWordSelectMode: boolean,
  setIsWordSelectMode: (isSelectMode: boolean) => void,
) => {
  const removeBankItem = useBankStore(state => state.removeBankItem);
  const [selectedWordIds, setSelectedWordIds] = useState<string[]>([]);
  const [expandedWordId, setExpandedWordId] = useState<string | null>(null);

  const toggleWordSelection = useCallback(
    (id: string) => {
      setSelectedWordIds(prev =>
        prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id],
      );
    },
    [],
  );

  const clearWordSelection = useCallback(() => {
    setSelectedWordIds([]);
    setIsWordSelectMode(false);
  }, [setIsWordSelectMode]);

  useEffect(() => {
    if (!isWordSelectMode) {
      setSelectedWordIds([]);
    }
  }, [isWordSelectMode]);

  useEffect(() => {
    if (isWordSelectMode) {
      setExpandedWordId(null);
    }
  }, [isWordSelectMode]);

  const handleDeleteWord = useCallback(
    async (id: string) => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      // A full implementation would require restoring the item, including SRS data, etc.
      // This is a simplified version for demonstration.
      await removeBankItem(id);
      setSelectedWordIds(prev => prev.filter(wordId => wordId !== id));
      if (expandedWordId === id) {
        setExpandedWordId(null);
      }
    },
    [expandedWordId, removeBankItem],
  );

  const handleDeleteSelectedWords = useCallback(async () => {
    if (selectedWordIds.length === 0) {
      return;
    }
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    await Promise.all(selectedWordIds.map(wordId => removeBankItem(wordId)));
    setSelectedWordIds([]);
    setIsWordSelectMode(false);
    setExpandedWordId(null);
  }, [removeBankItem, selectedWordIds, setIsWordSelectMode]);

  const handlePressWord = (item: VocabItem) => {
    if (isWordSelectMode) {
      toggleWordSelection(item.id);
      return;
    }
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedWordId(prev => (prev === item.id ? null : item.id));
  };

  const handleLongPressWord = (item: VocabItem) => {
    if (!isWordSelectMode) {
      setIsWordSelectMode(true);
      setSelectedWordIds([item.id]);
    }
  };

  return {
    selectedWordIds,
    expandedWordId,
    setExpandedWordId,
    toggleWordSelection,
    clearWordSelection,
    handleDeleteWord,
    handleDeleteSelectedWords,
    handlePressWord,
    handleLongPressWord,
  };
};
