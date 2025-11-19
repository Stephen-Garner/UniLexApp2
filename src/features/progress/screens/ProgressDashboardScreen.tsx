import React, { useEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useProgressDashboardStore } from '@/state/progress.store';
import { colors, spacing, radii, typography, shadows } from '@/shared/theme/tokens';
import ScreenContainer from '@/shared/components/ScreenContainer';

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
      <ScreenContainer style={styles.safeArea}>
        <View style={styles.centered}>
          <ActivityIndicator />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer style={styles.safeArea}>
      <ScrollView
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.title}>Progress dashboard</Text>
      {stats ? (
        <View style={styles.metricsRow}>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{stats.streakDays}</Text>
            <Text style={styles.metricLabel}>Day streak</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{stats.reviewDueCount}</Text>
            <Text style={styles.metricLabel}>Reviews due</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{weeklyMinutes}</Text>
            <Text style={styles.metricLabel}>Minutes this week</Text>
          </View>
        </View>
      ) : (
        <View style={styles.blankCard}>
          <Text style={styles.blankText}>
            Complete your first session to unlock insights.
          </Text>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Accuracy trend</Text>
        <Text style={styles.sectionSubtitle}>7 / 30 / 90 day glance</Text>
        <View style={styles.chartCard}>
          <View style={styles.lineChart}>
            {weeklyActivity.map(point => (
              <View key={point.label} style={styles.lineRow}>
                <Text style={styles.lineLabel}>{point.label}</Text>
                <View style={styles.lineTrack}>
                  <View
                    style={[
                      styles.lineValue,
                      { width: `${Math.min(point.minutes * 10, 100)}%` },
                    ]}
                  />
                </View>
                <Text style={styles.lineMinutes}>{point.minutes}m</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>New vs. reviewed words</Text>
        <View style={styles.chartCard}>
          <View style={styles.barChart}>
            {recentSessions.slice(0, 5).map(session => {
              const total = session.correctCount + session.incorrectCount;
              const correctRatio = total === 0 ? 0 : (session.correctCount / total) * 100;
              return (
                <View key={session.id} style={styles.barRow}>
                  <Text style={styles.barLabel}>
                    {new Date(session.endedAt).toLocaleDateString()}
                  </Text>
                  <View style={styles.barTrack}>
                    <View style={[styles.barSegmentPositive, { width: `${correctRatio}%` }]} />
                    <View
                      style={[
                        styles.barSegmentNegative,
                        { width: `${100 - correctRatio}%` },
                      ]}
                    />
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Daily activity heatmap</Text>
        <View style={styles.chartCard}>
          <View style={styles.heatmap}>
            {Array.from({ length: 4 }).map((_, rowIndex) => (
              <View key={rowIndex} style={styles.heatmapRow}>
                {Array.from({ length: 7 }).map((__, columnIndex) => {
                  const intensity = (rowIndex * 7 + columnIndex) % 5;
                  return (
                    <View
                      key={`${rowIndex}-${columnIndex}`}
                      style={[
                        styles.heatmapCell,
                        { opacity: 0.25 + intensity * 0.15 },
                      ]}
                    />
                  );
                })}
              </View>
            ))}
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Skill distribution</Text>
        <View style={styles.chartCard}>
          <View style={styles.pieLegend}>
            {['Listening', 'Speaking', 'Writing', 'Reading'].map((skill, index) => (
              <View key={skill} style={styles.pieLegendRow}>
                <View
                  style={[
                    styles.pieSwatch,
                    { opacity: 0.4 + index * 0.15 },
                  ]}
                />
                <Text style={styles.pieLabel}>{skill}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Weak words</Text>
        <View style={styles.chartCard}>
          {weakWords.length === 0 ? (
            <Text style={styles.blankText}>All words stable right now.</Text>
          ) : (
            weakWords.map(item => (
              <View key={item.id} style={styles.wordRow}>
                <Text style={styles.wordTerm}>{item.term}</Text>
                <Text style={styles.wordMeta}>
                  Streak {item.srsData?.streak ?? 0} · Due{' '}
                  {item.srsData
                    ? new Date(item.srsData.dueAt).toLocaleDateString()
                    : 'soon'}
                </Text>
              </View>
            ))
          )}
        </View>
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </ScrollView>
  </ScreenContainer>
  );
};

export default ProgressDashboardScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    paddingHorizontal: spacing.screenHorizontal,
    paddingBottom: spacing.block * 2,
    gap: 20,
    backgroundColor: colors.backgroundLight,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.backgroundLight,
  },
  title: {
    ...typography.subhead,
    color: colors.textPrimaryLight,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  metricCard: {
    flex: 1,
    borderRadius: radii.surface,
    backgroundColor: colors.surface,
    padding: 16,
    gap: 6,
    ...shadows.card,
  },
  metricValue: {
    ...typography.headline,
    color: colors.textPrimaryLight,
  },
  metricLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  blankCard: {
    borderRadius: radii.surface,
    backgroundColor: colors.surface,
    padding: 24,
    alignItems: 'center',
    ...shadows.card,
  },
  blankText: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  section: {
    gap: 8,
  },
  sectionTitle: {
    ...typography.subhead,
    color: colors.textPrimaryLight,
  },
  sectionSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  chartCard: {
    borderRadius: radii.surface,
    backgroundColor: colors.surface,
    padding: 20,
    gap: 16,
    ...shadows.card,
  },
  lineChart: {
    gap: 8,
  },
  lineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  lineLabel: {
    width: 32,
    ...typography.caption,
    color: colors.textSecondary,
  },
  lineTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.border,
  },
  lineValue: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.accent,
  },
  lineMinutes: {
    width: 40,
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'right',
  },
  barChart: {
    gap: 12,
  },
  barRow: {
    gap: 6,
  },
  barLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  barTrack: {
    flexDirection: 'row',
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: colors.border,
  },
  barSegmentPositive: {
    backgroundColor: colors.success,
  },
  barSegmentNegative: {
    backgroundColor: colors.error,
  },
  heatmap: {
    gap: 6,
  },
  heatmapRow: {
    flexDirection: 'row',
    gap: 6,
  },
  heatmapCell: {
    width: 20,
    height: 20,
    borderRadius: 4,
    backgroundColor: colors.accent,
  },
  pieLegend: {
    gap: 12,
  },
  pieLegendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  pieSwatch: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.accent,
  },
  pieLabel: {
    ...typography.body,
    color: colors.textPrimaryLight,
  },
  wordRow: {
    borderRadius: radii.control,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    gap: 4,
    backgroundColor: colors.backgroundLight,
  },
  wordTerm: {
    ...typography.bodyStrong,
    color: colors.textPrimaryLight,
  },
  wordMeta: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  errorText: {
    ...typography.caption,
    color: colors.error,
    textAlign: 'center',
  },
});
