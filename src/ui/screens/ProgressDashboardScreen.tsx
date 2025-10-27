import React, { useEffect } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';
import { useProgressDashboardStore } from '../../state/progress.store';
import StatCards from '../components/StatCards';
import WeakWordsList from '../components/WeakWordsList';
import WeeklyBarChart from '../components/WeeklyBarChart';

const ProgressDashboardScreen: React.FC = () => {
  const {
    stats,
    weakWords,
    weeklyActivity,
    weeklyMinutes,
    recentSessions,
    isLoading,
    error,
    load,
  } = useProgressDashboardStore();

  useEffect(() => {
    load().catch(() => undefined);
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      load().catch(() => undefined);
      return () => undefined;
    }, [load]),
  );

  if (isLoading && !stats) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Your Progress</Text>
      {stats ? (
        <StatCards
          streakDays={stats.streakDays}
          dueCount={stats.reviewDueCount}
          weeklyMinutes={weeklyMinutes}
        />
      ) : (
        <View style={styles.placeholderCard}>
          <Text style={styles.placeholderText}>
            Complete your first drill session to see progress insights.
          </Text>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Weekly Activity</Text>
        {weeklyActivity.length > 0 ? (
          <WeeklyBarChart data={weeklyActivity} />
        ) : (
          <Text style={styles.placeholderText}>No activity recorded this week yet.</Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Sessions</Text>
        {recentSessions.length === 0 ? (
          <Text style={styles.placeholderText}>No sessions logged.</Text>
        ) : (
          recentSessions.map(session => {
            const durationMinutes = Math.max(
              1,
              Math.round(
                (new Date(session.endedAt).getTime() -
                  new Date(session.startedAt).getTime()) /
                  60000,
              ),
            );

            return (
              <View key={session.id} style={styles.sessionRow}>
                <Text style={styles.sessionTitle}>
                  {new Date(session.endedAt).toLocaleString()}
                </Text>
                <Text style={styles.sessionMeta}>
                  Score {(session.score * 100).toFixed(0)}% · Duration {durationMinutes} min
                </Text>
              </View>
            );
          })
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Weak Words</Text>
        <WeakWordsList items={weakWords} />
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 24,
    backgroundColor: '#ffffff',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  placeholderCard: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 16,
    backgroundColor: '#f9fafb',
  },
  placeholderText: {
    color: '#6b7280',
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  sessionRow: {
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
    gap: 4,
  },
  sessionTitle: {
    color: '#111827',
    fontWeight: '600',
  },
  sessionMeta: {
    color: '#6b7280',
  },
  errorText: {
    color: '#dc2626',
    textAlign: 'center',
  },
});

export default ProgressDashboardScreen;
