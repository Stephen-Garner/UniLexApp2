import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, Image } from 'react-native';
import { radii, typography, fontFamilies } from '../theme/tokens';
import { useTheme, type ThemeColors } from '../theme/theme';

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  onProfilePress: () => void;
  leftAccessory?: React.ReactNode;
}

const ScreenHeader: React.FC<ScreenHeaderProps> = ({
  title,
  subtitle,
  onProfilePress,
  leftAccessory,
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.container}>
      <View style={styles.leftSlot}>
        {leftAccessory ?? <View style={styles.placeholder} />}
      </View>
      <View style={styles.centerSlot}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      <TouchableOpacity
        style={styles.profileButton}
        accessibilityRole="button"
        accessibilityLabel="Open profile and settings"
        onPress={onProfilePress}
      >
        <Image
          source={require('../../../assets/icons/settings-line.png')}
          style={[styles.profileIcon, { tintColor: colors.textPrimary }]}
        />
      </TouchableOpacity>
    </View>
  );
};

export default ScreenHeader;

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      gap: 12,
    },
    leftSlot: {
      width: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    placeholder: {
      width: 32,
      height: 32,
    },
    centerSlot: {
      flex: 1,
      alignItems: 'center',
    },
    title: {
      ...typography.headline,
      fontFamily: fontFamilies.plexSerif.semibold,
      fontWeight: 'normal',
      color: colors.textPrimary,
    },
    subtitle: {
      ...typography.caption,
      fontFamily: fontFamilies.plexSerif.regular,
      color: colors.textSecondary,
      marginTop: 4,
    },
    profileButton: {
      width: 40,
      height: 40,
      borderRadius: radii.pill,
      backgroundColor: 'transparent',
      alignItems: 'center',
      justifyContent: 'center',
    },
    profileIcon: {
      width: 24,
      height: 24,
      resizeMode: 'contain',
    },
  });
