import type { ClubRole } from './definitions.js';
import type { StaffingClub, StaffingMembership, StaffingWorkItem } from './staffing.js';

export type OwnerDashboardClub = StaffingClub;
export type OwnerDashboardMembership = StaffingMembership;

export interface OwnerDashboardSummary {
  activeStaffCount: number;
  activeOrgSessions: number;
  liveBookingCount: number;
  unassignedCount: number;
  awaitingCompletionCount: number;
  overdueCompletionCount: number;
  watchAthleteCount: number;
  overdueFollowUpCount: number;
  supportIssueCount: number;
}

export interface OwnerDashboardFinanceSummary {
  openTotal: number;
  orgCreditOpen: number;
  coachCollectedOpen: number;
  collectedTotal: number;
  writtenOffTotal: number;
  overdueCount: number;
  owedCount: number;
  note: string;
}

export type OwnerDashboardWorkItem = StaffingWorkItem;

export interface OwnerDashboardCoachHealth {
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

export interface OwnerDashboardCompletionItem {
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

export interface OwnerDashboardSupportIssue {
  id: string;
  bookingId: string;
  status: 'pending' | 'reviewed' | 'resolved';
  category: string;
  description: string;
  createdAt: string;
  scheduledAt?: string;
  sessionTitle: string;
  athleteLabel: string;
  supportLabel: string;
  deliveredByLabel: string;
}

export interface OwnerDashboardResponse {
  club: OwnerDashboardClub;
  viewerMembership: OwnerDashboardMembership | null;
  privilegedAdminAccess: boolean;
  summary: OwnerDashboardSummary;
  finance: OwnerDashboardFinanceSummary;
  unassignedWork: OwnerDashboardWorkItem[];
  coachHealth: OwnerDashboardCoachHealth[];
  completionQueue: OwnerDashboardCompletionItem[];
  supportIssues: OwnerDashboardSupportIssue[];
  clubId: string;
  requestId: string;
}
