import type { Ionicons } from '@expo/vector-icons';

// ─── Constants ──────────────────────────────────────────────────────────────

export const TOTAL_SCREENS = 3;

export const AGE_OPTIONS = Array.from({ length: 13 }, (_, i) => i + 4); // 4 to 16

export const SKILL_LEVELS = ['Beginner', 'Developing', 'Intermediate', 'Advanced'] as const;

export interface ImprovementArea {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
}

export const IMPROVEMENT_AREAS: ImprovementArea[] = [
  { icon: 'football-outline', label: 'Ball Control' },
  { icon: 'speedometer-outline', label: 'Speed & Agility' },
  { icon: 'body-outline', label: 'Fitness' },
  { icon: 'people-outline', label: 'Teamwork' },
  { icon: 'trophy-outline', label: 'Competition Prep' },
  { icon: 'happy-outline', label: 'Confidence' },
];

export interface PlaceholderCoach {
  name: string;
  specialty: string;
  rating: number;
  distance: string;
}

export const PLACEHOLDER_COACHES: PlaceholderCoach[] = [
  { name: 'Coach Alex', specialty: 'Football', rating: 4.9, distance: '0.8 mi' },
  { name: 'Coach Jamie', specialty: 'Tennis', rating: 4.8, distance: '1.2 mi' },
  { name: 'Coach Sam', specialty: 'Swimming', rating: 5.0, distance: '2.1 mi' },
];
