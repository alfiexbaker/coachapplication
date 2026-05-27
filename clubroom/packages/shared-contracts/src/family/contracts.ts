import { z } from 'zod';
import {
  athleteIdSchema,
  emergencyContactIdSchema,
  familyIdSchema,
  guardianInviteIdSchema,
  injuryIdSchema,
  userIdSchema,
} from '../common/ids.js';

export const guardianRoleSchema = z.enum(['PRIMARY', 'GUARDIAN', 'VIEWER']);
export const guardianInviteRoleSchema = z.enum(['GUARDIAN', 'VIEWER']);
export const guardianPermissionSchema = z.enum([
  'VIEW_SCHEDULE',
  'VIEW_PROGRESS',
  'BOOK_SESSIONS',
  'MANAGE_PAYMENTS',
  'MANAGE_PROFILE',
  'ADMIN',
]);
export const guardianInviteStatusSchema = z.enum([
  'PENDING',
  'ACCEPTED',
  'DECLINED',
  'EXPIRED',
  'CANCELLED',
]);

export const createGuardianInviteRequestSchema = z.object({
  inviteeEmail: z.string().trim().email().max(254),
  inviteeName: z.string().trim().min(1).max(120).optional(),
  role: guardianInviteRoleSchema.default('GUARDIAN'),
  relationship: z.string().trim().min(1).max(80),
  childAccess: z.array(athleteIdSchema).max(20).default([]),
  message: z.string().trim().max(500).optional(),
});

export const guardianInviteResponseSchema = z.object({
  id: guardianInviteIdSchema,
  familyId: familyIdSchema,
  inviteeEmail: z.string().email(),
  inviteeName: z.string().optional(),
  role: guardianInviteRoleSchema,
  permissions: z.array(guardianPermissionSchema),
  relationship: z.string(),
  childAccess: z.array(athleteIdSchema),
  status: guardianInviteStatusSchema,
  invitedBy: userIdSchema,
  createdAt: z.string().datetime(),
  expiresAt: z.string().datetime(),
  respondedAt: z.string().datetime().optional(),
  message: z.string().optional(),
});

export const guardianInviteListResponseSchema = z.object({
  invites: z.array(guardianInviteResponseSchema),
});

export const injurySeveritySchema = z.enum(['low', 'medium', 'high']);
export const injuryStatusSchema = z.enum(['active', 'recovering', 'resolved']);

export const createInjuryRequestSchema = z.object({
  title: z.string().min(1).max(120),
  type: z.string().min(1).max(80),
  severity: injurySeveritySchema,
  reportedAt: z.string().datetime().optional(),
  expectedRecoveryDate: z.string().datetime().optional(),
  notes: z.string().max(2000).optional(),
});

export const updateInjuryRequestSchema = z.object({
  title: z.string().min(1).max(120).optional(),
  type: z.string().min(1).max(80).optional(),
  severity: injurySeveritySchema.optional(),
  status: injuryStatusSchema.optional(),
  expectedRecoveryDate: z.string().datetime().nullable().optional(),
  resolvedAt: z.string().datetime().nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
});

export const injuryRecordSchema = z.object({
  id: injuryIdSchema,
  athleteId: athleteIdSchema,
  title: z.string(),
  type: z.string(),
  severity: injurySeveritySchema,
  status: injuryStatusSchema,
  reportedAt: z.string().datetime(),
  expectedRecoveryDate: z.string().datetime().nullable(),
  resolvedAt: z.string().datetime().nullable(),
  notes: z.string().nullable(),
  createdByUserId: userIdSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const injuriesResponseSchema = z.object({
  athleteId: athleteIdSchema,
  injuries: z.array(injuryRecordSchema),
});

export const updateMedicalRecordRequestSchema = z.object({
  conditions: z.array(z.string().min(1).max(160)).max(30).optional(),
  allergies: z.array(z.string().min(1).max(160)).max(30).optional(),
  medications: z.array(z.string().min(1).max(160)).max(30).optional(),
  restrictions: z.array(z.string().min(1).max(160)).max(30).optional(),
  doctorName: z.string().max(120).nullable().optional(),
  doctorPhone: z.string().max(40).nullable().optional(),
  insuranceProvider: z.string().max(120).nullable().optional(),
  insuranceNumber: z.string().max(120).nullable().optional(),
  emergencyNotes: z.string().max(2000).nullable().optional(),
  senNotes: z.string().max(2000).nullable().optional(),
});

export const medicalRecordResponseSchema = z.object({
  athleteId: athleteIdSchema,
  conditions: z.array(z.string()),
  allergies: z.array(z.string()),
  medications: z.array(z.string()),
  restrictions: z.array(z.string()),
  doctorName: z.string().nullable(),
  doctorPhone: z.string().nullable(),
  insuranceProvider: z.string().nullable(),
  insuranceNumber: z.string().nullable(),
  emergencyNotes: z.string().nullable(),
  senNotes: z.string().nullable(),
  updatedAt: z.string().datetime(),
  updatedByUserId: userIdSchema,
});

export const emergencyContactInputSchema = z.object({
  id: emergencyContactIdSchema.optional(),
  name: z.string().min(1).max(120),
  relationship: z.string().min(1).max(80),
  phone: z.string().min(3).max(40),
  email: z.string().email().optional(),
  isPrimary: z.boolean().optional(),
  canPickup: z.boolean().optional(),
});

export const updateEmergencyContactsRequestSchema = z.object({
  contacts: z.array(emergencyContactInputSchema).max(10),
});

export const emergencyContactSchema = z.object({
  id: emergencyContactIdSchema,
  name: z.string(),
  relationship: z.string(),
  phone: z.string(),
  email: z.string().email().optional(),
  isPrimary: z.boolean(),
  canPickup: z.boolean(),
});

export const emergencyContactsResponseSchema = z.object({
  athleteId: athleteIdSchema,
  contacts: z.array(emergencyContactSchema),
  updatedAt: z.string().datetime(),
  updatedByUserId: userIdSchema,
});

export const consentTypeSchema = z.enum([
  'PHOTO',
  'VIDEO',
  'SOCIAL_MEDIA',
  'EMERGENCY_TREATMENT',
]);

export const consentRecordSchema = z.object({
  type: consentTypeSchema,
  granted: z.boolean(),
  grantedAt: z.string().datetime().optional(),
  grantedBy: z.string().max(120),
  expiryAt: z.string().datetime().optional(),
});

export const upsertConsentsRequestSchema = z.object({
  consents: z.array(consentRecordSchema).max(10),
});

export const consentsResponseSchema = z.object({
  athleteId: athleteIdSchema,
  consents: z.array(consentRecordSchema),
  updatedAt: z.string().datetime(),
  updatedByUserId: userIdSchema,
});

export type CreateInjuryRequest = z.infer<typeof createInjuryRequestSchema>;
export type UpdateInjuryRequest = z.infer<typeof updateInjuryRequestSchema>;
export type InjuryRecord = z.infer<typeof injuryRecordSchema>;
export type InjuriesResponse = z.infer<typeof injuriesResponseSchema>;

export type GuardianRole = z.infer<typeof guardianRoleSchema>;
export type GuardianInviteRole = z.infer<typeof guardianInviteRoleSchema>;
export type GuardianPermission = z.infer<typeof guardianPermissionSchema>;
export type GuardianInviteStatus = z.infer<typeof guardianInviteStatusSchema>;
export type CreateGuardianInviteRequest = z.infer<typeof createGuardianInviteRequestSchema>;
export type GuardianInviteResponse = z.infer<typeof guardianInviteResponseSchema>;
export type GuardianInviteListResponse = z.infer<typeof guardianInviteListResponseSchema>;

export type UpdateMedicalRecordRequest = z.infer<typeof updateMedicalRecordRequestSchema>;
export type MedicalRecordResponse = z.infer<typeof medicalRecordResponseSchema>;

export type UpdateEmergencyContactsRequest = z.infer<typeof updateEmergencyContactsRequestSchema>;
export type EmergencyContactsResponse = z.infer<typeof emergencyContactsResponseSchema>;

export type ConsentType = z.infer<typeof consentTypeSchema>;
export type ConsentRecord = z.infer<typeof consentRecordSchema>;
export type UpsertConsentsRequest = z.infer<typeof upsertConsentsRequestSchema>;
export type ConsentsResponse = z.infer<typeof consentsResponseSchema>;
