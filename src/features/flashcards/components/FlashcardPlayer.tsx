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
import { useTheme, type ThemeMode } from '@/shared/theme/theme';
import { spacing, radii, typography, fontFamilies } from '@/shared/theme/tokens';
import {
  useFlashcardSessionStore,
  type FlashcardSessionState,
} from '../stores/flashcard-session.store';
import { useBankStore } from '@/state/bank.store';
import { resolveFlagGlyph } from '@/data/language-library';
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
import { buildRecap, computeOutcomes } from '@/features/flashcards/utils/session-metrics';
import SessionSummary from '@/features/flashcards/components/SessionSummary';
import { ActivityOutcome } from '@/contracts/models';

type FlashcardPlayerModalProps = {
    visible: boolean;
    sessionId: string | null;
    contentWidth: number;
    onClose: () => void;
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
    session: initialSession,
  }) => {
    const { colors, mode } = useTheme();
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

    const appendHistory = useFlashcardSessionStore(state => state.appendHistory);
    const setProgress = useFlashcardSessionStore(state => state.setProgress);
    const setRecap = useFlashcardSessionStore(state => state.setRecap);
    const toggleFlagged = useFlashcardSessionStore(state => state.toggleFlagged);
    const popHistory = useFlashcardSessionStore(state => state.popHistory);
    const saveSession = useFlashcardSessionStore(state => state.saveSession);
    const recordActivityOutcome = useBankStore(state => state.recordActivityOutcome);
    const updateSrsData = useBankStore(state => state.updateSrsData);
    const updatePerformanceData = useBankStore(state => state.updatePerformanceData);
    const clearSrsData = useBankStore(state => state.clearSrsData);
  
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
  
    // Keep the ref updated so handleSwipe can access the latest recordSwipe
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
            <Text style={[styles.counterLabel, styles.counterLabelDanger]}>{outcomes.incorrect}</Text>
            <Text style={styles.counterLabel}>{progressLabel}</Text>
            <Text style={[styles.counterLabel, styles.counterLabelSuccess]}>{outcomes.correct}</Text>
          </View>
  
          {isComplete ? (
            <SessionSummary
              completedCorrect={outcomes.correct}
              completedIncorrect={outcomes.incorrect}
              summaryTotal={summaryTotal}
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

export default FlashcardPlayerModal;
