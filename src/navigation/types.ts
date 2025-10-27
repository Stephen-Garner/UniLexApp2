export type TranslatorStackParamList = {
  Translator: undefined;
  BankList: undefined;
  BankDetail: { itemId: string };
  NotesList: undefined;
  CreateNote: undefined;
  NoteDetail: { noteId: string };
};

export type DrillsStackParamList = {
  DrillModes: undefined;
  Recall: undefined;
  Recognition: undefined;
  Cloze: undefined;
  ListenType: undefined;
};

export type VideosStackParamList = {
  YouTubeSearch: undefined;
  SavedVideos: undefined;
  VideoDetail: { videoId: string };
  AddTimestamp: { videoId: string };
};

export type ProgressStackParamList = {
  ProgressDashboard: undefined;
};

export type SettingsStackParamList = {
  Settings: undefined;
};
