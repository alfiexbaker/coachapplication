import type { ClubRole } from './definitions.js';

export type HeadCoachScopeType = 'club' | 'assigned_squads';
export type HeadCoachTaskType = 'required_follow_up' | 'session_note_expectation';
export type HeadCoachTaskStatus = 'open' | 'done';
export type HeadCoachStandardCategory = 'session_notes' | 'follow_up' | 'program';

export interface HeadCoachClub {
  id: string;
  name: string;
  city: string | null;
  tagline: string | null;
  badgeUrl: string | null;
  coverPhotoUrl: string | null;
  memberCount: number;
  coachCount: number;
  squadCount: number;
  ownerId: string | null;
}

export interface HeadCoachMembership {
  clubId: string;
  userId: string;
  role: ClubRole;
  status: 'active';
  squadIds: string[];
}

export interface HeadCoachScope {
  type: HeadCoachScopeType;
  squadIds: string[];
  label: string;
}

export interface HeadCoachSquad {
  id: string;
  clubId: string;
  name: string;
  ageBandLabel: string | null;
  memberCount: number;
  ownerCoachId: string | null;
  ownerCoachName: string | null;
  nextSessionAt: string | null;
}

export interface HeadCoachCompletionItem {
  bookingId: string;
  offeringId?: string;
  coachId: string;
  coachName: string;
  athleteName: string;
  service: string;
  scheduledAt: string;
  dueAt: string;
  overdue: boolean;
  squadId?: string;
  squadName?: string;
}

export interface HeadCoachWatchlistItem {
  athleteId: string;
  athleteName: string;
  coachId: string;
  coachName: string;
  risk: 'high' | 'watch' | 'stable';
  pendingCount: number;
  overdueCount: number;
  dueSoonCount: number;
  recommendedAction: string;
  nextDueAt: string | null;
  latestCoachActionAt: string | null;
  attentionScore: number;
  taskIds: string[];
  squadId?: string;
  squadName?: string;
}

export interface HeadCoachTask {
  id: string;
  clubId: string;
  coachId: string;
  coachName: string;
  type: HeadCoachTaskType;
  status: HeadCoachTaskStatus;
  title: string;
  details?: string;
  dueAt: string | null;
  athleteId?: string;
  athleteName?: string;
  bookingId?: string;
  offeringId?: string;
  squadId?: string;
  createdAt: string;
  updatedAt: string;
  createdByUserId: string;
  completedAt?: string;
  completedByUserId?: string;
}

export interface HeadCoachStandard {
  id: string;
  clubId: string;
  category: HeadCoachStandardCategory;
  title: string;
  description?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  createdByUserId: string;
}

export interface HeadCoachCoachHealth {
  coachId: string;
  coachName: string;
  role: ClubRole;
  squadNames: string[];
  completionCount: number;
  overdueCompletionCount: number;
  watchAthleteCount: number;
  overdueFollowUpCount: number;
  openTaskCount: number;
  sessionNoteExpectationCount: number;
  requiredFollowUpCount: number;
  latestCoachActionAt: string | null;
}

export interface HeadCoachOversightSummary {
  coachCount: number;
  squadCount: number;
  awaitingCompletionCount: number;
  overdueCompletionCount: number;
  watchAthleteCount: number;
  overdueFollowUpCount: number;
  openTaskCount: number;
  activeStandardCount: number;
}

export interface HeadCoachOversightData {
  club: HeadCoachClub;
  viewerMembership: HeadCoachMembership;
  scope: HeadCoachScope;
  squads: HeadCoachSquad[];
  coachHealth: HeadCoachCoachHealth[];
  completionQueue: HeadCoachCompletionItem[];
  watchlist: HeadCoachWatchlistItem[];
  tasks: HeadCoachTask[];
  standards: HeadCoachStandard[];
  summary: HeadCoachOversightSummary;
}

export interface HeadCoachOversightResponse extends HeadCoachOversightData {
  clubId: string;
  requestId: string;
}

export interface CreateHeadCoachTaskRequest {
  coachId: string;
  type: HeadCoachTaskType;
  dueAt?: string;
  athleteId?: string;
  athleteName?: string;
  bookingId?: string;
  offeringId?: string;
  squadId?: string;
  title?: string;
  details?: string;
}

export interface UpdateHeadCoachTaskRequest {
  status: HeadCoachTaskStatus;
}

export interface HeadCoachTaskResponse extends HeadCoachTask {
  requestId: string;
}

export interface CreateHeadCoachStandardRequest {
  title: string;
  description?: string;
  category?: HeadCoachStandardCategory;
}

export interface UpdateHeadCoachStandardRequest {
  active?: boolean;
}

export interface HeadCoachStandardResponse extends HeadCoachStandard {
  requestId: string;
}
