/**
 * AnnotationMarker Component
 *
 * A visual marker displayed on the video timeline to indicate an annotation point.
 * Supports different colors based on annotation type and interactive tooltips.
 */

import { useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography , withAlpha, Shadows } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { ANNOTATION_TYPE_CONFIG } from '@/services/video-service';
import type { VideoAnnotation, VideoAnnotationType } from '@/constants/types';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface AnnotationMarkerProps {
  annotation: VideoAnnotation;
  position: number; // 0-100 percentage position on timeline
  isActive?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
  showTooltip?: boolean;
  size?: 'small' | 'medium' | 'large';
}

export function AnnotationMarker({
  annotation,
  position,
  isActive = false,
  onPress,
  onLongPress,
  showTooltip = false,
  size = 'medium',
}: AnnotationMarkerProps) {
  const { colors: palette, scheme } = useTheme();
  const [tooltipVisible, setTooltipVisible] = useState(false);

  const typeConfig = ANNOTATION_TYPE_CONFIG[annotation.type];
  const scale = useSharedValue(1);

  const sizeMap = {
    small: { marker: 8, icon: 10 },
    medium: { marker: 12, icon: 14 },
    large: { marker: 16, icon: 18 },
  };

  const dimensions = sizeMap[size];

  const animatedMarkerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(1.3, { damping: 15, stiffness: 300 });
    if (showTooltip) {
      setTooltipVisible(true);
    }
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
    if (showTooltip) {
      setTimeout(() => setTooltipVisible(false), 2000);
    }
  };

  const formatTimestamp = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <View style={[styles.container, { left: `${position}%` }]}>
      {/* Tooltip */}
      {tooltipVisible && (
        <Animated.View
          entering={FadeIn.duration(150)}
          exiting={FadeOut.duration(150)}
          style={[
            styles.tooltip,
            {
              backgroundColor: palette.surface,
              borderColor: typeConfig.color,
              ...Shadows[scheme].subtle,
            },
          ]}
        >
          <View style={styles.tooltipHeader}>
            <View style={[styles.tooltipBadge, { backgroundColor: withAlpha(typeConfig.color, 0.12) }]}>
              <Ionicons name={typeConfig.icon as keyof typeof Ionicons.glyphMap} size={12} color={typeConfig.color} />
            </View>
            <ThemedText style={styles.tooltipTime}>
              {formatTimestamp(annotation.timestamp)}
            </ThemedText>
          </View>
          <ThemedText style={styles.tooltipLabel} numberOfLines={2}>
            {annotation.label}
          </ThemedText>
          {annotation.note && (
            <ThemedText style={[styles.tooltipNote, { color: palette.muted }]} numberOfLines={1}>
              {annotation.note}
            </ThemedText>
          )}
        </Animated.View>
      )}

      {/* Marker */}
      <AnimatedPressable
        onPress={onPress}
        onLongPress={onLongPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[
          styles.marker,
          animatedMarkerStyle,
          {
            width: dimensions.marker,
            height: dimensions.marker,
            borderRadius: dimensions.marker / 2,
            backgroundColor: typeConfig.color,
            borderColor: isActive ? palette.onPrimary : 'transparent',
            borderWidth: isActive ? 2 : 0,
            ...Shadows[scheme].subtle,
          },
        ]}
      >
        {size === 'large' && (
          <Ionicons
            name={typeConfig.icon as keyof typeof Ionicons.glyphMap}
            size={dimensions.icon - 6}
            color={palette.onPrimary}
          />
        )}
      </AnimatedPressable>

      {/* Active indicator line */}
      {isActive && (
        <View style={[styles.activeLine, { backgroundColor: typeConfig.color }]} />
      )}
    </View>
  );
}

/**
 * Compact marker for use in tight spaces
 */
interface CompactMarkerProps {
  type: VideoAnnotationType;
  onPress?: () => void;
}

export function CompactAnnotationMarker({ type, onPress }: CompactMarkerProps) {
  const { colors: palette } = useTheme();
  const typeConfig = ANNOTATION_TYPE_CONFIG[type];

  return (
    <Pressable
      onPress={onPress}
      style={[styles.compactMarker, { backgroundColor: typeConfig.color }]}
    >
      <Ionicons name={typeConfig.icon as keyof typeof Ionicons.glyphMap} size={10} color={palette.onPrimary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    alignItems: 'center',
    zIndex: 10,
  },
  marker: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeLine: {
    position: 'absolute',
    width: 2,
    height: 30,
    top: '100%',
    marginTop: Spacing.micro,
  },
  tooltip: {
    position: 'absolute',
    bottom: '100%',
    marginBottom: Spacing.xs,
    minWidth: 120,
    maxWidth: 180,
    padding: Spacing.sm,
    borderRadius: Radii.sm,
    borderWidth: 1,
  },
  tooltipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.xxs,
  },
  tooltipBadge: {
    width: 20,
    height: 20,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tooltipTime: {
    ...Typography.caption,
    fontWeight: '600',
  },
  tooltipLabel: {
    ...Typography.smallSemiBold,
  },
  tooltipNote: {
    ...Typography.caption,
    marginTop: Spacing.micro,
  },
  compactMarker: {
    width: 18,
    height: 18,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
