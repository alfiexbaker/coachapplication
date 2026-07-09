import { z } from 'zod';
import {
  athleteIdSchema,
  bookingIdSchema,
  safeguardingActionIdSchema,
  safeguardingIncidentIdSchema,
  userIdSchema,
} from '../common/ids.js';

export const safeguardingCategorySchema = z.enum([
  'session_conduct',
  'injury_followup',
  'medical_concern',
  'booking_issue_safety',
  'other',
]);

export const safeguardingSeveritySchema = z.enum(['low', 'medium', 'high', 'critical']);
export const safeguardingIncidentStatusSchema = z.enum(['open', 'in_review', 'closed']);

const statusListQuerySchema = z.preprocess((value) => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  const values = Array.isArray(value) ? value : [value];
  return values.flatMap((item) =>
    String(item)
      .split(',')
      .flatMap((part) => {
        const trimmed = part.trim();
        return trimmed ? [trimmed] : [];
      }),
  );
}, z.array(safeguardingIncidentStatusSchema).min(1).max(3).optional());

export const createSafeguardingIncidentRequestSchema = z.object({
  athleteId: athleteIdSchema.optional(),
  bookingId: bookingIdSchema.optional(),
  category: safeguardingCategorySchema,
  severity: safeguardingSeveritySchema.default('medium'),
  summary: z.string().min(1).max(300),
  details: z.string().max(5000).optional(),
});

export const safeguardingActionTypeSchema = z.enum([
  'note_added',
  'escalated',
  'contacted_guardian',
  'contacted_authority',
  'close_case',
  'reopen_case',
]);

export const createSafeguardingActionRequestSchema = z.object({
  actionType: safeguardingActionTypeSchema,
  notes: z.string().min(1).max(5000),
});

export const safeguardingActionResponseSchema = z.object({
  id: safeguardingActionIdSchema,
  incidentId: safeguardingIncidentIdSchema,
  actionType: safeguardingActionTypeSchema,
  notes: z.string(),
  performedByUserId: userIdSchema,
  createdAt: z.string().datetime(),
});

export const safeguardingIncidentResponseSchema = z.object({
  id: safeguardingIncidentIdSchema,
  athleteId: athleteIdSchema.nullable(),
  bookingId: bookingIdSchema.nullable(),
  category: safeguardingCategorySchema,
  severity: safeguardingSeveritySchema,
  status: safeguardingIncidentStatusSchema,
  summary: z.string(),
  details: z.string().nullable(),
  reportedByUserId: userIdSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  actions: z.array(safeguardingActionResponseSchema),
});

export const listSafeguardingIncidentsQuerySchema = z.object({
  athleteId: athleteIdSchema.optional(),
  status: statusListQuerySchema,
  reportedBy: z.enum(['me', 'any']).default('me'),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export const safeguardingIncidentListResponseSchema = z.object({
  incidents: z.array(safeguardingIncidentResponseSchema),
  total: z.number().int().nonnegative(),
  requestId: z.string().optional(),
});

export type CreateSafeguardingIncidentRequest = z.infer<typeof createSafeguardingIncidentRequestSchema>;
export type CreateSafeguardingActionRequest = z.infer<typeof createSafeguardingActionRequestSchema>;
export type SafeguardingActionResponse = z.infer<typeof safeguardingActionResponseSchema>;
export type SafeguardingIncidentResponse = z.infer<typeof safeguardingIncidentResponseSchema>;
export type ListSafeguardingIncidentsQuery = z.infer<typeof listSafeguardingIncidentsQuerySchema>;
export type SafeguardingIncidentListResponse = z.infer<typeof safeguardingIncidentListResponseSchema>;
