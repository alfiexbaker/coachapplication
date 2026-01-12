/**
 * TimelineBar Component
 *
 * A visual timeline showing video progress with annotation markers.
 * Supports seeking, marker interaction, and zoom controls.
 */

import { useState, useCallback, useMemo } from 'react';
import { View, StyleSheet, Dimensions, Pressable, GestureResponderEvent } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { AnnotationMarker, CompactAnnotationMarker } from './AnnotationMarker';
import { Colors, Spacing, Radii } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ANNOTATION_TYPE_CONFIG } from '@/services/annotation-service';
import type { VideoAnnotation, VideoAnnotationType } from '@/constants/types';

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
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const [timelineWidth, setTimelineWidth] = useState(SCREEN_WIDTH - Spacing.lg * 2);
  const [isDragging, setIsDragging] = useState(false);

  const progressWidth = useSharedValue(0);

  const formatTimestamp = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getPositionFromTime = useCallback(
    (time: number): number => {
      if (duration === 0) return 0;
      return (time / duration) * 100;
    },
    [duration]
  );

  const getTimeFromPosition = useCallback(
    (position: number, width: number): number => {
      if (width === 0 || duration === 0) return 0;
      return (position / width) * duration;
    },
    [duration]
  );

  const handleTimelinePress = useCallback(
    (event: GestureResponderEvent) => {
      if (!interactive) return;

      const { locationX } = event.nativeEvent;
      const time = getTimeFromPosition(locationX, timelineWidth);
      onSeek(Math.max(0, Math.min(duration, time)));
    },
    [interactive, timelineWidth, duration, getTimeFromPosition, onSeek]
  );

  const handleLayout = useCallback((event: { nativeEvent: { layout: { width: number } } }) => {
    setTimelineWidth(event.nativeEvent.layout.width);
  }, []);

  const progressPercentage = getPositionFromTime(currentTime);

  const animatedProgressStyle = useAnimatedStyle(() => ({
    width: `${progressPercentage}%`,
  }));

  const activeAnnotation = useMemo(() => {
    return annotations.find(
      (ann) => Math.abs(currentTime - ann.timestamp) < 2
    );
  }, [annotations, currentTime]);

  // Group annotations that are too close together
  const groupedAnnotations = useMemo(() => {
    const minDistance = 3; // Minimum 3% distance between markers
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
      {/* Time labels */}
      {showLabels && (
        <View style={styles.labelsRow}>
          <ThemedText style={[styles.timeLabel, { color: palette.muted }]}>
            {formatTimestamp(currentTime)}
          </ThemedText>
          <ThemedText style={[styles.timeLabel, { color: palette.muted }]}>
            {formatTimestamp(duration)}
          </ThemedText>
        </View>
      )}

      {/* Timeline track */}
      <Pressable
        onPress={handleTimelinePress}
        disabled={!interactive}
        style={styles.timelineWrapper}
      >
        <View
          style={[styles.track, { backgroundColor: `${palette.muted}30` }]}
          onLayout={handleLayout}
        >
          {/* Progress bar */}
          <Animated.View
            style={[
              styles.progress,
              { backgroundColor: palette.tint },
              animatedProgressStyle,
            ]}
          />

          {/* Annotation markers */}
          {groupedAnnotations.map((group, index) => {
            if (group.annotations.length === 1) {
              const ann = group.annotations[0];
              const isActive = activeAnnotation?.id === ann.id;

              return (
                <AnnotationMarker
                  key={ann.id}
                  annotation={ann}
                  position={group.position}
                  isActive={isActive}
                  onPress={() => onAnnotationPress?.(ann)}
                  showTooltip
                  size="medium"
                />
              );
            }

            // Grouped markers
            return (
              <View
                key={`group-${index}`}
                style={[styles.groupedMarkers, { left: `${group.position}%` }]}
              >
                <View style={[styles.groupBadge, { backgroundColor: palette.tint }]}>
                  <ThemedText style={styles.groupCount}>
                    {group.annotations.length}
                  </ThemedText>
                </View>
                <View style={styles.groupStack}>
                  {group.annotations.slice(0, 3).map((ann, annIndex) => (
                    <CompactAnnotationMarker
                      key={ann.id}
                      type={ann.type}
                      onPress={() => onAnnotationPress?.(ann)}
                    />
                  ))}
                </View>
              </View>
            );
          })}

          {/* Playhead */}
          <View
            style={[
              styles.playhead,
              {
                left: `${progressPercentage}%`,
                backgroundColor: palette.tint,
              },
            ]}
          />
        </View>
      </Pressable>

      {/* Active annotation indicator */}
      {activeAnnotation && (
        <Clickable
          onPress={() => onAnnotationPress?.(activeAnnotation)}
          style={[
            styles.activeIndicator,
            {
              backgroundColor: ANNOTATION_TYPE_CONFIG[activeAnnotation.type].color,
            },
          ]}
        >
          <Ionicons
            name={ANNOTATION_TYPE_CONFIG[activeAnnotation.type].icon as keyof typeof Ionicons.glyphMap}
            size={12}
            color="#fff"
          />
          <ThemedText style={styles.activeLabel} numberOfLines={1}>
            {activeAnnotation.label}
          </ThemedText>
        </Clickable>
      )}
    </View>
  );
}

/**
 * Compact timeline for use in smaller spaces
 */
interface CompactTimelineProps {
  duration: number;
  currentTime: number;
  annotations: VideoAnnotation[];
  onSeek?: (time: number) => void;
}

export function CompactTimeline({
  duration,
  currentTime,
  annotations,
  onSeek,
}: CompactTimelineProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <View style={styles.compactContainer}>
      <View style={[styles.compactTrack, { backgroundColor: `${palette.muted}30` }]}>
        <View
          style={[
            styles.compactProgress,
            { backgroundColor: palette.tint, width: `${progress}%` },
          ]}
        />
        {annotations.map((ann) => (
          <View
            key={ann.id}
            style={[
              styles.compactMarker,
              {
                left: `${(ann.timestamp / duration) * 100}%`,
                backgroundColor: ANNOTATION_TYPE_CONFIG[ann.type].color,
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.xs,
  },
  labelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  timeLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  timelineWrapper: {
    flex: 1,
    justifyContent: 'center',
  },
  track: {
    height: 6,
    borderRadius: 3,
    overflow: 'visible',
    position: 'relative',
  },
  progress: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 3,
  },
  playhead: {
    position: 'absolute',
    width: 4,
    height: 16,
    borderRadius: 2,
    top: -5,
    marginLeft: -2,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  groupedMarkers: {
    position: 'absolute',
    alignItems: 'center',
    top: -20,
  },
  groupBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  groupCount: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  groupStack: {
    flexDirection: 'row',
    gap: -6,
  },
  activeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radii.sm,
    gap: 4,
  },
  activeLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
    maxWidth: 150,
  },
  compactContainer: {
    height: 4,
  },
  compactTrack: {
    flex: 1,
    borderRadius: 2,
    position: 'relative',
    overflow: 'hidden',
  },
  compactProgress: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
  },
  compactMarker: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
    top: 0,
    marginLeft: -2,
  },
});
