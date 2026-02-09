/**
 * Extracted constants for FilterBar.
 *
 * QUICK_FILTERS — togglable filter chips (rating, nearby, format).
 * FOCUS_FILTERS — football skill focus chips.
 */

import type {
  CoachSearchFilters,
  FootballObjective,
  TrainingFormat,
} from '@/constants/types';

// ============================================================================
// TYPES
// ============================================================================

export interface QuickFilter {
  id: string;
  label: string;
  getIsActive: (filters: CoachSearchFilters) => boolean;
  toggle: (filters: CoachSearchFilters) => CoachSearchFilters;
}

// ============================================================================
// QUICK FILTERS
// ============================================================================

export const QUICK_FILTERS: QuickFilter[] = [
  {
    id: 'rating',
    label: '4+ Stars',
    getIsActive: (f) => f.rating !== undefined && f.rating >= 4,
    toggle: (f) => ({
      ...f,
      rating: f.rating !== undefined && f.rating >= 4 ? undefined : 4,
    }),
  },
  {
    id: 'nearby',
    label: 'Nearby',
    getIsActive: (f) => f.distance !== undefined && f.distance <= 5,
    toggle: (f) => ({
      ...f,
      distance: f.distance !== undefined && f.distance <= 5 ? undefined : 5,
    }),
  },
  {
    id: 'inperson',
    label: 'In-person',
    getIsActive: (f) => f.formats?.includes('In-person') ?? false,
    toggle: (f) => {
      const current = f.formats ?? [];
      const hasFormat = current.includes('In-person');
      return {
        ...f,
        formats: hasFormat
          ? current.filter((fmt) => fmt !== 'In-person')
          : [...current, 'In-person' as TrainingFormat],
      };
    },
  },
  {
    id: 'virtual',
    label: 'Virtual',
    getIsActive: (f) => f.formats?.includes('Virtual') ?? false,
    toggle: (f) => {
      const current = f.formats ?? [];
      const hasFormat = current.includes('Virtual');
      return {
        ...f,
        formats: hasFormat
          ? current.filter((fmt) => fmt !== 'Virtual')
          : [...current, 'Virtual' as TrainingFormat],
      };
    },
  },
  {
    id: 'group',
    label: 'Small group',
    getIsActive: (f) => f.formats?.includes('Small group') ?? false,
    toggle: (f) => {
      const current = f.formats ?? [];
      const hasFormat = current.includes('Small group');
      return {
        ...f,
        formats: hasFormat
          ? current.filter((fmt) => fmt !== 'Small group')
          : [...current, 'Small group' as TrainingFormat],
      };
    },
  },
];

// ============================================================================
// FOCUS FILTERS
// ============================================================================

export const FOCUS_FILTERS: { id: FootballObjective; label: string }[] = [
  { id: 'Goalkeeping', label: 'Goalkeeping' },
  { id: 'Finishing', label: 'Finishing' },
  { id: 'Dribbling', label: 'Dribbling' },
  { id: 'Passing', label: 'Passing' },
  { id: 'Defending', label: 'Defending' },
  { id: 'Conditioning', label: 'Conditioning' },
];
