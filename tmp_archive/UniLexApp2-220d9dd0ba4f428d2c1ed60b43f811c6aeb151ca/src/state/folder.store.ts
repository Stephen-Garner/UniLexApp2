import { create } from 'zustand';
import { createMMKV } from 'react-native-mmkv';

const STORAGE_ID = 'folder_store_v1';
const FOLDERS_KEY = 'folders';
const DEFAULT_FOLDERS = ['Travel', 'Business', 'Culture', 'Grammar', 'Listening'];

const storage = createMMKV({ id: STORAGE_ID });

const normaliseName = (name: string) => name.trim().replace(/\s+/g, ' ');

const ensureUnique = (names: string[]): string[] => {
  const seen = new Set<string>();
  return names
    .map(name => normaliseName(name))
    .filter(name => name.length > 0)
    .filter(name => {
      const key = name.toLowerCase();
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
};

interface FolderState {
  folders: string[];
  isLoaded: boolean;
  loadFolders: () => Promise<void>;
  addFolder: (name: string) => Promise<string>;
  renameFolder: (currentName: string, nextName: string) => Promise<void>;
  removeFolder: (name: string) => Promise<void>;
}

const readFolders = (): string[] => {
  const raw = storage.getString(FOLDERS_KEY);
  if (!raw) {
    return ensureUnique(DEFAULT_FOLDERS).sort((a, b) => a.localeCompare(b));
  }

  try {
    const parsed = JSON.parse(raw) as string[];
    return ensureUnique(parsed.length > 0 ? parsed : DEFAULT_FOLDERS).sort((a, b) =>
      a.localeCompare(b),
    );
  } catch {
    return ensureUnique(DEFAULT_FOLDERS).sort((a, b) => a.localeCompare(b));
  }
};

const writeFolders = (folders: string[]) => {
  storage.set(FOLDERS_KEY, JSON.stringify(folders));
};

export const useFolderStore = create<FolderState>((set, get) => ({
  folders: [],
  isLoaded: false,
  loadFolders: async () => {
    if (get().isLoaded) {
      return;
    }
    const folders = readFolders();
    set({ folders, isLoaded: true });
  },
  addFolder: async name => {
    const normalised = normaliseName(name);
    if (!normalised) {
      throw new Error('Folder name cannot be empty.');
    }

    const { folders } = get();
    const exists = folders.some(folder => folder.toLowerCase() === normalised.toLowerCase());
    if (exists) {
      throw new Error('Folder already exists.');
    }

    const next = [...folders, normalised].sort((a, b) => a.localeCompare(b));
    set({ folders: next });
    writeFolders(next);
    return normalised;
  },
  renameFolder: async (currentName, nextName) => {
    const normalisedCurrent = normaliseName(currentName);
    const normalisedNext = normaliseName(nextName);
    if (!normalisedNext) {
      throw new Error('Folder name cannot be empty.');
    }

    const { folders } = get();
    if (!folders.some(folder => folder.toLowerCase() === normalisedCurrent.toLowerCase())) {
      throw new Error('Folder not found.');
    }

    const duplicate = folders.some(folder => folder.toLowerCase() === normalisedNext.toLowerCase());
    if (duplicate && normalisedCurrent.toLowerCase() !== normalisedNext.toLowerCase()) {
      throw new Error('Folder already exists.');
    }

    const nextFolders = folders
      .map(folder => (folder.toLowerCase() === normalisedCurrent.toLowerCase() ? normalisedNext : folder))
      .sort((a, b) => a.localeCompare(b));

    set({ folders: nextFolders });
    writeFolders(nextFolders);
  },
  removeFolder: async name => {
    const normalised = normaliseName(name);
    const nextFolders = get()
      .folders.filter(folder => folder.toLowerCase() !== normalised.toLowerCase())
      .sort((a, b) => a.localeCompare(b));
    set({ folders: nextFolders });
    writeFolders(nextFolders);
  },
}));

export const normaliseFolderName = normaliseName;
