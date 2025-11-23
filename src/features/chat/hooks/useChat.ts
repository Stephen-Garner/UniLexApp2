import { useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useNavigation } from '@react-navigation/native';

export const useChat = () => {
  const navigation = useNavigation();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(true);

  const isFirstMessage = messages.length === 0;

  const addMessage = (message) => {
    setMessages((prevMessages) => [...prevMessages, message]);
  };

  const handleSend = useCallback(async () => {
    if (newMessage.trim() === '') {
      return;
    }
    const userMessage = {
      id: uuidv4(),
      text: newMessage,
      isUser: true,
      timestamp: new Date().toISOString(),
    };
    addMessage(userMessage);
    setNewMessage('');
    setIsSending(true);
    // TODO: Implement the logic to send the message to the backend
    // and receive the response.
    // For now, we'll just simulate a response.
    setTimeout(() => {
      const botResponse = {
        id: uuidv4(),
        text: `I'm a bot. I received your message: "${newMessage}"`,
        isUser: false,
        timestamp: new Date().toISOString(),
      };
      addMessage(botResponse);
      setIsSending(false);
    }, 1000);
  }, [newMessage, addMessage]);

  const handleRecord = useCallback(() => {
    setIsRecording(!isRecording);
    // TODO: Implement the logic to start/stop recording audio.
  }, [isRecording]);

  const handleTyping = useCallback(() => {
    setIsTyping(!isTyping);
  }, [isTyping]);

  const handleCloseOnboarding = useCallback(() => {
    setShowOnboarding(false);
  }, []);

  return {
    messages,
    newMessage,
    setNewMessage,
    isSending,
    isRecording,
    isTyping,
    isFirstMessage,
    showOnboarding,
    handleSend,
    handleRecord,
    handleTyping,
    handleCloseOnboarding,
  };
};