import { z } from 'zod';
import type {
  CreateHeadCoachStandardRequest,
  CreateHeadCoachTaskRequest,
  HeadCoachOversightResponse,
  HeadCoachStandardResponse,
  HeadCoachTaskResponse,
  UpdateHeadCoachStandardRequest,
  UpdateHeadCoachTaskRequest,
} from './head-coach.js';
import type { OwnerDashboardResponse } from './owner-dashboard.js';
import type {
  StaffingConsoleResponse,
  WorkAssignmentUpdateRequest,
  WorkAssignmentUpdateResponse,
} from './staffing.js';

export type {
  CreateHeadCoachStandardRequest,
  CreateHeadCoachTaskRequest,
  HeadCoachClub,
  HeadCoachCoachHealth,
  HeadCoachCompletionItem,
  HeadCoachMembership,
  HeadCoachOversightData,
  HeadCoachOversightResponse,
  HeadCoachOversightSummary,
  HeadCoachScope,
  HeadCoachScopeType,
  HeadCoachSquad,
  HeadCoachStandard,
  HeadCoachStandardCategory,
  HeadCoachStandardResponse,
  HeadCoachTask,
  HeadCoachTaskResponse,
  HeadCoachTaskStatus,
  HeadCoachTaskType,
  HeadCoachWatchlistItem,
  UpdateHeadCoachStandardRequest,
  UpdateHeadCoachTaskRequest,
} from './head-coach.js';

export type {
  OwnerDashboardClub,
  OwnerDashboardCoachHealth,
  OwnerDashboardCompletionItem,
  OwnerDashboardFinanceSummary,
  OwnerDashboardMembership,
  OwnerDashboardResponse,
  OwnerDashboardSummary,
  OwnerDashboardSupportIssue,
  OwnerDashboardWorkItem,
} from './owner-dashboard.js';

export type {
  StaffingClub,
  StaffingConsoleData,
  StaffingConsoleResponse,
  StaffingMembership,
  StaffingStaffMember,
  StaffingStatus,
  StaffingSummary,
  StaffingWorkItem,
  WorkAssignmentUpdateRequest,
  WorkAssignmentUpdateResponse,
} from './staffing.js';

export {
  clubAccessLevels,
  clubCapabilities,
  clubRelationshipLayers,
  clubVisibilityAreas,
  organizationCommercialModes,
  organizationJoinPolicies,
  organizationRoles,
} from './definitions.js';

export type {
  ClubAccessLevel,
  ClubCapability,
  ClubRelationshipLayer,
  ClubRole,
  ClubVisibilityArea,
  OrganizationCommercialMode,
  OrganizationJoinPolicy,
  OrganizationRole,
} from './definitions.js';

import {
  clubAccessLevels,
  clubCapabilities,
  clubRelationshipLayers,
  clubVisibilityAreas,
  organizationCommercialModes,
  organizationJoinPolicies,
  organizationRoles,
} from './definitions.js';

export const organizationRoleSchema = z.enum(organizationRoles);
export const clubRoleSchema = organizationRoleSchema;

export const organizationCommercialModeSchema = z.enum(organizationCommercialModes);
export const organizationJoinPolicySchema = z.enum(organizationJoinPolicies);
export const clubRelationshipLayerSchema = z.enum(clubRelationshipLayers);
export const clubAccessLevelSchema = z.enum(clubAccessLevels);
export const clubCapabilitySchema = z.enum(clubCapabilities);
export const clubVisibilityAreaSchema = z.enum(clubVisibilityAreas);

export const clubInviteStatusSchema = z.enum(['pending', 'accepted', 'declined']);
export const clubDirectInviteRoleSchema = z.enum(['MEMBER', 'COACH', 'ADMIN']);
export const clubJoinFlowSchema = z.enum(['direct_join', 'invite_review']);

export const clubJoinPreviewSchema = z
  .object({
    clubId: z.string(),
    clubName: z.string(),
    clubSlug: z.string().nullable(),
    visibility: z.enum(['private', 'public']).nullable(),
    joinPolicy: organizationJoinPolicySchema,
    inviteCode: z.string(),
    role: clubRoleSchema,
    joinFlow: clubJoinFlowSchema,
    expiresAt: z.string().datetime(),
    alreadyMember: z.boolean(),
  })
  .strict();

export const resolveClubJoinCodeResponseSchema = z
  .object({
    preview: clubJoinPreviewSchema,
    requestId: z.string(),
  })
  .strict();

export const joinClubRequestSchema = z
  .object({
    code: z.string().trim().min(4),
  })
  .strict();

export const clubMembershipSummarySchema = z
  .object({
    id: z.string(),
    clubId: z.string(),
    userId: z.string(),
    role: clubRoleSchema,
    active: z.boolean(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .strict();

export const clubSummarySchema = z
  .object({
    id: z.string(),
    name: z.string(),
    city: z.string().nullable(),
    country: z.string().nullable(),
    tagline: z.string().nullable(),
    slug: z.string().nullable(),
    visibility: z.enum(['private', 'public']).nullable(),
    joinPolicy: organizationJoinPolicySchema,
    commercialMode: organizationCommercialModeSchema.nullable(),
    createdByUserId: z.string().optional(),
    inviteCode: z.string().nullable(),
  })
  .strict();

export const clubJoinSummarySchema = clubSummarySchema.extend({
  inviteCode: z.string(),
});

export const pendingClubInviteSchema = z
  .object({
    id: z.string(),
    clubId: z.string(),
    clubName: z.string(),
    targetUserId: z.string().optional(),
    targetKind: z.enum(['user', 'email']).optional(),
    targetEmailHint: z.string().optional(),
    inviteCode: z.string(),
    role: clubRoleSchema,
    invitedByUserId: z.string(),
    invitedByLabel: z.string(),
    status: clubInviteStatusSchema,
    createdAt: z.string().datetime(),
    expiresAt: z.string().datetime(),
    respondedAt: z.string().datetime().nullable(),
  })
  .strict();

const joinClubResponseBase = {
  club: clubJoinSummarySchema,
  requestId: z.string(),
};

export const joinClubResponseSchema = z.discriminatedUnion('outcome', [
  z
    .object({
      ...joinClubResponseBase,
      outcome: z.literal('joined'),
      membership: clubMembershipSummarySchema,
      invite: z.null(),
    })
    .strict(),
  z
    .object({
      ...joinClubResponseBase,
      outcome: z.literal('invite_pending'),
      membership: z.null(),
      invite: pendingClubInviteSchema,
    })
    .strict(),
  z
    .object({
      ...joinClubResponseBase,
      outcome: z.literal('already_member'),
      membership: clubMembershipSummarySchema,
      invite: z.null(),
    })
    .strict(),
]);

const dashboardCountSchema = z.number().int().nonnegative();

export const ownerDashboardClubSchema = z
  .object({
    id: z.string(),
    name: z.string(),
  })
  .strict();

export const ownerDashboardMembershipSchema = z
  .object({
    clubId: z.string(),
    userId: z.string(),
    role: clubRoleSchema,
    status: z.literal('active'),
  })
  .strict();

export const staffingStaffMemberSchema = z
  .object({
    userId: z.string(),
    label: z.string(),
    role: clubRoleSchema,
    status: z.literal('active'),
    canTakeAssignments: z.boolean(),
    upcomingLoad: dashboardCountSchema,
    nextSessionAt: z.string().datetime().nullable(),
  })
  .strict();

export const ownerDashboardSummarySchema = z
  .object({
    activeStaffCount: dashboardCountSchema,
    activeOrgSessions: dashboardCountSchema,
    liveBookingCount: dashboardCountSchema,
    unassignedCount: dashboardCountSchema,
    awaitingCompletionCount: dashboardCountSchema,
    overdueCompletionCount: dashboardCountSchema,
    watchAthleteCount: dashboardCountSchema,
    overdueFollowUpCount: dashboardCountSchema,
    supportIssueCount: dashboardCountSchema,
  })
  .strict();

export const ownerDashboardFinanceSummarySchema = z
  .object({
    openTotal: z.number().nonnegative(),
    orgCreditOpen: z.number().nonnegative(),
    coachCollectedOpen: z.number().nonnegative(),
    collectedTotal: z.number().nonnegative(),
    writtenOffTotal: z.number().nonnegative(),
    overdueCount: dashboardCountSchema,
    owedCount: dashboardCountSchema,
    note: z.string(),
  })
  .strict();

export const ownerDashboardWorkItemSchema = z
  .object({
    offeringId: z.string(),
    title: z.string(),
    scheduledAt: z.string().datetime().nullable(),
    location: z.string().nullable(),
    isVirtual: z.boolean(),
    status: z.enum(['active', 'cancelled', 'completed', 'full']),
    sessionType: z.literal('group'),
    currentParticipants: dashboardCountSchema,
    maxParticipants: dashboardCountSchema,
    createdByUserId: z.string(),
    createdByName: z.string().nullable(),
    assigneeCoachId: z.string().nullable(),
    assigneeCoachName: z.string().nullable(),
    linkedBookingCount: dashboardCountSchema,
    isRecurring: z.boolean(),
  })
  .strict();

export const staffingSummarySchema = z
  .object({
    activeOrgSessions: dashboardCountSchema,
    upcomingAssignedLoad: dashboardCountSchema,
    unassignedCount: dashboardCountSchema,
  })
  .strict();

export const staffingConsoleResponseSchema: z.ZodType<StaffingConsoleResponse> = z
  .object({
    club: ownerDashboardClubSchema,
    viewerMembership: ownerDashboardMembershipSchema.nullable(),
    privilegedAdminAccess: z.boolean(),
    canManageAssignments: z.boolean(),
    staff: z.array(staffingStaffMemberSchema),
    unassignedWork: z.array(ownerDashboardWorkItemSchema),
    assignedWork: z.array(ownerDashboardWorkItemSchema),
    summary: staffingSummarySchema,
    clubId: z.string(),
    requestId: z.string(),
  })
  .strict();

export const workAssignmentUpdateRequestSchema: z.ZodType<WorkAssignmentUpdateRequest> = z
  .object({
    assigneeCoachId: z.string().min(1),
  })
  .strict();

export const workAssignmentUpdateResponseSchema: z.ZodType<WorkAssignmentUpdateResponse> = z
  .object({
    clubId: z.string(),
    assignmentId: z.string(),
    previousCoachUserId: z.string().nullable(),
    assigneeCoachId: z.string(),
    updatedBookingIds: z.array(z.string()),
    requestId: z.string(),
  })
  .strict();

export const ownerDashboardCoachHealthSchema = z
  .object({
    coachId: z.string(),
    coachName: z.string(),
    role: clubRoleSchema,
    squadNames: z.array(z.string()),
    completionCount: dashboardCountSchema,
    overdueCompletionCount: dashboardCountSchema,
    watchAthleteCount: dashboardCountSchema,
    overdueFollowUpCount: dashboardCountSchema,
    openTaskCount: dashboardCountSchema,
    sessionNoteExpectationCount: dashboardCountSchema,
    requiredFollowUpCount: dashboardCountSchema,
    latestCoachActionAt: z.string().datetime().nullable(),
  })
  .strict();

export const ownerDashboardCompletionItemSchema = z
  .object({
    bookingId: z.string(),
    offeringId: z.string().optional(),
    coachId: z.string(),
    coachName: z.string(),
    athleteName: z.string(),
    service: z.string(),
    scheduledAt: z.string().datetime(),
    dueAt: z.string().datetime(),
    overdue: z.boolean(),
    squadId: z.string().optional(),
    squadName: z.string().optional(),
  })
  .strict();

export const ownerDashboardSupportIssueSchema = z
  .object({
    id: z.string(),
    bookingId: z.string(),
    status: z.enum(['pending', 'reviewed', 'resolved']),
    category: z.string(),
    description: z.string(),
    createdAt: z.string().datetime(),
    scheduledAt: z.string().datetime().optional(),
    sessionTitle: z.string(),
    athleteLabel: z.string(),
    supportLabel: z.string(),
    deliveredByLabel: z.string(),
  })
  .strict();

export const ownerDashboardResponseSchema: z.ZodType<OwnerDashboardResponse> = z
  .object({
    club: ownerDashboardClubSchema,
    viewerMembership: ownerDashboardMembershipSchema.nullable(),
    privilegedAdminAccess: z.boolean(),
    summary: ownerDashboardSummarySchema,
    finance: ownerDashboardFinanceSummarySchema,
    unassignedWork: z.array(ownerDashboardWorkItemSchema),
    coachHealth: z.array(ownerDashboardCoachHealthSchema),
    completionQueue: z.array(ownerDashboardCompletionItemSchema),
    supportIssues: z.array(ownerDashboardSupportIssueSchema),
    clubId: z.string(),
    requestId: z.string(),
  })
  .strict();

const headCoachCountSchema = z.number().int().nonnegative();

export const headCoachTaskTypeSchema = z.enum(['required_follow_up', 'session_note_expectation']);
export const headCoachTaskStatusSchema = z.enum(['open', 'done']);
export const headCoachStandardCategorySchema = z.enum(['session_notes', 'follow_up', 'program']);

export const createHeadCoachTaskRequestSchema: z.ZodType<CreateHeadCoachTaskRequest> = z
  .object({
    coachId: z.string().trim().min(1),
    type: headCoachTaskTypeSchema,
    dueAt: z.string().datetime().optional(),
    athleteId: z.string().trim().min(1).optional(),
    athleteName: z.string().trim().min(1).optional(),
    bookingId: z.string().trim().min(1).optional(),
    offeringId: z.string().trim().min(1).optional(),
    squadId: z.string().trim().min(1).optional(),
    title: z.string().trim().min(1).optional(),
    details: z.string().trim().min(1).optional(),
  })
  .strict();

export const updateHeadCoachTaskRequestSchema: z.ZodType<UpdateHeadCoachTaskRequest> = z
  .object({
    status: headCoachTaskStatusSchema,
  })
  .strict();

export const createHeadCoachStandardRequestSchema: z.ZodType<CreateHeadCoachStandardRequest> = z
  .object({
    title: z.string().trim().min(1),
    description: z.string().trim().min(1).optional(),
    category: headCoachStandardCategorySchema.optional(),
  })
  .strict();

export const updateHeadCoachStandardRequestSchema: z.ZodType<UpdateHeadCoachStandardRequest> = z
  .object({
    active: z.boolean().optional(),
  })
  .strict();

export const headCoachClubSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    city: z.string().nullable(),
    tagline: z.string().nullable(),
    badgeUrl: z.string().nullable(),
    coverPhotoUrl: z.string().nullable(),
    memberCount: headCoachCountSchema,
    coachCount: headCoachCountSchema,
    squadCount: headCoachCountSchema,
    ownerId: z.string().nullable(),
  })
  .strict();

export const headCoachMembershipSchema = z
  .object({
    clubId: z.string(),
    userId: z.string(),
    role: clubRoleSchema,
    status: z.literal('active'),
    squadIds: z.array(z.string()),
  })
  .strict();

export const headCoachScopeSchema = z
  .object({
    type: z.enum(['club', 'assigned_squads']),
    squadIds: z.array(z.string()),
    label: z.string(),
  })
  .strict();

export const headCoachSquadSchema = z
  .object({
    id: z.string(),
    clubId: z.string(),
    name: z.string(),
    ageBandLabel: z.string().nullable(),
    memberCount: headCoachCountSchema,
    ownerCoachId: z.string().nullable(),
    ownerCoachName: z.string().nullable(),
    nextSessionAt: z.string().datetime().nullable(),
  })
  .strict();

export const headCoachCompletionItemSchema = ownerDashboardCompletionItemSchema;

export const headCoachWatchlistItemSchema = z
  .object({
    athleteId: z.string(),
    athleteName: z.string(),
    coachId: z.string(),
    coachName: z.string(),
    risk: z.enum(['high', 'watch', 'stable']),
    pendingCount: headCoachCountSchema,
    overdueCount: headCoachCountSchema,
    dueSoonCount: headCoachCountSchema,
    recommendedAction: z.string(),
    nextDueAt: z.string().datetime().nullable(),
    latestCoachActionAt: z.string().datetime().nullable(),
    attentionScore: headCoachCountSchema,
    taskIds: z.array(z.string()),
    squadId: z.string().optional(),
    squadName: z.string().optional(),
  })
  .strict();

export const headCoachTaskSchema = z
  .object({
    id: z.string(),
    clubId: z.string(),
    coachId: z.string(),
    coachName: z.string(),
    type: headCoachTaskTypeSchema,
    status: headCoachTaskStatusSchema,
    title: z.string(),
    details: z.string().optional(),
    dueAt: z.string().datetime().nullable(),
    athleteId: z.string().optional(),
    athleteName: z.string().optional(),
    bookingId: z.string().optional(),
    offeringId: z.string().optional(),
    squadId: z.string().optional(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
    createdByUserId: z.string(),
    completedAt: z.string().datetime().optional(),
    completedByUserId: z.string().optional(),
  })
  .strict();

export const headCoachStandardSchema = z
  .object({
    id: z.string(),
    clubId: z.string(),
    category: headCoachStandardCategorySchema,
    title: z.string(),
    description: z.string().optional(),
    active: z.boolean(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
    createdByUserId: z.string(),
  })
  .strict();

export const headCoachCoachHealthSchema = ownerDashboardCoachHealthSchema;

export const headCoachOversightSummarySchema = z
  .object({
    coachCount: headCoachCountSchema,
    squadCount: headCoachCountSchema,
    awaitingCompletionCount: headCoachCountSchema,
    overdueCompletionCount: headCoachCountSchema,
    watchAthleteCount: headCoachCountSchema,
    overdueFollowUpCount: headCoachCountSchema,
    openTaskCount: headCoachCountSchema,
    activeStandardCount: headCoachCountSchema,
  })
  .strict();

export const headCoachOversightResponseSchema: z.ZodType<HeadCoachOversightResponse> = z
  .object({
    club: headCoachClubSchema,
    viewerMembership: headCoachMembershipSchema,
    scope: headCoachScopeSchema,
    squads: z.array(headCoachSquadSchema),
    coachHealth: z.array(headCoachCoachHealthSchema),
    completionQueue: z.array(headCoachCompletionItemSchema),
    watchlist: z.array(headCoachWatchlistItemSchema),
    tasks: z.array(headCoachTaskSchema),
    standards: z.array(headCoachStandardSchema),
    summary: headCoachOversightSummarySchema,
    clubId: z.string(),
    requestId: z.string(),
  })
  .strict();

export const headCoachTaskResponseSchema: z.ZodType<HeadCoachTaskResponse> = headCoachTaskSchema
  .extend({
    requestId: z.string(),
  })
  .strict();

export const headCoachStandardResponseSchema: z.ZodType<HeadCoachStandardResponse> =
  headCoachStandardSchema
    .extend({
      requestId: z.string(),
    })
    .strict();

export const clubInviteCodeSchema = z.object({
  id: z.string(),
  clubId: z.string(),
  code: z.string(),
  role: clubRoleSchema,
  createdByUserId: z.string(),
  createdAt: z.string().datetime(),
  expiresAt: z.string().datetime(),
  remainingUses: z.number().int().nonnegative(),
});

export const clubInviteCodesResponseSchema = z.object({
  inviteCodes: z.array(clubInviteCodeSchema),
  requestId: z.string(),
});

export const createClubInviteCodeRequestSchema = z.object({
  role: clubRoleSchema,
});

export const createClubInvitesRequestSchema = z
  .object({
    targetUserIds: z.array(z.string().trim().min(1)).max(50).default([]),
    targetEmails: z.array(z.string().trim().email().max(254)).max(50).default([]),
    role: clubDirectInviteRoleSchema.default('MEMBER'),
  })
  .strict()
  .refine((body) => body.targetUserIds.length + body.targetEmails.length > 0, {
    message: 'At least one target user or email is required',
  })
  .refine((body) => body.targetUserIds.length + body.targetEmails.length <= 50, {
    message: 'At most 50 invite targets are supported',
  });

export const clubInviteEmailDeliverySummarySchema = z
  .object({
    total: z.number().int().nonnegative(),
    sent: z.number().int().nonnegative(),
    skipped: z.number().int().nonnegative(),
    failed: z.number().int().nonnegative(),
    providers: z.array(z.enum(['webhook', 'brevo_api', 'smtp', 'dev_outbox', 'none'])),
  })
  .strict();

export const createClubInvitesResponseSchema = z
  .object({
    invites: z.array(pendingClubInviteSchema),
    total: z.number().int().nonnegative(),
    emailDelivery: clubInviteEmailDeliverySummarySchema.optional(),
    requestId: z.string(),
  })
  .strict();

export const clubInvitesResponseSchema = z
  .object({
    invites: z.array(pendingClubInviteSchema),
    requestId: z.string(),
  })
  .strict();

export const respondToClubInviteRequestSchema = z
  .object({
    response: z.enum(['accepted', 'declined']),
  })
  .strict();

export const respondToClubInviteResponseSchema = z
  .object({
    invite: pendingClubInviteSchema,
    membership: clubMembershipSummarySchema.nullable(),
    club: clubSummarySchema,
    requestId: z.string(),
  })
  .strict();

export const clubMatchTypeSchema = z.enum(['FRIENDLY', 'LEAGUE', 'CUP', 'TOURNAMENT']);

export const clubMatchStatusSchema = z.enum([
  'SCHEDULED',
  'LINEUP_SET',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
]);

export const clubMatchPlayerStatusSchema = z.enum([
  'INVITED',
  'AVAILABLE',
  'UNAVAILABLE',
  'SELECTED',
  'RESERVE',
]);

function isValidClubMatchLocalDate(value: string): boolean {
  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}

export const clubMatchLocalDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD')
  .refine(isValidClubMatchLocalDate, 'date must be a valid calendar date');

export const clubMatchLocalTimeSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'time must be HH:mm');

export const clubMatchPlayerSchema = z
  .object({
    athleteId: z.string(),
    parentId: z.string(),
    status: clubMatchPlayerStatusSchema,
    responseAt: z.string().datetime().optional(),
    parentNote: z.string().optional(),
    position: z.string().optional(),
    jerseyNumber: z.number().int().min(0).max(99).optional(),
  })
  .strict();

export const clubMatchResultSchema = z
  .object({
    home: z.number().int().min(0).max(99),
    away: z.number().int().min(0).max(99),
  })
  .strict();

export const clubMatchSchema = z
  .object({
    id: z.string(),
    clubId: z.string(),
    squadId: z.string().optional(),
    coachId: z.string(),
    title: z.string(),
    matchType: clubMatchTypeSchema,
    opponent: z.string(),
    isHome: z.boolean(),
    date: clubMatchLocalDateSchema,
    kickoffTime: clubMatchLocalTimeSchema,
    timeZone: z.string().min(1),
    meetTime: clubMatchLocalTimeSchema.optional(),
    venue: z.string(),
    address: z.string().optional(),
    maxPlayers: z.number().int().min(1).max(30),
    selectedPlayers: z.array(clubMatchPlayerSchema),
    status: clubMatchStatusSchema,
    result: clubMatchResultSchema.optional(),
    canManageMatch: z.boolean().optional(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime().optional(),
    notes: z.string().optional(),
  })
  .strict();

export const listClubMatchesQuerySchema = z
  .object({
    status: clubMatchStatusSchema.optional(),
    limit: z.coerce.number().int().min(1).max(50).optional(),
  })
  .strict();

export const listClubMatchesResponseSchema = z
  .object({
    clubId: z.string(),
    matches: z.array(clubMatchSchema),
    total: z.number().int().nonnegative(),
    requestId: z.string(),
  })
  .strict();

export const createClubMatchRequestSchema = z
  .object({
    squadId: z.string().min(1).nullable().optional(),
    title: z.string().trim().min(2).max(160),
    matchType: clubMatchTypeSchema,
    opponent: z.string().trim().min(2).max(120),
    isHome: z.boolean().default(true),
    date: clubMatchLocalDateSchema,
    kickoffTime: clubMatchLocalTimeSchema,
    meetTime: clubMatchLocalTimeSchema.optional(),
    venue: z.string().trim().min(2).max(160),
    address: z.string().trim().max(240).optional(),
    maxPlayers: z.number().int().min(1).max(30).default(14),
    notes: z.string().trim().max(1000).optional(),
  })
  .strict();

export const clubMatchResponseSchema = z
  .object({
    match: clubMatchSchema,
    requestId: z.string(),
  })
  .strict();

export const clubMatchImportSourceSchema = z
  .string()
  .trim()
  .min(1)
  .max(80)
  .regex(
    /^[A-Za-z0-9_.:-]+$/,
    'source may only contain letters, numbers, dots, underscores, colons, or dashes',
  );

export const clubMatchImportExternalIdSchema = z.string().trim().min(1).max(160);

export const importClubMatchItemSchema = z
  .object({
    source: clubMatchImportSourceSchema.optional(),
    externalId: clubMatchImportExternalIdSchema.optional(),
    squadId: z.string().min(1).nullable().optional(),
    title: z.string().trim().min(2).max(160).optional(),
    matchType: clubMatchTypeSchema.default('FRIENDLY'),
    opponent: z.string().trim().min(2).max(120),
    isHome: z.boolean().default(true),
    date: clubMatchLocalDateSchema,
    kickoffTime: clubMatchLocalTimeSchema,
    meetTime: clubMatchLocalTimeSchema.optional(),
    venue: z.string().trim().min(2).max(160),
    address: z.string().trim().max(240).optional(),
    maxPlayers: z.number().int().min(1).max(30).default(14),
    notes: z.string().trim().max(1000).optional(),
  })
  .strict();

export const importClubMatchesRequestSchema = z
  .object({
    source: clubMatchImportSourceSchema.optional(),
    matches: z.array(importClubMatchItemSchema).min(1).max(50),
  })
  .strict()
  .superRefine((body, context) => {
    const seen = new Set<string>();
    body.matches.forEach((match, index) => {
      if (!match.externalId) {
        return;
      }
      const source = match.source ?? body.source ?? 'manual';
      const key = `${source}:${match.externalId}`;
      if (seen.has(key)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['matches', index, 'externalId'],
          message: 'externalId must be unique within the import source',
        });
      }
      seen.add(key);
    });
  });

export const clubMatchImportSkippedSchema = z
  .object({
    source: z.string(),
    externalId: z.string(),
    matchId: z.string(),
    reason: z.literal('already_imported'),
  })
  .strict();

export const importClubMatchesResponseSchema = z
  .object({
    clubId: z.string(),
    imported: z.array(clubMatchSchema),
    skipped: z.array(clubMatchImportSkippedSchema),
    total: z.number().int().nonnegative(),
    requestId: z.string(),
  })
  .strict();

export type ClubJoinPreview = z.infer<typeof clubJoinPreviewSchema>;
export type ResolveClubJoinCodeResponse = z.infer<typeof resolveClubJoinCodeResponseSchema>;
export type JoinClubRequest = z.infer<typeof joinClubRequestSchema>;
export type ClubMembershipSummary = z.infer<typeof clubMembershipSummarySchema>;
export type ClubSummary = z.infer<typeof clubSummarySchema>;
export type ClubJoinSummary = z.infer<typeof clubJoinSummarySchema>;
export type PendingClubInvite = z.infer<typeof pendingClubInviteSchema>;
export type JoinClubResponse = z.infer<typeof joinClubResponseSchema>;
export type ClubInviteCode = z.infer<typeof clubInviteCodeSchema>;
export type ClubInviteCodesResponse = z.infer<typeof clubInviteCodesResponseSchema>;
export type CreateClubInviteCodeRequest = z.infer<typeof createClubInviteCodeRequestSchema>;
export type ClubDirectInviteRole = z.infer<typeof clubDirectInviteRoleSchema>;
export type CreateClubInvitesRequest = z.infer<typeof createClubInvitesRequestSchema>;
export type ClubInviteEmailDeliverySummary = z.infer<typeof clubInviteEmailDeliverySummarySchema>;
export type CreateClubInvitesResponse = z.infer<typeof createClubInvitesResponseSchema>;
export type ClubInvitesResponse = z.infer<typeof clubInvitesResponseSchema>;
export type RespondToClubInviteRequest = z.infer<typeof respondToClubInviteRequestSchema>;
export type RespondToClubInviteResponse = z.infer<typeof respondToClubInviteResponseSchema>;
export type ClubMatchType = z.infer<typeof clubMatchTypeSchema>;
export type ClubMatchStatus = z.infer<typeof clubMatchStatusSchema>;
export type ClubMatchPlayerStatus = z.infer<typeof clubMatchPlayerStatusSchema>;
export type ClubMatchPlayer = z.infer<typeof clubMatchPlayerSchema>;
export type ClubMatchResult = z.infer<typeof clubMatchResultSchema>;
export type ClubMatch = z.infer<typeof clubMatchSchema>;
export type ListClubMatchesQuery = z.infer<typeof listClubMatchesQuerySchema>;
export type ListClubMatchesResponse = z.infer<typeof listClubMatchesResponseSchema>;
export type CreateClubMatchRequest = z.infer<typeof createClubMatchRequestSchema>;
export type ClubMatchResponse = z.infer<typeof clubMatchResponseSchema>;
export type ImportClubMatchItem = z.infer<typeof importClubMatchItemSchema>;
export type ImportClubMatchesRequest = z.infer<typeof importClubMatchesRequestSchema>;
export type ClubMatchImportSkipped = z.infer<typeof clubMatchImportSkippedSchema>;
export type ImportClubMatchesResponse = z.infer<typeof importClubMatchesResponseSchema>;
