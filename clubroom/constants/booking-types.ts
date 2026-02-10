import { Ionicons } from '@expo/vector-icons';

import type { FootballObjective } from './types';
import type { CoachProfile, User } from './app-types';
import { formatGBP } from '@/utils/format';

export interface ServiceType {
  id: string;
  title: string;
  description: string;
  price: number;
  capacity?: number;
  spotsLeft?: number;
  icon: keyof typeof Ionicons.glyphMap;
}

export interface SlotTemplate {
  id: string;
  title: string;
  focus: string;
  startHour: number;
  startMinute: number;
  durationMinutes: number;
  tag: string;
  serviceType: string;
}

export interface SlotInstance {
  id: string;
  templateId: string;
  title: string;
  focus: string;
  start: Date;
  durationMinutes: number;
  tag: string;
  serviceType: string;
}

export interface DayAvailability {
  id: string;
  date: Date;
  slots: SlotInstance[];
}

const BOOKING_COACH_USERS: User[] = [
  {
    id: 'coach1',
    email: 'sarah.mitchell@coach.com',
    role: 'COACH',
    name: 'Sarah Mitchell',
    avatar: 'SM',
    postcode: 'SW1A 1AA',
    dateOfBirth: '1988-03-15',
  },
  {
    id: 'coach2',
    email: 'mike.thompson@coach.com',
    role: 'COACH',
    name: 'Mike Thompson',
    avatar: 'MT',
    postcode: 'SW1A 2AA',
    dateOfBirth: '1985-07-22',
  },
  {
    id: 'coach3',
    email: 'david.roberts@coach.com',
    role: 'COACH',
    name: 'David Roberts',
    avatar: 'DR',
    postcode: 'SW2A 1BB',
    dateOfBirth: '1990-11-08',
  },
];

const BOOKING_COACH_PROFILES: CoachProfile[] = [
  {
    userId: 'coach1',
    bio: 'UEFA-qualified coach focused on technical development and confidence building.',
    qualifications: ['UEFA B Licence', 'FA Safeguarding'],
    specialties: ['Finishing', 'First Touch', 'Game Intelligence'],
    yearsExperience: 10,
    sessionRate: 50,
    availability: [],
    rating: 4.8,
    totalReviews: 44,
    totalSessions: 320,
  },
  {
    userId: 'coach2',
    bio: 'Former academy coach with structured progression plans for youth players.',
    qualifications: ['UEFA B Licence'],
    specialties: ['Passing', 'Decision Making', 'Shooting'],
    yearsExperience: 8,
    sessionRate: 45,
    availability: [],
    rating: 4.7,
    totalReviews: 36,
    totalSessions: 270,
  },
  {
    userId: 'coach3',
    bio: 'Detail-oriented technical coach with a strong goalkeeper development track.',
    qualifications: ['FA Level 3', 'Goalkeeper Specialist'],
    specialties: ['Goalkeeping', 'Distribution', 'Positioning'],
    yearsExperience: 7,
    sessionRate: 48,
    availability: [],
    rating: 4.6,
    totalReviews: 29,
    totalSessions: 210,
  },
];

export const FOOTBALL_OBJECTIVES: FootballObjective[] = [
  'Dribbling',
  'Passing',
  'Defending',
  'Finishing',
  'Goalkeeping',
  'Conditioning',
];

/**
 * Day names indexed by JavaScript Date.getDay() (0 = Sunday, 6 = Saturday)
 */
export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;

/**
 * Short day name abbreviations
 */
export const DAY_ABBREVS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

/**
 * Get the full name for a day of week
 */
export function getDayName(dayOfWeek: number): string {
  return DAY_NAMES[dayOfWeek] || 'Unknown';
}

/**
 * Get the abbreviated name for a day of week
 */
export function getDayAbbrev(dayOfWeek: number): string {
  return DAY_ABBREVS[dayOfWeek] || '???';
}

export const SERVICES: ServiceType[] = [
  {
    id: '1-on-1',
    title: '1-on-1 Training',
    description: 'Personalized coaching session',
    price: 50,
    icon: 'person',
  },
  {
    id: 'small-group',
    title: 'Small Group',
    description: 'Train with others (max 8)',
    price: 30,
    capacity: 8,
    spotsLeft: 5,
    icon: 'people',
  },
  {
    id: 'team',
    title: 'Team Session',
    description: 'Full pitch team training',
    price: 150,
    icon: 'football',
  },
];

const SLOT_LIBRARY: Record<string, SlotTemplate> = {
  morning_1on1: {
    id: 'morning_1on1',
    title: '1-on-1 Training',
    focus: 'Personalized skill development',
    startHour: 9,
    startMinute: 0,
    durationMinutes: 60,
    tag: 'Popular',
    serviceType: '1-on-1',
  },
  morning_group: {
    id: 'morning_group',
    title: 'Small Group Training',
    focus: 'Ball control & passing',
    startHour: 10,
    startMinute: 30,
    durationMinutes: 90,
    tag: '5/8 spots',
    serviceType: 'small-group',
  },
  afternoon_1on1: {
    id: 'afternoon_1on1',
    title: '1-on-1 Training',
    focus: 'Technical skills',
    startHour: 14,
    startMinute: 0,
    durationMinutes: 90,
    tag: 'Extended',
    serviceType: '1-on-1',
  },
  evening_1on1: {
    id: 'evening_1on1',
    title: '1-on-1 Training',
    focus: 'Match preparation',
    startHour: 18,
    startMinute: 0,
    durationMinutes: 60,
    tag: 'Match Prep',
    serviceType: '1-on-1',
  },
  evening_group: {
    id: 'evening_group',
    title: 'Group Session',
    focus: 'Passing & positioning drills',
    startHour: 19,
    startMinute: 0,
    durationMinutes: 60,
    tag: '3/8 spots',
    serviceType: 'small-group',
  },
};

const WEEK_BLUEPRINT: (keyof typeof SLOT_LIBRARY)[][] = [
  ['morning_1on1', 'afternoon_1on1'],
  ['morning_1on1', 'morning_group', 'evening_1on1'],
  ['afternoon_1on1'],
  ['morning_1on1', 'afternoon_1on1', 'evening_group'],
  ['morning_1on1', 'evening_1on1'],
  ['afternoon_1on1', 'evening_group'],
  ['morning_group'],
];

export function buildAvailability(): DayAvailability[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return WEEK_BLUEPRINT.map((templates, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() + index);
    const iso = date.toISOString();

    const slots = templates.map((templateId, slotIndex) => {
      const template = SLOT_LIBRARY[templateId];
      const start = new Date(date);
      start.setHours(template.startHour, template.startMinute, 0, 0);

      return {
        id: `${iso}-${slotIndex}`,
        templateId,
        title: template.title,
        focus: template.focus,
        start,
        durationMinutes: template.durationMinutes,
        tag: template.tag,
        serviceType: template.serviceType,
      } satisfies SlotInstance;
    });

    return { id: iso, date, slots } satisfies DayAvailability;
  });
}

export function formatServicePrice(service: ServiceType) {
  const rate = formatGBP(service.price);
  return service.id !== 'team' ? `${rate}/hr` : rate;
}

export function resolveCoachAndProfile(coachId: string) {
  const coach = BOOKING_COACH_USERS.find((candidate) => candidate.id === coachId);
  const coachProfile = coach
    ? BOOKING_COACH_PROFILES.find((candidate) => candidate.userId === coach.id) ?? null
    : null;
  return { coach, coachProfile } as const;
}
