import type { ClubRole } from './definitions.js';

export type StaffingStatus = 'active' | 'cancelled' | 'completed' | 'full';

export interface StaffingClub {
  id: string;
  name: string;
}

export interface StaffingMembership {
  clubId: string;
  userId: string;
  role: ClubRole;
  status: 'active';
}

export interface StaffingStaffMember {
  userId: string;
  label: string;
  role: ClubRole;
  status: 'active';
  canTakeAssignments: boolean;
  upcomingLoad: number;
  nextSessionAt: string | null;
}

export interface StaffingWorkItem {
  offeringId: string;
  title: string;
  scheduledAt: string | null;
  location: string | null;
  isVirtual: boolean;
  status: StaffingStatus;
  sessionType: 'group';
  currentParticipants: number;
  maxParticipants: number;
  createdByUserId: string;
  createdByName: string | null;
  assigneeCoachId: string | null;
  assigneeCoachName: string | null;
  linkedBookingCount: number;
  isRecurring: boolean;
}

export interface StaffingSummary {
  activeOrgSessions: number;
  upcomingAssignedLoad: number;
  unassignedCount: number;
}

export interface StaffingConsoleData {
  club: StaffingClub;
  viewerMembership: StaffingMembership | null;
  privilegedAdminAccess: boolean;
  canManageAssignments: boolean;
  staff: StaffingStaffMember[];
  unassignedWork: StaffingWorkItem[];
  assignedWork: StaffingWorkItem[];
  summary: StaffingSummary;
}

export interface StaffingConsoleResponse extends StaffingConsoleData {
  clubId: string;
  requestId: string;
}

export interface WorkAssignmentUpdateRequest {
  assigneeCoachId: string;
}

export interface WorkAssignmentUpdateResponse {
  clubId: string;
  assignmentId: string;
  previousCoachUserId: string | null;
  assigneeCoachId: string;
  updatedBookingIds: string[];
  requestId: string;
}
