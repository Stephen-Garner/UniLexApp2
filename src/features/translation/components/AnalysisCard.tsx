import React from 'react';
import { Pressable, Text, View } from 'react-native';
import MiniChat from '@/features/translation/components/MiniChat';
import type { AnalysisState } from '@/features/translation/types';
import type { MiniChatController } from '@/features/translation/hooks/useMiniChat';

type Props = {
  analysis: AnalysisState | null;
  onNext: () => void;
  onAddNote: () => void;
  onFlag: () => void;
  miniChat: MiniChatController;
  onMiniChatSend: () => void;
  onMiniChatExpand: () => void;
  colors: any;
  styles: any;
};

const AnalysisCard: React.FC<Props> = ({
  analysis,
  onNext,
  onAddNote,
  onFlag,
  miniChat,
  onMiniChatSend,
  onMiniChatExpand,
  colors,
  styles,
}) => {
  if (!analysis) {
    return (
      <View style={[styles.analysisCard, styles.centerContent]}>
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Submit an answer to view feedback.</Text>
      </View>
    );
  }

  return (
    <View style={[styles.analysisCard, { backgroundColor: colors.background }]}>
      <Text style={styles.analysisHeadline}>Feedback</Text>
      <Text style={styles.analysisPrompt}>{analysis.item.nativeText}</Text>
      <Text style={[styles.analysisLabel, { color: colors.textSecondary }]}>Your answer</Text>
      <Text style={styles.analysisAnswer}>{analysis.learnerAnswer}</Text>
      <Text style={[styles.analysisLabel, { color: colors.textSecondary }]}>Tutor insight</Text>
      <Text style={styles.analysisFeedback}>{analysis.evaluation.feedback}</Text>
      <View style={styles.analysisActions}>
        <Pressable style={styles.secondaryButton} onPress={onAddNote}>
          <Text style={[styles.secondaryButtonLabel, { color: colors.accent }]}>Add to notes</Text>
        </Pressable>
        <Pressable style={styles.secondaryButton} onPress={onFlag}>
          <Text style={[styles.secondaryButtonLabel, { color: colors.accent }]}>
            {analysis.item.isFlagged ? 'Flagged' : 'Flag for review'}
          </Text>
        </Pressable>
      </View>
      <MiniChat
        messages={miniChat.messages}
        input={miniChat.input}
        onChangeInput={miniChat.setInput}
        onSend={onMiniChatSend}
        onExpand={onMiniChatExpand}
        colors={colors}
        styles={styles}
      />
      <Pressable
        style={[
          styles.primaryButton,
          styles.fullWidthButton,
          styles.buttonTopMargin,
          { backgroundColor: colors.accent },
        ]}
        onPress={onNext}
      >
        <Text style={styles.primaryButtonLabel}>Next question</Text>
      </Pressable>
    </View>
  );
};

export default AnalysisCard;
