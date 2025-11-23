import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/shared/theme/theme';
import { spacing, radii, typography, fontFamilies } from '@/shared/theme/tokens';

type Props = {
  visible: boolean;
  message: string;
  onUndo: () => void;
};

const UndoToast: React.FC<Props> = ({ visible, message, onUndo }) => {
  const { colors } = useTheme();

  if (!visible) {
    return null;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[styles.message, { color: colors.textPrimary }]}>{message}</Text>
      <Pressable onPress={onUndo} style={styles.button}>
        <Text style={[styles.buttonLabel, { color: colors.accent }]}>Undo</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: spacing.base * 2,
    left: spacing.screenHorizontal,
    right: spacing.screenHorizontal,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.base * 1.5,
    borderRadius: radii.surface,
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  message: {
    fontFamily: fontFamilies.sans.regular,
    fontSize: typography.caption.fontSize,
    flex: 1,
  },
  button: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.base * 0.5,
  },
  buttonLabel: {
    fontFamily: fontFamilies.sans.medium,
    fontSize: typography.caption.fontSize,
  },
});

export default UndoToast;
