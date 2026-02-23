/**
 * Football Registry — Single source of truth for skill & focus definitions.
 *
 * EVERY component, service, or hook that needs a skill name, coaching focus,
 * or session skill list MUST import from here. No hardcoded string arrays.
 *
 * Two distinct skill systems coexist:
 *   1. COACHING_FOCUSES — 6 high-level areas for coach discovery, session creation,
 *      and filtering. These are broad labels, not rated per-athlete.
 *   2. POSITION_SKILLS / UNIVERSAL_SKILLS — 24 specific skills rated 1-5 per athlete
 *      per session. Defined in position-skills.ts and re-exported here.
 */

import type { FootballObjective } from './user-types';

// ─── Coaching Focuses (high-level, for discovery/session creation) ────────────

/**
 * The canonical list of coaching focus areas.
 * Used by: session creation, coach discovery, filtering, notes, invites.
 */
export const COACHING_FOCUSES: FootballObjective[] = [
  'Dribbling',
  'Passing',
  'Defending',
  'Finishing',
  'Goalkeeping',
  'Conditioning',
];

/**
 * Extended focus list for session notes (includes 'Tactics' as an additional option).
 */
export const SESSION_NOTE_FOCUSES: string[] = [
  ...COACHING_FOCUSES,
  'Tactics',
];

// ─── Coach Filter Specialties ─────────────────────────────────────────────────

/**
 * Specialties shown in the coach discovery filter panel.
 * Subset of coaching focuses for quick filtering.
 */
export const COACH_FILTER_SPECIALTIES: string[] = [
  'Dribbling',
  'Finishing',
  'Passing',
  'Goalkeeping',
  'Conditioning',
];

// ─── Re-exports from position-skills (rated skill system) ─────────────────────

export {
  UNIVERSAL_SKILLS,
  POSITION_SKILLS,
  POSITION_LABELS,
  POSITION_SKILL_COLORS,
  POSITION_SKILL_ICONS,
  POSITION_OPTIONS_WITH_ROTATE,
  RATING_LABELS,
  PARENT_SKILL_GROUP_MAP,
  SKILL_SUB_SKILLS,
  ALL_SUB_SKILLS,
  getSkillsForPosition,
  getSkillsForPositions,
  getParentGroup,
  getParentSkill,
  getSkillWithSubs,
  mapSkillToCorner,
  computeFourCorners,
  deriveParentRatings,
  deriveParentRatingsFromSubSkills,
} from './position-skills';
