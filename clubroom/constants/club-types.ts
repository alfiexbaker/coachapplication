/**
 * Club Types
 *
 * Club, squad, membership, club feed, and academy types.
 */

// ============================================================================
// CLUB & SQUAD SYSTEM
// ============================================================================

export type ClubRole = 'OWNER' | 'ADMIN' | 'HEAD_COACH' | 'COACH' | 'MEMBER';

export interface Club {
  id: string;
  name: string;
  city: string;
  country?: string;
  badge?: string;
  photoUrl?: string;
  profilePhotoUrl?: string;
  coverPhotoUrl?: string;
  tagline?: string;
  memberCount: number;
  coachCount: number;
  squadCount: number;
  ownerId: string;
  ownerName: string; // TODO(T3.4): Remove when connecting to real API — resolve from ownerId instead
  inviteCode: string;
}

export interface ClubMembership {
  clubId: string;
  userId: string;
  role: ClubRole;
  status: 'active' | 'pending';
  joinSource: 'invite' | 'created';
  inviteCode?: string;
  squadIds?: string[];
  canPostAsClub?: boolean;
}

export interface ClubSquad {
  id: string;
  clubId: string;
  name: string;
  level: string;
  description?: string;
  memberCount: number;
  primaryCoach: string;
  meetLocation: string;
  nextSession?: string;
  tags?: string[];
  ageMin?: number;
  ageMax?: number;
  /** Auto-provisioned parent group chat ID for this squad */
  groupId?: string;
}

// Squad member types for squad-based invites
export interface SquadMember {
  id: string;
  squadId: string;
  athleteId: string;
  athleteName: string; // TODO(T3.4): Remove when connecting to real API — resolve from athleteId instead
  athleteAge?: number; // TODO(T3.4): Remove when connecting to real API — resolve from athleteId instead
  athletePhotoUrl?: string; // TODO(T3.4): Remove when connecting to real API — resolve from athleteId instead
  parentId: string;
  parentName: string; // TODO(T3.4): Remove when connecting to real API — resolve from parentId instead
  parentEmail?: string; // TODO(T3.4): Remove when connecting to real API — resolve from parentId instead
  parentPhone?: string; // TODO(T3.4): Remove when connecting to real API — resolve from parentId instead
  status: 'ACTIVE' | 'INACTIVE' | 'PENDING';
  joinedAt: string;
  position?: string;
  jerseyNumber?: number;
}

// Squad invite tracking
export interface SquadInvite {
  id: string;
  squadId: string;
  squadName: string; // TODO(T3.4): Remove when connecting to real API — resolve from squadId instead
  targetType: 'SESSION' | 'MATCH' | 'EVENT';
  targetId: string;
  targetTitle: string; // TODO(T3.4): Remove when connecting to real API — resolve from targetId instead
  invitedBy: string;
  invitedByName: string; // TODO(T3.4): Remove when connecting to real API — resolve from invitedBy instead
  invitedAt: string;
  memberCount: number;
  excludedMemberIds?: string[];
  responses: {
    accepted: number;
    declined: number;
    pending: number;
  };
}

// Squad session invite - for bulk inviting squad members to sessions
export interface SquadSessionInvite {
  id: string;
  squadId: string;
  squadName: string; // TODO(T3.4): Remove when connecting to real API — resolve from squadId instead
  sessionId: string;
  sessionTitle: string; // TODO(T3.4): Remove when connecting to real API — resolve from sessionId instead
  invitedMembers: SquadInvitedMember[];
  sentAt: string;
  sentBy: string;
  sentByName: string; // TODO(T3.4): Remove when connecting to real API — resolve from sentBy instead
  status: 'SENT' | 'PARTIAL' | 'FAILED';
  result: BulkInviteResult;
}

// Individual member in a squad bulk invite
export interface SquadInvitedMember {
  memberId: string;
  athleteId: string;
  athleteName: string; // TODO(T3.4): Remove when connecting to real API — resolve from athleteId instead
  parentId: string;
  parentName: string; // TODO(T3.4): Remove when connecting to real API — resolve from parentId instead
  inviteId?: string; // Reference to the individual SessionInvite created
  status: 'SENT' | 'FAILED' | 'SKIPPED';
  failureReason?: string;
  skipReason?: string;
}

// Result of a bulk invite operation
export interface BulkInviteResult {
  sent: number;
  successful: number; // Alias for sent - number of invites successfully sent
  failed: number;
  skipped: number;
  totalAttempted: number;
  errors: BulkInviteError[];
  groupId?: string;
}

// Error details for failed bulk invites
export interface BulkInviteError {
  memberId: string;
  athleteName: string; // TODO(T3.4): Remove when connecting to real API — resolve from memberId instead
  error: string;
  code?: 'DUPLICATE' | 'INVALID_PARENT' | 'RATE_LIMITED' | 'UNKNOWN';
}

// Squad invite history entry
export interface SquadInviteHistoryEntry {
  id: string;
  squadId: string;
  squadName: string; // TODO(T3.4): Remove when connecting to real API — resolve from squadId instead
  sessionId: string;
  sessionTitle: string; // TODO(T3.4): Remove when connecting to real API — resolve from sessionId instead
  sessionType: string;
  focus: string;
  sentAt: string;
  sentBy: string;
  sentByName: string; // TODO(T3.4): Remove when connecting to real API — resolve from sentBy instead
  inviteCount: number;
  acceptedCount: number;
  declinedCount: number;
  pendingCount: number;
  status: 'ACTIVE' | 'COMPLETED' | 'EXPIRED';
}

export interface ClubInvite {
  code: string;
  clubId: string;
  clubName: string; // TODO(T3.4): Remove when connecting to real API — resolve from clubId instead
  createdBy: string;
  createdByName: string; // TODO(T3.4): Remove when connecting to real API — resolve from createdBy instead
  role: ClubRole;
  expiresAt: string;
  remainingUses: number;
}

export type ClubPostType = 'announcement' | 'photo' | 'event' | 'general' | 'achievement' | 'session' | 'match' | 'session_announcement';

/** Filter for club/social feed queries. */
export type FeedFilter = 'all' | 'announcement' | 'photo' | 'event' | 'achievement' | 'session' | 'match' | 'session_announcement';

/** Where a post appears: personal coach feed, club feed, or both. */
export type FeedType = 'PERSONAL' | 'CLUB' | 'BOTH';

export interface ClubFeedPost {
  id: string;
  clubId: string;
  title: string;
  body: string;
  createdAt: string;
  audience: 'club' | 'squad' | 'staff';
  audienceLabel?: string;
  authorName: string; // TODO(T3.4): Remove when connecting to real API — resolve from authorId instead
  authorId?: string;
  authorAvatar?: string; // TODO(T3.4): Remove when connecting to real API — resolve from authorId instead
  postAs?: 'club' | 'self';
  postType?: ClubPostType;
  /** Where this post is published: personal coach feed, club feed, or both. Defaults to 'CLUB'. */
  feedType?: FeedType;
  badgeAwarded?: string;
  attachments?: string[];
  imageUrl?: string;
  reactionCount?: number;
  commentCount?: number;
  isPinned?: boolean;
  pinnedBy?: string;
  pinnedAt?: string;
  eventDate?: string;
  eventLocation?: string;
  // Achievement post fields
  athleteId?: string;
  athleteName?: string; // TODO(T3.4): Remove when connecting to real API — resolve from athleteId instead
  badgeId?: string;
  badgeAwardId?: string;
  // Session/Match post fields
  sessionId?: string;
  matchId?: string;
  // Session announcement fields (for OPEN session auto-posts)
  sessionPrice?: number;
  sessionCurrency?: string;
  sessionTime?: string;
  sessionType?: string;
  // Parent who shared this (for achievement shares)
  sharedByParentId?: string;
  sharedByParentName?: string; // TODO(T3.4): Remove when connecting to real API — resolve from sharedByParentId instead
}

// ============================================================================
// ACADEMY / SCHOOL SYSTEM
// ============================================================================

import type { SportCategory, FootballObjective } from './user-types';

export type AcademyPermission =
  | 'MANAGE_STAFF'
  | 'MANAGE_SETTINGS'
  | 'CREATE_SESSIONS'
  | 'VIEW_ANALYTICS'
  | 'MANAGE_BILLING'
  | 'POST_AS_ACADEMY'
  | 'INVITE_MEMBERS';

export interface Academy {
  id: string;
  name: string;
  slug: string;
  description: string;
  logoUrl?: string;
  bannerUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  email?: string;
  phone?: string;
  website?: string;
  address?: string;
  postcode: string;
  city: string;
  coachCount: number;
  athleteCount: number;
  sessionCount: number;
  isPublic: boolean;
  requiresApproval: boolean;
  ownerId: string;
  ownerName: string; // TODO(T3.4): Remove when connecting to real API — resolve from ownerId instead
  createdAt: string;
  rating?: {
    average: number;
    reviewCount: number;
  };
  sports: SportCategory[];
  specialties: FootballObjective[];
}

export interface AcademyMembership {
  id: string;
  academyId: string;
  userId: string;
  userName: string; // TODO(T3.4): Remove when connecting to real API — resolve from userId instead
  userPhotoUrl?: string; // TODO(T3.4): Remove when connecting to real API — resolve from userId instead
  role: 'OWNER' | 'ADMIN' | 'HEAD_COACH' | 'COACH' | 'ASSISTANT' | 'MEMBER';
  permissions: AcademyPermission[];
  status: 'ACTIVE' | 'PENDING' | 'SUSPENDED';
  joinedAt: string;
  invitedBy?: string;
}

export interface AcademyInvite {
  id: string;
  academyId: string;
  academyName: string; // TODO(T3.4): Remove when connecting to real API — resolve from academyId instead
  code: string;
  role: AcademyMembership['role'];
  permissions: AcademyPermission[];
  createdBy: string;
  createdByName: string; // TODO(T3.4): Remove when connecting to real API — resolve from createdBy instead
  expiresAt: string;
  maxUses: number;
  currentUses: number;
}

// ============================================================================
// COACH ROSTER & ATHLETE DIRECTORY
// ============================================================================

export interface RosterNote {
  id: string;
  content: string;
  createdAt: string;
  updatedAt?: string;
}

export interface RosterEntry {
  id: string;
  coachId: string;
  athleteId: string;
  athleteName: string; // TODO(T3.4): Remove when connecting to real API — resolve from athleteId instead
  athleteAge?: number; // TODO(T3.4): Remove when connecting to real API — resolve from athleteId instead
  athletePhotoUrl?: string; // TODO(T3.4): Remove when connecting to real API — resolve from athleteId instead
  athleteSkillLevel?: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'; // TODO(T3.4): Remove when connecting to real API — resolve from athleteId instead
  parentId: string;
  parentName: string; // TODO(T3.4): Remove when connecting to real API — resolve from parentId instead
  parentEmail?: string; // TODO(T3.4): Remove when connecting to real API — resolve from parentId instead
  parentPhone?: string; // TODO(T3.4): Remove when connecting to real API — resolve from parentId instead
  status: 'ACTIVE' | 'PAUSED' | 'GRADUATED' | 'INACTIVE';
  startDate: string;
  lastSessionDate?: string;
  nextSessionDate?: string;
  totalSessions: number;
  totalRevenue: number;
  averageRating: number;
  notes: RosterNote[];
  tags: string[];
  primaryFocus?: FootballObjective;
  notificationPreference: 'ALL' | 'IMPORTANT' | 'NONE';
  senInfo?: {
    hasSen: boolean;
    conditions: string[];
    supportNotes?: string;
    communicationPreferences?: string;
  };
}
