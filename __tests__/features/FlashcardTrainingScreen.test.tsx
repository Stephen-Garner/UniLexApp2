import React from 'react';
import { render, act, cleanup } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import FlashcardTrainingScreen from '@/features/flashcards/screens/FlashcardTrainingScreen';

jest.useFakeTimers();

jest.mock('@/features/flashcards/hooks', () => ({
  useLanguageProfile: () => ({
    activeProfile: {
      userId: 'test-user',
      nativeLanguage: 'en',
      targetLanguage: 'es',
      targetRegion: 'mx',
    },
    activeLanguageLabel: 'Spanish (Mexico)',
  }),
  useFlashcardSessionSetup: () => ({
    stylePreset: 'visual',
    setStylePreset: jest.fn(),
    reviewMode: 'srs',
    setReviewMode: jest.fn(),
    questionCount: 10,
    setQuestionCount: jest.fn(),
    topicInput: '',
    setTopicInput: jest.fn(),
    presentationSide: 'term',
    setPresentationSide: jest.fn(),
    isSwitcherVisible: false,
    setIsSwitcherVisible: jest.fn(),
    sessionModalVisible: false,
    modalSessionId: null,
    unfinishedSession: null,
    handleGenerateSession: jest.fn(),
    dismissModal: jest.fn(),
  }),
}));

describe.skip('FlashcardTrainingScreen', () => {
  afterEach(cleanup); // Clean up after each test

  it('renders correctly', async () => {
    let tree;
    await act(async () => {
      tree = render(
        <NavigationContainer>
          <FlashcardTrainingScreen />
        </NavigationContainer>
      );
      jest.runAllTimers();
    });
    expect(tree.toJSON()).toMatchSnapshot();
  });
});
