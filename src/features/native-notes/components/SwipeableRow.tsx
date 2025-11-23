import React, { useMemo, useState, useCallback } from 'react';
import { Animated, Pressable, StyleSheet, Text, View, PanResponder } from 'react-native';
import { useThemeStyles } from '@/shared/theme/useThemeStyles';
import { radii, typography, shadows } from '@/shared/theme/tokens';

const SWIPE_OPEN_VALUE = -84;
const SWIPE_THRESHOLD = -50;

type Props = {
  children: React.ReactNode;
  onDelete: () => void;
  disabled?: boolean;
};

export const SwipeableRow: React.FC<Props> = ({ children, onDelete, disabled }) => {
  const styles = useThemeStyles(createStyles);
  const translateX = useMemo(() => new Animated.Value(0), []);
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => {
    Animated.timing(translateX, {
      toValue: SWIPE_OPEN_VALUE,
      duration: 160,
      useNativeDriver: true,
    }).start(() => setIsOpen(true));
  }, [translateX]);

  const close = useCallback(() => {
    Animated.timing(translateX, {
      toValue: 0,
      duration: 160,
      useNativeDriver: true,
    }).start(() => setIsOpen(false));
  }, [translateX]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !disabled,
        onMoveShouldSetPanResponder: (_, gesture) =>
          !disabled && Math.abs(gesture.dx) > Math.abs(gesture.dy),
        onPanResponderGrant: () => {
          translateX.stopAnimation();
        },
        onPanResponderMove: (_, gesture) => {
          const offset = isOpen ? SWIPE_OPEN_VALUE : 0;
          const nextValue = Math.max(SWIPE_OPEN_VALUE - 20, Math.min(0, gesture.dx + offset));
          translateX.setValue(nextValue);
        },
        onPanResponderRelease: (_, gesture) => {
          const offset = isOpen ? SWIPE_OPEN_VALUE : 0;
          const finalX = gesture.dx + offset;
          if (finalX < SWIPE_THRESHOLD) {
            open();
          } else {
            close();
          }
        },
        onPanResponderTerminate: () => {
          close();
        },
      }),
    [close, disabled, isOpen, open, translateX],
  );

  return (
    <View style={styles.swipeContainer}>
      <View style={styles.deleteRail}>
        <Pressable
          onPress={() => {
            onDelete();
            close();
          }}
          style={styles.deleteRailButton}
          accessibilityRole="button"
          accessibilityLabel="Delete"
        >
          <Text style={styles.deleteRailLabel}>X</Text>
        </Pressable>
      </View>
      <Animated.View
        style={[styles.swipeContent, { transform: [{ translateX }] }]}
        {...panResponder.panHandlers}
      >
        {children}
      </Animated.View>
    </View>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    swipeContainer: {
      position: 'relative',
      overflow: 'hidden',
      borderRadius: radii.surface,
    },
    deleteRail: {
      position: 'absolute',
      top: 0,
      right: 0,
      bottom: 0,
      width: Math.abs(SWIPE_OPEN_VALUE),
      justifyContent: 'center',
      alignItems: 'flex-end',
      backgroundColor: colors.background,
    },
    deleteRailButton: {
      width: Math.abs(SWIPE_OPEN_VALUE) - 8,
      height: '100%',
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.error,
      borderRadius: radii.surface,
      marginLeft: 8,
    },
    deleteRailLabel: {
      ...typography.headline,
      color: colors.textOnAccent,
    },
    swipeContent: {
      borderRadius: radii.surface,
      backgroundColor: colors.surface,
      ...shadows.card,
    },
  });
