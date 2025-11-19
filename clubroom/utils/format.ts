import { CoachProfile } from '@/constants/types';

export const formatPriceRange = (price: CoachProfile['priceRange']) =>
  `$${price.minUsd.toLocaleString()}–$${price.maxUsd.toLocaleString()} / ${price.unitLabel}`;

export const formatDistance = (distanceMiles: number) => `${distanceMiles.toFixed(1)} mi away`;

export const formatNextAvailability = (isoString: string) => {
  const date = new Date(isoString);
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
};
