export type RootStackParamList = {
  MainTabs: undefined;
  ProgressDashboard: undefined;
  WordDetail: { itemId: string };
  FolderDetail: { folderName: string };
  NoteDetail: { noteId: string };
  CreateNote: { vocabItemId?: string; seedContent?: string; source?: string };
  Settings: undefined;
  TranslationPractice: undefined;
  FlashcardTraining: undefined;
};

export type MainTabsParamList = {
  Home: undefined;
  Chat: undefined;
  WordBank: undefined;
  Activities: undefined;
  NativeNotes: undefined;
};
