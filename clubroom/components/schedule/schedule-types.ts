/**
 * Schedule — Shared types for schedule screen decomposition.
 */

import type { AvailabilityTemplate, AvailabilityOverride, CoachSchedulingRules, CoachVenue, Booking, SessionOffering } from '@/constants/types';
import type { SessionTemplate } from '@/constants/session-types';

export type Segment = 'sessions' | 'availability';

export interface DayData {
  date: Date;
  dateStr: string;
  dayName: string;
  dayShort: string;
  dayNum: number;
  isToday: boolean;
  isPast: boolean;
  sessions: SessionData[];
  availabilitySlots: number;
  isBlocked: boolean;
  hasOverride: boolean;
}

export interface SessionData {
  id: string;
  title: string;
  time: string;
  endTime: string;
  athleteName?: string;
  athleteCount?: number;
  location?: string;
  status: 'confirmed' | 'pending';
  type: 'booking' | 'offering';
  seriesId?: string;
  seriesIndex?: number;
  seriesTotalWeeks?: number;
  /** RSVP counts for group sessions — enables at-a-glance attendance badge. */
  rsvpCounts?: { going: number; maybe: number; notGoing: number; pending: number };
  /** Whether this is a group session (vs 1-on-1 booking). */
  isGroupSession?: boolean;
}

export interface DayEditorConfig {
  dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  dateStr?: string;
  template?: AvailabilityTemplate | null;
  override?: AvailabilityOverride | null;
  existingTemplatesForDay?: AvailabilityTemplate[];
  defaultScope?: 'recurring' | 'just-this-date' | 'next-n-weeks';
}

export interface TimeOffConfig {
  preselectedDate?: string;
  existingOverride?: AvailabilityOverride | null;
}

export interface ScheduleData {
  templates: AvailabilityTemplate[];
  offerings: SessionOffering[];
  bookings: Booking[];
  rules: CoachSchedulingRules | null;
  blockedDates: Set<string>;
  overrides: AvailabilityOverride[];
  sessionTemplates: SessionTemplate[];
  venues: CoachVenue[];
}
