import React from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Animated } from 'react-native';
import { useTheme } from '@/shared/theme/theme';
import { spacing, radii, typography, fontFamilies, shadows } from '@/shared/theme/tokens';

const TranslationPractice = ({
  card,
  isFlipped,
  isSpeaking,
  userAnswer,
  setUserAnswer,
  showResult,
  isCorrect,
  handlePlayAudio,
  handleCheckAnswer,
  handleNextCard,
  currentIndex,
  totalCards,
}) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const flipAnim = React.useRef(new Animated.Value(0)).current;
  const frontRotation = flipAnim.interpolate({
    inputRange: [0, 180],
    outputRange: ['0deg', '180deg'],
  });
  const backRotation = flipAnim.interpolate({
    inputRange: [0, 180],
    outputRange: ['180deg', '360deg'],
  });

  return (
    <View style={styles.container}>
      <View style={styles.cardContainer}>
        <Animated.View style={[styles.card, { transform: [{ rotateY: isFlipped ? backRotation : frontRotation }] }]}>
          <Pressable onPress={() => { /* Not implemented yet, this is for flipping */ }}>
            <Text style={styles.cardText}>{isFlipped ? card.definition : card.term}</Text>
          </Pressable>
        </Animated.View>
      </View>
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Type your translation"
          value={userAnswer}
          onChangeText={setUserAnswer}
          onSubmitEditing={handleCheckAnswer}
          editable={!showResult}
        />
        <Pressable
          onPress={handleCheckAnswer}
          style={[styles.button, styles.checkButton]}
          disabled={showResult}
        >
          <Text style={styles.buttonText}>Check</Text>
        </Pressable>
        <Pressable
          onPress={handleNextCard}
          style={[styles.button, styles.nextButton]}
          disabled={!showResult}
        >
          <Text style={styles.buttonText}>Next</Text>
        </Pressable>
      </View>
    </View>
  );
};

const createStyles = (colors) => StyleSheet.create({
    container: {
        flex: 1,
        padding: spacing.screenHorizontal,
        backgroundColor: colors.background,
    },
    cardContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    card: {
        width: '90%',
        aspectRatio: 3 / 2,
        backgroundColor: colors.surface,
        borderRadius: radii.surface,
        justifyContent: 'center',
        alignItems: 'center',
        ...shadows.card,
    },
    cardText: {
        fontSize: typography.title.fontSize,
        fontFamily: fontFamilies.sans.regular,
        color: colors.textPrimary,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: spacing.xl,
    },
    input: {
        flex: 1,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radii.control,
        padding: spacing.base,
        marginRight: spacing.base,
        fontSize: typography.body.fontSize,
        color: colors.textPrimary,
    },
    button: {
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.base,
        borderRadius: radii.control,
    },
    checkButton: {
        backgroundColor: colors.accent,
    },
    nextButton: {
        backgroundColor: colors.success,
    },
    buttonText: {
        fontSize: typography.body.fontSize,
        color: colors.textOnAccent,
    },
});


export default TranslationPractice;