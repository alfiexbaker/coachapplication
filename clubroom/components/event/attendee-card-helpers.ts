import { Ionicons } from '@expo/vector-icons';

export function getRoleIcon(role: string): keyof typeof Ionicons.glyphMap {
  switch (role) {
    case 'COACH':
      return 'megaphone-outline';
    case 'ATHLETE':
      return 'football-outline';
    default:
      return 'person-outline';
  }
}

export function getRoleLabel(role: string): string {
  switch (role) {
    case 'COACH':
      return 'Coach';
    case 'ATHLETE':
      return 'Athlete';
    default:
      return 'Parent';
  }
}
