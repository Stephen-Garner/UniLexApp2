export type WordBankPane = 'words' | 'folders';

export type SortMode =
  | 'newest'
  | 'oldest'
  | 'alphabetical'
  | 'reverseAlphabetical'
  | 'dueSoon'
  | 'difficultyHigh'
  | 'difficultyLow';

export const sortOptions: Array<{ id: SortMode; label: string }> = [
  { id: 'newest', label: 'Newest' },
  { id: 'oldest', label: 'Oldest' },
  { id: 'alphabetical', label: 'A–Z' },
  { id: 'reverseAlphabetical', label: 'Z–A' },
  { id: 'dueSoon', label: 'Due Soon' },
  { id: 'difficultyHigh', label: 'Hardest' },
  { id: 'difficultyLow', label: 'Easiest' },
];

export type UndoState = {
  message: string;
  actionLabel?: string;
  onUndo: () => Promise<void> | void;
};

export type FolderSummary = {
  name: string;
  count: number;
  sample: string[];
};

export const difficultyScore = (level: string): number => {
  const trimmed = level.trim().toLowerCase();
  const numeric = trimmed.match(/\d+/);
  if (numeric) {
    return Number(numeric[0]);
  }
  switch (trimmed) {
    case 'beginner':
    case 'a1':
      return 1;
    case 'elementary':
    case 'a2':
      return 2;
    case 'intermediate':
    case 'b1':
      return 3;
    case 'upper-intermediate':
    case 'b2':
      return 4;
    case 'advanced':
    case 'c1':
      return 5;
    case 'master':
    case 'c2':
      return 6;
    default:
      return 0;
  }
};
