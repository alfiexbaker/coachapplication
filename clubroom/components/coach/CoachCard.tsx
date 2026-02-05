/**
 * Unified CoachCard Component
 *
 * Single coach card component with variants for different use cases:
 * - compact: Minimal card for map selection or list items
 * - discovery: Full-featured card for coach discovery (Airbnb-quality)
 * - favourite: Card for favourites list with remove action
 *
 * Usage:
 *   <CoachCard coach={coach} variant="discovery" onPress={handlePress} />
 *   <CoachCard coach={coach} variant="compact" active={isSelected} />
 *   <CoachCard coach={coach} variant="favourite" onToggleFavourite={handleToggle} />
 */

import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Colors, Spacing, Radii, Components, Typography } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { Button } from '@/components/primitives/button';
import { useColorScheme } from '@/hooks/use-color-scheme';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface CoachCardData {
  id: string;
  fullName: string;
  profilePhotoUrl?: string;
  verified?: boolean;
  rating?: number;
  reviewCount?: number;
  distanceMiles?: number;
  pricePerHour?: number;
  priceMin?: number;
  priceMax?: number;
  city?: string;
  specialties?: string[];
  footballFocuses?: string[];
  reviewQuote?: string;
  reviewAuthor?: string;
  nextAvailable?: string;
  trialAvailable?: boolean;
}

type CoachCardVariant = 'compact' | 'discovery' | 'favourite';

interface BaseCoachCardProps {
  coach: CoachCardData;
  variant?: CoachCardVariant;
  onPress?: () => void;
  index?: number;
}

interface CompactVariantProps extends BaseCoachCardProps {
  variant?: 'compact';
  active?: boolean;
}

interface DiscoveryVariantProps extends BaseCoachCardProps {
  variant: 'discovery';
  onBookNow?: () => void;
  onToggleFavourite?: (id: string) => void;
  isFavourited?: boolean;
}

interface FavouriteVariantProps extends BaseCoachCardProps {
  variant: 'favourite';
  onBook?: (coachId: string) => void;
  onToggleFavourite?: () => void;
  toggleLoading?: boolean;
  isFavourite?: boolean;
}

export type CoachCardProps = CompactVariantProps | DiscoveryVariantProps | FavouriteVariantProps;

type Palette = (typeof Colors)['light'];

// -----------------------------------------------------------------------------
// Sub-components
// -----------------------------------------------------------------------------

function RatingDisplay({
  rating,
  reviewCount,
  palette,
  showCount = true,
}: {
  rating: number;
  reviewCount?: number;
  palette: Palette;
  showCount?: boolean;
}) {
  return (
    <View style={subStyles.ratingContainer}>
      <Ionicons name="star" size={Components.icon.sm} color={palette.warning} />
      <ThemedText style={[subStyles.ratingValue, { color: palette.text }]}>
        {rating.toFixed(1)}
      </ThemedText>
      {showCount && reviewCount !== undefined && (
        <ThemedText style={[subStyles.ratingCount, { color: palette.muted }]}>
          ({reviewCount})
        </ThemedText>
      )}
    </View>
  );
}

function FavouriteButton({
  isFavourite,
  onPress,
  palette,
  loading,
}: {
  isFavourite: boolean;
  onPress: () => void;
  palette: Palette;
  loading?: boolean;
}) {
  return (
    <Clickable onPress={onPress} accessibilityLabel="Toggle favourite" disabled={loading}>
      <View style={[subStyles.favouriteButton, { backgroundColor: palette.surfaceSecondary }]}>
        <Ionicons
          name={isFavourite ? 'heart' : 'heart-outline'}
          size={Components.icon.lg}
          color={isFavourite ? palette.error : palette.muted}
        />
      </View>
    </Clickable>
  );
}

const subStyles = StyleSheet.create({
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs / 2,
  },
  ratingValue: {
    ...Typography.caption,
    fontWeight: '700',
  },
  ratingCount: {
    ...Typography.caption,
    fontWeight: '400',
  },
  favouriteButton: {
    width: 36,
    height: 36,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

// -----------------------------------------------------------------------------
// Compact Variant
// -----------------------------------------------------------------------------

function CompactCard({
  coach,
  active,
  onPress,
  index = 0,
}: CompactVariantProps & { palette: Palette }) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const primaryFocus = coach.footballFocuses?.[0] || coach.specialties?.[0];

  const formatPrice = () => {
    if (coach.pricePerHour) return `£${coach.pricePerHour}`;
    if (coach.priceMin && coach.priceMax) {
      return coach.priceMin === coach.priceMax
        ? `£${coach.priceMin}`
        : `£${coach.priceMin}-£${coach.priceMax}`;
    }
    return null;
  };

  return (
    <Animated.View entering={FadeInDown.duration(300).delay(index * 50).springify()}>
      <SurfaceCard
        accessibilityHint="View coach details"
        onPress={onPress}
        outlineGradient={active ? [palette.premium, palette.premium] : undefined}
        style={[compactStyles.card, active && { borderColor: palette.premium }]}
        gradientPadding={active ? 2 : 0}
      >
        <View style={compactStyles.row}>
          <Image
            source={{ uri: coach.profilePhotoUrl }}
            style={compactStyles.avatar}
            contentFit="cover"
          />
          <View style={compactStyles.meta}>
            <ThemedText type="subtitle" style={compactStyles.name}>
              {coach.fullName}
            </ThemedText>
            {coach.distanceMiles !== undefined && (
              <View style={compactStyles.infoRow}>
                <Ionicons name="location" size={14} color={palette.icon} />
                <ThemedText style={[compactStyles.infoText, { color: palette.muted }]}>
                  {coach.distanceMiles.toFixed(1)} mi
                </ThemedText>
              </View>
            )}
            <View style={compactStyles.metaRow}>
              {coach.rating !== undefined && (
                <RatingDisplay rating={coach.rating} palette={palette} showCount={false} />
              )}
              {primaryFocus && (
                <>
                  <View style={compactStyles.divider} />
                  <View style={[compactStyles.focusBadge, { backgroundColor: palette.surfaceSecondary }]}>
                    <ThemedText style={[compactStyles.focusText, { color: palette.muted }]}>
                      {primaryFocus}
                    </ThemedText>
                  </View>
                </>
              )}
            </View>
          </View>
          {formatPrice() && (
            <View style={compactStyles.priceColumn}>
              <ThemedText type="defaultSemiBold" style={compactStyles.price}>
                {formatPrice()}
              </ThemedText>
              <ThemedText style={[compactStyles.priceLabel, { color: palette.muted }]}>
                per session
              </ThemedText>
            </View>
          )}
        </View>
      </SurfaceCard>
    </Animated.View>
  );
}

const compactStyles = StyleSheet.create({
  card: {
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'center',
  },
  avatar: {
    width: Components.avatar.lg,
    height: Components.avatar.lg,
    borderRadius: Radii.md,
  },
  meta: {
    flex: 1,
    gap: Spacing.xs,
    justifyContent: 'center',
  },
  name: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.2,
    marginBottom: -2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs + 2,
  },
  infoText: {
    fontSize: 13,
    fontWeight: '500',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  divider: {
    width: 1,
    height: 12,
    backgroundColor: '#E5E7EB',
    opacity: 0.5,
  },
  focusBadge: {
    paddingHorizontal: Spacing.sm - 2,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.sm,
  },
  focusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  priceColumn: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  price: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  priceLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 1,
  },
});

// -----------------------------------------------------------------------------
// Discovery Variant
// -----------------------------------------------------------------------------

function DiscoveryCard({
  coach,
  onPress,
  onBookNow,
  onToggleFavourite,
  isFavourited = false,
  index = 0,
}: DiscoveryVariantProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const [favourited, setFavourited] = useState(isFavourited);

  const handleFavourite = () => {
    setFavourited((prev) => !prev);
    onToggleFavourite?.(coach.id);
  };

  const specialties = coach.specialties || coach.footballFocuses || [];

  return (
    <Animated.View entering={FadeInDown.delay(index * 60).duration(350).springify()}>
      <SurfaceCard onPress={onPress} style={discoveryStyles.card}>
        {/* Top row: Avatar + Info + Favourite */}
        <View style={discoveryStyles.topRow}>
          {/* Avatar */}
          <View style={discoveryStyles.avatarContainer}>
            <Image
              source={{ uri: coach.profilePhotoUrl }}
              style={discoveryStyles.avatar}
              contentFit="cover"
            />
            {coach.trialAvailable && (
              <View style={[discoveryStyles.trialBadge, { backgroundColor: palette.success }]}>
                <ThemedText style={discoveryStyles.trialText} lightColor="#FFFFFF" darkColor="#FFFFFF">
                  TRIAL
                </ThemedText>
              </View>
            )}
          </View>

          {/* Info column */}
          <View style={discoveryStyles.infoColumn}>
            <View style={discoveryStyles.nameRow}>
              <ThemedText style={[discoveryStyles.coachName, { color: palette.text }]} numberOfLines={1}>
                {coach.fullName}
              </ThemedText>
              {coach.verified && (
                <Ionicons name="checkmark-circle" size={Components.icon.md} color={palette.tint} />
              )}
            </View>

            {coach.rating !== undefined && (
              <RatingDisplay
                rating={coach.rating}
                reviewCount={coach.reviewCount}
                palette={palette}
              />
            )}

            <View style={discoveryStyles.metaRow}>
              {coach.distanceMiles !== undefined && (
                <View style={discoveryStyles.metaItem}>
                  <Ionicons name="location-outline" size={Components.icon.sm} color={palette.muted} />
                  <ThemedText style={[discoveryStyles.metaText, { color: palette.muted }]}>
                    {coach.distanceMiles.toFixed(1)} mi
                  </ThemedText>
                </View>
              )}
              {coach.distanceMiles !== undefined && coach.pricePerHour !== undefined && (
                <View style={[discoveryStyles.metaDot, { backgroundColor: palette.border }]} />
              )}
              {coach.pricePerHour !== undefined && (
                <ThemedText style={[discoveryStyles.priceText, { color: palette.text }]}>
                  £{coach.pricePerHour}/hr
                </ThemedText>
              )}
            </View>
          </View>

          {/* Favourite button */}
          <FavouriteButton
            isFavourite={favourited}
            onPress={handleFavourite}
            palette={palette}
          />
        </View>

        {/* Specialty tags */}
        {specialties.length > 0 && (
          <View style={discoveryStyles.tagsRow}>
            {specialties.map((tag) => (
              <View key={tag} style={[discoveryStyles.tagPill, { backgroundColor: palette.surfaceSecondary }]}>
                <ThemedText style={[discoveryStyles.tagText, { color: palette.muted }]}>
                  {tag}
                </ThemedText>
              </View>
            ))}
          </View>
        )}

        {/* Review quote */}
        {coach.reviewQuote && (
          <View style={[discoveryStyles.quoteContainer, { backgroundColor: palette.surfaceSecondary }]}>
            <Ionicons name="chatbubble-outline" size={Components.icon.sm} color={palette.muted} />
            <View style={discoveryStyles.quoteTextContainer}>
              <ThemedText style={[discoveryStyles.quoteText, { color: palette.text }]} numberOfLines={2}>
                &ldquo;{coach.reviewQuote}&rdquo;
              </ThemedText>
              {coach.reviewAuthor && (
                <ThemedText style={[discoveryStyles.quoteAuthor, { color: palette.muted }]}>
                  — {coach.reviewAuthor}
                </ThemedText>
              )}
            </View>
          </View>
        )}

        {/* Bottom row: Next available + Book now */}
        <View style={discoveryStyles.bottomRow}>
          {coach.nextAvailable ? (
            <View style={discoveryStyles.availabilityContainer}>
              <Ionicons name="calendar-outline" size={Components.icon.sm} color={palette.success} />
              <ThemedText style={[discoveryStyles.availabilityText, { color: palette.success }]}>
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
              discoveryStyles.bookButton,
              {
                backgroundColor: pressed ? palette.tintPressed : palette.tint,
                opacity: pressed ? 0.9 : 1,
              },
            ]}
          >
            <ThemedText style={discoveryStyles.bookButtonText} lightColor="#FFFFFF" darkColor="#FFFFFF">
              Book Now
            </ThemedText>
          </Pressable>
        </View>
      </SurfaceCard>
    </Animated.View>
  );
}

const discoveryStyles = StyleSheet.create({
  card: {
    padding: Spacing.sm,
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
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

// -----------------------------------------------------------------------------
// Favourite Variant
// -----------------------------------------------------------------------------

function FavouriteCard({
  coach,
  onPress,
  onBook,
  onToggleFavourite,
  toggleLoading = false,
  isFavourite = true,
  index = 0,
}: FavouriteVariantProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const formatPrice = () => {
    if (coach.pricePerHour) return `£${coach.pricePerHour}`;
    if (coach.priceMin && coach.priceMax) {
      return coach.priceMin === coach.priceMax
        ? `£${coach.priceMin}`
        : `£${coach.priceMin}-£${coach.priceMax}`;
    }
    return null;
  };

  const handleBook = useCallback(() => {
    onBook?.(coach.id);
  }, [onBook, coach.id]);

  const priceDisplay = formatPrice();

  return (
    <Animated.View entering={FadeInDown.duration(300).delay(index * 50).springify()}>
      <SurfaceCard
        accessibilityHint="View coach profile"
        accessibilityLabel={`${coach.fullName}, favourited coach`}
        onPress={onPress}
        style={favouriteStyles.card}
      >
        <View style={favouriteStyles.content}>
          <Image
            source={{ uri: coach.profilePhotoUrl || 'https://via.placeholder.com/64' }}
            style={favouriteStyles.avatar}
            contentFit="cover"
          />

          <View style={favouriteStyles.info}>
            <View style={favouriteStyles.nameRow}>
              <ThemedText type="subtitle" style={favouriteStyles.name} numberOfLines={1}>
                {coach.fullName}
              </ThemedText>
              <Clickable
                onPress={() => onToggleFavourite?.()}
                accessibilityLabel="Remove from favourites"
                disabled={toggleLoading}
              >
                <Ionicons
                  name={isFavourite ? 'heart' : 'heart-outline'}
                  size={20}
                  color={isFavourite ? palette.error : palette.muted}
                />
              </Clickable>
            </View>

            <View style={favouriteStyles.metaRow}>
              {coach.rating !== undefined && (
                <View style={favouriteStyles.ratingContainer}>
                  <Ionicons name="star" size={14} color={palette.premium} />
                  <ThemedText style={[favouriteStyles.metaText, { color: palette.text }]}>
                    {coach.rating.toFixed(1)}
                  </ThemedText>
                </View>
              )}
              {coach.city && (
                <>
                  {coach.rating !== undefined && (
                    <View style={[favouriteStyles.divider, { backgroundColor: palette.border }]} />
                  )}
                  <View style={favouriteStyles.locationContainer}>
                    <Ionicons name="location-outline" size={14} color={palette.muted} />
                    <ThemedText style={[favouriteStyles.metaText, { color: palette.muted }]}>
                      {coach.city}
                    </ThemedText>
                  </View>
                </>
              )}
            </View>

            <View style={favouriteStyles.actionRow}>
              {priceDisplay && (
                <View style={favouriteStyles.priceContainer}>
                  <ThemedText type="defaultSemiBold" style={favouriteStyles.price}>
                    {priceDisplay}
                  </ThemedText>
                  <ThemedText style={[favouriteStyles.priceLabel, { color: palette.muted }]}>
                    /session
                  </ThemedText>
                </View>
              )}
              <Button onPress={handleBook} variant="primary" style={favouriteStyles.bookButton}>
                Book Now
              </Button>
            </View>
          </View>
        </View>
      </SurfaceCard>
    </Animated.View>
  );
}

const favouriteStyles = StyleSheet.create({
  card: {
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  content: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  avatar: {
    width: Components.avatar.lg,
    height: Components.avatar.lg,
    borderRadius: Radii.md,
  },
  info: {
    flex: 1,
    gap: Spacing.xs,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.xs,
  },
  name: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.2,
    flex: 1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 13,
    fontWeight: '500',
  },
  divider: {
    width: 1,
    height: 12,
    opacity: 0.5,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.xs,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  price: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  priceLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  bookButton: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
  },
});

// -----------------------------------------------------------------------------
// Main Export
// -----------------------------------------------------------------------------

export function CoachCard(props: CoachCardProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const variant = props.variant || 'compact';

  switch (variant) {
    case 'discovery':
      return <DiscoveryCard {...(props as DiscoveryVariantProps)} />;
    case 'favourite':
      return <FavouriteCard {...(props as FavouriteVariantProps)} />;
    case 'compact':
    default:
      return <CompactCard {...(props as CompactVariantProps)} palette={palette} />;
  }
}

export default CoachCard;
