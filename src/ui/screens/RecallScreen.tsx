import React, { useMemo, useState } from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  Keyboard,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useDrillSession } from '../../state/useDrillSession';
import type { DrillsStackParamList } from '../../App';

type Props = NativeStackScreenProps<DrillsStackParamList, 'Recall'>;

const RecallScreen: React.FC<Props> = () => {
  const session = useDrillSession({ mode: 'recall', limit: 10 });
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);

  const progressLabel = useMemo(() => {
    if (session.totalCount === 0) {
      return 'No items available for recall.';
    }

    const total = session.totalCount;
    const currentNumber = session.isComplete
      ? total
      : Math.min(session.answeredCount + 1, total);
    return `Card ${currentNumber} of ${total}`;
  }, [session.answeredCount, session.totalCount, session.isComplete]);

  const handleSubmit = async () => {
    const currentItem = session.currentItem;
    if (!currentItem || !answer.trim()) {
      return;
    }

    const expected = currentItem.meaning.trim().toLowerCase();
    const normalisedAnswer = answer.trim().toLowerCase();
    const wasCorrect = normalisedAnswer === expected;
    const quality = wasCorrect ? 4 : 2;

    await session.submitAnswer({
      answer,
      quality,
    });

    setFeedback(
      wasCorrect
        ? 'Correct! Great job.'
        : `Not quite. Expected meaning: ${currentItem.meaning}`,
    );
    setAnswer('');
    Keyboard.dismiss();
  };

  const handleReset = () => {
    session.resetSession();
    setAnswer('');
    setFeedback(null);
  };

  if (session.totalCount === 0) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyText}>
          Nothing is due right now. Add items to the bank or check back later.
        </Text>
      </View>
    );
  }

  if (session.isComplete) {
    return (
      <View style={styles.container}>
        <Text style={styles.heading}>Session complete</Text>
        <Text style={styles.summary}>
          Correct: {session.metrics.correct} · Incorrect: {session.metrics.incorrect}
        </Text>
        <TouchableOpacity style={styles.button} onPress={handleReset}>
          <Text style={styles.buttonLabel}>Start again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.heading}>{session.currentItem?.term}</Text>
      {session.currentItem?.reading ? (
        <Text style={styles.subheading}>{session.currentItem.reading}</Text>
      ) : null}
      <Text style={styles.progress}>{progressLabel}</Text>
      <View style={styles.promptBox}>
        <Text style={styles.promptLabel}>
          What is the meaning of this term?
        </Text>
      </View>
      <TextInput
        style={styles.input}
        placeholder="Type your answer"
        value={answer}
        onChangeText={setAnswer}
        autoCapitalize="none"
        autoCorrect={false}
      />
      <TouchableOpacity
        style={[styles.button, !answer.trim() && styles.buttonDisabled]}
        onPress={handleSubmit}
        disabled={!answer.trim()}
      >
        <Text style={styles.buttonLabel}>Submit</Text>
      </TouchableOpacity>
      {feedback ? <Text style={styles.feedback}>{feedback}</Text> : null}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 24,
    gap: 16,
    backgroundColor: '#ffffff',
  },
  heading: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  subheading: {
    fontSize: 18,
    color: '#4b5563',
  },
  progress: {
    fontSize: 14,
    color: '#6b7280',
  },
  promptBox: {
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#f3f4f6',
  },
  promptLabel: {
    color: '#111827',
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
  },
  button: {
    backgroundColor: '#2563eb',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonLabel: {
    color: '#ffffff',
    fontWeight: '600',
  },
  feedback: {
    color: '#0f172a',
    fontStyle: 'italic',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyText: {
    textAlign: 'center',
    color: '#6b7280',
  },
  summary: {
    fontSize: 16,
    color: '#1f2937',
  },
});

export default RecallScreen;
