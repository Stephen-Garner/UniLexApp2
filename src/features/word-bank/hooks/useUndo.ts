import { useState, useEffect, useCallback } from 'react';
import type { UndoState } from '../types';

export const useUndo = () => {
  const [undoState, setUndoState] = useState<UndoState | null>(null);

  useEffect(() => {
    if (!undoState) {
      return;
    }
    const timer = setTimeout(() => setUndoState(null), 6000);
    return () => clearTimeout(timer);
  }, [undoState]);

  const handleUndo = useCallback(async () => {
    if (!undoState) {
      return;
    }
    await undoState.onUndo();
    setUndoState(null);
  }, [undoState]);

  const showUndo = useCallback((message: string, onUndo: () => Promise<void>) => {
    setUndoState({
      message,
      actionLabel: 'Undo',
      onUndo,
    });
  }, []);

  return {
    undoState,
    showUndo,
    handleUndo,
  };
};
