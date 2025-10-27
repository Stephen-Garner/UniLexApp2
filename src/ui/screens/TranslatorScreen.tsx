import React, { useState } from 'react';
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  ToastAndroid,
  TouchableOpacity,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { aiTutorService, ttsService } from '../../services/container';
import { useOfflineStore } from '../../state/offline.store';
import { useBankStore } from '../../state/bank.store';
import type { TranslatorStackParamList } from '../../App';

type Props = NativeStackScreenProps<TranslatorStackParamList, 'Translator'>;

const showToast = (message: string) => {
  if (Platform.OS === 'android') {
    ToastAndroid.show(message, ToastAndroid.SHORT);
    return;
  }

  Alert.alert('Notice', message);
};

const TranslatorScreen: React.FC<Props> = ({ navigation }) => {
  const [sourceLanguage, setSourceLanguage] = useState('en');
  const [targetLanguage, setTargetLanguage] = useState('ja');
  const [inputText, setInputText] = useState('');
  const [translation, setTranslation] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const addBankItem = useBankStore(state => state.addBankItem);
  const isOffline = useOfflineStore(state => state.isOffline);

  const handleTranslate = async () => {
    if (!inputText.trim()) {
      setError('Enter text to translate.');
      return;
    }

    if (isOffline) {
      setError('Translation unavailable while offline.');
      return;
    }

    setIsTranslating(true);
    setError(undefined);

    try {
      const translated = await aiTutorService.translate({
        text: inputText,
        sourceLanguage,
        targetLanguage,
      });
      setTranslation(translated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to translate text.');
    } finally {
      setIsTranslating(false);
    }
  };

  const handleSave = async () => {
    if (!translation.trim()) {
      setError('Translate text before saving to the bank.');
      return;
    }

    try {
      await addBankItem({
        term: inputText.trim(),
        meaning: translation.trim(),
        level: targetLanguage.toUpperCase(),
      });
      showToast('Saved to bank.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save translation.');
    }
  };

  const handleSpeakTranslation = async () => {
    if (!translation.trim()) {
      return;
    }

    try {
      await ttsService.speak({
        text: translation,
        languageCode: targetLanguage,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to play translation.');
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.section}>
        <Text style={styles.label}>Source language</Text>
        <TextInput
          value={sourceLanguage}
          onChangeText={setSourceLanguage}
          style={styles.input}
          autoCapitalize="none"
        />
      </View>
      <View style={styles.section}>
        <Text style={styles.label}>Target language</Text>
        <TextInput
          value={targetLanguage}
          onChangeText={setTargetLanguage}
          style={styles.input}
          autoCapitalize="none"
        />
      </View>
      <View style={styles.section}>
        <Text style={styles.label}>Text</Text>
        <TextInput
          value={inputText}
          onChangeText={setInputText}
          style={[styles.input, styles.multiline]}
          multiline
          placeholder="Enter text to translate"
        />
      </View>
      <TouchableOpacity
        style={[styles.button, isTranslating && styles.buttonDisabled]}
        onPress={handleTranslate}
        disabled={isTranslating || isOffline}
      >
        <Text style={styles.buttonLabel}>
          {isTranslating ? 'Translating…' : 'Translate'}
        </Text>
      </TouchableOpacity>
      <View style={styles.section}>
        <Text style={styles.label}>Translation</Text>
        <View style={styles.translationBox}>
          <Text style={styles.translationText}>
            {translation || 'Translation appears here.'}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.smallButton, !translation.trim() && styles.buttonDisabled]}
          onPress={handleSpeakTranslation}
          disabled={!translation.trim()}
        >
          <Text style={styles.buttonLabel}>Speak</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity style={styles.secondaryButton} onPress={handleSave}>
        <Text style={styles.buttonLabel}>Save to bank</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.linkButton}
        onPress={() => navigation.navigate('BankList')}
      >
        <Text style={styles.linkText}>View saved vocabulary</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.linkButton}
        onPress={() => navigation.navigate('NotesList')}
      >
        <Text style={styles.linkText}>Manage notes</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.linkButton}
        onPress={() => navigation.getParent()?.navigate('Videos' as never)}
      >
        <Text style={styles.linkText}>Explore study videos</Text>
      </TouchableOpacity>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      {isOffline ? (
        <Text style={styles.offlineText}>
          Offline mode: translation requires an internet connection.
        </Text>
      ) : null}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 16,
  },
  section: {
    gap: 8,
  },
  label: {
    fontWeight: '600',
    color: '#1f2937',
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#ffffff',
  },
  multiline: {
    minHeight: 96,
    textAlignVertical: 'top',
  },
  translationBox: {
    borderWidth: 1,
    borderRadius: 8,
    borderColor: '#d1d5db',
    backgroundColor: '#f9fafb',
    padding: 12,
    minHeight: 96,
    justifyContent: 'center',
  },
  translationText: {
    color: '#111827',
  },
  smallButton: {
    marginTop: 8,
    alignSelf: 'flex-start',
    backgroundColor: '#2563eb',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  button: {
    backgroundColor: '#2563eb',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  secondaryButton: {
    backgroundColor: '#059669',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonLabel: {
    color: '#ffffff',
    fontWeight: '600',
  },
  linkButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  linkText: {
    color: '#1d4ed8',
    fontWeight: '500',
  },
  errorText: {
    color: '#b91c1c',
    textAlign: 'center',
  },
  offlineText: {
    color: '#6b7280',
    textAlign: 'center',
  },
});

export default TranslatorScreen;
