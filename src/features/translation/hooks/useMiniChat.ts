import { useCallback, useState } from 'react';

export type MiniChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
};

export type MiniChatController = {
  messages: MiniChatMessage[];
  input: string;
  setInput: (value: string) => void;
  appendUserMessage: (text: string) => void;
  appendAssistantMessage: (text: string) => void;
  reset: () => void;
};

export const useMiniChat = (): MiniChatController => {
  const [messages, setMessages] = useState<MiniChatMessage[]>([]);
  const [input, setInput] = useState('');

  const appendUserMessage = useCallback((text: string) => {
    const payload = text.trim();
    if (!payload) {
      return;
    }
    const id = `mini-user-${Date.now()}`;
    setMessages(prev => [...prev, { id, role: 'user', text: payload }]);
  }, []);

  const appendAssistantMessage = useCallback((text: string) => {
    const id = `mini-assistant-${Date.now()}`;
    setMessages(prev => [...prev, { id, role: 'assistant', text }]);
  }, []);

  const reset = useCallback(() => {
    setMessages([]);
    setInput('');
  }, []);

  return {
    messages,
    input,
    setInput,
    appendUserMessage,
    appendAssistantMessage,
    reset,
  };
};

export default useMiniChat;
