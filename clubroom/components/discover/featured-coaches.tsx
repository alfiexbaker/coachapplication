/**
 * FeaturedCoaches Component — Sprint 8D
 *
 * "Featured Near You" section with horizontal scroll of coach cards.
 * Filters for verified coaches with 4.5+ ratings.
 * Includes auto-rotation of featured coaches on an interval.
 */

import { useEffect, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInRight } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { Colors, Radii, Spacing, Typography, Components } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { DiscoveryCoach } from './coach-discovery-card';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FeaturedCoachesProps {
  /** All available coaches — will be filtered to verified + 4.5+ */
  coaches?: DiscoveryCoach[];
  /** Callback when a coach card is pressed */
  onCoachPress?: (coachId: string) => void;
  /** Callback for "Book Now" on a card */
  onBookNow?: (coachId: string) => void;
  /** Callback for "See All" */
  onSeeAll?: () => void;
  /** Auto-rotation interval in ms (0 to disable, default 5000) */
  autoRotateInterval?: number;
  /** IDs of favourited coaches */
  favouriteIds?: string[];
  /** Callback to toggle favourite */
  onToggleFavourite?: (coachId: string) => void;
}

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const MOCK_FEATURED_COACHES: DiscoveryCoach[] = [
  {
    id: 'f1',
    fullName: 'Emma Richardson',
    profilePhotoUrl: 'https://i.pravatar.cc/150?u=featured1',
    verified: true,
    rating: 4.9,
    reviewCount: 142,
    distanceMiles: 0.8,
    pricePerHour: 40,
    specialties: ['Passing', 'Tactical'],
    reviewQuote: 'Incredibly structured sessions with visible results.',
    reviewAuthor: 'Tom B.',
    nextAvailable: 'Tomorrow, 4 PM',
    trialAvailable: true,
  },
  {
    id: 'f2',
    fullName: 'Liam Johnson',
    profilePhotoUrl: 'https://i.pravatar.cc/150?u=featured2',
    verified: true,
    rating: 4.8,
    reviewCount: 98,
    distanceMiles: 1.5,
    pricePerHour: 35,
    specialties: ['Dribbling', 'Finishing'],
    reviewQuote: 'My son improved massively in just 3 weeks.',
    reviewAuthor: 'Kate M.',
    nextAvailable: 'Sat, 10 AM',
    trialAvailable: false,
  },
  {
    id: 'f3',
    fullName: 'Sofia Patel',
    profilePhotoUrl: 'https://i.pravatar.cc/150?u=featured3',
    verified: true,
    rating: 5.0,
    reviewCount: 67,
    distanceMiles: 2.1,
    pricePerHour: 50,
    specialties: ['Goalkeeping', 'Fitness'],
    nextAvailable: 'Today, 6 PM',
    trialAvailable: true,
  },
  {
    id: 'f4',
    fullName: 'Noah Williams',
    profilePhotoUrl: 'https://i.pravatar.cc/150?u=featured4',
    verified: true,
    rating: 4.7,
    reviewCount: 83,
    distanceMiles: 3.0,
    pricePerHour: 30,
    specialties: ['Defending', 'Conditioning'],
    nextAvailable: 'Mon, 5 PM',
    trialAvailable: true,
  },
];

const MIN_FEATURED_RATING = 4.5;

// ---------------------------------------------------------------------------
// Featured Card Sub-component
// ---------------------------------------------------------------------------

function FeaturedCard({
  coach,
  index,
  palette,
  isFavourited,
  onPress,
  onBookNow,
  onToggleFavourite,
}: {
  coach: DiscoveryCoach;
  index: number;
  palette: (typeof Colors)['light'];
  isFavourited: boolean;
  onPress: () => void;
  onBookNow: () => void;
  onToggleFavourite: () => void;
}) {
  return (
    <Animated.View entering={FadeInRight.delay(index * 80).duration(300).springify()}>
      <SurfaceCard onPress={onPress} style={cardStyles.card}>
        {/* Top section: avatar + badge */}
        <View style={cardStyles.topSection}>
          <Image
            source={{ uri: coach.profilePhotoUrl }}
            style={cardStyles.avatar}
            contentFit="cover"
          />

          {/* Verified badge overlay */}
          {coach.verified && (
            <View style={[cardStyles.verifiedBadge, { backgroundColor: palette.tint }]}>
              <Ionicons name="checkmark" size={10} color="#FFFFFF" />
            </View>
          )}

          {/* Favourite button */}
          <Clickable
            onPress={onToggleFavourite}
            accessibilityLabel="Toggle favourite"
            style={cardStyles.favButton}
          >
            <View style={[cardStyles.favCircle, { backgroundColor: `${palette.surface}E6` }]}>
              <Ionicons
                name={isFavourited ? 'heart' : 'heart-outline'}
                size={Components.icon.md}
                color={isFavourited ? palette.error : palette.muted}
              />
            </View>
          </Clickable>

          {/* Trial badge */}
          {coach.trialAvailable && (
            <View style={[cardStyles.trialPill, { backgroundColor: palette.success }]}>
              <ThemedText style={cardStyles.trialText} lightColor="#FFFFFF" darkColor="#FFFFFF">
                FREE TRIAL
              </ThemedText>
            </View>
          )}
        </View>

        {/* Info */}
        <View style={cardStyles.infoSection}>
          <ThemedText style={[cardStyles.name, { color: palette.text }]} numberOfLines={1}>
            {coach.fullName}
          </ThemedText>

          <View style={cardStyles.ratingRow}>
            <Ionicons name="star" size={Components.icon.sm} color={palette.warning} />
            <ThemedText style={[cardStyles.ratingText, { color: palette.text }]}>
              {coach.rating.toFixed(1)}
            </ThemedText>
            <ThemedText style={[cardStyles.reviewCount, { color: palette.muted }]}>
              ({coach.reviewCount})
            </ThemedText>
            <View style={[cardStyles.dot, { backgroundColor: palette.border }]} />
            <ThemedText style={[cardStyles.distance, { color: palette.muted }]}>
              {coach.distanceMiles.toFixed(1)} mi
            </ThemedText>
          </View>

          {/* Price + Book */}
          <View style={cardStyles.bottomRow}>
            <ThemedText style={[cardStyles.price, { color: palette.text }]}>
              {'\u00A3'}{coach.pricePerHour}/hr
            </ThemedText>
            <Pressable
              accessibilityRole="button"
              onPress={onBookNow}
              style={({ pressed }) => [
                cardStyles.bookBtn,
                {
                  backgroundColor: pressed ? palette.tintPressed : palette.tint,
                  opacity: pressed ? 0.9 : 1,
                },
              ]}
            >
              <ThemedText style={cardStyles.bookBtnText} lightColor="#FFFFFF" darkColor="#FFFFFF">
                Book Now
              </ThemedText>
            </Pressable>
          </View>
        </View>
      </SurfaceCard>
    </Animated.View>
  );
}

const CARD_WIDTH = 220;

const cardStyles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    padding: 0,
    overflow: 'hidden',
  },
  topSection: {
    position: 'relative',
    height: 140,
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderTopLeftRadius: Radii.card,
    borderTopRightRadius: Radii.card,
  },
  verifiedBadge: {
    position: 'absolute',
    top: Spacing.xs,
    left: Spacing.xs,
    width: 20,
    height: 20,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  favButton: {
    position: 'absolute',
    top: Spacing.xs,
    right: Spacing.xs,
  },
  favCircle: {
    width: 32,
    height: 32,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trialPill: {
    position: 'absolute',
    bottom: Spacing.xs,
    left: Spacing.xs,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: Radii.sm,
  },
  trialText: {
    ...Typography.micro,
    fontSize: 9,
  },
  infoSection: {
    padding: Spacing.sm,
    gap: Spacing.xs / 2,
  },
  name: {
    ...Typography.bodySemiBold,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs / 2,
  },
  ratingText: {
    ...Typography.caption,
    fontWeight: '700',
  },
  reviewCount: {
    ...Typography.caption,
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: Radii.pill,
  },
  distance: {
    ...Typography.caption,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.xs,
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
// Main Component
// ---------------------------------------------------------------------------

export function FeaturedCoaches({
  coaches,
  onCoachPress,
  onBookNow,
  onSeeAll,
  autoRotateInterval = 5000,
  favouriteIds = [],
  onToggleFavourite,
}: FeaturedCoachesProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const scrollRef = useRef<ScrollView>(null);
  const scrollIndexRef = useRef(0);

  // Filter to verified + high-rated coaches
  const filteredCoaches = (coaches ?? MOCK_FEATURED_COACHES).filter(
    (c) => c.verified && c.rating >= MIN_FEATURED_RATING,
  );

  // Auto-rotation
  useEffect(() => {
    if (autoRotateInterval <= 0 || filteredCoaches.length <= 1) return;

    const interval = setInterval(() => {
      const nextIndex = (scrollIndexRef.current + 1) % filteredCoaches.length;
      scrollIndexRef.current = nextIndex;
      scrollRef.current?.scrollTo({
        x: nextIndex * (CARD_WIDTH + Spacing.sm),
        animated: true,
      });
    }, autoRotateInterval);

    return () => clearInterval(interval);
  }, [autoRotateInterval, filteredCoaches.length]);

  if (filteredCoaches.length === 0) return null;

  return (
    <View style={styles.container}>
      {/* Section header */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Ionicons name="location" size={Components.icon.lg} color={palette.tint} />
          <ThemedText style={[styles.headerTitle, { color: palette.text }]}>
            Featured Near You
          </ThemedText>
        </View>
        {onSeeAll && (
          <Clickable onPress={onSeeAll} accessibilityLabel="See all featured coaches">
            <View style={styles.seeAllRow}>
              <ThemedText style={[styles.seeAllText, { color: palette.tint }]}>
                See all
              </ThemedText>
              <Ionicons name="chevron-forward" size={Components.icon.sm} color={palette.tint} />
            </View>
          </Clickable>
        )}
      </View>

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
          // Reset auto-rotate index when user drags
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

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    gap: Spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    flex: 1,
  },
  headerTitle: {
    ...Typography.title,
    flexShrink: 1,
  },
  seeAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs / 2,
  },
  seeAllText: {
    ...Typography.bodySemiBold,
  },
  scrollContent: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
});
