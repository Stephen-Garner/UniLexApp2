import { useFlashcardSessionStore } from '@/state/flashcard-session.store';
import { computeOutcomes } from '@/features/flashcards/utils/session-metrics';
import type { FtxSession, FtxCard } from '@/contracts/models';

// Mock storage service
jest.mock('@/services/storage-service', () => ({
  storageService: {
    getItem: jest.fn().mockResolvedValue(null),
    setItem: jest.fn().mockResolvedValue(undefined),
    removeItem: jest.fn().mockResolvedValue(undefined),
  },
}));

describe('FlashcardReviewMissed', () => {
  beforeEach(() => {
    // Clear the store before each test
    useFlashcardSessionStore.setState({
      sessions: {},
      isLoaded: true,
      isLoading: false,
      error: undefined,
    });
  });

  const createMockSession = (cardCount: number): FtxSession => ({
    sessionId: 'test-session-1',
    profileId: 'test-profile',
    createdAt: new Date().toISOString(),
    nativeLanguage: 'en',
    targetLanguage: 'es',
    targetRegion: 'mx',
    difficulty: 'intermediate',
    reviewMode: 'mixed',
    questionCount: cardCount,
    topicTags: [],
    presentationSide: 'term',
    cards: Array.from({ length: cardCount }, (_, i) => ({
      cardId: `card-${i + 1}`,
      term: `term-${i + 1}`,
      definition: `definition-${i + 1}`,
      example: null,
      vocabId: `vocab-${i + 1}`,
      isFlagged: false,
      history: [],
    })),
    progress: {
      currentIndex: 0,
      isComplete: false,
      lastOpenedAt: new Date().toISOString(),
    },
    recap: null,
  });

  it('should correctly track history through appendHistory', async () => {
    const session = createMockSession(5);
    const { saveSession, appendHistory } = useFlashcardSessionStore.getState();

    // Save initial session
    await saveSession(session);

    // Simulate swipes: 3 correct, 2 incorrect
    await appendHistory({ sessionId: session.sessionId, cardId: 'card-1', outcome: 'correct' });
    await appendHistory({ sessionId: session.sessionId, cardId: 'card-2', outcome: 'incorrect' });
    await appendHistory({ sessionId: session.sessionId, cardId: 'card-3', outcome: 'correct' });
    await appendHistory({ sessionId: session.sessionId, cardId: 'card-4', outcome: 'incorrect' });
    await appendHistory({ sessionId: session.sessionId, cardId: 'card-5', outcome: 'correct' });

    // Get the updated session from the store
    const updatedSession = useFlashcardSessionStore.getState().sessions[session.sessionId];

    // Check that history was recorded
    expect(updatedSession.cards[0].history).toHaveLength(1);
    expect(updatedSession.cards[0].history[0].outcome).toBe('correct');
    expect(updatedSession.cards[1].history).toHaveLength(1);
    expect(updatedSession.cards[1].history[0].outcome).toBe('incorrect');

    // Check outcomes match expected
    const outcomes = computeOutcomes(updatedSession.cards);
    expect(outcomes.correct).toBe(3);
    expect(outcomes.incorrect).toBe(2);

    // Check the filter logic used by handleReviewMissed
    const missedCards = updatedSession.cards.filter(candidate => {
      const lastEntry = candidate.history[candidate.history.length - 1];
      return lastEntry?.outcome === 'incorrect';
    });

    expect(missedCards).toHaveLength(2);
    expect(missedCards.map(c => c.cardId)).toEqual(['card-2', 'card-4']);
  });

  it('should preserve history when setProgress is called', async () => {
    const session = createMockSession(5);
    const { saveSession, appendHistory, setProgress } = useFlashcardSessionStore.getState();

    // Save initial session
    await saveSession(session);

    // Add some history
    await appendHistory({ sessionId: session.sessionId, cardId: 'card-1', outcome: 'correct' });
    await appendHistory({ sessionId: session.sessionId, cardId: 'card-2', outcome: 'incorrect' });

    // Update progress (this happens after each swipe)
    await setProgress(session.sessionId, {
      currentIndex: 2,
      isComplete: false,
      lastOpenedAt: new Date().toISOString(),
    });

    // Check history is preserved
    const updatedSession = useFlashcardSessionStore.getState().sessions[session.sessionId];
    expect(updatedSession.cards[0].history).toHaveLength(1);
    expect(updatedSession.cards[1].history).toHaveLength(1);
  });

  it('should preserve history when setRecap is called', async () => {
    const session = createMockSession(5);
    const { saveSession, appendHistory, setProgress, setRecap } = useFlashcardSessionStore.getState();

    // Save initial session
    await saveSession(session);

    // Add history
    await appendHistory({ sessionId: session.sessionId, cardId: 'card-1', outcome: 'correct' });
    await appendHistory({ sessionId: session.sessionId, cardId: 'card-2', outcome: 'incorrect' });
    await appendHistory({ sessionId: session.sessionId, cardId: 'card-3', outcome: 'correct' });
    await appendHistory({ sessionId: session.sessionId, cardId: 'card-4', outcome: 'correct' });
    await appendHistory({ sessionId: session.sessionId, cardId: 'card-5', outcome: 'correct' });

    // Update progress
    await setProgress(session.sessionId, {
      currentIndex: 5,
      isComplete: true,
      lastOpenedAt: new Date().toISOString(),
    });

    // Set recap (this happens when session completes)
    await setRecap(session.sessionId, {
      accuracy: 0.8,
      correctCount: 4,
      incorrectCount: 1,
      flaggedCardIds: [],
      srsQueue: [],
    });

    // Check history is preserved
    const updatedSession = useFlashcardSessionStore.getState().sessions[session.sessionId];
    expect(updatedSession.cards[0].history).toHaveLength(1);
    expect(updatedSession.cards[1].history).toHaveLength(1);
    expect(updatedSession.cards[2].history).toHaveLength(1);
    expect(updatedSession.cards[3].history).toHaveLength(1);
    expect(updatedSession.cards[4].history).toHaveLength(1);

    // Verify missed cards can still be found
    const missedCards = updatedSession.cards.filter(candidate => {
      const lastEntry = candidate.history[candidate.history.length - 1];
      return lastEntry?.outcome === 'incorrect';
    });
    expect(missedCards).toHaveLength(1);
  });

  it('should handle the complete flow: swipes -> progress -> recap -> review missed', async () => {
    const session = createMockSession(5);
    const { saveSession, appendHistory, setProgress, setRecap } = useFlashcardSessionStore.getState();

    // Save initial session
    await saveSession(session);

    // Simulate full session: swipe all cards with alternating outcomes
    const outcomes: Array<'correct' | 'incorrect'> = ['correct', 'incorrect', 'correct', 'incorrect', 'correct'];

    for (let i = 0; i < 5; i++) {
      await appendHistory({
        sessionId: session.sessionId,
        cardId: `card-${i + 1}`,
        outcome: outcomes[i]
      });

      const isComplete = i === 4;
      await setProgress(session.sessionId, {
        currentIndex: isComplete ? 5 : i + 1,
        isComplete,
        lastOpenedAt: new Date().toISOString(),
      });
    }

    // Set recap
    await setRecap(session.sessionId, {
      accuracy: 0.6,
      correctCount: 3,
      incorrectCount: 2,
      flaggedCardIds: [],
      srsQueue: [],
    });

    // Now simulate handleReviewMissed
    const currentSession = useFlashcardSessionStore.getState().sessions[session.sessionId];

    const missedCards = currentSession.cards.filter(candidate => {
      const lastEntry = candidate.history[candidate.history.length - 1];
      return lastEntry?.outcome === 'incorrect';
    });

    expect(missedCards).toHaveLength(2);
    expect(missedCards.map(c => c.cardId)).toEqual(['card-2', 'card-4']);
  });
});
