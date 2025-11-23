import React from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import type { TtxItem } from '@/contracts/models';

type Props = {
  item: TtxItem;
  colors: any;
  mode: 'light' | 'dark';
  answer: string;
  highlightTerm?: string | null;
  onChangeAnswer: (value: string) => void;
  disabled: boolean;
  onSubmit: () => void;
  styles: any;
};

const PromptCard: React.FC<Props> = ({
  item,
  colors,
  mode,
  answer,
  highlightTerm,
  onChangeAnswer,
  disabled,
  onSubmit,
  styles,
}) => {
  const renderHighlighted = (text: string, keyword?: string | null) => {
    if (!keyword) {
      return text;
    }
    const lower = text.toLowerCase();
    const needle = keyword.toLowerCase();
    const index = lower.indexOf(needle);
    if (index < 0) {
      return text;
    }
    return (
      <Text style={[styles.promptText, { color: colors.textPrimary }]}>
        {text.slice(0, index)}
        <Text style={styles.promptHighlight}>{text.slice(index, index + keyword.length)}</Text>
        {text.slice(index + keyword.length)}
      </Text>
    );
  };

  return (
    <View style={[styles.promptCard, { backgroundColor: colors.background }]}>
      {typeof item.nativeText === 'string' ? (
        renderHighlighted(item.nativeText, highlightTerm)
      ) : (
        <Text style={[styles.promptText, { color: colors.textPrimary }]}>{item.nativeText}</Text>
      )}
      {item.context ? (
        <Text style={[styles.promptContext, { color: colors.textSecondary }]}>{item.context}</Text>
      ) : null}
      <TextInput
        multiline
        value={answer}
        onChangeText={onChangeAnswer}
        placeholder="Type your translation…"
        placeholderTextColor={colors.textSecondary}
        style={[
          styles.answerField,
          {
            borderColor: colors.border,
            color: colors.textPrimary,
            backgroundColor: mode === 'dark' ? colors.surfaceMuted : colors.surface,
          },
        ]}
      />
      <Pressable
        onPress={onSubmit}
        disabled={disabled || answer.trim().length === 0}
        style={[
          styles.primaryButton,
          styles.fullWidthButton,
          styles.buttonTopMargin,
          {
            backgroundColor:
              disabled || answer.trim().length === 0 ? colors.surfaceMuted : colors.accent,
          },
        ]}
      >
        <Text style={styles.primaryButtonLabel}>{disabled ? 'Scoring…' : 'Submit translation'}</Text>
      </Pressable>
    </View>
  );
};

export default PromptCard;
