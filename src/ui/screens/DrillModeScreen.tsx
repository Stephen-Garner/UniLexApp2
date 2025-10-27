import React from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { DrillsStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<DrillsStackParamList, 'DrillModes'>;

const DrillModeScreen: React.FC<Props> = ({ navigation }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Choose a drill mode</Text>
      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate('Recall')}
      >
        <Text style={styles.buttonLabel}>Recall</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate('Recognition')}
      >
        <Text style={styles.buttonLabel}>Recognition</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate('Cloze')}
      >
        <Text style={styles.buttonLabel}>Cloze</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate('ListenType')}
      >
        <Text style={styles.buttonLabel}>Listen &amp; Type</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    gap: 16,
    backgroundColor: '#ffffff',
  },
  heading: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 10,
    backgroundColor: '#2563eb',
  },
  buttonLabel: {
    color: '#ffffff',
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default DrillModeScreen;
