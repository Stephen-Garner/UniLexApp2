import type {
  DrillSession,
  NativeNote,
  ProgressStats,
  SrsData,
  VocabItem,
  YouTubeVideo,
} from './models';

/** Contract describing access to the vocabulary bank data source. */
export interface BankRepository {
  /**
   * Retrieves a vocabulary item by its unique identifier.
   * @param id Unique identifier for the requested vocabulary item.
   */
  getVocabItemById(id: string): Promise<VocabItem | null>;

  /**
   * Returns all vocabulary items that include the provided tag.
   * @param tag The tag used to filter the vocabulary bank.
   */
  listVocabItemsByTag(tag: string): Promise<VocabItem[]>;

  /**
   * Retrieves every vocabulary item stored in the bank.
   */
  listAllVocabItems(): Promise<VocabItem[]>;

  /**
   * Persists the provided vocabulary item into the underlying store.
   * @param item Vocabulary item data to be created or updated.
   */
  saveVocabItem(item: VocabItem): Promise<void>;

  /**
   * Removes the vocabulary item associated with the provided identifier.
   * @param id Unique identifier of the item that should be removed.
   */
  deleteVocabItem(id: string): Promise<void>;

  /**
   * Updates the spaced repetition metadata for a vocabulary item.
   * @param itemId Identifier of the vocabulary item being updated.
   * @param data Latest spaced repetition metadata to apply.
   */
  updateSrsData(itemId: string, data: SrsData): Promise<void>;
}

/** Contract describing persistence for learner-authored notes. */
export interface NotesRepository {
  /**
   * Creates a new note in the persistence layer.
   * @param note Complete note payload to store.
   */
  createNote(note: NativeNote): Promise<void>;

  /**
   * Retrieves a note by its unique identifier.
   * @param noteId Identifier of the note that should be retrieved.
   */
  getNoteById(noteId: string): Promise<NativeNote | null>;

  /**
   * Retrieves all notes attached to a specific vocabulary item.
   * @param vocabItemId Identifier of the vocabulary item used to filter notes.
   */
  listNotesByVocabItem(vocabItemId: string): Promise<NativeNote[]>;

  /**
   * Retrieves every note stored in the persistence layer.
   */
  listAllNotes(): Promise<NativeNote[]>;

  /**
   * Finds notes that do not yet have an associated answer.
   */
  getUnansweredNotes(): Promise<NativeNote[]>;

  /**
   * Searches note content using the supplied query string.
   * @param query Text used to match note content.
   */
  searchNotes(query: string): Promise<NativeNote[]>;

  /**
   * Updates the content of an existing note.
   * @param noteId Identifier of the note that should be updated.
   * @param content Replacement note content supplied by the learner.
   */
  updateNoteContent(noteId: string, content: string): Promise<void>;

  /**
   * Removes a note from the persistence layer.
   * @param noteId Identifier of the note that should be deleted.
   */
  deleteNote(noteId: string): Promise<void>;
}

/** Contract describing stored YouTube video metadata interactions. */
export interface VideoRepository {
  /**
   * Finds a video record by its underlying YouTube identifier.
   * @param videoId Unique YouTube identifier associated with the video record.
   */
  getVideoById(videoId: string): Promise<YouTubeVideo | null>;

  /**
   * Lists video records filtered by their primary language code.
   * @param languageCode ISO code used to filter stored videos.
   */
  listVideosByLanguage(languageCode: string): Promise<YouTubeVideo[]>;

  /**
   * Retrieves all stored video records regardless of language.
   */
  listAllVideos(): Promise<YouTubeVideo[]>;

  /**
   * Saves a video record for later retrieval.
   * @param video Video metadata that should be persisted.
   */
  saveVideo(video: YouTubeVideo): Promise<void>;

  /**
   * Removes a video record from storage.
   * @param videoId Identifier of the video that should be removed.
   */
  deleteVideo(videoId: string): Promise<void>;
}

/** Contract describing access to learner progress and session history. */
export interface ProgressRepository {
  /**
   * Retrieves aggregate progress statistics for a learner.
   * @param userId Identifier of the learner whose progress is requested.
   */
  getProgressStats(userId: string): Promise<ProgressStats | null>;

  /**
   * Logs the outcome of a drill session for future analytics.
   * @param session Fully populated drill session record to store.
   */
  logSession(session: DrillSession): Promise<void>;

  /**
   * Persists spaced repetition metadata updates derived from reviews.
   * @param data Spaced repetition metadata that should be persisted.
   */
  saveSrsSnapshot(data: SrsData): Promise<void>;

  /**
   * Retrieves the most recent drill sessions up to the provided limit.
   * @param limit Maximum number of sessions to return.
   */
  listRecentSessions(limit: number): Promise<DrillSession[]>;

  /**
   * Retrieves every recorded drill session.
   */
  listAllSessions(): Promise<DrillSession[]>;
}
