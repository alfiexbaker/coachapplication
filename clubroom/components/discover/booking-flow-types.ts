/**
 * BookingFlow shared types, constants, and data builders.
 */
import type { CoachProfile } from '@/constants/types';

export interface BookingFlowPreviewProps {
  coach?: CoachProfile;
}

export interface SlotTemplate {
  id: string;
  title: string;
  focus: string;
  startHour: number;
  startMinute: number;
  durationMinutes: number;
  tag: string;
}

export interface SlotInstance {
  id: string;
  templateId: string;
  title: string;
  focus: string;
  start: Date;
  durationMinutes: number;
  tag: string;
}

export interface DayAvailability {
  id: string;
  date: Date;
  slots: SlotInstance[];
}

export const SLOT_LIBRARY: Record<string, SlotTemplate> = {
  skill_lab: { id: 'skill_lab', title: 'Striker lab', focus: 'First-touch + finishing gauntlet', startHour: 7, startMinute: 30, durationMinutes: 75, tag: 'GPS capture on' },
  partnership_sync: { id: 'partnership_sync', title: 'Coach/parent sync', focus: 'Session plan walkthrough', startHour: 16, startMinute: 0, durationMinutes: 45, tag: 'Session notes drop' },
  intensity_block: { id: 'intensity_block', title: 'High-load conditioning', focus: 'Speed gates + change of pace', startHour: 10, startMinute: 15, durationMinutes: 60, tag: 'Wearable data sync' },
  video_room: { id: 'video_room', title: 'Match film breakdown', focus: 'Pattern ID + decision tree', startHour: 18, startMinute: 0, durationMinutes: 50, tag: 'Virtual room' },
  keeper_lab: { id: 'keeper_lab', title: 'Keeper command session', focus: 'Reaction wall + distribution', startHour: 9, startMinute: 15, durationMinutes: 65, tag: 'Ball machine' },
};

const WEEK_BLUEPRINT: (keyof typeof SLOT_LIBRARY)[][] = [
  ['skill_lab', 'intensity_block'],
  ['keeper_lab', 'video_room'],
  [],
  ['skill_lab', 'partnership_sync'],
  ['intensity_block'],
  ['skill_lab', 'keeper_lab'],
  ['partnership_sync', 'video_room'],
];

export function buildAvailability(): DayAvailability[] {
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  return WEEK_BLUEPRINT.map((templates, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() + index);
    const iso = date.toISOString();
    const slots = templates.map((templateId, slotIndex) => {
      const template = SLOT_LIBRARY[templateId];
      const start = new Date(date);
      start.setHours(template.startHour, template.startMinute, 0, 0);
      return { id: `${iso}-${slotIndex}`, templateId, title: template.title, focus: template.focus, start, durationMinutes: template.durationMinutes, tag: template.tag } satisfies SlotInstance;
    });
    return { id: iso, date, slots } satisfies DayAvailability;
  });
}

export const athleteProfile = {
  name: 'Eli Torres · 14U winger',
  readiness: 'Pre-ECNL',
  needs: 'Confidence in the final third',
  cadence: 'Weekly 1:1 + async film',
};

export const bookingSteps = [
  { id: 'context', title: 'Plan', description: 'Parents drop goals, footage, and preferred cadence.', status: 'complete' as const },
  { id: 'schedule', title: 'Schedule', description: 'Live availability stays in sync with the coach calendar.', status: 'current' as const },
  { id: 'confirm', title: 'Confirm', description: 'Secure session + payment, unlock chat + map later.', status: 'upcoming' as const },
];
