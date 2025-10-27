import { create } from 'zustand';
import { format, startOfDay, subDays, isSameDay } from 'date-fns';
import type { DrillSession, ProgressStats, VocabItem } from '../contracts/models';
import { bankRepository, progressRepository } from '../services/container';

const DEFAULT_USER_ID = '00000000-0000-0000-0000-000000000000';

interface WeeklyActivityPoint {
  label: string;
  minutes: number;
}

interface ProgressDashboardState {
  stats: ProgressStats | null;
  weakWords: VocabItem[];
  weeklyActivity: WeeklyActivityPoint[];
  weeklyMinutes: number;
  recentSessions: DrillSession[];
  isLoading: boolean;
  error?: string;
  load: () => Promise<void>;
}

const calculateSessionMinutes = (session: DrillSession): number => {
  const start = new Date(session.startedAt).getTime();
  const end = new Date(session.endedAt).getTime();
  const diff = Math.max(end - start, 0);
  return diff / 60000;
};

const buildWeeklySeries = (sessions: DrillSession[]): {
  points: WeeklyActivityPoint[];
  totalMinutes: number;
} => {
  const today = startOfDay(new Date());
  const days = Array.from({ length: 7 }).map((_, index) =>
    subDays(today, 6 - index),
  );

  const points = days.map(day => {
    const minutes = sessions
      .filter(session => isSameDay(new Date(session.endedAt), day))
      .reduce((total, session) => total + calculateSessionMinutes(session), 0);

    return {
      label: format(day, 'EEE'),
      minutes: Math.round(minutes * 10) / 10,
    };
  });

  const totalMinutes = points.reduce((sum, point) => sum + point.minutes, 0);
  return { points, totalMinutes: Math.round(totalMinutes * 10) / 10 };
};

const determineWeakWords = (items: VocabItem[]): VocabItem[] => {
  if (items.length === 0) {
    return [];
  }

  return items
    .slice()
    .sort((a, b) => {
      const aStreak = a.srsData ? a.srsData.streak : -1;
      const bStreak = b.srsData ? b.srsData.streak : -1;

      if (aStreak !== bStreak) {
        return aStreak - bStreak;
      }

      const aDue = a.srsData ? new Date(a.srsData.dueAt).getTime() : 0;
      const bDue = b.srsData ? new Date(b.srsData.dueAt).getTime() : 0;
      return aDue - bDue;
    })
    .slice(0, 10);
};

export const useProgressDashboardStore = create<ProgressDashboardState>(
  (set) => ({
    stats: null,
    weakWords: [],
    weeklyActivity: [],
    weeklyMinutes: 0,
    recentSessions: [],
    isLoading: false,
    load: async () => {
      set({ isLoading: true, error: undefined });

      try {
        const [stats, vocabItems, allSessions] = await Promise.all([
          progressRepository.getProgressStats(DEFAULT_USER_ID),
          bankRepository.listAllVocabItems(),
          progressRepository.listAllSessions(),
        ]);

        const weakWords = determineWeakWords(vocabItems);
        const { points, totalMinutes } = buildWeeklySeries(allSessions);
        const recentSessions = allSessions.slice(0, 5);

        set({
          stats: stats ?? null,
          weakWords,
          weeklyActivity: points,
          weeklyMinutes: totalMinutes,
          recentSessions,
          isLoading: false,
        });
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : 'Unable to load progress data.',
          isLoading: false,
        });
      }
    },
  }),
);
