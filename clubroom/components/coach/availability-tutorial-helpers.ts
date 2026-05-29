import { Ionicons } from '@expo/vector-icons';

export interface TutorialStep {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  accentColor: 'tint' | 'success' | 'warning' | 'info';
}

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    icon: 'calendar-outline',
    title: 'Welcome to Availability',
    description:
      "Let's set up when parents can book sessions with you. It only takes a minute to get started.",
    accentColor: 'tint',
  },
  {
    icon: 'grid-outline',
    title: 'Tap to Set Availability',
    description:
      'Use the weekly grid to mark yourself as available. Tap any time slot to toggle it on or off.',
    accentColor: 'success',
  },
  {
    icon: 'flash-outline',
    title: 'Quick Setup Templates',
    description:
      'Short on time? Use a quick-start template like "Weekday Mornings" or "Weekend Sessions" to set up in one tap.',
    accentColor: 'warning',
  },
  {
    icon: 'checkmark-circle-outline',
    title: "You're All Set!",
    description:
      'Parents can now see your availability and book sessions. You can always adjust your schedule later.',
    accentColor: 'info',
  },
];
