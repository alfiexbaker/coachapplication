import type { RecurringBookingStatus } from '@/constants/types';

export type FilterOption = 'ALL' | RecurringBookingStatus;

export interface FilterItem {
  key: FilterOption;
  label: string;
}

export const FILTER_DATA: FilterItem[] = [
  { key: 'ALL', label: 'All' },
  { key: 'ACTIVE', label: 'Active' },
  { key: 'PAUSED', label: 'Paused' },
  { key: 'CANCELLED', label: 'Cancelled' },
  { key: 'EXPIRED', label: 'Expired' },
];
