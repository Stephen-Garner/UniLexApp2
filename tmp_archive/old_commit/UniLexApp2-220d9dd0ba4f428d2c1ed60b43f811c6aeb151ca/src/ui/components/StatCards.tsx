import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { fontFamilies } from '../theme/tokens';

interface StatCardsProps {
  streakDays: number;
  dueCount: number;
  weeklyMinutes: number;
}

const StatCards: React.FC<StatCardsProps> = ({ streakDays, dueCount, weeklyMinutes }) => {
  const stats = [
    { label: 'Streak', value: `${streakDays} day${streakDays === 1 ? '' : 's'}` },
    { label: 'Reviews Due', value: String(dueCount) },
    { label: 'Minutes This Week', value: Math.round(weeklyMinutes).toString() },
  ];

  return (
    <View style={styles.row}>
      {stats.map(stat => (
        <View key={stat.label} style={styles.card}>
          <Text style={styles.label}>{stat.label}</Text>
          <Text style={styles.value}>{stat.value}</Text>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  card: {
    flex: 1,
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 12,
    gap: 8,
  },
  label: {
    color: '#bfdbfe',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontFamily: fontFamilies.sans.semibold,
  },
  value: {
    color: '#ffffff',
    fontSize: 20,
    lineHeight: 26,
    fontFamily: fontFamilies.serif.semibold,
  },
});

export default StatCards;
