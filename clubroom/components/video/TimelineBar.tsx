import { useState, useCallback, useMemo } from 'react';
import { View, StyleSheet, Dimensions, GestureResponderEvent } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

import { Clickable } from '@/components/primitives/clickable';
import { AnnotationMarker } from './AnnotationMarker';
import { Spacing, Radii, withAlpha, Shadows } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { VideoAnnotation } from '@/constants/types';

import {
  TimelineLabels,
  TimelineGroupedMarker,
  TimelineActiveIndicator,
  CompactTimelineInner,
} from './timeline-bar-sections';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface TimelineBarProps {
  duration: number;
  currentTime: number;
  annotations: VideoAnnotation[];
  onSeek: (time: number) => void;
  onAnnotationPress?: (annotation: VideoAnnotation) => void;
  height?: number;
  showLabels?: boolean;
  interactive?: boolean;
}

export function TimelineBar({
  duration,
  currentTime,
  annotations,
  onSeek,
  onAnnotationPress,
  height = 40,
  showLabels = true,
  interactive = true,
}: TimelineBarProps) {
  const { colors: palette, scheme } = useTheme();
  const [timelineWidth, setTimelineWidth] = useState(SCREEN_WIDTH - Spacing.lg * 2);

  useSharedValue(0);

  const getPositionFromTime = useCallback(
    (time: number): number => {
      if (duration === 0) return 0;
      return (time / duration) * 100;
    },
    [duration]
  );

  const handleTimelinePress = useCallback(
    (event: GestureResponderEvent) => {
      if (!interactive) return;
      const { locationX } = event.nativeEvent;
      const time = timelineWidth === 0 || duration === 0 ? 0 : (locationX / timelineWidth) * duration;
      onSeek(Math.max(0, Math.min(duration, time)));
    },
    [interactive, timelineWidth, duration, onSeek]
  );

  const handleLayout = useCallback((event: { nativeEvent: { layout: { width: number } } }) => {
    setTimelineWidth(event.nativeEvent.layout.width);
  }, []);

  const progressPercentage = getPositionFromTime(currentTime);

  const animatedProgressStyle = useAnimatedStyle(() => ({
    width: `${progressPercentage}%`,
  }));

  const activeAnnotation = useMemo(() => {
    return annotations.find((ann) => Math.abs(currentTime - ann.timestamp) < 2);
  }, [annotations, currentTime]);

  const groupedAnnotations = useMemo(() => {
    const minDistance = 3;
    const sorted = [...annotations].sort((a, b) => a.timestamp - b.timestamp);
    const groups: { position: number; annotations: VideoAnnotation[] }[] = [];

    for (const ann of sorted) {
      const position = getPositionFromTime(ann.timestamp);
      const lastGroup = groups[groups.length - 1];

      if (lastGroup && position - lastGroup.position < minDistance) {
        lastGroup.annotations.push(ann);
      } else {
        groups.push({ position, annotations: [ann] });
      }
    }

    return groups;
  }, [annotations, getPositionFromTime]);

  return (
    <View style={[styles.container, { height }]}>
      {showLabels && (
        <TimelineLabels currentTime={currentTime} duration={duration} palette={palette} />
      )}

      <Clickable
        onPress={handleTimelinePress}
        disabled={!interactive}
        style={styles.timelineWrapper}
        accessibilityRole="button"
        accessibilityLabel="Seek video timeline"
        accessibilityState={{ disabled: !interactive }}
      >
        <View
          style={[styles.track, { backgroundColor: withAlpha(palette.muted, 0.19) }]}
          onLayout={handleLayout}
        >
          <Animated.View
            style={[styles.progress, { backgroundColor: palette.tint }, animatedProgressStyle]}
          />

          {groupedAnnotations.map((group, index) => {
            if (group.annotations.length === 1) {
              const ann = group.annotations[0];
              return (
                <AnnotationMarker
                  key={ann.id}
                  annotation={ann}
                  position={group.position}
                  isActive={activeAnnotation?.id === ann.id}
                  onPress={() => onAnnotationPress?.(ann)}
                  showTooltip
                  size="medium"
                />
              );
            }

            return (
              <TimelineGroupedMarker
                key={`group-${index}`}
                position={group.position}
                annotations={group.annotations}
                onAnnotationPress={onAnnotationPress}
                palette={palette}
              />
            );
          })}

          <View
            style={[
              styles.playhead,
              {
                left: `${progressPercentage}%`,
                backgroundColor: palette.tint,
                ...Shadows[scheme].subtle,
              },
            ]}
          />
        </View>
      </Clickable>

      {activeAnnotation && (
        <TimelineActiveIndicator
          annotation={activeAnnotation}
          onPress={() => onAnnotationPress?.(activeAnnotation)}
          palette={palette}
        />
      )}
    </View>
  );
}

// Backward compat wrapper
export function CompactTimeline(props: {
  duration: number;
  currentTime: number;
  annotations: VideoAnnotation[];
  onSeek?: (time: number) => void;
}) {
  const { colors: palette } = useTheme();
  return <CompactTimelineInner {...props} palette={palette} />;
}

const styles = StyleSheet.create({
  container: { gap: Spacing.xs },
  timelineWrapper: { flex: 1, justifyContent: 'center' },
  track: {
    height: 6,
    borderRadius: Radii.xs,
    overflow: 'visible',
    position: 'relative',
  },
  progress: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: Radii.xs,
  },
  playhead: {
    position: 'absolute',
    width: 4,
    height: 16,
    borderRadius: Radii.xs,
    top: -5,
    marginLeft: -2,
  },
});
