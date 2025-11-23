import React from 'react';
import { render, act, cleanup } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import TranslationPracticeScreen from '@/features/translation/screens/TranslationPracticeScreen';

jest.useFakeTimers();

jest.mock('@/features/translation/hooks/useTranslationSession', () => ({
  useTranslationSession: () => ({
    session: {
      sessionId: 'session-123',
      profileId: 'user-123',
      targetLanguage: 'es',
      nativeLanguage: 'en',
      stylePreset: 'visual',
      presentationSide: 'term',
      createdAt: new Date().toISOString(),
      cards: [
        {
          cardId: 'card-1',
          vocabId: 'vocab-1',
          term: 'Hola',
          definition: 'Hello',
          example: {
            sentence: 'Hola, como estas?',
            translation: 'Hello, how are you?',
            sourceName: 'test',
            sourceUrl: 'http://test.com',
          },
          history: [],
          isFlagged: false,
        },
      ],
      progress: {
        currentIndex: 0,
        isComplete: false,
        lastOpenedAt: new Date().toISOString(),
      },
      recap: null,
    },
    isLoading: false,
    error: null,
    generateSession: () => {},
  }),
}));



describe.skip('TranslationPracticeScreen', () => {
  afterEach(cleanup); // Clean up after each test

  it('renders correctly', async () => {
    const { toJSON } = render(
      <NavigationContainer>
        <TranslationPracticeScreen />
      </NavigationContainer>
    );
    await act(async () => {
      jest.runAllTimers();
    });
    expect(toJSON()).toMatchSnapshot();
  });
});
