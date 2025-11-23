import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Animated, PanResponder, useWindowDimensions } from 'react-native';
import { ttsService } from '@/services/container';
import type { FtxCard, FtxSession, FlashcardOutcome } from '@/contracts/models';
import { useFlashcardSessionStore } from '@/features/flashcards/stores/flashcard-session.store';

type useTranslationPlayerProps = {
  session: FtxSession;
};

export const useTranslationPlayer = ({ session }: useTranslationPlayerProps) => {
  const { width: contentWidth } = useWindowDimensions();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [userAnswer, setUserAnswer] = useState('');
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);

  const { appendHistory, setProgress } = useFlashcardSessionStore();

  const translateX = useRef(new Animated.Value(0)).current;
  const flipAnim = useRef(new Animated.Value(0)).current;
  
  const card = session.cards[currentIndex];

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
  
  const handleCheckAnswer = () => {
    const isAnswerCorrect = userAnswer.trim().toLowerCase() === card.definition.trim().toLowerCase();
    setIsCorrect(isAnswerCorrect);
    setShowResult(true);
  };
  
  const handleNextCard = () => {
    const outcome: FlashcardOutcome = isCorrect ? 'correct' : 'incorrect';
    appendHistory({
        sessionId: session.sessionId,
        cardId: card.cardId,
        outcome,
      });

    if (currentIndex < session.cards.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setUserAnswer('');
      setShowResult(false);
      setIsCorrect(false);
      setIsFlipped(false);
      translateX.setValue(0);
    } else {
      // Session finished
      setProgress(session.sessionId, {
          currentIndex: session.cards.length,
          isComplete: true,
          lastOpenedAt: new Date().toISOString(),
        });
    }
  };


  return {
    card,
    isFlipped,
    isSpeaking,
    userAnswer,
    setUserAnswer,
    showResult,
    isCorrect,
    handlePlayAudio,
    handleCheckAnswer,
    handleNextCard,
    currentIndex,
    totalCards: session.cards.length,
  };
};
