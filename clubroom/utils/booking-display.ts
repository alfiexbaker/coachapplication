import type { Booking } from '@/constants/app-types';
import type { BookingSummary } from '@/constants/types';

export function getBookingSummaryCoachName(booking: BookingSummary): string {
  return booking.coach?.name || booking.coachId || 'Coach';
}

export function getBookingSummaryCoachPhotoUrl(booking: BookingSummary): string {
  return booking.coach?.photoUrl || `https://i.pravatar.cc/100?u=${booking.coachId || 'coach'}`;
}

export function getBookingSummaryClientName(booking: BookingSummary): string {
  return booking.client?.name || booking.clientId || 'Athlete';
}

export function getBookingAthleteName(booking: Booking): string {
  return booking.athleteId || booking.athleteIds?.[0] || 'Athlete';
}
