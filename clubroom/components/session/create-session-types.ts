/**
 * CreateSession — Shared types and constants for the session creation wizard.
 *
 * Extracted from app/sessions/create.tsx to keep each file focused.
 */

import type { Ionicons } from '@expo/vector-icons';
import type { FootballObjective, SessionInviteType } from '@/constants/types';
import type { ThemeColors } from '@/hooks/useTheme';

// ============================================================================
// TYPES
// ============================================================================

export type SessionType = '1on1' | 'small_group' | 'group' | 'camp';

export type RecurrenceType = 'once' | 'weekly' | 'biweekly' | 'monthly';
export type CampLength = 'single_day' | 'multi_day';

export type WizardStep = 'details' | 'schedule' | 'review' | 'invite';

export const WIZARD_STEPS: WizardStep[] = ['details', 'schedule', 'review', 'invite'];

export const WIZARD_STEP_LABELS: Record<WizardStep, string> = {
  details: 'Type & Details',
  schedule: 'Plan & Pricing',
  review: 'Review & Publish',
  invite: 'Invite Athletes',
};

// ============================================================================
// CONSTANTS
// ============================================================================

export interface SessionTypeOption {
  key: SessionType;
  label: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  maxParticipants: number;
}

export const SESSION_TYPES: SessionTypeOption[] = [
  { key: '1on1', label: '1-on-1', description: 'Personal training', icon: 'person', maxParticipants: 1 },
  { key: 'small_group', label: 'Small Group', description: '2-4 athletes', icon: 'people', maxParticipants: 4 },
  { key: 'group', label: 'Group', description: '5+ athletes', icon: 'people-circle', maxParticipants: 15 },
  { key: 'camp', label: 'Camp', description: 'Intensive training block', icon: 'sunny', maxParticipants: 30 },
];

export interface DurationOption {
  value: number;
  label: string;
}

export const DURATION_OPTIONS: DurationOption[] = [
  { value: 30, label: '30 min' },
  { value: 45, label: '45 min' },
  { value: 60, label: '1 hour' },
  { value: 90, label: '1.5 hours' },
  { value: 120, label: '2 hours' },
  { value: 180, label: '3 hours' },
];

export interface RecurrenceOption {
  key: RecurrenceType;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}

export const RECURRENCE_OPTIONS: RecurrenceOption[] = [
  { key: 'once', label: 'One-time', icon: 'calendar-outline' },
  { key: 'weekly', label: 'Weekly', icon: 'repeat' },
  { key: 'biweekly', label: 'Biweekly', icon: 'sync' },
  { key: 'monthly', label: 'Monthly', icon: 'calendar' },
];

export const CAMP_LENGTH_OPTIONS: {
  key: CampLength;
  label: string;
  description: string;
}[] = [
  {
    key: 'single_day',
    label: 'Single Day',
    description: 'One-day camp event',
  },
  {
    key: 'multi_day',
    label: 'Multi-Day',
    description: 'Consecutive day camp block',
  },
];

export const FOCUS_AREAS: FootballObjective[] = [
  'Dribbling',
  'Passing',
  'Finishing',
  'Defending',
  'Goalkeeping',
  'Conditioning',
];

export interface InviteTypeOption {
  key: SessionInviteType;
  label: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  colorKey: keyof ThemeColors;
}

export const INVITE_TYPE_OPTIONS: InviteTypeOption[] = [
  {
    key: 'OPEN',
    label: 'Open Session',
    description: 'Visible when browsing your available sessions',
    icon: 'globe-outline',
    colorKey: 'success',
  },
  {
    key: 'CLOSED',
    label: 'Invite Only',
    description: 'Only athletes you explicitly invite can see/book',
    icon: 'lock-closed-outline',
    colorKey: 'warning',
  },
  {
    key: 'SQUAD_ONLY',
    label: 'Squad Only',
    description: 'Only members of selected squad(s) can see/book',
    icon: 'people-outline',
    colorKey: 'info',
  },
];
