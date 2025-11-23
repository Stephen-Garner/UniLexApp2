import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useOfflineStore } from '../../state/offline.store';
import { fontFamilies } from '../theme/tokens';

/** Displays a persistent banner when the application is offline. */
export const OfflineBanner: React.FC = () => {
  const isOffline = useOfflineStore(state => state.isOffline);

  if (!isOffline) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>You are currently offline.</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#b91c1c',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  label: {
    color: '#ffffff',
    fontFamily: fontFamilies.sans.semibold,
    textAlign: 'center',
  },
});

export default OfflineBanner;
