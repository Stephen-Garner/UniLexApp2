import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import ScreenHeader from '@/shared/components/ScreenHeader';
import ScreenContainer from '@/shared/components/ScreenContainer';
import { spacing, radii, typography, shadows, fontFamilies } from '@/shared/theme/tokens';
import type { MainTabsParamList, RootStackParamList } from '@/navigation/types';
import { useTheme, type ThemeColors } from '@/shared/theme/theme';
import { useThemeStyles } from '@/shared/theme/useThemeStyles';

type ActivitiesNavigation = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabsParamList, 'Activities'>,
  NativeStackNavigationProp<RootStackParamList>
>;

const sessionDurations = [
  { id: '5', label: '5 minutes', description: 'Micro refresh' },
  { id: '10', label: '10 minutes', description: 'Focused boost' },
  { id: '20', label: '20 minutes', description: 'Deep dive' },
  { id: '60', label: '60 minutes', description: 'Immersion block' },
] as const;

const activities = [
  {
    id: 'translation',
    title: 'Translation Practice',
    bullets: [
      'Translate between native and target.',
      'AI highlights literal vs. natural choices.',
      'Difficulty adjusts with idioms and collocations.',
    ],
  },
  {
    id: 'flashcards',
    title: 'Flashcard Training',
    bullets: [
      'Interactive cards with audio and visuals.',
      'Tracks SM-2 spaced repetition difficulty.',
      'Example sentences + pronunciation cues.',
    ],
  },
  {
    id: 'writing',
    title: 'Writing Prompts',
    bullets: [
      'Respond to adaptive AI prompts.',
      'Feedback on grammar, structure, fluency.',
      'Iterate quickly with inline scoring.',
    ],
  },
  {
    id: 'games',
    title: 'Language Games',
    bullets: [
      'Error Spotter · Rapid Translation · Word Match.',
      'Quick Listen & Tap · Say It Like a Local.',
      'Dynamic difficulty keeps flow engaging.',
    ],
  },
  {
    id: 'pronunciation',
    title: 'Pronunciation Practice',
    bullets: [
      'Compare waveforms with native audio.',
      'AI phoneme scoring for clarity, rhythm, intonation.',
      'Retry loop until pronunciation feels right.',
    ],
  },
  {
    id: 'comprehension',
    title: 'Comprehension Practice',
    bullets: [
      'Offline TTS audio with adjustable speed.',
      'Tasks: transcription, Q&A, summaries.',
      'Pulls relevant native YouTube clips when online.',
    ],
  },
  {
    id: 'culture',
    title: 'Cultural Immersion Capsule',
    bullets: [
      'Daily authentic tweets, memes, headlines.',
      'Interpret tone, idioms, cultural signals.',
      'Reflect with AI-guided comparisons.',
    ],
  },
  {
    id: 'speaking',
    title: 'Spontaneous Speaking Prompts',
    bullets: [
      'Randomized CEFR-level prompts.',
      '2-minute recordings with AI scoring.',
      'Store transcripts + audio for trend tracking.',
    ],
  },
  {
    id: 'adaptive',
    title: 'Adaptive Review',
    bullets: [
      'Mixed-skill quizzes reinforce weak spots.',
      'Blends SRS due cards with error memory.',
      'Sends recall pings when mastery dips.',
    ],
  },
] as const;

const ActivitiesScreen: React.FC = () => {
  const navigation = useNavigation<ActivitiesNavigation>();
  const styles = useThemeStyles(createStyles);
  const { mode } = useTheme();
  const [isSessionSheetOpen, setIsSessionSheetOpen] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState('10');

  return (
    <ScreenContainer style={styles.screen}>
      <ScreenHeader
        title="Activities"
        onProfilePress={() => navigation.navigate('Settings')}
      />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {activities.map(activity => {
          const isTranslation = activity.id === 'translation';
          const isFlashcards = activity.id === 'flashcards';
          const isPrimary = isTranslation || isFlashcards;
          const handlePress = () => {
            if (isTranslation) {
              navigation.navigate('TranslationPractice');
              return;
            }
            if (isFlashcards) {
              navigation.navigate('FlashcardTraining');
              return;
            }
          };
          return (
            <View key={activity.id} style={styles.activityCard}>
              {isTranslation ? (
                <Image
                  source={require('../../../../assets/icons/translate-2.png')}
                  style={[
                    styles.activityIcon,
                    mode === 'dark' ? styles.activityIconDark : styles.activityIconLight,
                  ]}
                />
              ) : (
                <View style={styles.activityBadge} />
              )}
              <View style={styles.activityContent}>
                <Text style={styles.activityTitle}>{activity.title}</Text>
                {activity.bullets.map(point => (
                  <Text key={point} style={styles.activityBullet}>
                    • {point}
                  </Text>
                ))}
              </View>
              <Pressable
                style={({ pressed }) => [
                  isPrimary ? styles.activityPrimaryAction : styles.activityAction,
                  pressed && styles.activityActionPressed,
                ]}
                onPress={handlePress}
              >
                <Text
                  style={isPrimary ? styles.activityPrimaryActionLabel : styles.activityActionLabel}
                >
                  {isPrimary ? 'Begin activity' : 'Preview'}
                </Text>
              </Pressable>
            </View>
          );
        })}
      </ScrollView>

      <Modal
        transparent
        animationType="slide"
        visible={isSessionSheetOpen}
        onRequestClose={() => setIsSessionSheetOpen(false)}
      >
        <Pressable
          style={styles.sheetOverlay}
          onPress={() => setIsSessionSheetOpen(false)}
        >
          <Pressable
            style={styles.sheet}
            onPress={event => event.stopPropagation()}
          >
            <Text style={styles.sheetTitle}>Session length</Text>
            <Text style={styles.sheetSubtitle}>
              UniLex uses your streak, SRS due cards, and recent errors to pace the plan.
            </Text>
            {sessionDurations.map(duration => (
              <Pressable
                key={duration.id}
                onPress={() => {
                  setSelectedDuration(duration.label.split(' ')[0]);
                  setIsSessionSheetOpen(false);
                }}
                style={({ pressed }) => [
                  styles.durationRow,
                  selectedDuration === duration.label.split(' ')[0] &&
                    styles.durationRowActive,
                  pressed && styles.durationRowPressed,
                ]}
              >
                <Text style={styles.durationLabel}>{duration.label}</Text>
                <Text style={styles.durationDescription}>{duration.description}</Text>
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </ScreenContainer>
  );
};

export default ActivitiesScreen;

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      paddingHorizontal: spacing.screenHorizontal,
      paddingBottom: spacing.block * 2,
      gap: 20,
    },
    sessionCard: {
      backgroundColor: colors.surface,
      borderRadius: radii.surface,
      padding: 20,
      gap: 16,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      ...shadows.card,
    },
    sessionHeader: {
      gap: 4,
    },
    sessionTitle: {
      ...typography.subhead,
      color: colors.textPrimary,
    },
    sessionSubtitle: {
      ...typography.caption,
      color: colors.textSecondary,
      marginTop: 4,
    },
    sessionButton: {
      alignSelf: 'flex-start',
      borderRadius: radii.control,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      paddingVertical: 10,
      paddingHorizontal: 16,
      backgroundColor: colors.surface,
    },
    sessionButtonPressed: {
      backgroundColor: colors.surfaceMuted,
    },
    sessionButtonLabel: {
      ...typography.captionStrong,
      color: colors.textPrimary,
    },
    sessionSelected: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    activityCard: {
      borderRadius: radii.surface,
      backgroundColor: colors.surface,
      padding: 20,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      ...shadows.card,
    },
    activityBadge: {
      width: 44,
      height: 44,
      borderRadius: 22,
      borderWidth: 2,
      borderColor: colors.accent,
    },
    activityIcon: {
      width: 44,
      height: 44,
      resizeMode: 'contain',
    },
    activityIconLight: {},
    activityIconDark: {
      tintColor: '#FFFFFF',
    },
    activityContent: {
      flex: 1,
      gap: 6,
    },
    activityTitle: {
      fontSize: 18,
      lineHeight: 24,
      fontFamily: fontFamilies.sans.semibold,
      color: colors.textPrimary,
    },
    activityBullet: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    activityAction: {
      alignSelf: 'flex-start',
      borderRadius: radii.control,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      paddingHorizontal: 16,
      paddingVertical: 8,
      backgroundColor: colors.surface,
    },
    activityPrimaryAction: {
      alignSelf: 'flex-start',
      borderRadius: radii.control,
      paddingHorizontal: 18,
      paddingVertical: 10,
      backgroundColor: colors.accent,
    },
    activityActionPressed: {
      backgroundColor: colors.surfaceMuted,
    },
    activityActionLabel: {
      ...typography.captionStrong,
      color: colors.textPrimary,
    },
    activityPrimaryActionLabel: {
      ...typography.captionStrong,
      color: '#FFFFFF',
      fontFamily: fontFamilies.sans.semibold,
    },
    sheetOverlay: {
      flex: 1,
      backgroundColor: colors.overlay,
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: colors.surface,
      padding: 24,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      gap: 16,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    sheetTitle: {
      ...typography.subhead,
      color: colors.textPrimary,
    },
    sheetSubtitle: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    durationRow: {
      borderRadius: radii.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      padding: 16,
      gap: 4,
      backgroundColor: colors.surface,
    },
    durationRowActive: {
      borderColor: colors.accent,
      backgroundColor: colors.surfaceMuted,
    },
    durationRowPressed: {
      backgroundColor: colors.surfaceMuted,
    },
    durationLabel: {
      ...typography.bodyStrong,
      color: colors.textPrimary,
    },
    durationDescription: {
      ...typography.caption,
      color: colors.textSecondary,
    },
  });
