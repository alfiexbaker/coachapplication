import type { ThemeColors } from '@/hooks/useTheme';

// ─── Constants ──────────────────────────────────────────────────────────────

export const SKILL_CATEGORIES: Record<string, string[]> = {
  Technical: ['Dribbling', 'Passing', 'Shooting', 'First Touch', 'Ball Control', 'Heading', 'Handling', 'Distribution'],
  Physical: ['Speed', 'Strength', 'Endurance', 'Agility', 'Balance', 'Jumping'],
  Mental: ['Decision Making', 'Concentration', 'Composure', 'Leadership', 'Communication'],
  Tactical: ['Positioning', 'Game Reading', 'Off the Ball', 'Defensive Awareness', 'Attacking Movement'],
};

export const CATEGORY_ORDER = ['Technical', 'Physical', 'Mental', 'Tactical', 'Other'];

// ─── Helpers ────────────────────────────────────────────────────────────────

export function getSkillLevelLabel(level: number): { label: string; description: string } {
  if (level >= 9) return { label: 'Expert', description: 'Exceptional mastery' };
  if (level >= 7) return { label: 'Advanced', description: 'Strong proficiency' };
  if (level >= 5) return { label: 'Proficient', description: 'Solid foundation' };
  if (level >= 3) return { label: 'Developing', description: 'Making progress' };
  return { label: 'Beginner', description: 'Just starting' };
}

export function getSkillCategory(skillName: string): string {
  for (const [category, skills] of Object.entries(SKILL_CATEGORIES)) {
    if (skills.some(s => s.toLowerCase() === skillName.toLowerCase())) {
      return category;
    }
  }
  return 'Other';
}

export function getSkillColor(level: number, palette: ThemeColors): string {
  if (level >= 8) return palette.success;
  if (level >= 5) return palette.tint;
  if (level >= 3) return palette.warning;
  return palette.error;
}

export function formatLastUpdated(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' });
}
