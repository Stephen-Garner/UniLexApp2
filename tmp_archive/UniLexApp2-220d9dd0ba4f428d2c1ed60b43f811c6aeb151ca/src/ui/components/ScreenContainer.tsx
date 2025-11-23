import React from 'react';
import type { ReactNode } from 'react';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '../theme/theme';

type ScreenContainerProps = {
  children: ReactNode;
  edges?: Edge[];
  style?: StyleProp<ViewStyle>;
  backgroundColor?: string;
};

const DEFAULT_EDGES: Edge[] = ['top', 'left', 'right'];

const ScreenContainer: React.FC<ScreenContainerProps> = ({
  children,
  edges = DEFAULT_EDGES,
  style,
  backgroundColor,
}) => {
  const { colors } = useTheme();
  return (
    <SafeAreaView
      edges={edges}
      style={[styles.safeArea, { backgroundColor: backgroundColor ?? colors.background }, style]}
      mode="padding"
    >
      {children}
    </SafeAreaView>
  );
};

export default ScreenContainer;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
});
