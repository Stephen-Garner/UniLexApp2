import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
} from 'react-native';
import { useLanguageProfileStore } from '../../state/language-profile.store';
import { useTheme, type ThemeColors } from '../theme/theme';
import { spacing, radii, typography, fontFamilies } from '../theme/tokens';
import {
  LANGUAGE_LIBRARY,
  findLanguageOption,
  listRegionOptions,
  resolveFlagGlyph,
} from '../../data/language-library';
import { TranslationDifficultySchema, type LanguageProfile } from '../../contracts/models';
import { DEFAULT_USER_ID } from '../../domain/user/constants';
import { STYLE_PRESETS, type StylePresetKey } from '../../domain/translation/style-presets';

type TranslationDifficultyValue = typeof TranslationDifficultySchema._type;

interface LanguageSwitcherModalProps {
  visible: boolean;
  onClose: () => void;
}

const LanguageSwitcherModal: React.FC<LanguageSwitcherModalProps> = ({ visible, onClose }) => {
  const {
    profiles,
    activeProfileId,
    isLoaded,
    loadProfiles,
    selectProfile,
    ensureProfile,
  } = useLanguageProfileStore();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const existingProfiles = useMemo(
    () =>
      Object.values(profiles).sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      ),
    [profiles],
  );

  const [nativeLanguage, setNativeLanguage] = useState('en');
  const [targetLanguage, setTargetLanguage] = useState('es');
  const [targetRegion, setTargetRegion] = useState<string | undefined>('mx');
  const [difficulty, setDifficulty] = useState<TranslationDifficultyValue>('intro');
  const [stylePreset, setStylePreset] = useState<StylePresetKey>('balanced');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (visible && !isLoaded) {
      loadProfiles().catch(() => undefined);
    }
  }, [visible, isLoaded, loadProfiles]);

  useEffect(() => {
    if (!visible) {
      return;
    }
    const active = activeProfileId ? profiles[activeProfileId] : undefined;
    if (active) {
      setNativeLanguage(active.nativeLanguage);
      setTargetLanguage(active.targetLanguage);
      setTargetRegion(active.targetRegion ?? undefined);
      setDifficulty(active.preferredDifficulty);
    }
  }, [visible, activeProfileId, profiles]);

  useEffect(() => {
    const regionOptions = listRegionOptions(targetLanguage);
    if (regionOptions.length === 0) {
      setTargetRegion(undefined);
      return;
    }
    if (!regionOptions.some(region => region.code === targetRegion)) {
      setTargetRegion(regionOptions[0]?.code);
    }
  }, [targetLanguage, targetRegion]);

  const handleCreateProfile = async () => {
    if (!targetLanguage) {
      return;
    }
    setIsSaving(true);
    try {
      await ensureProfile({
        userId: DEFAULT_USER_ID,
        nativeLanguage,
        targetLanguage,
        targetRegion,
        preferredDifficulty: difficulty,
        stylePreferences: STYLE_PRESETS[stylePreset].values,
        makeActive: true,
      });
      onClose();
    } catch (error) {
      console.error('Failed to create language profile', error);
    } finally {
      setIsSaving(false);
    }
  };

  const renderProfileCard = (profile: LanguageProfile) => {
    const languageMeta = findLanguageOption(profile.targetLanguage);
    const regionLabel =
      listRegionOptions(profile.targetLanguage).find(
        region => region.code === profile.targetRegion,
      )?.label ?? 'Default region';
    const updatedLabel = new Date(profile.updatedAt).toLocaleDateString();
    const isActive = profile.profileId === activeProfileId;
    const glyph = resolveFlagGlyph(profile.targetLanguage, profile.targetRegion);

    return (
      <Pressable
        key={profile.profileId}
        onPress={() => {
          selectProfile(profile.profileId).catch(() => undefined);
          onClose();
        }}
        style={({ pressed }) => [
          styles.profileCard,
          {
            borderColor: isActive ? colors.accent : colors.border,
            backgroundColor: colors.surface,
          },
          pressed && { opacity: 0.8 },
        ]}
      >
        <View style={styles.profileHeader}>
          <Text style={styles.profileGlyph}>{glyph}</Text>
          <View style={styles.profileMeta}>
            <Text style={styles.profileTitle}>
              {languageMeta?.label ?? profile.targetLanguage.toUpperCase()}
            </Text>
            <Text style={[styles.profileSubtitle, { color: colors.textSecondary }]}>
              {regionLabel}
            </Text>
          </View>
          {isActive ? (
            <Text style={[styles.activeBadge, { color: colors.accent }]}>Active</Text>
          ) : null}
        </View>
        <Text style={[styles.profileFooter, { color: colors.textSecondary }]}>
          Updated {updatedLabel}
        </Text>
      </Pressable>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <Text style={styles.title}>Study Languages</Text>
          <Pressable onPress={onClose} hitSlop={16}>
            <Text style={[styles.closeText, { color: colors.accent }]}>Done</Text>
          </Pressable>
        </View>
        {!isLoaded ? (
          <View style={styles.loadingState}>
            <ActivityIndicator color={colors.accent} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
              Loading profiles…
            </Text>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              Current profiles
            </Text>
            {existingProfiles.length === 0 ? (
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                No study languages yet. Create one below to get started.
              </Text>
            ) : (
              existingProfiles.map(renderProfileCard)
            )}

            <View style={styles.divider} />

            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              Add / update profile
            </Text>
            <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
              Choose your native language, target language, and dialect so activities feel local.
            </Text>

            <SelectorGroup
              label="Native language"
              value={nativeLanguage}
              onSelect={setNativeLanguage}
              styles={styles}
            />

            <SelectorGroup
              label="Target language"
              value={targetLanguage}
              onSelect={code => setTargetLanguage(code)}
              styles={styles}
            />

            <RegionSelector
              languageCode={targetLanguage}
              selectedRegion={targetRegion}
              onSelect={setTargetRegion}
              styles={styles}
            />

            <DifficultySelector value={difficulty} onSelect={setDifficulty} styles={styles} />

            <StylePresetSelector value={stylePreset} onSelect={setStylePreset} styles={styles} />

            <Pressable
              onPress={handleCreateProfile}
              disabled={isSaving}
              style={({ pressed }) => [
                styles.saveButton,
                { backgroundColor: colors.accent },
                (pressed || isSaving) && { opacity: 0.8 },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Save language profile"
            >
              <Text style={styles.saveButtonLabel}>
                {isSaving ? 'Saving…' : 'Save as active profile'}
              </Text>
            </Pressable>
          </ScrollView>
        )}
      </View>
    </Modal>
  );
};

export default LanguageSwitcherModal;

const SelectorGroup: React.FC<{
  label: string;
  value: string;
  onSelect: (code: string) => void;
  styles: ReturnType<typeof createStyles>;
}> = ({ label, value, onSelect, styles }) => {
  const { colors } = useTheme();
  return (
    <View style={styles.selectorGroup}>
      <Text style={[styles.selectorLabel, { color: colors.textPrimary }]}>{label}</Text>
      <View style={styles.selectorRow}>
        {LANGUAGE_LIBRARY.map(option => {
          const isSelected = value === option.code;
          return (
            <Pressable
              key={option.code}
              onPress={() => onSelect(option.code)}
              style={({ pressed }) => [
                styles.chip,
                {
                  borderColor: isSelected ? colors.accent : colors.border,
                  backgroundColor: colors.surface,
                },
                pressed && { opacity: 0.8 },
              ]}
            >
              <Text style={styles.chipText}>
                {option.flag} {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

const RegionSelector: React.FC<{
  languageCode: string;
  selectedRegion?: string;
  onSelect: (code?: string) => void;
  styles: ReturnType<typeof createStyles>;
}> = ({ languageCode, selectedRegion, onSelect, styles }) => {
  const { colors } = useTheme();
  const regions = listRegionOptions(languageCode);

  if (regions.length === 0) {
    return null;
  }

  return (
    <View style={styles.selectorGroup}>
      <Text style={[styles.selectorLabel, { color: colors.textPrimary }]}>Region / dialect</Text>
      <View style={styles.selectorRow}>
        {regions.map(region => {
          const isSelected = selectedRegion === region.code;
          return (
            <Pressable
              key={region.code}
              onPress={() => onSelect(region.code)}
              style={({ pressed }) => [
                styles.chip,
                {
                  borderColor: isSelected ? colors.accent : colors.border,
                  backgroundColor: colors.surface,
                },
                pressed && { opacity: 0.8 },
              ]}
            >
              <Text style={styles.chipText}>
                {region.flag} {region.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

const DifficultySelector: React.FC<{
  value: TranslationDifficultyValue;
  onSelect: (value: TranslationDifficultyValue) => void;
  styles: ReturnType<typeof createStyles>;
}> = ({ value, onSelect, styles }) => {
  const { colors } = useTheme();
  return (
    <View style={styles.selectorGroup}>
      <Text style={[styles.selectorLabel, { color: colors.textPrimary }]}>Difficulty</Text>
      <View style={styles.selectorRow}>
        {TranslationDifficultySchema.options.map(option => {
          const isSelected = option === value;
          const label = option.charAt(0).toUpperCase() + option.slice(1);
          return (
            <Pressable
              key={option}
              onPress={() => onSelect(option)}
              style={({ pressed }) => [
                styles.chip,
                {
                  borderColor: isSelected ? colors.accent : colors.border,
                  backgroundColor: colors.surface,
                },
                pressed && { opacity: 0.8 },
              ]}
            >
              <Text style={styles.chipText}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

const StylePresetSelector: React.FC<{
  value: StylePresetKey;
  onSelect: (value: StylePresetKey) => void;
  styles: ReturnType<typeof createStyles>;
}> = ({ value, onSelect, styles }) => {
  const { colors } = useTheme();
  return (
    <View style={styles.selectorGroup}>
      <Text style={[styles.selectorLabel, { color: colors.textPrimary }]}>
        Style mix (slang vs. formal)
      </Text>
      <View style={styles.selectorRow}>
        {(Object.keys(STYLE_PRESETS) as StylePresetKey[]).map(key => {
          const preset = STYLE_PRESETS[key];
          const isSelected = key === value;
          return (
            <Pressable
              key={key}
              onPress={() => onSelect(key)}
              style={({ pressed }) => [
                styles.chip,
                {
                  borderColor: isSelected ? colors.accent : colors.border,
                  backgroundColor: colors.surface,
                },
                pressed && { opacity: 0.8 },
              ]}
            >
              <Text style={styles.chipText}>{preset.label}</Text>
              <Text style={[styles.styleMeta, { color: colors.textSecondary }]}>
                F {preset.values.formal.toFixed(1)} · S {preset.values.slang.toFixed(1)} · I{' '}
                {preset.values.idioms.toFixed(1)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

const spacingLg = spacing.block;
const spacingMd = spacing.base * 2;
const spacingSm = spacing.base;
const spacingXs = spacing.base * 0.5;
const spacingXl = spacing.block * 1.5;

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      paddingTop: spacingLg,
    },
    header: {
      paddingHorizontal: spacingLg,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacingMd,
    },
    title: {
      ...typography.title,
      fontFamily: fontFamilies.plexSerif.semibold,
      color: colors.textPrimary,
    },
    closeText: {
      ...typography.bodyStrong,
      fontFamily: fontFamilies.sans.semibold,
    },
    loadingState: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacingMd,
    },
    loadingText: {
      ...typography.body,
      color: colors.textSecondary,
    },
    scrollContent: {
      paddingHorizontal: spacingLg,
      paddingBottom: spacingXl,
      gap: spacingMd,
    },
    sectionTitle: {
      ...typography.subhead,
      fontFamily: fontFamilies.sans.semibold,
      color: colors.textPrimary,
    },
    sectionSubtitle: {
      ...typography.caption,
      fontFamily: fontFamilies.sans.regular,
      marginBottom: spacingXs,
      color: colors.textSecondary,
    },
    emptyText: {
      ...typography.body,
      fontFamily: fontFamilies.sans.regular,
      color: colors.textSecondary,
    },
    profileCard: {
      borderRadius: radii.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      padding: spacingMd,
      marginBottom: spacingSm,
    },
    profileHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacingSm,
    },
    profileGlyph: {
      fontSize: 28,
    },
    profileMeta: {
      flex: 1,
    },
    profileTitle: {
      ...typography.bodyStrong,
      fontFamily: fontFamilies.sans.semibold,
      color: colors.textPrimary,
    },
    profileSubtitle: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    activeBadge: {
      ...typography.captionStrong,
    },
    profileFooter: {
      ...typography.caption,
      marginTop: spacingXs,
      color: colors.textSecondary,
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.border,
      marginVertical: spacingSm,
    },
    selectorGroup: {
      marginTop: spacingSm,
    },
    selectorLabel: {
      ...typography.captionStrong,
      marginBottom: spacingXs,
      color: colors.textPrimary,
    },
    selectorRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacingXs,
    },
    chip: {
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      borderRadius: radii.pill,
      paddingHorizontal: spacingSm,
      paddingVertical: spacingXs,
    },
    chipText: {
      ...typography.captionStrong,
      fontFamily: fontFamilies.sans.semibold,
      color: colors.textPrimary,
    },
    styleMeta: {
      ...typography.caption,
      fontFamily: fontFamilies.sans.regular,
      color: colors.textSecondary,
    },
    saveButton: {
      marginTop: spacingMd,
      borderRadius: radii.surface,
      paddingVertical: spacingSm,
      alignItems: 'center',
    },
    saveButtonLabel: {
      ...typography.bodyStrong,
      color: '#FFFFFF',
      fontFamily: fontFamilies.sans.semibold,
    },
  });
