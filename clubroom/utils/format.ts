import { CoachProfile } from '@/constants/types';

const shortWeekdayFormatter = new Intl.DateTimeFormat('en-GB', { weekday: 'short' });
const shortMonthDayFormatter = new Intl.DateTimeFormat('en-GB', { month: 'short', day: 'numeric' });
const longDateFormatter = new Intl.DateTimeFormat('en-GB', {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
});
const timeFormatter = new Intl.DateTimeFormat('en-GB', {
  hour: 'numeric',
  minute: '2-digit',
});

const toDate = (value: string | number | Date) => (value instanceof Date ? value : new Date(value));

export const formatPriceRange = (price: CoachProfile['priceRange']) =>
  `£${price.minUsd.toLocaleString()}–£${price.maxUsd.toLocaleString()} / ${price.unitLabel}`;

export const formatDistance = (distanceMiles: number) => `${distanceMiles.toFixed(1)} mi away`;

export const formatNextAvailability = (isoString: string) => {
  const date = new Date(isoString);
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
};

// Currency formatting helper
export const formatGBP = (amount: number) => `£${amount.toLocaleString('en-GB')}`;

export const formatWeekday = (value: string | number | Date) => shortWeekdayFormatter.format(toDate(value));

export const formatMonthDay = (value: string | number | Date) => shortMonthDayFormatter.format(toDate(value));

export const formatFullDate = (value: string | number | Date) => longDateFormatter.format(toDate(value));

export const formatTime = (value: string | number | Date) => timeFormatter.format(toDate(value));

export const formatTimeRange = (start: string | number | Date, durationMinutes: number) => {
  const startDate = toDate(start);
  const endDate = new Date(startDate.getTime() + durationMinutes * 60 * 1000);
  return `${formatTime(startDate)} – ${formatTime(endDate)}`;
};
