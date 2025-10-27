import type {
  DrillSession,
  ProgressStats,
  VocabItem,
  YouTubeVideo,
} from './models';

/** Contract defining AI-assisted tutoring features for vocabulary study. */
export interface AiTutorService {
  /**
   * Translates the provided text using the requested language pair.
   * @param params Arguments describing the translation inputs.
   */
  translate(params: TranslateTextParams): Promise<string>;

  /**
   * Generates a contextual hint to help the learner recall the target item.
   * @param params Data describing the current practice context.
   */
  generateHint(params: {
    /** Vocabulary item the learner is practicing. */
    item: VocabItem;
    /** Learner's most recent answer attempt for the vocabulary item. */
    learnerAnswer: string;
  }): Promise<string>;

  /**
   * Produces tailored feedback for a completed drill session.
   * @param session Completed drill session summary.
   */
  generateSessionFeedback(session: DrillSession): Promise<string>;

  /**
   * Drafts a personalized study plan based on current progress.
   * @param stats Aggregated learner progress metrics.
   */
  createStudyPlan(stats: ProgressStats): Promise<string>;
}

/** Parameters describing a translation request. */
export interface TranslateTextParams {
  /** Source language code using ISO 639 format. */
  sourceLanguage: string;
  /** Target language code using ISO 639 format. */
  targetLanguage: string;
  /** Text content that should be translated. */
  text: string;
  /** Optional contextual notes to improve translation quality. */
  context?: string;
}

/** Contract describing text-to-speech synthesis capabilities. */
export interface TtsService {
  /**
   * Converts the provided text into speech audio using a selected voice.
   * @param params Options describing the synthesis request.
   */
  synthesizeSpeech(params: {
    /** Text content that should be spoken aloud. */
    text: string;
    /** Identifier of the voice profile to use for synthesis. */
    voiceId: string;
    /** Optional speed multiplier applied during synthesis. */
    speakingRate?: number;
  }): Promise<ArrayBuffer>;

  /** Retrieves the available voice identifiers that can be synthesized. */
  listVoices(): Promise<string[]>;

  /**
   * Speaks the provided text aloud using the specified voice.
   * @param params Configuration for the speech playback request.
   */
  speak(params: {
    /** Text content that should be spoken aloud. */
    text: string;
    /** Optional voice identifier to use for playback. */
    voiceId?: string;
    /** Optional language code to apply before speaking. */
    languageCode?: string;
    /** Optional speech rate to use for playback. */
    rate?: number;
    /** Optional pitch value to use for playback. */
    pitch?: number;
  }): Promise<void>;

  /** Stops any active speech playback. */
  stop(): Promise<void>;

  /** Retrieves detailed voice metadata exposed by the TTS engine. */
  getVoices(): Promise<Array<{ id: string; name?: string }>>;
}

/** Contract defining controls for audio recording interactions. */
export interface AudioRecorderService {
  /**
   * Starts capturing audio input and returns a recording session identifier.
   */
  startRecording(): Promise<string>;

  /**
   * Stops the active recording session and returns the captured audio data.
   * @param sessionId Identifier of the recording session to stop.
   */
  stopRecording(sessionId: string): Promise<ArrayBuffer>;

  /**
   * Temporarily pauses the active recording session without discarding data.
   * @param sessionId Identifier of the recording session to pause.
   */
  pauseRecording(sessionId: string): Promise<void>;

  /**
   * Resumes a paused recording session so capture can continue.
   * @param sessionId Identifier of the recording session to resume.
   */
  resumeRecording(sessionId: string): Promise<void>;

  /**
   * Reports whether a recording session is currently active.
   * @param sessionId Identifier of the recording session to inspect.
   */
  isRecording(sessionId: string): Promise<boolean>;

  /**
   * Retrieves the local file URI for a completed recording session.
   * @param sessionId Identifier of the recording session to inspect.
   */
  getRecordingUri(sessionId: string): Promise<string | null>;

  /**
   * Removes any persisted files linked to the provided session identifier.
   * @param sessionId Identifier of the recording session whose files should be deleted.
   */
  cleanupRecording(sessionId: string): Promise<void>;
}

/** Contract describing interactions with YouTube video resources. */
export interface YouTubeService {
  /**
   * Locates YouTube videos relevant to provided query terms.
   * @param params Criteria used to perform the video search.
   */
  searchVideos(params: {
    /** Search keywords supplied by the learner. */
    query: string;
    /** Maximum number of results to return. */
    limit?: number;
    /** Language code used to filter search results. */
    languageCode?: string;
  }): Promise<YouTubeVideo[]>;

  /**
   * Fetches metadata for a single YouTube video by identifier.
   * @param videoId Unique YouTube identifier for the requested video.
   */
  getVideoInfo(videoId: string): Promise<YouTubeVideo | null>;

  /**
   * Fetches metadata for a single YouTube video by identifier.
   * @deprecated Use getVideoInfo instead.
   */
  fetchVideo(videoId: string): Promise<YouTubeVideo | null>;

  /**
   * Retrieves caption tracks in the requested language if available.
   * @param params Descriptor for the captions request.
   */
  fetchCaptions(params: {
    /** YouTube video identifier that owns the caption track. */
    videoId: string;
    /** Language code specifying the desired caption track. */
    languageCode: string;
  }): Promise<string | null>;
}

/** Contract defining persistent key-value storage interactions. */
export interface StorageService {
  /**
   * Persists a value under the provided storage key.
   * @param key Storage key that uniquely identifies the value.
   * @param value Serializable value to persist.
   */
  setItem<TValue>(key: string, value: TValue): Promise<void>;

  /**
   * Reads a previously stored value by its key.
   * @param key Storage key that identifies the desired value.
   */
  getItem<TValue>(key: string): Promise<TValue | null>;

  /**
   * Removes any stored value associated with the provided key.
   * @param key Storage key that should be cleared.
   */
  removeItem(key: string): Promise<void>;

  /** Lists the keys currently stored in the backing persistence layer. */
  listKeys(): Promise<string[]>;

  /** Clears all stored items from the persistence layer. */
  clear(): Promise<void>;
}

/** Contract coordinating offline operation and synchronization. */
export interface OfflineController {
  /** Signals that offline resources should be prefetched for resilience. */
  prepareResources(): Promise<void>;

  /** Initiates a synchronization cycle to upload offline progress. */
  syncPendingChanges(): Promise<void>;

  /**
   * Registers a callback that runs whenever connectivity status changes.
   * @param callback Function invoked with the offline state when connectivity changes.
   */
  onConnectivityChange(
    callback: (isOffline: boolean) => void,
  ): () => void;

  /** Reports whether the application is currently offline. */
  isOffline(): Promise<boolean>;
}
