import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

export type ReviewSummaryView = {
  accuracy: number;
  avgTimeSeconds: number;
  strengths: Array<{ prompt: string; insight: string; score: number }>;
  focusAreas: Array<{ prompt: string; insight: string; score: number }>;
};

type ReviewCardProps = {
  summary: ReviewSummaryView;
  colors: {
    background: string;
    textSecondary: string;
    accent?: string;
  };
  styles: {
    reviewCard: object;
    reviewScroll: object;
    reviewScrollContent: object;
    analysisHeadline: object;
    reviewMetricsRow: object;
    reviewMetric: object;
    reviewMetricLabel: object;
    reviewMetricValue: object;
    reviewSection: object;
    reviewSectionTitle: object;
    reviewListItem: object;
    reviewListPrompt: object;
    reviewListInsight: object;
    reviewButtons: object;
    primaryButton: object;
    primaryButtonLabel: object;
    fullWidthButton: object;
    buttonTopMargin: object;
    secondaryButton: object;
    secondaryButtonLabel: object;
  };
  onNewSession: () => void;
  onExit: () => void;
  onSwitchActivity?: () => void;
};

const ReviewCard: React.FC<ReviewCardProps> = ({
  summary,
  colors,
  styles,
  onNewSession,
  onExit,
  onSwitchActivity,
}) => {
  const formatPercent = (value: number) => `${Math.round(value * 100)}%`;
  const formatTime = (seconds: number) => `${Math.round(seconds)}s avg`;

  return (
    <View style={[styles.reviewCard, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.reviewScroll}
        contentContainerStyle={styles.reviewScrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.analysisHeadline}>Session review</Text>
        <View style={styles.reviewMetricsRow}>
          <View style={styles.reviewMetric}>
            <Text style={styles.reviewMetricLabel}>Accuracy</Text>
            <Text style={styles.reviewMetricValue}>{formatPercent(summary.accuracy)}</Text>
          </View>
          <View style={styles.reviewMetric}>
            <Text style={styles.reviewMetricLabel}>Response time</Text>
            <Text style={styles.reviewMetricValue}>{formatTime(summary.avgTimeSeconds)}</Text>
          </View>
        </View>
        {summary.strengths.length > 0 ? (
          <View style={styles.reviewSection}>
            <Text style={styles.reviewSectionTitle}>Strengths</Text>
            {summary.strengths.map(item => (
              <View key={`${item.prompt}-strength`} style={styles.reviewListItem}>
                <Text style={styles.reviewListPrompt}>{item.prompt}</Text>
                <Text style={[styles.reviewListInsight, { color: colors.textSecondary }]}>{item.insight}</Text>
              </View>
            ))}
          </View>
        ) : null}
        {summary.focusAreas.length > 0 ? (
          <View style={styles.reviewSection}>
            <Text style={styles.reviewSectionTitle}>Focus next</Text>
            {summary.focusAreas.map(item => (
              <View key={`${item.prompt}-focus`} style={styles.reviewListItem}>
                <Text style={styles.reviewListPrompt}>{item.prompt}</Text>
                <Text style={[styles.reviewListInsight, { color: colors.textSecondary }]}>{item.insight}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>
      <View style={styles.reviewButtons}>
        <Pressable
          style={[
            styles.primaryButton,
            styles.fullWidthButton,
            styles.buttonTopMargin,
            colors.accent ? { backgroundColor: colors.accent } : null,
          ]}
          onPress={onNewSession}
        >
          <Text style={styles.primaryButtonLabel}>Start new session</Text>
        </Pressable>
        {onSwitchActivity ? (
          <Pressable style={[styles.secondaryButton, styles.fullWidthButton]} onPress={onSwitchActivity}>
            <Text style={styles.secondaryButtonLabel}>Switch activity</Text>
          </Pressable>
        ) : null}
        <Pressable style={[styles.secondaryButton, styles.fullWidthButton]} onPress={onExit}>
          <Text style={styles.secondaryButtonLabel}>Exit</Text>
        </Pressable>
      </View>
    </View>
  );
};

export default ReviewCard;
