import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme, type ThemeMode } from '@/shared/theme/theme';
import { spacing, radii, typography, fontFamilies } from '@/shared/theme/tokens';

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
}

const THUMB_SIZE = 20;

export const DiscreteSlider: React.FC<DiscreteSliderProps> = ({
  min,
  max,
  step,
  value,
  onChange,
  markers,
}) => {
  const { colors, mode } = useTheme();
  const styles = useMemo(() => createStyles(colors, mode), [colors, mode]);
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

const createStyles = (colors: ReturnType<typeof useTheme>['colors'], mode: ThemeMode = 'light') =>
  StyleSheet.create({
    configSliderContainer: {
        marginTop: spacing.base / 2,
        marginBottom: spacing.base,
    },
    configSliderTrackWrapper: {
        height: 32,
        justifyContent: 'center',
    },
    configSliderTrack: {
        height: 6,
        borderRadius: 3,
        backgroundColor: colors.surfaceMuted,
        overflow: 'hidden',
    },
    configSliderProgress: {
        height: 6,
        backgroundColor: colors.accent,
        borderRadius: 3,
    },
    configSliderThumb: {
        position: 'absolute',
        top: 6,
        width: THUMB_SIZE,
        height: THUMB_SIZE,
        borderRadius: THUMB_SIZE / 2,
        backgroundColor: colors.accent,
        borderWidth: 2,
        borderColor: colors.background,
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