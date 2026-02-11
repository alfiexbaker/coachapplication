import type { SessionRsvp } from '@/constants/types';

export function getSessionRsvpChildName(rsvp: SessionRsvp): string {
  return rsvp.childId || 'your child';
}
