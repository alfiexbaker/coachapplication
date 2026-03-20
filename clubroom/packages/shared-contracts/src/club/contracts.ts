import { z } from 'zod';

export {
  clubAccessLevels,
  clubCapabilities,
  clubRelationshipLayers,
  clubVisibilityAreas,
  organizationCommercialModes,
  organizationRoles,
} from './definitions.js';

export type {
  ClubAccessLevel,
  ClubCapability,
  ClubRelationshipLayer,
  ClubRole,
  ClubVisibilityArea,
  OrganizationCommercialMode,
  OrganizationRole,
} from './definitions.js';

import {
  clubAccessLevels,
  clubCapabilities,
  clubRelationshipLayers,
  clubVisibilityAreas,
  organizationCommercialModes,
  organizationRoles,
} from './definitions.js';

export const organizationRoleSchema = z.enum(organizationRoles);
export const clubRoleSchema = organizationRoleSchema;

export const organizationCommercialModeSchema = z.enum(organizationCommercialModes);
export const clubRelationshipLayerSchema = z.enum(clubRelationshipLayers);
export const clubAccessLevelSchema = z.enum(clubAccessLevels);
export const clubCapabilitySchema = z.enum(clubCapabilities);
export const clubVisibilityAreaSchema = z.enum(clubVisibilityAreas);

export const clubInviteStatusSchema = z.enum(['pending', 'accepted', 'declined']);
export const clubJoinFlowSchema = z.enum(['direct_join', 'invite_review']);

export const clubJoinPreviewSchema = z.object({
  clubId: z.string(),
  clubName: z.string(),
  clubSlug: z.string().optional(),
  visibility: z.string().optional(),
  inviteCode: z.string(),
  role: clubRoleSchema,
  joinFlow: clubJoinFlowSchema,
  expiresAt: z.string().datetime(),
  alreadyMember: z.boolean(),
});

export const resolveClubJoinCodeResponseSchema = z.object({
  preview: clubJoinPreviewSchema,
  requestId: z.string(),
});

export const joinClubRequestSchema = z.object({
  code: z.string().trim().min(4),
});

export const clubMembershipSummarySchema = z.object({
  id: z.string(),
  clubId: z.string(),
  userId: z.string(),
  role: clubRoleSchema,
  active: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const clubSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string().optional(),
  visibility: z.string().optional(),
  inviteCode: z.string(),
});

export const pendingClubInviteSchema = z.object({
  id: z.string(),
  clubId: z.string(),
  clubName: z.string(),
  inviteCode: z.string(),
  role: clubRoleSchema,
  invitedByUserId: z.string().optional(),
  invitedByLabel: z.string(),
  status: clubInviteStatusSchema,
  createdAt: z.string().datetime(),
  expiresAt: z.string().datetime(),
  respondedAt: z.string().datetime().nullable().optional(),
});

export const joinClubResponseSchema = z.object({
  outcome: z.enum(['joined', 'invite_pending', 'already_member']),
  club: clubSummarySchema,
  membership: clubMembershipSummarySchema.nullable().optional(),
  invite: pendingClubInviteSchema.nullable().optional(),
  requestId: z.string(),
});

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

export const clubInvitesResponseSchema = z.object({
  invites: z.array(pendingClubInviteSchema),
  requestId: z.string(),
});

export const respondToClubInviteRequestSchema = z.object({
  response: z.enum(['accepted', 'declined']),
});

export const respondToClubInviteResponseSchema = z.object({
  invite: pendingClubInviteSchema,
  membership: clubMembershipSummarySchema.nullable().optional(),
  club: clubSummarySchema.nullable().optional(),
  requestId: z.string(),
});

export type ClubJoinPreview = z.infer<typeof clubJoinPreviewSchema>;
export type ResolveClubJoinCodeResponse = z.infer<typeof resolveClubJoinCodeResponseSchema>;
export type JoinClubRequest = z.infer<typeof joinClubRequestSchema>;
export type ClubMembershipSummary = z.infer<typeof clubMembershipSummarySchema>;
export type ClubSummary = z.infer<typeof clubSummarySchema>;
export type PendingClubInvite = z.infer<typeof pendingClubInviteSchema>;
export type JoinClubResponse = z.infer<typeof joinClubResponseSchema>;
export type ClubInviteCode = z.infer<typeof clubInviteCodeSchema>;
export type ClubInviteCodesResponse = z.infer<typeof clubInviteCodesResponseSchema>;
export type CreateClubInviteCodeRequest = z.infer<typeof createClubInviteCodeRequestSchema>;
export type ClubInvitesResponse = z.infer<typeof clubInvitesResponseSchema>;
export type RespondToClubInviteRequest = z.infer<typeof respondToClubInviteRequestSchema>;
export type RespondToClubInviteResponse = z.infer<typeof respondToClubInviteResponseSchema>;
