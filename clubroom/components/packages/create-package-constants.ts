/**
 * CreatePackageForm — Constants.
 */
import type { FootballObjective } from '@/constants/types';

export const SESSION_COUNT_OPTIONS = [3, 5, 10, 15, 20];

export const VALIDITY_OPTIONS = [
  { days: 30, label: '30 days' },
  { days: 45, label: '45 days' },
  { days: 60, label: '60 days' },
  { days: 90, label: '90 days' },
  { days: 120, label: '4 months' },
];

export const FOCUS_OPTIONS: FootballObjective[] = [
  'Dribbling', 'Passing', 'Defending', 'Finishing', 'Goalkeeping', 'Conditioning',
];
