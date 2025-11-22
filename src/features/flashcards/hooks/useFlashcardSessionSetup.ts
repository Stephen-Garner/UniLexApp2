import { useState } from 'react';

export const useFlashcardSessionSetup = (activeProfile: any) => {
  const [stylePreset, setStylePreset] = useState('visual');
  const [reviewMode, setReviewMode] = useState('srs');
  const [questionCount, setQuestionCount] = useState(10);
  const [topicInput, setTopicInput] = useState('');
  const [presentationSide, setPresentationSide] = useState('term');
  const [isSwitcherVisible, setIsSwitcherVisible] = useState(false);
  const [sessionModalVisible, setSessionModalVisible] = useState(false);
  const [modalSessionId, setModalSessionId] = useState<string | null>(null);
  const [unfinishedSession, setUnfinishedSession] = useState<any>(null);

  const handleGenerateSession = () => {
    // This is a mock implementation
    setModalSessionId('mock-session-id');
    setSessionModalVisible(true);
  };

  const dismissModal = () => {
    setSessionModalVisible(false);
    setModalSessionId(null);
  };

  return {
    stylePreset,
    setStylePreset,
    reviewMode,
    setReviewMode,
    questionCount,
    setQuestionCount,
    topicInput,
    setTopicInput,
    presentationSide,
    setPresentationSide,
    isSwitcherVisible,
    setIsSwitcherVisible,
    sessionModalVisible,
    modalSessionId,
    unfinishedSession,
    handleGenerateSession,
    dismissModal,
  };
};
