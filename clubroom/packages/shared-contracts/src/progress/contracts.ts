import { z } from 'zod';

import { athleteIdSchema, prefixedId, userIdSchema } from '../common/ids.js';

export const athleteAnalyticsPeriods = ['WEEK', 'MONTH', 'QUARTER', 'YEAR', 'ALL'] as const;
export const athleteAnalyticsPeriodSchema = z.enum(athleteAnalyticsPeriods);

export const athleteAnalyticsQuerySchema = z
  .object({
    period: athleteAnalyticsPeriodSchema.default('MONTH'),
  })
  .strict();

export const athleteSkillHistoryQuerySchema = z
  .object({
    skillName: z.string().trim().min(1).max(120).optional(),
  })
  .strict();

const dateOnlySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const parsed = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
  }, 'Expected a valid calendar date');
const timestampSchema = z.string().datetime({ offset: true });

export const practiceLogListQuerySchema = z
  .object({
    since: dateOnlySchema.optional(),
    limit: z.coerce.number().int().min(1).max(100).default(100),
  })
  .strict();

export const practiceLogCreateRequestSchema = z
  .object({
    minutes: z.number().int().min(1).max(24 * 60),
    note: z.string().trim().min(1).max(1000).optional(),
    dateKey: dateOnlySchema.optional(),
    idempotencyKey: z.string().trim().min(8).max(120),
  })
  .strict();

export const practiceLogEntrySchema = z
  .object({
    id: prefixedId('plog'),
    athleteId: athleteIdSchema,
    authorUserId: userIdSchema,
    dateKey: dateOnlySchema,
    minutes: z.number().int().min(1).max(24 * 60),
    note: z.string().trim().min(1).max(1000).nullable(),
    createdAt: timestampSchema,
    updatedAt: timestampSchema,
  })
  .strict();

export const practiceLogListResponseSchema = z
  .object({
    athleteId: athleteIdSchema,
    logs: z.array(practiceLogEntrySchema).max(100),
    total: z.number().int().nonnegative(),
    seedVersion: z.string().nullable(),
    requestId: z.string().min(1),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.total < value.logs.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'total cannot be smaller than logs.length',
        path: ['total'],
      });
    }
    value.logs.forEach((log, index) => {
      if (log.athleteId !== value.athleteId) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'log athleteId must match response athleteId',
          path: ['logs', index, 'athleteId'],
        });
      }
    });
  });

export const practiceLogTodayResponseSchema = z
  .object({
    athleteId: athleteIdSchema,
    log: practiceLogEntrySchema.nullable(),
    dateKey: dateOnlySchema,
    timeZone: z.string().trim().min(1).max(80),
    seedVersion: z.string().nullable(),
    requestId: z.string().min(1),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.log && value.log.athleteId !== value.athleteId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'log athleteId must match response athleteId',
        path: ['log', 'athleteId'],
      });
    }
    if (value.log && value.log.dateKey !== value.dateKey) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'log dateKey must match response dateKey',
        path: ['log', 'dateKey'],
      });
    }
  });

export const practiceLogMutationResponseSchema = z
  .object({
    athleteId: athleteIdSchema,
    log: practiceLogEntrySchema,
    addedMinutes: z.number().int().min(1).max(24 * 60),
    created: z.boolean(),
    replayed: z.boolean(),
    timeZone: z.string().trim().min(1).max(80),
    seedVersion: z.string().nullable(),
    requestId: z.string().min(1),
  })
  .strict()
  .refine((value) => value.log.athleteId === value.athleteId, {
    message: 'log athleteId must match response athleteId',
    path: ['log', 'athleteId'],
  });

export const athleteSkillUpdateRequestSchema = z
  .object({
    skillName: z.string().trim().min(1).max(120),
    score: z.number().int().min(1).max(10),
    bookingId: z.string().trim().min(1).max(120).optional(),
    sessionId: z.string().trim().min(1).max(120).optional(),
    assessedAt: timestampSchema.optional(),
    notes: z.string().trim().min(1).max(1000).optional(),
    idempotencyKey: z.string().trim().min(8).max(120),
  })
  .strict()
  .refine((value) => !(value.bookingId && value.sessionId), {
    message: 'Provide bookingId or sessionId, not both',
    path: ['sessionId'],
  });

export const athleteSkillAssessmentSchema = z
  .object({
    id: prefixedId('ska'),
    athleteId: athleteIdSchema,
    skillDefinitionId: prefixedId('skd'),
    assessorUserId: userIdSchema,
    score: z.number().int().min(1).max(10),
    notes: z.string().min(1).max(1000).nullable(),
    bookingId: z.string().min(1).max(120).nullable(),
    assessedAt: timestampSchema,
    createdAt: timestampSchema,
  })
  .strict();

export const skillDefinitionSchema = z
  .object({
    id: prefixedId('skd'),
    code: z.string().regex(/^[A-Z0-9_]+$/).min(1).max(120),
    name: z.string().trim().min(1).max(120),
    category: z.string().trim().min(1).max(120),
    description: z.string().min(1).max(500).nullable(),
    active: z.boolean(),
    createdAt: timestampSchema,
    updatedAt: timestampSchema,
  })
  .strict();

export const athleteAnalyticsSkillSchema = z
  .object({
    skillName: z.string().trim().min(1).max(120),
    category: z.string().trim().min(1).max(120),
    currentLevel: z.number().finite().min(0).max(100),
    previousLevel: z.number().finite().min(0).max(100),
    changePercent: z.number().finite(),
    averageLevel: z.number().finite().min(0).max(100).optional(),
    history: z
      .array(
        z
          .object({
            date: dateOnlySchema,
            level: z.number().finite().min(0).max(100),
          })
          .strict(),
      )
      .min(1),
  })
  .strict();

export const athleteAnalyticsGoalMilestoneSchema = z
  .object({
    id: z.string().trim().min(1).max(180),
    goalId: z.string().trim().min(1).max(180),
    title: z.string().trim().min(1).max(180),
    isCompleted: z.boolean(),
    completedAt: timestampSchema.optional(),
    order: z.number().int().nonnegative(),
  })
  .strict();

export const athleteAnalyticsGoalSchema = z
  .object({
    id: z.string().trim().min(1).max(180),
    userId: userIdSchema,
    athleteId: athleteIdSchema,
    title: z.string().trim().min(1).max(160),
    description: z.string().trim().min(1).max(2000).optional(),
    category: z.enum(['BALL_SKILLS', 'ATTACKING', 'DEFENDING', 'GAME_SENSE', 'CHARACTER', 'OTHER']),
    targetDate: z.string().trim().min(1).max(40).optional(),
    status: z.enum(['ACTIVE', 'COMPLETED', 'PAUSED', 'ABANDONED']),
    progress: z.number().finite().min(0).max(100),
    milestones: z.array(athleteAnalyticsGoalMilestoneSchema),
    createdBy: z.enum(['COACH', 'ATHLETE', 'PARENT']),
    createdById: z.string().trim().min(1).max(180),
    createdAt: timestampSchema,
    updatedAt: timestampSchema,
  })
  .strict();

export const athleteAnalyticsSchema = z
  .object({
    athleteId: athleteIdSchema,
    period: athleteAnalyticsPeriodSchema,
    totalSessions: z.number().int().nonnegative(),
    sessionsThisPeriod: z.number().int().nonnegative(),
    averageSessionRating: z.number().finite().min(0).max(5),
    attendanceRate: z.number().finite().min(0).max(100),
    skills: z.array(athleteAnalyticsSkillSchema),
    activeGoals: z.array(athleteAnalyticsGoalSchema),
    completedGoals: z.array(athleteAnalyticsGoalSchema),
    improvementRate: z.number().finite().min(0).max(100),
    consistencyScore: z.number().finite().min(0).max(100),
    percentileRank: z.number().finite().min(0).max(100),
    lastSessionDate: dateOnlySchema.optional(),
  })
  .strict()
  .refine((value) => value.sessionsThisPeriod <= value.totalSessions, {
    message: 'sessionsThisPeriod cannot exceed totalSessions',
    path: ['sessionsThisPeriod'],
  });

export const athleteAnalyticsResponseSchema = z
  .object({
    athleteId: athleteIdSchema,
    analytics: athleteAnalyticsSchema,
    seedVersion: z.string().nullable(),
    requestId: z.string().min(1),
  })
  .strict()
  .refine((value) => value.athleteId === value.analytics.athleteId, {
    message: 'athleteId must match analytics.athleteId',
    path: ['analytics', 'athleteId'],
  });

export const athleteSkillHistoryResponseSchema = z
  .object({
    athleteId: athleteIdSchema,
    skills: z.array(athleteAnalyticsSkillSchema),
    seedVersion: z.string().nullable(),
    requestId: z.string().min(1),
  })
  .strict();

export const athleteSkillUpdateResponseSchema = z
  .object({
    athleteId: athleteIdSchema,
    skillAssessment: athleteSkillAssessmentSchema,
    skillDefinition: skillDefinitionSchema,
    previousScore: z.number().int().min(1).max(10).nullable(),
    score: z.number().int().min(1).max(10),
    replayed: z.boolean(),
    seedVersion: z.string().nullable(),
    requestId: z.string().min(1),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.athleteId !== value.skillAssessment.athleteId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'athleteId must match skillAssessment.athleteId',
        path: ['skillAssessment', 'athleteId'],
      });
    }
    if (value.skillDefinition.id !== value.skillAssessment.skillDefinitionId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'skillDefinition.id must match skillAssessment.skillDefinitionId',
        path: ['skillAssessment', 'skillDefinitionId'],
      });
    }
    if (value.score !== value.skillAssessment.score) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'score must match skillAssessment.score',
        path: ['score'],
      });
    }
  });

export type AthleteAnalyticsPeriod = z.infer<typeof athleteAnalyticsPeriodSchema>;
export type AthleteAnalyticsResponse = z.infer<typeof athleteAnalyticsResponseSchema>;
export type AthleteSkillHistoryResponse = z.infer<typeof athleteSkillHistoryResponseSchema>;
export type AthleteSkillUpdateRequest = z.infer<typeof athleteSkillUpdateRequestSchema>;
export type AthleteSkillUpdateResponse = z.infer<typeof athleteSkillUpdateResponseSchema>;
export type PracticeLogListQuery = z.infer<typeof practiceLogListQuerySchema>;
export type PracticeLogCreateRequest = z.infer<typeof practiceLogCreateRequestSchema>;
export type PracticeLogEntry = z.infer<typeof practiceLogEntrySchema>;
export type PracticeLogListResponse = z.infer<typeof practiceLogListResponseSchema>;
export type PracticeLogTodayResponse = z.infer<typeof practiceLogTodayResponseSchema>;
export type PracticeLogMutationResponse = z.infer<typeof practiceLogMutationResponseSchema>;
