/**
 * Family Booking Types — deduplication of bookings across multiple children.
 * Used by TodayFamilySummary on the home screen for multi-child parents.
 */

import type { Booking } from '@/constants/app-types';

/** A child involved in a booking row */
export interface FamilyBookingChild {
  id: string;
  name: string;
  colorCode: string;
}

/** A deduplicated booking row for multi-child family view */
export interface FamilyBookingRow {
  /** The canonical booking (first encountered in group) */
  booking: Booking;
  /** Children involved — 1 for unique, 2+ for shared */
  children: FamilyBookingChild[];
  /** True when 2+ children share the same booking */
  isShared: boolean;
}
