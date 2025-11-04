import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Animated,
  Easing,
  useWindowDimensions,
  type ImageSourcePropType,
  type LayoutRectangle,
  type ViewStyle,
} from 'react-native';
import {
  CompositeNavigationProp,
  useFocusEffect,
  useNavigation,
} from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import ScreenHeader from '../components/ScreenHeader';
import ScreenContainer from '../components/ScreenContainer';
import type { MainTabsParamList, RootStackParamList } from '../../navigation/types';
import { useProgressDashboardStore } from '../../state/progress.store';
import { useBankStore } from '../../state/bank.store';
import { spacing, radii, typography, shadows, fontFamilies } from '../theme/tokens';
import { useTheme, type ThemeColors } from '../theme/theme';
import { useThemeStyles } from '../theme/useThemeStyles';

type HomeNavigation = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabsParamList, 'Home'>,
  NativeStackNavigationProp<RootStackParamList>
>;

type ActivityTileConfig = {
  id: string;
  label: string;
  icon: ImageSourcePropType;
};

const activityTiles: ActivityTileConfig[] = [
  { id: 'translation', label: 'Translation Practice', icon: require('../../../assets/icons/translate-2.png') },
  { id: 'flashcards', label: 'Flashcard Training', icon: require('../../../assets/icons/info-card-line.png') },
  { id: 'writing', label: 'Writing Prompts', icon: require('../../../assets/icons/edit-2-line.png') },
  { id: 'games', label: 'Language Games', icon: require('../../../assets/icons/gamepad-line.png') },
  { id: 'pronunciation', label: 'Pronunciation Practice', icon: require('../../../assets/icons/speak-line.png') },
  { id: 'comprehension', label: 'Comprehension Practice', icon: require('../../../assets/icons/headphone-line.png') },
  { id: 'culture', label: 'Cultural Immersion Capsule', icon: require('../../../assets/icons/group-3-line.png') },
  { id: 'speaking', label: 'Spontaneous Speaking', icon: require('../../../assets/icons/speak-ai-line.png') },
  { id: 'adaptive', label: 'Adaptive Review', icon: require('../../../assets/icons/feedback-line.png') },
] as const;

const ACTIVITY_ICON_BOX = 44;

const HomeScreen: React.FC = () => {
  const navigation = useNavigation<HomeNavigation>();
  const styles = useThemeStyles(createStyles);
  const { colors } = useTheme();
  const windowDims = useWindowDimensions();
  const searchCardRef = useRef<View>(null);
  const expansionProgress = useRef(new Animated.Value(0)).current;
  const [searchOverlay, setSearchOverlay] = useState<LayoutRectangle | null>(null);
  const [isSearchAnimating, setIsSearchAnimating] = useState(false);

  const {
    stats,
    recentSessions,
    load: loadProgress,
  } = useProgressDashboardStore();
  const {
    items: bankItems,
    loadBank,
  } = useBankStore();

  useEffect(() => {
    loadProgress().catch(() => undefined);
    loadBank().catch(() => undefined);
  }, [loadProgress, loadBank]);

  useFocusEffect(
    useCallback(() => {
      loadProgress().catch(() => undefined);
      expansionProgress.stopAnimation();
      expansionProgress.setValue(0);
      setSearchOverlay(null);
      setIsSearchAnimating(false);
      return () => undefined;
    }, [loadProgress, expansionProgress]),
  );

  const newWordsToday = useMemo(() => {
    const todayKey = new Date().toISOString().slice(0, 10);
    return bankItems.filter(item => item.createdAt.startsWith(todayKey)).length;
  }, [bankItems]);

  const streakValue = useMemo(() => {
    if (!stats) {
      return '0 days';
    }
    const days = stats.streakDays ?? 0;
    const unit = days === 1 ? 'day' : 'days';
    return `${days} ${unit}`;
  }, [stats]);

  const newWordsValue = useMemo(() => {
    const unit = newWordsToday === 1 ? 'word' : 'words';
    return `${newWordsToday} ${unit}`;
  }, [newWordsToday]);

  const accuracyLabel = useMemo(() => {
    const aggregates = recentSessions.reduce(
      (acc, session) => {
        acc.correct += session.correctCount;
        acc.total += session.correctCount + session.incorrectCount;
        return acc;
      },
      { correct: 0, total: 0 },
    );
    if (aggregates.total === 0) {
      return '0%';
    }
    const percent = Math.round((aggregates.correct / aggregates.total) * 100);
    return `${percent}%`;
  }, [recentSessions]);

  const handleSearchPress = () => {
    if (isSearchAnimating) {
      return;
    }
    const node = searchCardRef.current;
    if (!node) {
      navigation.navigate('Chat');
      return;
    }
    node.measureInWindow((x, y, width, height) => {
      if (width === 0 || height === 0) {
        navigation.navigate('Chat');
        return;
      }
      setSearchOverlay({ x, y, width, height });
      expansionProgress.setValue(0);
      setIsSearchAnimating(true);
      Animated.timing(expansionProgress, {
        toValue: 1,
        duration: 320,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start(() => {
        navigation.navigate('Chat');
        requestAnimationFrame(() => {
          setSearchOverlay(null);
          setIsSearchAnimating(false);
        });
      });
    });
  };

  let overlayAnimatedStyle: Animated.WithAnimatedObject<ViewStyle> | undefined;
  let overlayContentOpacity: Animated.AnimatedInterpolation<number> | undefined;
  if (searchOverlay) {
    overlayAnimatedStyle = {
      top: expansionProgress.interpolate({
        inputRange: [0, 1],
        outputRange: [searchOverlay.y, 0],
        extrapolate: 'clamp',
      }),
      left: expansionProgress.interpolate({
        inputRange: [0, 1],
        outputRange: [searchOverlay.x, 0],
        extrapolate: 'clamp',
      }),
      width: expansionProgress.interpolate({
        inputRange: [0, 1],
        outputRange: [searchOverlay.width, windowDims.width],
        extrapolate: 'clamp',
      }),
      height: expansionProgress.interpolate({
        inputRange: [0, 1],
        outputRange: [searchOverlay.height, windowDims.height],
        extrapolate: 'clamp',
      }),
      borderRadius: expansionProgress.interpolate({
        inputRange: [0, 0.6, 1],
        outputRange: [radii.surface, radii.surface / 2, 0],
        extrapolate: 'clamp',
      }),
    };
    overlayContentOpacity = expansionProgress.interpolate({
      inputRange: [0, 0.25],
      outputRange: [1, 0],
      extrapolate: 'clamp',
    });
  }

  return (
    <ScreenContainer style={styles.screen}>
      <ScreenHeader
        title="UniLex"
        onProfilePress={() => navigation.navigate('Settings')}
      />

      <ScrollView
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.metricRow}>
          <MetricCard
            label="Streak"
            value={streakValue}
            tone="primary"
            onPress={() => navigation.navigate('ProgressDashboard')}
          />
          <MetricCard
            label="New Words Today"
            value={newWordsValue}
            tone="secondary"
            onPress={() => navigation.navigate('ProgressDashboard')}
          />
          <MetricCard
            label="Accuracy"
            value={accuracyLabel}
            tone="success"
            onPress={() => navigation.navigate('ProgressDashboard')}
          />
        </View>

        <View ref={searchCardRef} collapsable={false}>
          <Pressable
            onPress={handleSearchPress}
            disabled={isSearchAnimating}
            style={({ pressed }) => [
              styles.searchField,
              pressed && styles.searchFieldPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Search word or phrase"
          >
            <Image
              source={require('../../../assets/icons/search-line.png')}
              style={[styles.searchIcon, { tintColor: colors.textSecondary }]}
            />
            <Text style={styles.searchPlaceholder}>Search word or phrase…</Text>
          </Pressable>
        </View>

        <View style={styles.quickAccessRow}>
          <QuickAccessCard
            title="Word Bank"
            description="Browse every saved item."
            icon={require('../../../assets/icons/archive-drawer-line.png')}
            tone="primary"
            onPress={() => navigation.navigate('WordBank')}
          />
          <QuickAccessCard
            title="Native Notes"
            description="Jump to your native insights."
            icon={require('../../../assets/icons/booklet-line.png')}
            tone="secondary"
            onPress={() => navigation.navigate('NativeNotes')}
          />
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Practice Board</Text>
          <Text style={styles.sectionSubtitle}>Choose an activity to train.</Text>
        </View>

        <View style={styles.activityGrid}>
          {activityTiles.map(tile => (
            <ActivityTile
              key={tile.id}
              label={tile.label}
              icon={tile.icon}
              onPress={() => navigation.navigate('Activities')}
            />
          ))}
        </View>
      </ScrollView>
      {searchOverlay && overlayAnimatedStyle ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.searchExpansionOverlay,
            overlayAnimatedStyle,
            { backgroundColor: colors.surface },
          ]}
        >
          <Animated.View
            style={[
              styles.searchExpansionContent,
              { opacity: overlayContentOpacity ?? 1 },
            ]}
          >
            <Image
              source={require('../../../assets/icons/search-line.png')}
              style={[styles.searchExpansionIcon, { tintColor: colors.textSecondary }]}
            />
            <Text style={styles.searchPlaceholder}>Search word or phrase…</Text>
          </Animated.View>
        </Animated.View>
      ) : null}
    </ScreenContainer>
  );
};

export default HomeScreen;

const MetricCard: React.FC<{
  label: string;
  value: string;
  tone?: 'neutral' | 'primary' | 'secondary' | 'success';
  onPress: () => void;
}> = ({ label, value, tone = 'neutral', onPress }) => {
  const styles = useThemeStyles(createStyles);
  const { colors } = useTheme();
  const tonePalette = useMemo(() => {
    const neutralPalette = {
      background: colors.surface,
      border: colors.border,
      pressed: colors.surfaceMuted,
      value: colors.textPrimary,
      label: colors.textSecondary,
    };
    const mapping: Record<'neutral' | 'primary' | 'secondary' | 'success', typeof neutralPalette> = {
      neutral: neutralPalette,
      primary: {
        background: colors.accentSoft,
        border: colors.accent,
        pressed: colors.accent,
        value: colors.accent,
        label: colors.textPrimary,
      },
      secondary: {
        background: colors.accentSecondarySoft,
        border: colors.accentSecondary,
        pressed: colors.accentSecondary,
        value: colors.accentSecondary,
        label: colors.textPrimary,
      },
      success: {
        background: colors.successSoft,
        border: colors.success,
        pressed: colors.success,
        value: colors.success,
        label: colors.textPrimary,
      },
    };
    return mapping[tone] ?? neutralPalette;
  }, [colors, tone]);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.metricCard,
        { backgroundColor: tonePalette.background, borderColor: tonePalette.border },
        pressed && { backgroundColor: tonePalette.pressed },
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${label} ${value}`}
    >
      <Text style={[styles.metricValue, { color: tonePalette.value }]}>{value}</Text>
      <Text style={[styles.metricLabel, { color: tonePalette.label }]}>{label}</Text>
    </Pressable>
  );
};

const QuickAccessCard: React.FC<{
  title: string;
  description: string;
  onPress: () => void;
  icon: ImageSourcePropType;
  tone?: 'primary' | 'secondary';
}> = ({ title, description, onPress, icon, tone = 'primary' }) => {
  const styles = useThemeStyles(createStyles);
  const { colors } = useTheme();
  const toneColors = useMemo(() => {
    const mapping: Record<'primary' | 'secondary', { background: string; icon: string }> = {
      primary: {
        background: colors.accentSoft,
        icon: colors.accent,
      },
      secondary: {
        background: colors.accentSecondarySoft,
        icon: colors.accentSecondary,
      },
    };
    return mapping[tone];
  }, [colors, tone]);
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.quickCard,
        pressed && styles.quickCardPressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={title}
    >
      <View
        style={[
          styles.quickCardIcon,
          { backgroundColor: toneColors.background },
        ]}
      >
        <Image
          source={icon}
          style={[styles.quickCardIconImage, { tintColor: toneColors.icon }]}
        />
      </View>
      <Text style={styles.quickCardTitle}>{title}</Text>
      <Text style={styles.quickCardDescription}>{description}</Text>
    </Pressable>
  );
};

const ActivityTile: React.FC<{
  label: string;
  onPress: () => void;
  icon: ActivityTileConfig['icon'];
}> = memo(({ label, icon, onPress }) => {
  const styles = useThemeStyles(createStyles);
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.activityTile,
        pressed && styles.activityTilePressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View style={styles.activityGlyph}>
        <Image
          source={icon}
          style={[styles.activityIcon, { tintColor: colors.textPrimary }]}
        />
      </View>
      <Text style={styles.activityLabel}>{label}</Text>
    </Pressable>
  );
});
ActivityTile.displayName = 'ActivityTile';



const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },
    contentContainer: {
      paddingTop: spacing.base * 0.25,
      paddingBottom: spacing.block * 2,
      paddingHorizontal: spacing.screenHorizontal,
      gap: spacing.block,
    },
    metricRow: {
      flexDirection: 'row',
      gap: spacing.base,
    },
    metricCard: {
      flex: 1,
      borderRadius: radii.surface,
      padding: spacing.base * 2,
      borderWidth: StyleSheet.hairlineWidth,
      ...shadows.card,
    },
    metricValue: {
      ...typography.subhead,
    },
    metricLabel: {
      ...typography.caption,
      marginTop: 4,
    },
    searchField: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: radii.surface,
      backgroundColor: colors.neutral,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      paddingHorizontal: 18,
      paddingVertical: 14,
      gap: 14,
      ...shadows.card,
    },
    searchFieldPressed: {
      backgroundColor: colors.surfaceMuted,
    },
    searchIcon: {
      width: 22,
      height: 22,
      resizeMode: 'contain',
      marginRight: spacing.base / 2,
    },
    searchPlaceholder: {
      ...typography.body,
      color: colors.textSecondary,
    },
    searchExpansionOverlay: {
      position: 'absolute',
      zIndex: 30,
      elevation: 30,
      overflow: 'hidden',
    },
    searchExpansionContent: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 18,
      paddingVertical: 14,
      gap: 14,
    },
    searchExpansionIcon: {
      width: 22,
      height: 22,
      resizeMode: 'contain',
    },
    quickAccessRow: {
      flexDirection: 'row',
      gap: spacing.base,
      marginTop: spacing.base * 0.5,
    },
    quickCard: {
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: radii.surface,
      padding: spacing.base * 2,
      gap: 12,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      ...shadows.card,
    },
    quickCardPressed: {
      backgroundColor: colors.surfaceMuted,
    },
    quickCardIcon: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    quickCardIconImage: {
      width: 20,
      height: 20,
      resizeMode: 'contain',
    },
    quickCardTitle: {
      ...typography.subhead,
      color: colors.textPrimary,
    },
    quickCardDescription: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    sectionHeader: {
      gap: 4,
    },
    sectionTitle: {
      ...typography.headline,
      color: colors.textPrimary,
    },
    sectionSubtitle: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    activityGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.base,
    },
    activityTile: {
      width: '47%',
      backgroundColor: colors.surface,
      borderRadius: radii.surface,
      padding: spacing.base * 2,
      gap: 12,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      ...shadows.card,
    },
    activityTilePressed: {
      backgroundColor: colors.surfaceMuted,
    },
    activityGlyph: {
      width: ACTIVITY_ICON_BOX,
      height: ACTIVITY_ICON_BOX,
      borderRadius: ACTIVITY_ICON_BOX / 2,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surfaceMuted,
    },
    activityIcon: {
      width: 28,
      height: 28,
      resizeMode: 'contain',
    },
    activityLabel: {
      ...typography.body,
      color: colors.textPrimary,
    },
  });
