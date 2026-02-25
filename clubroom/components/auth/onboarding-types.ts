/**
 * Onboarding types, constants, and helpers.
 *
 * Shared across all onboarding step components and the useOnboarding hook.
 */

import { Ionicons } from '@expo/vector-icons';
import type { AccountType, SkillLevel } from '@/services/auth-service';
import type { PositionRole } from '@/types/progress-types';

// ============================================================================
// TYPES
// ============================================================================

export type OnboardingStep =
  | 'account-type'
  | 'basic-info'
  | 'location'
  | 'athlete-details'
  | 'coach-details'
  | 'parent-details'
  | 'complete';

export interface OnboardingState {
  step: OnboardingStep;
  isSubmitting: boolean;
  error: string | null;

  // Account
  accountType: AccountType | null;

  // Basic info
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  dateOfBirth: string;

  // Location
  addressLine: string;
  city: string;
  postcode: string;
  country: string;

  // Athlete specific
  skillLevel: SkillLevel | null;
  position: PositionRole | null;
  sport: string;
  goals: string[];
  hasChildren: boolean;

  // Coach specific
  isOrganization: boolean;
  organizationName: string;
  yearsExperience: string;
  specializations: string[];
  bio: string;
  hourlyRate: string;

  // Parent specific
  childrenCount: number;
}

export type OnboardingAction =
  | { type: 'HYDRATE_STATE'; state: OnboardingState }
  | { type: 'SET_STEP'; step: OnboardingStep }
  | { type: 'SET_SUBMITTING'; value: boolean }
  | { type: 'SET_ERROR'; error: string | null }
  | { type: 'SET_ACCOUNT_TYPE'; accountType: AccountType }
  | { type: 'SET_FIELD'; field: keyof OnboardingState; value: string | boolean | number | null }
  | { type: 'SET_SKILL_LEVEL'; value: SkillLevel }
  | { type: 'TOGGLE_SPECIALIZATION'; spec: string }
  | { type: 'TOGGLE_HAS_CHILDREN' }
  | { type: 'TOGGLE_IS_ORGANIZATION' };

// ============================================================================
// CONSTANTS
// ============================================================================

export const ACCOUNT_TYPES: {
  type: AccountType;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  {
    type: 'PARENT',
    title: "I'm a Parent",
    description: 'Book coaches for your children, track their progress',
    icon: 'people',
  },
  {
    type: 'ATHLETE',
    title: "I'm an Athlete",
    description: 'Book sessions, track progress, earn badges',
    icon: 'fitness',
  },
  {
    type: 'COACH',
    title: "I'm a Coach",
    description: 'Manage athletes, schedule sessions, build roster',
    icon: 'trophy',
  },
];

export const SKILL_LEVELS: { value: SkillLevel; label: string; description: string }[] = [
  { value: 'BEGINNER', label: 'Beginner', description: 'Just starting out' },
  { value: 'INTERMEDIATE', label: 'Intermediate', description: '1-3 years experience' },
  { value: 'ADVANCED', label: 'Advanced', description: '3-5 years experience' },
  { value: 'ELITE', label: 'Elite', description: 'Competitive level' },
];

export const SPORTS = [
  'Football', 'Basketball', 'Tennis', 'Swimming', 'Athletics',
  'Golf', 'Rugby', 'Cricket', 'Hockey', 'Martial Arts', 'Other',
];

export const COACH_SPECIALIZATIONS = [
  'Youth Development', 'Elite Performance', 'Technical Skills',
  'Fitness & Conditioning', 'Goalkeeping', 'Striker Training',
  'Mental Coaching', 'Group Sessions', 'Private 1-on-1',
];

// ============================================================================
// HELPERS
// ============================================================================

export const getPasswordStrength = (
  password: string,
  palette: { error: string; warning: string; success: string },
): { level: number; label: string; color: string } => {
  let score = 0;

  if (password.length >= 6) score++;
  if (password.length >= 10) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 1) return { level: 1, label: 'Weak', color: palette.error };
  if (score === 2) return { level: 2, label: 'Fair', color: palette.warning };
  if (score === 3) return { level: 3, label: 'Good', color: palette.success };
  return { level: 4, label: 'Strong', color: palette.success };
};

export const INITIAL_STATE: OnboardingState = {
  step: 'account-type',
  isSubmitting: false,
  error: null,
  accountType: null,
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  password: '',
  confirmPassword: '',
  dateOfBirth: '',
  addressLine: '',
  city: '',
  postcode: '',
  country: 'UK',
  skillLevel: null,
  position: null,
  sport: '',
  goals: [],
  hasChildren: false,
  isOrganization: false,
  organizationName: '',
  yearsExperience: '',
  specializations: [],
  bio: '',
  hourlyRate: '',
  childrenCount: 1,
};
