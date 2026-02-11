import type { WaitlistEntry } from '@/constants/types';

export function getWaitlistSessionTitle(entry: WaitlistEntry): string {
  return entry.sessionId || 'Session';
}

export function getWaitlistCoachName(entry: WaitlistEntry): string | undefined {
  return entry.coachId;
}

export function getWaitlistScheduledAt(_entry: WaitlistEntry): string | undefined {
  return undefined;
}
