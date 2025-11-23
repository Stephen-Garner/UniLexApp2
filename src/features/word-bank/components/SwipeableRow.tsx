import React, { useRef } from 'react';
import { Animated, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/shared/theme/theme';
import { radii } from '@/shared/theme/tokens';

type Props = {
  children: React.ReactNode;
  onDelete: () => void;
  disabled?: boolean;
};

const SwipeableRow: React.FC<Props> = ({ children, onDelete, disabled = false }) => {
  const { colors } = useTheme();
  const translateX = useRef(new Animated.Value(0)).current;
  const threshold = 80;

  const close = () => {
    Animated.spring(translateX, {
      toValue: 0,
      useNativeDriver: true,
      friction: 8,
    }).start();
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) =>
        !disabled && Math.abs(gesture.dx) > 10 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
      onPanResponderMove: (_, gesture) => {
        if (!disabled) {
          translateX.setValue(gesture.dx);
        }
      },
      onPanResponderRelease: (_, gesture) => {
        if (disabled) {
          return;
        }
        if (gesture.dx < -threshold) {
          Animated.spring(translateX, {
            toValue: -100,
            useNativeDriver: true,
            friction: 8,
          }).start();
        } else {
          close();
        }
      },
    }),
  ).current;

  return (
    <View style={styles.container}>
      <View style={[styles.deleteRail, { backgroundColor: colors.error }]}>
        <Pressable
          onPress={() => {
            onDelete();
            close();
          }}
          style={styles.deleteRailButton}
          accessibilityRole="button"
          accessibilityLabel="Delete"
        >
          <Text style={styles.deleteRailLabel}>✕</Text>
        </Pressable>
      </View>
      <Animated.View
        style={[styles.content, { transform: [{ translateX }] }]}
        {...panResponder.panHandlers}
      >
        {children}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    marginBottom: 12,
  },
  deleteRail: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    width: 100,
    borderRadius: radii.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteRailButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteRailLabel: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  content: {
    backgroundColor: 'transparent',
  },
});

export default SwipeableRow;
