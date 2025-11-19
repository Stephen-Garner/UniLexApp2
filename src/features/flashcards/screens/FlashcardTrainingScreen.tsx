import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import ScreenContainer from '@/shared/components/ScreenContainer';
import LanguageSwitcherModal from '@/shared/components/LanguageSwitcherModal';
import { useTheme, type ThemeMode } from '@/shared/theme/theme';
import { spacing, radii, typography, fontFamilies } from '@/shared/theme/tokens';
import { useLanguageProfileStore } from '@/state/language-profile.store';
import {
  useFlashcardSessionStore,
  type FlashcardSessionState,
} from '@/state/flashcard-session.store';
import { useBankStore } from '@/state/bank.store';
import { resolveFlagGlyph } from '@/data/language-library';
import { type StylePresetKey } from '@/domain/translation/style-presets';
import {
  generateFlashcardSession,
  type FlashcardPresentationSide,
} from '@/domain/flashcards/session-generator';
import type {
  FlashcardOutcome,
  FtxCard,
  FtxSession,
  LanguageProfile,
  PerformanceData,
  ReviewMode,
  SrsData,
  VocabItem,
} from '@/contracts/models';
import type { RootStackParamList } from '@/navigation/types';
import { DEFAULT_USER_ID } from '@/domain/user/constants';
import { calculateMasteryLevel, type ActivityOutcome } from '@/domain/srs/unified-srs-service';
import { ttsService } from '@/services/container';
import { useVocabActivityStore } from '@/state/vocab-activity.store';
import { buildRecap, computeOutcomes } from '@/features/flashcards/utils/session-metrics';
import SessionSummary from '@/features/flashcards/components/SessionSummary';

type FlashcardNavigation = NativeStackNavigationProp<RootStackParamList>;

const QUESTION_MIN = 5;
const QUESTION_MAX = 25;

const FORMALITY_OPTIONS: Array<{ key: StylePresetKey; label: string }> = [
  { key: 'formal', label: 'Formal' },
  { key: 'balanced', label: 'Balanced' },
  { key: 'informal', label: 'Informal' },
];

const REVIEW_MODES: Array<{ label: string; value: ReviewMode; description: string }> = [
  { label: 'Review only', value: 'review_only', description: 'Only saved vocab' },
  { label: 'Mix 50/50', value: 'mixed', description: 'Half review · Half new' },
  { label: 'New only', value: 'new_only', description: 'Newest bank words + AI' },
];

const PRESENTATION_OPTIONS: Array<{ label: string; value: FlashcardPresentationSide }> = [
  { label: 'Term first', value: 'term' },
  { label: 'Definition first', value: 'definition' },
];

const FlashcardTrainingScreen: React.FC = () => {
  const navigation = useNavigation<FlashcardNavigation>();
  const { colors, mode } = useTheme();
  const styles = useMemo(() => createStyles(colors, mode), [colors, mode]);
  const { width } = useWindowDimensions();
  const modalContentWidth = width;

  const {
    profiles,
    activeProfileId,
    isLoaded: profilesLoaded,
    loadProfiles,
    ensureProfile,
  } = useLanguageProfileStore();
  const sessions = useFlashcardSessionStore(state => state.sessions);
  const loadSessions = useFlashcardSessionStore(state => state.loadSessions);
  const saveSession = useFlashcardSessionStore(state => state.saveSession);
  const appendHistory = useFlashcardSessionStore(state => state.appendHistory);
  const setProgress = useFlashcardSessionStore(state => state.setProgress);
  const setRecap = useFlashcardSessionStore(state => state.setRecap);
  const toggleFlagged = useFlashcardSessionStore(state => state.toggleFlagged);
  const markSessionOpened = useFlashcardSessionStore(state => state.markSessionOpened);
  const popHistory = useFlashcardSessionStore(state => state.popHistory);
  const bankItems = useBankStore(state => state.items);
  const loadBank = useBankStore(state => state.loadBank);
  const bankLoading = useBankStore(state => state.isLoading);
  const recordActivityOutcome = useBankStore(state => state.recordActivityOutcome);
  const updateSrsData = useBankStore(state => state.updateSrsData);
  const updatePerformanceData = useBankStore(state => state.updatePerformanceData);
  const clearSrsData = useBankStore(state => state.clearSrsData);
  const addBankItem = useBankStore(state => state.addBankItem);
  const activityRecords = useVocabActivityStore(state => state.records);
  const loadActivityRecords = useVocabActivityStore(state => state.loadRecords);
  const appendActivityRecords = useVocabActivityStore(state => state.appendRecords);

  const [stylePreset, setStylePreset] = useState<StylePresetKey>('balanced');
  const [reviewMode, setReviewMode] = useState<ReviewMode>('mixed');
  const [questionCount, setQuestionCount] = useState(10);
  const [topicInput, setTopicInput] = useState('');
  const [presentationSide, setPresentationSide] = useState<FlashcardPresentationSide>('term');
  const [isSwitcherVisible, setIsSwitcherVisible] = useState(false);
  const [sessionModalVisible, setSessionModalVisible] = useState(false);
  const [modalSessionId, setModalSessionId] = useState<string | null>(null);
  const [resumePromptShown, setResumePromptShown] = useState(false);
  const eligibleBankItems = useMemo(() => {
    const MAX_ACTIVITIES_PER_WORD = 7;
    return bankItems.filter(item => {
      const mastery = calculateMasteryLevel(item);
      if (mastery !== null && mastery >= 0.8) {
        return false;
      }
      const historyCount =
        activityRecords[item.id]?.filter(record => record.type === 'flashcard').length ?? 0;
      return historyCount < MAX_ACTIVITIES_PER_WORD;
    });
  }, [bankItems, activityRecords]);

  useEffect(() => {
    loadProfiles().catch(() => undefined);
    loadSessions().catch(() => undefined);
    loadBank().catch(() => undefined);
    loadActivityRecords().catch(() => undefined);
  }, [loadProfiles, loadSessions, loadBank, loadActivityRecords]);

  const activeProfile: LanguageProfile | undefined = activeProfileId
    ? profiles[activeProfileId]
    : undefined;

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

  const sessionsForProfile: FtxSession[] = useMemo(() => {
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
      'Resume flashcards?',
      'You have an unfinished flashcard stack. Continue where you left off?',
      [
        {
          text: 'Start new',
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
    const topicTags = topicInput
      .split(',')
      .map(tag => tag.trim())
      .filter(Boolean);

    const result = generateFlashcardSession({
      profile: activeProfile,
      bankItems: eligibleBankItems,
      reviewMode,
      questionCount,
      topicTags,
      stylePreset,
      presentationSide,
    });

    if (result.type !== 'ok') {
      Alert.alert('Need more vocabulary', result.message);
      return;
    }

    // Persist any synthetic/new vocab into the bank so SRS/metadata can update during play
    const normalisedCards = await Promise.all(
      result.session.cards.map(async card => {
        if (card.vocabId) {
          const exists =
            bankItems.find(entry => entry.id === card.vocabId || entry.term === card.term) ?? null;
          if (exists) {
            return card;
          }
        }
        const created = await addBankItem({
          term: card.term,
          meaning: card.definition,
          reading: undefined,
          examples: card.example ? [card.example] : [],
          tags: topicTags,
          folders: [],
          level: activeProfile.preferredDifficulty,
          srsData: undefined,
        });
        return {
          ...card,
          vocabId: created.id,
          definition: created.meaning,
          example: created.examples?.[0] ?? card.example ?? null,
        };
      }),
    );

    const sessionWithBankedCards = {
      ...result.session,
      cards: normalisedCards,
    };

    await saveSession(sessionWithBankedCards);
    const vocabIdsForActivity = normalisedCards
      .map(card => card.vocabId)
      .filter((id): id is string => Boolean(id));
    if (vocabIdsForActivity.length > 0) {
      await appendActivityRecords(vocabIdsForActivity, sessionWithBankedCards.sessionId, 'flashcard');
    }
    setModalSessionId(sessionWithBankedCards.sessionId);
    setSessionModalVisible(true);
  };

  const dismissModal = () => {
    setSessionModalVisible(false);
    setModalSessionId(null);
  };

  const reviewModeIndex = REVIEW_MODES.findIndex(option => option.value === reviewMode);

  return (
    <ScreenContainer style={styles.screen}>
      <View style={styles.topBar}>
        <Pressable
          accessibilityLabel="Close flashcard trainer"
          accessibilityRole="button"
          onPress={() => navigation.goBack()}
          style={styles.topBarButton}
        >
          <Text style={styles.topBarClose}>×</Text>
        </Pressable>
        <View style={styles.topBarTitleArea}>
          <Text style={styles.screenTitle}>Flashcard Training</Text>
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
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.cardFull, { backgroundColor: colors.background }]}>
          <Text style={styles.cardTitle}>Session setup</Text>
          <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
            Match Quizlet-style flashcards to your level: decide the mix, tone, and how many cards
            to train.
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

          <Text style={styles.sectionLabel}>Review mix</Text>
          <DiscreteSlider
            min={0}
            max={REVIEW_MODES.length - 1}
            step={1}
            value={reviewModeIndex < 0 ? 1 : reviewModeIndex}
            onChange={index => {
              const resolved = REVIEW_MODES[index]?.value ?? 'mixed';
              setReviewMode(resolved);
            }}
            markers={REVIEW_MODES.map((option, idx) => ({ value: idx, label: option.label }))}
            styles={styles}
          />
          <Text style={[styles.chipSubtext, { color: colors.textSecondary }]}>
            {REVIEW_MODES[reviewModeIndex]?.description ?? 'Blend review with AI-curated picks.'}
          </Text>

          <Text style={styles.sectionLabel}>Show first</Text>
          <View style={styles.toggleRow}>
            {PRESENTATION_OPTIONS.map(option => {
              const isSelected = presentationSide === option.value;
              return (
                <Pressable
                  key={option.value}
                  onPress={() => setPresentationSide(option.value)}
                  style={[
                    styles.togglePill,
                    {
                      backgroundColor: isSelected ? colors.accent : colors.surface,
                      borderColor: isSelected ? colors.accent : colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.togglePillText,
                      { color: isSelected ? colors.textOnAccent : colors.textPrimary },
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.sliderHeaderRow}>
            <Text style={styles.sectionLabel}>How many cards?</Text>
            <Text style={styles.sliderValueLabel}>{questionCount} words</Text>
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
            placeholder="e.g. travel, dining, work slang"
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
            <Text style={styles.primaryButtonLabel}>Generate flashcards</Text>
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
      <FlashcardPlayerModal
        visible={sessionModalVisible}
        sessionId={modalSessionId}
        contentWidth={modalContentWidth}
        onClose={dismissModal}
        appendHistory={appendHistory}
        setProgress={setProgress}
        setRecap={setRecap}
        toggleFlagged={toggleFlagged}
        popHistory={popHistory}
        saveSession={saveSession}
        bankItems={bankItems}
        recordActivityOutcome={recordActivityOutcome}
        updateSrsData={updateSrsData}
        updatePerformanceData={updatePerformanceData}
        clearSrsData={clearSrsData}
        styles={styles}
      />
    </ScreenContainer>
  );
};

type FlashcardPlayerModalProps = {
  visible: boolean;
  sessionId: string | null;
  contentWidth: number;
  onClose: () => void;
  appendHistory: FlashcardSessionState['appendHistory'];
  setProgress: FlashcardSessionState['setProgress'];
  setRecap: FlashcardSessionState['setRecap'];
  toggleFlagged: FlashcardSessionState['toggleFlagged'];
  popHistory: FlashcardSessionState['popHistory'];
  saveSession: FlashcardSessionState['saveSession'];
  bankItems: VocabItem[];
  recordActivityOutcome: (itemId: string, outcome: ActivityOutcome) => Promise<void>;
  updateSrsData: (itemId: string, data: SrsData) => Promise<void>;
  updatePerformanceData: (itemId: string, data: PerformanceData) => Promise<void>;
  clearSrsData: (itemId: string) => Promise<void>;
  styles: ReturnType<typeof createStyles>;
};

const FlashcardPlayerModal: React.FC<FlashcardPlayerModalProps> = props => {
  const session = useFlashcardSessionStore(state =>
    props.sessionId ? state.sessions[props.sessionId] : undefined,
  );
  if (!session) {
    return null;
  }
  return <FlashcardPlayerBody {...props} session={session} />;
};

type FlashcardPlayerBodyProps = Omit<FlashcardPlayerModalProps, 'sessionId'> & {
  session: FtxSession;
};

type UndoEntry = {
  cardId: string;
  previousProgress: number;
  previousCompletion: boolean;
  vocabId: string | null;
  previousSrs: SrsData | null;
  previousPerformance: VocabItem['performanceData'] | null;
};

const FlashcardPlayerBody: React.FC<FlashcardPlayerBodyProps> = ({
  visible,
  contentWidth,
  onClose,
  appendHistory,
  setProgress,
  setRecap,
  toggleFlagged,
  popHistory,
  saveSession,
  bankItems,
  recordActivityOutcome,
  updateSrsData,
  updatePerformanceData,
  clearSrsData,
  styles,
  session: initialSession,
}) => {
  const { colors } = useTheme();
  const dynamicStyles = useMemo(
    () =>
      StyleSheet.create({
        primaryAccent: { backgroundColor: colors.accent },
        primaryDisabled: { opacity: 0.5 },
        secondaryBorder: { borderColor: colors.accent },
        secondaryText: { color: colors.accent },
        audioIconTint: { tintColor: colors.textPrimary },
        audioIconDisabled: { opacity: 0.4 },
        flagAccent: { color: colors.accent },
        flagDefault: { color: colors.textSecondary },
        metaTextTint: { color: colors.textSecondary },
      }),
    [colors.accent, colors.textPrimary, colors.textSecondary],
  );

  // Subscribe directly to store to ensure we always have fresh session data
  const session = useFlashcardSessionStore(state =>
    state.sessions[initialSession.sessionId]
  ) ?? initialSession;

  const maxIndex = Math.max(session.cards.length - 1, 0);
  const [currentIndex, setCurrentIndex] = useState(() =>
    Math.min(session.progress?.currentIndex ?? 0, maxIndex),
  );
  const currentIndexRef = useRef(currentIndex);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [undoCount, setUndoCount] = useState(0);

  const translateX = useRef(new Animated.Value(0)).current;
  const flipAnim = useRef(new Animated.Value(0)).current;
  const isAnimatingRef = useRef(false);
  const srsDueRef = useRef(new Map<string, string>());
  const undoStackRef = useRef<UndoEntry[]>([]);

  const isComplete = currentIndex >= session.cards.length;
  const safeIndex = isComplete ? maxIndex : Math.min(currentIndex, maxIndex);
  const card = isComplete ? null : session.cards[safeIndex] ?? null;

  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  useEffect(() => {
    if (!visible) {
      return;
    }
    const pointer = session.progress?.isComplete
      ? maxIndex
      : Math.min(session.progress?.currentIndex ?? 0, maxIndex);
    setCurrentIndex(pointer);
    currentIndexRef.current = pointer;
  }, [
    visible,
    session.sessionId,
    maxIndex,
    session.progress?.currentIndex,
    session.progress?.isComplete,
  ]);

  useEffect(() => {
    if (!visible) {
      return;
    }
    translateX.setValue(0);
    flipAnim.setValue(0);
    setIsFlipped(false);
  }, [visible, session.sessionId, safeIndex, translateX, flipAnim]);

  const cards = session.cards;

  useEffect(() => {
    if (visible) {
      srsDueRef.current.clear();
    }
  }, [visible, session.sessionId]);

  useEffect(() => {
    if (!visible) {
      return;
    }
    undoStackRef.current = [];
    setUndoCount(0);
  }, [visible, session.sessionId]);

  const outcomes = useMemo(() => computeOutcomes(cards), [cards]);

  const progressLabel = isComplete
    ? `${cards.length}/${cards.length}`
    : `${Math.min(safeIndex + 1, cards.length)}/${cards.length}`;
  const presentationSide = session.presentationSide ?? 'term';

  const frontText = presentationSide === 'term' ? card?.term : card?.definition;
  const backText = presentationSide === 'term' ? card?.definition : card?.term;

  const handleSwipe = useCallback(
    (direction: 'left' | 'right') => {
      if (isAnimatingRef.current) {
        return;
      }
      const toValue = direction === 'right' ? contentWidth : -contentWidth;
      Animated.timing(translateX, {
        toValue,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        recordSwipe(direction).catch(() => undefined);
      });
    },
    [contentWidth, recordSwipe, translateX],
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) =>
          Math.abs(gesture.dx) > Math.abs(gesture.dy) && Math.abs(gesture.dx) > 6,
        onPanResponderMove: (_, gesture) => {
          translateX.setValue(gesture.dx);
        },
        onPanResponderRelease: (_, gesture) => {
          const threshold = contentWidth * 0.25;
          if (gesture.dx > threshold) {
            handleSwipe('right');
          } else if (gesture.dx < -threshold) {
            handleSwipe('left');
          } else {
            Animated.spring(translateX, {
              toValue: 0,
              useNativeDriver: true,
              bounciness: 12,
            }).start();
          }
        },
      }),
    [contentWidth, handleSwipe, translateX],
  );

  const rotation = translateX.interpolate({
    inputRange: [-contentWidth, 0, contentWidth],
    outputRange: ['-12deg', '0deg', '12deg'],
  });

  const frontRotation = flipAnim.interpolate({
    inputRange: [0, 180],
    outputRange: ['0deg', '180deg'],
  });
  const backRotation = flipAnim.interpolate({
    inputRange: [0, 180],
    outputRange: ['180deg', '360deg'],
  });

  const handleFlip = () => {
    const toValue = isFlipped ? 0 : 180;
    setIsFlipped(!isFlipped);
    Animated.spring(flipAnim, {
      toValue,
      useNativeDriver: true,
      friction: 8,
      tension: 12,
    }).start();
  };

  const handlePlayAudio = async () => {
    if (!card?.term || isSpeaking) {
      return;
    }
    setIsSpeaking(true);
    try {
      await ttsService.speak({
        text: card.term,
        languageCode: session.targetLanguage,
      });
    } catch (error) {
      console.warn('Failed to play pronunciation', error);
    } finally {
      setIsSpeaking(false);
    }
  };

  const applySrsUpdate = useCallback(
    async (currentCard: FtxCard, outcome: FlashcardOutcome) => {
      if (!currentCard.vocabId) {
        return;
      }
      const vocab = bankItems.find(item => item.id === currentCard.vocabId);
      if (!vocab) {
        return;
      }

      // Create activity outcome for unified SRS tracking
      const activityOutcome: ActivityOutcome = {
        activityType: 'recognition',
        wasCorrect: outcome === 'correct',
        attemptedAt: new Date(),
      };

      // Use unified SRS service to update both SRS and performance data
      await recordActivityOutcome(vocab.id, activityOutcome);

      // Store due date for recap
      const updatedVocab = useBankStore.getState().items.find(item => item.id === vocab.id);
      if (updatedVocab?.srsData?.dueAt) {
        srsDueRef.current.set(vocab.id, updatedVocab.srsData.dueAt);
      }
    },
    [bankItems, recordActivityOutcome],
  );

  const resetForReplay = () => {
    translateX.setValue(0);
    flipAnim.setValue(0);
    setIsFlipped(false);
    undoStackRef.current = [];
    setUndoCount(0);
    srsDueRef.current.clear();
    setCurrentIndex(0);
    currentIndexRef.current = 0;
  };

  const shuffleCards = (items: FtxCard[]) => {
    const next = [...items];
    for (let i = next.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [next[i], next[j]] = [next[j], next[i]];
    }
    return next;
  };

  const restartSessionWithCards = async (cardsToUse: FtxCard[]) => {
    const resetCards = cardsToUse.map(cardItem => ({ ...cardItem, history: [] }));
    const nextSession: FtxSession = {
      ...session,
      cards: resetCards,
      progress: {
        currentIndex: 0,
        isComplete: false,
        lastOpenedAt: new Date().toISOString(),
      },
      recap: null,
    };
    await saveSession(nextSession);
    resetForReplay();
  };

  const finalizeSession = useCallback(async () => {
    const recap = buildRecap(cards, srsDueRef.current);
    await setRecap(session.sessionId, recap);
  }, [cards, session.sessionId, setRecap]);

  const recordSwipe = useCallback(
    async (direction: 'left' | 'right') => {
      if (!card || isAnimatingRef.current) {
        return;
      }
      isAnimatingRef.current = true;
      try {
        const previousProgress = currentIndexRef.current;
        const previousCompletion = isComplete;
        const previousSrs =
          card.vocabId && bankItems.length > 0
            ? bankItems.find(item => item.id === card.vocabId)?.srsData ?? null
            : null;
        const previousPerformance =
          card.vocabId && bankItems.length > 0
            ? bankItems.find(item => item.id === card.vocabId)?.performanceData ?? null
            : null;
        const outcome: FlashcardOutcome = direction === 'right' ? 'correct' : 'incorrect';
        const undoEntry: UndoEntry = {
          cardId: card.cardId,
          previousProgress,
          previousCompletion,
          vocabId: card.vocabId ?? null,
          previousSrs,
          previousPerformance,
        };

        await appendHistory({
          sessionId: session.sessionId,
          cardId: card.cardId,
          outcome,
        });
        await applySrsUpdate(card, outcome).catch(error => {
          console.warn('Failed to update SRS for flashcard', error);
        });
        const nextProgressIndex = currentIndexRef.current + 1;
        const isSessionComplete = nextProgressIndex >= session.cards.length;
        await setProgress(session.sessionId, {
          currentIndex: isSessionComplete ? session.cards.length : nextProgressIndex,
          isComplete: isSessionComplete,
          lastOpenedAt: new Date().toISOString(),
        });

        // Update local state to trigger completion screen or advance to next card
        const newIndex = isSessionComplete ? session.cards.length : Math.min(nextProgressIndex, maxIndex);
        setCurrentIndex(newIndex);
        currentIndexRef.current = newIndex;

        if (isSessionComplete) {
          await finalizeSession();
        }

        undoStackRef.current.push(undoEntry);
        setUndoCount(undoStackRef.current.length);
        // Reset position for next card
        translateX.setValue(0);
      } catch (error) {
        console.warn('Failed to record flashcard swipe', error);
        Alert.alert('Could not record swipe', 'Please try again.');
        // On error, snap card back to center
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
          bounciness: 12,
        }).start();
      } finally {
        isAnimatingRef.current = false;
      }
    },
    [
      appendHistory,
      applySrsUpdate,
      bankItems,
      card,
      finalizeSession,
      isComplete,
      maxIndex,
      session.cards.length,
      session.sessionId,
      setProgress,
      translateX,
    ],
  );

  const handleToggleFlag = async () => {
    if (!card) {
      return;
    }
    await toggleFlagged(session.sessionId, card.cardId, !card.isFlagged);
  };

  const handleUndo = async () => {
    if (undoStackRef.current.length === 0) {
      return;
    }
    const entry = undoStackRef.current.pop();
    if (!entry) {
      return;
    }
    try {
      await popHistory({ sessionId: session.sessionId, cardId: entry.cardId }).catch(() => undefined);
      if (entry.vocabId) {
        try {
          if (entry.previousSrs) {
            await updateSrsData(entry.vocabId, entry.previousSrs);
            srsDueRef.current.set(entry.vocabId, entry.previousSrs.dueAt);
          } else {
            await clearSrsData(entry.vocabId);
            srsDueRef.current.delete(entry.vocabId);
          }
          if (entry.previousPerformance) {
            await updatePerformanceData(entry.vocabId, entry.previousPerformance);
          }
        } catch (error) {
          console.warn('Failed to revert SRS metadata', error);
        }
      }
      await setProgress(session.sessionId, {
        currentIndex: entry.previousProgress,
        isComplete: entry.previousCompletion,
        lastOpenedAt: new Date().toISOString(),
      });
      const targetIndex = entry.previousCompletion
        ? maxIndex
        : Math.min(entry.previousProgress, maxIndex);
      setCurrentIndex(targetIndex);
      currentIndexRef.current = targetIndex;
      if (session.recap) {
        await setRecap(session.sessionId, null);
      }
    } finally {
      setUndoCount(undoStackRef.current.length);
    }
  };

  const canUndo = undoCount > 0;

  // Use tallies derived from history so they always match the rendered session state
  const tallyCorrect = outcomes.correct;
  const tallyIncorrect = outcomes.incorrect;
  const answeredTotal = tallyCorrect + tallyIncorrect;
  const summaryTotal = answeredTotal || cards.length;
  const completedCorrect = tallyCorrect;
  const completedIncorrect = tallyIncorrect;

  const handleReviewMissed = async () => {
    const missedCards = cards.filter(candidate => {
      const lastEntry = candidate.history[candidate.history.length - 1];
      return lastEntry?.outcome === 'incorrect';
    });

    if (missedCards.length === 0) {
      Alert.alert('Nice work!', 'No missed cards to review.');
      return;
    }

    await restartSessionWithCards(shuffleCards(missedCards));
  };

  const handleReviewAll = async () => {
    await restartSessionWithCards(cards);
  };

  const handleExitActivity = () => {
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
        <View style={styles.modalTopBar}>
          <Pressable style={styles.modalClose} onPress={onClose} accessibilityLabel="Close session">
            <Text style={styles.modalCloseLabel}>×</Text>
          </Pressable>
          <Text style={styles.modalTitle}>Flashcards</Text>
          <View style={styles.modalTopSpacer} />
        </View>
        <View style={styles.modalCountersRow}>
          <Text style={[styles.counterLabel, styles.counterLabelDanger]}>{tallyIncorrect}</Text>
          <Text style={styles.counterLabel}>{progressLabel}</Text>
          <Text style={[styles.counterLabel, styles.counterLabelSuccess]}>{tallyCorrect}</Text>
        </View>

        {isComplete ? (
          <SessionSummary
            completedCorrect={completedCorrect}
            completedIncorrect={completedIncorrect}
            summaryTotal={summaryTotal}
            styles={styles}
            dynamicStyles={dynamicStyles}
            colors={colors}
            onReviewMissed={handleReviewMissed}
            onReviewAll={handleReviewAll}
            onExitActivity={handleExitActivity}
          />
        ) : card ? (
          <View style={styles.cardPlayArea}>
            <View style={styles.cardMetaRow}>
              <Pressable
                onPress={handlePlayAudio}
                disabled={!card || isSpeaking}
                style={[styles.audioButton, (!card || isSpeaking) && styles.audioButtonDisabled]}
              >
                <Image
                  source={require('../../../../assets/icons/speak-line.png')}
                  style={[
                    styles.audioIcon,
                    dynamicStyles.audioIconTint,
                    (!card || isSpeaking) && dynamicStyles.audioIconDisabled,
                  ]}
                />
              </Pressable>
              <Text
                style={[
                  styles.cardMetaText,
                  styles.cardMetaTextCentered,
                  dynamicStyles.metaTextTint,
                ]}
              >
                Tap to flip · Swipe to grade
              </Text>
              <Pressable onPress={handleToggleFlag} style={styles.flagButton}>
                <Text
                  style={[
                    styles.flagLabel,
                    card?.isFlagged ? dynamicStyles.flagAccent : dynamicStyles.flagDefault,
                  ]}
                >
                  ★
                </Text>
              </Pressable>
            </View>
            <View style={styles.flashcardShadow}>
              <Animated.View
                style={[
                  styles.flashcard,
                  {
                    backgroundColor: colors.surface,
                    transform: [{ translateX }, { rotate: rotation }],
                  },
                ]}
                {...panResponder.panHandlers}
              >
                <Pressable style={styles.flashcardInner} onPress={handleFlip}>
                  <Animated.View
                    style={[
                      styles.flashcardFace,
                      {
                        transform: [{ rotateY: frontRotation }],
                      },
                    ]}
                  >
                    <Text style={styles.flashcardTerm}>{frontText}</Text>
                  </Animated.View>
                  <Animated.View
                    style={[
                      styles.flashcardFace,
                      styles.flashcardBack,
                      {
                        transform: [{ rotateY: backRotation }],
                      },
                    ]}
                  >
                    <Text style={styles.flashcardDefinition}>{backText}</Text>
                    {card?.example ? (
                      <Text style={[styles.flashcardExample, { color: colors.textSecondary }]}>
                        {card.example}
                      </Text>
                    ) : null}
                  </Animated.View>
                </Pressable>
              </Animated.View>
            </View>
          </View>
        ) : null}
        <View style={styles.undoRow}>
          <Pressable
            onPress={handleUndo}
            disabled={!canUndo}
            style={[styles.undoButton, !canUndo && styles.undoButtonDisabled]}
          >
            <Text style={styles.undoButtonText}>↺ Undo</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
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

const createStyles = (colors: ReturnType<typeof useTheme>['colors'], mode: ThemeMode = 'light') =>
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
    scrollContentFull: {
      paddingBottom: spacing.block * 2,
      gap: spacing.block,
    },
    cardFull: {
      borderRadius: radii.surface,
      paddingHorizontal: spacing.block,
      paddingVertical: spacing.block,
      gap: spacing.base,
    },
    cardTitle: {
      ...typography.title,
      fontFamily: fontFamilies.serif.semibold,
      color: colors.textPrimary,
    },
    cardSubtitle: {
      ...typography.body,
      color: colors.textSecondary,
    },
    sectionLabel: {
      ...typography.subhead,
      fontFamily: fontFamilies.sans.semibold,
      color: colors.textPrimary,
    },
    chipSubtext: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    sliderHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    sliderValueLabel: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    topicInput: {
      borderWidth: 1,
      borderRadius: radii.control,
      paddingHorizontal: spacing.base,
      paddingVertical: spacing.base * 0.75,
      ...typography.body,
    },
    primaryButton: {
      paddingVertical: spacing.base * 1.1,
      borderRadius: radii.pill,
      alignItems: 'center',
      justifyContent: 'center',
    },
    primaryButtonLabel: {
      ...typography.bodyStrong,
      color: colors.textOnAccent,
      fontFamily: fontFamilies.sans.semibold,
    },
    secondaryButton: {
      paddingVertical: spacing.base * 1.1,
      borderRadius: radii.pill,
      borderWidth: 1.5,
      alignItems: 'center',
      justifyContent: 'center',
    },
    secondaryButtonLabel: {
      ...typography.bodyStrong,
      color: colors.textPrimary,
      fontFamily: fontFamilies.sans.semibold,
    },
    buttonTopMargin: {
      marginTop: spacing.base,
    },
    centerContent: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      ...typography.body,
      marginTop: spacing.base / 2,
    },
    toggleRow: {
      flexDirection: 'row',
      gap: spacing.base,
    },
    togglePill: {
      flex: 1,
      borderRadius: radii.pill,
      paddingVertical: spacing.base * 0.6,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1.5,
    },
    togglePillText: {
      ...typography.bodyStrong,
      fontFamily: fontFamilies.sans.semibold,
    },
    configSliderContainer: {
      marginTop: spacing.base / 2,
      marginBottom: spacing.base,
    },
    configSliderTrackWrapper: {
      height: 32,
      justifyContent: 'center',
    },
    configSliderTrack: {
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.surfaceMuted,
      overflow: 'hidden',
    },
    configSliderProgress: {
      height: 6,
      backgroundColor: colors.accent,
      borderRadius: 3,
    },
    configSliderThumb: {
      position: 'absolute',
      top: 6,
      width: THUMB_SIZE,
      height: THUMB_SIZE,
      borderRadius: THUMB_SIZE / 2,
      backgroundColor: colors.accent,
      borderWidth: 2,
      borderColor: colors.background,
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
      color: colors.textPrimary,
      fontFamily: fontFamilies.sans.semibold,
    },
    modalContainer: {
      flex: 1,
      paddingTop: spacing.block * 2.5,
      paddingHorizontal: spacing.block,
      paddingBottom: spacing.block * 2,
    },
    modalTopBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.base,
    },
    modalTopSpacer: {
      width: 36,
    },
    modalClose: {
      padding: spacing.base,
    },
    modalCloseLabel: {
      fontSize: 28,
      lineHeight: 28,
      color: colors.textPrimary,
    },
    modalCountersRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: spacing.base / 2,
    },
    modalTitle: {
      ...typography.title,
      fontFamily: fontFamilies.serif.semibold,
      color: colors.textPrimary,
      textAlign: 'center',
      flex: 1,
    },
    counterLabel: {
      ...typography.subhead,
      fontFamily: fontFamilies.sans.semibold,
      color: colors.textPrimary,
    },
    counterLabelDanger: {
      color: '#E45865',
    },
    counterLabelSuccess: {
      color: '#38C976',
    },
    cardPlayArea: {
      flex: 1,
      justifyContent: 'center',
    },
    cardMetaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacing.base,
      gap: spacing.base / 2,
    },
    cardMetaText: {
      ...typography.caption,
      flex: 1,
    },
    cardMetaTextCentered: {
      textAlign: 'center',
    },
    flagButton: {
      padding: spacing.base / 2,
    },
    flagLabel: {
      fontSize: 18,
    },
    audioButton: {
      padding: spacing.base / 2,
      borderRadius: radii.control,
    },
    audioButtonDisabled: {
      opacity: 0.5,
    },
    audioIcon: {
      width: 18,
      height: 18,
      resizeMode: 'contain',
    },
    flashcardShadow: {
      shadowColor: '#000',
      shadowOpacity: mode === 'dark' ? 0.4 : 0.1,
      shadowOffset: { width: 0, height: 12 },
      shadowRadius: 24,
      elevation: 6,
    },
    flashcard: {
      borderRadius: radii.pill,
      padding: spacing.block,
    },
    flashcardInner: {
      minHeight: 260,
      justifyContent: 'center',
    },
    flashcardFace: {
      backfaceVisibility: 'hidden',
      position: 'absolute',
      left: 0,
      right: 0,
    },
    flashcardBack: {
      transform: [{ rotateY: '180deg' }],
    },
    flashcardTerm: {
      ...typography.title,
      textAlign: 'center',
      color: colors.textPrimary,
      fontFamily: fontFamilies.serif.semibold,
    },
    flashcardDefinition: {
      ...typography.subhead,
      textAlign: 'center',
      color: colors.textPrimary,
      fontFamily: fontFamilies.serif.semibold,
    },
    flashcardExample: {
      marginTop: spacing.base,
      textAlign: 'center',
      ...typography.body,
    },
    cardSummary: {
      borderRadius: radii.surface,
      padding: spacing.block,
      marginTop: spacing.block,
    },
    summaryTitle: {
      ...typography.subhead,
      fontFamily: fontFamilies.serif.semibold,
      color: colors.textPrimary,
    },
    summarySubtitle: {
      ...typography.body,
      color: colors.textSecondary,
      marginTop: spacing.base / 2,
    },
    summaryActions: {
      marginTop: spacing.block,
      gap: spacing.base,
    },
    fullWidthButton: {
      width: '100%',
    },
    undoRow: {
      marginTop: spacing.base,
    },
    undoButton: {
      paddingVertical: spacing.base * 0.5,
      paddingHorizontal: spacing.base,
      borderRadius: radii.control,
      borderWidth: 1,
      borderColor: colors.border,
      alignSelf: 'flex-start',
    },
    undoButtonDisabled: {
      opacity: 0.4,
    },
    undoButtonText: {
      ...typography.captionStrong,
      color: colors.textPrimary,
    },
  });

export default FlashcardTrainingScreen;
