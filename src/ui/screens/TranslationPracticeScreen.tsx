import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  SafeAreaView,
  useWindowDimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import ScreenContainer from '../components/ScreenContainer';
import { spacing, radii, typography, fontFamilies } from '../theme/tokens';
import { useTheme, type ThemeMode } from '../theme/theme';
import LanguageSwitcherModal from '../components/LanguageSwitcherModal';
import { useLanguageProfileStore } from '../../state/language-profile.store';
import {
  useTranslationSessionStore,
  type TranslationSessionState,
} from '../../state/translation-session.store';
import { useBankStore } from '../../state/bank.store';
import { useNotesStore, type CreateNoteInput } from '../../state/notes.store';
import { resolveFlagGlyph } from '../../data/language-library';
import { STYLE_PRESETS, type StylePresetKey } from '../../domain/translation/style-presets';
import { generateMockTranslationSession } from '../../domain/translation/mock-generator';
import { evaluateTranslationAnswer, type EvaluationResult } from '../../domain/translation/evaluator';
import type {
  ReviewMode,
  TtxItem,
  TtxSession,
  TtxItemHistory,
  VocabItem,
  NativeNote,
} from '../../contracts/models';
import type { RootStackParamList } from '../../navigation/types';
import { DEFAULT_USER_ID } from '../../domain/user/constants';
import type { ActivityOutcome } from '../../domain/srs/unified-srs-service';

const QUESTION_MIN = 5;
const QUESTION_MAX = 25;

const REVIEW_MODES: Array<{ label: string; value: ReviewMode; description: string }> = [
  { label: 'Review only', value: 'review_only', description: 'Only saved vocab' },
  { label: 'Mix it up', value: 'mixed', description: '50% review · 50% new' },
  { label: 'New only', value: 'new_only', description: 'All AI-generated' },
];

const FORMALITY_OPTIONS: Array<{ key: StylePresetKey; label: string }> = [
  { key: 'formal', label: 'Formal' },
  { key: 'balanced', label: 'Balanced' },
  { key: 'informal', label: 'Informal' },
];

type TranslationNavigation = NativeStackNavigationProp<RootStackParamList>;

type AnalysisState = {
  item: TtxItem;
  learnerAnswer: string;
  evaluation: EvaluationResult;
  attempt: TtxItemHistory;
};

type MiniChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
};

type ReviewSummary = {
  accuracy: number;
  avgTimeSeconds: number;
  strengths: Array<{ prompt: string; insight: string; score: number }>;
  focusAreas: Array<{ prompt: string; insight: string; score: number }>;
};

const TranslationPracticeScreen: React.FC = () => {
  const navigation = useNavigation<TranslationNavigation>();
  const { colors, mode } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { width } = useWindowDimensions();
  const modalContentWidth = width;

  const {
    profiles,
    activeProfileId,
    isLoaded: profilesLoaded,
    loadProfiles,
    ensureProfile,
    appendSavedSession,
  } = useLanguageProfileStore();
  const sessions = useTranslationSessionStore(state => state.sessions);
  const loadSessions = useTranslationSessionStore(state => state.loadSessions);
  const saveSession = useTranslationSessionStore(state => state.saveSession);
  const appendHistory = useTranslationSessionStore(state => state.appendHistory);
  const setRecap = useTranslationSessionStore(state => state.setRecap);
  const setProgress = useTranslationSessionStore(state => state.setProgress);
  const toggleFlagged = useTranslationSessionStore(state => state.toggleFlagged);
  const markSessionOpened = useTranslationSessionStore(state => state.markSessionOpened);
  const bankItems = useBankStore(state => state.items);
  const loadBank = useBankStore(state => state.loadBank);
  const bankLoading = useBankStore(state => state.isLoading);
  const recordActivityOutcome = useBankStore(state => state.recordActivityOutcome);
  const createNote = useNotesStore(state => state.createNote);

  const [stylePreset, setStylePreset] = useState<StylePresetKey>('balanced');
  const [reviewMode, setReviewMode] = useState<ReviewMode>('mixed');
  const [questionCount, setQuestionCount] = useState(10);
  const [topicInput, setTopicInput] = useState('');
  const [isSwitcherVisible, setIsSwitcherVisible] = useState(false);
  const [sessionModalVisible, setSessionModalVisible] = useState(false);
  const [modalSessionId, setModalSessionId] = useState<string | null>(null);
  const [resumePromptShown, setResumePromptShown] = useState(false);

  useEffect(() => {
    loadProfiles().catch(() => undefined);
    loadSessions().catch(() => undefined);
    loadBank().catch(() => undefined);
  }, [loadProfiles, loadSessions, loadBank]);

  const activeProfile = activeProfileId ? profiles[activeProfileId] : undefined;
  const activeLanguageLabel = useMemo(() => {
    if (!activeProfile) {
      return '';
    }
    const glyph = resolveFlagGlyph(activeProfile.targetLanguage, activeProfile.targetRegion);
    return `${glyph} ${activeProfile.targetLanguage.toUpperCase()}`;
  }, [activeProfile]);

  useEffect(() => {
    if (!profilesLoaded) {
      return;
    }
    if (!activeProfile) {
      ensureProfile({
        userId: DEFAULT_USER_ID,
        nativeLanguage: 'en',
        targetLanguage: 'es',
        targetRegion: 'mx',
        makeActive: true,
      }).catch(() => undefined);
    }
  }, [profilesLoaded, activeProfile, ensureProfile]);

  const sessionsForProfile: TtxSession[] = useMemo(() => {
    if (!activeProfile) {
      return [];
    }
    return Object.values(sessions)
      .filter(session => session.profileId === activeProfile.profileId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [sessions, activeProfile]);

  const unfinishedSession = useMemo(
    () => sessionsForProfile.find(session => !session.progress?.isComplete),
    [sessionsForProfile],
  );

  useEffect(() => {
    if (!unfinishedSession || sessionModalVisible || resumePromptShown) {
      return;
    }
    Alert.alert(
      'Resume translation practice?',
      'You have an unfinished translation set. Would you like to continue where you left off?',
      [
        {
          text: 'Start New',
          style: 'cancel',
        },
        {
          text: 'Continue',
          onPress: () => {
            setModalSessionId(unfinishedSession.sessionId);
            setSessionModalVisible(true);
            markSessionOpened(unfinishedSession.sessionId).catch(() => undefined);
          },
        },
      ],
    );
    setResumePromptShown(true);
  }, [unfinishedSession, sessionModalVisible, resumePromptShown, markSessionOpened]);

  if (!activeProfile) {
    return (
      <ScreenContainer style={[styles.screen, styles.centerContent]}>
        <ActivityIndicator color={colors.accent} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading profile…</Text>
      </ScreenContainer>
    );
  }

  const handleGenerateSession = async () => {
    const vocabPool = buildVocabPool({
      reviewMode,
      questionCount,
      savedVocab: bankItems,
      targetLanguage: activeProfile.targetLanguage,
      difficulty: activeProfile.preferredDifficulty,
      topics: topicInput,
    });

    if (vocabPool.type === 'empty') {
      Alert.alert('Nothing to review', vocabPool.message);
      return;
    }
    if (vocabPool.type === 'insufficient') {
      Alert.alert('Need more vocab', vocabPool.message);
      return;
    }

    const topicTags = topicInput
      .split(',')
      .map(tag => tag.trim())
      .filter(Boolean);

    const session = generateMockTranslationSession({
      profile: activeProfile,
      vocabPool: vocabPool.items,
      styleMix: STYLE_PRESETS[stylePreset].values,
      topicTags,
      reviewMode,
      questionCount,
    });

    await saveSession(session);
    await appendSavedSession(activeProfile.profileId, session.sessionId).catch(() => undefined);
    setModalSessionId(session.sessionId);
    setSessionModalVisible(true);
  };

  const dismissModal = () => {
    setSessionModalVisible(false);
    setModalSessionId(null);
  };

  const handleNewSessionFromReview = () => {
    dismissModal();
    handleGenerateSession().catch(() => undefined);
  };

  const handleSwitchActivityFromReview = () => {
    dismissModal();
    navigation.navigate('Activities' as never);
  };

  return (
    <ScreenContainer style={styles.screen}>
      <View style={styles.topBar}>
        <Pressable
          accessibilityLabel="Close translation tutor"
          accessibilityRole="button"
          onPress={() => navigation.goBack()}
          style={styles.topBarButton}
        >
          <Text style={styles.topBarClose}>×</Text>
        </Pressable>
        <View style={styles.topBarTitleArea}>
          <Text style={styles.screenTitle}>Translation Tutor</Text>
        </View>
        <Pressable
          onPress={() => setIsSwitcherVisible(true)}
          style={styles.languageLink}
          accessibilityRole="button"
        >
          <Text style={styles.languageLinkText}>{activeLanguageLabel || 'Choose'}</Text>
        </Pressable>
      </View>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContentFull}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.cardFull, { backgroundColor: colors.background }] }>
          <Text style={styles.cardTitle}>Session setup</Text>
          <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
            Choose how formal you want the responses, whether to review or learn new content, and how
            many prompts to practice.
          </Text>

          <Text style={styles.sectionLabel}>Formality presets</Text>
          <DiscreteSlider
            min={0}
            max={FORMALITY_OPTIONS.length - 1}
            step={1}
            value={FORMALITY_OPTIONS.findIndex(option => option.key === stylePreset)}
            onChange={index => {
              const resolved = FORMALITY_OPTIONS[index]?.key ?? 'balanced';
              setStylePreset(resolved);
            }}
            markers={FORMALITY_OPTIONS.map((option, idx) => ({ value: idx, label: option.label }))}
            styles={styles}
          />

          <Text style={styles.sectionLabel}>Vocabulary mix</Text>
          <View style={styles.chipRow}>
            {REVIEW_MODES.map(option => {
              const isSelected = reviewMode === option.value;
              return (
                <Pressable
                  key={option.value}
                  onPress={() => setReviewMode(option.value)}
                  style={[
                    styles.chip,
                    {
                      borderColor: isSelected ? colors.accent : colors.border,
                      backgroundColor: isSelected ? colors.accentSoft : colors.surface,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.chipLabel,
                      { color: isSelected ? colors.accent : colors.textPrimary },
                    ]}
                  >
                    {option.label}
                  </Text>
                  <Text style={[styles.chipSubtext, { color: colors.textSecondary }]}>
                    {option.description}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.sliderHeaderRow}>
            <Text style={styles.sectionLabel}>Question count</Text>
            <Text style={styles.sliderValueLabel}>{questionCount} prompts</Text>
          </View>
          <DiscreteSlider
            min={QUESTION_MIN}
            max={QUESTION_MAX}
            step={1}
            value={questionCount}
            onChange={setQuestionCount}
            markers={[
              { value: QUESTION_MIN, label: `${QUESTION_MIN}` },
              { value: Math.round((QUESTION_MIN + QUESTION_MAX) / 2), label: '·' },
              { value: QUESTION_MAX, label: `${QUESTION_MAX}` },
            ]}
            styles={styles}
          />

          <Text style={styles.sectionLabel}>Optional topics</Text>
          <TextInput
            value={topicInput}
            onChangeText={setTopicInput}
            placeholder="e.g. street food, travel logistics, slang"
            placeholderTextColor={colors.textSecondary}
            style={[
              styles.topicInput,
              {
                borderColor: colors.border,
                color: colors.textPrimary,
                backgroundColor: mode === 'dark' ? colors.surfaceMuted : colors.surface,
              },
            ]}
          />

          <Pressable
            onPress={handleGenerateSession}
            style={[styles.primaryButton, styles.buttonTopMargin, { backgroundColor: colors.accent }]}
          >
            <Text style={styles.primaryButtonLabel}>Generate session</Text>
          </Pressable>

          {unfinishedSession ? (
            <Pressable
              onPress={() => {
                setModalSessionId(unfinishedSession.sessionId);
                setSessionModalVisible(true);
                markSessionOpened(unfinishedSession.sessionId).catch(() => undefined);
              }}
              style={[
                styles.secondaryButton,
                { borderColor: colors.accent, backgroundColor: colors.accentSoft },
              ]}
            >
              <Text style={[styles.secondaryButtonLabel, { color: colors.accent }]}>
                Continue last session
              </Text>
            </Pressable>
          ) : null}
        </View>

        {bankLoading ? (
          <View style={[styles.cardFull, styles.centerContent, { backgroundColor: colors.background }]}>
            <ActivityIndicator color={colors.accent} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Syncing vocabulary…</Text>
          </View>
        ) : null}
      </ScrollView>

      <LanguageSwitcherModal visible={isSwitcherVisible} onClose={() => setIsSwitcherVisible(false)} />
      <SessionPlayerModal
        visible={sessionModalVisible}
        sessionId={modalSessionId}
        contentWidth={modalContentWidth}
        onClose={dismissModal}
        appendHistory={appendHistory}
        setRecap={setRecap}
        setProgress={setProgress}
        toggleFlagged={toggleFlagged}
        createNote={createNote}
        bankItems={bankItems}
        recordActivityOutcome={recordActivityOutcome}
        styles={styles}
        mode={mode}
        onRequestNewSession={handleNewSessionFromReview}
        onSwitchActivity={handleSwitchActivityFromReview}
      />
    </ScreenContainer>
  );
};

type SessionPlayerModalProps = {
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
  styles: ReturnType<typeof createStyles>;
  mode: ThemeMode;
  onRequestNewSession: () => void;
  onSwitchActivity: () => void;
};

const SessionPlayerModal: React.FC<SessionPlayerModalProps> = ({
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
  onSwitchActivity,
}) => {
  const session = useTranslationSessionStore(state =>
    sessionId ? state.sessions[sessionId] : undefined,
  );
  const { colors } = useTheme();
  const [answer, setAnswer] = useState('');
  const [analysis, setAnalysis] = useState<AnalysisState | null>(null);
  const [reviewSummary, setReviewSummary] = useState<ReviewSummary | null>(null);
  const [miniChatMessages, setMiniChatMessages] = useState<MiniChatMessage[]>([]);
  const [miniChatInput, setMiniChatInput] = useState('');
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
      setMiniChatMessages([]);
      setMiniChatInput('');
      setIsMiniChatExpanded(false);
      chatOverlayAnim.setValue(0);
      slideAnim.setValue(0);
    }
  }, [visible, session, slideAnim, chatOverlayAnim]);

  if (!session) {
    return null;
  }

  const item = session.items[currentIndex];
  const remaining = session.items.length - currentIndex;
  const isFinalQuestion = currentIndex === session.items.length - 1;

  const handleSubmit = async () => {
    if (!item || answer.trim().length === 0) {
      return;
    }
    setIsGrading(true);
    const evaluation = evaluateTranslationAnswer(item, answer);
    const attempt: TtxItemHistory = {
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

    // Update SRS data for focused vocab items using production-weighted scoring
    const attemptDate = new Date();
    for (const vocabId of item.focusVocabIds) {
      const vocab = bankItems.find(v => v.id === vocabId);
      if (vocab) {
        const activityOutcome: ActivityOutcome = {
          activityType: 'production',
          wasCorrect: evaluation.score >= 0.5, // Pass threshold for production
          score: evaluation.score,
          attemptedAt: attemptDate,
        };
        // Record outcome asynchronously without blocking UI
        recordActivityOutcome(vocabId, activityOutcome).catch(error => {
          console.warn('Failed to update SRS for vocab:', vocabId, error);
        });
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
    setMiniChatMessages([
      {
        id: 'assistant-initial',
        role: 'assistant',
        text: evaluation.feedback,
      },
    ]);
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
    setMiniChatMessages([]);
    setMiniChatInput('');
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
    if (!analysis || miniChatInput.trim().length === 0) {
      return;
    }
    const userMessage: MiniChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: miniChatInput.trim(),
    };
    const assistantMessage: MiniChatMessage = {
      id: `assistant-${Date.now()}`,
      role: 'assistant',
      text: `Tutor insight: ${analysis.item.insightHook}\n\n${analysis.evaluation.feedback}`,
    };
    setMiniChatMessages(prev => [...prev, userMessage, assistantMessage]);
    setMiniChatInput('');
    openMiniChatOverlay();
  };

  const closeModal = () => {
    onClose();
  };

  const openMiniChatOverlay = () => {
    setIsMiniChatExpanded(true);
    Animated.timing(chatOverlayAnim, {
      toValue: 1,
      duration: 220,
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

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={closeModal}>
      <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
        <View style={styles.modalHeader}>
          <Pressable onPress={closeModal} style={styles.closeButton}>
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
                onSwitchActivity={onSwitchActivity}
                onExit={closeModal}
              />
            </View>
          ) : (
            <>
              <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>
                {session.questionCount - remaining + 1}/{session.questionCount}
              </Text>
      <View style={styles.sliderViewport}>
                <Animated.View
                  style={[
                    styles.sliderTrack,
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
                      onAskTutor={handleMiniChatSend}
                      onExpandChat={openMiniChatOverlay}
                      miniChatMessages={miniChatMessages}
                      miniChatInput={miniChatInput}
                      setMiniChatInput={setMiniChatInput}
                      onAddNote={handleAddNote}
                      onFlag={handleFlagToggle}
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
            accessibilityViewIsModal
          >
            <View style={styles.chatOverlayHeader}>
              <Pressable onPress={closeMiniChatOverlay} style={styles.topBarButton}>
                <Text style={styles.topBarClose}>×</Text>
              </Pressable>
              <Text style={styles.chatOverlayTitle}>Ask the tutor</Text>
              <View style={styles.chatOverlayHeaderSpacer} />
            </View>
            <View style={styles.chatOverlayBody}>
              <ScrollView style={styles.chatOverlayMessages}>
                {miniChatMessages.map(message => (
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
                  value={miniChatInput}
                  onChangeText={setMiniChatInput}
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

type PromptCardProps = {
  item: TtxItem;
  colors: ReturnType<typeof useTheme>['colors'];
  mode: ThemeMode;
  answer: string;
  onChangeAnswer: (value: string) => void;
  disabled: boolean;
  onSubmit: () => void;
  styles: ReturnType<typeof createStyles>;
};

const PromptCard: React.FC<PromptCardProps> = ({
  item,
  colors,
  mode,
  answer,
  onChangeAnswer,
  disabled,
  onSubmit,
  styles,
}) => (
  <View style={[styles.promptCard, { backgroundColor: colors.background }]}>
    <Text style={[styles.promptText, { color: colors.textPrimary }]}>{item.nativeText}</Text>
    {item.context ? (
      <Text style={[styles.promptContext, { color: colors.textSecondary }]}>{item.context}</Text>
    ) : null}
    <TextInput
      multiline
      value={answer}
      onChangeText={onChangeAnswer}
      placeholder="Type your translation…"
      placeholderTextColor={colors.textSecondary}
      style={[
        styles.answerField,
        {
          borderColor: colors.border,
          color: colors.textPrimary,
          backgroundColor: mode === 'dark' ? colors.surfaceMuted : colors.surface,
        },
      ]}
    />
      <Pressable
        onPress={onSubmit}
        disabled={disabled || answer.trim().length === 0}
        style={[
          styles.primaryButton,
          styles.fullWidthButton,
          styles.buttonTopMargin,
          {
            backgroundColor:
              disabled || answer.trim().length === 0 ? colors.surfaceMuted : colors.accent,
          },
        ]}
      >
      <Text style={styles.primaryButtonLabel}>{disabled ? 'Scoring…' : 'Submit translation'}</Text>
    </Pressable>
  </View>
);

type AnalysisCardProps = {
  analysis: AnalysisState | null;
  onNext: () => void;
  onAskTutor: () => void;
  onExpandChat: () => void;
  miniChatMessages: MiniChatMessage[];
  miniChatInput: string;
  setMiniChatInput: (value: string) => void;
  onAddNote: () => void;
  onFlag: () => void;
  colors: ReturnType<typeof useTheme>['colors'];
  styles: ReturnType<typeof createStyles>;
};

const AnalysisCard: React.FC<AnalysisCardProps> = ({
  analysis,
  onNext,
  onAskTutor,
  onExpandChat,
  miniChatMessages,
  miniChatInput,
  setMiniChatInput,
  onAddNote,
  onFlag,
  colors,
  styles,
}) => {
  if (!analysis) {
    return (
      <View style={[styles.analysisCard, styles.centerContent]}>
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Submit an answer to view feedback.</Text>
      </View>
    );
  }

  return (
    <View style={[styles.analysisCard, { backgroundColor: colors.background }]}>
      <Text style={styles.analysisHeadline}>Feedback</Text>
      <Text style={styles.analysisPrompt}>{analysis.item.nativeText}</Text>
      <Text style={[styles.analysisLabel, { color: colors.textSecondary }]}>Your answer</Text>
      <Text style={styles.analysisAnswer}>{analysis.learnerAnswer}</Text>
      <Text style={[styles.analysisLabel, { color: colors.textSecondary }]}>Tutor insight</Text>
      <Text style={styles.analysisFeedback}>{analysis.evaluation.feedback}</Text>
      <View style={styles.analysisActions}>
        <Pressable style={styles.secondaryButton} onPress={onAddNote}>
          <Text style={[styles.secondaryButtonLabel, { color: colors.accent }]}>Add to notes</Text>
        </Pressable>
        <Pressable style={styles.secondaryButton} onPress={onFlag}>
          <Text style={[styles.secondaryButtonLabel, { color: colors.accent }]}>
            {analysis.item.isFlagged ? 'Flagged' : 'Flag for review'}
          </Text>
        </Pressable>
      </View>
      <View style={styles.miniChatBox}>
        <Pressable style={styles.miniChatHeader} onPress={onExpandChat}>
          <Text style={styles.miniChatTitle}>Ask the tutor</Text>
          <Text style={styles.miniChatExpandHint}>Expand</Text>
        </Pressable>
        <ScrollView style={styles.miniChatMessages}>
          {miniChatMessages.map(message => (
            <View
              key={message.id}
              style={[
                styles.miniChatBubble,
                message.role === 'user' ? styles.miniChatBubbleUser : styles.miniChatBubbleAssistant,
              ]}
            >
              <Text style={styles.miniChatText}>{message.text}</Text>
            </View>
          ))}
        </ScrollView>
        <View style={styles.miniChatInputRow}>
          <TextInput
            value={miniChatInput}
            onChangeText={setMiniChatInput}
            placeholder="Ask why, request clarifications…"
            placeholderTextColor={colors.textSecondary}
            style={[styles.miniChatInput, { borderColor: colors.border, color: colors.textPrimary }]}
          />
          <Pressable style={styles.primaryButton} onPress={onAskTutor}>
            <Text style={styles.primaryButtonLabel}>Send</Text>
          </Pressable>
        </View>
      </View>
      <Pressable
        style={[
          styles.primaryButton,
          styles.fullWidthButton,
          styles.buttonTopMargin,
          { backgroundColor: colors.accent },
        ]}
        onPress={onNext}
      >
        <Text style={styles.primaryButtonLabel}>Next question</Text>
      </Pressable>
    </View>
  );
};

type ReviewCardProps = {
  summary: ReviewSummary;
  colors: ReturnType<typeof useTheme>['colors'];
  styles: ReturnType<typeof createStyles>;
  onNewSession: () => void;
  onSwitchActivity: () => void;
  onExit: () => void;
};

const ReviewCard: React.FC<ReviewCardProps> = ({
  summary,
  colors,
  styles,
  onNewSession,
  onSwitchActivity,
  onExit,
}) => {
  const formatPercent = (value: number) => `${Math.round(value * 100)}%`;
  const formatTime = (seconds: number) => `${Math.round(seconds)}s avg`;

  return (
    <View style={[styles.reviewCard, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.reviewScroll}
        contentContainerStyle={styles.reviewScrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.analysisHeadline}>Session review</Text>
        <View style={styles.reviewMetricsRow}>
          <View style={styles.reviewMetric}>
            <Text style={styles.reviewMetricLabel}>Accuracy</Text>
            <Text style={styles.reviewMetricValue}>{formatPercent(summary.accuracy)}</Text>
          </View>
          <View style={styles.reviewMetric}>
            <Text style={styles.reviewMetricLabel}>Response time</Text>
            <Text style={styles.reviewMetricValue}>{formatTime(summary.avgTimeSeconds)}</Text>
          </View>
        </View>
        <View style={styles.reviewSection}>
          <Text style={styles.reviewSectionTitle}>Strengths</Text>
          {summary.strengths.map(item => (
            <View key={`${item.prompt}-strength`} style={styles.reviewListItem}>
              <Text style={styles.reviewListPrompt}>{item.prompt}</Text>
              <Text style={[styles.reviewListInsight, { color: colors.textSecondary }]}>{item.insight}</Text>
            </View>
          ))}
        </View>
        <View style={styles.reviewSection}>
          <Text style={styles.reviewSectionTitle}>Focus next</Text>
          {summary.focusAreas.map(item => (
            <View key={`${item.prompt}-focus`} style={styles.reviewListItem}>
              <Text style={styles.reviewListPrompt}>{item.prompt}</Text>
              <Text style={[styles.reviewListInsight, { color: colors.textSecondary }]}>{item.insight}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
      <View style={styles.reviewButtons}>
        <Pressable
          style={[
            styles.primaryButton,
            styles.fullWidthButton,
            styles.buttonTopMargin,
            { backgroundColor: colors.accent },
          ]}
          onPress={onNewSession}
        >
          <Text style={styles.primaryButtonLabel}>New translation set</Text>
        </Pressable>
        <Pressable
          style={[styles.secondaryButton, styles.fullWidthButton, { borderColor: colors.accent }]}
          onPress={onSwitchActivity}
        >
          <Text style={[styles.secondaryButtonLabel, { color: colors.accent }]}>Switch activity</Text>
        </Pressable>
        <Pressable style={[styles.secondaryButton, styles.fullWidthButton]} onPress={onExit}>
          <Text style={styles.secondaryButtonLabel}>Done for now</Text>
        </Pressable>
      </View>
    </View>
  );
};

type BuildVocabPoolArgs = {
  reviewMode: ReviewMode;
  questionCount: number;
  savedVocab: VocabItem[];
  targetLanguage: string;
  difficulty: string;
  topics: string;
};

type VocabPoolResult =
  | { type: 'ok'; items: VocabItem[] }
  | { type: 'empty'; message: string }
  | { type: 'insufficient'; message: string };

const buildVocabPool = ({
  reviewMode,
  questionCount,
  savedVocab,
  targetLanguage,
  difficulty,
  topics,
}: BuildVocabPoolArgs): VocabPoolResult => {
  const topic = topics.split(',')[0]?.trim();
  const shuffledSaved = shuffleItems(savedVocab);
  const unseen = shuffledSaved.filter(item => !item.srsData || !item.srsData.lastReviewedAt);
  const seen = shuffledSaved.filter(item => item.srsData?.lastReviewedAt);

  const pullFromBank = (source: VocabItem[], count: number, exclude: Set<string> = new Set()) => {
    const picked: VocabItem[] = [];
    for (const entry of source) {
      if (picked.length >= count) {
        break;
      }
      if (exclude.has(entry.id)) {
        continue;
      }
      picked.push(entry);
      exclude.add(entry.id);
    }
    return picked;
  };

  if (reviewMode === 'review_only') {
    if (savedVocab.length === 0) {
      return {
        type: 'empty',
        message: 'No saved vocabulary yet. Add words to your bank or switch to new vocabulary.',
      };
    }
    const ordered = [...unseen, ...seen];
    if (ordered.length < questionCount) {
      return {
        type: 'insufficient',
        message: `Only ${ordered.length} saved items available. Reduce question count or add more words.`,
      };
    }
    return { type: 'ok', items: ordered.slice(0, questionCount) };
  }

  if (reviewMode === 'mixed') {
    const half = Math.max(1, Math.floor(questionCount / 2));
    const used = new Set<string>();
    const priorityPool = [...unseen, ...seen];
    const reviewItems = pullFromBank(priorityPool, half, used);
    const remaining = Math.max(questionCount - reviewItems.length, 0);
    const syntheticNeeded = Math.max(remaining - (priorityPool.length - reviewItems.length), 0);
    const additionalBank = pullFromBank(priorityPool, remaining - syntheticNeeded, used);
    const synthetic = syntheticNeeded
      ? createSyntheticVocab(syntheticNeeded, {
          targetLanguage,
          difficulty,
          topic,
        })
      : [];
    return { type: 'ok', items: [...reviewItems, ...additionalBank, ...synthetic] };
  }

  const used = new Set<string>();
  const newItems = pullFromBank(unseen, questionCount, used);
  if (newItems.length === questionCount) {
    return { type: 'ok', items: newItems };
  }
  const remainder = questionCount - newItems.length;
  const synthetic = createSyntheticVocab(remainder, {
    targetLanguage,
    difficulty,
    topic,
  });
  return { type: 'ok', items: [...newItems, ...synthetic] };
};

type SyntheticArgs = {
  targetLanguage: string;
  difficulty: string;
  topic?: string;
};

const createSyntheticVocab = (count: number, { targetLanguage, difficulty, topic }: SyntheticArgs): VocabItem[] =>
  Array.from({ length: count }).map((_, index) => {
    const id = `synthetic-${targetLanguage}-${Date.now()}-${index}`;
    const label = topic ? `${topic} idiom ${index + 1}` : `Conversation piece ${index + 1}`;
    return {
      id,
      term: `${targetLanguage.toUpperCase()} phrase ${index + 1}`,
      reading: undefined,
      meaning: `AI generated expression about ${label}`,
      examples: [`Contextual example involving ${label}.`],
      tags: [difficulty],
      folders: [],
      level: difficulty,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      srsData: undefined,
    } as VocabItem;
  });

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
  const srsQueue = session.items
    .map(item => {
      const vocabId = item.focusVocabIds[0];
      if (!vocabId) {
        return null;
      }
      const idx = session.items.indexOf(item);
      const score = normalizedScores[idx] ?? 0;
      const hours = score >= 0.85 ? 24 : score >= 0.5 ? 8 : 2;
      return { vocabId, dueAt: new Date(Date.now() + hours * 3600 * 1000).toISOString() };
    })
    .filter(Boolean) as { vocabId: string; dueAt: string }[];

  await setRecap(session.sessionId, {
    accuracy,
    durationsSeconds: normalizedDurations,
    recommendedActions,
    srsQueue,
  });

  return buildReviewSummary(session, normalizedScores, normalizedDurations, accuracy);
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

const shuffleItems = <T,>(items: T[]): T[] => {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

type SliderMarker = {
  value: number;
  label: string;
};

interface DiscreteSliderProps {
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
  markers?: SliderMarker[];
  styles: ReturnType<typeof createStyles>;
}

const DiscreteSlider: React.FC<DiscreteSliderProps> = ({
  min,
  max,
  step,
  value,
  onChange,
  markers,
  styles,
}) => {
  const [trackWidth, setTrackWidth] = useState(0);
  const clamp = (val: number) => Math.min(max, Math.max(min, val));

  const handleLocation = (locationX: number) => {
    if (!trackWidth) {
      return;
    }
    const ratio = Math.min(1, Math.max(0, locationX / trackWidth));
    const raw = min + ratio * (max - min);
    const stepsFromMin = Math.round((raw - min) / step);
    const snapped = clamp(min + stepsFromMin * step);
    onChange(snapped);
  };

  const ratio = (value - min) / (max - min || 1);
  const thumbLeft = trackWidth ? ratio * trackWidth : 0;

  const sliderProgressStyle = useMemo(
    () => ({ width: trackWidth ? Math.max(12, thumbLeft) : 0 }),
    [trackWidth, thumbLeft],
  );
  const thumbStyle = useMemo(
    () => ({
      left: Math.max(0, Math.min(trackWidth - THUMB_SIZE, thumbLeft - THUMB_SIZE / 2)),
    }),
    [trackWidth, thumbLeft],
  );

  const markerElements = markers?.map(marker => {
    const isActive = Math.abs(marker.value - value) < step / 2;
    return (
      <Text
        key={`${marker.value}-${marker.label}`}
        style={[styles.configSliderMarkerText, isActive && styles.configSliderMarkerActive]}
      >
        {marker.label}
      </Text>
    );
  });

  return (
    <View style={styles.configSliderContainer}>
      <View
        style={styles.configSliderTrackWrapper}
        onLayout={event => setTrackWidth(event.nativeEvent.layout.width)}
        onStartShouldSetResponder={() => true}
        onResponderGrant={event => handleLocation(event.nativeEvent.locationX)}
        onResponderMove={event => handleLocation(event.nativeEvent.locationX)}
      >
        <View style={styles.configSliderTrack}>
          <View style={[styles.configSliderProgress, sliderProgressStyle]} />
        </View>
        <View style={[styles.configSliderThumb, thumbStyle]} />
      </View>
      {markerElements && markerElements.length > 0 ? (
        <View style={styles.configSliderMarkersRow}>{markerElements}</View>
      ) : null}
    </View>
  );
};

const THUMB_SIZE = 20;

const createStyles = (colors: ReturnType<typeof useTheme>['colors']) =>
  StyleSheet.create({
    screen: {
      flex: 1,
    },
    topBar: {
      paddingHorizontal: spacing.block,
      paddingTop: spacing.block / 2,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    topBarButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
    },
    topBarClose: {
      fontSize: 28,
      lineHeight: 28,
      color: colors.textPrimary,
    },
    topBarTitleArea: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.base * 0.25,
    },
    screenTitle: {
      ...typography.title,
      fontFamily: fontFamilies.serif.semibold,
      color: colors.textPrimary,
    },
    languageLink: {
      minWidth: 60,
      alignItems: 'flex-end',
    },
    languageLinkText: {
      ...typography.caption,
      color: colors.accent,
      fontFamily: fontFamilies.sans.semibold,
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: spacing.block,
      paddingBottom: spacing.block * 2,
      gap: spacing.block,
    },
    scrollContentFull: {
      paddingBottom: spacing.block * 2,
      gap: spacing.block,
    },
    card: {
      borderRadius: radii.surface,
      padding: spacing.block,
      gap: spacing.base,
    },
    cardFull: {
      paddingHorizontal: spacing.block,
      paddingTop: spacing.block,
      paddingBottom: spacing.block * 1.5,
      gap: spacing.base,
    },
    cardTitle: {
      ...typography.subhead,
      fontFamily: fontFamilies.sans.semibold,
      color: colors.textPrimary,
    },
    cardSubtitle: {
      ...typography.body,
      fontFamily: fontFamilies.sans.regular,
      color: colors.textSecondary,
    },
    chipRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.base,
    },
    chip: {
      borderWidth: StyleSheet.hairlineWidth,
      borderRadius: radii.surface,
      paddingHorizontal: spacing.base,
      paddingVertical: spacing.base * 0.5,
      minWidth: 120,
    },
    chipLabel: {
      ...typography.captionStrong,
      fontFamily: fontFamilies.sans.semibold,
      color: colors.textPrimary,
    },
    chipSubtext: {
      ...typography.caption,
      fontFamily: fontFamilies.sans.regular,
      marginTop: 2,
    },
    sectionLabel: {
      ...typography.captionStrong,
      fontFamily: fontFamilies.sans.medium,
      marginTop: spacing.base,
      color: colors.textPrimary,
    },
    topicInput: {
      borderWidth: StyleSheet.hairlineWidth,
      borderRadius: radii.surface,
      paddingHorizontal: spacing.base,
      paddingVertical: spacing.base,
      ...typography.body,
    },
    sliderHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: spacing.base,
    },
    sliderValueLabel: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    primaryButton: {
      borderRadius: radii.surface,
      paddingVertical: spacing.base,
      alignItems: 'center',
      justifyContent: 'center',
    },
    primaryButtonLabel: {
      ...typography.bodyStrong,
      color: '#FFFFFF',
    },
    secondaryButton: {
      borderRadius: radii.surface,
      borderWidth: StyleSheet.hairlineWidth,
      paddingVertical: spacing.base * 0.75,
      paddingHorizontal: spacing.base,
      alignItems: 'center',
      justifyContent: 'center',
    },
    secondaryButtonLabel: {
      ...typography.captionStrong,
      color: colors.textPrimary,
    },
    buttonTopMargin: {
      marginTop: spacing.base,
    },
    centerContent: {
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.base,
    },
    loadingText: {
      ...typography.body,
      color: colors.textPrimary,
    },
    modalContainer: {
      flex: 1,
      paddingTop: 0,
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.block,
      marginBottom: spacing.base,
    },
    modalHeaderSpacer: {
      width: 36,
      height: 36,
    },
    modalTitle: {
      ...typography.subhead,
      fontFamily: fontFamilies.sans.semibold,
      color: colors.textPrimary,
    },
    closeButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
    },
    closeButtonLabel: {
      fontSize: 28,
      lineHeight: 28,
      color: colors.textPrimary,
    },
    modalContent: {
      flex: 1,
      paddingBottom: spacing.base,
    },
    progressLabel: {
      ...typography.caption,
      textAlign: 'right',
      marginBottom: spacing.base / 2,
      marginRight: spacing.block,
      color: colors.textSecondary,
    },
    sliderViewport: {
      flex: 1,
      overflow: 'hidden',
    },
    sliderTrack: {
      flexDirection: 'row',
      height: '100%',
    },
    promptCard: {
      flex: 1,
      borderRadius: 0,
      paddingHorizontal: spacing.block,
      paddingVertical: spacing.block * 0.75,
      gap: spacing.base,
    },
    promptText: {
      ...typography.body,
      fontFamily: fontFamilies.serif.semibold,
    },
    promptContext: {
      ...typography.caption,
    },
    answerField: {
      borderWidth: StyleSheet.hairlineWidth,
      borderRadius: radii.surface,
      minHeight: 120,
      padding: spacing.base,
      textAlignVertical: 'top',
    },
    analysisCard: {
      flex: 1,
      borderRadius: 0,
      paddingHorizontal: spacing.block,
      paddingVertical: spacing.block * 0.75,
      gap: spacing.base,
    },
    analysisHeadline: {
      ...typography.subhead,
      fontFamily: fontFamilies.sans.semibold,
      color: colors.textPrimary,
    },
    analysisPrompt: {
      ...typography.bodyStrong,
      color: colors.textPrimary,
    },
    analysisLabel: {
      ...typography.captionStrong,
      color: colors.textSecondary,
    },
    analysisAnswer: {
      ...typography.body,
      color: colors.textPrimary,
    },
    analysisFeedback: {
      ...typography.body,
      fontFamily: fontFamilies.sans.regular,
      color: colors.textPrimary,
    },
    reviewCard: {
      flex: 1,
      borderRadius: 0,
      paddingHorizontal: spacing.block,
      paddingVertical: spacing.block,
      gap: spacing.base,
    },
    reviewScroll: {
      flex: 1,
    },
    reviewScrollContent: {
      gap: spacing.base,
      paddingBottom: spacing.base,
    },
    reviewWrapper: {
      flex: 1,
    },
    reviewMetricsRow: {
      flexDirection: 'row',
      gap: spacing.base,
    },
    reviewMetric: {
      flex: 1,
      borderRadius: radii.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      padding: spacing.base,
    },
    reviewMetricLabel: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    reviewMetricValue: {
      ...typography.title,
      fontFamily: fontFamilies.serif.semibold,
      color: colors.textPrimary,
    },
    reviewSection: {
      gap: spacing.base * 0.5,
    },
    reviewSectionTitle: {
      ...typography.captionStrong,
      color: colors.textSecondary,
    },
    reviewListItem: {
      borderRadius: radii.control,
      backgroundColor: colors.surfaceMuted,
      padding: spacing.base,
      gap: spacing.base * 0.25,
    },
    reviewListPrompt: {
      ...typography.bodyStrong,
      color: colors.textPrimary,
    },
    reviewListInsight: {
      ...typography.caption,
    },
    reviewButtons: {
      gap: spacing.base * 0.5,
      marginTop: spacing.base,
      paddingBottom: spacing.base * 0.5,
      alignItems: 'stretch',
    },
    fullWidthButton: {
      width: '100%',
      alignSelf: 'stretch',
    },
    analysisActions: {
      flexDirection: 'row',
      gap: spacing.base,
    },
    miniChatBox: {
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      borderRadius: radii.surface,
      padding: spacing.base,
      gap: spacing.base * 0.75,
    },
    miniChatHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.base * 0.25,
    },
    miniChatTitle: {
      ...typography.captionStrong,
      color: colors.textPrimary,
    },
    miniChatExpandHint: {
      ...typography.caption,
      color: colors.accent,
    },
    miniChatMessages: {
      maxHeight: 140,
    },
    miniChatBubble: {
      borderRadius: radii.control,
      padding: spacing.base * 0.75,
      marginBottom: spacing.base * 0.5,
    },
    miniChatBubbleUser: {
      backgroundColor: colors.accentSoft,
      alignSelf: 'flex-end',
    },
    miniChatBubbleAssistant: {
      backgroundColor: colors.surfaceMuted,
      alignSelf: 'flex-start',
    },
    miniChatText: {
      ...typography.caption,
      color: colors.textPrimary,
    },
    miniChatInputRow: {
      flexDirection: 'row',
      gap: spacing.base,
      alignItems: 'center',
    },
    miniChatInput: {
      flex: 1,
      borderWidth: StyleSheet.hairlineWidth,
      borderRadius: radii.control,
      paddingHorizontal: spacing.base,
      paddingVertical: spacing.base * 0.5,
    },
    chatOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      paddingTop: spacing.block * 2.4,
      paddingHorizontal: spacing.block,
      paddingBottom: spacing.block,
      zIndex: 20,
    },
    chatOverlayHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.base,
    },
    chatOverlayHeaderSpacer: {
      width: 36,
      height: 36,
    },
    chatOverlayTitle: {
      ...typography.subhead,
      color: colors.textPrimary,
      fontFamily: fontFamilies.sans.semibold,
    },
    chatOverlayBody: {
      flex: 1,
      borderRadius: 0,
      paddingHorizontal: spacing.base * 0.5,
      paddingVertical: spacing.block * 0.35,
      backgroundColor: colors.background,
      gap: spacing.base,
    },
    chatOverlayMessages: {
      flex: 1,
    },
    chatOverlayInputRow: {
      flexDirection: 'row',
      gap: spacing.base * 0.5,
      alignItems: 'center',
      paddingTop: spacing.base,
      paddingHorizontal: spacing.base * 0.5,
    },
    chatOverlayInput: {
      flex: 1,
      borderWidth: StyleSheet.hairlineWidth,
      borderRadius: radii.control,
      paddingHorizontal: spacing.base * 0.5,
      paddingVertical: spacing.base * 0.75,
      minHeight: spacing.block * 0.9,
      maxHeight: spacing.block * 4,
      textAlignVertical: 'top',
    },
    chatOverlaySend: {
      paddingHorizontal: spacing.base * 0.9,
      paddingVertical: spacing.base * 0.75,
      borderRadius: radii.control,
      minWidth: 72,
    },
    configSliderContainer: {
      marginTop: spacing.base / 2,
    },
    configSliderTrackWrapper: {
      height: 36,
      justifyContent: 'center',
    },
    configSliderTrack: {
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.surfaceMuted,
      overflow: 'hidden',
    },
    configSliderProgress: {
      height: 4,
      backgroundColor: colors.accent,
      borderRadius: 2,
    },
    configSliderThumb: {
      position: 'absolute',
      width: THUMB_SIZE,
      height: THUMB_SIZE,
      borderRadius: THUMB_SIZE / 2,
      backgroundColor: colors.accent,
      top: 18 - THUMB_SIZE / 2,
    },
    configSliderMarkersRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: spacing.base / 2,
    },
    configSliderMarkerText: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    configSliderMarkerActive: {
      color: colors.accent,
      fontFamily: fontFamilies.sans.semibold,
    },
  });

export default TranslationPracticeScreen;
