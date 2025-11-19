import React, { memo } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { useTheme } from '../theme/theme';

interface LanguageFlagButtonProps {
  glyph?: string;
  onPress: () => void;
}

const LanguageFlagButton: React.FC<LanguageFlagButtonProps> = ({ glyph = '🏳️', onPress }) => {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Switch study language"
      onPress={onPress}
      style={({ pressed }) => [
        styles.container,
        { borderColor: colors.border, backgroundColor: colors.surface },
        pressed && { opacity: 0.7 },
      ]}
    >
      <Text style={styles.flagGlyph}>{glyph}</Text>
    </Pressable>
  );
};

export default memo(LanguageFlagButton);

const styles = StyleSheet.create({
  container: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  flagGlyph: {
    fontSize: 24,
    lineHeight: 28,
  },
});
