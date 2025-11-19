import React, { useEffect, useMemo } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import ScreenContainer from '@/shared/components/ScreenContainer';
import { useTheme } from '@/shared/theme/theme';
import { useThemeStyles } from '@/shared/theme/useThemeStyles';
import {
  fontFamilies,
  radii,
  shadows,
  spacing,
  typography,
} from '@/shared/theme/tokens';
import type { RootStackParamList } from '@/navigation/types';
import { useBankStore } from '@/state/bank.store';
import { normaliseFolderName } from '@/state/folder.store';
import type { ThemeColors } from '@/shared/theme/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'FolderDetail'>;

const FolderDetailScreen: React.FC<Props> = ({ route, navigation }) => {
  const { folderName } = route.params;
  const styles = useThemeStyles(createStyles);
  const { colors } = useTheme();

  const { items, loadBank } = useBankStore();

  useEffect(() => {
    loadBank().catch(() => undefined);
  }, [loadBank]);

  const folderKey = useMemo(
    () => normaliseFolderName(folderName).toLowerCase(),
    [folderName],
  );

  const words = useMemo(
    () =>
      items.filter(item =>
        item.folders.some(folder => normaliseFolderName(folder).toLowerCase() === folderKey),
      ),
    [items, folderKey],
  );

  return (
    <ScreenContainer style={styles.screen}>
      <FlatList
        data={words}
        keyExtractor={item => item.id}
        contentContainerStyle={[
          styles.content,
          words.length === 0 && styles.emptyContent,
        ]}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.headerTopRow}>
              <Pressable
                onPress={() => navigation.goBack()}
                style={({ pressed }) => [
                  styles.backButton,
                  pressed && styles.backButtonPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Go back"
              >
                <Text style={styles.backButtonLabel}>Back</Text>
              </Pressable>
            </View>
            <Text style={styles.headerTitle}>{folderName}</Text>
            <Text style={styles.headerSubtitle}>
              {words.length === 1 ? '1 word' : `${words.length} words`}
            </Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No words yet</Text>
            <Text style={styles.emptySubtitle}>
              Add vocabulary to this folder from the Word Bank to see it here.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => navigation.navigate('WordDetail', { itemId: item.id })}
            style={({ pressed }) => [
              styles.wordCard,
              pressed && { backgroundColor: colors.surfaceMuted },
            ]}
          >
            <View style={styles.wordHeader}>
              <View style={styles.wordTitleGroup}>
                <Text style={styles.wordTerm}>{item.term}</Text>
                {item.reading ? <Text style={styles.wordReading}>{item.reading}</Text> : null}
              </View>
              <Text style={styles.wordLevel}>{item.level}</Text>
            </View>
            <Text style={styles.wordMeaning}>{item.meaning}</Text>
            <View style={styles.wordFoldersRow}>
              {item.folders.length === 0 ? (
                <View style={styles.wordFolderChipMuted}>
                  <Text style={styles.wordFolderChipLabelMuted}>Unassigned</Text>
                </View>
              ) : (
                item.folders.map(folder => {
                  const normalised = normaliseFolderName(folder).toLowerCase();
                  const isActive = normalised === folderKey;
                  return (
                    <View
                      key={folder}
                      style={[
                        styles.wordFolderChip,
                        isActive && styles.wordFolderChipActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.wordFolderChipLabel,
                          isActive && styles.wordFolderChipLabelActive,
                        ]}
                      >
                        {folder}
                      </Text>
                    </View>
                  );
                })
              )}
            </View>
          </Pressable>
        )}
      />
    </ScreenContainer>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      paddingHorizontal: spacing.screenHorizontal,
      paddingBottom: spacing.block * 2,
      gap: spacing.base,
    },
    emptyContent: {
      flexGrow: 1,
      justifyContent: 'center',
    },
    header: {
      paddingTop: spacing.block,
      paddingBottom: spacing.base,
      gap: 4,
    },
    headerTopRow: {
      flexDirection: 'row',
      justifyContent: 'flex-start',
      marginBottom: spacing.base / 2,
    },
    backButton: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: radii.control,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    backButtonPressed: {
      backgroundColor: colors.surfaceMuted,
    },
    backButtonLabel: {
      ...typography.caption,
      color: colors.textPrimary,
      fontFamily: fontFamilies.sans.medium,
    },
    headerTitle: {
      ...typography.title,
      color: colors.textPrimary,
      fontFamily: fontFamilies.plexSerif.semibold,
    },
    headerSubtitle: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    wordCard: {
      borderRadius: radii.surface,
      backgroundColor: colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      padding: 16,
      gap: 8,
      ...shadows.card,
    },
    wordHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: spacing.base,
    },
    wordTitleGroup: {
      flexShrink: 1,
    },
    wordTerm: {
      ...typography.subhead,
      color: colors.textPrimary,
      fontFamily: fontFamilies.plexSerif.semibold,
    },
    wordReading: {
      ...typography.caption,
      color: colors.textSecondary,
      marginTop: 2,
    },
    wordLevel: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    wordMeaning: {
      ...typography.body,
      color: colors.textPrimary,
    },
    wordFoldersRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    wordFolderChip: {
      borderRadius: radii.pill,
      backgroundColor: colors.surfaceMuted,
      paddingVertical: 4,
      paddingHorizontal: 10,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    wordFolderChipActive: {
      backgroundColor: colors.accentSoft,
      borderColor: colors.accent,
    },
    wordFolderChipLabel: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    wordFolderChipLabelActive: {
      color: colors.accent,
      fontFamily: fontFamilies.sans.medium,
    },
    wordFolderChipMuted: {
      borderRadius: radii.pill,
      backgroundColor: colors.surfaceMuted,
      paddingVertical: 4,
      paddingHorizontal: 10,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    wordFolderChipLabelMuted: {
      ...typography.caption,
      color: colors.textSecondary,
      fontStyle: 'italic',
    },
    emptyState: {
      alignItems: 'center',
      paddingVertical: spacing.block,
      paddingHorizontal: spacing.screenHorizontal,
      gap: 8,
    },
    emptyTitle: {
      ...typography.subhead,
      color: colors.textPrimary,
    },
    emptySubtitle: {
      ...typography.caption,
      color: colors.textSecondary,
      textAlign: 'center',
    },
  });

export default FolderDetailScreen;
