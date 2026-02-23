import type {
  FootballSkill,
  FourCornerRatings,
  ParentSkillGroup,
  PositionalSkill,
  PositionRole,
  SessionSkillRating,
  SkillRatingLevel,
  SubSkillRating,
  UniversalSkill,
} from '@/types/progress-types';
import type { FourCornerKey } from '@/types/progress-types';

export const UNIVERSAL_SKILLS: UniversalSkill[] = [
  'Work Rate',
  'Attitude',
  'Communication',
  'Coachability',
];

export const POSITION_SKILLS: Record<PositionRole, PositionalSkill[]> = {
  GK: [
    'Shot Stopping',
    'Handling & Crosses',
    'Distribution',
    'Positioning & Sweeping',
    'Command of Area',
  ],
  DEF: ['Tackling', 'Heading & Aerial', 'Positioning', 'Playing Out', '1v1 Defending'],
  MID: ['Passing', 'Ball Carrying', 'Game Vision', 'Pressing & Defending', 'Tempo & Control'],
  ATT: ['Finishing', 'Movement', 'Dribbling & Skills', 'Hold-Up Play', 'Pressing & Work Rate'],
};

export const POSITION_LABELS: Record<PositionRole, string> = {
  GK: 'Goalkeeper',
  DEF: 'Defender',
  MID: 'Midfielder',
  ATT: 'Striker',
};

export const POSITION_SKILL_COLORS: Record<PositionRole, Record<string, string>> = {
  GK: {
    'Shot Stopping': '#5E7EA6',
    'Handling & Crosses': '#6B8FB7',
    Distribution: '#7AA0C5',
    'Positioning & Sweeping': '#8DB0D2',
    'Command of Area': '#A3C2DE',
  },
  DEF: {
    Tackling: '#4F7B73',
    'Heading & Aerial': '#5E8C83',
    Positioning: '#6FA096',
    'Playing Out': '#81B1A6',
    '1v1 Defending': '#97C1B8',
  },
  MID: {
    Passing: '#5A6F84',
    'Ball Carrying': '#678096',
    'Game Vision': '#7592A8',
    'Pressing & Defending': '#87A5BA',
    'Tempo & Control': '#9CB9CB',
  },
  ATT: {
    Finishing: '#8A6A4A',
    Movement: '#9C7A59',
    'Dribbling & Skills': '#AD8B6A',
    'Hold-Up Play': '#BE9D7E',
    'Pressing & Work Rate': '#CFB296',
  },
};

export const POSITION_SKILL_ICONS: Record<string, string> = {
  'Shot Stopping': 'hand-left-outline',
  'Handling & Crosses': 'hand-right-outline',
  Distribution: 'paper-plane-outline',
  'Positioning & Sweeping': 'navigate-outline',
  'Command of Area': 'scan-outline',
  Tackling: 'shield-outline',
  'Heading & Aerial': 'resize-outline',
  Positioning: 'locate-outline',
  'Playing Out': 'git-branch-outline',
  '1v1 Defending': 'people-outline',
  Passing: 'swap-horizontal-outline',
  'Ball Carrying': 'walk-outline',
  'Game Vision': 'eye-outline',
  'Pressing & Defending': 'flash-outline',
  'Tempo & Control': 'pulse-outline',
  Finishing: 'football-outline',
  Movement: 'trail-sign-outline',
  'Dribbling & Skills': 'sparkles-outline',
  'Hold-Up Play': 'pause-outline',
  'Pressing & Work Rate': 'fitness-outline',
  'Work Rate': 'fitness-outline',
  Attitude: 'happy-outline',
  Communication: 'chatbubble-ellipses-outline',
  Coachability: 'school-outline',
};

export const POSITION_OPTIONS_WITH_ROTATE: Array<{
  key: PositionRole | null;
  label: string;
  icon: string;
}> = [
  { key: 'GK', label: 'Goalkeeper', icon: 'hand-left-outline' },
  { key: 'DEF', label: 'Defender', icon: 'shield-outline' },
  { key: 'MID', label: 'Midfielder', icon: 'swap-horizontal-outline' },
  { key: 'ATT', label: 'Striker', icon: 'football-outline' },
  { key: null, label: 'They rotate', icon: 'sync-outline' },
];

export const RATING_LABELS: Record<1 | 2 | 3 | 4 | 5, SkillRatingLevel> = {
  1: 'Developing',
  2: 'Good',
  3: 'Very Good',
  4: 'Excellent',
  5: 'Exceptional',
};

export const PARENT_SKILL_GROUP_MAP: Record<FootballSkill, ParentSkillGroup> = {
  'Work Rate': 'Character',
  Attitude: 'Character',
  Communication: 'Character',
  Coachability: 'Character',

  'Shot Stopping': 'Attacking',
  'Handling & Crosses': 'Ball Skills',
  Distribution: 'Ball Skills',
  'Positioning & Sweeping': 'Game Sense',
  'Command of Area': 'Defending',

  Tackling: 'Defending',
  'Heading & Aerial': 'Defending',
  Positioning: 'Defending',
  'Playing Out': 'Game Sense',
  '1v1 Defending': 'Defending',

  Passing: 'Game Sense',
  'Ball Carrying': 'Ball Skills',
  'Game Vision': 'Game Sense',
  'Pressing & Defending': 'Game Sense',
  'Tempo & Control': 'Game Sense',

  Finishing: 'Attacking',
  Movement: 'Attacking',
  'Dribbling & Skills': 'Ball Skills',
  'Hold-Up Play': 'Ball Skills',
  'Pressing & Work Rate': 'Game Sense',
};

export function getSkillsForPosition(position: PositionRole): FootballSkill[] {
  return [...UNIVERSAL_SKILLS, ...POSITION_SKILLS[position]];
}

// ─── Sub-skill hierarchy ─────────────────────────────────────────────────────

/**
 * Sub-skills beneath each of the 24 FootballSkill parents.
 * Ratings stay on the parent; sub-skills are coaching context tags.
 */
export const SKILL_SUB_SKILLS: Record<FootballSkill, string[]> = {
  // GK
  'Shot Stopping': ['Reflexes', 'Shot Reading', '1v1 Saving'],
  'Handling & Crosses': ['Catching', 'Punching', 'Cross Claiming'],
  Distribution: ['Goal Kicks', 'Throwing', 'Short Passing'],
  'Positioning & Sweeping': ['Starting Position', 'Sweeping', 'Angle Play'],
  'Command of Area': ['Organising Defence', 'Commanding Box', 'Communication with Back Line'],

  // DEF
  Tackling: ['Tackling Technique', 'Interceptions'],
  'Heading & Aerial': ['Aerial Duels', 'Set Piece Attacking'],
  Positioning: ['Positional Sense', 'Defensive Shape'],
  'Playing Out': ['Building from the Back', 'Receiving Under Pressure', 'Switching Play'],
  '1v1 Defending': ['Jockeying', 'Recovery Runs'],

  // MID
  Passing: ['First Touch', 'One-Touch Play', 'Weight of Pass'],
  'Ball Carrying': ['Ball Control', 'Close Control', 'Dribbling'],
  'Game Vision': ['Decision Making', 'Scanning', 'Awareness'],
  'Pressing & Defending': ['Transition', 'Pressing Shape'],
  'Tempo & Control': ['Game Management', 'Tempo Setting'],

  // ATT
  Finishing: ['Shooting', 'Composure', 'Weak Foot Finishing'],
  Movement: ['Off the Ball', 'Timing of Runs', 'Movement in Box'],
  'Dribbling & Skills': ['Skill Moves', '1v1 Attacking', 'Weak Foot'],
  'Hold-Up Play': ['Back to Goal', 'Link-Up Play', 'Holding Possession'],
  'Pressing & Work Rate': ['Speed', 'Stamina', 'Pressing Intensity'],

  // Universal
  'Work Rate': ['Conditioning', 'Fitness', 'Endurance'],
  Attitude: ['Discipline', 'Resilience', 'Confidence'],
  Communication: ['Leadership', 'Organising'],
  Coachability: ['Listening', 'Learning Attitude'],
};

/** Flat deduplicated list of all sub-skills. */
export const ALL_SUB_SKILLS: string[] = [
  ...new Set(Object.values(SKILL_SUB_SKILLS).flat()),
];

/** Reverse lookup: given a sub-skill string, find its parent FootballSkill. */
export function getParentSkill(subSkill: string): FootballSkill | null {
  const normalised = subSkill.trim();
  for (const [parent, subs] of Object.entries(SKILL_SUB_SKILLS)) {
    if (subs.some((s) => s.toLowerCase() === normalised.toLowerCase())) {
      return parent as FootballSkill;
    }
  }
  return null;
}

/** Get a parent skill with its sub-skills. */
export function getSkillWithSubs(skill: FootballSkill): { skill: FootballSkill; subSkills: string[] } {
  return { skill, subSkills: SKILL_SUB_SKILLS[skill] };
}

const LEGACY_ALIAS_GROUPS: Array<{ pattern: RegExp; group: ParentSkillGroup }> = [
  { pattern: /work[\s-]?rate|fitness|conditioning|stamina|endurance|power/i, group: 'Character' },
  { pattern: /attitude|coachability|focus|confidence|mindset|resilience|composure|discipline/i, group: 'Character' },
  { pattern: /communication|leadership|teamwork|awareness|vision|decision/i, group: 'Game Sense' },
  { pattern: /tackl|defend|heading|aerial|position/i, group: 'Defending' },
  { pattern: /finish|movement|shoot|strik/i, group: 'Attacking' },
  { pattern: /pass|dribbl|control|touch|carry|hold[\s-]?up|distribution|handling/i, group: 'Ball Skills' },
];

/**
 * Direct skill → four-corner mapping for balanced distribution:
 *   Technical (10) | Physical (5) | Psychological (7) | Social (2)
 */
const SKILL_TO_CORNER: Record<FootballSkill, FourCornerKey> = {
  // Technical (10)
  'Shot Stopping': 'technical',
  'Handling & Crosses': 'technical',
  Distribution: 'technical',
  Tackling: 'technical',
  Passing: 'technical',
  'Ball Carrying': 'technical',
  'Dribbling & Skills': 'technical',
  Finishing: 'technical',
  'Hold-Up Play': 'technical',
  'Playing Out': 'technical',
  // Physical (5)
  'Work Rate': 'physical',
  'Pressing & Work Rate': 'physical',
  'Pressing & Defending': 'physical',
  'Heading & Aerial': 'physical',
  '1v1 Defending': 'physical',
  // Psychological (7)
  Attitude: 'psychological',
  Coachability: 'psychological',
  'Game Vision': 'psychological',
  Positioning: 'psychological',
  'Positioning & Sweeping': 'psychological',
  'Tempo & Control': 'psychological',
  Movement: 'psychological',
  // Social (2)
  Communication: 'social',
  'Command of Area': 'social',
};

function resolveKnownSkill(skill: string): FootballSkill | null {
  if (Object.prototype.hasOwnProperty.call(PARENT_SKILL_GROUP_MAP, skill)) {
    return skill as FootballSkill;
  }
  return null;
}

export function getParentGroup(skill: FootballSkill | string): ParentSkillGroup {
  const normalizedSkill = skill.trim();
  const knownSkill = resolveKnownSkill(normalizedSkill);
  if (knownSkill) {
    return PARENT_SKILL_GROUP_MAP[knownSkill];
  }

  const alias = LEGACY_ALIAS_GROUPS.find((entry) => entry.pattern.test(normalizedSkill));
  if (alias) {
    return alias.group;
  }

  return 'Ball Skills';
}

export function mapSkillToCorner(skill: FootballSkill | string): FourCornerKey {
  const normalizedSkill = skill.trim();

  // Direct lookup for known skills
  if (Object.prototype.hasOwnProperty.call(SKILL_TO_CORNER, normalizedSkill)) {
    return SKILL_TO_CORNER[normalizedSkill as FootballSkill];
  }

  // Legacy alias fallback for free-text skill names
  const parentGroup = getParentGroup(normalizedSkill);
  if (parentGroup === 'Character') return 'psychological';
  if (parentGroup === 'Defending') return 'physical';
  return 'technical';
}

function clampOneToFive(value: number): number {
  return Math.max(1, Math.min(5, Math.round(value)));
}

/**
 * Merge positional skills across multiple positions + universal.
 * Deduplicates (no skill overlap between positions, but universal is always included).
 */
export function getSkillsForPositions(positions: PositionRole[]): FootballSkill[] {
  const skills = new Set<FootballSkill>(UNIVERSAL_SKILLS);
  for (const pos of positions) {
    for (const skill of POSITION_SKILLS[pos]) {
      skills.add(skill);
    }
  }
  return Array.from(skills);
}

/**
 * Derive parent skill ratings from sub-skill level records.
 * Groups sub-skills by parent (via getParentSkill), averages their levels.
 * Returns parent → average level (same 1-10 scale as SkillLevel.level).
 */
export function deriveParentRatings(
  subSkillLevels: Record<string, { level: number }>,
): Record<string, number> {
  const parentBuckets: Record<string, number[]> = {};

  for (const [subSkillName, data] of Object.entries(subSkillLevels)) {
    const parent = getParentSkill(subSkillName);
    if (!parent) continue;
    if (!parentBuckets[parent]) {
      parentBuckets[parent] = [];
    }
    parentBuckets[parent].push(data.level);
  }

  const result: Record<string, number> = {};
  for (const [parent, levels] of Object.entries(parentBuckets)) {
    const avg = levels.reduce((sum, val) => sum + val, 0) / levels.length;
    result[parent] = Math.round(avg * 10) / 10; // one decimal place
  }
  return result;
}

/**
 * Derive parent ratings from SubSkillRating[] (1-5 scale).
 * Returns parent → average rating (1-5 scale, one decimal).
 */
export function deriveParentRatingsFromSubSkills(
  subSkillRatings: SubSkillRating[],
): Record<string, number> {
  const parentBuckets: Record<string, number[]> = {};

  for (const { parentSkill, rating } of subSkillRatings) {
    if (!parentBuckets[parentSkill]) {
      parentBuckets[parentSkill] = [];
    }
    parentBuckets[parentSkill].push(rating);
  }

  const result: Record<string, number> = {};
  for (const [parent, ratings] of Object.entries(parentBuckets)) {
    const avg = ratings.reduce((sum, val) => sum + val, 0) / ratings.length;
    result[parent] = Math.round(avg * 10) / 10;
  }
  return result;
}

export function computeFourCorners(ratings: SessionSkillRating[]): FourCornerRatings {
  const buckets: Record<FourCornerKey, number[]> = {
    technical: [],
    physical: [],
    psychological: [],
    social: [],
  };

  for (const rating of ratings) {
    buckets[mapSkillToCorner(rating.skill)].push(rating.rating);
  }

  const toCornerValue = (values: number[]): number => {
    if (values.length === 0) {
      return 1;
    }
    const average = values.reduce((sum, value) => sum + value, 0) / values.length;
    return clampOneToFive(average);
  };

  return {
    technical: toCornerValue(buckets.technical),
    physical: toCornerValue(buckets.physical),
    psychological: toCornerValue(buckets.psychological),
    social: toCornerValue(buckets.social),
  };
}
