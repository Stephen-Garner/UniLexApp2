import React, { useEffect } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useBankStore } from '../../state/bank.store';
import type { TranslatorStackParamList } from '../../App';

type Props = NativeStackScreenProps<TranslatorStackParamList, 'BankList'>;

const BankListScreen: React.FC<Props> = ({ navigation }) => {
  const query = useBankStore(state => state.query);
  const setQuery = useBankStore(state => state.setQuery);
  const loadBank = useBankStore(state => state.loadBank);
  const isLoading = useBankStore(state => state.isLoading);
  const error = useBankStore(state => state.error);
  const getFilteredItems = useBankStore(state => state.getFilteredItems);
  const items = getFilteredItems();

  useEffect(() => {
    void loadBank();
  }, [loadBank]);

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.searchInput}
        placeholder="Search vocabulary…"
        value={query}
        onChangeText={setQuery}
      />
      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.centered}>
              <Text>No saved vocabulary yet.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.listItem}
              onPress={() => navigation.navigate('BankDetail', { itemId: item.id })}
            >
              <Text style={styles.term}>{item.term}</Text>
              <Text style={styles.meaning}>{item.meaning}</Text>
            </TouchableOpacity>
          )}
        />
      )}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#ffffff',
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  listContent: {
    gap: 12,
  },
  listItem: {
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    backgroundColor: '#f9fafb',
    gap: 4,
  },
  term: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  meaning: {
    color: '#4b5563',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    marginTop: 12,
    color: '#b91c1c',
    textAlign: 'center',
  },
});

export default BankListScreen;
