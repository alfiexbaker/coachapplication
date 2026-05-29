import type { CoachGender } from '@/constants/types';

export interface FilterOption {
  value: string;
  label: string;
  color: string;
}

export const DISTANCE_OPTIONS = [
  { value: 5, label: '5 km' },
  { value: 10, label: '10 km' },
  { value: 25, label: '25 km' },
  { value: 50, label: '50 km' },
  { value: undefined, label: 'Any distance' },
];

export const GENDER_OPTIONS: { value: CoachGender; label: string }[] = [
  { value: 'Any', label: 'Any' },
  { value: 'Male', label: 'Male' },
  { value: 'Female', label: 'Female' },
];
