/**
 * Unified CoachCard Component
 *
 * Single coach card component with variants for different use cases:
 * - compact: Minimal card for map selection or list items
 * - discovery: Full-featured card for coach discovery (Airbnb-quality)
 * - favourite: Card for favourites list with remove action
 *
 * This component composes focused subcomponents for maintainability.
 *
 * Usage:
 *   <CoachCard coach={coach} variant="discovery" onPress={handlePress} />
 *   <CoachCard coach={coach} variant="compact" active={isSelected} />
 *   <CoachCard coach={coach} variant="favourite" onToggleFavourite={handleToggle} />
 */

import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Colors, Spacing, Radii, Components , Typography } from '@/constants/theme';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Divider } from '@/components/ui/primitives/Divider';
import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';

// Import subcomponents
import { CoachAvatar, CoachNameRow } from './coach-card-header';
import { RatingDisplay, CompactRating, ReviewQuote } from './coach-card-reviews';
import { DistanceDisplay, LocationDisplay, MetaRow, NextAvailableDisplay } from './coach-card-availability';
import { SpecialtyTags, FocusBadge, PriceDisplay, InlinePrice, formatPrice } from './coach-card-services';
import { FavouriteButton, InlineFavouriteIcon, BookButton, ActionRow } from './coach-card-cta';

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
// Compact Variant
// -----------------------------------------------------------------------------

function CompactCard({
  coach,
  active,
  onPress,
  index = 0,
}: CompactVariantProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const primaryFocus = coach.footballFocuses?.[0] || coach.specialties?.[0];
  const priceStr = formatPrice(coach.pricePerHour, coach.priceMin, coach.priceMax);

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
          <CoachAvatar
            profilePhotoUrl={coach.profilePhotoUrl}
            size="lg"
          />
          <View style={compactStyles.meta}>
            <ThemedText type="subtitle" style={compactStyles.name}>
              {coach.fullName}
            </ThemedText>
            {coach.distanceMiles !== undefined && (
              <DistanceDisplay distanceMiles={coach.distanceMiles} />
            )}
            <View style={compactStyles.metaRow}>
              {coach.rating !== undefined && (
                <RatingDisplay rating={coach.rating} showCount={false} />
              )}
              {primaryFocus && (
                <>
                  <Divider vertical style={{ height: 12, opacity: 0.5 }} />
                  <FocusBadge focus={primaryFocus} />
                </>
              )}
            </View>
          </View>
          {priceStr && (
            <View style={compactStyles.priceColumn}>
              <ThemedText type="defaultSemiBold" style={compactStyles.price}>
                {priceStr}
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
  meta: {
    flex: 1,
    gap: Spacing.xs,
    justifyContent: 'center',
  },
  name: { ...Typography.heading, letterSpacing: -0.2,
    marginBottom: -2 },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  priceColumn: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  price: { ...Typography.heading, letterSpacing: -0.3 },
  priceLabel: { ...Typography.caption, marginTop: 1 },
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
          <CoachAvatar
            profilePhotoUrl={coach.profilePhotoUrl}
            trialAvailable={coach.trialAvailable}
            size="lg"
          />

          {/* Info column */}
          <View style={discoveryStyles.infoColumn}>
            <CoachNameRow
              fullName={coach.fullName}
              verified={coach.verified}
            />

            {coach.rating !== undefined && (
              <RatingDisplay
                rating={coach.rating}
                reviewCount={coach.reviewCount}
              />
            )}

            <MetaRow
              distanceMiles={coach.distanceMiles}
              pricePerHour={coach.pricePerHour}
            />
          </View>

          {/* Favourite button */}
          <FavouriteButton
            isFavourite={favourited}
            onPress={handleFavourite}
            size="lg"
          />
        </View>

        {/* Specialty tags */}
        {specialties.length > 0 && (
          <SpecialtyTags specialties={specialties} />
        )}

        {/* Review quote */}
        {coach.reviewQuote && (
          <ReviewQuote
            quote={coach.reviewQuote}
            author={coach.reviewAuthor}
          />
        )}

        {/* Bottom row: Next available + Book now */}
        <ActionRow
          nextAvailable={coach.nextAvailable}
          coachName={coach.fullName}
          onBookNow={onBookNow}
        />
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
  infoColumn: {
    flex: 1,
    gap: Spacing.xs / 2,
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

  const handleBook = useCallback(() => {
    onBook?.(coach.id);
  }, [onBook, coach.id]);

  const priceStr = formatPrice(coach.pricePerHour, coach.priceMin, coach.priceMax);

  return (
    <Animated.View entering={FadeInDown.duration(300).delay(index * 50).springify()}>
      <SurfaceCard
        accessibilityHint="View coach profile"
        accessibilityLabel={`${coach.fullName}, favourited coach`}
        onPress={onPress}
        style={favouriteStyles.card}
      >
        <View style={favouriteStyles.content}>
          <CoachAvatar
            profilePhotoUrl={coach.profilePhotoUrl}
            size="lg"
          />

          <View style={favouriteStyles.info}>
            <View style={favouriteStyles.nameRow}>
              <ThemedText type="subtitle" style={favouriteStyles.name} numberOfLines={1}>
                {coach.fullName}
              </ThemedText>
              <InlineFavouriteIcon
                isFavourite={isFavourite}
                onPress={() => onToggleFavourite?.()}
                loading={toggleLoading}
              />
            </View>

            <View style={favouriteStyles.metaRow}>
              {coach.rating !== undefined && (
                <CompactRating rating={coach.rating} />
              )}
              {coach.city && (
                <>
                  {coach.rating !== undefined && (
                    <Divider vertical style={{ height: 12, opacity: 0.5 }} />
                  )}
                  <LocationDisplay city={coach.city} />
                </>
              )}
            </View>

            <View style={favouriteStyles.actionRow}>
              {priceStr && (
                <InlinePrice
                  pricePerHour={coach.pricePerHour}
                  priceMin={coach.priceMin}
                  priceMax={coach.priceMax}
                />
              )}
              <BookButton
                coachName={coach.fullName}
                onPress={handleBook}
                variant="primary"
              />
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
  name: { ...Typography.heading, letterSpacing: -0.2,
    flex: 1 },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.xs,
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
      return <CompactCard {...(props as CompactVariantProps)} />;
  }
}

export default CoachCard;
