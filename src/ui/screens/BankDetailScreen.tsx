import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useBankStore } from '../../state/bank.store';
import type { TranslatorStackParamList } from '../../navigation/types';
import WordCard from '../components/WordCard';

type Props = NativeStackScreenProps<TranslatorStackParamList, 'BankDetail'>;

const BankDetailScreen: React.FC<Props> = ({ route }) => {
  const { itemId } = route.params;

  const items = useBankStore(state => state.items);

  const item = useMemo(
    () => items.find(candidate => candidate.id === itemId) ?? null,
    [items, itemId],
  );

  if (!item) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyStateText}>Unable to locate that item.</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <WordCard item={item} />
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Tags</Text>
        <Text style={styles.sectionContent}>
          {item.tags.length > 0 ? item.tags.join(', ') : 'No tags'}
        </Text>
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Examples</Text>
        {item.examples.length > 0 ? (
          item.examples.map(example => (
            <Text key={example} style={styles.sectionContent}>
              • {example}
            </Text>
          ))
        ) : (
          <Text style={styles.sectionContent}>No examples added yet.</Text>
        )}
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Difficulty</Text>
        <Text style={styles.sectionContent}>{item.level}</Text>
      </View>
      {item.srsData ? (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Review schedule</Text>
          <Text style={styles.sectionContent}>
            Streak: {item.srsData.streak} | Interval: {item.srsData.intervalHours} hours
          </Text>
          <Text style={styles.sectionContent}>Due: {item.srsData.dueAt}</Text>
        </View>
      ) : null}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#ffffff',
    gap: 16,
  },
  section: {
    gap: 6,
  },
  sectionLabel: {
    fontWeight: '600',
    color: '#6b7280',
  },
  sectionContent: {
    color: '#111827',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  emptyStateText: {
    color: '#6b7280',
  },
});

export default BankDetailScreen;
