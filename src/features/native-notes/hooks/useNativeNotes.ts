import { useState, useMemo, useCallback, useEffect } from 'react';
import { useNotesStore } from '@/state/notes.store';
import { useBankStore } from '@/state/bank.store';
import type { NativeNote } from '@/contracts/models';

export type NoteStatus = 'unanswered' | 'answered';
export type SortMode = 'newest' | 'oldest' | 'titleAsc' | 'titleDesc';

export const useNativeNotes = () => {
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortMode>('newest');
  const [statusFilters, setStatusFilters] = useState<NoteStatus[]>([]);
  const [sortSheetVisible, setSortSheetVisible] = useState(false);

  const {
    notes,
    loadNotes,
    isLoading,
    deleteNote,
  } = useNotesStore();
  const { items: bankItems, loadBank } = useBankStore();

  useEffect(() => {
    loadNotes().catch(() => undefined);
    loadBank().catch(() => undefined);
  }, [loadNotes, loadBank]);

  const vocabMap = useMemo(() => {
    return bankItems.reduce<Record<string, string>>((acc, item) => {
      acc[item.id] = item.term;
      return acc;
    }, {});
  }, [bankItems]);

  const sortLabel = useMemo(() => {
    switch (sort) {
      case 'oldest':
        return 'Oldest';
      case 'titleAsc':
        return 'Title A–Z';
      case 'titleDesc':
        return 'Title Z–A';
      case 'newest':
      default:
        return 'Newest';
    }
  }, [sort]);

  const filterSummary = useMemo(() => {
    if (statusFilters.length === 0 || statusFilters.length === 2) {
      return 'All notes';
    }
    return statusFilters.map(status => status === 'answered' ? 'Answered' : 'Unanswered').join(', ');
  }, [statusFilters]);

  const sortSummary = useMemo(
    () => `${sortLabel} · ${filterSummary}`,
    [sortLabel, filterSummary],
  );

  const toggleStatusFilter = useCallback((filter: NoteStatus) => {
    setStatusFilters(prev =>
      prev.includes(filter)
        ? prev.filter(item => item !== filter)
        : [...prev, filter],
    );
  }, []);

  const hasActiveFilters = statusFilters.length > 0 && statusFilters.length < 2;
  const isCustomSort = sort !== 'newest';
  const sortButtonActive = isCustomSort || hasActiveFilters;

  const filteredNotes = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    const hasStatusFilter = statusFilters.length > 0 && statusFilters.length < 2;
    const filtered = notes.filter(note => {
      const derivedStatus: NoteStatus = note.answeredAt ? 'answered' : 'unanswered';
      if (hasStatusFilter && !statusFilters.includes(derivedStatus)) {
        return false;
      }
      if (!normalized) {
        return true;
      }
      const linkedTerm = note.vocabItemId ? vocabMap[note.vocabItemId] ?? '' : '';
      return [note.title, note.content, note.answer ?? '', linkedTerm]
        .join(' ')
        .toLowerCase()
        .includes(normalized);
    });

    const sorted = filtered.slice().sort((a, b) => {
      switch (sort) {
        case 'oldest':
          return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
        case 'titleAsc':
          return a.title.localeCompare(b.title);
        case 'titleDesc':
          return b.title.localeCompare(a.title);
        case 'newest':
        default:
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      }
    });

    return sorted;
  }, [notes, statusFilters, search, vocabMap, sort]);

  return {
    search,
    setSearch,
    sort,
    setSort,
    statusFilters,
    setStatusFilters,
    sortSheetVisible,
    setSortSheetVisible,
    notes,
    isLoading,
    deleteNote,
    vocabMap,
    sortLabel,
    filterSummary,
    sortSummary,
    toggleStatusFilter,
    hasActiveFilters,
    isCustomSort,
    sortButtonActive,
    filteredNotes,
  };
};
