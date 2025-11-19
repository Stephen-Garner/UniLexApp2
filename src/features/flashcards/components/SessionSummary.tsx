import React from 'react';
import { Pressable, Text, View } from 'react-native';

type Props = {
  completedCorrect: number;
  completedIncorrect: number;
  summaryTotal: number;
  styles: {
    summaryTitle: object;
    summarySubtitle: object;
    summaryActions: object;
    primaryButton: object;
    fullWidthButton: object;
    primaryButtonLabel: object;
    secondaryButton: object;
    secondaryButtonLabel: object;
    cardSummary: object;
  };
  dynamicStyles: {
    primaryAccent: object;
    primaryDisabled: object;
    secondaryBorder: object;
    secondaryText: object;
  };
  colors: {
    surface: string;
  };
  onReviewMissed: () => void;
  onReviewAll: () => void;
  onExitActivity: () => void;
};

const SessionSummary: React.FC<Props> = ({
  completedCorrect,
  completedIncorrect,
  summaryTotal,
  styles,
  dynamicStyles,
  colors,
  onReviewMissed,
  onReviewAll,
  onExitActivity,
}) => (
  <View style={[styles.cardSummary, { backgroundColor: colors.surface }]}>
    <Text style={styles.summaryTitle}>Session complete</Text>
    <Text style={styles.summarySubtitle}>
      Score {completedCorrect}/{summaryTotal} · Missed {completedIncorrect}
    </Text>
    <View style={styles.summaryActions}>
      <Pressable
        style={[
          styles.primaryButton,
          styles.fullWidthButton,
          dynamicStyles.primaryAccent,
          completedIncorrect === 0 && dynamicStyles.primaryDisabled,
        ]}
        onPress={onReviewMissed}
        disabled={completedIncorrect === 0}
      >
        <Text style={styles.primaryButtonLabel}>Review missed</Text>
      </Pressable>
      <Pressable
        style={[styles.secondaryButton, styles.fullWidthButton, dynamicStyles.secondaryBorder]}
        onPress={onReviewAll}
      >
        <Text style={[styles.secondaryButtonLabel, dynamicStyles.secondaryText]}>Review all</Text>
      </Pressable>
      <Pressable style={[styles.secondaryButton, styles.fullWidthButton]} onPress={onExitActivity}>
        <Text style={styles.secondaryButtonLabel}>Exit activity</Text>
      </Pressable>
    </View>
  </View>
);

export default SessionSummary;
