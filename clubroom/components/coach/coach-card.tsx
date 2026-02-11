/**
 * Unified CoachCard Component — Composition root.
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

import { CompactCard } from './coach-card-compact';
import { DiscoveryCard } from './coach-card-discovery';
import { FavouriteCard } from './coach-card-favourite';
import type {
  CoachCardProps,
  CompactVariantProps,
  DiscoveryVariantProps,
  FavouriteVariantProps,
} from './coach-card-shared';

// Re-export types for consumers
export type {
  CoachCardData,
  CoachCardVariant,
  CoachCardProps,
  CompactVariantProps,
  DiscoveryVariantProps,
  FavouriteVariantProps,
} from './coach-card-shared';

export function CoachCard(props: CoachCardProps) {
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
