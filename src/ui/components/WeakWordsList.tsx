import React from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import type { VocabItem } from '../../contracts/models';
import { fontFamilies } from '../theme/tokens';

interface WeakWordsListProps {
  items: VocabItem[];
}

const WeakWordsList: React.FC<WeakWordsListProps> = ({ items }) => {
  if (items.length === 0) {
    return <Text style={styles.placeholder}>No weak vocabulary identified yet.</Text>;
  }

  return (
    <FlatList
      data={items}
      keyExtractor={item => item.id}
      scrollEnabled={false}
      renderItem={({ item, index }) => (
        <View style={styles.row}>
          <Text style={styles.rank}>{index + 1}</Text>
          <View style={styles.content}>
            <Text style={styles.term}>{item.term}</Text>
            <Text style={styles.meta}>{item.meaning}</Text>
            <Text style={styles.meta}>
              Streak {item.srsData?.streak ?? 0} · Due{' '}
              {item.srsData?.dueAt
                ? new Date(item.srsData.dueAt).toLocaleDateString()
                : 'soon'}
            </Text>
          </View>
        </View>
      )}
    />
  );
};

const styles = StyleSheet.create({
  placeholder: {
    color: '#6b7280',
    fontFamily: fontFamilies.sans.regular,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
  },
  rank: {
    width: 24,
    textAlign: 'center',
    color: '#1f2937',
    fontFamily: fontFamilies.sans.semibold,
  },
  content: {
    flex: 1,
    gap: 4,
  },
  term: {
    color: '#111827',
    fontFamily: fontFamilies.serif.semibold,
  },
  meta: {
    color: '#6b7280',
    fontFamily: fontFamilies.sans.regular,
  },
});

export default WeakWordsList;
