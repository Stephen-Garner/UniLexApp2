import { createMMKV } from 'react-native-mmkv';
import type { MMKV } from 'react-native-mmkv';
import type {
  BankRepository,
  ProgressRepository,
} from '../../contracts/repositories';
import type { DrillSession, ProgressStats, SrsData } from '../../contracts/models';
import { calculateProgressStats } from '../../domain/selectors/progress-calculator';

const STORAGE_ID = 'progress_repository_v1';
const SESSIONS_KEY = 'sessions';
const MAX_SESSION_HISTORY = 200;

/** MMKV-backed progress repository that logs drill sessions locally. */
export class MmkvProgressRepository implements ProgressRepository {
  private readonly storage: MMKV;

  constructor(
    private readonly bankRepository: BankRepository,
    storage?: MMKV,
  ) {
    this.storage = storage ?? createMMKV({ id: STORAGE_ID });
  }

  async getProgressStats(userId: string): Promise<ProgressStats | null> {
    const [vocabItems, sessions] = await Promise.all([
      this.bankRepository.listAllVocabItems(),
      this.listAllSessions(),
    ]);

    if (vocabItems.length === 0 && sessions.length === 0) {
      return null;
    }

    return calculateProgressStats({
      userId,
      vocabItems,
      sessions,
      now: new Date(),
    });
  }

  async logSession(session: DrillSession): Promise<void> {
    const sessions = this.readSessions();
    sessions.push(session);
    const sorted = sessions.sort(
      (a, b) =>
        new Date(b.endedAt).getTime() - new Date(a.endedAt).getTime(),
    );
    const trimmed = sorted.slice(0, MAX_SESSION_HISTORY);
    this.writeSessions(trimmed);
  }

  async saveSrsSnapshot(_data: SrsData): Promise<void> {
    // SRS snapshots are persisted directly through the bank repository.
  }

  async listRecentSessions(limit: number): Promise<DrillSession[]> {
    const sessions = await this.listAllSessions();
    return sessions.slice(0, limit);
  }

  async listAllSessions(): Promise<DrillSession[]> {
    const sessions = this.readSessions();
    return sessions.sort(
      (a, b) =>
        new Date(b.endedAt).getTime() - new Date(a.endedAt).getTime(),
    );
  }

  private readSessions(): DrillSession[] {
    const raw = this.storage.getString(SESSIONS_KEY);
    if (!raw) {
      return [];
    }

    try {
      return JSON.parse(raw) as DrillSession[];
    } catch {
      return [];
    }
  }

  private writeSessions(sessions: DrillSession[]) {
    this.storage.set(SESSIONS_KEY, JSON.stringify(sessions));
  }
}
