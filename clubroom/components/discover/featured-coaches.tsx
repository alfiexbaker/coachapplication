/**
 * FeaturedCoaches Component — Sprint 8D
 *
 * "Featured Near You" section with horizontal scroll of coach cards.
 * Filters for verified coaches with 4.5+ ratings.
 * Includes auto-rotation of featured coaches on an interval.
 */

import { useEffect, useRef } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { Spacing, Typography, Components } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { CoachCardData } from '@/components/coach';
import { FeaturedCard, CARD_WIDTH } from './featured-coach-card';
import { MOCK_FEATURED_COACHES, MIN_FEATURED_RATING } from './featured-coaches-data';
import { Row } from '@/components/primitives';

// ─── Types ──────────────────────────────────────────────────────────────────

interface FeaturedCoachesProps {
  /** All available coaches — will be filtered to verified + 4.5+ */
  coaches?: CoachCardData[];
  onCoachPress?: (coachId: string) => void;
  onBookNow?: (coachId: string) => void;
  onSeeAll?: () => void;
  /** Auto-rotation interval in ms (0 to disable, default 5000) */
  autoRotateInterval?: number;
  favouriteIds?: string[];
  onToggleFavourite?: (coachId: string) => void;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function FeaturedCoaches({
  coaches,
  onCoachPress,
  onBookNow,
  onSeeAll,
  autoRotateInterval = 5000,
  favouriteIds = [],
  onToggleFavourite,
}: FeaturedCoachesProps) {
  const { colors: palette } = useTheme();
  const scrollRef = useRef<ScrollView>(null);
  const scrollIndexRef = useRef(0);

  // Filter to verified + high-rated coaches
  const filteredCoaches = (coaches ?? MOCK_FEATURED_COACHES).filter(
    (c) => c.verified && (c.rating ?? 0) >= MIN_FEATURED_RATING,
  );

  // Auto-rotation
  useEffect(() => {
    if (autoRotateInterval <= 0 || filteredCoaches.length <= 1) return;

    const interval = setInterval(() => {
      const nextIndex = (scrollIndexRef.current + 1) % filteredCoaches.length;
      scrollIndexRef.current = nextIndex;
      scrollRef.current?.scrollTo({ x: nextIndex * (CARD_WIDTH + Spacing.sm), animated: true });
    }, autoRotateInterval);

    return () => clearInterval(interval);
  }, [autoRotateInterval, filteredCoaches.length]);

  if (filteredCoaches.length === 0) return null;

  return (
    <View style={styles.container}>
      {/* Section header */}
      <Row style={styles.headerRow}>
        <Row style={styles.headerLeft}>
          <Ionicons name="location" size={Components.icon.lg} color={palette.tint} />
          <ThemedText style={[styles.headerTitle, { color: palette.text }]}>
            Featured Near You
          </ThemedText>
        </Row>
        {onSeeAll && (
          <Clickable onPress={onSeeAll} accessibilityLabel="See all featured coaches">
            <Row style={styles.seeAllRow}>
              <ThemedText style={[styles.seeAllText, { color: palette.tint }]}>See all</ThemedText>
              <Ionicons name="chevron-forward" size={Components.icon.sm} color={palette.tint} />
            </Row>
          </Clickable>
        )}
      </Row>

      {/* Horizontal scroll */}
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        decelerationRate="fast"
        snapToInterval={CARD_WIDTH + Spacing.sm}
        snapToAlignment="start"
        onScrollBeginDrag={() => {
          scrollIndexRef.current = 0;
        }}
      >
        {filteredCoaches.map((coach, index) => (
          <FeaturedCard
            key={coach.id}
            coach={coach}
            index={index}
            palette={palette}
            isFavourited={favouriteIds.includes(coach.id)}
            onPress={() => onCoachPress?.(coach.id)}
            onBookNow={() => onBookNow?.(coach.id)}
            onToggleFavourite={() => onToggleFavourite?.(coach.id)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { gap: Spacing.sm },
  headerRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
  },
  headerLeft: { alignItems: 'center', gap: Spacing.xs, flex: 1 },
  headerTitle: { ...Typography.title, flexShrink: 1 },
  seeAllRow: { alignItems: 'center', gap: Spacing.xs / 2 },
  seeAllText: { ...Typography.bodySemiBold },
  scrollContent: { paddingHorizontal: Spacing.md, gap: Spacing.sm },
});
