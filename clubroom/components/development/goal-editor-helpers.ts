import { Ionicons } from '@expo/vector-icons';

// ─── Types ──────────────────────────────────────────────────────────────────

export type SetByRole = 'coach' | 'parent' | 'athlete';

export interface Milestone {
  id: string;
  title: string;
  completed: boolean;
}

export interface GoalData {
  title: string;
  description: string;
  setBy: SetByRole;
  progress: number;
  milestones: Milestone[];
}

export interface GoalEditorProps {
  /** Pre-populated goal data when editing */
  initialData?: Partial<GoalData>;
  /** Athlete age — used for suggested goals */
  athleteAge?: number;
  /** Called when the user taps Save */
  onSave: (data: GoalData) => void;
}

// ─── Constants ──────────────────────────────────────────────────────────────

export const SET_BY_OPTIONS: { value: SetByRole; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'coach', label: 'Coach', icon: 'school-outline' },
  { value: 'parent', label: 'Parent', icon: 'people-outline' },
  { value: 'athlete', label: 'Athlete', icon: 'person-outline' },
];

export const PROGRESS_STEPS = Array.from({ length: 11 }, (_, i) => i * 10);

// ─── Helpers ────────────────────────────────────────────────────────────────

export function suggestedGoalsForAge(age?: number): string[] {
  if (!age) return [];
  if (age <= 8) {
    return [
      'Learn to dribble with both feet',
      'Complete 10 passes in a row',
      'Practise basic stretching routine',
    ];
  }
  if (age <= 12) {
    return [
      'Improve weak-foot passing accuracy',
      'Run a full training session without stopping',
      'Score from a set piece in a match',
      'Master 3 new skill moves',
    ];
  }
  return [
    'Increase sprint speed by 5%',
    'Complete advanced tactical drills',
    'Lead a warm-up session independently',
    'Achieve 90% attendance this term',
  ];
}
