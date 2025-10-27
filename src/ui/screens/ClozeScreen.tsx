import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

const ClozeScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>TODO: Implement cloze drill.</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  text: {
    color: '#6b7280',
  },
});

export default ClozeScreen;
