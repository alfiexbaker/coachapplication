/**
 * Club Activity Types
 *
 * A club-facing read model that links informational events and training-shaped
 * group sessions into one coherent schedule surface.
 */

export type ClubActivitySource = 'club_event' | 'group_session' | 'match';

export type ClubActivityKind = 'informational' | 'training' | 'match';

export type ClubActivityParticipationMode = 'none' | 'rsvp' | 'registration' | 'availability';

export type ClubActivityAccessScope =
  | 'club'
  | 'squad'
  | 'public'
  | 'mixed'
  | 'private';

export type ClubActivityStatus =
  | 'draft'
  | 'scheduled'
  | 'full'
  | 'in_progress'
  | 'cancelled'
  | 'completed';

export interface ClubActivity {
  id: string;
  source: ClubActivitySource;
  sourceEntityId: string;
  clubId?: string;
  title: string;
  description?: string;
  startsAt: string;
  endsAt?: string;
  status: ClubActivityStatus;
  kind: ClubActivityKind;
  typeLabel: string;
  participationMode: ClubActivityParticipationMode;
  participationLabel: string;
  accessScope: ClubActivityAccessScope;
  accessLabel: string;
  audienceLabel: string;
  locationLabel: string;
  isVirtual: boolean;
  price?: number;
  currency?: string;
  squadId?: string;
  squadIds: string[];
  allowsExternalRegistration: boolean;
  opponent?: string;
  homeAwayLabel?: 'Home' | 'Away';
  resultLabel?: string;
}
