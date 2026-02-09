/**
 * CoachWelcome — Constants and data.
 */
import { Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export const SCREEN_WIDTH = Dimensions.get('window').width;
export const TOTAL_SCREENS = 5;

export const SPECIALTIES = [
  'Football', 'Tennis', 'Swimming', 'Basketball', 'Cricket',
  'Rugby', 'Athletics', 'Hockey', 'Netball', 'Gymnastics',
];

export const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
export const PERIODS = ['AM', 'PM', 'Eve'] as const;

export interface ValuePropItem {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
}

export const VALUE_PROPS: ValuePropItem[] = [
  { icon: 'calendar-outline', text: 'Manage bookings and availability in one place' },
  { icon: 'people-outline', text: 'Build your roster and track athlete progress' },
  { icon: 'wallet-outline', text: 'Get paid directly - no middleman fees' },
];
