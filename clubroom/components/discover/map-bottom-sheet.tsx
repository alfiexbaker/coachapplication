/**
 * MapBottomSheet Component — Sprint 8C
 *
 * A drag-handle bottom sheet overlay for the map view.
 * Shows a horizontal coach card carousel that can expand to a full list.
 * Pure React Native — no native gesture handler required.
 */

import { useRef, useState } from 'react';
import { PanResponder, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { MapCoach } from './map-view-placeholder';
import { MiniCoachCard } from './map-coach-card';
import { CoachListRow } from './map-coach-list-row';

// ─── Types ──────────────────────────────────────────────────────────────────

interface MapBottomSheetProps {
  coaches: MapCoach[];
  selectedCoachId?: string;
  onCoachSelect?: (coachId: string) => void;
  onBookNow?: (coachId: string) => void;
  expanded?: boolean;
  onToggleExpand?: () => void;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const COLLAPSED_HEIGHT = 180;
const EXPANDED_HEIGHT = 480;

// ─── Component ──────────────────────────────────────────────────────────────

export function MapBottomSheet({
  coaches,
  selectedCoachId,
  onCoachSelect,
  onBookNow,
  expanded: controlledExpanded,
  onToggleExpand,
}: MapBottomSheetProps) {
  const { colors: palette } = useTheme();
  const [internalExpanded, setInternalExpanded] = useState(false);

  const expanded = controlledExpanded ?? internalExpanded;
  const toggleExpand = onToggleExpand ?? (() => setInternalExpanded((p) => !p));

  const sheetHeight = useSharedValue(COLLAPSED_HEIGHT);
  const sheetAnimStyle = useAnimatedStyle(() => ({ height: sheetHeight.value }));

  // Simple drag-to-expand via PanResponder
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dy) > 5,
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dy < -40) {
          sheetHeight.value = withSpring(EXPANDED_HEIGHT, { damping: 18, stiffness: 200 });
          if (!expanded) toggleExpand();
        } else if (gesture.dy > 40) {
          sheetHeight.value = withSpring(COLLAPSED_HEIGHT, { damping: 18, stiffness: 200 });
          if (expanded) toggleExpand();
        }
      },
    }),
  ).current;

  return (
    <Animated.View
      style={[styles.sheet, { backgroundColor: palette.surface, borderColor: palette.border, shadowColor: palette.text }, sheetAnimStyle]}
    >
      {/* Drag handle */}
      <View {...panResponder.panHandlers} style={styles.handleArea}>
        <View style={[styles.dragHandle, { backgroundColor: palette.border }]} />
        <ThemedText style={[styles.sheetTitle, { color: palette.text }]}>
          {coaches.length} coach{coaches.length !== 1 ? 'es' : ''} nearby
        </ThemedText>
      </View>

      {/* Carousel (collapsed) or List (expanded) */}
      {!expanded ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.carouselContent}
          decelerationRate="fast"
          snapToInterval={260 + Spacing.sm}
          snapToAlignment="start"
        >
          {coaches.map((coach) => (
            <MiniCoachCard
              key={coach.id}
              coach={coach}
              isSelected={coach.id === selectedCoachId}
              onPress={() => onCoachSelect?.(coach.id)}
              onBookNow={() => onBookNow?.(coach.id)}
              palette={palette}
            />
          ))}
        </ScrollView>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.listContent}>
          {coaches.map((coach) => (
            <CoachListRow
              key={coach.id}
              coach={coach}
              isSelected={coach.id === selectedCoachId}
              onPress={() => onCoachSelect?.(coach.id)}
              onBookNow={() => onBookNow?.(coach.id)}
              palette={palette}
            />
          ))}
        </ScrollView>
      )}
    </Animated.View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  sheet: { borderTopLeftRadius: Radii.card, borderTopRightRadius: Radii.card, borderWidth: 1, borderBottomWidth: 0, shadowOpacity: 0.1, shadowRadius: 12, shadowOffset: { width: 0, height: -4 }, elevation: 8, overflow: 'hidden' },
  handleArea: { alignItems: 'center', paddingTop: Spacing.xs, paddingBottom: Spacing.sm, gap: Spacing.xs },
  dragHandle: { width: 36, height: 4, borderRadius: Radii.pill },
  sheetTitle: { ...Typography.bodySemiBold },
  carouselContent: { paddingHorizontal: Spacing.sm, gap: Spacing.sm },
  listContent: { paddingBottom: Spacing.lg },
});
