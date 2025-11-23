import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, PanResponder, useWindowDimensions, Alert } from 'react-native';
import { useBankStore } from '@/state/bank.store';
import {
  useFlashcardSessionStore,
  type FlashcardSessionState,
} from '../stores/flashcard-session.store';
import { ttsService } from '@/services/container';
import { buildRecap, computeOutcomes } from '@/features/flashcards/utils/session-metrics';
import type {
  FlashcardOutcome,
  FtxCard,
  FtxSession,
  SrsData,
  VocabItem,
} from '@/contracts/models';
import type { ActivityOutcome } from '@/domain/srs/unified-srs-service';

type useFlashcardPlayerProps = {
  session: FtxSession;
  onClose: () => void;
};

type UndoEntry = {
  cardId: string;
  previousProgress: number;
  previousCompletion: boolean;
  vocabId: string | null;
  previousSrs: SrsData | null;
  previousPerformance: VocabItem['performanceData'] | null;
};

export const useFlashcardPlayer = ({ session: initialSession, onClose }: useFlashcardPlayerProps) => {
  const { width: contentWidth } = useWindowDimensions();

  const appendHistory = useFlashcardSessionStore(state => state.appendHistory);
  const setProgress = useFlashcardSessionStore(state => state.setProgress);
  const setRecap = useFlashcardSessionStore(state => state.setRecap);
  const toggleFlagged = useFlashcardSessionStore(state => state.toggleFlagged);
  const popHistory = useFlashcardSessionStore(state => state.popHistory);
  const saveSession = useFlashcardSessionStore(state => state.saveSession);
  const bankItems = useBankStore(state => state.items);
  const recordActivityOutcome = useBankStore(state => state.recordActivityOutcome);
  const updateSrsData = useBankStore(state => state.updateSrsData);
  const updatePerformanceData = useBankStore(state => state.updatePerformanceData);
  const clearSrsData = useBankStore(state => state.clearSrsData);

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
  const recordSwipeRef = useRef<(direction: 'left' | 'right') => Promise<void>>(async () => {});

  const isComplete = currentIndex >= session.cards.length;
  const safeIndex = isComplete ? maxIndex : Math.min(currentIndex, maxIndex);
  const card = isComplete ? null : session.cards[safeIndex] ?? null;

  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  useEffect(() => {
    const pointer = session.progress?.isComplete
      ? maxIndex
      : Math.min(session.progress?.currentIndex ?? 0, maxIndex);
    setCurrentIndex(pointer);
    currentIndexRef.current = pointer;
  }, [
    session.sessionId,
    maxIndex,
    session.progress?.currentIndex,
    session.progress?.isComplete,
  ]);

  useEffect(() => {
    translateX.setValue(0);
    flipAnim.setValue(0);
    setIsFlipped(false);
  }, [session.sessionId, safeIndex, translateX, flipAnim]);

  const cards = session.cards;

  useEffect(() => {
    srsDueRef.current.clear();
  }, [session.sessionId]);

  useEffect(() => {
    undoStackRef.current = [];
    setUndoCount(0);
  }, [session.sessionId]);

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
        recordSwipeRef.current(direction).catch(() => undefined);
      });
    },
    [contentWidth, translateX],
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

      const activityOutcome: ActivityOutcome = {
        activityType: 'recognition',
        wasCorrect: outcome === 'correct',
        attemptedAt: new Date(),
      };

      await recordActivityOutcome(vocab.id, activityOutcome);

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

        const newIndex = isSessionComplete ? session.cards.length : Math.min(nextProgressIndex, maxIndex);
        setCurrentIndex(newIndex);
        currentIndexRef.current = newIndex;

        if (isSessionComplete) {
          await finalizeSession();
        }

        undoStackRef.current.push(undoEntry);
        setUndoCount(undoStackRef.current.length);
        translateX.setValue(0);
      } catch (error) {
        console.warn('Failed to record flashcard swipe', error);
        Alert.alert('Could not record swipe', 'Please try again.');
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

  useEffect(() => {
    recordSwipeRef.current = recordSwipe;
  }, [recordSwipe]);

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

  return {
    panResponder,
    rotation,
    frontRotation,
    backRotation,
    handleFlip,
    handlePlayAudio,
    isSpeaking,
    handleToggleFlag,
    handleUndo,
    canUndo,
    frontText,
    backText,
    card,
    isComplete,
    progressLabel,
    outcomes,
    completedCorrect,
    completedIncorrect,
    summaryTotal,
    handleReviewMissed,
    handleReviewAll,
    handleExitActivity,
  };
};
