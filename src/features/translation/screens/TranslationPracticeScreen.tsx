import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import ScreenContainer from '@/shared/components/ScreenContainer';
import { spacing, radii, typography, fontFamilies } from '@/shared/theme/tokens';
import { useTheme } from '@/shared/theme/theme';
import LanguageSwitcherModal from '@/shared/components/LanguageSwitcherModal';
import { useLanguageProfileStore } from '@/state/language-profile.store';
import { useTranslationSessionStore } from '@/state/translation-session.store';
import SessionPlayerModal from '@/features/translation/components/SessionPlayerModal';
import { useBankStore } from '@/state/bank.store';
import { useNotesStore } from '@/state/notes.store';
import { resolveFlagGlyph } from '@/data/language-library';
import { STYLE_PRESETS, type StylePresetKey } from '@/domain/translation/style-presets';
import { generateMockTranslationSession } from '@/domain/translation/mock-generator';
import type { ReviewMode, TtxSession } from '@/contracts/models';
import type { RootStackParamList } from '@/navigation/types';
import { DEFAULT_USER_ID } from '@/domain/user/constants';
import { calculateMasteryLevel } from '@/domain/srs/unified-srs-service';
import { useVocabActivityStore } from '@/state/vocab-activity.store';
import { ensureUuid, buildVocabPool } from '@/features/translation/utils/session-builder';

const QUESTION_MIN = 5;
const QUESTION_MAX = 25;

const REVIEW_MODES: Array<{ label: string; value: ReviewMode; description: string }> = [
  { label: 'Review only', value: 'review_only', description: 'Only saved vocab' },
  { label: 'Mix 50/50', value: 'mixed', description: 'Half review · Half new' },
  { label: 'New only', value: 'new_only', description: 'Newest bank words + AI' },
];

const FORMALITY_OPTIONS: Array<{ key: StylePresetKey; label: string }> = [
  { key: 'formal', label: 'Formal' },
  { key: 'balanced', label: 'Balanced' },
  { key: 'informal', label: 'Informal' },
];

type TranslationNavigation = NativeStackNavigationProp<RootStackParamList>;

const TranslationPracticeScreen: React.FC = () => {
  const navigation = useNavigation<TranslationNavigation>();
  const { colors, mode } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { width } = useWindowDimensions();
  const modalContentWidth = width;

  const {
    profiles,
    activeProfileId,
    isLoaded: profilesLoaded,
    loadProfiles,
    ensureProfile,
    appendSavedSession,
  } = useLanguageProfileStore();
  const sessions = useTranslationSessionStore(state => state.sessions);
  const loadSessions = useTranslationSessionStore(state => state.loadSessions);
  const saveSession = useTranslationSessionStore(state => state.saveSession);
  const appendHistory = useTranslationSessionStore(state => state.appendHistory);
  const setRecap = useTranslationSessionStore(state => state.setRecap);
  const setProgress = useTranslationSessionStore(state => state.setProgress);
  const toggleFlagged = useTranslationSessionStore(state => state.toggleFlagged);
  const markSessionOpened = useTranslationSessionStore(state => state.markSessionOpened);
  const bankItems = useBankStore(state => state.items);
  const loadBank = useBankStore(state => state.loadBank);
  const bankLoading = useBankStore(state => state.isLoading);
  const recordActivityOutcome = useBankStore(state => state.recordActivityOutcome);
  const addBankItem = useBankStore(state => state.addBankItem);
  const activityRecords = useVocabActivityStore(state => state.records);
  const loadActivityRecords = useVocabActivityStore(state => state.loadRecords);
  const appendActivityRecords = useVocabActivityStore(state => state.appendRecords);
  const createNote = useNotesStore(state => state.createNote);

  const [stylePreset, setStylePreset] = useState<StylePresetKey>('balanced');
  const [reviewMode, setReviewMode] = useState<ReviewMode>('mixed');
  const [questionCount, setQuestionCount] = useState(10);
  const [topicInput, setTopicInput] = useState('');
  const [isSwitcherVisible, setIsSwitcherVisible] = useState(false);
  const [sessionModalVisible, setSessionModalVisible] = useState(false);
  const [modalSessionId, setModalSessionId] = useState<string | null>(null);
  const [resumePromptShown, setResumePromptShown] = useState(false);
  const reviewModeIndex = REVIEW_MODES.findIndex(option => option.value === reviewMode);
  const eligibleBankItems = useMemo(() => {
    const MAX_ACTIVITIES_PER_WORD = 7;
    return bankItems.filter(item => {
      const mastery = calculateMasteryLevel(item);
      if (mastery !== null && mastery >= 0.8) {
        return false;
      }
      const historyCount =
        activityRecords[item.id]?.filter(record => record.type === 'translation').length ?? 0;
      return historyCount < MAX_ACTIVITIES_PER_WORD;
    });
  }, [bankItems, activityRecords]);

  useEffect(() => {
    loadProfiles().catch(() => undefined);
    loadSessions().catch(() => undefined);
    loadBank().catch(() => undefined);
    loadActivityRecords().catch(() => undefined);
  }, [loadProfiles, loadSessions, loadBank, loadActivityRecords]);

  const activeProfile = activeProfileId ? profiles[activeProfileId] : undefined;
  const activeLanguageLabel = useMemo(() => {
    if (!activeProfile) {
      return '';
    }
    const glyph = resolveFlagGlyph(activeProfile.targetLanguage, activeProfile.targetRegion);
    return `${glyph} ${activeProfile.targetLanguage.toUpperCase()}`;
  }, [activeProfile]);

  useEffect(() => {
    if (!profilesLoaded) {
      return;
    }
    if (!activeProfile) {
      ensureProfile({
        userId: DEFAULT_USER_ID,
        nativeLanguage: 'en',
        targetLanguage: 'es',
        targetRegion: 'mx',
        makeActive: true,
      }).catch(() => undefined);
    }
  }, [profilesLoaded, activeProfile, ensureProfile]);

  const sessionsForProfile: TtxSession[] = useMemo(() => {
    if (!activeProfile) {
      return [];
    }
    return Object.values(sessions)
      .filter(session => session.profileId === activeProfile.profileId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [sessions, activeProfile]);

  const unfinishedSession = useMemo(
    () => sessionsForProfile.find(session => !session.progress?.isComplete),
    [sessionsForProfile],
  );

  useEffect(() => {
    if (!unfinishedSession || sessionModalVisible || resumePromptShown) {
      return;
    }
    Alert.alert(
      'Resume translation practice?',
      'You have an unfinished translation set. Would you like to continue where you left off?',
      [
        {
          text: 'Start New',
          style: 'cancel',
        },
        {
          text: 'Continue',
          onPress: () => {
            setModalSessionId(unfinishedSession.sessionId);
            setSessionModalVisible(true);
            markSessionOpened(unfinishedSession.sessionId).catch(() => undefined);
          },
        },
      ],
    );
    setResumePromptShown(true);
  }, [unfinishedSession, sessionModalVisible, resumePromptShown, markSessionOpened]);

  if (!activeProfile) {
    return (
      <ScreenContainer style={[styles.screen, styles.centerContent]}>
        <ActivityIndicator color={colors.accent} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading profile…</Text>
      </ScreenContainer>
    );
  }

  const handleGenerateSession = async () => {
    const vocabPool = buildVocabPool({
      reviewMode,
      questionCount,
      savedVocab: eligibleBankItems,
      targetLanguage: activeProfile.targetLanguage,
      difficulty: activeProfile.preferredDifficulty,
      topics: topicInput,
    });

    if (vocabPool.type === 'empty') {
      Alert.alert('Nothing to review', vocabPool.message);
      return;
    }
    if (vocabPool.type === 'insufficient') {
      Alert.alert('Need more vocab', vocabPool.message);
      return;
    }

    const topicTags = topicInput
      .split(',')
      .map(tag => tag.trim())
      .filter(Boolean);

    // Persist any synthetic/new vocab into the bank so they can accrue SRS/performance metadata
    const normalisedPool = await Promise.all(
      vocabPool.items.map(async item => {
        const existing =
          bankItems.find(entry => entry.id === item.id || entry.term === item.term) ?? null;
        if (existing) {
          return existing;
        }
        const created = await addBankItem({
          term: item.term,
          meaning: item.meaning,
          reading: item.reading,
          examples: item.examples,
          tags: item.tags,
          folders: item.folders,
          level: item.level,
          srsData: item.srsData,
        });
        return created;
      }),
    );

    // Ensure any existing SRS metadata has a UUID id to satisfy session schema
    const sanitizedPool = normalisedPool.map(item => {
      if (!item.srsData) {
        return item;
      }
      return {
        ...item,
        srsData: {
          ...item.srsData,
          id: ensureUuid(item.srsData.id),
        },
      };
    });

    const session = generateMockTranslationSession({
      profile: activeProfile,
      vocabPool: sanitizedPool,
      styleMix: STYLE_PRESETS[stylePreset].values,
      topicTags,
      reviewMode,
      questionCount,
    });

    await appendActivityRecords(
      sanitizedPool.map(item => item.id),
      session.sessionId,
      'translation',
    );

    await saveSession(session);
    await appendSavedSession(activeProfile.profileId, session.sessionId).catch(() => undefined);
    setModalSessionId(session.sessionId);
    setSessionModalVisible(true);
  };

  const dismissModal = () => {
    setSessionModalVisible(false);
    setModalSessionId(null);
  };

  const handleNewSessionFromReview = () => {
    dismissModal();
    handleGenerateSession().catch(() => undefined);
  };

  const handleSwitchActivityFromReview = () => {
    dismissModal();
    navigation.navigate('Activities' as never);
  };

  return (
    <ScreenContainer style={styles.screen}>
      <View style={styles.topBar}>
        <Pressable
          accessibilityLabel="Close translation tutor"
          accessibilityRole="button"
          onPress={() => navigation.goBack()}
          style={styles.topBarButton}
        >
          <Text style={styles.topBarClose}>×</Text>
        </Pressable>
        <View style={styles.topBarTitleArea}>
          <Text style={styles.screenTitle}>Translation Tutor</Text>
        </View>
        <Pressable
          onPress={() => setIsSwitcherVisible(true)}
          style={styles.languageLink}
          accessibilityRole="button"
        >
          <Text style={styles.languageLinkText}>{activeLanguageLabel || 'Choose'}</Text>
        </Pressable>
      </View>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContentFull}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.cardFull, { backgroundColor: colors.background }] }>
          <Text style={styles.cardTitle}>Session setup</Text>
          <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
            Choose how formal you want the responses, whether to review or learn new content, and how
            many prompts to practice.
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
            styles={styles}
          />

          <Text style={styles.sectionLabel}>Vocabulary mix</Text>
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
            styles={styles}
          />
          <Text style={[styles.sliderDescription, { color: colors.textSecondary }]}>
            {REVIEW_MODES[reviewModeIndex]?.description ?? 'Half review · Half new.'}
          </Text>

          <View style={styles.sliderHeaderRow}>
            <Text style={styles.sectionLabel}>Question count</Text>
            <Text style={styles.sliderValueLabel}>{questionCount} prompts</Text>
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
            styles={styles}
          />

          <Text style={styles.sectionLabel}>Optional topics</Text>
          <TextInput
            value={topicInput}
            onChangeText={setTopicInput}
            placeholder="e.g. street food, travel logistics, slang"
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
                setModalSessionId(unfinishedSession.sessionId);
                setSessionModalVisible(true);
                markSessionOpened(unfinishedSession.sessionId).catch(() => undefined);
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

        {bankLoading ? (
          <View style={[styles.cardFull, styles.centerContent, { backgroundColor: colors.background }]}>
            <ActivityIndicator color={colors.accent} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Syncing vocabulary…</Text>
          </View>
        ) : null}
      </ScrollView>

      <LanguageSwitcherModal visible={isSwitcherVisible} onClose={() => setIsSwitcherVisible(false)} />
      <SessionPlayerModal
        visible={sessionModalVisible}
        sessionId={modalSessionId}
        contentWidth={modalContentWidth}
        onClose={dismissModal}
        appendHistory={appendHistory}
        setRecap={setRecap}
        setProgress={setProgress}
        toggleFlagged={toggleFlagged}
        createNote={createNote}
        bankItems={bankItems}
        recordActivityOutcome={recordActivityOutcome}
        styles={styles}
        mode={mode}
        onRequestNewSession={handleNewSessionFromReview}
        onSwitchActivity={handleSwitchActivityFromReview}
      />
    </ScreenContainer>
  );
};

type SliderMarker = {
  value: number;
  label: string;
};

interface DiscreteSliderProps {
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
  markers?: SliderMarker[];
  styles: ReturnType<typeof createStyles>;
}

const DiscreteSlider: React.FC<DiscreteSliderProps> = ({
  min,
  max,
  step,
  value,
  onChange,
  markers,
  styles,
}) => {
  const [trackWidth, setTrackWidth] = useState(0);
  const clamp = (val: number) => Math.min(max, Math.max(min, val));

  const handleLocation = (locationX: number) => {
    if (!trackWidth) {
      return;
    }
    const ratio = Math.min(1, Math.max(0, locationX / trackWidth));
    const raw = min + ratio * (max - min);
    const stepsFromMin = Math.round((raw - min) / step);
    const snapped = clamp(min + stepsFromMin * step);
    onChange(snapped);
  };

  const ratio = (value - min) / (max - min || 1);
  const thumbLeft = trackWidth ? ratio * trackWidth : 0;

  const sliderProgressStyle = useMemo(
    () => ({ width: trackWidth ? Math.max(12, thumbLeft) : 0 }),
    [trackWidth, thumbLeft],
  );
  const thumbStyle = useMemo(
    () => ({
      left: Math.max(0, Math.min(trackWidth - THUMB_SIZE, thumbLeft - THUMB_SIZE / 2)),
    }),
    [trackWidth, thumbLeft],
  );

  const markerElements = markers?.map(marker => {
    const isActive = Math.abs(marker.value - value) < step / 2;
    return (
      <Text
        key={`${marker.value}-${marker.label}`}
        style={[styles.configSliderMarkerText, isActive && styles.configSliderMarkerActive]}
      >
        {marker.label}
      </Text>
    );
  });

  return (
    <View style={styles.configSliderContainer}>
      <View
        style={styles.configSliderTrackWrapper}
        onLayout={event => setTrackWidth(event.nativeEvent.layout.width)}
        onStartShouldSetResponder={() => true}
        onResponderGrant={event => handleLocation(event.nativeEvent.locationX)}
        onResponderMove={event => handleLocation(event.nativeEvent.locationX)}
      >
        <View style={styles.configSliderTrack}>
          <View style={[styles.configSliderProgress, sliderProgressStyle]} />
        </View>
        <View style={[styles.configSliderThumb, thumbStyle]} />
      </View>
      {markerElements && markerElements.length > 0 ? (
        <View style={styles.configSliderMarkersRow}>{markerElements}</View>
      ) : null}
    </View>
  );
};

const THUMB_SIZE = 20;

const createStyles = (colors: ReturnType<typeof useTheme>['colors']) =>
  StyleSheet.create({
    screen: {
      flex: 1,
    },
    topBar: {
      paddingHorizontal: spacing.block,
      paddingTop: spacing.block / 2,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    topBarButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
    },
    topBarClose: {
      fontSize: 28,
      lineHeight: 28,
      color: colors.textPrimary,
    },
    topBarTitleArea: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.base * 0.25,
    },
    screenTitle: {
      ...typography.title,
      fontFamily: fontFamilies.serif.semibold,
      color: colors.textPrimary,
    },
    languageLink: {
      minWidth: 60,
      alignItems: 'flex-end',
    },
    languageLinkText: {
      ...typography.caption,
      color: colors.accent,
      fontFamily: fontFamilies.sans.semibold,
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: spacing.block,
      paddingBottom: spacing.block * 2,
      gap: spacing.block,
    },
    scrollContentFull: {
      paddingBottom: spacing.block * 2,
      gap: spacing.block,
    },
    card: {
      borderRadius: radii.surface,
      padding: spacing.block,
      gap: spacing.base,
    },
    cardFull: {
      paddingHorizontal: spacing.block,
      paddingTop: spacing.block,
      paddingBottom: spacing.block * 1.5,
      gap: spacing.base,
    },
    cardTitle: {
      ...typography.title,
      fontFamily: fontFamilies.serif.semibold,
      color: colors.textPrimary,
    },
    cardSubtitle: {
      ...typography.body,
      color: colors.textSecondary,
    },
    chipRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.base,
    },
    chip: {
      borderWidth: StyleSheet.hairlineWidth,
      borderRadius: radii.surface,
      paddingHorizontal: spacing.base,
      paddingVertical: spacing.base * 0.5,
      minWidth: 120,
    },
    chipLabel: {
      ...typography.captionStrong,
      fontFamily: fontFamilies.sans.semibold,
      color: colors.textPrimary,
    },
    chipSubtext: {
      ...typography.caption,
      fontFamily: fontFamilies.sans.regular,
      marginTop: 2,
    },
    sectionLabel: {
      ...typography.subhead,
      fontFamily: fontFamilies.sans.semibold,
      color: colors.textPrimary,
    },
    topicInput: {
      borderWidth: StyleSheet.hairlineWidth,
      borderRadius: radii.surface,
      paddingHorizontal: spacing.base,
      paddingVertical: spacing.base,
      ...typography.body,
    },
    sliderHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: spacing.base,
    },
    sliderValueLabel: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    sliderDescription: {
      ...typography.caption,
      color: colors.textSecondary,
      marginTop: spacing.base / 4,
    },
    primaryButton: {
      borderRadius: radii.surface,
      paddingVertical: spacing.base,
      alignItems: 'center',
      justifyContent: 'center',
    },
    primaryButtonLabel: {
      ...typography.bodyStrong,
      color: '#FFFFFF',
    },
    secondaryButton: {
      borderRadius: radii.surface,
      borderWidth: StyleSheet.hairlineWidth,
      paddingVertical: spacing.base * 0.75,
      paddingHorizontal: spacing.base,
      alignItems: 'center',
      justifyContent: 'center',
    },
    secondaryButtonLabel: {
      ...typography.captionStrong,
      color: colors.textPrimary,
    },
    buttonTopMargin: {
      marginTop: spacing.base,
    },
    centerContent: {
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.base,
    },
    loadingText: {
      ...typography.body,
      color: colors.textPrimary,
    },
    modalContainer: {
      flex: 1,
      paddingTop: 0,
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.block,
      marginBottom: spacing.base,
    },
    modalHeaderSpacer: {
      width: 36,
      height: 36,
    },
    modalTitle: {
      ...typography.subhead,
      fontFamily: fontFamilies.sans.semibold,
      color: colors.textPrimary,
    },
    closeButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
    },
    closeButtonLabel: {
      fontSize: 28,
      lineHeight: 28,
      color: colors.textPrimary,
    },
    modalContent: {
      flex: 1,
      paddingBottom: spacing.base,
    },
    progressLabel: {
      ...typography.caption,
      textAlign: 'right',
      marginBottom: spacing.base / 2,
      marginRight: spacing.block,
      color: colors.textSecondary,
    },
    sliderViewport: {
      flex: 1,
      overflow: 'hidden',
    },
    sliderTrack: {
      flexDirection: 'row',
      height: '100%',
    },
    promptCard: {
      flex: 1,
      borderRadius: 0,
      paddingHorizontal: spacing.block,
      paddingVertical: spacing.block * 0.75,
      gap: spacing.base,
    },
    promptText: {
      ...typography.body,
      fontFamily: fontFamilies.serif.semibold,
    },
    promptHighlight: {
      ...typography.body,
      fontFamily: fontFamilies.serif.semibold,
      fontWeight: '700',
      color: '#2B7BFF',
    },
    promptContext: {
      ...typography.caption,
    },
    answerField: {
      borderWidth: StyleSheet.hairlineWidth,
      borderRadius: radii.surface,
      minHeight: 120,
      padding: spacing.base,
      textAlignVertical: 'top',
    },
    analysisCard: {
      flex: 1,
      borderRadius: 0,
      paddingHorizontal: spacing.block,
      paddingVertical: spacing.block * 0.75,
      gap: spacing.base,
    },
    analysisHeadline: {
      ...typography.subhead,
      fontFamily: fontFamilies.sans.semibold,
      color: colors.textPrimary,
    },
    analysisPrompt: {
      ...typography.bodyStrong,
      color: colors.textPrimary,
    },
    analysisLabel: {
      ...typography.captionStrong,
      color: colors.textSecondary,
    },
    analysisAnswer: {
      ...typography.body,
      color: colors.textPrimary,
    },
    analysisFeedback: {
      ...typography.body,
      fontFamily: fontFamilies.sans.regular,
      color: colors.textPrimary,
    },
    reviewCard: {
      flex: 1,
      borderRadius: 0,
      paddingHorizontal: spacing.block,
      paddingVertical: spacing.block,
      gap: spacing.base,
    },
    reviewScroll: {
      flex: 1,
    },
    reviewScrollContent: {
      gap: spacing.base,
      paddingBottom: spacing.base,
    },
    reviewWrapper: {
      flex: 1,
    },
    reviewMetricsRow: {
      flexDirection: 'row',
      gap: spacing.base,
    },
    reviewMetric: {
      flex: 1,
      borderRadius: radii.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      padding: spacing.base,
    },
    reviewMetricLabel: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    reviewMetricValue: {
      ...typography.title,
      fontFamily: fontFamilies.serif.semibold,
      color: colors.textPrimary,
    },
    reviewSection: {
      gap: spacing.base * 0.5,
    },
    reviewSectionTitle: {
      ...typography.captionStrong,
      color: colors.textSecondary,
    },
    reviewListItem: {
      borderRadius: radii.control,
      backgroundColor: colors.surfaceMuted,
      padding: spacing.base,
      gap: spacing.base * 0.25,
    },
    reviewListPrompt: {
      ...typography.bodyStrong,
      color: colors.textPrimary,
    },
    reviewListInsight: {
      ...typography.caption,
    },
    reviewButtons: {
      gap: spacing.base * 0.5,
      marginTop: spacing.base,
      paddingBottom: spacing.base * 0.5,
      alignItems: 'stretch',
    },
    fullWidthButton: {
      width: '100%',
      alignSelf: 'stretch',
    },
    analysisActions: {
      flexDirection: 'row',
      gap: spacing.base,
    },
    miniChatBox: {
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      borderRadius: radii.surface,
      padding: spacing.base,
      gap: spacing.base * 0.75,
    },
    miniChatHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.base * 0.25,
    },
    miniChatTitle: {
      ...typography.captionStrong,
      color: colors.textPrimary,
    },
    miniChatExpandHint: {
      ...typography.caption,
      color: colors.accent,
    },
    miniChatMessages: {
      maxHeight: 140,
    },
    miniChatBubble: {
      borderRadius: radii.control,
      padding: spacing.base * 0.75,
      marginBottom: spacing.base * 0.5,
    },
    miniChatBubbleUser: {
      backgroundColor: colors.accentSoft,
      alignSelf: 'flex-end',
    },
    miniChatBubbleAssistant: {
      backgroundColor: colors.surfaceMuted,
      alignSelf: 'flex-start',
    },
    miniChatText: {
      ...typography.caption,
      color: colors.textPrimary,
    },
    miniChatInputRow: {
      flexDirection: 'row',
      gap: spacing.base,
      alignItems: 'center',
    },
    miniChatInput: {
      flex: 1,
      borderWidth: StyleSheet.hairlineWidth,
      borderRadius: radii.control,
      paddingHorizontal: spacing.base,
      paddingVertical: spacing.base * 0.5,
    },
    chatOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      paddingTop: spacing.block * 2.4,
      paddingHorizontal: spacing.block,
      paddingBottom: spacing.block,
      zIndex: 20,
    },
    chatOverlayHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.base,
    },
    chatOverlayHeaderSpacer: {
      width: 36,
      height: 36,
    },
    chatOverlayTitle: {
      ...typography.subhead,
      color: colors.textPrimary,
      fontFamily: fontFamilies.sans.semibold,
    },
    chatOverlayBody: {
      flex: 1,
      borderRadius: 0,
      paddingHorizontal: spacing.base * 0.5,
      paddingVertical: spacing.block * 0.35,
      backgroundColor: colors.background,
      gap: spacing.base,
    },
    chatOverlayMessages: {
      flex: 1,
    },
    chatOverlayInputRow: {
      flexDirection: 'row',
      gap: spacing.base * 0.5,
      alignItems: 'center',
      paddingTop: spacing.base,
      paddingHorizontal: spacing.base * 0.5,
    },
    chatOverlayInput: {
      flex: 1,
      borderWidth: StyleSheet.hairlineWidth,
      borderRadius: radii.control,
      paddingHorizontal: spacing.base * 0.5,
      paddingVertical: spacing.base * 0.75,
      minHeight: spacing.block * 0.9,
      maxHeight: spacing.block * 4,
      textAlignVertical: 'top',
    },
    chatOverlaySend: {
      paddingHorizontal: spacing.base * 0.9,
      paddingVertical: spacing.base * 0.75,
      borderRadius: radii.control,
      minWidth: 72,
    },
    configSliderContainer: {
      marginTop: spacing.base / 2,
    },
    configSliderTrackWrapper: {
      height: 36,
      justifyContent: 'center',
    },
    configSliderTrack: {
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.surfaceMuted,
      overflow: 'hidden',
    },
    configSliderProgress: {
      height: 4,
      backgroundColor: colors.accent,
      borderRadius: 2,
    },
    configSliderThumb: {
      position: 'absolute',
      width: THUMB_SIZE,
      height: THUMB_SIZE,
      borderRadius: THUMB_SIZE / 2,
      backgroundColor: colors.accent,
      top: 18 - THUMB_SIZE / 2,
    },
    configSliderMarkersRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: spacing.base / 2,
    },
    configSliderMarkerText: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    configSliderMarkerActive: {
      color: colors.textPrimary,
      fontFamily: fontFamilies.sans.semibold,
    },
  });

export default TranslationPracticeScreen;
