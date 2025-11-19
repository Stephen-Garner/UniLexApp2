import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface WeeklyBarChartProps {
  data: Array<{ label: string; minutes: number }>;
}

const WeeklyBarChart: React.FC<WeeklyBarChartProps> = ({ data }) => {
  const maxMinutes = Math.max(...data.map(point => point.minutes), 1);

  return (
    <View style={styles.container}>
      {data.map(point => {
        const height = (point.minutes / maxMinutes) * 120;
        return (
          <View key={point.label} style={styles.barGroup}>
            <View style={[styles.bar, { height }]} />
            <Text style={styles.label}>{point.label}</Text>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 12,
  },
  barGroup: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    flex: 1,
  },
  bar: {
    width: '100%',
    maxWidth: 24,
    borderRadius: 8,
    backgroundColor: '#2563eb',
  },
  label: {
    marginTop: 8,
    fontSize: 12,
    color: '#6b7280',
  },
});

export default WeeklyBarChart;
