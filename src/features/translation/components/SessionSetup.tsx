import React from 'react';
import { View, Text, Pressable, TextInput, StyleSheet } from 'react-native';
import { useTheme } from '@/shared/theme/theme';
import { typography, spacing, radii } from '@/shared/theme/tokens';
import { DiscreteSlider } from '@/features/flashcards/components'; 

const FORMALITY_OPTIONS = [
  { key: 'formal', label: 'Formal' },
  { key: 'balanced', label: 'Balanced' },
  { key: 'informal', label: 'Informal' },
];

const REVIEW_MODES = [
  { label: 'Review only', value: 'review_only', description: 'Only saved vocab' },
  { label: 'Mix 50/50', value: 'mixed', description: 'Half review · Half new' },
  { label: 'New only', value: 'new_only', description: 'Newest bank words + AI' },
];

const PRESENTATION_OPTIONS = [
  { label: 'Term first', value: 'term' },
  { label: 'Definition first', value: 'definition' },
];

const QUESTION_MIN = 5;
const QUESTION_MAX = 25;

export const SessionSetup = ({
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
  handleGenerateSession,
  unfinishedSession,
}) => {
  const { colors, mode } = useTheme();
  const styles = createStyles(colors, mode);

  const reviewModeIndex = REVIEW_MODES.findIndex(option => option.value === reviewMode);

  return (
    <View style={[styles.cardFull, { backgroundColor: colors.background }]}>
      <Text style={styles.cardTitle}>Session setup</Text>
      <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
        Match Quizlet-style flashcards to your level: decide the mix, tone, and how many cards
        to train.
      </Text>

      <Text style={styles.sectionLabel}>Formality presets</Text>
      <DiscreteSlider
        min={0}
        max={FORMALITY_OPTIONS.length - 1}
        step={1}
        value={FORMALITY_OPTIONS.findIndex(option => option.key === stylePreset)}
        onChange={index => {
          const resolved = FORMALITY_OPTIONS[index]?.key ?? 'balanced';
          setStylePreset(resolved);
        }}
        markers={FORMALITY_OPTIONS.map((option, idx) => ({ value: idx, label: option.label }))}
      />

      <Text style={styles.sectionLabel}>Review mix</Text>
      <DiscreteSlider
        min={0}
        max={REVIEW_MODES.length - 1}
        step={1}
        value={reviewModeIndex < 0 ? 1 : reviewModeIndex}
        onChange={index => {
          const resolved = REVIEW_MODES[index]?.value ?? 'mixed';
          setReviewMode(resolved);
        }}
        markers={REVIEW_MODES.map((option, idx) => ({ value: idx, label: option.label }))}
      />
      <Text style={[styles.chipSubtext, { color: colors.textSecondary }]}>
        {REVIEW_MODES[reviewModeIndex]?.description ?? 'Blend review with AI-curated picks.'}
      </Text>

      <Text style={styles.sectionLabel}>Show first</Text>
      <View style={styles.toggleRow}>
        {PRESENTATION_OPTIONS.map(option => {
          const isSelected = presentationSide === option.value;
          return (
            <Pressable
              key={option.value}
              onPress={() => setPresentationSide(option.value)}
              style={[
                styles.togglePill,
                {
                  backgroundColor: isSelected ? colors.accent : colors.surface,
                  borderColor: isSelected ? colors.accent : colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.togglePillText,
                  { color: isSelected ? colors.textOnAccent : colors.textPrimary },
                ]}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.sliderHeaderRow}>
        <Text style={styles.sectionLabel}>How many cards?</Text>
        <Text style={styles.sliderValueLabel}>{questionCount} words</Text>
      </View>
      <DiscreteSlider
        min={QUESTION_MIN}
        max={QUESTION_MAX}
        step={1}
        value={questionCount}
        onChange={setQuestionCount}
        markers={[
          { value: QUESTION_MIN, label: `${QUESTION_MIN}` },
          { value: Math.round((QUESTION_MIN + QUESTION_MAX) / 2), label: '·' },
          { value: QUESTION_MAX, label: `${QUESTION_MAX}` },
        ]}
      />

      <Text style={styles.sectionLabel}>Optional topics</Text>
      <TextInput
        value={topicInput}
        onChangeText={setTopicInput}
        placeholder="e.g. travel, dining, work slang"
        placeholderTextColor={colors.textSecondary}
        style={[
          styles.topicInput,
          {
            borderColor: colors.border,
            color: colors.textPrimary,
            backgroundColor: mode === 'dark' ? colors.surfaceMuted : colors.surface,
          },
        ]}
      />

      <Pressable
        onPress={handleGenerateSession}
        style={[styles.primaryButton, styles.buttonTopMargin, { backgroundColor: colors.accent }]}
      >
        <Text style={styles.primaryButtonLabel}>Generate session</Text>
      </Pressable>

      {unfinishedSession ? (
        <Pressable
          onPress={() => {
            // handle continue last session
          }}
          style={[
            styles.secondaryButton,
            { borderColor: colors.accent, backgroundColor: colors.accentSoft },
          ]}
        >
          <Text style={[styles.secondaryButtonLabel, { color: colors.accent }]}>
            Continue last session
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
};

const createStyles = (colors, mode) => StyleSheet.create({
    cardFull: {
        borderRadius: radii.surface,
        paddingHorizontal: spacing.block,
        paddingVertical: spacing.block,
        gap: spacing.base,
    },
    cardTitle: {
        ...typography.title,
        fontFamily: 'serif',
        color: colors.textPrimary,
    },
    cardSubtitle: {
        ...typography.body,
        color: colors.textSecondary,
    },
    sectionLabel: {
        ...typography.subhead,
        fontFamily: 'sans-serif-medium',
        color: colors.textPrimary,
    },
    chipSubtext: {
        ...typography.caption,
        color: colors.textSecondary,
    },
    sliderHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    sliderValueLabel: {
        ...typography.caption,
        color: colors.textSecondary,
    },
    topicInput: {
        borderWidth: 1,
        borderRadius: radii.control,
        paddingHorizontal: spacing.base,
        paddingVertical: spacing.base * 0.75,
        ...typography.body,
    },
    primaryButton: {
        paddingVertical: spacing.base * 1.1,
        borderRadius: radii.pill,
        alignItems: 'center',
        justifyContent: 'center',
    },
    primaryButtonLabel: {
        ...typography.bodyStrong,
        color: colors.textOnAccent,
        fontFamily: 'sans-serif-medium',
    },
    secondaryButton: {
        paddingVertical: spacing.base * 1.1,
        borderRadius: radii.pill,
        borderWidth: 1.5,
        alignItems: 'center',
        justifyContent: 'center',
    },
    secondaryButtonLabel: {
        ...typography.bodyStrong,
        color: colors.textPrimary,
        fontFamily: 'sans-serif-medium',
    },
    buttonTopMargin: {
        marginTop: spacing.base,
    },
    toggleRow: {
        flexDirection: 'row',
        gap: spacing.base,
    },
    togglePill: {
        flex: 1,
        borderRadius: radii.pill,
        paddingVertical: spacing.base * 0.6,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1.5,
    },
    togglePillText: {
        ...typography.bodyStrong,
        fontFamily: 'sans-serif-medium',
    },
});

export default SessionSetup;