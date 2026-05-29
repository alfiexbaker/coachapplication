import type { SessionType } from '@/constants/session-types';

export const DURATION_OPTIONS = [30, 45, 60, 90];

export const TYPE_OPTIONS: { key: SessionType; label: string }[] = [
  { key: '1-to-1', label: '1-on-1' },
  { key: 'small-group', label: 'Group' },
];
