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
}) => (
  <View style={[styles.promptCard, { backgroundColor: colors.background }]}>
    <Text style={[styles.promptLabel, { color: colors.textSecondary }]}>Prompt</Text>
    <Text style={styles.promptText}>{item.nativeText}</Text>
    {item.context ? (
      <Text style={[styles.promptContext, { color: colors.textSecondary }]}>{item.context}</Text>
    ) : null}
    {highlightTerm ? <Text style={styles.highlightTerm}>{highlightTerm}</Text> : null}
    <View style={styles.answerBox}>
      <TextInput
        value={answer}
        onChangeText={onChangeAnswer}
        placeholder="Compose your translation…"
        placeholderTextColor={colors.textSecondary}
        multiline
        editable={!disabled}
        style={[
          styles.answerInput,
          {
            borderColor: colors.border,
            color: colors.textPrimary,
            backgroundColor: mode === 'dark' ? colors.surfaceMuted : colors.surface,
          },
        ]}
      />
      <Text style={[styles.answerHint, { color: colors.textSecondary }]}>Keep it concise yet expressive.</Text>
    </View>
    <Pressable
      disabled={disabled}
      style={[
        styles.primaryButton,
        styles.fullWidthButton,
        disabled && styles.buttonDisabled,
        { backgroundColor: disabled ? colors.surfaceMuted : colors.accent },
      ]}
      onPress={onSubmit}
    >
      <Text style={styles.primaryButtonLabel}>{disabled ? 'Scoring…' : 'Submit translation'}</Text>
    </Pressable>
  </View>
);

export default PromptCard;
