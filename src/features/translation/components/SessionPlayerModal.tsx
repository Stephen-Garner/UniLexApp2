import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useTheme, type ThemeMode } from '@/shared/theme/theme';
import { spacing } from '@/shared/theme/tokens';
import { evaluateTranslationAnswer } from '@/domain/translation/evaluator';
import ReviewCard from '@/features/translation/components/ReviewCard';
import PromptCard from '@/features/translation/components/PromptCard';
import AnalysisCard from '@/features/translation/components/AnalysisCard';
import useMiniChat from '@/features/translation/hooks/useMiniChat';
import type { AnalysisState, ReviewSummary } from '@/features/translation/types';
import { useTranslationSessionStore, type TranslationSessionState } from '@/state/translation-session.store';
import type { CreateNoteInput } from '@/state/notes.store';
import type { NativeNote, VocabItem } from '@/contracts/models';
import type { ActivityOutcome } from '@/domain/srs/unified-srs-service';
import type { TtxSession } from '@/contracts/models';
import { useBankStore } from '@/state/bank.store';

type Props = {
  visible: boolean;
  sessionId: string | null;
  contentWidth: number;
  onClose: () => void;
  appendHistory: TranslationSessionState['appendHistory'];
  setRecap: TranslationSessionState['setRecap'];
  setProgress: TranslationSessionState['setProgress'];
  toggleFlagged: TranslationSessionState['toggleFlagged'];
  createNote: (input: CreateNoteInput) => Promise<NativeNote>;
  bankItems: VocabItem[];
  recordActivityOutcome: (itemId: string, outcome: ActivityOutcome) => Promise<void>;
  styles: any;
  mode: ThemeMode;
  onRequestNewSession: () => void;
  onSwitchActivity: () => void;
};

const SessionPlayerModal: React.FC<Props> = ({
  visible,
  sessionId,
  contentWidth,
  onClose,
  appendHistory,
  setRecap,
  setProgress,
  toggleFlagged,
  createNote,
  bankItems,
  recordActivityOutcome,
  styles,
  mode,
  onRequestNewSession,
}) => {
  const session = useTranslationSessionStore(state =>
    sessionId ? state.sessions[sessionId] : undefined,
  );
  const { colors } = useTheme();
  const [answer, setAnswer] = useState('');
  const [analysis, setAnalysis] = useState<AnalysisState | null>(null);
  const [reviewSummary, setReviewSummary] = useState<ReviewSummary | null>(null);
  const miniChat = useMiniChat();
  const [isGrading, setIsGrading] = useState(false);
  const [isMiniChatExpanded, setIsMiniChatExpanded] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const chatOverlayAnim = useRef(new Animated.Value(0)).current;
  const durationsRef = useRef<number[]>([]);
  const scoresRef = useRef<number[]>([]);
  const attemptTimerRef = useRef<number>(Date.now());

  useEffect(() => {
    if (visible && session) {
      const startIndex = session.progress?.currentIndex ?? 0;
      setCurrentIndex(startIndex);
      durationsRef.current = [];
      scoresRef.current = [];
      attemptTimerRef.current = Date.now();
      setAnswer('');
      setAnalysis(null);
      setReviewSummary(null);
      miniChat.reset();
      setIsMiniChatExpanded(false);
      chatOverlayAnim.setValue(0);
      slideAnim.setValue(0);
    }
  }, [visible, session, slideAnim, chatOverlayAnim, miniChat]);

  if (!session) {
    return null;
  }

  const item = session.items[currentIndex];
  const totalQuestions = session.items.length;
  const remaining = Math.max(totalQuestions - currentIndex, 0);
  const isFinalQuestion = currentIndex === session.items.length - 1;

  const handleSubmit = async () => {
    if (!item || answer.trim().length === 0) {
      return;
    }
    setIsGrading(true);
    const evaluation = evaluateTranslationAnswer(item, answer);
    const attempt = {
      attemptId: `${item.itemId}-attempt-${Date.now()}`,
      answer: answer.trim(),
      score: evaluation.score,
      feedback: evaluation.feedback,
      errorTags: evaluation.errorTags,
      gradedAt: new Date().toISOString(),
    };
    await appendHistory({
      sessionId: session.sessionId,
      itemId: item.itemId,
      entry: attempt,
    });

    const attemptDate = new Date();
    for (const vocabId of item.focusVocabIds) {
      const vocab = bankItems.find(v => v.id === vocabId);
      if (vocab) {
        const activityOutcome: ActivityOutcome = {
          activityType: 'production',
          wasCorrect: evaluation.score >= 0.5,
          score: evaluation.score,
          attemptedAt: attemptDate,
        };
        recordActivityOutcome(vocabId, activityOutcome).catch(() => undefined);
      }
    }

    durationsRef.current[currentIndex] = (Date.now() - attemptTimerRef.current) / 1000;
    scoresRef.current[currentIndex] = evaluation.score;
    setAnalysis({
      evaluation,
      learnerAnswer: answer.trim(),
      item,
      attempt,
    });
    miniChat.appendAssistantMessage(evaluation.feedback);
    setAnswer('');
    setIsGrading(false);

    if (isFinalQuestion) {
      const summary = await finalizeRecap(session, scoresRef.current, durationsRef.current, setRecap);
      await setProgress(session.sessionId, {
        currentIndex,
        isComplete: true,
        lastOpenedAt: new Date().toISOString(),
      }).catch(() => undefined);
      setReviewSummary(summary);
      setAnalysis(null);
      return;
    }

    Animated.timing(slideAnim, {
      toValue: -contentWidth,
      duration: 260,
      useNativeDriver: true,
    }).start();
  };

  const handleNextQuestion = () => {
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 240,
      useNativeDriver: true,
    }).start();
    setAnalysis(null);
    miniChat.reset();
    const nextIndex = Math.min(currentIndex + 1, session.items.length - 1);
    setCurrentIndex(nextIndex);
    const nextOpenedAt = new Date().toISOString();
    const nextProgress = {
      ...(session.progress ?? { currentIndex: 0, isComplete: false, lastOpenedAt: nextOpenedAt }),
      currentIndex: nextIndex,
      lastOpenedAt: nextOpenedAt,
    };
    setProgress(session.sessionId, nextProgress).catch(() => undefined);
    attemptTimerRef.current = Date.now();
  };

  const handleFlagToggle = async () => {
    if (!analysis) {
      return;
    }
    const nextFlag = !analysis.item.isFlagged;
    await toggleFlagged(session.sessionId, analysis.item.itemId, nextFlag);
    updatePrioritySrs(bankItems, analysis.item.focusVocabIds, nextFlag);
    setAnalysis({
      ...analysis,
      item: {
        ...analysis.item,
        isFlagged: nextFlag,
      },
    });
  };

  const handleAddNote = async () => {
    if (!analysis) {
      return;
    }
    const title = `Translation · ${analysis.item.nativeText.slice(0, 32)}`;
    const content = [
      `Prompt: ${analysis.item.nativeText}`,
      `Context: ${analysis.item.context ?? 'General'}`,
      `My answer: ${analysis.learnerAnswer}`,
      `Feedback: ${analysis.evaluation.feedback}`,
    ].join('\n\n');
    await createNote({
      title,
      content,
      sourceLanguage: session.nativeLanguage,
    });
    Alert.alert('Saved', 'Added to your native notes.');
  };

  const handleMiniChatSend = () => {
    if (!analysis || miniChat.input.trim().length === 0) {
      return;
    }
    miniChat.appendUserMessage(miniChat.input);
    miniChat.setInput('');
    miniChat.appendAssistantMessage(
      `Tutor insight: ${analysis.item.insightHook}\n\n${analysis.evaluation.feedback}`,
    );
    openMiniChatOverlay();
  };

  const openMiniChatOverlay = () => {
    setIsMiniChatExpanded(true);
    Animated.timing(chatOverlayAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  const closeMiniChatOverlay = () => {
    Animated.timing(chatOverlayAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        setIsMiniChatExpanded(false);
      }
    });
  };

  const dismiss = () => {
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={dismiss}>
      <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
        <View style={styles.modalHeader}>
          <Pressable onPress={dismiss} style={styles.closeButton}>
            <Text style={styles.closeButtonLabel}>×</Text>
          </Pressable>
          <Text style={styles.modalTitle}>Session in progress</Text>
          <View style={styles.modalHeaderSpacer} />
        </View>
        <View style={styles.modalContent}>
          {reviewSummary ? (
            <View style={styles.reviewWrapper}>
              <ReviewCard
                summary={reviewSummary}
                colors={colors}
                styles={styles}
                onNewSession={onRequestNewSession}
                onExit={dismiss}
              />
            </View>
          ) : !item ? (
            <View style={[styles.centerContent, { padding: spacing.block }]}>
              <ActivityIndicator color={colors.accent} />
            </View>
          ) : (
            <>
              <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>
                {totalQuestions > 0 ? totalQuestions - remaining + 1 : 0}/{totalQuestions}
              </Text>
              <View style={styles.promptCarousel}>
                <Animated.View
                  style={[
                    styles.promptRow,
                    {
                      width: contentWidth * 2,
                      transform: [{ translateX: slideAnim }],
                    },
                  ]}
                >
                  <View style={{ width: contentWidth }}>
                    <PromptCard
                      item={item}
                      colors={colors}
                      mode={mode}
                      answer={answer}
                      highlightTerm={null}
                      onChangeAnswer={setAnswer}
                      disabled={isGrading}
                      onSubmit={handleSubmit}
                      styles={styles}
                    />
                  </View>
                  <View style={{ width: contentWidth }}>
                    <AnalysisCard
                      analysis={analysis}
                      onNext={handleNextQuestion}
                      onAddNote={handleAddNote}
                      onFlag={handleFlagToggle}
                      miniChat={miniChat}
                      onMiniChatSend={handleMiniChatSend}
                      onMiniChatExpand={openMiniChatOverlay}
                      colors={colors}
                      styles={styles}
                    />
                  </View>
                </Animated.View>
              </View>
            </>
          )}
        </View>
        {isMiniChatExpanded ? (
          <Animated.View
            style={[
              styles.chatOverlay,
              {
                backgroundColor: colors.background,
                opacity: chatOverlayAnim,
                transform: [
                  {
                    translateY: chatOverlayAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [40, 0],
                    }),
                  },
                ],
              },
            ]}
            pointerEvents="auto"
          >
            <View style={styles.chatOverlayInner}>
              <View style={styles.chatOverlayTopRow}>
                <Text style={styles.miniChatTitle}>Ask the tutor</Text>
                <Pressable onPress={closeMiniChatOverlay} style={styles.chatOverlayClose}>
                  <Text style={styles.chatOverlayCloseLabel}>Close</Text>
                </Pressable>
              </View>
              <ScrollView style={styles.chatOverlayMessages}>
                {miniChat.messages.map(message => (
                  <View
                    key={`overlay-${message.id}`}
                    style={[
                      styles.miniChatBubble,
                      message.role === 'user'
                        ? styles.miniChatBubbleUser
                        : styles.miniChatBubbleAssistant,
                    ]}
                  >
                    <Text style={styles.miniChatText}>{message.text}</Text>
                  </View>
                ))}
              </ScrollView>
              <View style={styles.chatOverlayInputRow}>
                <TextInput
                  multiline
                  value={miniChat.input}
                  onChangeText={miniChat.setInput}
                  placeholder="Ask why, request clarifications…"
                  placeholderTextColor={colors.textSecondary}
                  style={[styles.chatOverlayInput, { borderColor: colors.border, color: colors.textPrimary }]}
                />
                <Pressable
                  style={[styles.primaryButton, styles.chatOverlaySend, { backgroundColor: colors.accent }]}
                  onPress={handleMiniChatSend}
                >
                  <Text style={styles.primaryButtonLabel}>Send</Text>
                </Pressable>
              </View>
            </View>
          </Animated.View>
        ) : null}
      </SafeAreaView>
    </Modal>
  );
};

const finalizeRecap = async (
  session: TtxSession,
  scores: number[],
  durations: number[],
  setRecap: TranslationSessionState['setRecap'],
): Promise<ReviewSummary> => {
  const normalizedScores = session.items.map((_, idx) => {
    const value = scores[idx];
    if (typeof value === 'number' && Number.isFinite(value)) {
      return Math.min(1, Math.max(0, value));
    }
    return 0;
  });

  const normalizedDurations = session.items.map((_, idx) => {
    const value = durations[idx];
    if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
      return value;
    }
    return 0;
  });

  const answered = normalizedScores.filter(score => Number.isFinite(score));
  const accuracy = answered.reduce((sum, value) => sum + value, 0) / (answered.length || 1);
  const recommendedActions =
    accuracy >= 0.85
      ? ['Switch to comprehension or increase difficulty.']
      : ['Repeat this set to reinforce tricky items.'];
  await setRecap(session.sessionId, {
    accuracy,
    durationsSeconds: normalizedDurations,
    recommendedActions,
    srsQueue: [],
  });

  return buildReviewSummary(session, normalizedScores, normalizedDurations, accuracy);
};

const buildReviewSummary = (
  session: TtxSession,
  scores: number[],
  durations: number[],
  accuracy: number,
): ReviewSummary => {
  const enriched = session.items.map((item, idx) => ({
    prompt: item.nativeText,
    insight: item.insightHook,
    score: scores[idx] ?? 0,
  }));

  const strengths = enriched
    .filter(entry => entry.score >= 0.75)
    .sort((a, b) => b.score - a.score)
    .slice(0, 2);

  const focusAreas = enriched
    .filter(entry => entry.score < 0.7)
    .sort((a, b) => a.score - b.score)
    .slice(0, 2);

  const avgTimeSeconds = durations.reduce((sum, value) => sum + value, 0) / (durations.length || 1);

  return {
    accuracy,
    avgTimeSeconds,
    strengths: strengths.length > 0 ? strengths : enriched.slice(0, 1),
    focusAreas: focusAreas.length > 0 ? focusAreas : enriched.slice(-1),
  };
};

const updatePrioritySrs = (bankItems: VocabItem[], vocabIds: string[], flagged: boolean) => {
  if (!flagged) {
    return;
  }
  const targetItems = bankItems.filter(item => vocabIds.includes(item.id));
  targetItems.forEach(item => {
    const dueAt = new Date(Date.now() + 2 * 3600 * 1000).toISOString();
    const srsData = {
      id: item.srsData?.id ?? `srs-${item.id}`,
      algorithm: 'priority',
      streak: item.srsData?.streak ?? 0,
      intervalHours: 2,
      easeFactor: 2.3,
      dueAt,
      lastReviewedAt: new Date().toISOString(),
    };
    useBankStore
      .getState()
      .updateSrsData(item.id, srsData)
      .catch(() => undefined);
  });
};

export default SessionPlayerModal;
