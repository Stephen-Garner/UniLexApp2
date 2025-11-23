import { useState, useEffect, useCallback } from 'react';
import type { WordBankPane } from '../types';

export const usePaneManagement = (
  initialPane: WordBankPane = 'words',
  onPaneChange?: (pane: WordBankPane) => void,
) => {
  const [pane, setPane] = useState<WordBankPane>(initialPane);

  const handleSetPane = useCallback(
    (newPane: WordBankPane) => {
      if (pane !== newPane) {
        setPane(newPane);
        onPaneChange?.(newPane);
      }
    },
    [pane, onPaneChange],
  );

  return {
    pane,
    setPane: handleSetPane,
  };
};
