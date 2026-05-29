import { Ionicons } from '@expo/vector-icons';

import type { RecurrenceFrequency } from '@/constants/types';

export interface FrequencyOption {
  value: RecurrenceFrequency;
  label: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  sessionsPerMonth: number;
}

export const FREQUENCY_OPTIONS: FrequencyOption[] = [
  {
    value: 'WEEKLY',
    label: 'Weekly',
    description: 'Every week on the same day',
    icon: 'calendar',
    sessionsPerMonth: 4,
  },
  {
    value: 'BIWEEKLY',
    label: 'Biweekly',
    description: 'Every 2 weeks on the same day',
    icon: 'calendar-outline',
    sessionsPerMonth: 2,
  },
  {
    value: 'MONTHLY',
    label: 'Monthly',
    description: 'Once a month on the same day',
    icon: 'calendar-clear',
    sessionsPerMonth: 1,
  },
];
