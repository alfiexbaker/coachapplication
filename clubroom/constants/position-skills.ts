import type {
  FootballSkill,
  FourCornerRatings,
  ParentSkillGroup,
  PositionalSkill,
  PositionRole,
  SessionSkillRating,
  SkillRatingLevel,
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

const LEGACY_ALIAS_GROUPS: Array<{ pattern: RegExp; group: ParentSkillGroup }> = [
  { pattern: /work[\s-]?rate|fitness|conditioning|stamina|endurance|power/i, group: 'Character' },
  { pattern: /attitude|coachability|focus|confidence|mindset|resilience|composure|discipline/i, group: 'Character' },
  { pattern: /communication|leadership|teamwork|awareness|vision|decision/i, group: 'Game Sense' },
  { pattern: /tackl|defend|heading|aerial|position/i, group: 'Defending' },
  { pattern: /finish|movement|shoot|strik/i, group: 'Attacking' },
  { pattern: /pass|dribbl|control|touch|carry|hold[\s-]?up|distribution|handling/i, group: 'Ball Skills' },
];

const GROUP_TO_CORNER: Record<ParentSkillGroup, FourCornerKey> = {
  'Ball Skills': 'technical',
  Attacking: 'technical',
  Defending: 'technical',
  'Game Sense': 'social',
  Character: 'psychological',
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
  if (normalizedSkill === 'Work Rate') {
    return 'physical';
  }
  if (normalizedSkill === 'Communication') {
    return 'social';
  }

  const parentGroup = getParentGroup(normalizedSkill);
  return GROUP_TO_CORNER[parentGroup] ?? 'technical';
}

function clampOneToFive(value: number): number {
  return Math.max(1, Math.min(5, Math.round(value)));
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
