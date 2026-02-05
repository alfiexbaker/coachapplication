/**
 * CoachDiscoveryCard Component (Sprint 8A)
 *
 * Redesigned coach discovery card with Airbnb-quality design.
 * Shows avatar, name, rating, verified badge, distance, price,
 * specialty tags, review quote, next availability, trial badge,
 * book now CTA, and favourite button.
 */

import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Colors, Spacing, Radii, Components, Typography } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { useColorScheme } from '@/hooks/use-color-scheme';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DiscoveryCoach {
  id: string;
  fullName: string;
  profilePhotoUrl: string;
  verified: boolean;
  rating: number;
  reviewCount: number;
  distanceMiles: number;
  pricePerHour: number;
  specialties: string[];
  reviewQuote?: string;
  reviewAuthor?: string;
  nextAvailable?: string;
  trialAvailable: boolean;
}

interface CoachDiscoveryCardProps {
  coach: DiscoveryCoach;
  onPress?: () => void;
  onBookNow?: () => void;
  onToggleFavourite?: (id: string) => void;
  isFavourited?: boolean;
  index?: number;
}

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

export const MOCK_DISCOVERY_COACHES: DiscoveryCoach[] = [
  {
    id: '1',
    fullName: 'James Whitfield',
    profilePhotoUrl: 'https://i.pravatar.cc/150?u=coach1',
    verified: true,
    rating: 4.9,
    reviewCount: 127,
    distanceMiles: 1.2,
    pricePerHour: 35,
    specialties: ['Dribbling', 'Passing', 'Tactical'],
    reviewQuote: 'Transformed my son\'s confidence on the ball in just 4 sessions.',
    reviewAuthor: 'Sarah M.',
    nextAvailable: 'Tomorrow, 4:00 PM',
    trialAvailable: true,
  },
  {
    id: '2',
    fullName: 'Priya Sharma',
    profilePhotoUrl: 'https://i.pravatar.cc/150?u=coach2',
    verified: true,
    rating: 4.8,
    reviewCount: 93,
    distanceMiles: 2.4,
    pricePerHour: 40,
    specialties: ['Goalkeeping', 'Fitness'],
    reviewQuote: 'Best goalkeeper coach in the area. Highly professional.',
    reviewAuthor: 'Mark T.',
    nextAvailable: 'Sat, 10:00 AM',
    trialAvailable: false,
  },
  {
    id: '3',
    fullName: 'Daniel Okafor',
    profilePhotoUrl: 'https://i.pravatar.cc/150?u=coach3',
    verified: false,
    rating: 4.7,
    reviewCount: 54,
    distanceMiles: 3.1,
    pricePerHour: 30,
    specialties: ['Shooting', 'Defending'],
    reviewQuote: 'Great with kids. Very patient and encouraging.',
    reviewAuthor: 'Lisa W.',
    nextAvailable: 'Mon, 5:30 PM',
    trialAvailable: true,
  },
  {
    id: '4',
    fullName: 'Emily Chen',
    profilePhotoUrl: 'https://i.pravatar.cc/150?u=coach4',
    verified: true,
    rating: 5.0,
    reviewCount: 41,
    distanceMiles: 0.8,
    pricePerHour: 45,
    specialties: ['Passing', 'Tactical', 'Fitness'],
    reviewQuote: 'Incredibly structured sessions. My daughter loves training days now.',
    reviewAuthor: 'James K.',
    nextAvailable: 'Today, 6:00 PM',
    trialAvailable: true,
  },
  {
    id: '5',
    fullName: 'Marcus Rivera',
    profilePhotoUrl: 'https://i.pravatar.cc/150?u=coach5',
    verified: true,
    rating: 4.6,
    reviewCount: 78,
    distanceMiles: 4.5,
    pricePerHour: 25,
    specialties: ['Dribbling', 'Shooting'],
    nextAvailable: 'Wed, 3:00 PM',
    trialAvailable: false,
  },
];

// ---------------------------------------------------------------------------
// Stars sub-component
// ---------------------------------------------------------------------------

function RatingDisplay({
  rating,
  reviewCount,
  palette,
}: {
  rating: number;
  reviewCount: number;
  palette: (typeof Colors)['light'];
}) {
  return (
    <View style={ratingStyles.container}>
      <Ionicons name="star" size={Components.icon.sm} color={palette.warning} />
      <ThemedText style={[ratingStyles.value, { color: palette.text }]}>
        {rating.toFixed(1)}
      </ThemedText>
      <ThemedText style={[ratingStyles.count, { color: palette.muted }]}>
        ({reviewCount})
      </ThemedText>
    </View>
  );
}

const ratingStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs / 2,
  },
  value: {
    ...Typography.caption,
    fontWeight: '700',
  },
  count: {
    ...Typography.caption,
    fontWeight: '400',
  },
});

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function CoachDiscoveryCard({
  coach,
  onPress,
  onBookNow,
  onToggleFavourite,
  isFavourited = false,
  index = 0,
}: CoachDiscoveryCardProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const [favourited, setFavourited] = useState(isFavourited);

  const handleFavourite = () => {
    setFavourited((prev) => !prev);
    onToggleFavourite?.(coach.id);
  };

  return (
    <Animated.View entering={FadeInDown.delay(index * 60).duration(350).springify()}>
      <SurfaceCard onPress={onPress} style={styles.card}>
        {/* Top row: Avatar + Info + Favourite */}
        <View style={styles.topRow}>
          {/* Avatar */}
          <View style={styles.avatarContainer}>
            <Image
              source={{ uri: coach.profilePhotoUrl }}
              style={styles.avatar}
              contentFit="cover"
            />
            {coach.trialAvailable && (
              <View style={[styles.trialBadge, { backgroundColor: palette.success }]}>
                <ThemedText style={styles.trialText} lightColor="#FFFFFF" darkColor="#FFFFFF">
                  TRIAL
                </ThemedText>
              </View>
            )}
          </View>

          {/* Info column */}
          <View style={styles.infoColumn}>
            {/* Name row */}
            <View style={styles.nameRow}>
              <ThemedText style={[styles.coachName, { color: palette.text }]} numberOfLines={1}>
                {coach.fullName}
              </ThemedText>
              {coach.verified && (
                <Ionicons
                  name="checkmark-circle"
                  size={Components.icon.md}
                  color={palette.tint}
                />
              )}
            </View>

            {/* Rating */}
            <RatingDisplay
              rating={coach.rating}
              reviewCount={coach.reviewCount}
              palette={palette}
            />

            {/* Distance + Price */}
            <View style={styles.metaRow}>
              <View style={styles.metaItem}>
                <Ionicons name="location-outline" size={Components.icon.sm} color={palette.muted} />
                <ThemedText style={[styles.metaText, { color: palette.muted }]}>
                  {coach.distanceMiles.toFixed(1)} mi
                </ThemedText>
              </View>
              <View style={[styles.metaDot, { backgroundColor: palette.border }]} />
              <ThemedText style={[styles.priceText, { color: palette.text }]}>
                {'\u00A3'}{coach.pricePerHour}/hr
              </ThemedText>
            </View>
          </View>

          {/* Favourite button */}
          <Clickable onPress={handleFavourite} accessibilityLabel="Toggle favourite">
            <View style={[styles.favouriteButton, { backgroundColor: palette.surfaceSecondary }]}>
              <Ionicons
                name={favourited ? 'heart' : 'heart-outline'}
                size={Components.icon.lg}
                color={favourited ? palette.error : palette.muted}
              />
            </View>
          </Clickable>
        </View>

        {/* Specialty tags */}
        {coach.specialties.length > 0 && (
          <View style={styles.tagsRow}>
            {coach.specialties.map((tag) => (
              <View key={tag} style={[styles.tagPill, { backgroundColor: palette.surfaceSecondary }]}>
                <ThemedText style={[styles.tagText, { color: palette.muted }]}>
                  {tag}
                </ThemedText>
              </View>
            ))}
          </View>
        )}

        {/* Review quote */}
        {coach.reviewQuote ? (
          <View style={[styles.quoteContainer, { backgroundColor: palette.surfaceSecondary }]}>
            <Ionicons name="chatbubble-outline" size={Components.icon.sm} color={palette.muted} />
            <View style={styles.quoteTextContainer}>
              <ThemedText style={[styles.quoteText, { color: palette.text }]} numberOfLines={2}>
                &ldquo;{coach.reviewQuote}&rdquo;
              </ThemedText>
              {coach.reviewAuthor && (
                <ThemedText style={[styles.quoteAuthor, { color: palette.muted }]}>
                  -- {coach.reviewAuthor}
                </ThemedText>
              )}
            </View>
          </View>
        ) : null}

        {/* Bottom row: Next available + Book now */}
        <View style={styles.bottomRow}>
          {coach.nextAvailable ? (
            <View style={styles.availabilityContainer}>
              <Ionicons name="calendar-outline" size={Components.icon.sm} color={palette.success} />
              <ThemedText style={[styles.availabilityText, { color: palette.success }]}>
                {coach.nextAvailable}
              </ThemedText>
            </View>
          ) : (
            <View />
          )}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Book ${coach.fullName}`}
            onPress={() => onBookNow?.()}
            style={({ pressed }) => [
              styles.bookButton,
              {
                backgroundColor: pressed ? palette.tintPressed : palette.tint,
                opacity: pressed ? 0.9 : 1,
              },
            ]}
          >
            <ThemedText style={styles.bookButtonText} lightColor="#FFFFFF" darkColor="#FFFFFF">
              Book Now
            </ThemedText>
          </Pressable>
        </View>
      </SurfaceCard>
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  card: {
    padding: Spacing.sm,
    gap: Spacing.sm,
  },
  topRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'flex-start',
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: Components.avatar.lg,
    height: Components.avatar.lg,
    borderRadius: Radii.md,
  },
  trialBadge: {
    position: 'absolute',
    bottom: -Spacing.xs / 2,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingVertical: 2,
    borderRadius: Radii.sm,
  },
  trialText: {
    ...Typography.micro,
    fontSize: 9,
    letterSpacing: 0.8,
  },
  infoColumn: {
    flex: 1,
    gap: Spacing.xs / 2,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs / 2,
  },
  coachName: {
    ...Typography.heading,
    flexShrink: 1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs / 2,
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: Radii.pill,
  },
  metaText: {
    ...Typography.small,
  },
  priceText: {
    ...Typography.bodySemiBold,
  },
  favouriteButton: {
    width: 36,
    height: 36,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  tagPill: {
    paddingHorizontal: Components.pill.paddingHorizontal,
    paddingVertical: Components.pill.paddingVertical,
    borderRadius: Radii.pill,
  },
  tagText: {
    ...Typography.caption,
  },
  quoteContainer: {
    flexDirection: 'row',
    gap: Spacing.xs,
    padding: Spacing.sm,
    borderRadius: Radii.sm,
    alignItems: 'flex-start',
  },
  quoteTextContainer: {
    flex: 1,
    gap: Spacing.xs / 2,
  },
  quoteText: {
    ...Typography.small,
    fontStyle: 'italic',
  },
  quoteAuthor: {
    ...Typography.caption,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  availabilityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs / 2,
  },
  availabilityText: {
    ...Typography.caption,
    fontWeight: '600',
  },
  bookButton: {
    height: Components.buttonCompact.height,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radii.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookButtonText: {
    ...Typography.bodySemiBold,
  },
});
