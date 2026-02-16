/**
 * Session Child Status Types
 *
 * Types for per-child registration badges on group session cards.
 */

/** Registration status for a single child in a single session */
export type ChildRegistrationStatus = 'registered' | 'waitlisted';

/** One child's registration state for a session */
export interface SessionChildStatus {
  childId: string;
  name: string;
  status: ChildRegistrationStatus;
  colorCode: string;
}

/** Badge data for a single session card */
export interface SessionBadgeData {
  /** Child statuses — empty array means no badge */
  childStatuses: SessionChildStatus[];
}
