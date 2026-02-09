/**
 * Shared types for CoachCard variants.
 */
import type { ThemeColors } from '@/hooks/useTheme';

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

export type CoachCardVariant = 'compact' | 'discovery' | 'favourite';
export type Palette = ThemeColors;

interface BaseCoachCardProps {
  coach: CoachCardData;
  variant?: CoachCardVariant;
  onPress?: () => void;
  index?: number;
}

export interface CompactVariantProps extends BaseCoachCardProps {
  variant?: 'compact';
  active?: boolean;
}

export interface DiscoveryVariantProps extends BaseCoachCardProps {
  variant: 'discovery';
  onBookNow?: () => void;
  onToggleFavourite?: (id: string) => void;
  isFavourited?: boolean;
}

export interface FavouriteVariantProps extends BaseCoachCardProps {
  variant: 'favourite';
  onBook?: (coachId: string) => void;
  onToggleFavourite?: () => void;
  toggleLoading?: boolean;
  isFavourite?: boolean;
}

export type CoachCardProps = CompactVariantProps | DiscoveryVariantProps | FavouriteVariantProps;
