/**
 * MapBottomSheet Component — Sprint 8C
 *
 * A drag-handle bottom sheet overlay for the map view.
 * Shows a horizontal coach card carousel that can expand to a full list.
 * Pure React Native — no native gesture handler required.
 */

import { useRef, useState } from 'react';
import {
  Animated as RNAnimated,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { Colors, Radii, Spacing, Typography, Components } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { MapCoach } from './map-view-placeholder';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MapBottomSheetProps {
  coaches: MapCoach[];
  selectedCoachId?: string;
  onCoachSelect?: (coachId: string) => void;
  onBookNow?: (coachId: string) => void;
  expanded?: boolean;
  onToggleExpand?: () => void;
}

// ---------------------------------------------------------------------------
// Mini Coach Card for carousel
// ---------------------------------------------------------------------------

function MiniCoachCard({
  coach,
  isSelected,
  onPress,
  onBookNow,
  palette,
}: {
  coach: MapCoach;
  isSelected: boolean;
  onPress: () => void;
  onBookNow: () => void;
  palette: (typeof Colors)['light'];
}) {
  return (
    <SurfaceCard
      onPress={onPress}
      style={[
        miniStyles.card,
        isSelected && { borderColor: palette.tint, borderWidth: 2 },
      ]}
    >
      <View style={miniStyles.row}>
        {/* Avatar placeholder */}
        <View
          style={[
            miniStyles.avatar,
            { backgroundColor: palette.surfaceSecondary },
          ]}
        >
          <Ionicons name="person" size={Components.icon.lg} color={palette.muted} />
        </View>

        {/* Info */}
        <View style={miniStyles.info}>
          <ThemedText style={[miniStyles.name, { color: palette.text }]} numberOfLines={1}>
            {coach.fullName}
          </ThemedText>

          <View style={miniStyles.metaRow}>
            <Ionicons name="star" size={Components.icon.sm} color={palette.warning} />
            <ThemedText style={[miniStyles.metaText, { color: palette.text }]}>
              {coach.rating.toFixed(1)}
            </ThemedText>
            <View style={[miniStyles.dot, { backgroundColor: palette.border }]} />
            <Ionicons name="location-outline" size={Components.icon.sm} color={palette.muted} />
            <ThemedText style={[miniStyles.metaText, { color: palette.muted }]}>
              {coach.distanceMiles.toFixed(1)} mi
            </ThemedText>
          </View>

          <ThemedText style={[miniStyles.price, { color: palette.text }]}>
            {'\u00A3'}{coach.pricePerHour}/hr
          </ThemedText>
        </View>

        {/* Book Now */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Book ${coach.fullName}`}
          onPress={onBookNow}
          style={({ pressed }) => [
            miniStyles.bookButton,
            {
              backgroundColor: pressed ? palette.tintPressed : palette.tint,
              opacity: pressed ? 0.9 : 1,
            },
          ]}
        >
          <ThemedText style={miniStyles.bookText} lightColor="#FFFFFF" darkColor="#FFFFFF">
            Book
          </ThemedText>
        </Pressable>
      </View>
    </SurfaceCard>
  );
}

const miniStyles = StyleSheet.create({
  card: {
    width: 260,
    padding: Spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  avatar: {
    width: Components.avatar.md,
    height: Components.avatar.md,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
    gap: Spacing.xs / 2,
  },
  name: {
    ...Typography.bodySemiBold,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs / 2,
  },
  metaText: {
    ...Typography.caption,
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: Radii.pill,
  },
  price: {
    ...Typography.bodySemiBold,
    fontWeight: '700',
  },
  bookButton: {
    height: Components.buttonCompact.height,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radii.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookText: {
    ...Typography.caption,
    fontWeight: '700',
  },
});

// ---------------------------------------------------------------------------
// Full List Coach Row (expanded view)
// ---------------------------------------------------------------------------

function CoachListRow({
  coach,
  isSelected,
  onPress,
  onBookNow,
  palette,
}: {
  coach: MapCoach;
  isSelected: boolean;
  onPress: () => void;
  onBookNow: () => void;
  palette: (typeof Colors)['light'];
}) {
  return (
    <Clickable onPress={onPress} accessibilityLabel={`Select ${coach.fullName}`}>
      <View
        style={[
          listStyles.row,
          { borderBottomColor: palette.border },
          isSelected && { backgroundColor: `${palette.tint}08` },
        ]}
      >
        <View
          style={[
            listStyles.avatar,
            { backgroundColor: palette.surfaceSecondary },
          ]}
        >
          <Ionicons name="person" size={Components.icon.lg} color={palette.muted} />
        </View>
        <View style={listStyles.info}>
          <ThemedText style={[listStyles.name, { color: palette.text }]}>{coach.fullName}</ThemedText>
          <View style={listStyles.meta}>
            <Ionicons name="star" size={Components.icon.sm} color={palette.warning} />
            <ThemedText style={[listStyles.metaText, { color: palette.muted }]}>
              {coach.rating.toFixed(1)} · {coach.distanceMiles.toFixed(1)} mi
            </ThemedText>
          </View>
        </View>
        <View style={listStyles.priceCol}>
          <ThemedText style={[listStyles.price, { color: palette.text }]}>
            {'\u00A3'}{coach.pricePerHour}/hr
          </ThemedText>
          <Pressable
            accessibilityRole="button"
            onPress={onBookNow}
            style={({ pressed }) => [
              listStyles.bookBtn,
              {
                backgroundColor: pressed ? palette.tintPressed : palette.tint,
                opacity: pressed ? 0.9 : 1,
              },
            ]}
          >
            <ThemedText style={listStyles.bookBtnText} lightColor="#FFFFFF" darkColor="#FFFFFF">
              Book Now
            </ThemedText>
          </Pressable>
        </View>
      </View>
    </Clickable>
  );
}

const listStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    borderBottomWidth: 1,
  },
  avatar: {
    width: Components.avatar.md,
    height: Components.avatar.md,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
    gap: Spacing.xs / 2,
  },
  name: {
    ...Typography.bodySemiBold,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs / 2,
  },
  metaText: {
    ...Typography.caption,
  },
  priceCol: {
    alignItems: 'flex-end',
    gap: Spacing.xs,
  },
  price: {
    ...Typography.bodySemiBold,
    fontWeight: '700',
  },
  bookBtn: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs / 2,
    borderRadius: Radii.button,
  },
  bookBtnText: {
    ...Typography.caption,
    fontWeight: '700',
  },
});

// ---------------------------------------------------------------------------
// Main Bottom Sheet
// ---------------------------------------------------------------------------

const COLLAPSED_HEIGHT = 180;
const EXPANDED_HEIGHT = 480;

export function MapBottomSheet({
  coaches,
  selectedCoachId,
  onCoachSelect,
  onBookNow,
  expanded: controlledExpanded,
  onToggleExpand,
}: MapBottomSheetProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const [internalExpanded, setInternalExpanded] = useState(false);

  const expanded = controlledExpanded ?? internalExpanded;
  const toggleExpand = onToggleExpand ?? (() => setInternalExpanded((p) => !p));

  const sheetHeight = useRef(new RNAnimated.Value(COLLAPSED_HEIGHT)).current;

  // Simple drag-to-expand via PanResponder
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dy) > 5,
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dy < -40) {
          // Swipe up — expand
          RNAnimated.spring(sheetHeight, {
            toValue: EXPANDED_HEIGHT,
            useNativeDriver: false,
            damping: 18,
            stiffness: 200,
          }).start();
          if (!expanded) toggleExpand();
        } else if (gesture.dy > 40) {
          // Swipe down — collapse
          RNAnimated.spring(sheetHeight, {
            toValue: COLLAPSED_HEIGHT,
            useNativeDriver: false,
            damping: 18,
            stiffness: 200,
          }).start();
          if (expanded) toggleExpand();
        }
      },
    }),
  ).current;

  return (
    <RNAnimated.View
      style={[
        styles.sheet,
        {
          height: sheetHeight,
          backgroundColor: palette.surface,
          borderColor: palette.border,
          shadowColor: palette.text,
        },
      ]}
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
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        >
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
    </RNAnimated.View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  sheet: {
    borderTopLeftRadius: Radii.card,
    borderTopRightRadius: Radii.card,
    borderWidth: 1,
    borderBottomWidth: 0,
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -4 },
    elevation: 8,
    overflow: 'hidden',
  },
  handleArea: {
    alignItems: 'center',
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.sm,
    gap: Spacing.xs,
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: Radii.pill,
  },
  sheetTitle: {
    ...Typography.bodySemiBold,
  },
  carouselContent: {
    paddingHorizontal: Spacing.sm,
    gap: Spacing.sm,
  },
  listContent: {
    paddingBottom: Spacing.lg,
  },
});
