import { useState, useMemo } from 'react';
import { normaliseFolderName } from '@/state/folder.store';
import type { VocabItem } from '@/contracts/models';
import { type SortMode, sortOptions, difficultyScore } from '../types';

export const useWordAndFolderFilteringAndSorting = (items: VocabItem[]) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('newest');
  const [selectedFoldersFilter, setSelectedFoldersFilter] = useState<string[]>([]);
  const [folderFilterVisible, setFolderFilterVisible] = useState(false);
  const [sortSheetVisible, setSortSheetVisible] = useState(false);

  const filteredWords = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const folderSet = selectedFoldersFilter.map(folder =>
      normaliseFolderName(folder).toLowerCase(),
    );

    const base = items.filter(item => {
      if (folderSet.length > 0) {
        const itemFolders = item.folders.map(folder => folder.toLowerCase());
        const hasAllFolders = folderSet.every(folder => itemFolders.includes(folder));
        if (!hasAllFolders) {
          return false;
        }
      }

      if (!query) {
        return true;
      }

      const haystack = [item.term, item.meaning, item.reading, ...item.folders]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(query);
    });

    const sorter: Record<SortMode, (a: VocabItem, b: VocabItem) => number> = {
      newest: (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      oldest: (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      alphabetical: (a, b) => a.term.localeCompare(b.term),
      reverseAlphabetical: (a, b) => b.term.localeCompare(a.term),
      dueSoon: (a, b) => {
        const aDue = a.srsData
          ? new Date(a.srsData.dueAt).getTime()
          : Number.POSITIVE_INFINITY;
        const bDue = b.srsData
          ? new Date(b.srsData.dueAt).getTime()
          : Number.POSITIVE_INFINITY;
        return aDue - bDue;
      },
      difficultyHigh: (a, b) => difficultyScore(b.level) - difficultyScore(a.level),
      difficultyLow: (a, b) => difficultyScore(a.level) - difficultyScore(b.level),
    };

    const sorted = base.slice().sort(sorter[sortMode]);
    return sorted;
  }, [items, searchQuery, selectedFoldersFilter, sortMode]);

  const activeSortLabel = useMemo(() => {
    const option = sortOptions.find(candidate => candidate.id === sortMode);
    return option ? option.label : 'Newest';
  }, [sortMode]);

  return {
    searchQuery,
    setSearchQuery,
    sortMode,
    setSortMode,
    selectedFoldersFilter,
    setSelectedFoldersFilter,
    folderFilterVisible,
    setFolderFilterVisible,
    sortSheetVisible,
    setSortSheetVisible,
    filteredWords,
    activeSortLabel,
  };
};
