import React from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import type { MiniChatMessage } from '@/features/translation/hooks/useMiniChat';

type Props = {
  messages: MiniChatMessage[];
  input: string;
  onChangeInput: (value: string) => void;
  onSend: () => void;
  onExpand: () => void;
  colors: {
    textSecondary: string;
    border: string;
    textPrimary: string;
    accent: string;
  };
  styles: {
    miniChatBox: object;
    miniChatHeader: object;
    miniChatTitle: object;
    miniChatExpandHint: object;
    miniChatMessages: object;
    miniChatBubble: object;
    miniChatBubbleUser: object;
    miniChatBubbleAssistant: object;
    miniChatText: object;
    miniChatInputRow: object;
    miniChatInput: object;
    primaryButton: object;
    primaryButtonLabel: object;
  };
};

const MiniChat: React.FC<Props> = ({
  messages,
  input,
  onChangeInput,
  onSend,
  onExpand,
  colors,
  styles,
}) => (
  <View style={styles.miniChatBox}>
    <Pressable style={styles.miniChatHeader} onPress={onExpand}>
      <Text style={styles.miniChatTitle}>Ask the tutor</Text>
      <Text style={styles.miniChatExpandHint}>Expand</Text>
    </Pressable>
    <ScrollView style={styles.miniChatMessages}>
      {messages.map(message => (
        <View
          key={message.id}
          style={[
            styles.miniChatBubble,
            message.role === 'user' ? styles.miniChatBubbleUser : styles.miniChatBubbleAssistant,
          ]}
        >
          <Text style={styles.miniChatText}>{message.text}</Text>
        </View>
      ))}
    </ScrollView>
    <View style={styles.miniChatInputRow}>
      <TextInput
        value={input}
        onChangeText={onChangeInput}
        placeholder="Ask why, request clarifications…"
        placeholderTextColor={colors.textSecondary}
        style={[styles.miniChatInput, { borderColor: colors.border, color: colors.textPrimary }]}
      />
      <Pressable style={styles.primaryButton} onPress={onSend}>
        <Text style={styles.primaryButtonLabel}>Send</Text>
      </Pressable>
    </View>
  </View>
);

export default MiniChat;
