import crypto from 'node:crypto';
import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import { env } from '@clubroom/config';
import {
  athleteAnalyticsQuerySchema,
  athleteAnalyticsResponseSchema,
  athleteSkillHistoryQuerySchema,
  athleteSkillHistoryResponseSchema,
  athleteSkillUpdateRequestSchema,
  athleteSkillUpdateResponseSchema,
  practiceLogCreateRequestSchema,
  practiceLogEntrySchema,
  practiceLogListQuerySchema,
  practiceLogListResponseSchema,
  practiceLogMutationResponseSchema,
  practiceLogTodayResponseSchema,
  type AthleteAnalyticsPeriod,
  type AthleteSkillUpdateRequest,
  type PracticeLogCreateRequest,
  type PracticeLogListQuery,
  type PracticeLogMutationResponse,
} from '@clubroom/shared-contracts';
import { z } from 'zod';
import {
  ApiProblemError,
  badRequest,
  conflict,
  forbidden,
  isZodValidationError,
  notFound,
  serviceUnavailable,
} from '../../lib/http-errors.js';
import {
  type InvoiceTransitionAction,
  type ManualPaymentReceiptInput,
  canManageInvoiceMoneyAction,
  completeSimulatedInvoicePayment,
  createInvoicePaymentSession,
  createInvoiceReminder,
  generateInvoiceForBooking,
  getBookingInvoiceContext,
  getHostedPaymentPageData,
  getInvoiceDetail,
  getInvoiceRow,
  listAccessibleInvoices,
  requestInvoiceRefund,
  transitionInvoiceStatus,
  updateInvoiceReminderDelivery,
} from '../../lib/invoice-runtime.js';
import { getApiDataBackend } from '../../lib/data-backend.js';
import { getDbFixtureStore } from '../../lib/db-fixture-store.js';
import { getMarketplaceSeedStore } from '../../lib/marketplace-seed-store.js';
import { verifySimulatedPaymentToken } from '../../lib/payment-provider.js';
import { deliverInvoiceReminderEmail } from '../../lib/password-reset-delivery.js';
import {
  API_DB_TRANSACTION_OPTIONS,
  getPrismaClientOrThrow,
  shouldUseDbFixtureFallback,
} from '../../lib/prisma-runtime.js';
import { Prisma, type PrismaClient } from '@clubroom/db';
import {
  assertCanReadAthleteHealth,
  assertCanWriteAthleteHealth,
  hasAnyGrantedRole,
  isPrivilegedAdminAuth,
  isSystemAdminAuth,
} from '../../lib/authz.js';
import { recordAuditEvent } from '../../lib/audit-runtime.js';
import { resolveTrustAccessRepository } from '../../repositories/p0/trust-access-repository.js';
import { resolveCommunityMediaRepository } from '../../repositories/p0/community-media-repository.js';
import { resolveVideoAuthorityRepository } from '../../repositories/p0/video-authority-repository.js';
import { normalizeForJson } from '../../repositories/p0/normalize.js';
import { assertSupportedPostMetadata } from './post-metadata-policy.js';
import {
  completeUploadSession,
  createSignedReadUrl,
  createUploadInit,
  getUploadSessionStatus,
  recordUploadMalwareScanResult,
} from '../../lib/storage-runtime.js';

type SeedRow = Record<string, unknown>;
type SeedTables = Record<string, SeedRow[]>;

const asRows = (value: unknown): SeedRow[] => (Array.isArray(value) ? (value as SeedRow[]) : []);
const asString = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;
const UPLOAD_SCAN_WORKER_USER_ID = 'system_upload_scan_worker';
const UPLOAD_SCAN_RESULT_TOKEN_HEADER = 'x-clubroom-upload-scan-token';
const asNumber = (value: unknown): number | undefined =>
  typeof value === 'number' ? value : undefined;
const asBoolean = (value: unknown): boolean | undefined =>
  typeof value === 'boolean' ? value : undefined;
const asStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string') : [];
const coerceMetadata = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
const emailDomain = (email: string | undefined): string | null =>
  email?.split('@')[1]?.trim().toLowerCase() || null;

function singleHeaderValue(request: FastifyRequest, name: string): string | undefined {
  const value = request.headers[name];
  if (Array.isArray(value)) {
    return value.length === 1 ? value[0] : undefined;
  }
  return typeof value === 'string' ? value : undefined;
}

function timingSafeStringEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left, 'utf8');
  const rightBuffer = Buffer.from(right, 'utf8');
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function isUploadScanWorkerRequest(request: FastifyRequest): boolean {
  const expectedToken = env.API_UPLOAD_SCAN_RESULT_TOKEN?.trim();
  const providedToken = singleHeaderValue(request, UPLOAD_SCAN_RESULT_TOKEN_HEADER)?.trim();
  return Boolean(expectedToken && providedToken && timingSafeStringEqual(providedToken, expectedToken));
}

async function assertDbModePrismaAvailable(params: {
  request: FastifyRequest;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  subjectUserId?: string | null;
  sensitiveRead?: boolean;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  if (getApiDataBackend() !== 'db' || !shouldUseDbFixtureFallback()) {
    return;
  }

  await recordAuditEvent({
    request: params.request,
    action: params.action,
    resourceType: params.resourceType,
    resourceId: params.resourceId,
    subjectUserId: params.subjectUserId,
    result: 'ERROR',
    sensitiveRead: params.sensitiveRead === true,
    metadata: {
      ...(params.metadata ?? {}),
      reason: 'prisma_unavailable',
      status: 503,
    },
  });
  getPrismaClientOrThrow();
}
const nowIso = () => new Date().toISOString();
const newId = (prefix: string) => `${prefix}_${crypto.randomUUID()}`;
const isCoachOrPrivilegedAdminAuth = (auth: FastifyRequest['auth'] | undefined): boolean =>
  hasAnyGrantedRole(auth, ['coach', 'club_admin', 'admin', 'security_admin']);
const INVOICE_STATUSES = ['DRAFT', 'SENT', 'PAID', 'VOID', 'WRITTEN_OFF'] as const;
const GOAL_STATUSES = ['ACTIVE', 'COMPLETED', 'PAUSED', 'ABANDONED'] as const;
const GOAL_MILESTONE_STATUSES = ['PENDING', 'COMPLETED'] as const;
const GOAL_CATEGORIES = [
  'BALL_SKILLS',
  'ATTACKING',
  'DEFENDING',
  'GAME_SENSE',
  'CHARACTER',
  'OTHER',
] as const;
const PRACTICE_TASK_VIEWER_ROLES = ['coach', 'parent', 'athlete'] as const;
const PRACTICE_TASK_FOLLOW_UP_ACTION_TYPES = ['nudge', 'message'] as const;
const FEEDBACK_HOMEWORK_DUE_DAYS = 3;
const FEEDBACK_HOMEWORK_DRILL_PREFIX = 'drl_feedback_';
const FEEDBACK_HOMEWORK_ASSIGNMENT_PREFIX = 'dra_feedback_';
const PRACTICE_TASK_ACTION_AUDIT_TYPES = [
  'practice_task.review',
  'practice_task.follow_up',
  'practice_task.recovery_checkpoint',
  'practice_task.due_at_update',
  'practice_task.snooze',
] as const;
const PROGRESS_CHALLENGE_TYPES = [
  'attendance',
  'streak',
  'skill',
  'badge_collection',
  'journal',
  'improvement',
] as const;
const PROGRESS_CHALLENGE_STATUSES = ['active', 'completed', 'expired'] as const;

type InvoiceStatus = (typeof INVOICE_STATUSES)[number];
type PracticeTaskViewerRole = (typeof PRACTICE_TASK_VIEWER_ROLES)[number];
type PracticeTaskTiming = 'overdue' | 'due_soon' | 'upcoming' | 'completed';
type PracticeTaskRisk = 'high' | 'watch' | 'stable';
type PracticeTaskActionAuditType = (typeof PRACTICE_TASK_ACTION_AUDIT_TYPES)[number];
type FeedbackHomeworkDbClient = Pick<PrismaClient, 'drill' | 'drillAssignment'>;
type SelfAssessmentNotificationDbClient = Pick<PrismaClient, 'athlete' | 'notification' | 'user'>;

const goalCreateRequestSchema = z.object({
  title: z.string().trim().min(1).max(160),
  description: z.string().trim().max(2000).optional(),
  category: z.enum(GOAL_CATEGORIES).default('OTHER'),
  targetDate: z.string().trim().max(40).optional(),
  milestones: z.array(z.string().trim().min(1).max(180)).max(20).default([]),
});

const goalUpdateRequestSchema = z
  .object({
    title: z.string().trim().min(1).max(160).optional(),
    description: z.string().trim().max(2000).nullable().optional(),
    category: z.enum(GOAL_CATEGORIES).optional(),
    status: z.enum(GOAL_STATUSES).optional(),
    targetDate: z.string().trim().max(40).nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one goal field must be supplied',
  });

const goalProgressUpdateRequestSchema = z.object({
  progress: z.number().int().min(0).max(100),
  completedMilestoneIds: z.array(z.string().trim().min(1).max(120)).max(100).optional(),
});

const goalMilestoneCreateRequestSchema = z.object({
  title: z.string().trim().min(1).max(180),
  dueDate: z.string().trim().max(40).optional(),
});

const goalMilestoneUpdateRequestSchema = z
  .object({
    title: z.string().trim().min(1).max(180).optional(),
    status: z.enum(GOAL_MILESTONE_STATUSES).optional(),
    dueDate: z.string().trim().max(40).nullable().optional(),
    sortOrder: z.number().int().min(0).max(1000).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one milestone field must be supplied',
  });

const termlyReportSnapshotParamsSchema = z.object({
  athleteId: z.string().trim().min(1).max(180),
});

const termlyReportRangeSchema = z.object({
  startDate: z.string().trim().min(1).max(80),
  endDate: z.string().trim().min(1).max(80),
  label: z.string().trim().min(1).max(160),
});

const termlyReportSchema = z
  .object({
    id: z.string().trim().min(1).max(180),
    athleteId: z.string().trim().min(1).max(180),
    athleteName: z.string().trim().min(1).max(180),
    generatedAt: z.string().trim().min(1).max(80),
    range: termlyReportRangeSchema,
    summary: z.record(z.unknown()),
    generatedFrom: z.literal('termly_v1'),
  })
  .passthrough();

const termlyReportSnapshotCreateSchema = z
  .object({
    report: termlyReportSchema,
  })
  .strict();
type TermlyReportSnapshotCreateBody = z.infer<typeof termlyReportSnapshotCreateSchema>;

const weeklyRecapDispatchParamsSchema = z.object({
  athleteId: z.string().trim().min(1).max(180),
});

const weeklyRecapDispatchRequestSchema = z
  .object({
    parentId: z.string().trim().min(1).max(180),
    now: z.string().trim().min(1).max(80).optional(),
  })
  .strict();
type WeeklyRecapDispatchBody = z.infer<typeof weeklyRecapDispatchRequestSchema>;

const badgeAwardCreateRequestSchema = z
  .object({
    badgeId: z.string().trim().min(1).max(180),
    badgeLabel: z.string().trim().min(1).max(180).optional(),
    badgeCategory: z.string().trim().min(1).max(80).optional(),
    badgeTier: z.number().int().min(1).max(10).optional(),
    badgePointValue: z.number().int().min(0).max(10000).optional(),
    sessionId: z.string().trim().min(1).max(180).optional(),
    reason: z.string().trim().min(1).max(1000),
    note: z.string().trim().max(2000).optional(),
    visibility: z.enum(['coach_only', 'athlete', 'supporters']).default('athlete'),
    presetId: z.string().trim().min(1).max(180).optional(),
    overrideCooldown: z.boolean().default(false),
    overrideNote: z.string().trim().max(1000).optional(),
    context: z.enum(['session', 'athlete_profile']).optional(),
  })
  .strict()
  .refine((value) => !value.overrideCooldown || Boolean(value.overrideNote?.trim()), {
    message: 'overrideNote is required when overrideCooldown is true',
    path: ['overrideNote'],
  });
type BadgeAwardCreateBody = z.infer<typeof badgeAwardCreateRequestSchema>;

const badgeAwardParamsSchema = z.object({
  awardId: z.string().trim().min(1).max(180),
});

const badgeAwardActionRequestSchema = z
  .object({
    note: z.string().trim().max(1000).optional(),
  })
  .strict();

const drillAssignmentQuerySchema = z.object({
  includeCompleted: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => value !== 'false'),
});

const drillAssignmentCreateRequestSchema = z.object({
  drillId: z.string().trim().min(1).max(180),
  athleteId: z.string().trim().min(1).max(180),
  dueDate: z.string().trim().min(1).max(40),
  title: z.string().trim().min(1).max(180).optional(),
  instructions: z.string().trim().max(2000).optional(),
  requiresEvidence: z.boolean().default(false),
});

const practiceTaskQuerySchema = z.object({
  viewerRole: z.enum(PRACTICE_TASK_VIEWER_ROLES).default('athlete'),
});

const practiceTaskCompletionRequestSchema = z.object({
  completed: z.boolean(),
  completionNote: z.string().trim().max(1000).optional(),
});

const practiceTaskDueAtRequestSchema = z.object({
  dueAt: z.string().trim().min(1),
});

const practiceTaskSnoozeRequestSchema = z.object({
  hours: z.coerce
    .number()
    .int()
    .min(1)
    .max(24 * 14),
});

const practiceTaskBulkActionRequestSchema = z.object({
  taskIds: z.array(z.string().trim().min(1).max(180)).min(1).max(100),
});

const practiceTaskFollowUpRequestSchema = practiceTaskBulkActionRequestSchema.extend({
  actionType: z.enum(PRACTICE_TASK_FOLLOW_UP_ACTION_TYPES),
});

const practiceTaskRecoveryCheckpointRequestSchema = practiceTaskBulkActionRequestSchema.extend({
  hours: z.coerce
    .number()
    .int()
    .min(1)
    .max(24 * 14)
    .default(48),
});

const progressChallengeUpsertRequestSchema = z.object({
  type: z.enum(PROGRESS_CHALLENGE_TYPES),
  title: z.string().trim().min(1).max(180),
  description: z.string().trim().min(1).max(1000),
  targetValue: z.coerce.number().int().min(1).max(1000),
  currentValue: z.coerce.number().int().min(0).max(1000),
  progress: z.coerce.number().int().min(0).max(100),
  rewardBadgeId: z.string().trim().min(1).max(160),
  rewardLabel: z.string().trim().min(1).max(180),
  status: z.enum(PROGRESS_CHALLENGE_STATUSES),
  assignedAt: z.string().trim().min(1).max(80),
  expiresAt: z.string().trim().min(1).max(80),
  completedAt: z.string().trim().min(1).max(80).nullable().optional(),
});

type ProgressChallengeBody = z.infer<typeof progressChallengeUpsertRequestSchema>;

const sessionFeedbackVisibilitySchema = z.enum(['coach_only', 'parent', 'athlete']);

const sessionFeedbackListQuerySchema = z.object({
  viewerRole: z.enum(['coach', 'parent', 'athlete']).default('coach'),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

const coachDevelopmentSessionListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(100),
});

const sessionFeedbackQuerySchema = z.object({
  sessionId: z.string().trim().min(1),
  viewerRole: z.enum(['coach', 'parent', 'athlete']).default('coach'),
});

const sessionFeedbackRequestSchema = z.object({
  sessionId: z.string().trim().min(1),
  bookingId: z.string().trim().min(1).optional(),
  sessionTemplateId: z.string().trim().min(1).optional(),
  sessionTemplateName: z.string().trim().max(160).optional(),
  sessionTitle: z.string().trim().max(200).optional(),
  coachId: z.string().trim().min(1),
  coachName: z.string().trim().min(1).max(160),
  athleteId: z.string().trim().min(1),
  athleteName: z.string().trim().min(1).max(160),
  privateNotes: z.string().trim().max(4000).optional(),
  publicSummary: z.string().trim().max(4000).default(''),
  skillsWorkedOn: z.array(z.string().trim().min(1).max(120)).max(50).default([]),
  skillRatings: z
    .array(
      z.object({
        skill: z.string().trim().min(1).max(120),
        rating: z.number().min(1).max(10),
        previousRating: z.number().min(1).max(10).optional(),
      }),
    )
    .max(100)
    .default([]),
  improvements: z.string().trim().max(4000).default(''),
  homework: z.string().trim().max(4000).default(''),
  effortRating: z.number().int().min(1).max(5).default(3),
  overallPerformance: z.number().int().min(1).max(5).default(3),
  videoClipUrls: z.array(z.string().trim().min(1).max(2048)).max(50).optional(),
  photoUrls: z.array(z.string().trim().min(1).max(2048)).max(50).optional(),
  badgeAwarded: z.string().trim().max(160).optional(),
  visibility: sessionFeedbackVisibilitySchema.default('athlete'),
  fourCorners: z.record(z.number()).optional(),
  positionPlayed: z.string().trim().max(120).optional(),
  positionsPlayed: z.array(z.string().trim().min(1).max(120)).max(8).optional(),
  subSkillRatings: z.array(z.record(z.unknown())).max(100).optional(),
});

const sessionMediaAssetKindSchema = z.enum(['photo', 'video']);
const sessionMediaAssetInputSchema = z.object({
  id: z.string().trim().min(1).optional(),
  kind: sessionMediaAssetKindSchema,
  mediaObjectId: z.string().trim().min(1),
  thumbnailMediaObjectId: z.string().trim().min(1).optional(),
  width: z.number().int().nonnegative().optional(),
  height: z.number().int().nonnegative().optional(),
  duration: z.number().nonnegative().optional(),
  capturedAt: z.string().trim().min(1),
});

const sessionMediaQuerySchema = z.object({
  sessionId: z.string().trim().min(1),
  athleteId: z.string().trim().min(1),
});

const sessionMediaListQuerySchema = z.object({
  athleteId: z.string().trim().min(1).optional(),
});

const sessionMediaSaveRequestSchema = z.object({
  sessionId: z.string().trim().min(1),
  athleteId: z.string().trim().min(1),
  coachId: z.string().trim().min(1),
  photos: z
    .array(sessionMediaAssetInputSchema.extend({ kind: z.literal('photo') }))
    .max(3)
    .default([]),
  video: sessionMediaAssetInputSchema
    .extend({ kind: z.literal('video') })
    .nullable()
    .default(null),
});

const selfAssessmentListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(100),
});

const selfAssessmentPromptListQuerySchema = z.object({
  athleteId: z.string().trim().min(1),
});

const selfAssessmentSubmitRequestSchema = z.object({
  athleteId: z.string().trim().min(1),
  coachId: z.string().trim().min(1).optional(),
  bookingId: z.string().trim().min(1),
  sessionId: z.string().trim().min(1).optional(),
  mood: z.number().int().min(1).max(5),
  energyLevel: z.number().int().min(1).max(5),
  confidence: z.number().int().min(1).max(5),
  notes: z.string().trim().max(2000).optional(),
});

const selfAssessmentPromptParamsSchema = z.object({
  promptId: z.string().trim().min(1),
});

const squadActivityQuerySchema = z
  .object({
    lookbackDays: z.coerce.number().int().min(1).max(365).default(180),
    limit: z.coerce.number().int().min(1).max(100).default(30),
  })
  .strict();

const coachObservationCategorySchema = z.enum([
  'BEHAVIORAL',
  'PHYSICAL',
  'COMMUNICATION',
  'SOCIAL',
  'PROGRESS',
  'SAFETY',
  'OTHER',
]);

const coachObservationCreateRequestSchema = z.object({
  text: z.string().trim().min(1).max(2000),
  category: coachObservationCategorySchema.default('OTHER'),
  isPrivate: z.boolean().default(false),
});

const coachObservationUpdateRequestSchema = z
  .object({
    text: z.string().trim().min(1).max(2000).optional(),
    category: coachObservationCategorySchema.optional(),
    isPrivate: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one observation field must be supplied',
  });

type CoachObservationCategory = z.infer<typeof coachObservationCategorySchema>;
type CoachObservationInput = z.infer<typeof coachObservationCreateRequestSchema>;
type CoachObservationUpdateInput = z.infer<typeof coachObservationUpdateRequestSchema>;

const invoiceListQuerySchema = z.object({
  status: z.string().trim().optional(),
  coachId: z.string().trim().optional(),
  bookingId: z.string().trim().optional(),
  dateFrom: z.string().trim().optional(),
  dateTo: z.string().trim().optional(),
});

const manualReceiptMethodSchema = z.enum(['cash', 'bank_transfer', 'other']);

const invoiceTransitionRequestSchema = z.object({
  reason: z.string().trim().max(400).optional(),
  method: manualReceiptMethodSchema.optional(),
  amountMinor: z.number().int().min(0).optional(),
  receivedAt: z.string().trim().max(80).optional(),
  reference: z.string().trim().max(160).optional(),
  evidenceMediaId: z.string().trim().max(160).optional(),
  note: z.string().trim().max(400).optional(),
});

const uploadInitRequestSchema = z
  .object({
    kind: z.enum(['VIDEO', 'IMAGE', 'DOCUMENT']).default('VIDEO'),
    contentType: z.string().min(3).max(120),
    fileName: z.string().min(1).max(260),
    sizeBytes: z.number().int().positive().max(2_000_000_000),
    metadata: z.record(z.unknown()).optional(),
  })
  .strict();

const drillCategorySchema = z.preprocess(
  (value) => (typeof value === 'string' ? value.trim().toUpperCase() : value),
  z.enum(['WARMUP', 'TECHNIQUE', 'FITNESS', 'COOLDOWN', 'TACTICAL']),
);

const drillDifficultySchema = z.preprocess(
  (value) => (typeof value === 'string' ? value.trim().toUpperCase() : value),
  z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']),
);

const drillCreateRequestSchema = z.object({
  coachId: z.string().trim().min(1).optional(),
  title: z.string().trim().min(1).max(180),
  description: z.string().trim().max(4000).default(''),
  category: drillCategorySchema.default('TECHNIQUE'),
  videoUrl: z.string().trim().max(2048).optional(),
  thumbnailUrl: z.string().trim().max(2048).optional(),
  duration: z.number().int().min(1).max(600).default(15),
  difficulty: drillDifficultySchema.default('BEGINNER'),
  equipment: z.array(z.string().trim().min(1).max(120)).max(40).optional(),
  tags: z.array(z.string().trim().min(1).max(80)).max(40).optional(),
});

const drillUpdateRequestSchema = drillCreateRequestSchema
  .omit({ coachId: true })
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one drill field must be supplied',
  });

type DrillCreateBody = z.infer<typeof drillCreateRequestSchema>;
type DrillUpdateBody = z.infer<typeof drillUpdateRequestSchema>;

const uploadCompleteParamsSchema = z.object({
  uploadSessionId: z.string().trim().min(1),
});

const uploadCompleteRequestSchema = z.object({
  mediaObjectId: z.string().trim().min(1),
  sha256Hex: z
    .string()
    .trim()
    .regex(/^[a-fA-F0-9]{64}$/)
    .optional(),
});

const uploadScanResultRequestSchema = z.object({
  mediaObjectId: z.string().trim().min(1),
  sourceResultId: z.string().trim().min(1).max(200).optional(),
  scanAttemptId: z.string().trim().min(1).max(200).optional(),
  verdict: z.preprocess(
    (value) => (typeof value === 'string' ? value.trim().toUpperCase() : value),
    z.enum(['CLEAN', 'INFECTED', 'ERROR']),
  ),
  scanner: z.string().trim().min(1).max(120),
  objectSizeBytes: z.number().int().positive().max(2_000_000_000).optional(),
  objectETag: z.string().trim().min(1).max(240).optional(),
  sha256Hex: z
    .string()
    .trim()
    .regex(/^[a-fA-F0-9]{64}$/)
    .optional(),
  sealedStorageKey: z.string().trim().min(1).max(1024).optional(),
  scannedAt: z.string().trim().max(80).optional(),
  details: z
    .record(z.unknown())
    .optional()
    .refine((value) => !value || JSON.stringify(value).length <= 8_000, {
      message: 'Scan result details are too large',
    }),
});

const videoListQuerySchema = z
  .object({
    coachId: z.string().trim().min(1).optional(),
    athleteId: z.string().trim().min(1).optional(),
  })
  .strict()
  .refine((value) => Boolean(value.coachId) !== Boolean(value.athleteId), {
    message: 'Provide exactly one of coachId or athleteId',
  });

const videoCreateRequestSchema = z
  .object({
    mediaObjectId: z.string().trim().min(1),
    athleteIds: z.array(z.string().trim().min(1)).max(1).default([]),
    title: z.string().trim().max(120).optional(),
    description: z.string().trim().max(1000).optional(),
    sessionId: z.string().trim().min(1).optional(),
    bookingId: z.string().trim().min(1).optional(),
    durationSeconds: z
      .number()
      .int()
      .min(0)
      .max(60 * 60)
      .optional(),
  })
  .strict()
  .refine((value) => !(value.sessionId && value.bookingId), {
    message: 'Provide either sessionId or bookingId, not both',
  });

const videoUpdateRequestSchema = z
  .object({
    title: z.string().trim().max(120).optional(),
    description: z.string().trim().max(1000).optional(),
  })
  .strict()
  .refine((value) => value.title !== undefined || value.description !== undefined, {
    message: 'Provide title or description',
  });

const videoVisibilityRequestSchema = z
  .object({
    visibility: z.enum(['PRIVATE', 'SHARED']),
    recipientUserIds: z.array(z.string().trim().min(1)).max(20).optional(),
  })
  .strict();

const videoAnnotationRequestSchema = z
  .object({
    timestamp: z
      .number()
      .int()
      .min(0)
      .max(60 * 60),
    label: z.string().trim().min(1).max(120),
    note: z.string().trim().max(500).optional(),
    type: z.enum(['HIGHLIGHT', 'IMPROVEMENT', 'TECHNIQUE', 'GENERAL']),
  })
  .strict();

const invoicePaymentRequestSchema = z.object({
  amountMinor: z.number().int().positive().optional(),
  method: z.enum(['bank_transfer', 'card']).default('bank_transfer'),
  idempotencyKey: z.string().trim().min(8).max(120),
  returnUrl: z.string().trim().url().optional(),
  cancelUrl: z.string().trim().url().optional(),
});

const invoiceRefundRequestSchema = z.object({
  reason: z.string().trim().min(1).max(400),
  verificationCode: z.string().trim().min(6).max(12),
  idempotencyKey: z.string().trim().min(8).max(120),
  amountMinor: z.number().int().positive().optional(),
});

const generateInvoiceRequestSchema = z.object({
  bookingId: z.string().trim().min(1),
  notes: z.string().trim().max(1000).optional(),
  dueDate: z.string().trim().datetime().optional(),
  taxRate: z.number().int().min(0).max(100).optional(),
});

const invoiceReminderRequestSchema = z.object({
  recipientEmail: z.string().trim().email().optional(),
  message: z.string().trim().max(2000).optional(),
});

const communityGroupParamsSchema = z.object({
  groupId: z.string().trim().min(1),
});

const communityGroupMemberParamsSchema = z.object({
  groupId: z.string().trim().min(1),
  memberUserId: z.string().trim().min(1),
});

const communityGroupMemberAddRequestSchema = z
  .object({
    memberUserId: z.string().trim().min(1),
    role: z.enum(['ADMIN', 'MODERATOR', 'MEMBER']).optional(),
  })
  .strict();

const communityGroupMemberRoleUpdateRequestSchema = z
  .object({
    role: z.enum(['ADMIN', 'MODERATOR', 'MEMBER']),
  })
  .strict();

const communityGroupInviteCreateRequestSchema = z
  .object({
    inviteeUserId: z.string().trim().min(1),
    message: z.string().trim().max(500).optional(),
  })
  .strict();

const communityGroupInviteParamsSchema = z.object({
  inviteId: z.string().trim().min(1),
});

const communityGroupJoinRequestParamsSchema = z.object({
  groupId: z.string().trim().min(1),
  requestId: z.string().trim().min(1),
});

const communityGroupJoinRequestCreateRequestSchema = z
  .object({
    isCoach: z.boolean().optional(),
  })
  .strict();

const communityGroupCreateRequestSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    description: z.string().trim().max(1000).optional(),
    type: z.enum(['GENERAL', 'CLUB', 'SQUAD']).optional(),
    clubId: z.string().trim().min(1).optional(),
    squadId: z.string().trim().min(1).optional(),
    isPublic: z.boolean().optional(),
    memberIds: z.array(z.string().trim().min(1)).max(200).optional(),
    idempotencyKey: z.string().trim().min(8).max(120).optional(),
  })
  .strict()
  .refine((value) => value.type !== 'CLUB' || Boolean(value.clubId), {
    message: 'clubId is required for CLUB community groups',
    path: ['clubId'],
  })
  .refine((value) => value.type !== 'GENERAL' || !value.clubId, {
    message: 'GENERAL community groups cannot be club-scoped',
    path: ['clubId'],
  })
  .refine((value) => value.type !== 'SQUAD' || Boolean(value.squadId), {
    message: 'squadId is required for SQUAD community groups',
    path: ['squadId'],
  })
  .refine((value) => !value.squadId || !value.type || value.type === 'SQUAD', {
    message: 'squadId is only supported for SQUAD community groups',
    path: ['squadId'],
  })
  .refine(
    (value) =>
      (value.type ?? (value.squadId ? 'SQUAD' : 'GENERAL')) !== 'SQUAD' || value.isPublic !== true,
    {
      message: 'SQUAD community groups cannot be public',
      path: ['isPublic'],
    },
  );

const messageThreadParamsSchema = z.object({
  threadId: z.string().trim().min(1),
});

const messageParamsSchema = z.object({
  messageId: z.string().trim().min(1),
});

const postParamsSchema = z.object({
  postId: z.string().trim().min(1),
});

const commentParamsSchema = z.object({
  commentId: z.string().trim().min(1),
});

const notificationParamsSchema = z.object({
  notificationId: z.string().trim().min(1),
});

const notificationChannelSettingsSchema = z
  .object({
    push: z.boolean().optional(),
    email: z.boolean().optional(),
    sms: z.boolean().optional(),
  })
  .strict();

const notificationQuietHoursSchema = z
  .object({
    enabled: z.boolean().optional(),
    startTime: z
      .string()
      .trim()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
      .optional(),
    endTime: z
      .string()
      .trim()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
      .optional(),
    timezone: z
      .string()
      .trim()
      .min(1)
      .max(80)
      .refine((timeZone) => {
        try {
          new Intl.DateTimeFormat('en-GB', { timeZone }).format();
          return true;
        } catch {
          return false;
        }
      }, 'Invalid IANA time zone')
      .optional(),
  })
  .strict();

const notificationTypePreferenceSchema = z
  .object({
    enabled: z.boolean().optional(),
    channels: z
      .array(z.enum(['PUSH', 'EMAIL', 'SMS']))
      .max(3)
      .optional(),
  })
  .strict();

const notificationPreferenceUpdateSchema = z
  .object({
    channels: notificationChannelSettingsSchema.optional(),
    quietHours: notificationQuietHoursSchema.optional(),
    typePreferences: z.record(notificationTypePreferenceSchema).optional(),
    mutedCoaches: z
      .array(
        z
          .object({
            coachId: z.string().trim().min(1),
            reason: z.string().trim().max(240).nullable().optional(),
          })
          .strict(),
      )
      .max(200)
      .optional(),
  })
  .strict();

const privacySettingKeys = [
  'profileVisible',
  'showLocation',
  'showOnlineStatus',
  'showActivityStatus',
  'shareAnalytics',
  'personalizedAds',
  'shareWithPartners',
  'showEarnings',
  'showClientList',
] as const;

type PrivacySettingKey = (typeof privacySettingKeys)[number];

const privacySettingDefaults: Record<PrivacySettingKey, boolean> = {
  profileVisible: true,
  showLocation: true,
  showOnlineStatus: true,
  showActivityStatus: false,
  shareAnalytics: true,
  personalizedAds: false,
  shareWithPartners: false,
  showEarnings: false,
  showClientList: false,
};

const privacySettingsUpdateSchema = z
  .object({
    profileVisible: z.boolean().optional(),
    showLocation: z.boolean().optional(),
    showOnlineStatus: z.boolean().optional(),
    showActivityStatus: z.boolean().optional(),
    shareAnalytics: z.boolean().optional(),
    personalizedAds: z.boolean().optional(),
    shareWithPartners: z.boolean().optional(),
    showEarnings: z.boolean().optional(),
    showClientList: z.boolean().optional(),
  })
  .strict()
  .refine((value) => privacySettingKeys.some((key) => value[key] !== undefined), {
    message: 'At least one privacy setting must be supplied',
  });

const bookingPreferencesUpdateSchema = z
  .object({
    allowBookSelf: z.boolean(),
  })
  .strict();

const dataDeletionRequestCreateSchema = z
  .object({
    reason: z.string().trim().min(1).max(500).optional(),
  })
  .strict();

const mediaAttachmentProofSchema = z
  .object({
    mediaObjectId: z.string().trim().min(1),
    title: z.string().trim().min(1).max(120).optional(),
  })
  .strict();

const groupMessageCreateRequestSchema = z
  .object({
    body: z.string().trim().min(1).max(2000),
    idempotencyKey: z.string().trim().min(8).max(120).optional(),
    attachments: z.array(mediaAttachmentProofSchema).max(5).optional(),
  })
  .strict();

const postCreateRequestSchema = z.object({
  clubId: z.string().trim().min(1).optional(),
  communityGroupId: z.string().trim().min(1).optional(),
  content: z.string().trim().min(1).max(4000),
  visibility: z.enum(['PUBLIC', 'CLUB', 'GROUP', 'PRIVATE']).optional(),
  metadata: z.record(z.unknown()).optional(),
  idempotencyKey: z.string().trim().min(8).max(120).optional(),
  attachments: z.array(mediaAttachmentProofSchema).max(5).optional(),
});
const postPinRequestSchema = z
  .object({
    pinned: z.boolean(),
  })
  .strict();

const postCommentCreateRequestSchema = z
  .object({
    content: z.string().trim().min(1).max(2000),
    parentCommentId: z.string().trim().min(1).optional(),
    idempotencyKey: z.string().trim().min(8).max(120).optional(),
  })
  .strict();

const simulatedCompleteRequestSchema = z.object({
  token: z.string().trim().min(20),
});

function getActiveRows(rows: SeedRow[]): SeedRow[] {
  return rows.filter((row) => row.deletedAt == null);
}

function moneyFromMinor(value: unknown): number {
  return Math.round((Number(value ?? 0) / 100) * 100) / 100;
}

function formatSessionType(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }
  switch (value) {
    case 'one_to_one':
      return '1-on-1 Training';
    case 'group':
      return 'Group Session';
    default:
      return value
        .split('_')
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
  }
}

function toInvoiceStatus(value: unknown): InvoiceStatus {
  const status = asString(value)?.toUpperCase();
  if (status && INVOICE_STATUSES.includes(status as InvoiceStatus)) {
    return status as InvoiceStatus;
  }
  return 'SENT';
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function renderHostedPaymentPage(params: {
  invoiceNumber: string;
  amountMinor: number;
  currency: string;
  completeUrl: string;
  token: string;
  returnUrl?: string | null;
  cancelUrl?: string | null;
}): string {
  const formattedAmount = `£${(params.amountMinor / 100).toFixed(2)} ${params.currency}`;
  const safeReturnUrl = params.returnUrl ? escapeHtml(params.returnUrl) : '';
  const safeCancelUrl = params.cancelUrl ? escapeHtml(params.cancelUrl) : '';
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Clubroom Payment</title>
    <style>
      :root { color-scheme: light; }
      body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #f5f1e8; color: #1a1f1d; }
      main { max-width: 420px; margin: 0 auto; min-height: 100vh; display: grid; place-items: center; padding: 24px; }
      section { width: 100%; background: #fffaf2; border: 1px solid #d9cfbb; border-radius: 24px; padding: 24px; box-shadow: 0 14px 40px rgba(26, 31, 29, 0.08); }
      h1 { margin: 0 0 8px; font-size: 28px; line-height: 1.1; }
      p { margin: 0; color: #5a645d; }
      dl { margin: 24px 0; display: grid; gap: 12px; }
      dt { font-size: 12px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #6c766e; }
      dd { margin: 4px 0 0; font-size: 18px; font-weight: 600; color: #1a1f1d; }
      form { display: grid; gap: 12px; margin-top: 24px; }
      button, a { appearance: none; border: 0; border-radius: 14px; padding: 14px 16px; font-size: 16px; font-weight: 700; text-align: center; text-decoration: none; cursor: pointer; }
      button { background: #0a7f5a; color: white; }
      a.secondary { background: #ece4d2; color: #1a1f1d; }
      small { display: block; margin-top: 16px; color: #6c766e; line-height: 1.4; }
    </style>
  </head>
  <body>
    <main>
      <section>
        <p>Hosted payment session</p>
        <h1>${escapeHtml(params.invoiceNumber)}</h1>
        <dl>
          <div>
            <dt>Amount</dt>
            <dd>${escapeHtml(formattedAmount)}</dd>
          </div>
          <div>
            <dt>Mode</dt>
            <dd>Simulated secure checkout</dd>
          </div>
        </dl>
        <form id="payment-form">
          <button type="submit">Complete simulated payment</button>
          ${safeCancelUrl ? `<a class="secondary" href="${safeCancelUrl}">Cancel and return</a>` : ''}
        </form>
        <small>
          This is the temporary hosted payment boundary. The app never marks an invoice paid directly.
          In production, this page is replaced by the real provider checkout.
          ${safeReturnUrl ? ` After success you can return to <strong>${safeReturnUrl}</strong>.` : ''}
        </small>
      </section>
    </main>
    <script>
      const form = document.getElementById('payment-form');
      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const response = await fetch(${JSON.stringify(params.completeUrl)}, {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'accept': 'text/html' },
          body: JSON.stringify({ token: ${JSON.stringify(params.token)} }),
        });
        const html = await response.text();
        document.open();
        document.write(html);
        document.close();
      });
    </script>
  </body>
</html>`;
}

function findUserEmail(users: SeedRow[], userId: string | undefined): string | undefined {
  if (!userId) {
    return undefined;
  }
  const user = users.find((row) => asString(row.id) === userId);
  return asString(user?.email);
}

function mapInvoice(row: SeedRow, users: SeedRow[]) {
  const payerUserId = asString(row.payerUserId) ?? '';
  return {
    id: asString(row.id) ?? '',
    invoiceNumber: asString(row.invoiceNumber) ?? '',
    userId: payerUserId,
    bookingId: asString(row.bookingId) ?? '',
    coachId: asString(row.coachUserId) ?? '',
    athleteId: asString(row.athleteId),
    sessionDate: asString(row.sessionDate) ?? nowIso(),
    sessionType: formatSessionType(asString(row.sessionType)),
    sessionLocation: asString(row.sessionLocation),
    sessionDuration: asNumber(row.sessionDurationMinutes),
    amount: moneyFromMinor(row.subtotalMinor),
    tax: moneyFromMinor(row.taxMinor),
    taxRate: asNumber(row.taxRatePercent) ?? 0,
    total: moneyFromMinor(row.totalMinor),
    currency: asString(row.currency) ?? 'GBP',
    status: toInvoiceStatus(row.status),
    createdAt: asString(row.createdAt) ?? nowIso(),
    updatedAt: asString(row.updatedAt),
    sentAt: asString(row.sentAt),
    sentTo: findUserEmail(users, payerUserId),
    paidAt: asString(row.paidAt),
    voidedAt: asString(row.voidedAt) ?? undefined,
    voidReason: asString(row.voidReason) ?? undefined,
    dueDate: asString(row.dueDate),
    notes: asString(row.notes),
    coachBusinessName: asString(row.coachBusinessName),
    coachBusinessEmail: asString(row.coachBusinessEmail),
    billingAddress: asString(row.billingAddress),
  };
}

function canAccessInvoice(authUserId: string, isAdmin: boolean, invoice: SeedRow): boolean {
  return (
    isAdmin ||
    asString(invoice.coachUserId) === authUserId ||
    asString(invoice.payerUserId) === authUserId
  );
}

function normalizeVideoUploadStatus(
  value: unknown,
): 'UPLOADING' | 'PROCESSING' | 'READY' | 'FAILED' {
  switch (String(value ?? '').toUpperCase()) {
    case 'PENDING_UPLOAD':
      return 'UPLOADING';
    case 'UPLOADED_UNSCANNED':
    case 'PENDING_SCAN':
      return 'PROCESSING';
    case 'REJECTED':
    case 'FAILED':
    case 'QUARANTINED':
      return 'FAILED';
    default:
      return 'READY';
  }
}

function normalizeVideoVisibility(value: unknown): 'PRIVATE' | 'SHARED' {
  return String(value ?? '').toUpperCase() === 'SHARED' ? 'SHARED' : 'PRIVATE';
}

function mapVideoAnnotation(row: SeedRow) {
  return {
    id: asString(row.id) ?? '',
    timestamp: Math.round((asNumber(row.timestampMs) ?? 0) / 1000),
    label: asString(row.text) ?? '',
    note: asString(row.note) ?? undefined,
    type: (asString(row.annotationType) ?? 'GENERAL') as
      | 'HIGHLIGHT'
      | 'IMPROVEMENT'
      | 'TECHNIQUE'
      | 'GENERAL',
    createdBy: asString(row.authorUserId) ?? undefined,
    createdAt: asString(row.createdAt) ?? undefined,
    updatedAt: asString(row.updatedAt) ?? undefined,
  };
}

function mapVideoRecord(bundle: {
  video: SeedRow;
  mediaObject: SeedRow;
  annotations: SeedRow[];
  shares: SeedRow[];
}) {
  const playback = signedMediaPlayback(bundle.mediaObject);

  return {
    id: asString(bundle.video.id) ?? '',
    coachUserId: asString(bundle.video.coachUserId) ?? undefined,
    athleteId: asString(bundle.video.athleteId) ?? undefined,
    title: asString(bundle.video.title) ?? '',
    description: asString(bundle.video.description) ?? undefined,
    visibility: normalizeVideoVisibility(bundle.video.visibility),
    sharedWithUserIds: bundle.shares
      .map((row) => asString(row.sharedWithUserId))
      .filter((userId): userId is string => Boolean(userId)),
    sourceContextType: asString(bundle.video.sourceContextType) ?? undefined,
    sourceContextId: asString(bundle.video.sourceContextId) ?? undefined,
    mediaObjectId: asString(bundle.video.mediaObjectId) ?? '',
    uploadStatus: normalizeVideoUploadStatus(bundle.mediaObject.status),
    playbackUrl: playback.url,
    playbackExpiresAt: playback.expiresAt,
    thumbnailUrl: playback.url,
    durationMs: asNumber(bundle.mediaObject.durationMs) ?? 0,
    fileSizeBytes: asNumber(bundle.mediaObject.sizeBytes) ?? 0,
    contentType: asString(bundle.mediaObject.contentType) ?? 'video/mp4',
    createdAt: asString(bundle.video.createdAt) ?? nowIso(),
    updatedAt: asString(bundle.video.updatedAt) ?? undefined,
    annotations: bundle.annotations.map(mapVideoAnnotation),
  };
}

async function getAthleteProgressPayload(athleteId: string) {
  if (getApiDataBackend() === 'db') {
    if (shouldUseDbFixtureFallback()) {
      const store = getDbFixtureStore();
      const sessionNotes = asRows(store.tables.sessionNotes).filter(
        (row) => asString(row.athleteId) === athleteId && !asString(row.deletedAt),
      );
      const sessionFeedback = asRows(store.tables.sessionFeedback).filter(
        (row) => asString(row.athleteId) === athleteId && !asString(row.deletedAt),
      );
      const skillAssessments = asRows(store.tables.athleteSkillAssessments).filter(
        (row) => asString(row.athleteId) === athleteId,
      );
      const skillDefinitionIds = new Set(
        skillAssessments
          .map((row) => asString(row.skillDefinitionId))
          .filter((id): id is string => Boolean(id)),
      );
      const skillDefinitions = asRows(store.tables.skillDefinitions).filter((row) =>
        skillDefinitionIds.has(asString(row.id) ?? ''),
      );
      return {
        sessionNotes,
        sessionFeedback,
        skillAssessments,
        skillDefinitions,
        seedVersion: store.version,
      };
    }

    const prisma = getPrismaClientOrThrow();
    const [sessionNotes, sessionFeedback, skillAssessments] = await Promise.all([
      prisma.sessionNote.findMany({
        where: { athleteId, deletedAt: null },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.sessionFeedback.findMany({
        where: { athleteId, deletedAt: null },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.athleteSkillAssessment.findMany({
        where: { athleteId },
        orderBy: { assessedAt: 'desc' },
      }),
    ]);
    const skillDefinitionIds = [
      ...new Set(skillAssessments.map((assessment) => assessment.skillDefinitionId)),
    ];
    const skillDefinitions = skillDefinitionIds.length
      ? await prisma.skillDefinition.findMany({
          where: { id: { in: skillDefinitionIds } },
        })
      : [];

    return normalizeForJson({
      sessionNotes,
      sessionFeedback,
      skillAssessments,
      skillDefinitions,
      seedVersion: null,
    });
  }

  const store = getMarketplaceSeedStore();
  const sessionNotes = asRows(store.tables.sessionNotes).filter(
    (row) => asString(row.athleteId) === athleteId && !asString(row.deletedAt),
  );
  const sessionFeedback = asRows(store.tables.sessionFeedback).filter(
    (row) => asString(row.athleteId) === athleteId && !asString(row.deletedAt),
  );
  const skillAssessments = asRows(store.tables.athleteSkillAssessments).filter(
    (row) => asString(row.athleteId) === athleteId,
  );
  const skillDefinitionIds = new Set(
    skillAssessments
      .map((row) => asString(row.skillDefinitionId))
      .filter((id): id is string => Boolean(id)),
  );
  const skillDefinitions = asRows(store.tables.skillDefinitions).filter((row) =>
    skillDefinitionIds.has(asString(row.id) ?? ''),
  );

  return {
    sessionNotes,
    sessionFeedback,
    skillAssessments,
    skillDefinitions,
    seedVersion: store.version,
  };
}

type SessionFeedbackListOptions = z.infer<typeof sessionFeedbackListQuerySchema>;
type CoachDevelopmentSessionListOptions = z.infer<
  typeof coachDevelopmentSessionListQuerySchema
>;
type SessionFeedbackBody = z.infer<typeof sessionFeedbackRequestSchema>;
type SessionFeedbackVisibility = z.infer<typeof sessionFeedbackVisibilitySchema>;
type SessionMediaAssetInput = z.infer<typeof sessionMediaAssetInputSchema>;
type SessionMediaSaveBody = z.infer<typeof sessionMediaSaveRequestSchema>;
type SelfAssessmentListOptions = z.infer<typeof selfAssessmentListQuerySchema>;
type SelfAssessmentSubmitBody = z.infer<typeof selfAssessmentSubmitRequestSchema>;

function sessionFeedbackMetadata(body: SessionFeedbackBody): SeedRow {
  return {
    coachName: body.coachName,
    athleteName: body.athleteName,
    sessionTemplateId: body.sessionTemplateId ?? null,
    sessionTemplateName: body.sessionTemplateName ?? null,
    sessionTitle: body.sessionTitle ?? null,
    skillsWorkedOn: body.skillsWorkedOn,
    skillRatings: body.skillRatings,
    improvements: body.improvements,
    homework: body.homework,
    effortRating: body.effortRating,
    overallPerformance: body.overallPerformance,
    videoClipUrls: body.videoClipUrls ?? [],
    photoUrls: body.photoUrls ?? [],
    badgeAwarded: body.badgeAwarded ?? null,
    fourCorners: body.fourCorners ?? null,
    positionPlayed: body.positionPlayed ?? null,
    positionsPlayed: body.positionsPlayed ?? [],
    subSkillRatings: body.subSkillRatings ?? [],
  };
}

function sessionFeedbackBodyWithAuthoritativeNames(
  body: SessionFeedbackBody,
  coach: SeedRow | undefined,
  athlete: SeedRow | undefined,
): SessionFeedbackBody {
  const coachName = asString(coach?.name)?.trim();
  const athleteName =
    asString(athlete?.displayName)?.trim() ||
    [asString(athlete?.firstName), asString(athlete?.lastName)].filter(Boolean).join(' ').trim();

  if (!coachName) {
    throw notFound('Session feedback coach not found', { coachId: body.coachId });
  }
  if (!athleteName) {
    throw notFound('Session feedback athlete not found', { athleteId: body.athleteId });
  }

  return { ...body, coachName, athleteName };
}

async function withAuthoritativeSessionFeedbackNames(
  body: SessionFeedbackBody,
): Promise<SessionFeedbackBody> {
  if (getApiDataBackend() === 'db' && !shouldUseDbFixtureFallback()) {
    const prisma = getPrismaClientOrThrow();
    const [coach, athlete] = await Promise.all([
      prisma.user.findFirst({
        where: { id: body.coachId, deletedAt: null },
        select: { name: true },
      }),
      prisma.athlete.findFirst({
        where: { id: body.athleteId, deletedAt: null },
        select: { displayName: true, firstName: true, lastName: true },
      }),
    ]);
    return sessionFeedbackBodyWithAuthoritativeNames(
      body,
      coach ? (normalizeForJson(coach) as SeedRow) : undefined,
      athlete ? (normalizeForJson(athlete) as SeedRow) : undefined,
    );
  }

  const tables =
    getApiDataBackend() === 'db' ? getDbFixtureStore().tables : getMarketplaceSeedStore().tables;
  const coach = asRows(tables.users).find(
    (row) => asString(row.id) === body.coachId && !asString(row.deletedAt),
  );
  const athlete = asRows(tables.athletes).find(
    (row) => asString(row.id) === body.athleteId && !asString(row.deletedAt),
  );
  return sessionFeedbackBodyWithAuthoritativeNames(body, coach, athlete);
}

function normalizeSessionFeedbackVisibility(value: unknown): SessionFeedbackVisibility {
  const raw = String(value ?? '').toLowerCase();
  if (raw === 'coach_only' || raw === 'parent' || raw === 'athlete') {
    return raw;
  }
  if (raw === 'public') {
    return 'parent';
  }
  return raw ? 'coach_only' : 'athlete';
}

function mapSessionFeedback(row: SeedRow) {
  const metadata = coerceMetadata(row.metadataJson);
  const rating = asNumber(row.rating);
  return {
    id: asString(row.id) ?? '',
    sessionId: asString(row.sessionId) ?? asString(row.bookingId) ?? '',
    bookingId: asString(row.bookingId) ?? undefined,
    sessionTemplateId: asString(metadata.sessionTemplateId) ?? undefined,
    sessionTemplateName: asString(metadata.sessionTemplateName) ?? undefined,
    sessionTitle: asString(metadata.sessionTitle) ?? undefined,
    coachId: asString(row.authorUserId) ?? '',
    coachName: asString(metadata.coachName) ?? 'Coach',
    athleteId: asString(row.athleteId) ?? '',
    athleteName: asString(metadata.athleteName) ?? 'Athlete',
    createdAt: asString(row.createdAt) ?? nowIso(),
    updatedAt: asString(row.updatedAt) ?? undefined,
    privateNotes: asString(row.privateCommentEncrypted) ?? undefined,
    publicSummary: asString(row.publicComment) ?? '',
    skillsWorkedOn: asStringArray(metadata.skillsWorkedOn),
    skillRatings: Array.isArray(metadata.skillRatings) ? metadata.skillRatings : [],
    improvements: asString(metadata.improvements) ?? '',
    homework: asString(metadata.homework) ?? '',
    effortRating: asNumber(metadata.effortRating) ?? rating ?? 3,
    overallPerformance: asNumber(metadata.overallPerformance) ?? rating ?? 3,
    videoClipUrls: asStringArray(metadata.videoClipUrls),
    photoUrls: asStringArray(metadata.photoUrls),
    badgeAwarded: asString(metadata.badgeAwarded) ?? undefined,
    fourCorners: coerceMetadata(metadata.fourCorners),
    positionPlayed: asString(metadata.positionPlayed) ?? undefined,
    positionsPlayed: asStringArray(metadata.positionsPlayed),
    subSkillRatings: Array.isArray(metadata.subSkillRatings) ? metadata.subSkillRatings : [],
    visibility: normalizeSessionFeedbackVisibility(row.visibility),
  };
}

function resolveSessionFeedbackViewerRole(
  request: FastifyRequest,
): SessionFeedbackListOptions['viewerRole'] {
  const actingRole = request.auth?.actingRole ?? request.auth?.roles[0];
  if (actingRole === 'coach' || actingRole === 'parent') {
    return actingRole;
  }
  return 'athlete';
}

function visibleSessionFeedback(row: SeedRow, viewerRole: string) {
  const mapped = mapSessionFeedback(row);
  if (viewerRole !== 'coach' && mapped.visibility === 'coach_only') {
    return null;
  }
  return viewerRole === 'coach'
    ? mapped
    : {
        ...mapped,
        privateNotes: undefined,
      };
}

function sessionFeedbackMatchesSession(row: SeedRow, sessionId: string): boolean {
  const metadata = coerceMetadata(row.metadataJson);
  return (
    asString(row.sessionId) === sessionId ||
    asString(row.bookingId) === sessionId ||
    asString(metadata.sessionId) === sessionId
  );
}

function mutableSessionFeedbackRows(tables: SeedTables): SeedRow[] {
  if (!Array.isArray(tables.sessionFeedback)) {
    tables.sessionFeedback = [];
  }
  return asRows(tables.sessionFeedback);
}

function mutableRows(tables: SeedTables, tableName: string): SeedRow[] {
  if (!Array.isArray(tables[tableName])) {
    tables[tableName] = [];
  }
  return asRows(tables[tableName]);
}

function feedbackHomeworkIds(feedbackId: string): { assignmentId: string; drillId: string } {
  return {
    assignmentId: `${FEEDBACK_HOMEWORK_ASSIGNMENT_PREFIX}${feedbackId}`,
    drillId: `${FEEDBACK_HOMEWORK_DRILL_PREFIX}${feedbackId}`,
  };
}

function feedbackHomeworkText(body: SessionFeedbackBody): string | null {
  if (body.visibility === 'coach_only') {
    return null;
  }
  const homework = body.homework.trim();
  return homework.length > 0 ? homework : null;
}

function feedbackHomeworkTitle(body: SessionFeedbackBody): string {
  const sessionTitle = body.sessionTitle?.trim();
  return sessionTitle ? `${sessionTitle} homework` : 'Session homework';
}

function feedbackHomeworkMetadata(feedbackId: string, body: SessionFeedbackBody): SeedRow {
  return {
    source: 'session_feedback',
    feedbackId,
    sessionId: body.sessionId,
    bookingId: body.bookingId ?? null,
  };
}

function syncSeedFeedbackHomeworkPracticeTask(
  tables: SeedTables,
  feedback: SeedRow,
  body: SessionFeedbackBody,
): void {
  const feedbackId = asString(feedback.id);
  if (!feedbackId) {
    return;
  }
  const homework = feedbackHomeworkText(body);
  const { assignmentId, drillId } = feedbackHomeworkIds(feedbackId);
  const now = nowIso();
  const drills = mutableRows(tables, 'drills');
  const assignments = mutableRows(tables, 'drillAssignments');
  const drill = drills.find((row) => asString(row.id) === drillId);
  const assignment = assignments.find((row) => asString(row.id) === assignmentId);

  if (!homework) {
    if (assignment && !asString(assignment.deletedAt)) {
      assignment.deletedAt = now;
      assignment.updatedAt = now;
      assignment.updatedByUserId = body.coachId;
      assignment.version = (asNumber(assignment.version) ?? 0) + 1;
    }
    if (drill && !asString(drill.deletedAt)) {
      drill.active = false;
      drill.deletedAt = now;
      drill.updatedAt = now;
    }
    return;
  }

  const assignedAt = asString(feedback.createdAt) ?? now;
  const dueDate = addDays(assignedAt, FEEDBACK_HOMEWORK_DUE_DAYS);
  const metadataJson = feedbackHomeworkMetadata(feedbackId, body);
  if (drill) {
    drill.authorUserId = body.coachId;
    drill.title = 'Session Homework';
    drill.description = homework;
    drill.difficulty = null;
    drill.active = true;
    drill.metadataJson = metadataJson;
    drill.deletedAt = null;
    drill.updatedAt = now;
  } else {
    drills.push({
      id: drillId,
      authorUserId: body.coachId,
      title: 'Session Homework',
      description: homework,
      difficulty: null,
      active: true,
      metadataJson,
      createdAt: assignedAt,
      updatedAt: now,
      deletedAt: null,
    });
  }

  if (assignment) {
    assignment.drillId = drillId;
    assignment.athleteId = body.athleteId;
    assignment.coachUserId = body.coachId;
    assignment.title = feedbackHomeworkTitle(body);
    assignment.instructions = homework;
    assignment.requiresEvidence = false;
    if (!asString(assignment.dueDate) || asString(assignment.deletedAt)) {
      assignment.dueDate = dueDate;
    }
    if (asString(assignment.deletedAt)) {
      assignment.status = 'ASSIGNED';
      assignment.deletedAt = null;
    }
    assignment.updatedAt = now;
    assignment.updatedByUserId = body.coachId;
    assignment.version = (asNumber(assignment.version) ?? 0) + 1;
    return;
  }

  assignments.push({
    id: assignmentId,
    drillId,
    athleteId: body.athleteId,
    coachUserId: body.coachId,
    title: feedbackHomeworkTitle(body),
    instructions: homework,
    requiresEvidence: false,
    dueDate,
    status: 'ASSIGNED',
    createdByUserId: body.coachId,
    updatedByUserId: body.coachId,
    version: 1,
    createdAt: assignedAt,
    updatedAt: now,
    deletedAt: null,
  });
}

async function syncDbFeedbackHomeworkPracticeTask(
  tx: FeedbackHomeworkDbClient,
  feedbackId: string,
  feedbackCreatedAt: Date,
  body: SessionFeedbackBody,
): Promise<void> {
  const homework = feedbackHomeworkText(body);
  const { assignmentId, drillId } = feedbackHomeworkIds(feedbackId);
  const now = new Date();

  if (!homework) {
    await tx.drillAssignment.updateMany({
      where: {
        id: assignmentId,
        deletedAt: null,
      },
      data: {
        deletedAt: now,
        updatedByUserId: body.coachId,
        version: {
          increment: 1,
        },
      },
    });
    await tx.drill.updateMany({
      where: {
        id: drillId,
        deletedAt: null,
      },
      data: {
        active: false,
        deletedAt: now,
      },
    });
    return;
  }

  const dueDate = new Date(addDays(feedbackCreatedAt.toISOString(), FEEDBACK_HOMEWORK_DUE_DAYS));
  const metadataJson = feedbackHomeworkMetadata(feedbackId, body);
  await tx.drill.upsert({
    where: {
      id: drillId,
    },
    create: {
      id: drillId,
      authorUserId: body.coachId,
      title: 'Session Homework',
      description: homework,
      difficulty: null,
      active: true,
      metadataJson: metadataJson as never,
    },
    update: {
      authorUserId: body.coachId,
      title: 'Session Homework',
      description: homework,
      difficulty: null,
      active: true,
      metadataJson: metadataJson as never,
      deletedAt: null,
    },
  });

  const existingAssignment = await tx.drillAssignment.findUnique({
    where: {
      id: assignmentId,
    },
    select: {
      deletedAt: true,
      dueDate: true,
    },
  });
  if (existingAssignment) {
    await tx.drillAssignment.update({
      where: {
        id: assignmentId,
      },
      data: {
        drillId,
        athleteId: body.athleteId,
        coachUserId: body.coachId,
        title: feedbackHomeworkTitle(body),
        instructions: homework,
        requiresEvidence: false,
        deletedAt: null,
        updatedByUserId: body.coachId,
        ...(existingAssignment.dueDate && !existingAssignment.deletedAt ? {} : { dueDate }),
        ...(existingAssignment.deletedAt ? { status: 'ASSIGNED' } : {}),
        version: {
          increment: 1,
        },
      },
    });
    return;
  }

  await tx.drillAssignment.create({
    data: {
      id: assignmentId,
      drillId,
      athleteId: body.athleteId,
      coachUserId: body.coachId,
      title: feedbackHomeworkTitle(body),
      instructions: homework,
      requiresEvidence: false,
      dueDate,
      status: 'ASSIGNED',
      createdByUserId: body.coachId,
      updatedByUserId: body.coachId,
    },
  });
}

function listSeedSessionFeedback(
  tables: SeedTables,
  athleteId: string,
  options: SessionFeedbackListOptions,
) {
  const rows = asRows(tables.sessionFeedback)
    .filter((row) => asString(row.athleteId) === athleteId && !asString(row.deletedAt))
    .sort(
      (left, right) =>
        Date.parse(asString(right.createdAt) ?? '') - Date.parse(asString(left.createdAt) ?? ''),
    )
    .flatMap((row) => {
      const feedback = visibleSessionFeedback(row, options.viewerRole);
      return feedback ? [feedback] : [];
    });
  return options.limit ? rows.slice(0, options.limit) : rows;
}

function listSeedCoachDevelopmentSessionFeedback(
  tables: SeedTables,
  coachUserId: string,
  options: CoachDevelopmentSessionListOptions,
) {
  return asRows(tables.sessionFeedback)
    .filter(
      (row) =>
        asString(row.authorUserId) === coachUserId &&
        !asString(row.deletedAt),
    )
    .sort(
      (left, right) =>
        Date.parse(asString(right.createdAt) ?? '') - Date.parse(asString(left.createdAt) ?? ''),
    )
    .flatMap((row) => {
      const feedback = visibleSessionFeedback(row, 'coach');
      return feedback ? [feedback] : [];
    })
    .slice(0, options.limit);
}

async function listSessionFeedback(athleteId: string, options: SessionFeedbackListOptions) {
  if (getApiDataBackend() === 'db') {
    if (shouldUseDbFixtureFallback()) {
      const store = getDbFixtureStore();
      return {
        feedback: listSeedSessionFeedback(store.tables, athleteId, options),
        seedVersion: store.version,
      };
    }
    const prisma = getPrismaClientOrThrow();
    const rows = await prisma.sessionFeedback.findMany({
      where: {
        athleteId,
        deletedAt: null,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: options.limit,
    });
    return {
      feedback: (normalizeForJson(rows) as SeedRow[]).flatMap((row) => {
        const feedback = visibleSessionFeedback(row, options.viewerRole);
        return feedback ? [feedback] : [];
      }),
      seedVersion: null,
    };
  }

  const store = getMarketplaceSeedStore();
  return {
    feedback: listSeedSessionFeedback(store.tables, athleteId, options),
    seedVersion: store.version,
  };
}

async function listCoachDevelopmentSessionFeedback(
  coachUserId: string,
  options: CoachDevelopmentSessionListOptions,
) {
  if (getApiDataBackend() === 'db') {
    if (shouldUseDbFixtureFallback()) {
      const store = getDbFixtureStore();
      return {
        feedback: listSeedCoachDevelopmentSessionFeedback(store.tables, coachUserId, options),
        seedVersion: store.version,
      };
    }
    const prisma = getPrismaClientOrThrow();
    const rows = await prisma.sessionFeedback.findMany({
      where: {
        authorUserId: coachUserId,
        deletedAt: null,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: options.limit,
    });
    return {
      feedback: (normalizeForJson(rows) as SeedRow[]).flatMap((row) => {
        const feedback = visibleSessionFeedback(row, 'coach');
        return feedback ? [feedback] : [];
      }),
      seedVersion: null,
    };
  }

  const store = getMarketplaceSeedStore();
  return {
    feedback: listSeedCoachDevelopmentSessionFeedback(store.tables, coachUserId, options),
    seedVersion: store.version,
  };
}

function findSeedSessionFeedbackBySession(tables: SeedTables, sessionId: string): SeedRow | null {
  return (
    asRows(tables.sessionFeedback).find(
      (row) => !asString(row.deletedAt) && sessionFeedbackMatchesSession(row, sessionId),
    ) ?? null
  );
}

async function findSessionFeedbackBySession(sessionId: string) {
  if (getApiDataBackend() === 'db') {
    if (shouldUseDbFixtureFallback()) {
      const store = getDbFixtureStore();
      return {
        row: findSeedSessionFeedbackBySession(store.tables, sessionId),
        seedVersion: store.version,
      };
    }
    const prisma = getPrismaClientOrThrow();
    const row = await prisma.sessionFeedback.findFirst({
      where: {
        deletedAt: null,
        OR: [
          {
            sessionId,
          },
          {
            bookingId: sessionId,
          },
        ],
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    return {
      row: row ? (normalizeForJson(row) as SeedRow) : null,
      seedVersion: null,
    };
  }

  const store = getMarketplaceSeedStore();
  return {
    row: findSeedSessionFeedbackBySession(store.tables, sessionId),
    seedVersion: store.version,
  };
}

function upsertSeedSessionFeedback(tables: SeedTables, body: SessionFeedbackBody): SeedRow {
  const rows = mutableSessionFeedbackRows(tables);
  const now = nowIso();
  const existing = rows.find(
    (row) =>
      asString(row.athleteId) === body.athleteId &&
      asString(row.authorUserId) === body.coachId &&
      (asString(row.sessionId) === body.sessionId || asString(row.bookingId) === body.bookingId) &&
      !asString(row.deletedAt),
  );
  const metadataJson = sessionFeedbackMetadata(body);
  if (existing) {
    existing.sessionId = body.sessionId;
    existing.bookingId = body.bookingId ?? null;
    existing.rating = body.overallPerformance;
    existing.publicComment = body.publicSummary;
    existing.privateCommentEncrypted = body.privateNotes ?? null;
    existing.visibility = body.visibility;
    existing.metadataJson = metadataJson;
    existing.updatedAt = now;
    return existing;
  }
  const created = {
    id: newId('sfb'),
    sessionId: body.sessionId,
    bookingId: body.bookingId ?? null,
    athleteId: body.athleteId,
    authorUserId: body.coachId,
    rating: body.overallPerformance,
    publicComment: body.publicSummary,
    privateCommentEncrypted: body.privateNotes ?? null,
    visibility: body.visibility,
    metadataJson,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };
  rows.unshift(created);
  return created;
}

async function upsertSessionFeedback(body: SessionFeedbackBody) {
  if (getApiDataBackend() === 'db') {
    if (shouldUseDbFixtureFallback()) {
      const store = getDbFixtureStore();
      const feedback = upsertSeedSessionFeedback(store.tables, body);
      syncSeedFeedbackHomeworkPracticeTask(store.tables, feedback, body);
      return {
        feedback: mapSessionFeedback(feedback),
        seedVersion: store.version,
      };
    }
    const prisma = getPrismaClientOrThrow();
    const row = await prisma.$transaction(async (tx) => {
      const existing = await tx.sessionFeedback.findFirst({
        where: {
          athleteId: body.athleteId,
          authorUserId: body.coachId,
          deletedAt: null,
          OR: [
            {
              sessionId: body.sessionId,
            },
            ...(body.bookingId
              ? [
                  {
                    bookingId: body.bookingId,
                  },
                ]
              : []),
          ],
        },
      });
      const metadataJson = sessionFeedbackMetadata(body);
      const feedback = existing
        ? await tx.sessionFeedback.update({
            where: {
              id: existing.id,
            },
            data: {
              sessionId: body.sessionId,
              bookingId: body.bookingId ?? null,
              rating: body.overallPerformance,
              publicComment: body.publicSummary,
              privateCommentEncrypted: body.privateNotes ?? null,
              visibility: body.visibility,
              metadataJson: metadataJson as never,
            },
          })
        : await tx.sessionFeedback.create({
            data: {
              id: newId('sfb'),
              sessionId: body.sessionId,
              bookingId: body.bookingId ?? null,
              athleteId: body.athleteId,
              authorUserId: body.coachId,
              rating: body.overallPerformance,
              publicComment: body.publicSummary,
              privateCommentEncrypted: body.privateNotes ?? null,
              visibility: body.visibility,
              metadataJson: metadataJson as never,
            },
          });
      await syncDbFeedbackHomeworkPracticeTask(tx, feedback.id, feedback.createdAt, body);
      return feedback;
    }, API_DB_TRANSACTION_OPTIONS);
    return {
      feedback: mapSessionFeedback(normalizeForJson(row) as SeedRow),
      seedVersion: null,
    };
  }

  const store = getMarketplaceSeedStore();
  const feedback = upsertSeedSessionFeedback(store.tables, body);
  syncSeedFeedbackHomeworkPracticeTask(store.tables, feedback, body);
  return {
    feedback: mapSessionFeedback(feedback),
    seedVersion: store.version,
  };
}

function mutableSessionMediaAssetRows(tables: SeedTables): SeedRow[] {
  if (!Array.isArray(tables.sessionMediaAssets)) {
    tables.sessionMediaAssets = [];
  }
  return asRows(tables.sessionMediaAssets);
}

function activeSessionMediaRows(tables: SeedTables): SeedRow[] {
  return asRows(tables.sessionMediaAssets).filter((row) => !asString(row.deletedAt));
}

function findMediaObject(tables: SeedTables, mediaObjectId: string | undefined): SeedRow | null {
  if (!mediaObjectId) {
    return null;
  }
  return (
    asRows(tables.mediaObjects).find(
      (row) => asString(row.id) === mediaObjectId && !asString(row.deletedAt),
    ) ?? null
  );
}

function assertMediaObjectUsable(
  row: SeedRow | null,
  authUserId: string,
  isAdmin: boolean,
  expectedKind: 'IMAGE' | 'VIDEO',
): void {
  if (!row) {
    throw notFound('Media object not found');
  }
  if (!isAdmin && asString(row.ownerUserId) !== authUserId) {
    throw forbidden('Media object does not belong to authenticated user');
  }
  if (asString(row.status) !== 'AVAILABLE') {
    throw badRequest('Media object must be finalized before session media can use it', {
      mediaObjectId: asString(row.id),
      status: asString(row.status) ?? null,
    });
  }
  if (asString(row.kind) !== expectedKind) {
    throw badRequest('Media object kind is not valid for this session media asset', {
      mediaObjectId: asString(row.id),
      expectedKind,
      actualKind: asString(row.kind) ?? null,
    });
  }
}

function signedMediaPlayback(mediaObject: SeedRow | null): { url: string; expiresAt?: string } {
  if (!mediaObject) {
    return { url: '' };
  }
  const storageKey = asString(mediaObject.storageKey) ?? '';
  try {
    return createSignedReadUrl({
      bucketName: asString(mediaObject.bucketName),
      storageKey,
    });
  } catch (error) {
    if (getApiDataBackend() === 'db' && !shouldUseDbFixtureFallback()) {
      throw serviceUnavailable('Object storage read signing is not configured', {
        mediaObjectId: asString(mediaObject.id) ?? null,
      });
    }
    return { url: `storage://${asString(mediaObject.bucketName) ?? 'private'}/${storageKey}` };
  }
}

function signedMediaUrl(mediaObject: SeedRow | null): string {
  return signedMediaPlayback(mediaObject).url;
}

function mapSessionMediaAsset(row: SeedRow, tables: SeedTables) {
  const mediaObject = findMediaObject(tables, asString(row.mediaObjectId));
  const thumbnail = findMediaObject(tables, asString(row.thumbnailMediaObjectId));
  const uri = signedMediaUrl(mediaObject);
  const thumbnailUri = signedMediaUrl(thumbnail) || uri;
  const base = {
    id: asString(row.id) ?? '',
    mediaObjectId: asString(row.mediaObjectId) ?? '',
    thumbnailMediaObjectId: asString(row.thumbnailMediaObjectId) ?? undefined,
    uri,
    thumbnailUri,
    capturedAt: asString(row.capturedAt) ?? nowIso(),
  };
  if (asString(row.kind) === 'video') {
    return {
      ...base,
      duration: Math.max(0, Math.round((asNumber(row.durationMs) ?? 0) / 1000)),
    };
  }
  return {
    ...base,
    width: asNumber(row.widthPx) ?? 0,
    height: asNumber(row.heightPx) ?? 0,
  };
}

function buildSessionMediaPayload(rows: SeedRow[], tables: SeedTables) {
  if (rows.length === 0) {
    return null;
  }
  const first = rows[0];
  const photos = rows
    .filter((row) => asString(row.kind) === 'photo')
    .map((row) => mapSessionMediaAsset(row, tables));
  const videoRow = rows.find((row) => asString(row.kind) === 'video');
  return {
    sessionId: asString(first.sessionId) ?? '',
    athleteId: asString(first.athleteId) ?? '',
    coachId: asString(first.coachUserId) ?? '',
    photos,
    video: videoRow ? mapSessionMediaAsset(videoRow, tables) : null,
    createdAt: asString(first.createdAt) ?? nowIso(),
  };
}

async function listSessionMediaRowsByAthlete(
  athleteId: string,
): Promise<{ rows: SeedRow[]; tables: SeedTables; seedVersion: string | null }> {
  if (getApiDataBackend() === 'db') {
    if (shouldUseDbFixtureFallback()) {
      const store = getDbFixtureStore();
      return {
        rows: activeSessionMediaRows(store.tables).filter(
          (row) => asString(row.athleteId) === athleteId,
        ),
        tables: store.tables,
        seedVersion: store.version,
      };
    }
    const prisma = getPrismaClientOrThrow();
    const rows = await prisma.sessionMediaAsset.findMany({
      where: {
        athleteId,
        deletedAt: null,
      },
      orderBy: {
        capturedAt: 'desc',
      },
    });
    const mediaObjectIds = rows
      .flatMap((row) => [row.mediaObjectId, row.thumbnailMediaObjectId])
      .filter((id): id is string => Boolean(id));
    const mediaObjects = mediaObjectIds.length
      ? await prisma.mediaObject.findMany({
          where: {
            id: {
              in: Array.from(new Set(mediaObjectIds)),
            },
            deletedAt: null,
          },
        })
      : [];
    return {
      rows: normalizeForJson(rows) as SeedRow[],
      tables: {
        mediaObjects: normalizeForJson(mediaObjects) as SeedRow[],
        sessionMediaAssets: normalizeForJson(rows) as SeedRow[],
      },
      seedVersion: null,
    };
  }
  const store = getMarketplaceSeedStore();
  return {
    rows: activeSessionMediaRows(store.tables).filter(
      (row) => asString(row.athleteId) === athleteId,
    ),
    tables: store.tables,
    seedVersion: store.version,
  };
}

async function listSessionMediaRowsBySession(
  sessionId: string,
  athleteId?: string,
): Promise<{ rows: SeedRow[]; tables: SeedTables; seedVersion: string | null }> {
  if (getApiDataBackend() === 'db') {
    if (shouldUseDbFixtureFallback()) {
      const store = getDbFixtureStore();
      return {
        rows: activeSessionMediaRows(store.tables).filter(
          (row) =>
            asString(row.sessionId) === sessionId &&
            (!athleteId || asString(row.athleteId) === athleteId),
        ),
        tables: store.tables,
        seedVersion: store.version,
      };
    }
    const prisma = getPrismaClientOrThrow();
    const rows = await prisma.sessionMediaAsset.findMany({
      where: {
        sessionId,
        ...(athleteId ? { athleteId } : {}),
        deletedAt: null,
      },
      orderBy: {
        capturedAt: 'desc',
      },
    });
    const mediaObjectIds = rows
      .flatMap((row) => [row.mediaObjectId, row.thumbnailMediaObjectId])
      .filter((id): id is string => Boolean(id));
    const mediaObjects = mediaObjectIds.length
      ? await prisma.mediaObject.findMany({
          where: {
            id: {
              in: Array.from(new Set(mediaObjectIds)),
            },
            deletedAt: null,
          },
        })
      : [];
    return {
      rows: normalizeForJson(rows) as SeedRow[],
      tables: {
        mediaObjects: normalizeForJson(mediaObjects) as SeedRow[],
        sessionMediaAssets: normalizeForJson(rows) as SeedRow[],
      },
      seedVersion: null,
    };
  }
  const store = getMarketplaceSeedStore();
  return {
    rows: activeSessionMediaRows(store.tables).filter(
      (row) =>
        asString(row.sessionId) === sessionId &&
        (!athleteId || asString(row.athleteId) === athleteId),
    ),
    tables: store.tables,
    seedVersion: store.version,
  };
}

function groupSessionMedia(rows: SeedRow[], tables: SeedTables) {
  const groups = new Map<string, SeedRow[]>();
  for (const row of rows) {
    const key = `${asString(row.sessionId) ?? ''}:${asString(row.athleteId) ?? ''}`;
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }
  return [...groups.values()].flatMap((group) => {
    const payload = buildSessionMediaPayload(group, tables);
    return payload ? [payload] : [];
  });
}

function inputDurationMs(input: SessionMediaAssetInput): number | null {
  return input.duration == null ? null : Math.round(input.duration * 1000);
}

async function hasActiveMediaConsent(
  athleteId: string,
  consentType: 'PHOTO' | 'VIDEO',
): Promise<boolean> {
  const isActive = (row: SeedRow): boolean => {
    if (row.granted !== true) {
      return false;
    }
    if (asString(row.revokedAt)) {
      return false;
    }
    const expiresAt = asString(row.expiresAt);
    return !expiresAt || Date.parse(expiresAt) > Date.now();
  };

  if (getApiDataBackend() === 'db') {
    if (shouldUseDbFixtureFallback()) {
      const store = getDbFixtureStore();
      return asRows(store.tables.childConsents).some(
        (row) =>
          asString(row.athleteId) === athleteId &&
          asString(row.consentType) === consentType &&
          isActive(row),
      );
    }
    const prisma = getPrismaClientOrThrow();
    const row = await prisma.childConsent.findFirst({
      where: {
        athleteId,
        consentType,
        granted: true,
        revokedAt: null,
        OR: [
          {
            expiresAt: null,
          },
          {
            expiresAt: {
              gt: new Date(),
            },
          },
        ],
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    return Boolean(row);
  }

  const store = getMarketplaceSeedStore();
  return asRows(store.tables.childConsents).some(
    (row) =>
      asString(row.athleteId) === athleteId &&
      asString(row.consentType) === consentType &&
      isActive(row),
  );
}

async function assertSessionMediaConsent(body: SessionMediaSaveBody): Promise<void> {
  if (body.photos.length > 0 && !(await hasActiveMediaConsent(body.athleteId, 'PHOTO'))) {
    throw forbidden('Photo consent is required before uploading athlete session photos');
  }
  if (body.video && !(await hasActiveMediaConsent(body.athleteId, 'VIDEO'))) {
    throw forbidden('Video consent is required before uploading athlete session video');
  }
}

function upsertSeedSessionMedia(
  tables: SeedTables,
  body: SessionMediaSaveBody,
  authUserId: string,
  isAdmin: boolean,
): SeedRow[] {
  const rows = mutableSessionMediaAssetRows(tables);
  const now = nowIso();
  const incoming = [...body.photos, ...(body.video ? [body.video] : [])];
  for (const asset of incoming) {
    assertMediaObjectUsable(
      findMediaObject(tables, asset.mediaObjectId),
      authUserId,
      isAdmin,
      asset.kind === 'video' ? 'VIDEO' : 'IMAGE',
    );
    if (asset.thumbnailMediaObjectId) {
      assertMediaObjectUsable(
        findMediaObject(tables, asset.thumbnailMediaObjectId),
        authUserId,
        isAdmin,
        'IMAGE',
      );
    }
  }
  const keepMediaObjectIds = new Set(incoming.map((asset) => asset.mediaObjectId));
  for (const existing of rows) {
    if (
      asString(existing.sessionId) === body.sessionId &&
      asString(existing.athleteId) === body.athleteId &&
      !asString(existing.deletedAt) &&
      !keepMediaObjectIds.has(asString(existing.mediaObjectId) ?? '')
    ) {
      existing.deletedAt = now;
      existing.deletedByUserId = authUserId;
      existing.updatedByUserId = authUserId;
      existing.updatedAt = now;
    }
  }
  for (const asset of incoming) {
    const existing = rows.find(
      (row) =>
        asString(row.sessionId) === body.sessionId &&
        asString(row.athleteId) === body.athleteId &&
        asString(row.mediaObjectId) === asset.mediaObjectId,
    );
    const next = {
      sessionId: body.sessionId,
      athleteId: body.athleteId,
      coachUserId: body.coachId,
      kind: asset.kind,
      mediaObjectId: asset.mediaObjectId,
      thumbnailMediaObjectId: asset.thumbnailMediaObjectId ?? null,
      widthPx: asset.width ?? null,
      heightPx: asset.height ?? null,
      durationMs: inputDurationMs(asset),
      capturedAt: asset.capturedAt,
      updatedByUserId: authUserId,
      updatedAt: now,
      deletedAt: null,
      deletedByUserId: null,
    };
    if (existing) {
      Object.assign(existing, next);
    } else {
      rows.push({
        id: asset.id ?? newId('sma'),
        ...next,
        createdByUserId: authUserId,
        createdAt: now,
      });
    }
  }
  return activeSessionMediaRows(tables).filter(
    (row) =>
      asString(row.sessionId) === body.sessionId && asString(row.athleteId) === body.athleteId,
  );
}

async function saveSessionMedia(body: SessionMediaSaveBody, authUserId: string, isAdmin: boolean) {
  if (getApiDataBackend() === 'db') {
    if (shouldUseDbFixtureFallback()) {
      const store = getDbFixtureStore();
      const rows = upsertSeedSessionMedia(store.tables, body, authUserId, isAdmin);
      return {
        media: buildSessionMediaPayload(rows, store.tables),
        seedVersion: store.version,
      };
    }
    const prisma = getPrismaClientOrThrow();
    const incoming = [...body.photos, ...(body.video ? [body.video] : [])];
    const mediaObjectIds = incoming
      .flatMap((asset) => [asset.mediaObjectId, asset.thumbnailMediaObjectId])
      .filter((id): id is string => Boolean(id));
    const mediaObjects = mediaObjectIds.length
      ? await prisma.mediaObject.findMany({
          where: {
            id: {
              in: Array.from(new Set(mediaObjectIds)),
            },
            deletedAt: null,
          },
        })
      : [];
    const mediaById = new Map(
      (normalizeForJson(mediaObjects) as SeedRow[]).map((row) => [asString(row.id) ?? '', row]),
    );
    for (const asset of incoming) {
      assertMediaObjectUsable(
        mediaById.get(asset.mediaObjectId) ?? null,
        authUserId,
        isAdmin,
        asset.kind === 'video' ? 'VIDEO' : 'IMAGE',
      );
      if (asset.thumbnailMediaObjectId) {
        assertMediaObjectUsable(
          mediaById.get(asset.thumbnailMediaObjectId) ?? null,
          authUserId,
          isAdmin,
          'IMAGE',
        );
      }
    }
    const keepMediaObjectIds = incoming.map((asset) => asset.mediaObjectId);
    await prisma.$transaction(async (tx) => {
      await tx.sessionMediaAsset.updateMany({
        where: {
          sessionId: body.sessionId,
          athleteId: body.athleteId,
          deletedAt: null,
          ...(keepMediaObjectIds.length
            ? {
                mediaObjectId: {
                  notIn: keepMediaObjectIds,
                },
              }
            : {}),
        },
        data: {
          deletedAt: new Date(),
          deletedByUserId: authUserId,
          updatedByUserId: authUserId,
        },
      });
      for (const asset of incoming) {
        const existing = await tx.sessionMediaAsset.findFirst({
          where: {
            sessionId: body.sessionId,
            athleteId: body.athleteId,
            mediaObjectId: asset.mediaObjectId,
          },
        });
        const data = {
          sessionId: body.sessionId,
          athleteId: body.athleteId,
          coachUserId: body.coachId,
          kind: asset.kind,
          mediaObjectId: asset.mediaObjectId,
          thumbnailMediaObjectId: asset.thumbnailMediaObjectId ?? null,
          widthPx: asset.width ?? null,
          heightPx: asset.height ?? null,
          durationMs: inputDurationMs(asset),
          capturedAt: new Date(asset.capturedAt),
          updatedByUserId: authUserId,
          deletedAt: null,
          deletedByUserId: null,
        };
        if (existing) {
          await tx.sessionMediaAsset.update({
            where: {
              id: existing.id,
            },
            data,
          });
        } else {
          await tx.sessionMediaAsset.create({
            data: {
              id: asset.id ?? newId('sma'),
              ...data,
              createdByUserId: authUserId,
            },
          });
        }
      }
    });
    const result = await listSessionMediaRowsBySession(body.sessionId, body.athleteId);
    return {
      media: buildSessionMediaPayload(result.rows, result.tables),
      seedVersion: null,
    };
  }

  const store = getMarketplaceSeedStore();
  const rows = upsertSeedSessionMedia(store.tables, body, authUserId, isAdmin);
  return {
    media: buildSessionMediaPayload(rows, store.tables),
    seedVersion: store.version,
  };
}

async function findSessionMediaAsset(assetId: string): Promise<SeedRow> {
  if (getApiDataBackend() === 'db') {
    if (shouldUseDbFixtureFallback()) {
      const store = getDbFixtureStore();
      const row = activeSessionMediaRows(store.tables).find(
        (asset) => asString(asset.id) === assetId,
      );
      if (!row) {
        throw notFound('Session media asset not found');
      }
      return row;
    }
    const prisma = getPrismaClientOrThrow();
    const row = await prisma.sessionMediaAsset.findFirst({
      where: {
        id: assetId,
        deletedAt: null,
      },
    });
    if (!row) {
      throw notFound('Session media asset not found');
    }
    return normalizeForJson(row) as SeedRow;
  }

  const store = getMarketplaceSeedStore();
  const row = activeSessionMediaRows(store.tables).find((asset) => asString(asset.id) === assetId);
  if (!row) {
    throw notFound('Session media asset not found');
  }
  return row;
}

async function removeSessionMediaAsset(assetId: string, authUserId: string) {
  if (getApiDataBackend() === 'db') {
    if (shouldUseDbFixtureFallback()) {
      const store = getDbFixtureStore();
      const row = activeSessionMediaRows(store.tables).find(
        (asset) => asString(asset.id) === assetId,
      );
      if (!row) {
        throw notFound('Session media asset not found');
      }
      const now = nowIso();
      row.deletedAt = now;
      row.deletedByUserId = authUserId;
      row.updatedByUserId = authUserId;
      row.updatedAt = now;
      const rows = activeSessionMediaRows(store.tables).filter(
        (asset) =>
          asString(asset.sessionId) === asString(row.sessionId) &&
          asString(asset.athleteId) === asString(row.athleteId),
      );
      return {
        removed: row,
        media: buildSessionMediaPayload(rows, store.tables),
        seedVersion: store.version,
      };
    }
    const prisma = getPrismaClientOrThrow();
    const row = await prisma.sessionMediaAsset.findFirst({
      where: {
        id: assetId,
        deletedAt: null,
      },
    });
    if (!row) {
      throw notFound('Session media asset not found');
    }
    await prisma.sessionMediaAsset.update({
      where: {
        id: row.id,
      },
      data: {
        deletedAt: new Date(),
        deletedByUserId: authUserId,
        updatedByUserId: authUserId,
      },
    });
    const result = await listSessionMediaRowsBySession(row.sessionId, row.athleteId);
    return {
      removed: normalizeForJson(row) as SeedRow,
      media: buildSessionMediaPayload(result.rows, result.tables),
      seedVersion: null,
    };
  }

  const store = getMarketplaceSeedStore();
  const row = activeSessionMediaRows(store.tables).find((asset) => asString(asset.id) === assetId);
  if (!row) {
    throw notFound('Session media asset not found');
  }
  const now = nowIso();
  row.deletedAt = now;
  row.deletedByUserId = authUserId;
  row.updatedByUserId = authUserId;
  row.updatedAt = now;
  const rows = activeSessionMediaRows(store.tables).filter(
    (asset) =>
      asString(asset.sessionId) === asString(row.sessionId) &&
      asString(asset.athleteId) === asString(row.athleteId),
  );
  return {
    removed: row,
    media: buildSessionMediaPayload(rows, store.tables),
    seedVersion: store.version,
  };
}

const PRACTICE_LOG_IDEMPOTENCY_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function practiceLogEndpointKey(athleteId: string): string {
  return `POST:/v1/athletes/${athleteId}/practice-logs`;
}

function practiceLogRequestHash(
  athleteId: string,
  body: PracticeLogCreateRequest,
): string {
  return crypto
    .createHash('sha256')
    .update(
      JSON.stringify({
        athleteId,
        minutes: body.minutes,
        note: body.note ?? null,
        dateKey: body.dateKey ?? null,
      }),
    )
    .digest('hex');
}

function dateKeyForTimeZone(date: Date, timeZone: string): string {
  try {
    const values = Object.fromEntries(
      new Intl.DateTimeFormat('en-GB', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      })
        .formatToParts(date)
        .filter((part) => part.type === 'year' || part.type === 'month' || part.type === 'day')
        .map((part) => [part.type, part.value]),
    );
    if (!values.year || !values.month || !values.day) {
      throw new RangeError('Missing date part');
    }
    return `${values.year}-${values.month}-${values.day}`;
  } catch {
    throw serviceUnavailable('Stored user time zone is invalid');
  }
}

async function resolvePracticeLogTimeZone(actorUserId: string): Promise<string> {
  const store = mutablePracticeLogStore();
  if (store) {
    const user = asRows(store.tables.users).find((row) => asString(row.id) === actorUserId);
    if (!user) {
      throw serviceUnavailable('Authenticated user profile is unavailable');
    }
    const timeZone = asString(user.timeZone) ?? 'UTC';
    dateKeyForTimeZone(new Date(), timeZone);
    return timeZone;
  }

  const prisma = getPrismaClientOrThrow();
  const user = await prisma.user.findUnique({
    where: { id: actorUserId },
    select: { timeZone: true },
  });
  if (!user) {
    throw serviceUnavailable('Authenticated user profile is unavailable');
  }
  const timeZone = user.timeZone ?? 'UTC';
  dateKeyForTimeZone(new Date(), timeZone);
  return timeZone;
}

async function resolvePracticeLogSubjectUserId(
  athleteId: string,
): Promise<string | undefined> {
  const store = mutablePracticeLogStore();
  if (store) {
    const athlete = asRows(store.tables.athletes).find(
      (row) => asString(row.id) === athleteId,
    );
    return asString(athlete?.userId);
  }

  const prisma = getPrismaClientOrThrow();
  const athlete = await prisma.athlete.findUnique({
    where: { id: athleteId },
    select: { userId: true },
  });
  return athlete?.userId ?? undefined;
}

function mutablePracticeLogStore() {
  if (getApiDataBackend() === 'db') {
    return shouldUseDbFixtureFallback() ? getDbFixtureStore() : null;
  }
  return getMarketplaceSeedStore();
}

function seedPracticeLogRows(tables: Record<string, unknown>): SeedRow[] {
  if (!Array.isArray(tables.practiceLogs)) {
    tables.practiceLogs = [];
  }
  return asRows(tables.practiceLogs);
}

function mapPracticeLogRow(row: unknown) {
  const normalized = normalizeForJson(row) as SeedRow;
  return practiceLogEntrySchema.parse({
    id: normalized.id,
    athleteId: normalized.athleteId,
    authorUserId: normalized.authorUserId,
    dateKey: normalized.dateKey,
    minutes: normalized.minutes,
    note: asString(normalized.note) ?? null,
    createdAt: normalized.createdAt,
    updatedAt: normalized.updatedAt,
  });
}

async function listPracticeLogsPayload(athleteId: string, options: PracticeLogListQuery) {
  const store = mutablePracticeLogStore();
  if (store) {
    const matchingRows = seedPracticeLogRows(store.tables as Record<string, unknown>).filter(
      (row) => {
        if (asString(row.athleteId) !== athleteId || asString(row.deletedAt)) {
          return false;
        }
        return options.since ? (asString(row.dateKey) ?? '') >= options.since : true;
      },
    );
    const rows = matchingRows
      .sort((left, right) => {
        const dateCompare = (asString(right.dateKey) ?? '').localeCompare(
          asString(left.dateKey) ?? '',
        );
        if (dateCompare !== 0) {
          return dateCompare;
        }
        return (asString(right.createdAt) ?? '').localeCompare(asString(left.createdAt) ?? '');
      })
      .slice(0, options.limit)
      .map(mapPracticeLogRow);
    return { logs: rows, total: matchingRows.length, seedVersion: store.version };
  }

  const prisma = getPrismaClientOrThrow();
  const where = {
    athleteId,
    deletedAt: null,
    ...(options.since ? { dateKey: { gte: options.since } } : {}),
  };
  const [rows, total] = await Promise.all([
    prisma.practiceLog.findMany({
      where,
      orderBy: [{ dateKey: 'desc' }, { createdAt: 'desc' }],
      take: options.limit,
    }),
    prisma.practiceLog.count({ where }),
  ]);
  return { logs: rows.map(mapPracticeLogRow), total, seedVersion: null };
}

async function getTodayPracticeLogPayload(
  athleteId: string,
  actorUserId: string,
  timeZone: string,
) {
  const dateKey = dateKeyForTimeZone(new Date(), timeZone);
  const store = mutablePracticeLogStore();
  if (store) {
    const row = seedPracticeLogRows(store.tables as Record<string, unknown>).find(
      (entry) =>
        asString(entry.athleteId) === athleteId &&
        asString(entry.authorUserId) === actorUserId &&
        asString(entry.dateKey) === dateKey &&
        !asString(entry.deletedAt),
    );
    return {
      log: row ? mapPracticeLogRow(row) : null,
      dateKey,
      timeZone,
      seedVersion: store.version,
    };
  }

  const prisma = getPrismaClientOrThrow();
  const row = await prisma.practiceLog.findUnique({
    where: {
      athleteId_authorUserId_dateKey: { athleteId, authorUserId: actorUserId, dateKey },
    },
  });
  return {
    log: row && !row.deletedAt ? mapPracticeLogRow(row) : null,
    dateKey,
    timeZone,
    seedVersion: null,
  };
}

function replayPracticeLogMutation(params: {
  entry: { requestHash: string; responseBodyJson: unknown };
  requestHash: string;
  requestId: string;
}): PracticeLogMutationResponse {
  if (params.entry.requestHash !== params.requestHash) {
    throw conflict('Idempotency key was already used with a different practice log payload');
  }
  const parsed = practiceLogMutationResponseSchema.safeParse(params.entry.responseBodyJson);
  if (!parsed.success) {
    throw conflict('Stored practice log idempotency response is no longer valid');
  }
  return {
    ...parsed.data,
    replayed: true,
    requestId: params.requestId,
  };
}

async function upsertPracticeLogPayload(
  athleteId: string,
  actorUserId: string,
  body: PracticeLogCreateRequest,
  requestId: string,
  timeZone: string,
): Promise<{ response: PracticeLogMutationResponse; statusCode: 200 | 201 }> {
  const dateKey = body.dateKey ?? dateKeyForTimeZone(new Date(), timeZone);
  const today = dateKeyForTimeZone(new Date(), timeZone);
  if (dateKey > today) {
    throw badRequest('Practice date cannot be in the future');
  }
  const note = body.note ?? null;
  const endpointKey = practiceLogEndpointKey(athleteId);
  const requestHash = practiceLogRequestHash(athleteId, body);
  const now = new Date();
  const store = mutablePracticeLogStore();
  if (store) {
    const tables = store.tables as Record<string, unknown>;
    const idempotencyRows = Array.isArray(tables.idempotencyKeys)
      ? asRows(tables.idempotencyKeys)
      : ((tables.idempotencyKeys = []) as SeedRow[]);
    const replay = idempotencyRows.find(
      (row) =>
        asString(row.userId) === actorUserId &&
        asString(row.endpointKey) === endpointKey &&
        asString(row.idempotencyKey) === body.idempotencyKey,
    );
    if (replay) {
      return {
        response: replayPracticeLogMutation({
          entry: {
            requestHash: asString(replay.requestHash) ?? '',
            responseBodyJson: replay.responseBodyJson,
          },
          requestHash,
          requestId,
        }),
        statusCode: 200,
      };
    }

    const rows = seedPracticeLogRows(tables);
    const existing = rows.find(
      (row) =>
        asString(row.athleteId) === athleteId &&
        asString(row.authorUserId) === actorUserId &&
        asString(row.dateKey) === dateKey,
    );
    const active = existing && !asString(existing.deletedAt);
    const totalMinutes = (active ? asNumber(existing.minutes) ?? 0 : 0) + body.minutes;
    if (totalMinutes > 24 * 60) {
      throw conflict('Practice minutes cannot exceed 1,440 for one day');
    }
    let log: ReturnType<typeof mapPracticeLogRow>;
    if (existing) {
      existing.minutes = totalMinutes;
      if (!active || body.note !== undefined) {
        existing.note = note;
      }
      existing.updatedByUserId = actorUserId;
      existing.updatedAt = now.toISOString();
      existing.version = (asNumber(existing.version) ?? 0) + 1;
      existing.deletedAt = null;
      existing.deletedByUserId = null;
      log = mapPracticeLogRow(existing);
    } else {
      const created = {
        id: newId('plog'),
        athleteId,
        authorUserId: actorUserId,
        dateKey,
        minutes: body.minutes,
        note,
        createdByUserId: actorUserId,
        updatedByUserId: actorUserId,
        version: 1,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        deletedAt: null,
        deletedByUserId: null,
      };
      rows.unshift(created);
      log = mapPracticeLogRow(created);
    }
    const response = practiceLogMutationResponseSchema.parse({
      athleteId,
      log,
      addedMinutes: body.minutes,
      created: !active,
      replayed: false,
      timeZone,
      seedVersion: store.version,
      requestId,
    });
    idempotencyRows.push({
      id: newId('idk'),
      userId: actorUserId,
      endpointKey,
      idempotencyKey: body.idempotencyKey,
      requestHash,
      responseStatus: response.created ? 201 : 200,
      responseBodyJson: response,
      createdAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + PRACTICE_LOG_IDEMPOTENCY_TTL_MS).toISOString(),
    });
    return { response, statusCode: response.created ? 201 : 200 };
  }

  const prisma = getPrismaClientOrThrow();
  try {
    return await prisma.$transaction(async (tx) => {
      await tx.$queryRaw(
        Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${`${athleteId}:${actorUserId}:${dateKey}`}, 0))::text AS lock_result`,
      );
      const storedReplay = await tx.idempotencyKey.findUnique({
        where: {
          userId_endpointKey_idempotencyKey: {
            userId: actorUserId,
            endpointKey,
            idempotencyKey: body.idempotencyKey,
          },
        },
      });
      if (storedReplay) {
        return {
          response: replayPracticeLogMutation({
            entry: storedReplay,
            requestHash,
            requestId,
          }),
          statusCode: 200 as const,
        };
      }

      const existing = await tx.practiceLog.findUnique({
        where: {
          athleteId_authorUserId_dateKey: { athleteId, authorUserId: actorUserId, dateKey },
        },
      });
      const active = existing && !existing.deletedAt;
      const totalMinutes = (active ? existing.minutes : 0) + body.minutes;
      if (totalMinutes > 24 * 60) {
        throw conflict('Practice minutes cannot exceed 1,440 for one day');
      }
      const persisted = existing
        ? await tx.practiceLog.update({
            where: { id: existing.id },
            data: {
              minutes: totalMinutes,
              ...(!active || body.note !== undefined ? { note } : {}),
              deletedAt: null,
              deletedByUserId: null,
              updatedByUserId: actorUserId,
              version: { increment: 1 },
            },
          })
        : await tx.practiceLog.create({
            data: {
              id: newId('plog'),
              athleteId,
              authorUserId: actorUserId,
              dateKey,
              minutes: body.minutes,
              note,
              createdByUserId: actorUserId,
              updatedByUserId: actorUserId,
            },
          });
      const response = practiceLogMutationResponseSchema.parse({
        athleteId,
        log: mapPracticeLogRow(persisted),
        addedMinutes: body.minutes,
        created: !active,
        replayed: false,
        timeZone,
        seedVersion: null,
        requestId,
      });
      await tx.idempotencyKey.create({
        data: {
          id: newId('idk'),
          userId: actorUserId,
          endpointKey,
          idempotencyKey: body.idempotencyKey,
          requestHash,
          responseStatus: response.created ? 201 : 200,
          responseBodyJson: response as never,
          expiresAt: new Date(now.getTime() + PRACTICE_LOG_IDEMPOTENCY_TTL_MS),
        },
      });
      return { response, statusCode: response.created ? (201 as const) : (200 as const) };
    }, API_DB_TRANSACTION_OPTIONS);
  } catch (error) {
    if ((error as { code?: unknown }).code !== 'P2002') {
      throw error;
    }
    const storedReplay = await prisma.idempotencyKey.findUnique({
      where: {
        userId_endpointKey_idempotencyKey: {
          userId: actorUserId,
          endpointKey,
          idempotencyKey: body.idempotencyKey,
        },
      },
    });
    if (!storedReplay) {
      throw error;
    }
    return {
      response: replayPracticeLogMutation({ entry: storedReplay, requestHash, requestId }),
      statusCode: 200,
    };
  }
}

function mutableProgressChallengeStore() {
  if (getApiDataBackend() === 'db') {
    return shouldUseDbFixtureFallback() ? getDbFixtureStore() : null;
  }
  return getMarketplaceSeedStore();
}

function seedProgressChallengeRows(tables: Record<string, unknown>): SeedRow[] {
  if (!Array.isArray(tables.progressChallenges)) {
    tables.progressChallenges = [];
  }
  return asRows(tables.progressChallenges);
}

function mapProgressChallengeRow(row: SeedRow) {
  return {
    id: asString(row.id) ?? '',
    athleteId: asString(row.athleteId) ?? '',
    type: asString(row.type) ?? 'attendance',
    title: asString(row.title) ?? '',
    description: asString(row.description) ?? '',
    targetValue: asNumber(row.targetValue) ?? 0,
    currentValue: asNumber(row.currentValue) ?? 0,
    progress: asNumber(row.progress) ?? 0,
    rewardBadgeId: asString(row.rewardBadgeId) ?? '',
    rewardLabel: asString(row.rewardLabel) ?? '',
    status: asString(row.status) ?? 'active',
    assignedAt: asString(row.assignedAt) ?? nowIso(),
    expiresAt: asString(row.expiresAt) ?? nowIso(),
    completedAt: asString(row.completedAt) ?? undefined,
  };
}

function progressChallengeSortTime(row: SeedRow): number {
  const timestamp = Date.parse(asString(row.completedAt) ?? asString(row.assignedAt) ?? '');
  return Number.isFinite(timestamp) ? timestamp : 0;
}

async function getActiveProgressChallengePayload(athleteId: string) {
  const store = mutableProgressChallengeStore();
  if (store) {
    const challenge =
      seedProgressChallengeRows(store.tables as Record<string, unknown>)
        .filter(
          (row) =>
            asString(row.athleteId) === athleteId &&
            asString(row.status) === 'active' &&
            !asString(row.deletedAt),
        )
        .sort((left, right) => progressChallengeSortTime(right) - progressChallengeSortTime(left))
        .map(mapProgressChallengeRow)[0] ?? null;
    return { challenge, seedVersion: store.version };
  }

  const prisma = getPrismaClientOrThrow();
  const challenge = await prisma.progressChallenge.findFirst({
    where: {
      athleteId,
      status: 'active',
      deletedAt: null,
    },
    orderBy: {
      assignedAt: 'desc',
    },
  });
  return normalizeForJson({ challenge, seedVersion: null });
}

async function listProgressChallengeHistoryPayload(athleteId: string) {
  const store = mutableProgressChallengeStore();
  if (store) {
    const challenges = seedProgressChallengeRows(store.tables as Record<string, unknown>)
      .filter((row) => {
        const status = asString(row.status);
        return (
          asString(row.athleteId) === athleteId &&
          (status === 'completed' || status === 'expired') &&
          !asString(row.deletedAt)
        );
      })
      .sort((left, right) => progressChallengeSortTime(right) - progressChallengeSortTime(left))
      .map(mapProgressChallengeRow);
    return { challenges, seedVersion: store.version };
  }

  const prisma = getPrismaClientOrThrow();
  const challenges = await prisma.progressChallenge.findMany({
    where: {
      athleteId,
      status: {
        in: ['completed', 'expired'],
      },
      deletedAt: null,
    },
    orderBy: [{ completedAt: 'desc' }, { assignedAt: 'desc' }],
  });
  return normalizeForJson({ challenges, seedVersion: null });
}

async function getProgressChallengePayloadById(challengeId: string) {
  const store = mutableProgressChallengeStore();
  if (store) {
    const challenge =
      seedProgressChallengeRows(store.tables as Record<string, unknown>)
        .filter((row) => asString(row.id) === challengeId && !asString(row.deletedAt))
        .map(mapProgressChallengeRow)[0] ?? null;
    return { challenge, seedVersion: store.version };
  }

  const prisma = getPrismaClientOrThrow();
  const challenge = await prisma.progressChallenge.findFirst({
    where: {
      id: challengeId,
      deletedAt: null,
    },
  });
  return normalizeForJson({ challenge, seedVersion: null });
}

function parseChallengeDate(value: string, fieldName: string): Date {
  const date = parseOptionalDate(value);
  if (!date) {
    throw badRequest(`Invalid ${fieldName}`);
  }
  return date;
}

function upsertSeedProgressChallenge(
  tables: Record<string, unknown>,
  athleteId: string,
  challengeId: string,
  actorUserId: string,
  body: ProgressChallengeBody,
): SeedRow {
  const rows = seedProgressChallengeRows(tables);
  const now = nowIso();
  const existing = rows.find((row) => asString(row.id) === challengeId && !asString(row.deletedAt));
  if (existing && asString(existing.athleteId) !== athleteId) {
    throw forbidden('Progress challenge does not belong to athlete');
  }

  if (body.status === 'active') {
    for (const row of rows) {
      if (
        asString(row.athleteId) === athleteId &&
        asString(row.id) !== challengeId &&
        asString(row.status) === 'active' &&
        !asString(row.deletedAt)
      ) {
        row.status = 'expired';
        row.updatedByUserId = actorUserId;
        row.updatedAt = now;
        row.version = (asNumber(row.version) ?? 0) + 1;
      }
    }
  }

  if (existing) {
    Object.assign(existing, {
      ...body,
      completedAt: body.completedAt ?? null,
      updatedByUserId: actorUserId,
      updatedAt: now,
      version: (asNumber(existing.version) ?? 0) + 1,
    });
    return existing;
  }

  const created = {
    id: challengeId,
    athleteId,
    ...body,
    completedAt: body.completedAt ?? null,
    createdByUserId: actorUserId,
    updatedByUserId: actorUserId,
    version: 1,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    deletedByUserId: null,
  };
  rows.unshift(created);
  return created;
}

async function upsertProgressChallengePayload(
  athleteId: string,
  challengeId: string,
  actorUserId: string,
  body: ProgressChallengeBody,
) {
  const store = mutableProgressChallengeStore();
  if (store) {
    const challenge = upsertSeedProgressChallenge(
      store.tables as Record<string, unknown>,
      athleteId,
      challengeId,
      actorUserId,
      body,
    );
    return { challenge: mapProgressChallengeRow(challenge), seedVersion: store.version };
  }

  const prisma = getPrismaClientOrThrow();
  const challenge = await prisma.$transaction(async (tx) => {
    const existing = await tx.progressChallenge.findFirst({
      where: {
        id: challengeId,
        deletedAt: null,
      },
    });
    if (existing && existing.athleteId !== athleteId) {
      throw forbidden('Progress challenge does not belong to athlete');
    }

    if (body.status === 'active') {
      await tx.progressChallenge.updateMany({
        where: {
          athleteId,
          id: {
            not: challengeId,
          },
          status: 'active',
          deletedAt: null,
        },
        data: {
          status: 'expired',
          updatedByUserId: actorUserId,
          version: {
            increment: 1,
          },
        },
      });
    }

    const data = {
      type: body.type,
      title: body.title,
      description: body.description,
      targetValue: body.targetValue,
      currentValue: body.currentValue,
      progress: body.progress,
      rewardBadgeId: body.rewardBadgeId,
      rewardLabel: body.rewardLabel,
      status: body.status,
      assignedAt: parseChallengeDate(body.assignedAt, 'assignedAt'),
      expiresAt: parseChallengeDate(body.expiresAt, 'expiresAt'),
      completedAt: body.completedAt ? parseChallengeDate(body.completedAt, 'completedAt') : null,
      updatedByUserId: actorUserId,
    };

    return existing
      ? tx.progressChallenge.update({
          where: {
            id: challengeId,
          },
          data: {
            ...data,
            deletedAt: null,
            deletedByUserId: null,
            version: {
              increment: 1,
            },
          },
        })
      : tx.progressChallenge.create({
          data: {
            id: challengeId,
            athleteId,
            ...data,
            createdByUserId: actorUserId,
          },
        });
  });
  return normalizeForJson({ challenge, seedVersion: null });
}

interface SelfAssessmentBookingContext {
  bookingId: string;
  coachUserId: string;
  athleteName: string;
  scheduledAt: string;
  durationMinutes: number;
}

function mutableSelfAssessmentStore() {
  if (getApiDataBackend() === 'db') {
    return shouldUseDbFixtureFallback() ? getDbFixtureStore() : null;
  }
  return getMarketplaceSeedStore();
}

function seedSelfAssessmentPromptRows(tables: Record<string, unknown>): SeedRow[] {
  if (!Array.isArray(tables.selfAssessmentPrompts)) {
    tables.selfAssessmentPrompts = [];
  }
  return asRows(tables.selfAssessmentPrompts);
}

function seedSelfAssessmentEntryRows(tables: Record<string, unknown>): SeedRow[] {
  if (!Array.isArray(tables.selfAssessmentEntries)) {
    tables.selfAssessmentEntries = [];
  }
  return asRows(tables.selfAssessmentEntries);
}

function mapSelfAssessmentPromptRow(row: SeedRow) {
  const status = asString(row.status) === 'completed' ? 'completed' : 'pending';
  return {
    id: asString(row.id) ?? '',
    athleteId: asString(row.athleteId) ?? '',
    athleteName: asString(row.athleteName) ?? 'Athlete',
    coachId: asString(row.coachUserId) ?? asString(row.coachId) ?? '',
    bookingId: asString(row.bookingId) ?? '',
    sessionId: asString(row.sessionId) ?? asString(row.bookingId) ?? '',
    createdAt: asString(row.createdAt) ?? nowIso(),
    dueAt: asString(row.dueAt) ?? nowIso(),
    status,
    completedAt: asString(row.completedAt) ?? undefined,
    notificationSentAt: asString(row.notificationSentAt) ?? undefined,
  };
}

function mapSelfAssessmentEntryRow(row: SeedRow) {
  return {
    id: asString(row.id) ?? '',
    athleteId: asString(row.athleteId) ?? '',
    coachId: asString(row.coachUserId) ?? asString(row.coachId) ?? '',
    bookingId: asString(row.bookingId) ?? '',
    sessionId: asString(row.sessionId) ?? asString(row.bookingId) ?? '',
    mood: asNumber(row.mood) ?? 3,
    energyLevel: asNumber(row.energyLevel) ?? 3,
    confidence: asNumber(row.confidence) ?? 3,
    notes: asString(row.notes) ?? '',
    createdAt: asString(row.createdAt) ?? nowIso(),
    updatedAt: asString(row.updatedAt) ?? undefined,
  };
}

function clampSelfAssessmentRating(value: number): number {
  if (!Number.isFinite(value)) {
    return 3;
  }
  return Math.max(1, Math.min(5, Math.round(value)));
}

function selfAssessmentPromptId(bookingId: string, athleteId: string): string {
  return `sap_${bookingId}_${athleteId}`;
}

function selfAssessmentDueAt(context: SelfAssessmentBookingContext): string {
  const scheduledAt = new Date(context.scheduledAt).getTime();
  const durationMs = Math.max(1, context.durationMinutes) * 60 * 1000;
  if (!Number.isNaN(scheduledAt)) {
    return new Date(scheduledAt + durationMs + 60 * 60 * 1000).toISOString();
  }
  return new Date(Date.now() + 60 * 60 * 1000).toISOString();
}

function seedAthleteName(tables: Record<string, unknown>, athleteId: string): string {
  const athlete = asRows(tables.athletes).find((row) => asString(row.id) === athleteId);
  const fullName = [asString(athlete?.firstName), asString(athlete?.lastName)]
    .filter(Boolean)
    .join(' ');
  return asString(athlete?.displayName) ?? (fullName || 'Athlete');
}

function completedSeedSelfAssessmentContexts(
  tables: Record<string, unknown>,
  athleteId: string,
): SelfAssessmentBookingContext[] {
  const bookingIds = new Set(
    asRows(tables.bookingParticipants)
      .filter((row) => asString(row.athleteId) === athleteId && !asString(row.deletedAt))
      .map((row) => asString(row.bookingId))
      .filter((bookingId): bookingId is string => Boolean(bookingId)),
  );
  const athleteName = seedAthleteName(tables, athleteId);
  return asRows(tables.bookings)
    .filter((row) => {
      const bookingId = asString(row.id);
      return (
        Boolean(bookingId) &&
        bookingIds.has(bookingId ?? '') &&
        asString(row.status) === 'COMPLETED' &&
        !asString(row.deletedAt) &&
        Boolean(asString(row.coachUserId))
      );
    })
    .map((row) => ({
      bookingId: asString(row.id) ?? '',
      coachUserId: asString(row.coachUserId) ?? '',
      athleteName,
      scheduledAt: asString(row.scheduledAt) ?? nowIso(),
      durationMinutes: asNumber(row.durationMinutes) ?? 60,
    }));
}

async function completedDbSelfAssessmentContexts(
  athleteId: string,
): Promise<SelfAssessmentBookingContext[]> {
  const prisma = getPrismaClientOrThrow();
  const [athlete, bookings] = await Promise.all([
    prisma.athlete.findFirst({
      where: { id: athleteId, deletedAt: null },
      select: { displayName: true, firstName: true, lastName: true },
    }),
    prisma.booking.findMany({
      where: {
        status: 'COMPLETED',
        deletedAt: null,
        participants: {
          some: {
            athleteId,
            deletedAt: null,
          },
        },
      },
      select: {
        id: true,
        coachUserId: true,
        scheduledAt: true,
        durationMinutes: true,
      },
      orderBy: { scheduledAt: 'desc' },
    }),
  ]);
  const athleteName =
    athlete?.displayName ??
    [athlete?.firstName, athlete?.lastName].filter(Boolean).join(' ') ??
    'Athlete';

  return bookings.map((booking) => ({
    bookingId: booking.id,
    coachUserId: booking.coachUserId,
    athleteName,
    scheduledAt: booking.scheduledAt.toISOString(),
    durationMinutes: booking.durationMinutes,
  }));
}

async function completedSelfAssessmentContexts(
  athleteId: string,
): Promise<{ contexts: SelfAssessmentBookingContext[]; seedVersion: string | null }> {
  const store = mutableSelfAssessmentStore();
  if (store) {
    return {
      contexts: completedSeedSelfAssessmentContexts(
        store.tables as Record<string, unknown>,
        athleteId,
      ),
      seedVersion: store.version,
    };
  }
  return {
    contexts: await completedDbSelfAssessmentContexts(athleteId),
    seedVersion: null,
  };
}

async function requireCompletedSelfAssessmentContext(
  athleteId: string,
  bookingId: string,
): Promise<SelfAssessmentBookingContext> {
  const { contexts } = await completedSelfAssessmentContexts(athleteId);
  const context = contexts.find((candidate) => candidate.bookingId === bookingId);
  if (!context) {
    throw badRequest('Self-assessment requires a completed booking for this athlete');
  }
  return context;
}

async function ensureSelfAssessmentPromptsForAthlete(athleteId: string) {
  const store = mutableSelfAssessmentStore();
  if (store) {
    const tables = store.tables as Record<string, unknown>;
    const prompts = seedSelfAssessmentPromptRows(tables);
    const contexts = completedSeedSelfAssessmentContexts(tables, athleteId);
    const now = nowIso();
    for (const context of contexts) {
      const existing = prompts.find(
        (row) =>
          asString(row.athleteId) === athleteId &&
          asString(row.bookingId) === context.bookingId &&
          !asString(row.deletedAt),
      );
      if (existing) {
        existing.athleteName = context.athleteName;
        existing.coachUserId = context.coachUserId;
        existing.dueAt = selfAssessmentDueAt(context);
        existing.updatedAt = now;
        continue;
      }
      prompts.push({
        id: selfAssessmentPromptId(context.bookingId, athleteId),
        athleteId,
        athleteName: context.athleteName,
        coachUserId: context.coachUserId,
        bookingId: context.bookingId,
        sessionId: context.bookingId,
        dueAt: selfAssessmentDueAt(context),
        status: 'pending',
        notificationSentAt: null,
        completedAt: null,
        createdByUserId: context.coachUserId,
        updatedByUserId: context.coachUserId,
        version: 1,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
        deletedByUserId: null,
      });
    }
    return { seedVersion: store.version };
  }

  const prisma = getPrismaClientOrThrow();
  const contexts = await completedDbSelfAssessmentContexts(athleteId);
  await Promise.all(
    contexts.map((context) =>
      prisma.selfAssessmentPrompt.upsert({
        where: {
          bookingId_athleteId: {
            bookingId: context.bookingId,
            athleteId,
          },
        },
        create: {
          id: selfAssessmentPromptId(context.bookingId, athleteId),
          athleteId,
          athleteName: context.athleteName,
          coachUserId: context.coachUserId,
          bookingId: context.bookingId,
          sessionId: context.bookingId,
          dueAt: new Date(selfAssessmentDueAt(context)),
          status: 'pending',
          createdByUserId: context.coachUserId,
          updatedByUserId: context.coachUserId,
        },
        update: {
          athleteName: context.athleteName,
          coachUserId: context.coachUserId,
          dueAt: new Date(selfAssessmentDueAt(context)),
          deletedAt: null,
          deletedByUserId: null,
          updatedByUserId: context.coachUserId,
          version: { increment: 1 },
        },
      }),
    ),
  );
  return { seedVersion: null };
}

async function listPendingSelfAssessmentPromptsPayload(athleteId: string) {
  const promptState = await ensureSelfAssessmentPromptsForAthlete(athleteId);
  const nowMs = Date.now();
  const store = mutableSelfAssessmentStore();
  if (store) {
    const prompts = seedSelfAssessmentPromptRows(store.tables as Record<string, unknown>)
      .filter((row) => {
        const dueMs = new Date(asString(row.dueAt) ?? '').getTime();
        return (
          asString(row.athleteId) === athleteId &&
          asString(row.status) !== 'completed' &&
          !asString(row.deletedAt) &&
          !Number.isNaN(dueMs) &&
          dueMs <= nowMs
        );
      })
      .sort((left, right) =>
        (asString(right.dueAt) ?? '').localeCompare(asString(left.dueAt) ?? ''),
      )
      .map(mapSelfAssessmentPromptRow);
    return { prompts, seedVersion: promptState.seedVersion };
  }

  const prisma = getPrismaClientOrThrow();
  const rows = await prisma.selfAssessmentPrompt.findMany({
    where: {
      athleteId,
      status: 'pending',
      deletedAt: null,
      dueAt: { lte: new Date() },
    },
    orderBy: { dueAt: 'desc' },
  });
  return {
    prompts: (normalizeForJson(rows) as SeedRow[]).map(mapSelfAssessmentPromptRow),
    seedVersion: null,
  };
}

async function listSelfAssessmentEntriesPayload(
  athleteId: string,
  options: SelfAssessmentListOptions,
) {
  const store = mutableSelfAssessmentStore();
  if (store) {
    const entries = seedSelfAssessmentEntryRows(store.tables as Record<string, unknown>)
      .filter((row) => asString(row.athleteId) === athleteId && !asString(row.deletedAt))
      .sort((left, right) =>
        (asString(right.createdAt) ?? '').localeCompare(asString(left.createdAt) ?? ''),
      )
      .slice(0, options.limit)
      .map(mapSelfAssessmentEntryRow);
    return { entries, total: entries.length, seedVersion: store.version };
  }

  const prisma = getPrismaClientOrThrow();
  const rows = await prisma.selfAssessmentEntry.findMany({
    where: {
      athleteId,
      deletedAt: null,
    },
    orderBy: { createdAt: 'desc' },
    take: options.limit,
  });
  const entries = (normalizeForJson(rows) as SeedRow[]).map(mapSelfAssessmentEntryRow);
  return { entries, total: entries.length, seedVersion: null };
}

function selfAssessmentPromptNotificationPayload(prompt: {
  id: string;
  athleteId: string;
  athleteName: string;
  bookingId?: string | null;
  sessionId?: string | null;
}) {
  return {
    type: 'SELF_ASSESSMENT_PROMPT',
    title: 'Quick Session Check-In',
    body: `How did training feel today, ${prompt.athleteName}?`,
    sourceType: SELF_ASSESSMENT_PROMPT_SOURCE_TYPE,
    sourceId: prompt.id,
    deepLink: '/development/my-progress',
    metadataJson: {
      athleteId: prompt.athleteId,
      bookingId: prompt.bookingId ?? null,
      promptId: prompt.id,
      sessionId: prompt.sessionId ?? null,
    },
  };
}

function seedSelfAssessmentPromptRecipientIds(tables: SeedTables, prompt: SeedRow): string[] {
  const athleteId = asString(prompt.athleteId);
  if (!athleteId) {
    return [];
  }
  const candidateUserIds = new Set<string>();
  const athlete = asRows(tables.athletes).find((row) => asString(row.id) === athleteId);
  const athleteUserId = asString(athlete?.userId);
  if (athleteUserId) {
    candidateUserIds.add(athleteUserId);
  }
  for (const link of asRows(tables.guardianChildLinks)) {
    if (asString(link.athleteId) === athleteId && !asString(link.deletedAt)) {
      const guardianUserId = asString(link.guardianUserId);
      if (guardianUserId) {
        candidateUserIds.add(guardianUserId);
      }
    }
  }
  const activeUserIds = new Set(
    asRows(tables.users)
      .filter(
        (row) => !asString(row.deletedAt) && (asString(row.accountStatus) ?? 'active') === 'active',
      )
      .map((row) => asString(row.id))
      .filter((userId): userId is string => Boolean(userId)),
  );
  return [...candidateUserIds].filter((userId) => activeUserIds.has(userId));
}

function createSeedSelfAssessmentPromptNotifications(
  tables: SeedTables,
  prompt: SeedRow,
  now: string,
): number {
  const recipientUserIds = seedSelfAssessmentPromptRecipientIds(tables, prompt);
  if (recipientUserIds.length === 0) {
    throw serviceUnavailable('Self-assessment prompt has no active notification recipient');
  }
  const payload = selfAssessmentPromptNotificationPayload({
    id: asString(prompt.id) ?? '',
    athleteId: asString(prompt.athleteId) ?? '',
    athleteName: asString(prompt.athleteName) ?? 'Athlete',
    bookingId: asString(prompt.bookingId) ?? null,
    sessionId: asString(prompt.sessionId) ?? null,
  });
  const notifications = mutableRows(tables, 'notifications');
  const existingRecipientIds = new Set(
    notifications
      .filter(
        (row) =>
          asString(row.sourceType) === payload.sourceType &&
          asString(row.sourceId) === payload.sourceId,
      )
      .map((row) => asString(row.userId))
      .filter((userId): userId is string => Boolean(userId)),
  );
  for (const userId of recipientUserIds) {
    if (existingRecipientIds.has(userId)) {
      continue;
    }
    notifications.push({
      id: newId('ntf'),
      userId,
      type: payload.type,
      title: payload.title,
      body: payload.body,
      status: 'UNREAD',
      sourceType: payload.sourceType,
      sourceId: payload.sourceId,
      deepLink: payload.deepLink,
      metadataJson: payload.metadataJson,
      createdAt: now,
      updatedAt: now,
      readAt: null,
      dismissedAt: null,
    });
  }
  return recipientUserIds.length;
}

async function createDbSelfAssessmentPromptNotifications(
  prisma: SelfAssessmentNotificationDbClient,
  prompt: {
    id: string;
    athleteId: string;
    athleteName: string;
    bookingId: string | null;
    sessionId: string | null;
  },
  now: Date,
): Promise<number> {
  const athlete = await prisma.athlete.findFirst({
    where: { id: prompt.athleteId, deletedAt: null },
    select: {
      userId: true,
      guardianLinks: {
        where: { deletedAt: null },
        select: { guardianUserId: true },
      },
    },
  });
  if (!athlete) {
    throw notFound('Athlete not found', { athleteId: prompt.athleteId });
  }

  const candidateUserIds = new Set<string>();
  if (athlete.userId) {
    candidateUserIds.add(athlete.userId);
  }
  for (const link of athlete.guardianLinks) {
    candidateUserIds.add(link.guardianUserId);
  }
  const activeRecipientUserIds = (
    await prisma.user.findMany({
      where: {
        id: { in: [...candidateUserIds] },
        accountStatus: 'active',
        deletedAt: null,
      },
      select: { id: true },
    })
  ).map((user) => user.id);
  if (activeRecipientUserIds.length === 0) {
    throw serviceUnavailable('Self-assessment prompt has no active notification recipient');
  }

  const payload = selfAssessmentPromptNotificationPayload(prompt);
  const existing = await prisma.notification.findMany({
    where: {
      userId: { in: activeRecipientUserIds },
      sourceType: payload.sourceType,
      sourceId: payload.sourceId,
    },
    select: { userId: true },
  });
  const existingUserIds = new Set(existing.map((row) => row.userId));
  const missingUserIds = activeRecipientUserIds.filter((userId) => !existingUserIds.has(userId));
  if (missingUserIds.length > 0) {
    await prisma.notification.createMany({
      data: missingUserIds.map((userId) => ({
        id: newId('ntf'),
        userId,
        type: payload.type,
        title: payload.title,
        body: payload.body,
        sourceType: payload.sourceType,
        sourceId: payload.sourceId,
        deepLink: payload.deepLink,
        metadataJson: payload.metadataJson as never,
        createdAt: now,
        updatedAt: now,
      })),
    });
  }
  return activeRecipientUserIds.length;
}

async function dispatchSelfAssessmentPromptPayload(promptId: string, actorUserId: string) {
  const store = mutableSelfAssessmentStore();
  const now = nowIso();
  if (store) {
    const tables = store.tables as SeedTables;
    const prompt = seedSelfAssessmentPromptRows(tables).find(
      (row) => asString(row.id) === promptId && !asString(row.deletedAt),
    );
    if (!prompt) {
      throw notFound('Self-assessment prompt not found', { promptId });
    }
    createSeedSelfAssessmentPromptNotifications(tables, prompt, now);
    if (!asString(prompt.notificationSentAt)) {
      prompt.notificationSentAt = now;
    }
    prompt.updatedByUserId = actorUserId;
    prompt.updatedAt = now;
    prompt.version = (asNumber(prompt.version) ?? 0) + 1;
    return { prompt: mapSelfAssessmentPromptRow(prompt), seedVersion: store.version };
  }

  const prisma = getPrismaClientOrThrow();
  const updated = await prisma.$transaction(async (tx) => {
    const prompt = await tx.selfAssessmentPrompt.findFirst({
      where: { id: promptId, deletedAt: null },
    });
    if (!prompt) {
      throw notFound('Self-assessment prompt not found', { promptId });
    }
    const sentAt = prompt.notificationSentAt ?? new Date(now);
    await createDbSelfAssessmentPromptNotifications(
      tx,
      {
        id: prompt.id,
        athleteId: prompt.athleteId,
        athleteName: prompt.athleteName,
        bookingId: prompt.bookingId,
        sessionId: prompt.sessionId,
      },
      sentAt,
    );
    return tx.selfAssessmentPrompt.update({
      where: { id: promptId },
      data: {
        notificationSentAt: sentAt,
        updatedByUserId: actorUserId,
        version: { increment: 1 },
      },
    });
  });
  return {
    prompt: mapSelfAssessmentPromptRow(normalizeForJson(updated) as SeedRow),
    seedVersion: null,
  };
}

async function submitSelfAssessmentPayload(actorUserId: string, body: SelfAssessmentSubmitBody) {
  const context = await requireCompletedSelfAssessmentContext(body.athleteId, body.bookingId);
  if (body.coachId && body.coachId !== context.coachUserId) {
    throw badRequest('Coach does not match the completed booking');
  }
  const now = nowIso();
  const notes = body.notes?.trim() ? body.notes.trim() : null;
  const store = mutableSelfAssessmentStore();

  if (store) {
    const tables = store.tables as Record<string, unknown>;
    await ensureSelfAssessmentPromptsForAthlete(body.athleteId);
    const prompts = seedSelfAssessmentPromptRows(tables);
    const prompt = prompts.find(
      (row) =>
        asString(row.athleteId) === body.athleteId &&
        asString(row.bookingId) === body.bookingId &&
        !asString(row.deletedAt),
    );
    if (prompt) {
      prompt.status = 'completed';
      prompt.completedAt = asString(prompt.completedAt) ?? now;
      prompt.updatedAt = now;
      prompt.updatedByUserId = actorUserId;
      prompt.version = (asNumber(prompt.version) ?? 0) + 1;
    }
    const entries = seedSelfAssessmentEntryRows(tables);
    const existing = entries.find(
      (row) =>
        asString(row.athleteId) === body.athleteId &&
        asString(row.bookingId) === body.bookingId &&
        !asString(row.deletedAt),
    );
    if (existing) {
      existing.coachUserId = context.coachUserId;
      existing.sessionId = body.sessionId ?? body.bookingId;
      existing.promptId = asString(prompt?.id) ?? null;
      existing.submittedByUserId = actorUserId;
      existing.mood = clampSelfAssessmentRating(body.mood);
      existing.energyLevel = clampSelfAssessmentRating(body.energyLevel);
      existing.confidence = clampSelfAssessmentRating(body.confidence);
      existing.notes = notes;
      existing.updatedByUserId = actorUserId;
      existing.updatedAt = now;
      existing.version = (asNumber(existing.version) ?? 0) + 1;
      return {
        entry: mapSelfAssessmentEntryRow(existing),
        prompt: prompt ? mapSelfAssessmentPromptRow(prompt) : null,
        seedVersion: store.version,
      };
    }
    const created = {
      id: newId('sae'),
      athleteId: body.athleteId,
      coachUserId: context.coachUserId,
      bookingId: body.bookingId,
      sessionId: body.sessionId ?? body.bookingId,
      promptId: asString(prompt?.id) ?? null,
      submittedByUserId: actorUserId,
      mood: clampSelfAssessmentRating(body.mood),
      energyLevel: clampSelfAssessmentRating(body.energyLevel),
      confidence: clampSelfAssessmentRating(body.confidence),
      notes,
      createdByUserId: actorUserId,
      updatedByUserId: actorUserId,
      version: 1,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      deletedByUserId: null,
    };
    entries.unshift(created);
    return {
      entry: mapSelfAssessmentEntryRow(created),
      prompt: prompt ? mapSelfAssessmentPromptRow(prompt) : null,
      seedVersion: store.version,
    };
  }

  const prisma = getPrismaClientOrThrow();
  const result = await prisma.$transaction(async (tx) => {
    const prompt = await tx.selfAssessmentPrompt.upsert({
      where: {
        bookingId_athleteId: {
          bookingId: body.bookingId,
          athleteId: body.athleteId,
        },
      },
      create: {
        id: selfAssessmentPromptId(body.bookingId, body.athleteId),
        athleteId: body.athleteId,
        athleteName: context.athleteName,
        coachUserId: context.coachUserId,
        bookingId: body.bookingId,
        sessionId: body.sessionId ?? body.bookingId,
        dueAt: new Date(selfAssessmentDueAt(context)),
        status: 'completed',
        completedAt: new Date(now),
        createdByUserId: context.coachUserId,
        updatedByUserId: actorUserId,
      },
      update: {
        athleteName: context.athleteName,
        coachUserId: context.coachUserId,
        sessionId: body.sessionId ?? body.bookingId,
        status: 'completed',
        completedAt: new Date(now),
        deletedAt: null,
        deletedByUserId: null,
        updatedByUserId: actorUserId,
        version: { increment: 1 },
      },
    });
    const entry = await tx.selfAssessmentEntry.upsert({
      where: {
        athleteId_bookingId: {
          athleteId: body.athleteId,
          bookingId: body.bookingId,
        },
      },
      create: {
        id: newId('sae'),
        athleteId: body.athleteId,
        coachUserId: context.coachUserId,
        bookingId: body.bookingId,
        sessionId: body.sessionId ?? body.bookingId,
        promptId: prompt.id,
        submittedByUserId: actorUserId,
        mood: clampSelfAssessmentRating(body.mood),
        energyLevel: clampSelfAssessmentRating(body.energyLevel),
        confidence: clampSelfAssessmentRating(body.confidence),
        notes,
        createdByUserId: actorUserId,
        updatedByUserId: actorUserId,
      },
      update: {
        coachUserId: context.coachUserId,
        sessionId: body.sessionId ?? body.bookingId,
        promptId: prompt.id,
        submittedByUserId: actorUserId,
        mood: clampSelfAssessmentRating(body.mood),
        energyLevel: clampSelfAssessmentRating(body.energyLevel),
        confidence: clampSelfAssessmentRating(body.confidence),
        notes,
        deletedAt: null,
        deletedByUserId: null,
        updatedByUserId: actorUserId,
        version: { increment: 1 },
      },
    });
    return { entry, prompt };
  });

  return {
    entry: mapSelfAssessmentEntryRow(normalizeForJson(result.entry) as SeedRow),
    prompt: mapSelfAssessmentPromptRow(normalizeForJson(result.prompt) as SeedRow),
    seedVersion: null,
  };
}

function mutableTermlyReportStore() {
  if (getApiDataBackend() === 'db') {
    return shouldUseDbFixtureFallback() ? getDbFixtureStore() : null;
  }
  return getMarketplaceSeedStore();
}

function seedTermlyReportSnapshotRows(tables: Record<string, unknown>): SeedRow[] {
  if (!Array.isArray(tables.termlyReportSnapshots)) {
    tables.termlyReportSnapshots = [];
  }
  return asRows(tables.termlyReportSnapshots);
}

function mapTermlyReportSnapshotRow(row: SeedRow) {
  return {
    id: asString(row.id) ?? '',
    athleteId: asString(row.athleteId) ?? '',
    generatedAt: isoTimestamp(row.generatedAt) ?? nowIso(),
    report: coerceMetadata(row.reportJson),
  };
}

function parseTermlyReportDate(value: string, fieldName: string): Date {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw badRequest(`Invalid ${fieldName}`);
  }
  return date;
}

async function listTermlyReportSnapshotsPayload(athleteId: string) {
  const store = mutableTermlyReportStore();
  if (store) {
    const rows = seedTermlyReportSnapshotRows(store.tables as Record<string, unknown>).filter(
      (row) => asString(row.athleteId) === athleteId && !asString(row.deletedAt),
    );
    const snapshots = [...rows]
      .sort((left, right) => timestampMs(right.generatedAt) - timestampMs(left.generatedAt))
      .slice(0, 50)
      .map(mapTermlyReportSnapshotRow);
    return { snapshots, total: rows.length, seedVersion: store.version };
  }

  const prisma = getPrismaClientOrThrow();
  const rows = await prisma.termlyReportSnapshot.findMany({
    where: { athleteId, deletedAt: null },
    orderBy: { generatedAt: 'desc' },
    take: 50,
  });
  const snapshots = (normalizeForJson(rows) as SeedRow[]).map(mapTermlyReportSnapshotRow);
  return { snapshots, total: snapshots.length, seedVersion: null };
}

async function createTermlyReportSnapshotPayload(
  athleteId: string,
  actorUserId: string,
  body: TermlyReportSnapshotCreateBody,
) {
  const { report } = body;
  if (report.athleteId !== athleteId) {
    throw badRequest('Report athlete does not match route athlete');
  }

  const generatedAt = parseTermlyReportDate(report.generatedAt, 'generatedAt');
  const rangeStart = parseTermlyReportDate(report.range.startDate, 'range.startDate');
  const rangeEnd = parseTermlyReportDate(report.range.endDate, 'range.endDate');
  if (rangeStart.getTime() > rangeEnd.getTime()) {
    throw badRequest('Report range start must be before range end');
  }
  const store = mutableTermlyReportStore();

  if (store) {
    const tables = store.tables as Record<string, unknown>;
    const athleteExists = asRows(tables.athletes).some(
      (row) => asString(row.id) === athleteId && !asString(row.deletedAt),
    );
    if (!athleteExists) {
      throw notFound('Athlete not found', { athleteId });
    }
    const now = nowIso();
    const row: SeedRow = {
      id: newId('trs'),
      athleteId,
      generatedAt: generatedAt.toISOString(),
      rangeStart: rangeStart.toISOString(),
      rangeEnd: rangeEnd.toISOString(),
      rangeLabel: report.range.label,
      reportJson: report,
      summaryJson: report.summary,
      createdByUserId: actorUserId,
      version: 1,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      deletedByUserId: null,
    };
    seedTermlyReportSnapshotRows(tables).unshift(row);
    return { snapshot: mapTermlyReportSnapshotRow(row), seedVersion: store.version };
  }

  const prisma = getPrismaClientOrThrow();
  const athlete = await prisma.athlete.findFirst({
    where: { id: athleteId, deletedAt: null },
    select: { id: true },
  });
  if (!athlete) {
    throw notFound('Athlete not found', { athleteId });
  }
  const created = await prisma.termlyReportSnapshot.create({
    data: {
      id: newId('trs'),
      athleteId,
      generatedAt,
      rangeStart,
      rangeEnd,
      rangeLabel: report.range.label,
      reportJson: report as never,
      summaryJson: report.summary as never,
      createdByUserId: actorUserId,
    },
  });

  return {
    snapshot: mapTermlyReportSnapshotRow(normalizeForJson(created) as SeedRow),
    seedVersion: null,
  };
}

const SELF_ASSESSMENT_PROMPT_SOURCE_TYPE = 'self_assessment_prompt';
const WEEKLY_RECAP_SOURCE_TYPE = 'weekly_progress_recap';

function weeklyRecapSunday(date: Date): Date {
  const sunday = new Date(date);
  sunday.setHours(0, 0, 0, 0);
  sunday.setDate(sunday.getDate() - sunday.getDay());
  return sunday;
}

function weeklyRecapWindowStart(date: Date): Date {
  const sunday = weeklyRecapSunday(date);
  sunday.setHours(18, 0, 0, 0);
  return sunday;
}

function weeklyRecapWeekKey(date: Date): string {
  return weeklyRecapSunday(date).toISOString().slice(0, 10);
}

function weeklyRecapNow(body: WeeklyRecapDispatchBody): Date {
  if (process.env.NODE_ENV === 'test' && body.now) {
    return parseTermlyReportDate(body.now, 'now');
  }
  return new Date();
}

function weeklyRecapSourceId(parentId: string, athleteId: string, weekKey: string): string {
  return `${parentId}:${athleteId}:${weekKey}`;
}

function mutableWeeklyRecapStore() {
  if (getApiDataBackend() === 'db') {
    return shouldUseDbFixtureFallback() ? getDbFixtureStore() : null;
  }
  return getMarketplaceSeedStore();
}

function seedWeeklyRecapAthleteName(tables: Record<string, unknown>, athleteId: string): string {
  return seedAthleteName(tables, athleteId);
}

function seedWeeklyRecapSessionCount(
  tables: Record<string, unknown>,
  athleteId: string,
  since: Date,
): number {
  const bookingIds = new Set(
    asRows(tables.bookingParticipants)
      .filter((row) => asString(row.athleteId) === athleteId && !asString(row.deletedAt))
      .map((row) => asString(row.bookingId))
      .filter((bookingId): bookingId is string => Boolean(bookingId)),
  );
  const sinceMs = since.getTime();
  return asRows(tables.bookings).filter((row) => {
    const bookingId = asString(row.id);
    const scheduledAt = new Date(asString(row.scheduledAt) ?? asString(row.createdAt) ?? '');
    return (
      Boolean(bookingId) &&
      bookingIds.has(bookingId ?? '') &&
      asString(row.status) === 'COMPLETED' &&
      !asString(row.deletedAt) &&
      !Number.isNaN(scheduledAt.getTime()) &&
      scheduledAt.getTime() >= sinceMs
    );
  }).length;
}

async function createWeeklyRecapDispatchPayload(
  request: FastifyRequest,
  athleteId: string,
  body: WeeklyRecapDispatchBody,
) {
  const actorUserId = asString(request.auth?.userId);
  if (!actorUserId) {
    throw forbidden('Authenticated user is required');
  }
  if (body.parentId !== actorUserId && !isPrivilegedAdminAuth(request.auth)) {
    throw forbidden('Weekly recap dispatch can only target the signed-in guardian');
  }

  const now = weeklyRecapNow(body);
  const weekKey = weeklyRecapWeekKey(now);
  const sourceId = weeklyRecapSourceId(body.parentId, athleteId, weekKey);
  const store = mutableWeeklyRecapStore();
  if (store) {
    const tables = store.tables as Record<string, unknown>;
    const linkedGuardian = asRows(tables.guardianChildLinks).some(
      (row) =>
        asString(row.athleteId) === athleteId &&
        asString(row.guardianUserId) === body.parentId &&
        !asString(row.deletedAt),
    );
    if (!linkedGuardian) {
      throw forbidden('Weekly recap recipient is not linked to athlete');
    }
    if (now.getTime() < weeklyRecapWindowStart(now).getTime()) {
      return {
        sent: false,
        reason: 'not_due_yet',
        weekKey,
        notification: null,
        seedVersion: store.version,
      };
    }
    const notifications = mutableRows(store.tables, 'notifications');
    const existing = notifications.find(
      (row) =>
        asString(row.userId) === body.parentId &&
        asString(row.sourceType) === WEEKLY_RECAP_SOURCE_TYPE &&
        asString(row.sourceId) === sourceId,
    );
    if (existing) {
      return {
        sent: false,
        reason: 'already_sent_this_week',
        weekKey,
        notification: existing,
        seedVersion: store.version,
      };
    }
    const athleteName = seedWeeklyRecapAthleteName(tables, athleteId);
    const sessionsThisWeek = seedWeeklyRecapSessionCount(tables, athleteId, weeklyRecapSunday(now));
    const notification: SeedRow = {
      id: newId('ntf'),
      userId: body.parentId,
      type: 'SESSION_REMINDER',
      title: `${athleteName}'s Weekly Progress`,
      body: `${athleteName} trained ${sessionsThisWeek}x this week.`,
      status: 'UNREAD',
      sourceType: WEEKLY_RECAP_SOURCE_TYPE,
      sourceId,
      deepLink: '/development/my-progress',
      metadataJson: {
        athleteId,
        weekKey,
        sessionsThisWeek,
      },
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      readAt: null,
      dismissedAt: null,
    };
    notifications.push(notification);
    return {
      sent: true,
      reason: 'sent',
      weekKey,
      notification,
      seedVersion: store.version,
    };
  }

  const prisma = getPrismaClientOrThrow();
  const linkedGuardian = await prisma.guardianChildLink.findFirst({
    where: {
      athleteId,
      guardianUserId: body.parentId,
      deletedAt: null,
    },
    select: { id: true },
  });
  if (!linkedGuardian) {
    throw forbidden('Weekly recap recipient is not linked to athlete');
  }
  if (now.getTime() < weeklyRecapWindowStart(now).getTime()) {
    return {
      sent: false,
      reason: 'not_due_yet',
      weekKey,
      notification: null,
      seedVersion: null,
    };
  }
  const existing = await prisma.notification.findFirst({
    where: {
      userId: body.parentId,
      sourceType: WEEKLY_RECAP_SOURCE_TYPE,
      sourceId,
    },
  });
  if (existing) {
    return {
      sent: false,
      reason: 'already_sent_this_week',
      weekKey,
      notification: normalizeForJson(existing) as SeedRow,
      seedVersion: null,
    };
  }

  const [athlete, sessionsThisWeek] = await Promise.all([
    prisma.athlete.findFirst({
      where: { id: athleteId, deletedAt: null },
      select: { displayName: true, firstName: true, lastName: true },
    }),
    prisma.booking.count({
      where: {
        status: 'COMPLETED',
        deletedAt: null,
        scheduledAt: { gte: weeklyRecapSunday(now) },
        participants: {
          some: {
            athleteId,
            deletedAt: null,
          },
        },
      },
    }),
  ]);
  if (!athlete) {
    throw notFound('Athlete not found', { athleteId });
  }
  const athleteName =
    athlete.displayName ??
    ([athlete.firstName, athlete.lastName].filter(Boolean).join(' ') || 'Athlete');
  const notification = await prisma.notification.create({
    data: {
      id: newId('ntf'),
      userId: body.parentId,
      type: 'SESSION_REMINDER',
      title: `${athleteName}'s Weekly Progress`,
      body: `${athleteName} trained ${sessionsThisWeek}x this week.`,
      sourceType: WEEKLY_RECAP_SOURCE_TYPE,
      sourceId,
      deepLink: '/development/my-progress',
      metadataJson: {
        athleteId,
        weekKey,
        sessionsThisWeek,
      } as never,
      createdAt: now,
      updatedAt: now,
    },
  });
  return {
    sent: true,
    reason: 'sent',
    weekKey,
    notification: normalizeForJson(notification) as SeedRow,
    seedVersion: null,
  };
}

async function getAthleteGoalsPayload(athleteId: string) {
  if (getApiDataBackend() === 'db') {
    if (shouldUseDbFixtureFallback()) {
      const store = getDbFixtureStore();
      const goals = asRows(store.tables.goals).filter(
        (row) => asString(row.athleteId) === athleteId && !asString(row.deletedAt),
      );
      const goalIds = new Set(
        goals.map((goal) => asString(goal.id)).filter((id): id is string => Boolean(id)),
      );
      const milestones = asRows(store.tables.goalMilestones).filter(
        (row) => goalIds.has(asString(row.goalId) ?? '') && !asString(row.deletedAt),
      );
      return {
        goals,
        milestones,
        seedVersion: store.version,
      };
    }

    const prisma = getPrismaClientOrThrow();
    const goalsWithMilestones = await prisma.goal.findMany({
      where: { athleteId, deletedAt: null },
      include: {
        milestones: {
          where: { deletedAt: null },
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
    const goals = goalsWithMilestones.map(({ milestones: _milestones, ...goal }) => goal);
    const milestones = goalsWithMilestones.flatMap((goal) => goal.milestones);
    return normalizeForJson({
      goals,
      milestones,
      seedVersion: null,
    });
  }

  const store = getMarketplaceSeedStore();
  const goals = asRows(store.tables.goals).filter(
    (row) => asString(row.athleteId) === athleteId && !asString(row.deletedAt),
  );
  const goalIds = new Set(
    goals.map((goal) => asString(goal.id)).filter((id): id is string => Boolean(id)),
  );
  const milestones = asRows(store.tables.goalMilestones).filter(
    (row) => goalIds.has(asString(row.goalId) ?? '') && !asString(row.deletedAt),
  );
  return {
    goals,
    milestones,
    seedVersion: store.version,
  };
}

const BADGE_AWARD_COOLDOWN_DAYS = 7;
const BADGE_AWARD_CREATE_ACTION = 'athlete_badge_award.create';
const BADGE_AWARD_SHARE_ACTION = 'athlete_badge_award.share';
const BADGE_AWARD_SEEN_ACTION = 'athlete_badge_award.seen';
const BADGE_AWARD_FEED_POST_ACTION = 'athlete_badge_award.feed_post';
const BADGE_AWARD_STATE_ACTIONS = [
  BADGE_AWARD_CREATE_ACTION,
  BADGE_AWARD_SHARE_ACTION,
  BADGE_AWARD_SEEN_ACTION,
  BADGE_AWARD_FEED_POST_ACTION,
];

function badgeDefinitionCode(input: BadgeAwardCreateBody): string {
  const normalized = input.badgeId
    .replace(/^badge[_-]/i, '')
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toUpperCase();
  return (normalized || 'CUSTOM_BADGE').slice(0, 120);
}

function deterministicBadgeDefinitionId(input: BadgeAwardCreateBody): string {
  const digest = crypto.createHash('sha256').update(input.badgeId).digest('hex').slice(0, 32);
  return `abd_${digest}`;
}

function badgeDefinitionName(input: BadgeAwardCreateBody): string {
  return input.badgeLabel?.trim() || input.badgeId;
}

function badgeDefinitionCategory(input: BadgeAwardCreateBody): string {
  return input.badgeCategory?.trim() || 'Development';
}

function isoTimestamp(value: unknown): string | undefined {
  if (value instanceof Date) {
    return value.toISOString();
  }
  return asString(value);
}

function timestampMs(value: unknown): number {
  if (value instanceof Date) {
    return value.getTime();
  }
  const dateString = asString(value);
  return dateString ? Date.parse(dateString) : NaN;
}

function badgeAwardTimestampMs(row: SeedRow | undefined): number {
  const awardedAtMs = timestampMs(row?.awardedAt);
  return Number.isNaN(awardedAtMs) ? timestampMs(row?.createdAt) : awardedAtMs;
}

function sortableBadgeAwardTimestampMs(row: SeedRow | undefined): number {
  const value = badgeAwardTimestampMs(row);
  return Number.isNaN(value) ? Number.NEGATIVE_INFINITY : value;
}

function auditEventMetadata(row: SeedRow): SeedRow {
  return coerceMetadata(row.metadataJson);
}

function applyBadgeCreateAuditState(badge: SeedRow, event: SeedRow): SeedRow {
  const metadata = auditEventMetadata(event);
  return {
    ...badge,
    badgeId: asString(metadata.badgeId) ?? asString(badge.badgeDefinitionId),
    reason: asString(metadata.reason) ?? asString(badge.note),
    visibility: asString(metadata.visibility) ?? 'supporters',
    presetId: asString(metadata.presetId) ?? null,
    cooldownBypassed: asBoolean(metadata.cooldownBypassed) ?? false,
    cooldownWindowDays: asNumber(metadata.cooldownWindowDays) ?? BADGE_AWARD_COOLDOWN_DAYS,
    context: asString(metadata.context),
    overrideNote: asString(metadata.overrideNote) ?? null,
    badgeTier: asNumber(metadata.badgeTier) ?? null,
    badgePointValue: asNumber(metadata.badgePointValue) ?? null,
    badgeCategory: asString(metadata.badgeCategory) ?? null,
  };
}

function decorateBadgeAwardsWithAuditState(
  badges: SeedRow[],
  auditEvents: SeedRow[],
  viewerUserId?: string,
): SeedRow[] {
  const sortedEvents = [...auditEvents].sort((left, right) => {
    const rightMs = timestampMs(right.occurredAt);
    const leftMs = timestampMs(left.occurredAt);
    return (Number.isNaN(rightMs) ? 0 : rightMs) - (Number.isNaN(leftMs) ? 0 : leftMs);
  });
  const createEventsByAwardId = new Map<string, SeedRow>();
  const shareEventsByAwardId = new Map<string, SeedRow>();
  const feedEventsByAwardId = new Map<string, SeedRow>();
  const seenEventsByAwardId = new Map<string, SeedRow>();

  for (const event of sortedEvents) {
    const awardId = asString(event.resourceId);
    if (!awardId) {
      continue;
    }
    const action = asString(event.action);
    const result = asString(event.result);
    if (result !== 'SUCCESS') {
      continue;
    }
    if (action === BADGE_AWARD_CREATE_ACTION && !createEventsByAwardId.has(awardId)) {
      createEventsByAwardId.set(awardId, event);
    } else if (action === BADGE_AWARD_SHARE_ACTION && !shareEventsByAwardId.has(awardId)) {
      shareEventsByAwardId.set(awardId, event);
    } else if (action === BADGE_AWARD_FEED_POST_ACTION && !feedEventsByAwardId.has(awardId)) {
      feedEventsByAwardId.set(awardId, event);
    } else if (
      action === BADGE_AWARD_SEEN_ACTION &&
      (!viewerUserId || asString(event.actorUserId) === viewerUserId) &&
      !seenEventsByAwardId.has(awardId)
    ) {
      seenEventsByAwardId.set(awardId, event);
    }
  }

  return badges.map((badge) => {
    const awardId = asString(badge.id);
    if (!awardId) {
      return badge;
    }
    const createEvent = createEventsByAwardId.get(awardId);
    const shareEvent = shareEventsByAwardId.get(awardId);
    const feedEvent = feedEventsByAwardId.get(awardId);
    const seenEvent = seenEventsByAwardId.get(awardId);
    const feedMetadata = feedEvent ? auditEventMetadata(feedEvent) : {};
    const shareMetadata = shareEvent ? auditEventMetadata(shareEvent) : {};
    const base = createEvent ? applyBadgeCreateAuditState(badge, createEvent) : badge;
    const feedPostId =
      asString(feedMetadata.feedPostId) ??
      asString(asRows(feedMetadata.postIds)[0]) ??
      asString(shareMetadata.feedPostId);

    return {
      ...base,
      shared: Boolean(shareEvent || feedEvent),
      feedPostId: feedPostId ?? null,
      seenByParent: Boolean(seenEvent),
      seenAt: isoTimestamp(seenEvent?.occurredAt) ?? null,
    };
  });
}

function isWithinBadgeCooldown(row: SeedRow | undefined): boolean {
  const awardedAtMs = badgeAwardTimestampMs(row);
  if (Number.isNaN(awardedAtMs)) {
    return false;
  }
  const diffDays = (Date.now() - awardedAtMs) / (1000 * 60 * 60 * 24);
  return diffDays < BADGE_AWARD_COOLDOWN_DAYS;
}

function assertBadgeCooldown(
  recentAward: SeedRow | undefined,
  body: BadgeAwardCreateBody,
): void {
  if (!isWithinBadgeCooldown(recentAward)) {
    return;
  }
  if (!body.overrideCooldown) {
    throw badRequest(
      `Cooldown in effect. Toggle exception with a note to award another badge within ${BADGE_AWARD_COOLDOWN_DAYS} days.`,
    );
  }
  if (!body.overrideNote?.trim()) {
    throw badRequest('Exception note is required to bypass the badge cooldown.');
  }
}

function resolveBadgeDefinitionFromTables(
  tables: SeedTables,
  body: BadgeAwardCreateBody,
): { definition: SeedRow; createdDefinition: boolean } {
  const code = badgeDefinitionCode(body);
  const label = body.badgeLabel?.trim();
  const definitions = mutableRows(tables, 'badgeDefinitions');
  const existing = definitions.find((row) => {
    if (asString(row.id) === body.badgeId || asString(row.code) === code) {
      return true;
    }
    return Boolean(label && asString(row.name)?.toLowerCase() === label.toLowerCase());
  });
  if (existing) {
    return { definition: existing, createdDefinition: false };
  }

  const now = nowIso();
  const definition: SeedRow = {
    id: deterministicBadgeDefinitionId(body),
    code,
    name: badgeDefinitionName(body),
    category: badgeDefinitionCategory(body),
    description: body.reason,
    active: true,
    createdAt: now,
    updatedAt: now,
  };
  definitions.push(definition);
  return { definition, createdDefinition: true };
}

async function resolveBadgeDefinitionInDb(
  prisma: PrismaClient,
  body: BadgeAwardCreateBody,
): Promise<{ definition: SeedRow; createdDefinition: boolean }> {
  const code = badgeDefinitionCode(body);
  const label = body.badgeLabel?.trim();
  const existing = await prisma.badgeDefinition.findFirst({
    where: {
      active: true,
      OR: [
        { id: body.badgeId },
        { code },
        ...(label ? [{ name: { equals: label, mode: 'insensitive' as const } }] : []),
      ],
    },
  });
  if (existing) {
    return { definition: existing as unknown as SeedRow, createdDefinition: false };
  }

  const definition = await prisma.badgeDefinition.upsert({
    where: { code },
    update: {
      name: badgeDefinitionName(body),
      category: badgeDefinitionCategory(body),
      description: body.reason,
      active: true,
    },
    create: {
      id: deterministicBadgeDefinitionId(body),
      code,
      name: badgeDefinitionName(body),
      category: badgeDefinitionCategory(body),
      description: body.reason,
      active: true,
    },
  });
  return { definition: definition as unknown as SeedRow, createdDefinition: true };
}

function assertBadgeSessionFromTables(
  tables: SeedTables,
  athleteId: string,
  actorUserId: string,
  isPrivilegedAdmin: boolean,
  body: BadgeAwardCreateBody,
): void {
  if (!body.sessionId) {
    return;
  }
  const booking = asRows(tables.bookings).find(
    (row) => asString(row.id) === body.sessionId && !asString(row.deletedAt),
  );
  if (!booking) {
    throw notFound('Badge session booking proof not found', { sessionId: body.sessionId });
  }
  if (!isPrivilegedAdmin && asString(booking.coachUserId) !== actorUserId) {
    throw forbidden('Only the delivery coach can link a badge to this session');
  }
  const hasParticipant = asRows(tables.bookingParticipants).some(
    (row) =>
      asString(row.bookingId) === body.sessionId &&
      asString(row.athleteId) === athleteId &&
      !asString(row.deletedAt),
  );
  if (!hasParticipant) {
    throw badRequest('Badge session does not include the target athlete', {
      sessionId: body.sessionId,
      athleteId,
    });
  }
}

async function assertBadgeSessionInDb(
  prisma: PrismaClient,
  athleteId: string,
  actorUserId: string,
  isPrivilegedAdmin: boolean,
  body: BadgeAwardCreateBody,
): Promise<void> {
  if (!body.sessionId) {
    return;
  }
  const booking = await prisma.booking.findFirst({
    where: { id: body.sessionId, deletedAt: null },
    include: { participants: { where: { deletedAt: null } } },
  });
  if (!booking) {
    throw notFound('Badge session booking proof not found', { sessionId: body.sessionId });
  }
  if (!isPrivilegedAdmin && booking.coachUserId !== actorUserId) {
    throw forbidden('Only the delivery coach can link a badge to this session');
  }
  if (!booking.participants.some((row) => row.athleteId === athleteId)) {
    throw badRequest('Badge session does not include the target athlete', {
      sessionId: body.sessionId,
      athleteId,
    });
  }
}

function decorateBadgeAwardForResponse(
  badge: SeedRow,
  definition: SeedRow,
  body: BadgeAwardCreateBody,
) {
  return {
    ...badge,
    badgeId: body.badgeId,
    reason: body.reason,
    visibility: body.visibility,
    presetId: body.presetId ?? null,
    cooldownBypassed: body.overrideCooldown,
    cooldownWindowDays: BADGE_AWARD_COOLDOWN_DAYS,
    context: body.context ?? (body.sessionId ? 'session' : 'athlete_profile'),
    overrideNote: body.overrideNote ?? null,
    badgeTier: body.badgeTier ?? null,
    badgePointValue: body.badgePointValue ?? null,
    badgeCategory: body.badgeCategory ?? asString(definition.category) ?? null,
  };
}

async function createBadgeAwardPayload(
  athleteId: string,
  actorUserId: string,
  isPrivilegedAdmin: boolean,
  body: BadgeAwardCreateBody,
) {
  if (getApiDataBackend() === 'db') {
    if (shouldUseDbFixtureFallback()) {
      const store = getDbFixtureStore();
      const tables = store.tables;
      assertBadgeSessionFromTables(tables, athleteId, actorUserId, isPrivilegedAdmin, body);
      const recentAward = asRows(tables.athleteBadges)
        .filter((row) => asString(row.athleteId) === athleteId)
        .sort(
          (left, right) =>
            sortableBadgeAwardTimestampMs(right) - sortableBadgeAwardTimestampMs(left),
        )[0];
      assertBadgeCooldown(recentAward, body);
      const { definition, createdDefinition } = resolveBadgeDefinitionFromTables(tables, body);
      const now = nowIso();
      const badge: SeedRow = {
        id: newId('aba'),
        athleteId,
        badgeDefinitionId: asString(definition.id),
        awardedByUserId: actorUserId,
        bookingId: body.sessionId ?? null,
        note: body.note ?? body.reason,
        awardedAt: now,
        createdAt: now,
      };
      mutableRows(tables, 'athleteBadges').push(badge);
      return {
        badge: decorateBadgeAwardForResponse(badge, definition, body),
        badgeDefinition: definition,
        createdDefinition,
        seedVersion: store.version,
      };
    }

    const prisma = getPrismaClientOrThrow();
    await assertBadgeSessionInDb(prisma, athleteId, actorUserId, isPrivilegedAdmin, body);
    const athlete = await prisma.athlete.findFirst({
      where: { id: athleteId, deletedAt: null },
      select: { id: true },
    });
    if (!athlete) {
      throw notFound('Athlete not found', { athleteId });
    }
    const recentAward = await prisma.athleteBadge.findFirst({
      where: { athleteId },
      orderBy: { awardedAt: 'desc' },
    });
    assertBadgeCooldown(recentAward as unknown as SeedRow | undefined, body);
    const { definition, createdDefinition } = await resolveBadgeDefinitionInDb(prisma, body);
    const badge = await prisma.athleteBadge.create({
      data: {
        id: newId('aba'),
        athleteId,
        badgeDefinitionId: asString(definition.id) ?? body.badgeId,
        awardedByUserId: actorUserId,
        bookingId: body.sessionId ?? null,
        note: body.note ?? body.reason,
      },
    });
    return normalizeForJson({
      badge: decorateBadgeAwardForResponse(badge as unknown as SeedRow, definition, body),
      badgeDefinition: definition,
      createdDefinition,
      seedVersion: null,
    });
  }

  const store = getMarketplaceSeedStore();
  const tables = store.tables;
  assertBadgeSessionFromTables(tables, athleteId, actorUserId, isPrivilegedAdmin, body);
  const recentAward = asRows(tables.athleteBadges)
    .filter((row) => asString(row.athleteId) === athleteId)
    .sort(
      (left, right) => sortableBadgeAwardTimestampMs(right) - sortableBadgeAwardTimestampMs(left),
    )[0];
  assertBadgeCooldown(recentAward, body);
  const { definition, createdDefinition } = resolveBadgeDefinitionFromTables(tables, body);
  const now = nowIso();
  const badge: SeedRow = {
    id: newId('aba'),
    athleteId,
    badgeDefinitionId: asString(definition.id),
    awardedByUserId: actorUserId,
    bookingId: body.sessionId ?? null,
    note: body.note ?? body.reason,
    awardedAt: now,
    createdAt: now,
  };
  mutableRows(tables, 'athleteBadges').push(badge);
  return {
    badge: decorateBadgeAwardForResponse(badge, definition, body),
    badgeDefinition: definition,
    createdDefinition,
    seedVersion: store.version,
  };
}

async function getAthleteBadgesPayload(athleteId: string, viewerUserId?: string) {
  if (getApiDataBackend() === 'db') {
    if (shouldUseDbFixtureFallback()) {
      const store = getDbFixtureStore();
      const badges = asRows(store.tables.athleteBadges).filter(
        (row) => asString(row.athleteId) === athleteId,
      );
      const badgeDefinitionIds = new Set(
        badges
          .map((row) => asString(row.badgeDefinitionId))
          .filter((id): id is string => Boolean(id)),
      );
      const badgeDefinitions = asRows(store.tables.badgeDefinitions).filter((row) =>
        badgeDefinitionIds.has(asString(row.id) ?? ''),
      );
      const auditEvents = asRows(store.tables.auditEvents).filter((row) => {
        const action = asString(row.action);
        const resourceId = asString(row.resourceId);
        return (
          action &&
          BADGE_AWARD_STATE_ACTIONS.includes(action) &&
          Boolean(resourceId && badges.some((badge) => asString(badge.id) === resourceId))
        );
      });
      return {
        badges: decorateBadgeAwardsWithAuditState(badges, auditEvents, viewerUserId),
        badgeDefinitions,
        seedVersion: store.version,
      };
    }

    const prisma = getPrismaClientOrThrow();
    const badgesWithDefinitions = await prisma.athleteBadge.findMany({
      where: { athleteId },
      include: {
        badgeDefinition: true,
      },
      orderBy: { awardedAt: 'desc' },
    });
    const badges = badgesWithDefinitions.map(
      ({ badgeDefinition: _badgeDefinition, ...badge }) => badge,
    );
    const badgeIds = badges.map((badge) => badge.id);
    const auditEvents = badgeIds.length
      ? await prisma.auditEvent.findMany({
          where: {
            action: { in: BADGE_AWARD_STATE_ACTIONS },
            resourceId: { in: badgeIds },
          },
          orderBy: { occurredAt: 'desc' },
        })
      : [];
    const badgeDefinitionsById = new Map(
      badgesWithDefinitions.map((row) => [row.badgeDefinition.id, row.badgeDefinition] as const),
    );
    return normalizeForJson({
      badges: decorateBadgeAwardsWithAuditState(
        badges as unknown as SeedRow[],
        auditEvents as unknown as SeedRow[],
        viewerUserId,
      ),
      badgeDefinitions: [...badgeDefinitionsById.values()],
      seedVersion: null,
    });
  }

  const store = getMarketplaceSeedStore();
  const badges = asRows(store.tables.athleteBadges).filter(
    (row) => asString(row.athleteId) === athleteId,
  );
  const badgeDefinitionIds = new Set(
    badges.map((row) => asString(row.badgeDefinitionId)).filter((id): id is string => Boolean(id)),
  );
  const badgeDefinitions = asRows(store.tables.badgeDefinitions).filter((row) =>
    badgeDefinitionIds.has(asString(row.id) ?? ''),
  );
  const auditEvents = asRows(store.tables.auditEvents).filter((row) => {
    const action = asString(row.action);
    const resourceId = asString(row.resourceId);
    return (
      action &&
      BADGE_AWARD_STATE_ACTIONS.includes(action) &&
      Boolean(resourceId && badges.some((badge) => asString(badge.id) === resourceId))
    );
  });
  return {
    badges: decorateBadgeAwardsWithAuditState(badges, auditEvents, viewerUserId),
    badgeDefinitions,
    seedVersion: store.version,
  };
}

function badgeDefinitionsWithAwardCounts(definitions: SeedRow[], awards: SeedRow[]): SeedRow[] {
  const athletesByDefinitionId = new Map<string, Set<string>>();
  for (const award of awards) {
    const definitionId = asString(award.badgeDefinitionId);
    const athleteId = asString(award.athleteId);
    if (!definitionId || !athleteId) {
      continue;
    }
    const athletes = athletesByDefinitionId.get(definitionId) ?? new Set<string>();
    athletes.add(athleteId);
    athletesByDefinitionId.set(definitionId, athletes);
  }

  return definitions
    .map<SeedRow>((definition) => ({
      ...definition,
      awardCount: athletesByDefinitionId.get(asString(definition.id) ?? '')?.size ?? 0,
    }))
    .sort((left, right) => {
      const leftLabel = asString(left.name) ?? asString(left.label) ?? asString(left.id) ?? '';
      const rightLabel = asString(right.name) ?? asString(right.label) ?? asString(right.id) ?? '';
      return leftLabel.localeCompare(rightLabel);
    });
}

async function getBadgeDefinitionsWithStatsPayload() {
  if (getApiDataBackend() === 'db') {
    if (shouldUseDbFixtureFallback()) {
      const store = getDbFixtureStore();
      return {
        badgeDefinitions: badgeDefinitionsWithAwardCounts(
          asRows(store.tables.badgeDefinitions).filter((row) => asBoolean(row.active) !== false),
          asRows(store.tables.athleteBadges),
        ),
        seedVersion: store.version,
      };
    }

    const prisma = getPrismaClientOrThrow();
    const [definitions, awards] = await Promise.all([
      prisma.badgeDefinition.findMany({
        where: { active: true },
        orderBy: { name: 'asc' },
      }),
      prisma.athleteBadge.findMany({
        select: {
          badgeDefinitionId: true,
          athleteId: true,
        },
      }),
    ]);
    return normalizeForJson({
      badgeDefinitions: badgeDefinitionsWithAwardCounts(
        definitions as unknown as SeedRow[],
        awards as unknown as SeedRow[],
      ),
      seedVersion: null,
    });
  }

  const store = getMarketplaceSeedStore();
  return {
    badgeDefinitions: badgeDefinitionsWithAwardCounts(
      asRows(store.tables.badgeDefinitions).filter((row) => asBoolean(row.active) !== false),
      asRows(store.tables.athleteBadges),
    ),
    seedVersion: store.version,
  };
}

function tableHasActiveBooking(tables: SeedTables, sessionId: string): boolean {
  return asRows(tables.bookings).some(
    (row) => asString(row.id) === sessionId && !asString(row.deletedAt),
  );
}

function sessionBadgeAthleteIdsFromTables(tables: SeedTables, sessionId: string): string[] {
  if (!tableHasActiveBooking(tables, sessionId)) {
    return [];
  }
  return Array.from(
    new Set(
      [
        ...asRows(tables.bookingParticipants).flatMap((row) => {
          if (asString(row.bookingId) !== sessionId || asString(row.deletedAt)) {
            return [];
          }
          const athleteId = asString(row.athleteId);
          return athleteId ? [athleteId] : [];
        }),
        ...asRows(tables.athleteBadges).flatMap((row) => {
          if (asString(row.bookingId) !== sessionId) {
            return [];
          }
          const athleteId = asString(row.athleteId);
          return athleteId ? [athleteId] : [];
        }),
      ].filter(Boolean),
    ),
  );
}

function sessionBadgesPayloadFromTables(
  tables: SeedTables,
  seedVersion: string | null,
  sessionId: string,
  readableAthleteIds: Set<string>,
  viewerUserId?: string,
) {
  const badges = asRows(tables.athleteBadges).filter((row) => {
    const athleteId = asString(row.athleteId);
    return (
      asString(row.bookingId) === sessionId &&
      Boolean(athleteId && readableAthleteIds.has(athleteId))
    );
  });
  const badgeDefinitionIds = new Set(
    badges.map((row) => asString(row.badgeDefinitionId)).filter((id): id is string => Boolean(id)),
  );
  const badgeDefinitions = asRows(tables.badgeDefinitions).filter((row) =>
    badgeDefinitionIds.has(asString(row.id) ?? ''),
  );
  const auditEvents = asRows(tables.auditEvents).filter((row) => {
    const action = asString(row.action);
    const resourceId = asString(row.resourceId);
    return (
      action &&
      BADGE_AWARD_STATE_ACTIONS.includes(action) &&
      Boolean(resourceId && badges.some((badge) => asString(badge.id) === resourceId))
    );
  });
  return {
    badges: decorateBadgeAwardsWithAuditState(badges, auditEvents, viewerUserId),
    badgeDefinitions,
    seedVersion,
  };
}

async function getSessionBadgeAthleteIds(sessionId: string): Promise<string[]> {
  if (getApiDataBackend() === 'db') {
    if (shouldUseDbFixtureFallback()) {
      const tables = getDbFixtureStore().tables;
      const athleteIds = sessionBadgeAthleteIdsFromTables(tables, sessionId);
      if (athleteIds.length === 0) {
        throw notFound('Session not found', { sessionId });
      }
      return athleteIds;
    }

    const prisma = getPrismaClientOrThrow();
    const [booking, participants, badges] = await Promise.all([
      prisma.booking.findFirst({
        where: {
          id: sessionId,
          deletedAt: null,
        },
        select: {
          id: true,
        },
      }),
      prisma.bookingParticipant.findMany({
        where: {
          bookingId: sessionId,
          deletedAt: null,
        },
        select: {
          athleteId: true,
        },
      }),
      prisma.athleteBadge.findMany({
        where: {
          bookingId: sessionId,
        },
        select: {
          athleteId: true,
        },
      }),
    ]);
    const athleteIds = Array.from(
      new Set([...participants.map((row) => row.athleteId), ...badges.map((row) => row.athleteId)]),
    );
    if (!booking) {
      throw notFound('Session not found', { sessionId });
    }
    if (athleteIds.length === 0) {
      throw notFound('Session badge context not found', { sessionId });
    }
    return athleteIds;
  }

  const tables = getMarketplaceSeedStore().tables;
  const athleteIds = sessionBadgeAthleteIdsFromTables(tables, sessionId);
  if (athleteIds.length === 0) {
    throw notFound('Session not found', { sessionId });
  }
  return athleteIds;
}

async function getSessionBadgesPayload(
  sessionId: string,
  readableAthleteIds: Set<string>,
  viewerUserId?: string,
) {
  if (readableAthleteIds.size === 0) {
    return {
      badges: [],
      badgeDefinitions: [],
      seedVersion: null,
    };
  }

  if (getApiDataBackend() === 'db') {
    if (shouldUseDbFixtureFallback()) {
      const store = getDbFixtureStore();
      return sessionBadgesPayloadFromTables(
        store.tables,
        store.version,
        sessionId,
        readableAthleteIds,
        viewerUserId,
      );
    }

    const prisma = getPrismaClientOrThrow();
    const badgesWithDefinitions = await prisma.athleteBadge.findMany({
      where: {
        bookingId: sessionId,
        athleteId: {
          in: [...readableAthleteIds],
        },
      },
      include: {
        badgeDefinition: true,
      },
      orderBy: {
        awardedAt: 'desc',
      },
    });
    const badges = badgesWithDefinitions.map(
      ({ badgeDefinition: _badgeDefinition, ...badge }) => badge,
    );
    const badgeIds = badges.map((badge) => badge.id);
    const auditEvents = badgeIds.length
      ? await prisma.auditEvent.findMany({
          where: {
            action: { in: BADGE_AWARD_STATE_ACTIONS },
            resourceId: { in: badgeIds },
          },
          orderBy: { occurredAt: 'desc' },
        })
      : [];
    const badgeDefinitionsById = new Map(
      badgesWithDefinitions.map((row) => [row.badgeDefinition.id, row.badgeDefinition] as const),
    );
    return normalizeForJson({
      badges: decorateBadgeAwardsWithAuditState(
        badges as unknown as SeedRow[],
        auditEvents as unknown as SeedRow[],
        viewerUserId,
      ),
      badgeDefinitions: [...badgeDefinitionsById.values()],
      seedVersion: null,
    });
  }

  const store = getMarketplaceSeedStore();
  return sessionBadgesPayloadFromTables(
    store.tables,
    store.version,
    sessionId,
    readableAthleteIds,
    viewerUserId,
  );
}

async function getBadgeAwardDetailPayload(awardId: string, viewerUserId?: string) {
  if (getApiDataBackend() === 'db') {
    if (shouldUseDbFixtureFallback()) {
      const store = getDbFixtureStore();
      const badge = asRows(store.tables.athleteBadges).find((row) => asString(row.id) === awardId);
      if (!badge) {
        throw notFound('Badge award not found', { awardId });
      }
      const definition = asRows(store.tables.badgeDefinitions).find(
        (row) => asString(row.id) === asString(badge.badgeDefinitionId),
      );
      const auditEvents = asRows(store.tables.auditEvents).filter(
        (row) =>
          BADGE_AWARD_STATE_ACTIONS.includes(asString(row.action) ?? '') &&
          asString(row.resourceId) === awardId,
      );
      return {
        athleteId: asString(badge.athleteId) ?? '',
        badge: decorateBadgeAwardsWithAuditState([badge], auditEvents, viewerUserId)[0] ?? badge,
        badgeDefinition: definition ?? null,
        seedVersion: store.version,
      };
    }

    const prisma = getPrismaClientOrThrow();
    const badge = await prisma.athleteBadge.findUnique({
      where: { id: awardId },
      include: { badgeDefinition: true },
    });
    if (!badge) {
      throw notFound('Badge award not found', { awardId });
    }
    const { badgeDefinition, ...badgeRow } = badge;
    const auditEvents = await prisma.auditEvent.findMany({
      where: {
        action: { in: BADGE_AWARD_STATE_ACTIONS },
        resourceId: awardId,
      },
      orderBy: { occurredAt: 'desc' },
    });
    return normalizeForJson({
      athleteId: badge.athleteId,
      badge:
        decorateBadgeAwardsWithAuditState(
          [badgeRow as unknown as SeedRow],
          auditEvents as unknown as SeedRow[],
          viewerUserId,
        )[0] ?? badgeRow,
      badgeDefinition,
      seedVersion: null,
    });
  }

  const store = getMarketplaceSeedStore();
  const badge = asRows(store.tables.athleteBadges).find((row) => asString(row.id) === awardId);
  if (!badge) {
    throw notFound('Badge award not found', { awardId });
  }
  const definition = asRows(store.tables.badgeDefinitions).find(
    (row) => asString(row.id) === asString(badge.badgeDefinitionId),
  );
  const auditEvents = asRows(store.tables.auditEvents).filter(
    (row) =>
      BADGE_AWARD_STATE_ACTIONS.includes(asString(row.action) ?? '') &&
      asString(row.resourceId) === awardId,
  );
  return {
    athleteId: asString(badge.athleteId) ?? '',
    badge: decorateBadgeAwardsWithAuditState([badge], auditEvents, viewerUserId)[0] ?? badge,
    badgeDefinition: definition ?? null,
    seedVersion: store.version,
  };
}

async function assertCanReadBadgeAwardAction(
  request: FastifyRequest,
  payload: { athleteId?: string; badge?: unknown },
): Promise<void> {
  const athleteId = asString(payload.athleteId);
  if (!athleteId) {
    throw notFound('Badge award athlete not found');
  }
  if (!isPrivilegedAdminAuth(request.auth)) {
    await assertCanReadAthleteHealth(request, athleteId);
  }
}

function assertCanShareBadgeAward(request: FastifyRequest, badge: SeedRow): void {
  const visibility = asString(badge.visibility);
  if (
    visibility === 'coach_only' &&
    !isPrivilegedAdminAuth(request.auth) &&
    !isActingCoachAuth(request)
  ) {
    throw forbidden('Coach-only badge awards cannot be shared by family actors');
  }
}

async function recordBadgeAwardAction(
  request: FastifyRequest,
  params: {
    action: string;
    awardId: string;
    athleteId: string;
    metadata?: Record<string, unknown>;
  },
): Promise<void> {
  await recordAuditEvent({
    request,
    action: params.action,
    resourceType: 'badge_award',
    resourceId: params.awardId,
    subjectUserId: athleteOwnerUserId(params.athleteId),
    result: 'SUCCESS',
    sensitiveRead: true,
    metadata: {
      athleteId: params.athleteId,
      ...(params.metadata ?? {}),
    },
  });
}

async function markBadgeAwardActionPayload(
  request: FastifyRequest,
  awardId: string,
  action: string,
  body: z.infer<typeof badgeAwardActionRequestSchema>,
) {
  const payload = await getBadgeAwardDetailPayload(awardId, request.auth?.userId);
  await assertCanReadBadgeAwardAction(request, payload);
  if (action === BADGE_AWARD_SHARE_ACTION || action === BADGE_AWARD_FEED_POST_ACTION) {
    assertCanShareBadgeAward(request, payload.badge as SeedRow);
  }
  await recordBadgeAwardAction(request, {
    action,
    awardId,
    athleteId: asString(payload.athleteId) ?? '',
    metadata: {
      note: body.note ?? null,
    },
  });
  return getBadgeAwardDetailPayload(awardId, request.auth?.userId);
}

function badgeFeedPostContent(payload: {
  badge: SeedRow;
  badgeDefinition: SeedRow | null;
}): string {
  const badgeName =
    asString(payload.badgeDefinition?.name) ??
    asString(payload.badge.badgeLabel) ??
    asString(payload.badge.badgeId) ??
    'Badge';
  return [`Earned the ${badgeName} badge`, asString(payload.badge.reason), asString(payload.badge.note)]
    .filter((part): part is string => Boolean(part?.trim()))
    .join('\n');
}

function badgeFeedPostMetadata(payload: {
  awardId: string;
  badge: SeedRow;
  badgeDefinition: SeedRow | null;
}): Record<string, unknown> {
  return {
    title: 'Badge earned',
    postType: 'achievement',
    postAs: 'self',
    feedType: 'CLUB',
    audience: 'club',
    badgeAwarded:
      asString(payload.badgeDefinition?.name) ??
      asString(payload.badge.badgeLabel) ??
      asString(payload.badge.badgeId),
    badgeAwardId: payload.awardId,
    badgeDefinitionId: asString(payload.badge.badgeDefinitionId),
    athleteId: asString(payload.badge.athleteId),
  };
}

function badgeFeedClubIdsFromTables(
  tables: SeedTables,
  athleteId: string,
  actorUserId: string,
  isPrivilegedAdmin: boolean,
): string[] {
  const squadIds = new Set(
    asRows(tables.squadMemberships).flatMap((row) => {
      if (
        asString(row.athleteId) !== athleteId ||
        asString(row.deletedAt) ||
        (asString(row.status) ?? 'active') !== 'active'
      ) {
        return [];
      }
      const squadId = asString(row.squadId);
      return squadId ? [squadId] : [];
    }),
  );
  const athleteClubIds = new Set(
    asRows(tables.squads).flatMap((row) => {
      if (!squadIds.has(asString(row.id) ?? '') || asString(row.deletedAt)) {
        return [];
      }
      const clubId = asString(row.clubId);
      return clubId ? [clubId] : [];
    }),
  );
  if (isPrivilegedAdmin) {
    return [...athleteClubIds];
  }
  const actorClubIds = new Set(
    asRows(tables.clubMemberships).flatMap((row) => {
      if (
        asString(row.userId) !== actorUserId ||
        asString(row.deletedAt) ||
        row.active === false
      ) {
        return [];
      }
      const clubId = asString(row.clubId);
      return clubId ? [clubId] : [];
    }),
  );
  return [...athleteClubIds].filter((clubId) => actorClubIds.has(clubId));
}

async function createBadgeFeedPostsPayload(
  request: FastifyRequest,
  awardId: string,
  body: z.infer<typeof badgeAwardActionRequestSchema>,
) {
  const actorUserId = asString(request.auth?.userId);
  if (!actorUserId) {
    throw forbidden('Authenticated user is required');
  }
  const payload = await getBadgeAwardDetailPayload(awardId, actorUserId);
  await assertCanReadBadgeAwardAction(request, payload);
  assertCanShareBadgeAward(request, payload.badge as SeedRow);
  const athleteId = asString(payload.athleteId) ?? '';
  const content = badgeFeedPostContent({
    badge: payload.badge as SeedRow,
    badgeDefinition: payload.badgeDefinition as SeedRow | null,
  });
  const attachmentsJson = badgeFeedPostMetadata({
    awardId,
    badge: payload.badge as SeedRow,
    badgeDefinition: payload.badgeDefinition as SeedRow | null,
  });

  let postIds: string[] = [];
  if (getApiDataBackend() === 'db' && !shouldUseDbFixtureFallback()) {
    const prisma = getPrismaClientOrThrow();
    const squadMemberships = await prisma.squadMembership.findMany({
      where: {
        athleteId,
        status: 'active',
        deletedAt: null,
        squad: { deletedAt: null },
      },
      select: { squad: { select: { clubId: true } } },
    });
    const athleteClubIds = Array.from(
      new Set(squadMemberships.map((row) => row.squad.clubId).filter(Boolean)),
    );
    const clubIds = isPrivilegedAdminAuth(request.auth)
      ? athleteClubIds
      : (
          await prisma.clubMembership.findMany({
            where: {
              userId: actorUserId,
              active: true,
              deletedAt: null,
              clubId: { in: athleteClubIds },
            },
            select: { clubId: true },
          })
        ).map((row) => row.clubId);
    const posts = await Promise.all(
      clubIds.map((clubId) =>
        prisma.post.create({
          data: {
            id: newId('pst'),
            authorUserId: actorUserId,
            clubId,
            visibility: 'CLUB',
            content,
            attachmentsJson: attachmentsJson as never,
            createdByUserId: actorUserId,
            updatedByUserId: actorUserId,
          },
          select: { id: true },
        }),
      ),
    );
    postIds = posts.map((post) => post.id);
  } else {
    const store = getApiDataBackend() === 'db' ? getDbFixtureStore() : getMarketplaceSeedStore();
    const clubIds = badgeFeedClubIdsFromTables(
      store.tables,
      athleteId,
      actorUserId,
      isPrivilegedAdminAuth(request.auth),
    );
    const now = nowIso();
    postIds = clubIds.map((clubId) => {
      const postId = newId('pst');
      mutableRows(store.tables, 'posts').push({
        id: postId,
        authorUserId: actorUserId,
        clubId,
        communityGroupId: null,
        visibility: 'CLUB',
        content,
        attachmentsJson,
        commentsCount: 0,
        reactionsCount: 0,
        createdByUserId: actorUserId,
        updatedByUserId: actorUserId,
        version: 1,
        createdAt: now,
        updatedAt: now,
      });
      return postId;
    });
  }

  await recordBadgeAwardAction(request, {
    action: BADGE_AWARD_FEED_POST_ACTION,
    awardId,
    athleteId,
    metadata: {
      note: body.note ?? null,
      postIds,
      feedPostId: postIds[0] ?? null,
      createdPostCount: postIds.length,
    },
  });
  return {
    ...(await getBadgeAwardDetailPayload(awardId, actorUserId)),
    postIds,
    createdPostCount: postIds.length,
  };
}

async function markAllBadgeAwardsSeenPayload(request: FastifyRequest, athleteId: string) {
  if (!isPrivilegedAdminAuth(request.auth)) {
    await assertCanReadAthleteHealth(request, athleteId);
  }
  const payload = await getAthleteBadgesPayload(athleteId, request.auth?.userId);
  const unseenVisibleBadges = asRows((payload as { badges?: unknown }).badges).filter(
    (badge) => asString(badge.visibility) !== 'coach_only' && badge.seenByParent !== true,
  );
  for (const badge of unseenVisibleBadges) {
    const awardId = asString(badge.id);
    if (!awardId) {
      continue;
    }
    await recordBadgeAwardAction(request, {
      action: BADGE_AWARD_SEEN_ACTION,
      awardId,
      athleteId,
    });
  }
  return {
    ...(await getAthleteBadgesPayload(athleteId, request.auth?.userId)),
    seenCount: unseenVisibleBadges.length,
  };
}

function drillMetadataFromInput(
  body: Partial<DrillCreateBody | DrillUpdateBody>,
  existing: Record<string, unknown> = {},
): Record<string, unknown> {
  const metadata: Record<string, unknown> = { ...existing };
  if ('category' in body) metadata.category = body.category;
  if ('videoUrl' in body) metadata.videoUrl = body.videoUrl ?? null;
  if ('thumbnailUrl' in body) metadata.thumbnailUrl = body.thumbnailUrl ?? null;
  if ('duration' in body) metadata.duration = body.duration;
  if ('equipment' in body) metadata.equipment = body.equipment ?? [];
  if ('tags' in body) metadata.tags = body.tags ?? [];
  return metadata;
}

function drillApiRow(row: SeedRow): SeedRow {
  const metadata = coerceMetadata(row.metadataJson);
  const equipment = asStringArray(row.equipment);
  const metadataEquipment = asStringArray(metadata.equipment);
  const tags = asStringArray(row.tags);
  const metadataTags = asStringArray(metadata.tags);
  return {
    ...row,
    category: asString(row.category) ?? asString(metadata.category) ?? 'TECHNIQUE',
    videoUrl: asString(row.videoUrl) ?? asString(metadata.videoUrl),
    thumbnailUrl: asString(row.thumbnailUrl) ?? asString(metadata.thumbnailUrl),
    duration:
      asNumber(row.duration) ??
      asNumber(metadata.duration) ??
      asNumber(metadata.durationMinutes) ??
      15,
    equipment: equipment.length > 0 ? equipment : metadataEquipment,
    tags: tags.length > 0 ? tags : metadataTags,
  };
}

function buildDrillLibraryPayloadFromTables(
  tables: SeedTables,
  seedVersion: string | null,
  coachUserId?: string,
) {
  const drills = asRows(tables.drills).filter((row) => {
    if (asString(row.deletedAt)) {
      return false;
    }
    return coachUserId ? asString(row.authorUserId) === coachUserId : true;
  });
  const assignments = asRows(tables.drillAssignments).filter((row) => !asString(row.deletedAt));
  const submissions = asRows(tables.assignmentSubmissions);

  const enriched = drills.map((drill) => {
    const drillId = asString(drill.id);
    const drillAssignments = assignments.filter((row) => asString(row.drillId) === drillId);
    return {
      ...drillApiRow(drill),
      assignments: drillAssignments,
      submissions: submissions.filter((row) =>
        drillAssignments.some(
          (assignment) => asString(assignment.id) === asString(row.drillAssignmentId),
        ),
      ),
    };
  });

  return {
    drills: enriched,
    seedVersion,
  };
}

async function getDrillLibraryPayload(coachUserId?: string) {
  if (getApiDataBackend() === 'db') {
    if (shouldUseDbFixtureFallback()) {
      const store = getDbFixtureStore();
      return buildDrillLibraryPayloadFromTables(store.tables, store.version, coachUserId);
    }

    const prisma = getPrismaClientOrThrow();
    const drills = await prisma.drill.findMany({
      where: {
        deletedAt: null,
        ...(coachUserId ? { authorUserId: coachUserId } : {}),
      },
      include: {
        assignments: {
          where: { deletedAt: null },
          include: {
            submissions: {
              orderBy: { submittedAt: 'desc' },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const enriched = drills.map(({ assignments, ...drill }) => {
      const normalizedAssignments = assignments.map(
        ({ submissions: _submissions, ...assignment }) => assignment,
      );
      const submissions = assignments.flatMap((assignment) => assignment.submissions);
      return {
        ...drillApiRow(drill as SeedRow),
        assignments: normalizedAssignments,
        submissions,
      };
    });

    return normalizeForJson({
      drills: enriched,
      seedVersion: null,
    });
  }

  const store = getMarketplaceSeedStore();
  return buildDrillLibraryPayloadFromTables(store.tables, store.version, coachUserId);
}

function buildDrillDetailPayloadFromTables(
  tables: SeedTables,
  seedVersion: string | null,
  drillId: string,
) {
  const payload = buildDrillLibraryPayloadFromTables(tables, seedVersion);
  const drill = payload.drills.find((row) => asString((row as SeedRow).id) === drillId);
  if (!drill) {
    throw notFound('Drill not found', { drillId });
  }
  return {
    drill,
    seedVersion: payload.seedVersion,
  };
}

async function getDrillDetailPayload(drillId: string) {
  if (getApiDataBackend() === 'db') {
    if (shouldUseDbFixtureFallback()) {
      const store = getDbFixtureStore();
      return buildDrillDetailPayloadFromTables(store.tables, store.version, drillId);
    }

    const prisma = getPrismaClientOrThrow();
    const drill = await prisma.drill.findFirst({
      where: {
        id: drillId,
        deletedAt: null,
      },
      include: {
        assignments: {
          where: { deletedAt: null },
          include: {
            submissions: {
              orderBy: { submittedAt: 'desc' },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!drill) {
      throw notFound('Drill not found', { drillId });
    }

    const { assignments, ...drillRow } = drill;
    const normalizedAssignments = assignments.map(
      ({ submissions: _submissions, ...assignment }) => assignment,
    );
    const submissions = assignments.flatMap((assignment) => assignment.submissions);
    return normalizeForJson({
      drill: {
        ...drillApiRow(drillRow as SeedRow),
        assignments: normalizedAssignments,
        submissions,
      },
      seedVersion: null,
    });
  }

  const store = getMarketplaceSeedStore();
  return buildDrillDetailPayloadFromTables(store.tables, store.version, drillId);
}

function createDrillInTables(
  tables: SeedTables,
  seedVersion: string | null,
  authorUserId: string,
  body: DrillCreateBody,
) {
  const now = nowIso();
  const drillId = newId('drl');
  mutableRows(tables, 'drills').unshift({
    id: drillId,
    authorUserId,
    title: body.title,
    description: body.description,
    difficulty: body.difficulty.toLowerCase(),
    active: true,
    metadataJson: drillMetadataFromInput(body),
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  });
  return buildDrillDetailPayloadFromTables(tables, seedVersion, drillId);
}

function updateDrillInTables(
  tables: SeedTables,
  seedVersion: string | null,
  drillId: string,
  body: DrillUpdateBody,
) {
  const drill = mutableRows(tables, 'drills').find(
    (row) => asString(row.id) === drillId && !asString(row.deletedAt),
  );
  if (!drill) {
    throw notFound('Drill not found', { drillId });
  }
  if (body.title !== undefined) drill.title = body.title;
  if (body.description !== undefined) drill.description = body.description;
  if (body.difficulty !== undefined) drill.difficulty = body.difficulty.toLowerCase();
  drill.metadataJson = drillMetadataFromInput(body, coerceMetadata(drill.metadataJson));
  drill.updatedAt = nowIso();
  return buildDrillDetailPayloadFromTables(tables, seedVersion, drillId);
}

function removeDrillInTables(tables: SeedTables, seedVersion: string | null, drillId: string) {
  const drill = mutableRows(tables, 'drills').find(
    (row) => asString(row.id) === drillId && !asString(row.deletedAt),
  );
  if (!drill) {
    throw notFound('Drill not found', { drillId });
  }
  drill.active = false;
  drill.deletedAt = nowIso();
  drill.updatedAt = nowIso();
  return {
    drill: drillApiRow(drill),
    seedVersion,
  };
}

function parseDateMs(value: unknown): number {
  const stringValue = asString(value);
  if (!stringValue) {
    return Number.NaN;
  }
  return Date.parse(stringValue);
}

function addDays(value: string | undefined, days: number): string {
  const baseMs = parseDateMs(value);
  const base = Number.isNaN(baseMs) ? Date.now() : baseMs;
  return new Date(base + days * 24 * 60 * 60 * 1000).toISOString();
}

function taskTiming(dueAt: string, status: 'pending' | 'completed'): PracticeTaskTiming {
  if (status === 'completed') {
    return 'completed';
  }
  const dueMs = parseDateMs(dueAt);
  if (Number.isNaN(dueMs)) {
    return 'upcoming';
  }
  const remainingMs = dueMs - Date.now();
  if (remainingMs < 0) {
    return 'overdue';
  }
  if (remainingMs <= 36 * 60 * 60 * 1000) {
    return 'due_soon';
  }
  return 'upcoming';
}

function displayNameFromRow(row: SeedRow | undefined, fallback: string): string {
  return (
    asString(row?.displayName) ??
    asString(row?.name) ??
    asString(row?.fullName) ??
    asString(row?.email) ??
    fallback
  );
}

function canPracticeTaskViewerSee(
  visibility: 'coach_only' | 'parent' | 'athlete',
  viewerRole: PracticeTaskViewerRole,
): boolean {
  if (viewerRole === 'coach') {
    return true;
  }
  if (viewerRole === 'parent') {
    return visibility === 'parent';
  }
  return visibility !== 'coach_only';
}

function practiceTaskActionFromAudit(
  row: SeedRow,
): 'nudge' | 'message' | 'recovery_checkpoint' | 'review' | 'task_update' | undefined {
  const action = asString(row.action);
  if (action === 'practice_task.review') {
    return 'review';
  }
  if (action === 'practice_task.recovery_checkpoint') {
    return 'recovery_checkpoint';
  }
  if (action === 'practice_task.due_at_update' || action === 'practice_task.snooze') {
    return 'task_update';
  }
  if (action === 'practice_task.follow_up') {
    const metadata = coerceMetadata(row.metadataJson);
    const actionType = asString(metadata.actionType);
    return actionType === 'nudge' || actionType === 'message' ? actionType : 'message';
  }
  return undefined;
}

function practiceTaskActionAuditsByAssignmentId(tables: SeedTables): Map<string, SeedRow[]> {
  const allowedActions = new Set<string>(PRACTICE_TASK_ACTION_AUDIT_TYPES);
  const grouped = new Map<string, SeedRow[]>();
  for (const row of asRows(tables.auditEvents)) {
    const assignmentId = asString(row.resourceId);
    const action = asString(row.action);
    if (
      !assignmentId ||
      asString(row.resourceType) !== 'practice_task' ||
      asString(row.result) !== 'SUCCESS' ||
      !action ||
      !allowedActions.has(action)
    ) {
      continue;
    }
    const existing = grouped.get(assignmentId) ?? [];
    existing.push(row);
    grouped.set(assignmentId, existing);
  }
  for (const rows of grouped.values()) {
    rows.sort((left, right) => parseDateMs(right.occurredAt) - parseDateMs(left.occurredAt));
  }
  return grouped;
}

function buildPracticeTasksFromTables(params: {
  tables: SeedTables;
  athleteId?: string;
  coachUserId?: string;
  viewerRole?: PracticeTaskViewerRole;
}) {
  const drillRows = asRows(params.tables.drills);
  const athleteRows = asRows(params.tables.athletes);
  const userRows = asRows(params.tables.users);
  const submissions = asRows(params.tables.assignmentSubmissions);
  const actionAuditsByAssignmentId = practiceTaskActionAuditsByAssignmentId(params.tables);
  const tasks = asRows(params.tables.drillAssignments)
    .filter((assignment) => {
      if (asString(assignment.deletedAt)) {
        return false;
      }
      if (params.athleteId && asString(assignment.athleteId) !== params.athleteId) {
        return false;
      }
      if (params.coachUserId && asString(assignment.coachUserId) !== params.coachUserId) {
        return false;
      }
      return true;
    })
    .flatMap((assignment) => {
      const assignmentId = asString(assignment.id);
      const athleteId = asString(assignment.athleteId);
      const coachUserId = asString(assignment.coachUserId);
      const drillId = asString(assignment.drillId);
      if (!assignmentId || !athleteId || !coachUserId || !drillId) {
        return [];
      }
      const drill = drillRows.find((row) => asString(row.id) === drillId);
      const athlete = athleteRows.find((row) => asString(row.id) === athleteId);
      const coach = userRows.find((row) => asString(row.id) === coachUserId);
      const latestSubmission = submissions
        .filter((row) => asString(row.drillAssignmentId) === assignmentId)
        .sort((left, right) => parseDateMs(right.submittedAt) - parseDateMs(left.submittedAt))[0];
      const assignmentStatus = asString(assignment.status)?.toUpperCase();
      const actionAudits = actionAuditsByAssignmentId.get(assignmentId) ?? [];
      const latestAction = actionAudits[0];
      const latestReview = actionAudits.find(
        (row) => asString(row.action) === 'practice_task.review',
      );
      const latestActionType = latestAction ? practiceTaskActionFromAudit(latestAction) : undefined;
      const completed =
        assignmentStatus === 'SUBMITTED' ||
        assignmentStatus === 'COMPLETED' ||
        asString(latestSubmission?.status)?.toUpperCase() === 'SUBMITTED';
      const assignedAt = asString(assignment.createdAt) ?? nowIso();
      const dueAt = asString(assignment.dueDate) ?? addDays(assignedAt, 3);
      const visibility: 'parent' = 'parent';
      if (params.viewerRole && !canPracticeTaskViewerSee(visibility, params.viewerRole)) {
        return [];
      }
      const status = completed ? 'completed' : 'pending';
      return [
        {
          id: `practice_task_drill_${assignmentId}`,
          source: 'drill_assignment',
          sourceFeedbackId: assignmentId,
          drillAssignmentId: assignmentId,
          sessionId: `drill_assignment_${drillId}`,
          sessionTitle: asString(assignment.title) ?? asString(drill?.title) ?? 'Drill Assignment',
          athleteId,
          athleteName: displayNameFromRow(athlete, 'Athlete'),
          coachId: coachUserId,
          coachName: displayNameFromRow(coach, 'Coach'),
          visibility,
          description:
            asString(assignment.instructions) ??
            asString(drill?.description) ??
            'Complete assigned drill.',
          assignedAt,
          dueAt,
          status,
          ...(completed && asString(latestSubmission?.submittedAt)
            ? { completedAt: asString(latestSubmission?.submittedAt) }
            : {}),
          ...(completed && asString(latestSubmission?.submittedByUserId)
            ? { completedByUserId: asString(latestSubmission?.submittedByUserId) }
            : {}),
          ...(completed && asString(latestSubmission?.notes)
            ? { completionNote: asString(latestSubmission?.notes) }
            : {}),
          ...(asString(latestReview?.occurredAt)
            ? { coachReviewedAt: asString(latestReview?.occurredAt) }
            : {}),
          ...(asString(latestReview?.actorUserId)
            ? { coachReviewedByUserId: asString(latestReview?.actorUserId) }
            : {}),
          lastCoachActionAt:
            asString(latestAction?.occurredAt) ?? asString(assignment.updatedAt) ?? assignedAt,
          lastCoachActionType: latestActionType ?? 'task_update',
          updatedAt: asString(assignment.updatedAt) ?? assignedAt,
          timing: taskTiming(dueAt, status),
        },
      ];
    });
  return tasks.sort((left, right) => {
    const leftRank: Record<PracticeTaskTiming, number> = {
      overdue: 0,
      due_soon: 1,
      upcoming: 2,
      completed: 3,
    };
    if (leftRank[left.timing] !== leftRank[right.timing]) {
      return leftRank[left.timing] - leftRank[right.timing];
    }
    return parseDateMs(left.dueAt) - parseDateMs(right.dueAt);
  });
}

async function getPracticeTaskTables(params: { athleteId?: string; coachUserId?: string }) {
  if (getApiDataBackend() === 'db') {
    if (shouldUseDbFixtureFallback()) {
      const store = getDbFixtureStore();
      return {
        tables: store.tables,
        seedVersion: store.version,
      };
    }
    const prisma = getPrismaClientOrThrow();
    const assignments = await prisma.drillAssignment.findMany({
      where: {
        deletedAt: null,
        ...(params.athleteId ? { athleteId: params.athleteId } : {}),
        ...(params.coachUserId ? { coachUserId: params.coachUserId } : {}),
      },
      include: {
        drill: true,
        submissions: {
          orderBy: {
            submittedAt: 'desc',
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    const athleteIds = Array.from(new Set(assignments.map((row) => row.athleteId)));
    const coachUserIds = Array.from(new Set(assignments.map((row) => row.coachUserId)));
    const assignmentIds = assignments.map((row) => row.id);
    const [athletes, users, auditEvents] = await Promise.all([
      athleteIds.length > 0
        ? prisma.athlete.findMany({
            where: {
              id: {
                in: athleteIds,
              },
            },
          })
        : Promise.resolve([]),
      coachUserIds.length > 0
        ? prisma.user.findMany({
            where: {
              id: {
                in: coachUserIds,
              },
            },
          })
        : Promise.resolve([]),
      assignmentIds.length > 0
        ? prisma.auditEvent.findMany({
            where: {
              resourceType: 'practice_task',
              resourceId: {
                in: assignmentIds,
              },
              result: 'SUCCESS',
              action: {
                in: [...PRACTICE_TASK_ACTION_AUDIT_TYPES],
              },
            },
            orderBy: {
              occurredAt: 'desc',
            },
          })
        : Promise.resolve([]),
    ]);
    const drills = new Map(
      assignments.map((assignment) => [assignment.drill.id, assignment.drill]),
    );
    return normalizeForJson({
      tables: {
        drillAssignments: assignments.map(
          ({ drill: _drill, submissions: _submissions, ...row }) => row,
        ),
        assignmentSubmissions: assignments.flatMap((assignment) => assignment.submissions),
        drills: Array.from(drills.values()),
        athletes,
        users,
        auditEvents,
      },
      seedVersion: null,
    }) as {
      tables: SeedTables;
      seedVersion: string | null;
    };
  }

  const store = getMarketplaceSeedStore();
  return {
    tables: store.tables,
    seedVersion: store.version,
  };
}

async function getAthletePracticeTaskPayload(
  athleteId: string,
  viewerRole: PracticeTaskViewerRole,
) {
  const { tables, seedVersion } = await getPracticeTaskTables({ athleteId });
  const tasks = buildPracticeTasksFromTables({
    tables,
    athleteId,
    viewerRole,
  });
  return {
    athleteId,
    tasks,
    total: tasks.length,
    seedVersion,
  };
}

function drillAssignmentCompleted(assignment: SeedRow, submissions: SeedRow[]): boolean {
  const status = asString(assignment.status)?.toUpperCase();
  if (status === 'SUBMITTED' || status === 'COMPLETED') {
    return true;
  }
  return submissions.some((row) => asString(row.status)?.toUpperCase() === 'SUBMITTED');
}

function buildAthleteDrillAssignmentsFromTables(params: {
  tables: SeedTables;
  athleteId: string;
  includeCompleted: boolean;
}) {
  const drills = asRows(params.tables.drills);
  const submissions = asRows(params.tables.assignmentSubmissions);
  const assignments = asRows(params.tables.drillAssignments)
    .filter((assignment) => {
      if (asString(assignment.deletedAt)) {
        return false;
      }
      if (asString(assignment.athleteId) !== params.athleteId) {
        return false;
      }
      const assignmentSubmissions = submissions.filter(
        (row) => asString(row.drillAssignmentId) === asString(assignment.id),
      );
      return (
        params.includeCompleted || !drillAssignmentCompleted(assignment, assignmentSubmissions)
      );
    })
    .map((assignment) => {
      const assignmentId = asString(assignment.id);
      const drillId = asString(assignment.drillId);
      const assignmentSubmissions = submissions
        .filter((row) => asString(row.drillAssignmentId) === assignmentId)
        .sort((left, right) => parseDateMs(right.submittedAt) - parseDateMs(left.submittedAt));
      return {
        ...assignment,
        drill: drills.find((row) => asString(row.id) === drillId),
        submissions: assignmentSubmissions,
      };
    })
    .sort((left, right) => {
      const leftCompleted = drillAssignmentCompleted(left, asRows(left.submissions));
      const rightCompleted = drillAssignmentCompleted(right, asRows(right.submissions));
      if (leftCompleted !== rightCompleted) {
        return leftCompleted ? 1 : -1;
      }
      return parseDateMs((left as SeedRow).dueDate) - parseDateMs((right as SeedRow).dueDate);
    });

  return assignments;
}

async function getAthleteDrillAssignmentsPayload(athleteId: string, includeCompleted: boolean) {
  const { tables, seedVersion } = await getPracticeTaskTables({ athleteId });
  const assignments = buildAthleteDrillAssignmentsFromTables({
    tables,
    athleteId,
    includeCompleted,
  });
  return {
    athleteId,
    assignments,
    total: assignments.length,
    seedVersion,
  };
}

async function getDrillAssignmentDetailPayload(context: PracticeTaskAssignmentContext) {
  const payload = await getAthleteDrillAssignmentsPayload(context.athleteId, true);
  const assignment = payload.assignments.find(
    (entry) => asString((entry as SeedRow).id) === context.assignmentId,
  );
  if (!assignment) {
    throw notFound('Drill assignment not found', { assignmentId: context.assignmentId });
  }
  return {
    assignment,
    seedVersion: payload.seedVersion,
  };
}

function resolvePracticeTaskRisk(overdueCount: number, dueSoonCount: number): PracticeTaskRisk {
  if (overdueCount > 0) {
    return 'high';
  }
  if (dueSoonCount > 0) {
    return 'watch';
  }
  return 'stable';
}

async function getCoachPracticeFollowUpPayload(coachUserId: string) {
  const { tables, seedVersion } = await getPracticeTaskTables({ coachUserId });
  const reviewedTaskIds = new Set(
    asRows(tables.auditEvents).flatMap((row) => {
      const assignmentId = asString(row.resourceId);
      return asString(row.resourceType) === 'practice_task' &&
        asString(row.action) === 'practice_task.review' &&
        asString(row.result) === 'SUCCESS' &&
        assignmentId
        ? [`practice_task_drill_${assignmentId}`]
        : [];
    }),
  );
  const tasks = buildPracticeTasksFromTables({
    tables,
    coachUserId,
    viewerRole: 'coach',
  }).filter((task) => task.status === 'pending');
  const grouped = new Map<string, typeof tasks>();
  for (const task of tasks) {
    const existing = grouped.get(task.athleteId);
    if (existing) {
      existing.push(task);
    } else {
      grouped.set(task.athleteId, [task]);
    }
  }
  const queue = Array.from(grouped.entries()).map(([athleteId, athleteTasks]) => {
    const overdueCount = athleteTasks.filter((task) => task.timing === 'overdue').length;
    const dueSoonCount = athleteTasks.filter((task) => task.timing === 'due_soon').length;
    const nextDueAt = athleteTasks.reduce<string | null>((current, task) => {
      if (!current) {
        return task.dueAt;
      }
      return parseDateMs(task.dueAt) < parseDateMs(current) ? task.dueAt : current;
    }, null);
    const risk = resolvePracticeTaskRisk(overdueCount, dueSoonCount);
    const attentionScore = Math.min(100, overdueCount * 35 + dueSoonCount * 14);
    return {
      athleteId,
      athleteName: athleteTasks[0]?.athleteName ?? 'Athlete',
      coachId: coachUserId,
      taskIds: athleteTasks.map((task) => task.id),
      pendingCount: athleteTasks.length,
      reviewedCount: athleteTasks.filter(
        (task) => task.coachReviewedAt != null || reviewedTaskIds.has(task.id),
      ).length,
      overdueCount,
      dueSoonCount,
      nextDueAt,
      latestConfidence: null,
      latestMood: null,
      confidenceTrend: [],
      moodTrend: [],
      latestCoachActionAt: athleteTasks[0]?.lastCoachActionAt ?? null,
      risk,
      attentionScore,
      recommendedAction:
        risk === 'high'
          ? 'Message today and lock a 48h recovery plan.'
          : risk === 'watch'
            ? 'Send a completion nudge before deadline.'
            : 'No immediate intervention needed.',
    };
  });
  return {
    coachId: coachUserId,
    queue: queue.sort((left, right) => right.attentionScore - left.attentionScore),
    total: queue.length,
    seedVersion,
  };
}

function drillAssignmentIdFromPracticeTaskId(taskId: string): string {
  return taskId.startsWith('practice_task_drill_')
    ? taskId.slice('practice_task_drill_'.length)
    : taskId;
}

function normalizeIsoDateOrThrow(value: string, field: string): string {
  const ms = Date.parse(value);
  if (Number.isNaN(ms)) {
    throw badRequest(`${field} must be a valid ISO date`);
  }
  return new Date(ms).toISOString();
}

function isActingCoachAuth(request: FastifyRequest): boolean {
  const actingRole = request.auth?.actingRole ?? request.auth?.roles?.[0];
  return actingRole === 'coach';
}

async function assertCanCreateBadgeAward(
  request: FastifyRequest,
  athleteId: string,
): Promise<string> {
  const actorUserId = asString(request.auth?.userId);
  if (!actorUserId) {
    throw forbidden('Authenticated user is required');
  }
  if (isPrivilegedAdminAuth(request.auth)) {
    return actorUserId;
  }
  if (!isActingCoachAuth(request)) {
    throw forbidden('Only an assigned coach or privileged admin can award badges');
  }
  await assertCanWriteAthleteHealth(request, athleteId);
  return actorUserId;
}

async function assertCanCreateDrillAssignment(
  request: FastifyRequest,
  athleteId: string,
): Promise<string> {
  const actorUserId = asString(request.auth?.userId);
  if (!actorUserId) {
    throw forbidden('Authenticated user is required');
  }
  if (isPrivilegedAdminAuth(request.auth)) {
    return actorUserId;
  }
  if (!isActingCoachAuth(request)) {
    throw forbidden('Only an assigned coach or privileged admin can assign drills');
  }
  await assertCanWriteAthleteHealth(request, athleteId);
  return actorUserId;
}

function assertCanAssignDrillAuthor(
  drillAuthorUserId: string | undefined,
  actorUserId: string,
  isPrivilegedAdmin: boolean,
): void {
  if (drillAuthorUserId && drillAuthorUserId !== actorUserId && !isPrivilegedAdmin) {
    throw forbidden('Only the drill author or privileged admin can assign this drill');
  }
}

async function createDrillAssignmentPayload(
  body: z.infer<typeof drillAssignmentCreateRequestSchema>,
  actorUserId: string,
  isPrivilegedAdmin: boolean,
) {
  const dueDateIso = normalizeIsoDateOrThrow(body.dueDate, 'dueDate');
  const instructions = body.instructions?.trim() || null;

  if (getApiDataBackend() === 'db' && !shouldUseDbFixtureFallback()) {
    const prisma = getPrismaClientOrThrow();
    const [drill, athlete] = await Promise.all([
      prisma.drill.findFirst({
        where: {
          id: body.drillId,
          active: true,
          deletedAt: null,
        },
      }),
      prisma.athlete.findUnique({
        where: {
          id: body.athleteId,
        },
        select: {
          id: true,
        },
      }),
    ]);
    if (!drill) {
      throw notFound('Drill not found', { drillId: body.drillId });
    }
    if (!athlete) {
      throw notFound('Athlete not found', { athleteId: body.athleteId });
    }
    assertCanAssignDrillAuthor(drill.authorUserId ?? undefined, actorUserId, isPrivilegedAdmin);

    const assignment = await prisma.drillAssignment.create({
      data: {
        id: newId('dra'),
        drillId: drill.id,
        athleteId: body.athleteId,
        coachUserId: actorUserId,
        title: body.title ?? drill.title,
        instructions,
        requiresEvidence: body.requiresEvidence,
        dueDate: new Date(dueDateIso),
        status: 'ASSIGNED',
        createdByUserId: actorUserId,
        updatedByUserId: actorUserId,
      },
      include: {
        drill: true,
        submissions: {
          orderBy: {
            submittedAt: 'desc',
          },
        },
      },
    });

    return normalizeForJson({
      assignment,
      seedVersion: null,
    });
  }

  const store = getMutablePracticeTaskStore();
  const tables = store.tables;
  const drill = asRows(tables.drills).find(
    (row) =>
      asString(row.id) === body.drillId &&
      asBoolean(row.active) !== false &&
      !asString(row.deletedAt),
  );
  if (!drill) {
    throw notFound('Drill not found', { drillId: body.drillId });
  }
  if (!asRows(tables.athletes).some((row) => asString(row.id) === body.athleteId)) {
    throw notFound('Athlete not found', { athleteId: body.athleteId });
  }
  assertCanAssignDrillAuthor(asString(drill.authorUserId), actorUserId, isPrivilegedAdmin);

  const now = nowIso();
  const assignment = {
    id: newId('dra'),
    drillId: body.drillId,
    athleteId: body.athleteId,
    coachUserId: actorUserId,
    title: body.title ?? asString(drill.title) ?? null,
    instructions,
    requiresEvidence: body.requiresEvidence,
    dueDate: dueDateIso,
    status: 'ASSIGNED',
    createdByUserId: actorUserId,
    updatedByUserId: actorUserId,
    version: 1,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };
  mutableRows(tables, 'drillAssignments').push(assignment);

  return {
    assignment: {
      ...assignment,
      drill,
      submissions: [],
    },
    seedVersion: store.version,
  };
}

type PracticeTaskAssignmentContext = {
  assignmentId: string;
  athleteId: string;
  coachUserId: string;
};

async function getPracticeTaskAssignmentContext(
  taskId: string,
): Promise<PracticeTaskAssignmentContext> {
  const assignmentId = drillAssignmentIdFromPracticeTaskId(taskId);
  if (!assignmentId) {
    throw notFound('Practice task id is required');
  }

  if (getApiDataBackend() === 'db' && !shouldUseDbFixtureFallback()) {
    const prisma = getPrismaClientOrThrow();
    const assignment = await prisma.drillAssignment.findFirst({
      where: {
        id: assignmentId,
        deletedAt: null,
      },
      select: {
        id: true,
        athleteId: true,
        coachUserId: true,
      },
    });
    if (!assignment) {
      throw notFound('Practice task not found', { taskId });
    }
    return {
      assignmentId: assignment.id,
      athleteId: assignment.athleteId,
      coachUserId: assignment.coachUserId,
    };
  }

  const store = getApiDataBackend() === 'db' ? getDbFixtureStore() : getMarketplaceSeedStore();
  const assignment = asRows(store.tables.drillAssignments).find(
    (row) => asString(row.id) === assignmentId && !asString(row.deletedAt),
  );
  const athleteId = asString(assignment?.athleteId);
  const coachUserId = asString(assignment?.coachUserId);
  if (!assignment || !athleteId || !coachUserId) {
    throw notFound('Practice task not found', { taskId });
  }
  return {
    assignmentId,
    athleteId,
    coachUserId,
  };
}

function bumpSeedAssignmentVersion(row: SeedRow): void {
  row.version = (asNumber(row.version) ?? 0) + 1;
  row.updatedAt = nowIso();
}

function getMutablePracticeTaskStore() {
  return getApiDataBackend() === 'db' ? getDbFixtureStore() : getMarketplaceSeedStore();
}

async function updatePracticeTaskDueAt(
  context: PracticeTaskAssignmentContext,
  dueAt: string,
  actorUserId: string,
) {
  const dueAtIso = normalizeIsoDateOrThrow(dueAt, 'dueAt');
  if (getApiDataBackend() === 'db' && !shouldUseDbFixtureFallback()) {
    const prisma = getPrismaClientOrThrow();
    await prisma.drillAssignment.update({
      where: {
        id: context.assignmentId,
      },
      data: {
        dueDate: new Date(dueAtIso),
        updatedByUserId: actorUserId,
        version: {
          increment: 1,
        },
      },
    });
  } else {
    const store = getMutablePracticeTaskStore();
    const assignment = asRows(store.tables.drillAssignments).find(
      (row) => asString(row.id) === context.assignmentId,
    );
    if (!assignment) {
      throw notFound('Practice task not found', { taskId: context.assignmentId });
    }
    assignment.dueDate = dueAtIso;
    assignment.updatedByUserId = actorUserId;
    bumpSeedAssignmentVersion(assignment);
  }

  const payload = await getAthletePracticeTaskPayload(context.athleteId, 'coach');
  const task = payload.tasks.find((entry) => entry.drillAssignmentId === context.assignmentId);
  if (!task) {
    throw notFound('Updated practice task not found', { taskId: context.assignmentId });
  }
  return {
    task,
    seedVersion: payload.seedVersion,
  };
}

async function setPracticeTaskCompletion(
  context: PracticeTaskAssignmentContext,
  completed: boolean,
  actorUserId: string,
  completionNote?: string,
) {
  const now = nowIso();
  const note = completionNote?.trim();
  if (getApiDataBackend() === 'db' && !shouldUseDbFixtureFallback()) {
    const prisma = getPrismaClientOrThrow();
    await prisma.$transaction(async (tx) => {
      await tx.drillAssignment.update({
        where: {
          id: context.assignmentId,
        },
        data: {
          status: completed ? 'SUBMITTED' : 'ASSIGNED',
          updatedByUserId: actorUserId,
          version: {
            increment: 1,
          },
        },
      });

      if (completed) {
        const existingSubmission = await tx.assignmentSubmission.findFirst({
          where: {
            drillAssignmentId: context.assignmentId,
            status: 'SUBMITTED',
          },
          orderBy: {
            submittedAt: 'desc',
          },
        });
        if (existingSubmission) {
          await tx.assignmentSubmission.update({
            where: {
              id: existingSubmission.id,
            },
            data: {
              submittedByUserId: actorUserId,
              notes: note || existingSubmission.notes,
              submittedAt: new Date(now),
              status: 'SUBMITTED',
            },
          });
        } else {
          await tx.assignmentSubmission.create({
            data: {
              id: newId('asub'),
              drillAssignmentId: context.assignmentId,
              athleteId: context.athleteId,
              submittedByUserId: actorUserId,
              notes: note,
              status: 'SUBMITTED',
              submittedAt: new Date(now),
            },
          });
        }
      } else {
        await tx.assignmentSubmission.updateMany({
          where: {
            drillAssignmentId: context.assignmentId,
            status: 'SUBMITTED',
          },
          data: {
            status: 'RETRACTED',
          },
        });
      }
    });
  } else {
    const store = getMutablePracticeTaskStore();
    const assignment = asRows(store.tables.drillAssignments).find(
      (row) => asString(row.id) === context.assignmentId,
    );
    if (!assignment) {
      throw notFound('Practice task not found', { taskId: context.assignmentId });
    }
    assignment.status = completed ? 'SUBMITTED' : 'ASSIGNED';
    assignment.updatedByUserId = actorUserId;
    bumpSeedAssignmentVersion(assignment);

    const submissions = asRows(store.tables.assignmentSubmissions);
    if (completed) {
      const existingSubmission = submissions
        .filter(
          (row) =>
            asString(row.drillAssignmentId) === context.assignmentId &&
            asString(row.status) === 'SUBMITTED',
        )
        .sort((left, right) => parseDateMs(right.submittedAt) - parseDateMs(left.submittedAt))[0];
      if (existingSubmission) {
        existingSubmission.submittedByUserId = actorUserId;
        existingSubmission.notes = note || existingSubmission.notes;
        existingSubmission.status = 'SUBMITTED';
        existingSubmission.submittedAt = now;
        existingSubmission.updatedAt = now;
      } else {
        submissions.push({
          id: newId('asub'),
          drillAssignmentId: context.assignmentId,
          athleteId: context.athleteId,
          submittedByUserId: actorUserId,
          notes: note,
          status: 'SUBMITTED',
          submittedAt: now,
          createdAt: now,
          updatedAt: now,
        });
      }
    } else {
      for (const submission of submissions) {
        if (
          asString(submission.drillAssignmentId) === context.assignmentId &&
          asString(submission.status) === 'SUBMITTED'
        ) {
          submission.status = 'RETRACTED';
          submission.updatedAt = now;
        }
      }
    }
  }

  const payload = await getAthletePracticeTaskPayload(context.athleteId, 'coach');
  const task = payload.tasks.find((entry) => entry.drillAssignmentId === context.assignmentId);
  if (!task) {
    throw notFound('Updated practice task not found', { taskId: context.assignmentId });
  }
  return {
    task,
    seedVersion: payload.seedVersion,
  };
}

async function softRemoveDrillAssignment(
  context: PracticeTaskAssignmentContext,
  actorUserId: string,
) {
  const removedAt = nowIso();
  if (getApiDataBackend() === 'db' && !shouldUseDbFixtureFallback()) {
    const prisma = getPrismaClientOrThrow();
    await prisma.drillAssignment.update({
      where: {
        id: context.assignmentId,
      },
      data: {
        deletedAt: new Date(removedAt),
        updatedByUserId: actorUserId,
        version: {
          increment: 1,
        },
      },
    });
  } else {
    const store = getMutablePracticeTaskStore();
    const assignment = asRows(store.tables.drillAssignments).find(
      (row) => asString(row.id) === context.assignmentId && !asString(row.deletedAt),
    );
    if (!assignment) {
      throw notFound('Drill assignment not found', { assignmentId: context.assignmentId });
    }
    assignment.deletedAt = removedAt;
    assignment.updatedAt = removedAt;
    assignment.updatedByUserId = actorUserId;
    assignment.version = (asNumber(assignment.version) ?? 0) + 1;
  }

  return {
    assignment: {
      id: context.assignmentId,
      athleteId: context.athleteId,
      coachUserId: context.coachUserId,
      deletedAt: removedAt,
    },
    seedVersion: getApiDataBackend() === 'db' && !shouldUseDbFixtureFallback()
      ? null
      : getMutablePracticeTaskStore().version,
  };
}

function normalizePracticeTaskIds(taskIds: string[]): string[] {
  return Array.from(new Set(taskIds.map((taskId) => taskId.trim()).filter(Boolean)));
}

async function getPracticeTaskAssignmentContexts(
  taskIds: string[],
): Promise<PracticeTaskAssignmentContext[]> {
  const contexts = await Promise.all(
    normalizePracticeTaskIds(taskIds).map(async (taskId) => {
      try {
        return await getPracticeTaskAssignmentContext(taskId);
      } catch (error) {
        if (error instanceof ApiProblemError && error.code === 'RESOURCE_NOT_FOUND') {
          return null;
        }
        throw error;
      }
    }),
  );
  return contexts.filter((context): context is PracticeTaskAssignmentContext => context !== null);
}

async function getReadableAthleteIds(
  request: FastifyRequest,
  athleteIds: string[],
): Promise<Set<string>> {
  const uniqueAthleteIds = Array.from(new Set(athleteIds));
  const readableAthleteIds = await Promise.all(
    uniqueAthleteIds.map(async (athleteId) => {
      try {
        await assertCanReadAthleteHealth(request, athleteId);
        return athleteId;
      } catch (error) {
        if (!(error instanceof ApiProblemError) || error.status >= 500) {
          throw error;
        }
        return null;
      }
    }),
  );
  return new Set(readableAthleteIds.filter((athleteId): athleteId is string => athleteId !== null));
}

async function assertCanCoachActOnPracticeTask(
  request: FastifyRequest,
  context: PracticeTaskAssignmentContext,
): Promise<string> {
  const actorUserId = asString(request.auth?.userId);
  if (!actorUserId) {
    throw forbidden('Authenticated user is required');
  }
  const isPrivilegedAdmin = isPrivilegedAdminAuth(request.auth);
  if (!isPrivilegedAdmin) {
    await assertCanWriteAthleteHealth(request, context.athleteId);
  }
  if (actorUserId !== context.coachUserId && !isPrivilegedAdmin) {
    throw forbidden('Only the assigned coach or privileged admin can update task follow-up state');
  }
  return actorUserId;
}

async function recordPracticeTaskActionAudit(params: {
  request: FastifyRequest;
  context: PracticeTaskAssignmentContext;
  action: PracticeTaskActionAuditType;
  result: 'SUCCESS' | 'DENY';
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await recordAuditEvent({
    request: params.request,
    action: params.action,
    resourceType: 'practice_task',
    resourceId: params.context.assignmentId,
    subjectUserId: athleteOwnerUserId(params.context.athleteId),
    result: params.result,
    sensitiveRead: true,
    metadata: {
      taskId: `practice_task_drill_${params.context.assignmentId}`,
      athleteId: params.context.athleteId,
      ...(params.metadata ?? {}),
    },
  });
}

async function authorizePracticeTaskBulkAction(
  request: FastifyRequest,
  contexts: PracticeTaskAssignmentContext[],
  action: PracticeTaskActionAuditType,
  metadata?: Record<string, unknown>,
): Promise<string> {
  let actorUserId: string | null = null;
  for (const context of contexts) {
    try {
      actorUserId = await assertCanCoachActOnPracticeTask(request, context);
    } catch (error) {
      await recordPracticeTaskActionAudit({
        request,
        context,
        action,
        result: 'DENY',
        metadata,
      });
      throw error;
    }
  }
  const fallbackActorUserId = asString(request.auth?.userId);
  if (!actorUserId && !fallbackActorUserId) {
    throw forbidden('Authenticated user is required');
  }
  return actorUserId ?? fallbackActorUserId ?? '';
}

async function getAthleteSkillAssessmentPopulation(): Promise<SeedRow[]> {
  if (getApiDataBackend() === 'db') {
    if (shouldUseDbFixtureFallback()) {
      return asRows(getDbFixtureStore().tables.athleteSkillAssessments);
    }

    const prisma = getPrismaClientOrThrow();
    const assessments = await prisma.athleteSkillAssessment.findMany({
      select: {
        athleteId: true,
        skillDefinitionId: true,
        score: true,
        assessedAt: true,
      },
    });
    return normalizeForJson(assessments) as SeedRow[];
  }

  return asRows(getMarketplaceSeedStore().tables.athleteSkillAssessments);
}

function dateMs(value: unknown): number | null {
  if (value instanceof Date) {
    return value.getTime();
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim()) {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
}

function rowActivityMs(row: SeedRow): number | null {
  return (
    dateMs(row.assessedAt) ??
    dateMs(row.createdAt) ??
    dateMs(row.updatedAt) ??
    dateMs(row.completedAt)
  );
}

function dateOnlyFromMs(value: number | null): string | undefined {
  return value == null ? undefined : new Date(value).toISOString().slice(0, 10);
}

function latestActivityMs(rows: SeedRow[]): number | null {
  let latest: number | null = null;
  for (const row of rows) {
    const value = rowActivityMs(row);
    if (value != null && (latest == null || value > latest)) {
      latest = value;
    }
  }
  return latest;
}

function periodStartMs(period: AthleteAnalyticsPeriod, anchorMs: number): number | null {
  if (period === 'ALL') {
    return null;
  }
  const start = new Date(anchorMs);
  if (period === 'WEEK') {
    start.setUTCDate(start.getUTCDate() - 7);
  } else if (period === 'MONTH') {
    start.setUTCMonth(start.getUTCMonth() - 1);
  } else if (period === 'QUARTER') {
    start.setUTCMonth(start.getUTCMonth() - 3);
  } else {
    start.setUTCFullYear(start.getUTCFullYear() - 1);
  }
  return start.getTime();
}

function isInPeriod(row: SeedRow, startMs: number | null, anchorMs: number): boolean {
  if (startMs == null) {
    return true;
  }
  const value = rowActivityMs(row);
  return value != null && value >= startMs && value <= anchorMs;
}

function sessionKey(row: SeedRow, fallbackPrefix: string, index: number): string {
  return (
    asString(row.bookingId) ??
    asString(row.groupSessionId) ??
    asString(row.id) ??
    `${fallbackPrefix}_${index}`
  );
}

function normalizeSkillAssessmentScore(value: unknown): number {
  const score = asNumber(value);
  if (score == null || score <= 0) {
    return 0;
  }
  const denominator = score <= 5 ? 5 : score <= 10 ? 10 : 100;
  return Math.max(0, Math.min(100, Math.round((score / denominator) * 100)));
}

function normalizedSkillLookup(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toLowerCase();
}

function buildSkillProgress(
  skillAssessments: SeedRow[],
  skillDefinitions: SeedRow[],
  skillName?: string,
  populationAssessments?: SeedRow[],
) {
  const averageLevelBySkillDefinitionId = populationAssessments
    ? calculateAverageLevelBySkillDefinition(populationAssessments)
    : new Map<string, number>();
  const definitionsById = new Map(
    skillDefinitions
      .map((definition) => [asString(definition.id), definition] as const)
      .filter((entry): entry is [string, SeedRow] => Boolean(entry[0])),
  );
  const requestedSkill = normalizedSkillLookup(skillName);
  const grouped = new Map<string, SeedRow[]>();

  for (const assessment of skillAssessments) {
    const skillDefinitionId = asString(assessment.skillDefinitionId);
    if (!skillDefinitionId) {
      continue;
    }
    const definition = definitionsById.get(skillDefinitionId);
    if (requestedSkill) {
      const matchesName = normalizedSkillLookup(definition?.name) === requestedSkill;
      const matchesCode = normalizedSkillLookup(definition?.code) === requestedSkill;
      if (!matchesName && !matchesCode) {
        continue;
      }
    }
    const existing = grouped.get(skillDefinitionId) ?? [];
    existing.push(assessment);
    grouped.set(skillDefinitionId, existing);
  }

  return [...grouped.entries()]
    .map(([skillDefinitionId, assessments]) => {
      const definition = definitionsById.get(skillDefinitionId);
      const sorted = [...assessments].sort((a, b) => {
        const aMs = rowActivityMs(a) ?? 0;
        const bMs = rowActivityMs(b) ?? 0;
        return aMs - bMs;
      });
      const latest = sorted[sorted.length - 1];
      const previous = sorted.length > 1 ? sorted[sorted.length - 2] : latest;
      const currentLevel = normalizeSkillAssessmentScore(latest?.score);
      const previousLevel = normalizeSkillAssessmentScore(previous?.score);
      const changePercent =
        previousLevel > 0
          ? Math.round(((currentLevel - previousLevel) / previousLevel) * 1000) / 10
          : 0;

      return {
        skillName: asString(definition?.name) ?? skillDefinitionId,
        category: asString(definition?.category) ?? 'General',
        currentLevel,
        previousLevel,
        changePercent,
        averageLevel: averageLevelBySkillDefinitionId.get(skillDefinitionId),
        history: sorted.map((assessment) => ({
          date: dateOnlyFromMs(rowActivityMs(assessment)) ?? nowIso().slice(0, 10),
          level: normalizeSkillAssessmentScore(assessment.score),
        })),
      };
    })
    .sort((a, b) => a.category.localeCompare(b.category) || a.skillName.localeCompare(b.skillName));
}

function calculateAverageLevelBySkillDefinition(
  populationAssessments: SeedRow[],
): Map<string, number> {
  const latestByAthleteAndSkill = new Map<string, SeedRow>();
  for (const assessment of populationAssessments) {
    const athleteId = asString(assessment.athleteId);
    const skillDefinitionId = asString(assessment.skillDefinitionId);
    if (!athleteId || !skillDefinitionId) {
      continue;
    }
    const key = `${athleteId}:${skillDefinitionId}`;
    const existing = latestByAthleteAndSkill.get(key);
    if (!existing || (rowActivityMs(assessment) ?? 0) > (rowActivityMs(existing) ?? 0)) {
      latestByAthleteAndSkill.set(key, assessment);
    }
  }

  const scoresBySkillDefinition = new Map<string, number[]>();
  for (const assessment of latestByAthleteAndSkill.values()) {
    const skillDefinitionId = asString(assessment.skillDefinitionId);
    if (!skillDefinitionId) {
      continue;
    }
    const scores = scoresBySkillDefinition.get(skillDefinitionId) ?? [];
    scores.push(normalizeSkillAssessmentScore(assessment.score));
    scoresBySkillDefinition.set(skillDefinitionId, scores);
  }

  return new Map(
    [...scoresBySkillDefinition.entries()].map(([skillDefinitionId, scores]) => [
      skillDefinitionId,
      Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length),
    ]),
  );
}

function normalizeGoalCategoryForClient(value: unknown): string {
  if (value === 'Technical') return 'BALL_SKILLS';
  if (value === 'Attacking') return 'ATTACKING';
  if (value === 'Defending') return 'DEFENDING';
  if (value === 'Tactical') return 'GAME_SENSE';
  if (value === 'Character') return 'CHARACTER';
  if (
    typeof value === 'string' &&
    GOAL_CATEGORIES.includes(value as (typeof GOAL_CATEGORIES)[number])
  ) {
    return value;
  }
  return 'OTHER';
}

function normalizeGoalStatusForClient(value: unknown): string {
  return typeof value === 'string' &&
    GOAL_STATUSES.includes(value as (typeof GOAL_STATUSES)[number])
    ? value
    : 'ACTIVE';
}

function normalizeGoalCreatorForClient(value: unknown): string {
  return value === 'COACH' || value === 'ATHLETE' || value === 'PARENT' ? value : 'COACH';
}

function buildGoalForAnalytics(goal: SeedRow, milestones: SeedRow[], fallbackAthleteId: string) {
  const goalId = asString(goal.id) ?? '';
  const athleteId = asString(goal.athleteId) ?? fallbackAthleteId;
  const goalMilestones = milestones
    .filter((milestone) => asString(milestone.goalId) === goalId)
    .map((milestone) => ({
      id: asString(milestone.id) ?? '',
      goalId,
      title: asString(milestone.title) ?? 'Milestone',
      isCompleted: milestone.isCompleted === true || asString(milestone.status) === 'COMPLETED',
      completedAt: asString(milestone.completedAt) ?? undefined,
      order: asNumber(milestone.order) ?? asNumber(milestone.sortOrder) ?? 0,
    }))
    .filter((milestone) => milestone.id)
    .sort((a, b) => a.order - b.order);
  const completedMilestones = goalMilestones.filter((milestone) => milestone.isCompleted).length;
  const derivedProgress =
    goalMilestones.length > 0
      ? Math.round((completedMilestones / goalMilestones.length) * 100)
      : normalizeGoalStatusForClient(goal.status) === 'COMPLETED'
        ? 100
        : 0;

  return {
    id: goalId,
    userId: asString(goal.userId) ?? asString(goal.ownerUserId) ?? athleteOwnerUserId(athleteId),
    athleteId,
    title: asString(goal.title) ?? 'Goal',
    description: asString(goal.description) ?? asString(goal.notes) ?? undefined,
    category: normalizeGoalCategoryForClient(goal.category),
    targetDate: asString(goal.targetDate) ?? undefined,
    status: normalizeGoalStatusForClient(goal.status),
    progress: asNumber(goal.progress) ?? derivedProgress,
    milestones: goalMilestones,
    createdBy: normalizeGoalCreatorForClient(goal.createdBy),
    createdById:
      asString(goal.createdById) ??
      asString(goal.creatorUserId) ??
      asString(goal.createdByUserId) ??
      '',
    createdAt: asString(goal.createdAt) ?? nowIso(),
    updatedAt: asString(goal.updatedAt) ?? asString(goal.createdAt) ?? nowIso(),
  };
}

function averageRating(feedbackRows: SeedRow[]): number {
  const ratings = feedbackRows
    .map((row) => asNumber(row.rating))
    .filter((rating): rating is number => rating != null);
  if (!ratings.length) {
    return 0;
  }
  return Math.round((ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length) * 10) / 10;
}

function calculatePercentileRank(athleteId: string, populationAssessments: SeedRow[]): number {
  const latestByAthleteAndSkill = new Map<string, SeedRow>();
  for (const assessment of populationAssessments) {
    const assessmentAthleteId = asString(assessment.athleteId);
    const skillDefinitionId = asString(assessment.skillDefinitionId);
    if (!assessmentAthleteId || !skillDefinitionId) {
      continue;
    }
    const key = `${assessmentAthleteId}:${skillDefinitionId}`;
    const existing = latestByAthleteAndSkill.get(key);
    if (!existing || (rowActivityMs(assessment) ?? 0) > (rowActivityMs(existing) ?? 0)) {
      latestByAthleteAndSkill.set(key, assessment);
    }
  }

  const scoresByAthlete = new Map<string, number[]>();
  for (const assessment of latestByAthleteAndSkill.values()) {
    const assessmentAthleteId = asString(assessment.athleteId);
    if (!assessmentAthleteId) {
      continue;
    }
    const scores = scoresByAthlete.get(assessmentAthleteId) ?? [];
    scores.push(normalizeSkillAssessmentScore(assessment.score));
    scoresByAthlete.set(assessmentAthleteId, scores);
  }

  const averages = [...scoresByAthlete.entries()]
    .map(([assessmentAthleteId, scores]) => ({
      athleteId: assessmentAthleteId,
      average: scores.reduce((sum, score) => sum + score, 0) / scores.length,
    }))
    .filter((entry) => Number.isFinite(entry.average));
  const athleteAverage = averages.find((entry) => entry.athleteId === athleteId)?.average;
  if (athleteAverage == null || !averages.length) {
    return 0;
  }
  const belowOrEqual = averages.filter((entry) => entry.average <= athleteAverage).length;
  return Math.round((belowOrEqual / averages.length) * 100);
}

async function buildAthleteAnalyticsPayload(athleteId: string, period: AthleteAnalyticsPeriod) {
  const [progress, goalsPayload, populationAssessments] = await Promise.all([
    getAthleteProgressPayload(athleteId),
    getAthleteGoalsPayload(athleteId),
    getAthleteSkillAssessmentPopulation(),
  ]);
  const activityRows = [
    ...progress.sessionNotes,
    ...progress.sessionFeedback,
    ...progress.skillAssessments,
  ];
  const anchorMs = latestActivityMs(activityRows) ?? Date.now();
  const startMs = periodStartMs(period, anchorMs);
  const sessionRows = activityRows.map((row, index) => ({
    row,
    key: sessionKey(row, 'session', index),
  }));
  const totalSessions = new Set(sessionRows.map((entry) => entry.key)).size;
  const sessionsThisPeriod = new Set(
    sessionRows
      .filter((entry) => isInPeriod(entry.row, startMs, anchorMs))
      .map((entry) => entry.key),
  ).size;
  const periodFeedback = progress.sessionFeedback.filter((row) =>
    isInPeriod(row, startMs, anchorMs),
  );
  const skills = buildSkillProgress(
    progress.skillAssessments,
    progress.skillDefinitions,
    undefined,
    populationAssessments,
  );
  const improvingSkills = skills.filter((skill) => skill.currentLevel > skill.previousLevel).length;
  const activeGoals = goalsPayload.goals
    .filter((goal) => normalizeGoalStatusForClient(goal.status) === 'ACTIVE')
    .map((goal) => buildGoalForAnalytics(goal, goalsPayload.milestones, athleteId));
  const completedGoals = goalsPayload.goals
    .filter((goal) => normalizeGoalStatusForClient(goal.status) === 'COMPLETED')
    .map((goal) => buildGoalForAnalytics(goal, goalsPayload.milestones, athleteId));

  return normalizeForJson({
    athleteId,
    analytics: {
      athleteId,
      period,
      totalSessions,
      sessionsThisPeriod,
      averageSessionRating: averageRating(periodFeedback),
      attendanceRate: totalSessions > 0 ? 100 : 0,
      skills,
      activeGoals,
      completedGoals,
      improvementRate: skills.length > 0 ? Math.round((improvingSkills / skills.length) * 100) : 0,
      consistencyScore: Math.min(100, sessionsThisPeriod * 10),
      percentileRank: calculatePercentileRank(athleteId, populationAssessments),
      lastSessionDate: dateOnlyFromMs(latestActivityMs(activityRows)),
    },
    seedVersion: progress.seedVersion ?? goalsPayload.seedVersion,
  });
}

type SquadActivityType =
  | 'session_completed'
  | 'badge_earned'
  | 'feedback_received'
  | 'practice_logged';

type SquadActivityItem = {
  id: string;
  type: SquadActivityType;
  athleteId: string;
  athleteName: string;
  athleteInitials: string;
  isSelf: boolean;
  happenedAt: string;
  title: string;
  detail: string;
};

function activeSquadMembership(row: SeedRow): boolean {
  const status = (asString(row.status) ?? 'active').toLowerCase();
  return !asString(row.deletedAt) && status === 'active';
}

function athleteDisplayName(row: SeedRow | undefined, athleteId: string): string {
  const firstName = asString(row?.firstName);
  const lastName = asString(row?.lastName);
  const combinedName = [firstName, lastName].filter(Boolean).join(' ').trim();
  return (
    asString(row?.displayName) ??
    asString(row?.name) ??
    (combinedName.length > 0 ? combinedName : undefined) ??
    `Athlete ${athleteId.slice(-4)}`
  );
}

function initialsForName(name: string): string {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
  return initials || 'A';
}

function readableServiceType(value: unknown): string {
  return String(value ?? 'session')
    .replace(/[_-]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

function truncateDetail(value: unknown, fallback: string, maxLength = 180): string {
  const raw = String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ');
  const detail = raw.length > 0 ? raw : fallback;
  return detail.length > maxLength ? `${detail.slice(0, maxLength - 3)}...` : detail;
}

function isPublicFeedback(row: SeedRow): boolean {
  const visibility = (asString(row.visibility) ?? 'public').toLowerCase();
  return visibility === 'public' && !asString(row.deletedAt);
}

function isPublicSessionNote(row: SeedRow): boolean {
  const visibility = (asString(row.visibility) ?? '').toUpperCase();
  return visibility === 'PUBLIC' && !asString(row.deletedAt);
}

function inLookback(row: SeedRow, field: string, startMs: number, endMs: number): boolean {
  const value = dateMs(row[field]);
  return value != null && value >= startMs && value <= endMs;
}

function buildSquadActivityFromTables(params: {
  tables: SeedTables;
  version: string | null;
  athleteId: string;
  lookbackDays: number;
  limit: number;
}) {
  const anchor = Date.now();
  const startMs = anchor - params.lookbackDays * 24 * 60 * 60 * 1000;
  const weekStartMs = anchor - 7 * 24 * 60 * 60 * 1000;
  const todayIso = new Date(anchor).toISOString().slice(0, 10);
  const ownMemberships = asRows(params.tables.squadMemberships).filter(
    (row) => asString(row.athleteId) === params.athleteId && activeSquadMembership(row),
  );
  const squadIds = new Set(
    ownMemberships
      .map((row) => asString(row.squadId))
      .filter((squadId): squadId is string => Boolean(squadId)),
  );
  if (squadIds.size === 0) {
    return {
      athleteId: params.athleteId,
      squadIds: [],
      items: [] as SquadActivityItem[],
      summary: {
        activeToday: 0,
        sessionsThisWeek: 0,
        badgesThisWeek: 0,
        totalItems: 0,
        peerCount: 0,
      },
      seedVersion: params.version,
    };
  }

  const peerMemberships = asRows(params.tables.squadMemberships).filter(
    (row) => squadIds.has(asString(row.squadId) ?? '') && activeSquadMembership(row),
  );
  const peerAthleteIds = new Set(
    peerMemberships
      .map((row) => asString(row.athleteId))
      .filter((athleteId): athleteId is string => Boolean(athleteId)),
  );
  const athleteById = new Map(
    asRows(params.tables.athletes).flatMap((row) => {
      const id = asString(row.id);
      return id ? [[id, row] as const] : [];
    }),
  );
  const athleteMeta = (athleteId: string) => {
    const name = athleteDisplayName(athleteById.get(athleteId), athleteId);
    return {
      athleteName: name,
      athleteInitials: initialsForName(name),
      isSelf: athleteId === params.athleteId,
    };
  };
  const activeParticipants = asRows(params.tables.bookingParticipants).filter(
    (row) => peerAthleteIds.has(asString(row.athleteId) ?? '') && !asString(row.deletedAt),
  );
  const participantsByBookingId = new Map<string, SeedRow[]>();
  for (const participant of activeParticipants) {
    const bookingId = asString(participant.bookingId);
    if (!bookingId) {
      continue;
    }
    const existing = participantsByBookingId.get(bookingId) ?? [];
    existing.push(participant);
    participantsByBookingId.set(bookingId, existing);
  }
  const badgeDefinitionById = new Map(
    asRows(params.tables.badgeDefinitions).flatMap((row) => {
      const id = asString(row.id);
      return id ? [[id, row] as const] : [];
    }),
  );

  const items: SquadActivityItem[] = [];

  for (const booking of asRows(params.tables.bookings)) {
    const bookingId = asString(booking.id);
    if (
      !bookingId ||
      asString(booking.status) !== 'COMPLETED' ||
      asString(booking.deletedAt) ||
      !inLookback(booking, 'scheduledAt', startMs, anchor)
    ) {
      continue;
    }
    for (const participant of participantsByBookingId.get(bookingId) ?? []) {
      const participantAthleteId = asString(participant.athleteId);
      if (!participantAthleteId) {
        continue;
      }
      const happenedAt = asString(booking.scheduledAt) ?? nowIso();
      const meta = athleteMeta(participantAthleteId);
      const serviceType = readableServiceType(booking.serviceType);
      items.push({
        id: `squad_activity_session_${bookingId}_${participantAthleteId}`,
        type: 'session_completed',
        athleteId: participantAthleteId,
        ...meta,
        happenedAt,
        title: `${meta.athleteName} completed a session`,
        detail: `Completed ${serviceType || 'session'} with their coach.`,
      });
    }
  }

  for (const note of asRows(params.tables.sessionNotes)) {
    const noteAthleteId = asString(note.athleteId);
    if (
      !noteAthleteId ||
      !peerAthleteIds.has(noteAthleteId) ||
      !isPublicSessionNote(note) ||
      !inLookback(note, 'createdAt', startMs, anchor)
    ) {
      continue;
    }
    const meta = athleteMeta(noteAthleteId);
    items.push({
      id: `squad_activity_note_${asString(note.id) ?? `${noteAthleteId}_${items.length}`}`,
      type: 'feedback_received',
      athleteId: noteAthleteId,
      ...meta,
      happenedAt: asString(note.createdAt) ?? nowIso(),
      title: `${meta.athleteName} received coach feedback`,
      detail: truncateDetail(note.noteText, 'Coach added public session feedback.'),
    });
  }

  for (const feedback of asRows(params.tables.sessionFeedback)) {
    const feedbackAthleteId = asString(feedback.athleteId);
    if (
      !feedbackAthleteId ||
      !peerAthleteIds.has(feedbackAthleteId) ||
      !isPublicFeedback(feedback) ||
      !inLookback(feedback, 'createdAt', startMs, anchor)
    ) {
      continue;
    }
    const rating = asNumber(feedback.rating);
    const meta = athleteMeta(feedbackAthleteId);
    items.push({
      id: `squad_activity_feedback_${asString(feedback.id) ?? `${feedbackAthleteId}_${items.length}`}`,
      type: 'feedback_received',
      athleteId: feedbackAthleteId,
      ...meta,
      happenedAt: asString(feedback.createdAt) ?? nowIso(),
      title: `${meta.athleteName} received session feedback`,
      detail: truncateDetail(
        feedback.publicComment,
        rating != null
          ? `Rated ${rating}/5 for the session.`
          : 'Public session feedback was added.',
      ),
    });
  }

  for (const badge of asRows(params.tables.athleteBadges)) {
    const badgeAthleteId = asString(badge.athleteId);
    if (
      !badgeAthleteId ||
      !peerAthleteIds.has(badgeAthleteId) ||
      !inLookback(badge, 'awardedAt', startMs, anchor)
    ) {
      continue;
    }
    const definition = badgeDefinitionById.get(asString(badge.badgeDefinitionId) ?? '');
    const badgeName = asString(definition?.name) ?? 'development badge';
    const meta = athleteMeta(badgeAthleteId);
    items.push({
      id: `squad_activity_badge_${asString(badge.id) ?? `${badgeAthleteId}_${items.length}`}`,
      type: 'badge_earned',
      athleteId: badgeAthleteId,
      ...meta,
      happenedAt: asString(badge.awardedAt) ?? asString(badge.createdAt) ?? nowIso(),
      title: `${meta.athleteName} earned ${badgeName}`,
      detail: truncateDetail(
        definition?.description ?? definition?.category,
        `${badgeName} badge earned.`,
      ),
    });
  }

  const sortedItems = items.sort(
    (left, right) => (dateMs(right.happenedAt) ?? 0) - (dateMs(left.happenedAt) ?? 0),
  );
  const activeTodayAthletes = new Set(
    sortedItems
      .filter((item) => item.happenedAt.slice(0, 10) === todayIso)
      .map((item) => item.athleteId),
  );

  return {
    athleteId: params.athleteId,
    squadIds: [...squadIds].sort(),
    items: sortedItems.slice(0, params.limit),
    summary: {
      activeToday: activeTodayAthletes.size,
      sessionsThisWeek: sortedItems.filter(
        (item) =>
          item.type === 'session_completed' && (dateMs(item.happenedAt) ?? 0) >= weekStartMs,
      ).length,
      badgesThisWeek: sortedItems.filter(
        (item) => item.type === 'badge_earned' && (dateMs(item.happenedAt) ?? 0) >= weekStartMs,
      ).length,
      totalItems: sortedItems.length,
      peerCount: Math.max(0, peerAthleteIds.size - (peerAthleteIds.has(params.athleteId) ? 1 : 0)),
    },
    seedVersion: params.version,
  };
}

async function getAthleteSquadActivityPayload(
  athleteId: string,
  options: { lookbackDays: number; limit: number },
) {
  if (getApiDataBackend() === 'db') {
    if (shouldUseDbFixtureFallback()) {
      const store = getDbFixtureStore();
      return buildSquadActivityFromTables({
        tables: store.tables,
        version: store.version,
        athleteId,
        ...options,
      });
    }

    const prisma = getPrismaClientOrThrow();
    const start = new Date(Date.now() - options.lookbackDays * 24 * 60 * 60 * 1000);
    const ownMemberships = await prisma.squadMembership.findMany({
      where: {
        athleteId,
        deletedAt: null,
        status: { in: ['active', 'ACTIVE'] },
      },
      select: {
        squadId: true,
      },
    });
    const squadIds = [...new Set(ownMemberships.map((row) => row.squadId))];
    if (squadIds.length === 0) {
      return buildSquadActivityFromTables({
        tables: {},
        version: null,
        athleteId,
        ...options,
      });
    }

    const squadMemberships = await prisma.squadMembership.findMany({
      where: {
        squadId: { in: squadIds },
        deletedAt: null,
        status: { in: ['active', 'ACTIVE'] },
      },
      include: {
        athlete: true,
      },
    });
    const peerAthleteIds = [
      ...new Set(squadMemberships.map((row) => row.athleteId).filter(Boolean)),
    ];
    const [bookings, sessionNotes, sessionFeedback, athleteBadges] = await Promise.all([
      prisma.booking.findMany({
        where: {
          status: 'COMPLETED',
          deletedAt: null,
          scheduledAt: {
            gte: start,
          },
          participants: {
            some: {
              athleteId: { in: peerAthleteIds },
              deletedAt: null,
            },
          },
        },
        include: {
          participants: {
            where: {
              athleteId: { in: peerAthleteIds },
              deletedAt: null,
            },
          },
        },
      }),
      prisma.sessionNote.findMany({
        where: {
          athleteId: { in: peerAthleteIds },
          visibility: 'PUBLIC',
          deletedAt: null,
          createdAt: {
            gte: start,
          },
        },
      }),
      prisma.sessionFeedback.findMany({
        where: {
          athleteId: { in: peerAthleteIds },
          visibility: 'public',
          deletedAt: null,
          createdAt: {
            gte: start,
          },
        },
      }),
      prisma.athleteBadge.findMany({
        where: {
          athleteId: { in: peerAthleteIds },
          awardedAt: {
            gte: start,
          },
        },
        include: {
          badgeDefinition: true,
        },
      }),
    ]);

    const tables: SeedTables = {
      athletes: squadMemberships.map((row) => normalizeForJson(row.athlete) as SeedRow),
      squadMemberships: squadMemberships.map((row) => normalizeForJson(row) as SeedRow),
      bookings: bookings.map((row) => normalizeForJson(row) as SeedRow),
      bookingParticipants: bookings.flatMap((booking) =>
        booking.participants.map((row) => normalizeForJson(row) as SeedRow),
      ),
      sessionNotes: sessionNotes.map((row) => normalizeForJson(row) as SeedRow),
      sessionFeedback: sessionFeedback.map((row) => normalizeForJson(row) as SeedRow),
      athleteBadges: athleteBadges.map((row) => normalizeForJson(row) as SeedRow),
      badgeDefinitions: athleteBadges.map(
        (row) => normalizeForJson(row.badgeDefinition) as SeedRow,
      ),
    };
    return buildSquadActivityFromTables({
      tables,
      version: null,
      athleteId,
      ...options,
    });
  }

  const store = getMarketplaceSeedStore();
  return buildSquadActivityFromTables({
    tables: store.tables,
    version: store.version,
    athleteId,
    ...options,
  });
}

function skillDefinitionCode(skillName: string): string {
  const normalized = skillName
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return normalized || 'GENERAL';
}

function skillDefinitionCategory(skillName: string): string {
  const normalized = normalizedSkillLookup(skillName);
  if (
    normalized.includes('work rate') ||
    normalized.includes('pressing') ||
    normalized.includes('tempo')
  ) {
    return 'Physical';
  }
  if (
    normalized.includes('communication') ||
    normalized.includes('attitude') ||
    normalized.includes('coachability')
  ) {
    return 'Mental';
  }
  if (
    normalized.includes('positioning') ||
    normalized.includes('vision') ||
    normalized.includes('movement')
  ) {
    return 'Tactical';
  }
  return 'Technical';
}

function findSeedSkillDefinition(tables: SeedTables, skillName: string): SeedRow | undefined {
  const code = skillDefinitionCode(skillName);
  return asRows(tables.skillDefinitions).find((definition) => {
    const definitionCode = asString(definition.code);
    const definitionName = asString(definition.name);
    return (
      definitionCode === code ||
      normalizedSkillLookup(definitionName) === normalizedSkillLookup(skillName)
    );
  });
}

function ensureSeedSkillDefinition(tables: SeedTables, skillName: string): SeedRow {
  const existing = findSeedSkillDefinition(tables, skillName);
  if (existing) {
    return existing;
  }
  const now = nowIso();
  const created = {
    id: newId('skd'),
    code: skillDefinitionCode(skillName),
    name: skillName,
    category: skillDefinitionCategory(skillName),
    description: `${skillName} definition created from coach skill update.`,
    active: true,
    createdAt: now,
    updatedAt: now,
  };
  asRows(tables.skillDefinitions).push(created);
  return created;
}

function latestAssessmentForSkill(
  assessments: SeedRow[],
  athleteId: string,
  skillDefinitionId: string,
): SeedRow | undefined {
  return assessments
    .filter(
      (assessment) =>
        asString(assessment.athleteId) === athleteId &&
        asString(assessment.skillDefinitionId) === skillDefinitionId,
    )
    .sort((a, b) => (rowActivityMs(b) ?? 0) - (rowActivityMs(a) ?? 0))[0];
}

async function assertCanCreateAthleteSkillUpdate(request: FastifyRequest, athleteId: string) {
  if (isPrivilegedAdminAuth(request.auth)) {
    return;
  }
  const actingRole = request.auth?.actingRole ?? request.auth?.roles?.[0];
  if (actingRole !== 'coach') {
    throw forbidden('Only an assigned coach or privileged admin can update athlete skills');
  }
  await assertCanWriteAthleteHealth(request, athleteId);
}

async function assertCanManageCoachObservation(request: FastifyRequest, athleteId: string) {
  if (isPrivilegedAdminAuth(request.auth)) {
    return;
  }
  const actingRole = request.auth?.actingRole ?? request.auth?.roles?.[0];
  if (actingRole !== 'coach') {
    throw forbidden('Only an assigned coach can manage coach observations');
  }
  await assertCanWriteAthleteHealth(request, athleteId);
}

interface CoachObservationPayload {
  id: string;
  athleteId: string;
  coachId: string;
  coachName: string;
  category: CoachObservationCategory;
  text: string;
  isPrivate: boolean;
  createdAt: string;
  updatedAt: string;
}

function normalizeCoachObservationCategory(value: unknown): CoachObservationCategory {
  const parsed = coachObservationCategorySchema.safeParse(value);
  return parsed.success ? parsed.data : 'OTHER';
}

function isCoachObservationRow(row: SeedRow): boolean {
  const metadata = coerceMetadata(row.metadataJson);
  return asString(metadata.source) === 'coach-observation' && !asString(row.deletedAt);
}

function mapCoachObservationRow(row: SeedRow): CoachObservationPayload {
  const metadata = coerceMetadata(row.metadataJson);
  const visibility = asString(row.visibility);
  return {
    id: asString(row.id) ?? '',
    athleteId: asString(row.athleteId) ?? '',
    coachId: asString(row.coachUserId) ?? asString(row.createdByUserId) ?? '',
    coachName:
      asString(metadata.coachName) ??
      asString(row.coachName) ??
      asString(row.coachUserId) ??
      asString(row.createdByUserId) ??
      'Coach',
    category: normalizeCoachObservationCategory(metadata.category),
    text: asString(row.noteText) ?? '',
    isPrivate: visibility === 'PRIVATE' || asBoolean(metadata.isPrivate) === true,
    createdAt: isoStringOrNow(row.createdAt),
    updatedAt: isoStringOrNow(row.updatedAt ?? row.createdAt),
  };
}

function getMutableCoachObservationRows(): { rows: SeedRow[]; seedVersion?: string } | null {
  if (getApiDataBackend() === 'seed') {
    const store = getMarketplaceSeedStore();
    return {
      rows: mutableRows(store.tables, 'sessionNotes'),
      seedVersion: store.version,
    };
  }

  if (shouldUseDbFixtureFallback()) {
    const store = getDbFixtureStore();
    return {
      rows: mutableRows(store.tables, 'sessionNotes'),
      seedVersion: store.version,
    };
  }

  return null;
}

function findSeedUserName(tables: SeedTables, userId: string): string | undefined {
  return asString(asRows(tables.users).find((row) => asString(row.id) === userId)?.name);
}

function seedTablesForCurrentBackend(): SeedTables | null {
  if (getApiDataBackend() === 'seed') {
    return getMarketplaceSeedStore().tables;
  }
  return shouldUseDbFixtureFallback() ? getDbFixtureStore().tables : null;
}

async function resolveCoachObservationName(authUserId: string): Promise<string> {
  const seedTables = seedTablesForCurrentBackend();
  const seedName = seedTables ? findSeedUserName(seedTables, authUserId) : undefined;
  if (seedName) {
    return seedName;
  }

  if (getApiDataBackend() === 'db' && !shouldUseDbFixtureFallback()) {
    const prisma = getPrismaClientOrThrow();
    const user = await prisma.user.findUnique({
      where: { id: authUserId },
      select: { name: true },
    });
    if (user?.name) {
      return user.name;
    }
  }

  return 'Coach';
}

async function listCoachObservations(params: {
  athleteId: string;
  authUserId: string;
  includeAll: boolean;
}): Promise<{ observations: CoachObservationPayload[]; seedVersion?: string }> {
  const table = getMutableCoachObservationRows();
  if (table) {
    const observations = table.rows
      .filter(
        (row) =>
          isCoachObservationRow(row) &&
          asString(row.athleteId) === params.athleteId &&
          (params.includeAll || asString(row.coachUserId) === params.authUserId),
      )
      .map(mapCoachObservationRow)
      .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt));
    return {
      observations,
      seedVersion: table.seedVersion,
    };
  }

  const prisma = getPrismaClientOrThrow();
  const rows = await prisma.sessionNote.findMany({
    where: {
      athleteId: params.athleteId,
      deletedAt: null,
      ...(params.includeAll ? {} : { coachUserId: params.authUserId }),
    },
    orderBy: { createdAt: 'desc' },
  });
  return {
    observations: rows
      .map((row) => normalizeForJson(row) as SeedRow)
      .filter(isCoachObservationRow)
      .map(mapCoachObservationRow),
  };
}

async function findCoachObservationById(
  observationId: string,
): Promise<{ row: SeedRow; seedVersion?: string } | null> {
  const table = getMutableCoachObservationRows();
  if (table) {
    const row = table.rows.find((entry) => asString(entry.id) === observationId);
    return row && isCoachObservationRow(row) ? { row, seedVersion: table.seedVersion } : null;
  }

  const prisma = getPrismaClientOrThrow();
  const row = await prisma.sessionNote.findUnique({ where: { id: observationId } });
  if (!row) {
    return null;
  }
  const normalized = normalizeForJson(row) as SeedRow;
  return isCoachObservationRow(normalized) ? { row: normalized } : null;
}

function assertCoachObservationOwner(row: SeedRow, authUserId: string): void {
  if (asString(row.coachUserId) === authUserId || asString(row.createdByUserId) === authUserId) {
    return;
  }
  throw forbidden('Only the coach who wrote this observation can change it');
}

async function createCoachObservation(params: {
  athleteId: string;
  authUserId: string;
  body: CoachObservationInput;
}): Promise<{ observation: CoachObservationPayload; seedVersion?: string }> {
  const now = nowIso();
  const coachName = await resolveCoachObservationName(params.authUserId);
  const row: SeedRow = {
    id: newId('snt'),
    bookingId: null,
    groupSessionId: null,
    athleteId: params.athleteId,
    coachUserId: params.authUserId,
    visibility: params.body.isPrivate ? 'PRIVATE' : 'PUBLIC',
    noteText: params.body.text,
    privateNotesEncrypted: null,
    metadataJson: {
      source: 'coach-observation',
      category: params.body.category,
      isPrivate: params.body.isPrivate,
      coachName,
    },
    createdByUserId: params.authUserId,
    updatedByUserId: params.authUserId,
    version: 1,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    deletedByUserId: null,
  };

  const table = getMutableCoachObservationRows();
  if (table) {
    table.rows.push(row);
    return {
      observation: mapCoachObservationRow(row),
      seedVersion: table.seedVersion,
    };
  }

  const prisma = getPrismaClientOrThrow();
  const created = await prisma.sessionNote.create({
    data: {
      id: asString(row.id) ?? newId('snt'),
      bookingId: null,
      groupSessionId: null,
      athleteId: params.athleteId,
      coachUserId: params.authUserId,
      visibility: params.body.isPrivate ? 'PRIVATE' : 'PUBLIC',
      noteText: params.body.text,
      privateNotesEncrypted: null,
      metadataJson: row.metadataJson as never,
      createdByUserId: params.authUserId,
      updatedByUserId: params.authUserId,
    },
  });
  return {
    observation: mapCoachObservationRow(normalizeForJson(created) as SeedRow),
  };
}

async function updateCoachObservation(params: {
  observationId: string;
  authUserId: string;
  body: CoachObservationUpdateInput;
}): Promise<{ observation: CoachObservationPayload; seedVersion?: string }> {
  const existing = await findCoachObservationById(params.observationId);
  if (!existing) {
    throw notFound('Coach observation not found', { observationId: params.observationId });
  }
  assertCoachObservationOwner(existing.row, params.authUserId);

  const metadata = {
    ...coerceMetadata(existing.row.metadataJson),
    source: 'coach-observation',
    ...(params.body.category !== undefined ? { category: params.body.category } : {}),
    ...(params.body.isPrivate !== undefined ? { isPrivate: params.body.isPrivate } : {}),
  };
  const visibility =
    params.body.isPrivate !== undefined
      ? params.body.isPrivate
        ? 'PRIVATE'
        : 'PUBLIC'
      : asString(existing.row.visibility) === 'PRIVATE'
        ? 'PRIVATE'
        : 'PUBLIC';

  const table = getMutableCoachObservationRows();
  if (table) {
    const row = table.rows.find((entry) => asString(entry.id) === params.observationId);
    if (!row) {
      throw notFound('Coach observation not found', { observationId: params.observationId });
    }
    row.visibility = visibility;
    if (params.body.text !== undefined) {
      row.noteText = params.body.text;
    }
    row.metadataJson = metadata;
    row.updatedByUserId = params.authUserId;
    row.updatedAt = nowIso();
    row.version = (asNumber(row.version) ?? 1) + 1;
    return {
      observation: mapCoachObservationRow(row),
      seedVersion: table.seedVersion,
    };
  }

  const prisma = getPrismaClientOrThrow();
  const updated = await prisma.sessionNote.update({
    where: { id: params.observationId },
    data: {
      visibility,
      ...(params.body.text !== undefined ? { noteText: params.body.text } : {}),
      metadataJson: metadata as never,
      updatedByUserId: params.authUserId,
      version: { increment: 1 },
    },
  });
  return {
    observation: mapCoachObservationRow(normalizeForJson(updated) as SeedRow),
  };
}

async function removeCoachObservation(params: {
  observationId: string;
  authUserId: string;
}): Promise<{ seedVersion?: string }> {
  const existing = await findCoachObservationById(params.observationId);
  if (!existing) {
    throw notFound('Coach observation not found', { observationId: params.observationId });
  }
  assertCoachObservationOwner(existing.row, params.authUserId);

  const table = getMutableCoachObservationRows();
  if (table) {
    const row = table.rows.find((entry) => asString(entry.id) === params.observationId);
    if (!row) {
      throw notFound('Coach observation not found', { observationId: params.observationId });
    }
    row.deletedAt = nowIso();
    row.deletedByUserId = params.authUserId;
    row.updatedByUserId = params.authUserId;
    row.updatedAt = row.deletedAt;
    row.version = (asNumber(row.version) ?? 1) + 1;
    return {
      seedVersion: table.seedVersion,
    };
  }

  const prisma = getPrismaClientOrThrow();
  await prisma.sessionNote.update({
    where: { id: params.observationId },
    data: {
      deletedAt: new Date(),
      deletedByUserId: params.authUserId,
      updatedByUserId: params.authUserId,
      version: { increment: 1 },
    },
  });
  return {};
}

async function assertCanReadSelfAssessment(request: FastifyRequest, athleteId: string) {
  if (isPrivilegedAdminAuth(request.auth)) {
    return;
  }
  await assertCanReadAthleteHealth(request, athleteId);
}

async function createAthleteSkillUpdate(
  athleteId: string,
  body: AthleteSkillUpdateRequest,
  assessorUserId: string,
  privilegedSourceOverride: boolean,
) {
  const assessedAt = parseOptionalDate(body.assessedAt) ?? new Date();
  const sourceBookingId = body.bookingId ?? body.sessionId ?? null;
  if (assessedAt.getTime() > Date.now() + 5 * 60_000) {
    throw badRequest('assessedAt cannot be more than five minutes in the future');
  }
  const assessmentId = `ska_${crypto
    .createHash('sha256')
    .update(`${assessorUserId}:${athleteId}:${body.idempotencyKey}`)
    .digest('hex')
    .slice(0, 32)}`;
  const code = skillDefinitionCode(body.skillName);

  const assertReplayMatches = (
    skillAssessment: {
      athleteId: string;
      skillDefinitionId: string;
      assessorUserId: string;
      score: number;
      notes: string | null;
      bookingId: string | null;
      assessedAt: Date | string;
    },
    skillDefinition: { id: string; code: string },
  ) => {
    const assessedAtMatches =
      !body.assessedAt ||
      new Date(skillAssessment.assessedAt).getTime() === new Date(body.assessedAt).getTime();
    if (
      skillAssessment.athleteId !== athleteId ||
      skillAssessment.assessorUserId !== assessorUserId ||
      skillAssessment.skillDefinitionId !== skillDefinition.id ||
      skillDefinition.code !== code ||
      skillAssessment.score !== body.score ||
      skillAssessment.notes !== (body.notes ?? null) ||
      skillAssessment.bookingId !== sourceBookingId ||
      !assessedAtMatches
    ) {
      throw conflict('Idempotency key was already used with a different skill update');
    }
  };

  const responsePayload = (params: {
    skillAssessment: unknown;
    skillDefinition: unknown;
    previousScore: number | null;
    replayed: boolean;
    seedVersion: string | null;
  }) =>
    normalizeForJson({
      ...params,
      score: body.score,
    });

  if (getApiDataBackend() === 'db' && !shouldUseDbFixtureFallback()) {
    const prisma = getPrismaClientOrThrow();
    try {
      return await prisma.$transaction(async (tx) => {
        const athlete = await tx.athlete.findUnique({
          where: { id: athleteId },
          select: { id: true },
        });
        if (!athlete) {
          throw notFound('Athlete not found');
        }

        if (sourceBookingId) {
          const booking = await tx.booking.findFirst({
            where: {
              id: sourceBookingId,
              deletedAt: null,
              ...(privilegedSourceOverride ? {} : { coachUserId: assessorUserId }),
              participants: {
                some: { athleteId, deletedAt: null },
              },
            },
            select: { id: true },
          });
          const session =
            booking || body.bookingId
              ? null
              : await tx.groupSession.findFirst({
                  where: {
                    id: sourceBookingId,
                    deletedAt: null,
                    ...(privilegedSourceOverride ? {} : { coachUserId: assessorUserId }),
                    OR: [
                      { registrations: { some: { athleteId, deletedAt: null } } },
                      { rsvps: { some: { athleteId, deletedAt: null } } },
                    ],
                  },
                  select: { id: true },
                });
          if (!booking && !session) {
            throw forbidden('Skill update source does not belong to this coach and athlete');
          }
        }

        const skillDefinition = await tx.skillDefinition.upsert({
          where: { code },
          update: {},
          create: {
            id: newId('skd'),
            code,
            name: body.skillName,
            category: skillDefinitionCategory(body.skillName),
            description: `${body.skillName} definition created from coach skill update.`,
            active: true,
          },
        });
        if (!skillDefinition.active) {
          throw conflict('This skill definition is inactive');
        }

        const previousAssessment = await tx.athleteSkillAssessment.findFirst({
          where: {
            athleteId,
            skillDefinitionId: skillDefinition.id,
            id: { not: assessmentId },
          },
          orderBy: { assessedAt: 'desc' },
        });
        const existingAssessment = await tx.athleteSkillAssessment.findUnique({
          where: { id: assessmentId },
        });
        if (existingAssessment) {
          assertReplayMatches(existingAssessment, skillDefinition);
          return responsePayload({
            skillAssessment: existingAssessment,
            skillDefinition,
            previousScore: previousAssessment?.score ?? null,
            replayed: true,
            seedVersion: null,
          });
        }

        const skillAssessment = await tx.athleteSkillAssessment.create({
          data: {
            id: assessmentId,
            athleteId,
            skillDefinitionId: skillDefinition.id,
            assessorUserId,
            score: body.score,
            notes: body.notes ?? null,
            bookingId: sourceBookingId,
            assessedAt,
          },
        });
        return responsePayload({
          skillAssessment,
          skillDefinition,
          previousScore: previousAssessment?.score ?? null,
          replayed: false,
          seedVersion: null,
        });
      }, API_DB_TRANSACTION_OPTIONS);
    } catch (error) {
      const prismaError = error as { code?: unknown };
      if (prismaError.code !== 'P2002') {
        throw error;
      }
      const existingAssessment = await prisma.athleteSkillAssessment.findUnique({
        where: { id: assessmentId },
        include: { skillDefinition: true },
      });
      if (!existingAssessment) {
        throw error;
      }
      assertReplayMatches(existingAssessment, existingAssessment.skillDefinition);
      const previousAssessment = await prisma.athleteSkillAssessment.findFirst({
        where: {
          athleteId,
          skillDefinitionId: existingAssessment.skillDefinitionId,
          id: { not: assessmentId },
        },
        orderBy: { assessedAt: 'desc' },
      });
      return responsePayload({
        skillAssessment: existingAssessment,
        skillDefinition: existingAssessment.skillDefinition,
        previousScore: previousAssessment?.score ?? null,
        replayed: true,
        seedVersion: null,
      });
    }
  }

  const store = getApiDataBackend() === 'db' ? getDbFixtureStore() : getMarketplaceSeedStore();
  const tables = store.tables;
  if (!asRows(tables.athletes).some((athlete) => asString(athlete.id) === athleteId)) {
    throw notFound('Athlete not found');
  }
  if (sourceBookingId) {
    const booking = asRows(tables.bookings).find(
      (row) =>
        asString(row.id) === sourceBookingId &&
        !asString(row.deletedAt) &&
        (privilegedSourceOverride || asString(row.coachUserId) === assessorUserId) &&
        asRows(tables.bookingParticipants).some(
          (participant) =>
            asString(participant.bookingId) === sourceBookingId &&
            asString(participant.athleteId) === athleteId &&
            !asString(participant.deletedAt),
        ),
    );
    const session =
      booking || body.bookingId
        ? undefined
        : asRows(tables.groupSessions).find(
            (row) =>
              asString(row.id) === sourceBookingId &&
              !asString(row.deletedAt) &&
              (privilegedSourceOverride || asString(row.coachUserId) === assessorUserId) &&
              (asRows(tables.groupSessionRegistrations).some(
                (registration) =>
                  asString(registration.groupSessionId) === sourceBookingId &&
                  asString(registration.athleteId) === athleteId &&
                  !asString(registration.deletedAt),
              ) ||
                asRows(tables.sessionRsvps).some(
                  (rsvp) =>
                    asString(rsvp.groupSessionId) === sourceBookingId &&
                    asString(rsvp.athleteId) === athleteId &&
                    !asString(rsvp.deletedAt),
                )),
          );
    if (!booking && !session) {
      throw forbidden('Skill update source does not belong to this coach and athlete');
    }
  }
  const skillDefinition = ensureSeedSkillDefinition(tables, body.skillName);
  const skillDefinitionId = asString(skillDefinition.id) ?? '';
  if (!asBoolean(skillDefinition.active)) {
    throw conflict('This skill definition is inactive');
  }
  const assessments = asRows(tables.athleteSkillAssessments);
  const previousAssessment = latestAssessmentForSkill(
    assessments.filter((assessment) => asString(assessment.id) !== assessmentId),
    athleteId,
    skillDefinitionId,
  );
  const existingAssessment = assessments.find(
    (assessment) => asString(assessment.id) === assessmentId,
  );
  if (existingAssessment) {
    assertReplayMatches(
      {
        athleteId: asString(existingAssessment.athleteId) ?? '',
        skillDefinitionId: asString(existingAssessment.skillDefinitionId) ?? '',
        assessorUserId: asString(existingAssessment.assessorUserId) ?? '',
        score: asNumber(existingAssessment.score) ?? Number.NaN,
        notes: asString(existingAssessment.notes) ?? null,
        bookingId: asString(existingAssessment.bookingId) ?? null,
        assessedAt: asString(existingAssessment.assessedAt) ?? '',
      },
      { id: skillDefinitionId, code: asString(skillDefinition.code) ?? '' },
    );
    return responsePayload({
      skillAssessment: existingAssessment,
      skillDefinition,
      previousScore: asNumber(previousAssessment?.score) ?? null,
      replayed: true,
      seedVersion: store.version,
    });
  }
  const skillAssessment = {
    id: assessmentId,
    athleteId,
    skillDefinitionId,
    assessorUserId,
    score: body.score,
    notes: body.notes ?? null,
    bookingId: sourceBookingId,
    assessedAt: assessedAt.toISOString(),
    createdAt: nowIso(),
  };
  assessments.push(skillAssessment);
  return responsePayload({
    skillAssessment,
    skillDefinition,
    previousScore: asNumber(previousAssessment?.score) ?? null,
    replayed: false,
    seedVersion: store.version,
  });
}

function mutableGoalStore() {
  if (getApiDataBackend() === 'db') {
    return shouldUseDbFixtureFallback() ? getDbFixtureStore() : null;
  }
  return getMarketplaceSeedStore();
}

function parseOptionalDate(value: string | null | undefined): Date | null {
  if (!value) {
    return null;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw badRequest('Invalid date value');
  }
  return parsed;
}

function athleteOwnerUserId(athleteId: string): string {
  return athleteId.startsWith('ath_') ? `usr_${athleteId.slice('ath_'.length)}` : athleteId;
}

function createSeedGoal(
  tables: Record<string, unknown>,
  athleteId: string,
  actorUserId: string,
  body: z.infer<typeof goalCreateRequestSchema>,
) {
  const now = nowIso();
  const goal = {
    id: newId('gol'),
    athleteId,
    ownerUserId: athleteOwnerUserId(athleteId),
    creatorUserId: actorUserId,
    title: body.title,
    category: body.category,
    status: 'ACTIVE',
    targetDate: body.targetDate ?? null,
    notes: body.description ?? null,
    createdByUserId: actorUserId,
    updatedByUserId: actorUserId,
    version: 1,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    deletedByUserId: null,
  };
  const milestones = body.milestones.map((title, index) => ({
    id: newId('glm'),
    goalId: goal.id,
    title,
    status: 'PENDING',
    dueDate: null,
    completedAt: null,
    sortOrder: index,
    createdByUserId: actorUserId,
    updatedByUserId: actorUserId,
    version: 1,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    deletedByUserId: null,
  }));
  asRows(tables.goals).push(goal);
  asRows(tables.goalMilestones).push(...milestones);
  return { goal, milestones };
}

function findSeedGoal(tables: Record<string, unknown>, goalId: string): SeedRow {
  const goal = asRows(tables.goals).find(
    (row) => asString(row.id) === goalId && !asString(row.deletedAt),
  );
  if (!goal) {
    throw notFound('Goal not found', { goalId });
  }
  return goal;
}

function seedGoalMilestones(tables: Record<string, unknown>, goalId: string): SeedRow[] {
  return asRows(tables.goalMilestones)
    .filter((row) => asString(row.goalId) === goalId && !asString(row.deletedAt))
    .sort((left, right) => (asNumber(left.sortOrder) ?? 0) - (asNumber(right.sortOrder) ?? 0));
}

function updateSeedGoal(
  tables: Record<string, unknown>,
  goalId: string,
  actorUserId: string,
  body: z.infer<typeof goalUpdateRequestSchema>,
) {
  const goal = findSeedGoal(tables, goalId);
  if (body.title !== undefined) {
    goal.title = body.title;
  }
  if (body.description !== undefined) {
    goal.notes = body.description;
  }
  if (body.category !== undefined) {
    goal.category = body.category;
  }
  if (body.status !== undefined) {
    goal.status = body.status;
  }
  if (body.targetDate !== undefined) {
    goal.targetDate = body.targetDate;
  }
  goal.updatedByUserId = actorUserId;
  goal.updatedAt = nowIso();
  goal.version = (asNumber(goal.version) ?? 0) + 1;
  return { goal, milestones: seedGoalMilestones(tables, goalId) };
}

function updateSeedGoalProgress(
  tables: Record<string, unknown>,
  goalId: string,
  actorUserId: string,
  body: z.infer<typeof goalProgressUpdateRequestSchema>,
) {
  const goal = findSeedGoal(tables, goalId);
  const now = nowIso();
  const completedMilestoneIds = body.completedMilestoneIds
    ? new Set(body.completedMilestoneIds)
    : null;
  if (completedMilestoneIds) {
    for (const milestone of seedGoalMilestones(tables, goalId)) {
      const isCompleted = completedMilestoneIds.has(asString(milestone.id) ?? '');
      milestone.status = isCompleted ? 'COMPLETED' : 'PENDING';
      milestone.completedAt = isCompleted ? (asString(milestone.completedAt) ?? now) : null;
      milestone.updatedByUserId = actorUserId;
      milestone.updatedAt = now;
      milestone.version = (asNumber(milestone.version) ?? 0) + 1;
    }
  }
  goal.progress = body.progress;
  if (body.progress >= 100) {
    goal.status = 'COMPLETED';
  }
  goal.updatedByUserId = actorUserId;
  goal.updatedAt = now;
  goal.version = (asNumber(goal.version) ?? 0) + 1;
  return { goal, milestones: seedGoalMilestones(tables, goalId) };
}

function deleteSeedGoal(
  tables: Record<string, unknown>,
  goalId: string,
  actorUserId: string,
): void {
  const goal = findSeedGoal(tables, goalId);
  const now = nowIso();
  goal.deletedAt = now;
  goal.deletedByUserId = actorUserId;
  goal.updatedByUserId = actorUserId;
  goal.updatedAt = now;
  for (const milestone of seedGoalMilestones(tables, goalId)) {
    milestone.deletedAt = now;
    milestone.deletedByUserId = actorUserId;
    milestone.updatedByUserId = actorUserId;
    milestone.updatedAt = now;
  }
}

async function createGoalPayload(
  athleteId: string,
  actorUserId: string,
  body: z.infer<typeof goalCreateRequestSchema>,
) {
  const store = mutableGoalStore();
  if (store) {
    return createSeedGoal(store.tables as Record<string, unknown>, athleteId, actorUserId, body);
  }

  const prisma = getPrismaClientOrThrow();
  const created = await prisma.goal.create({
    data: {
      id: newId('gol'),
      athleteId,
      ownerUserId: athleteOwnerUserId(athleteId),
      creatorUserId: actorUserId,
      title: body.title,
      category: body.category,
      status: 'ACTIVE',
      targetDate: parseOptionalDate(body.targetDate),
      notes: body.description ?? null,
      createdByUserId: actorUserId,
      updatedByUserId: actorUserId,
      milestones: {
        create: body.milestones.map((title, index) => ({
          id: newId('glm'),
          title,
          status: 'PENDING',
          sortOrder: index,
          createdByUserId: actorUserId,
          updatedByUserId: actorUserId,
        })),
      },
    },
    include: {
      milestones: {
        where: { deletedAt: null },
        orderBy: { sortOrder: 'asc' },
      },
    },
  });
  const { milestones, ...goal } = created;
  return normalizeForJson({ goal, milestones });
}

async function getGoalForWrite(goalId: string): Promise<SeedRow> {
  const store = mutableGoalStore();
  if (store) {
    return findSeedGoal(store.tables as Record<string, unknown>, goalId);
  }

  const prisma = getPrismaClientOrThrow();
  const goal = await prisma.goal.findFirst({
    where: { id: goalId, deletedAt: null },
  });
  if (!goal) {
    throw notFound('Goal not found', { goalId });
  }
  return normalizeForJson(goal) as SeedRow;
}

async function getGoalPayloadById(goalId: string) {
  const store = mutableGoalStore();
  if (store) {
    const tables = store.tables as Record<string, unknown>;
    const goal = findSeedGoal(tables, goalId);
    return { goal, milestones: seedGoalMilestones(tables, goalId), seedVersion: store.version };
  }

  const prisma = getPrismaClientOrThrow();
  const found = await prisma.goal.findFirst({
    where: { id: goalId, deletedAt: null },
    include: {
      milestones: {
        where: { deletedAt: null },
        orderBy: { sortOrder: 'asc' },
      },
    },
  });
  if (!found) {
    throw notFound('Goal not found', { goalId });
  }
  const { milestones, ...goal } = found;
  return normalizeForJson({ goal, milestones, seedVersion: null });
}

async function updateGoalPayload(
  goalId: string,
  actorUserId: string,
  body: z.infer<typeof goalUpdateRequestSchema>,
) {
  const store = mutableGoalStore();
  if (store) {
    return updateSeedGoal(store.tables as Record<string, unknown>, goalId, actorUserId, body);
  }

  const prisma = getPrismaClientOrThrow();
  const updated = await prisma.goal.update({
    where: { id: goalId },
    data: {
      ...(body.title !== undefined ? { title: body.title } : {}),
      ...(body.description !== undefined ? { notes: body.description } : {}),
      ...(body.category !== undefined ? { category: body.category } : {}),
      ...(body.status !== undefined ? { status: body.status } : {}),
      ...(body.targetDate !== undefined ? { targetDate: parseOptionalDate(body.targetDate) } : {}),
      updatedByUserId: actorUserId,
      version: { increment: 1 },
    },
    include: {
      milestones: {
        where: { deletedAt: null },
        orderBy: { sortOrder: 'asc' },
      },
    },
  });
  const { milestones, ...goal } = updated;
  return normalizeForJson({ goal, milestones });
}

async function updateGoalProgressPayload(
  goalId: string,
  actorUserId: string,
  body: z.infer<typeof goalProgressUpdateRequestSchema>,
) {
  const store = mutableGoalStore();
  if (store) {
    return updateSeedGoalProgress(
      store.tables as Record<string, unknown>,
      goalId,
      actorUserId,
      body,
    );
  }

  const prisma = getPrismaClientOrThrow();
  const updated = await prisma.$transaction(async (tx) => {
    const milestones = await tx.goalMilestone.findMany({
      where: { goalId, deletedAt: null },
      orderBy: { sortOrder: 'asc' },
    });
    const completedMilestoneIds = body.completedMilestoneIds
      ? new Set(body.completedMilestoneIds)
      : null;
    if (completedMilestoneIds) {
      await Promise.all(
        milestones.map((milestone) => {
          const isCompleted = completedMilestoneIds.has(milestone.id);
          return tx.goalMilestone.update({
            where: { id: milestone.id },
            data: {
              status: isCompleted ? 'COMPLETED' : 'PENDING',
              completedAt: isCompleted ? (milestone.completedAt ?? new Date()) : null,
              updatedByUserId: actorUserId,
              version: { increment: 1 },
            },
          });
        }),
      );
    }

    return tx.goal.update({
      where: { id: goalId },
      data: {
        progress: body.progress,
        ...(body.progress >= 100 ? { status: 'COMPLETED' } : {}),
        updatedByUserId: actorUserId,
        version: { increment: 1 },
      },
      include: {
        milestones: {
          where: { deletedAt: null },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });
  });
  const { milestones, ...goal } = updated;
  return normalizeForJson({ goal, milestones });
}

async function deleteGoalPayload(goalId: string, actorUserId: string): Promise<void> {
  const store = mutableGoalStore();
  if (store) {
    deleteSeedGoal(store.tables as Record<string, unknown>, goalId, actorUserId);
    return;
  }

  const prisma = getPrismaClientOrThrow();
  const now = new Date();
  await prisma.$transaction([
    prisma.goalMilestone.updateMany({
      where: { goalId, deletedAt: null },
      data: {
        deletedAt: now,
        deletedByUserId: actorUserId,
        updatedByUserId: actorUserId,
        version: { increment: 1 },
      },
    }),
    prisma.goal.update({
      where: { id: goalId },
      data: {
        deletedAt: now,
        deletedByUserId: actorUserId,
        updatedByUserId: actorUserId,
        version: { increment: 1 },
      },
    }),
  ]);
}

function findSeedGoalMilestone(
  tables: Record<string, unknown>,
  goalId: string,
  milestoneId: string,
): SeedRow {
  const milestone = asRows(tables.goalMilestones).find(
    (row) =>
      asString(row.id) === milestoneId &&
      asString(row.goalId) === goalId &&
      !asString(row.deletedAt),
  );
  if (!milestone) {
    throw notFound('Goal milestone not found', { goalId, milestoneId });
  }
  return milestone;
}

async function resolveGoalIdForMilestone(milestoneId: string): Promise<string> {
  const store = mutableGoalStore();
  if (store) {
    const milestone = asRows(store.tables.goalMilestones).find(
      (row) => asString(row.id) === milestoneId && !asString(row.deletedAt),
    );
    const goalId = asString(milestone?.goalId);
    if (!goalId) {
      throw notFound('Goal milestone not found', { milestoneId });
    }
    return goalId;
  }

  const prisma = getPrismaClientOrThrow();
  const milestone = await prisma.goalMilestone.findFirst({
    where: { id: milestoneId, deletedAt: null },
    select: { goalId: true },
  });
  if (!milestone) {
    throw notFound('Goal milestone not found', { milestoneId });
  }
  return milestone.goalId;
}

function touchSeedGoal(goal: SeedRow, actorUserId: string): void {
  goal.updatedByUserId = actorUserId;
  goal.updatedAt = nowIso();
  goal.version = (asNumber(goal.version) ?? 0) + 1;
}

function createSeedGoalMilestone(
  tables: Record<string, unknown>,
  goalId: string,
  actorUserId: string,
  body: z.infer<typeof goalMilestoneCreateRequestSchema>,
) {
  const goal = findSeedGoal(tables, goalId);
  const now = nowIso();
  const maxOrder = Math.max(
    -1,
    ...seedGoalMilestones(tables, goalId).map((milestone) => asNumber(milestone.sortOrder) ?? 0),
  );
  const milestone = {
    id: newId('glm'),
    goalId,
    title: body.title,
    status: 'PENDING',
    dueDate: body.dueDate ?? null,
    completedAt: null,
    sortOrder: maxOrder + 1,
    createdByUserId: actorUserId,
    updatedByUserId: actorUserId,
    version: 1,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    deletedByUserId: null,
  };
  asRows(tables.goalMilestones).push(milestone);
  touchSeedGoal(goal, actorUserId);
  return { goal, milestones: seedGoalMilestones(tables, goalId), milestone };
}

function updateSeedGoalMilestone(
  tables: Record<string, unknown>,
  goalId: string,
  milestoneId: string,
  actorUserId: string,
  body: z.infer<typeof goalMilestoneUpdateRequestSchema>,
) {
  const goal = findSeedGoal(tables, goalId);
  const milestone = findSeedGoalMilestone(tables, goalId, milestoneId);
  const now = nowIso();
  if (body.title !== undefined) {
    milestone.title = body.title;
  }
  if (body.dueDate !== undefined) {
    milestone.dueDate = body.dueDate;
  }
  if (body.sortOrder !== undefined) {
    milestone.sortOrder = body.sortOrder;
  }
  if (body.status !== undefined) {
    milestone.status = body.status;
    milestone.completedAt =
      body.status === 'COMPLETED' ? (asString(milestone.completedAt) ?? now) : null;
  }
  milestone.updatedByUserId = actorUserId;
  milestone.updatedAt = now;
  milestone.version = (asNumber(milestone.version) ?? 0) + 1;
  touchSeedGoal(goal, actorUserId);
  return { goal, milestones: seedGoalMilestones(tables, goalId), milestone };
}

function deleteSeedGoalMilestone(
  tables: Record<string, unknown>,
  goalId: string,
  milestoneId: string,
  actorUserId: string,
) {
  const goal = findSeedGoal(tables, goalId);
  const milestone = findSeedGoalMilestone(tables, goalId, milestoneId);
  const now = nowIso();
  milestone.deletedAt = now;
  milestone.deletedByUserId = actorUserId;
  milestone.updatedByUserId = actorUserId;
  milestone.updatedAt = now;
  milestone.version = (asNumber(milestone.version) ?? 0) + 1;
  touchSeedGoal(goal, actorUserId);
}

async function createGoalMilestonePayload(
  goalId: string,
  actorUserId: string,
  body: z.infer<typeof goalMilestoneCreateRequestSchema>,
) {
  const store = mutableGoalStore();
  if (store) {
    return createSeedGoalMilestone(
      store.tables as Record<string, unknown>,
      goalId,
      actorUserId,
      body,
    );
  }

  const prisma = getPrismaClientOrThrow();
  return prisma.$transaction(async (tx) => {
    const maxSortOrder = await tx.goalMilestone.aggregate({
      where: { goalId, deletedAt: null },
      _max: { sortOrder: true },
    });
    const milestone = await tx.goalMilestone.create({
      data: {
        id: newId('glm'),
        goalId,
        title: body.title,
        status: 'PENDING',
        dueDate: parseOptionalDate(body.dueDate),
        sortOrder: (maxSortOrder._max.sortOrder ?? -1) + 1,
        createdByUserId: actorUserId,
        updatedByUserId: actorUserId,
      },
    });
    await tx.goal.update({
      where: { id: goalId },
      data: {
        updatedByUserId: actorUserId,
        version: { increment: 1 },
      },
    });
    const payload = await tx.goal.findFirst({
      where: { id: goalId, deletedAt: null },
      include: {
        milestones: {
          where: { deletedAt: null },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });
    if (!payload) {
      throw notFound('Goal not found', { goalId });
    }
    const { milestones, ...goal } = payload;
    return normalizeForJson({ goal, milestones, milestone });
  });
}

async function updateGoalMilestonePayload(
  goalId: string,
  milestoneId: string,
  actorUserId: string,
  body: z.infer<typeof goalMilestoneUpdateRequestSchema>,
) {
  const store = mutableGoalStore();
  if (store) {
    return updateSeedGoalMilestone(
      store.tables as Record<string, unknown>,
      goalId,
      milestoneId,
      actorUserId,
      body,
    );
  }

  const prisma = getPrismaClientOrThrow();
  return prisma.$transaction(async (tx) => {
    const current = await tx.goalMilestone.findFirst({
      where: { id: milestoneId, goalId, deletedAt: null },
    });
    if (!current) {
      throw notFound('Goal milestone not found', { goalId, milestoneId });
    }
    const completedAt =
      body.status === undefined
        ? undefined
        : body.status === 'COMPLETED'
          ? (current.completedAt ?? new Date())
          : null;
    const milestone = await tx.goalMilestone.update({
      where: { id: milestoneId },
      data: {
        ...(body.title !== undefined ? { title: body.title } : {}),
        ...(body.status !== undefined ? { status: body.status, completedAt } : {}),
        ...(body.dueDate !== undefined ? { dueDate: parseOptionalDate(body.dueDate) } : {}),
        ...(body.sortOrder !== undefined ? { sortOrder: body.sortOrder } : {}),
        updatedByUserId: actorUserId,
        version: { increment: 1 },
      },
    });
    await tx.goal.update({
      where: { id: goalId },
      data: {
        updatedByUserId: actorUserId,
        version: { increment: 1 },
      },
    });
    const payload = await tx.goal.findFirst({
      where: { id: goalId, deletedAt: null },
      include: {
        milestones: {
          where: { deletedAt: null },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });
    if (!payload) {
      throw notFound('Goal not found', { goalId });
    }
    const { milestones, ...goal } = payload;
    return normalizeForJson({ goal, milestones, milestone });
  });
}

async function deleteGoalMilestonePayload(
  goalId: string,
  milestoneId: string,
  actorUserId: string,
): Promise<void> {
  const store = mutableGoalStore();
  if (store) {
    deleteSeedGoalMilestone(
      store.tables as Record<string, unknown>,
      goalId,
      milestoneId,
      actorUserId,
    );
    return;
  }

  const prisma = getPrismaClientOrThrow();
  const now = new Date();
  await prisma.$transaction(async (tx) => {
    const result = await tx.goalMilestone.updateMany({
      where: { id: milestoneId, goalId, deletedAt: null },
      data: {
        deletedAt: now,
        deletedByUserId: actorUserId,
        updatedByUserId: actorUserId,
        version: { increment: 1 },
      },
    });
    if (result.count === 0) {
      throw notFound('Goal milestone not found', { goalId, milestoneId });
    }
    await tx.goal.update({
      where: { id: goalId },
      data: {
        updatedByUserId: actorUserId,
        version: { increment: 1 },
      },
    });
  });
}

async function handleInvoiceTransitionRoute(
  request: FastifyRequest,
  reply: FastifyReply,
  params: {
    action: InvoiceTransitionAction;
    auditAction: string;
    accessDeniedMessage: string;
  },
) {
  const authUserId = request.auth?.userId;
  if (!authUserId) {
    throw forbidden('Authenticated user is required');
  }

  const invoiceId = asString((request.params as { invoiceId?: string }).invoiceId);
  if (!invoiceId) {
    throw notFound('Invoice id is required');
  }

  await assertDbModePrismaAvailable({
    request,
    action: params.auditAction,
    resourceType: 'invoice',
    resourceId: invoiceId,
    subjectUserId: authUserId,
    metadata: {
      transitionAction: params.action,
      bodyProvided: request.body != null,
    },
  });
  const body = invoiceTransitionRequestSchema.parse(request.body ?? {});
  const invoice = await getInvoiceRow(invoiceId);
  if (!invoice) {
    throw notFound('Invoice not found', { invoiceId });
  }

  const isAdmin = isPrivilegedAdminAuth(request.auth);
  if (!(await canManageInvoiceMoneyAction(invoice, authUserId, isAdmin))) {
    throw forbidden(params.accessDeniedMessage);
  }

  const manualReceipt: ManualPaymentReceiptInput | undefined =
    params.action === 'mark-paid'
      ? {
          method: body.method,
          amountMinor: body.amountMinor,
          receivedAt: body.receivedAt,
          reference: body.reference,
          evidenceMediaId: body.evidenceMediaId,
          note: body.note,
        }
      : undefined;

  await transitionInvoiceStatus({
    invoiceId,
    actorUserId: authUserId,
    action: params.action,
    reason: body.reason,
    requestId: request.requestId,
    manualReceipt,
  });
  const detail = await getInvoiceDetail(invoiceId);
  if (!detail) {
    throw notFound('Invoice not found', { invoiceId });
  }

  await recordAuditEvent({
    request,
    action: params.auditAction,
    resourceType: 'invoice',
    resourceId: invoiceId,
    subjectUserId: asString(detail.invoice.userId) ?? null,
    result: 'SUCCESS',
  });

  return reply.send({
    invoice: detail.invoice,
    events: detail.events,
    reconcilerEntry: detail.reconcilerEntry,
    requestId: request.requestId,
  });
}

type PrivacySettingsPayload = {
  userId: string;
  profileVisible: boolean;
  showLocation: boolean;
  showOnlineStatus: boolean;
  showActivityStatus: boolean;
  shareAnalytics: boolean;
  personalizedAds: boolean;
  shareWithPartners: boolean;
  showEarnings: boolean;
  showClientList: boolean;
  createdAt: string;
  updatedAt: string;
};

type BookingPreferencesPayload = {
  userId: string;
  allowBookSelf: boolean;
  createdAt: string;
  updatedAt: string;
};

function isoStringOrNow(value: unknown): string {
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === 'string' && value.trim().length > 0) {
    return value;
  }
  return nowIso();
}

function mapPrivacySettings(
  row: SeedRow | null | undefined,
  userId: string,
): PrivacySettingsPayload {
  const mapped: Record<string, unknown> = {
    userId,
    createdAt: isoStringOrNow(row?.createdAt),
    updatedAt: isoStringOrNow(row?.updatedAt ?? row?.createdAt),
  };

  for (const key of privacySettingKeys) {
    mapped[key] = typeof row?.[key] === 'boolean' ? row[key] : privacySettingDefaults[key];
  }

  return mapped as PrivacySettingsPayload;
}

function getMutablePrivacySettingsRows(): { rows: SeedRow[]; seedVersion?: string } | null {
  if (getApiDataBackend() === 'seed') {
    const store = getMarketplaceSeedStore();
    return {
      rows: mutableRows(store.tables, 'userPrivacySettings'),
      seedVersion: store.version,
    };
  }

  if (shouldUseDbFixtureFallback()) {
    const store = getDbFixtureStore();
    return {
      rows: mutableRows(store.tables, 'userPrivacySettings'),
      seedVersion: store.version,
    };
  }

  return null;
}

async function getPrivacySettingsForUser(authUserId: string): Promise<{
  settings: PrivacySettingsPayload;
  seedVersion?: string;
}> {
  const table = getMutablePrivacySettingsRows();
  if (table) {
    const existing = table.rows.find((row) => asString(row.userId) === authUserId);
    return {
      settings: mapPrivacySettings(existing, authUserId),
      seedVersion: table.seedVersion,
    };
  }

  const prisma = getPrismaClientOrThrow();
  const existing = await prisma.userPrivacySetting.findUnique({
    where: { userId: authUserId },
  });

  return {
    settings: mapPrivacySettings(existing as unknown as SeedRow | null, authUserId),
  };
}

async function updatePrivacySettingsForUser(
  authUserId: string,
  updates: Partial<Record<PrivacySettingKey, boolean>>,
): Promise<{
  settings: PrivacySettingsPayload;
  seedVersion?: string;
}> {
  const now = nowIso();
  const table = getMutablePrivacySettingsRows();
  if (table) {
    let row = table.rows.find((entry) => asString(entry.userId) === authUserId);
    if (!row) {
      row = {
        userId: authUserId,
        ...privacySettingDefaults,
        createdAt: now,
        updatedAt: now,
      };
      table.rows.push(row);
    }

    for (const key of privacySettingKeys) {
      if (updates[key] !== undefined) {
        row[key] = updates[key];
      }
    }
    row.updatedAt = now;

    return {
      settings: mapPrivacySettings(row, authUserId),
      seedVersion: table.seedVersion,
    };
  }

  const prisma = getPrismaClientOrThrow();
  const updated = await prisma.userPrivacySetting.upsert({
    where: { userId: authUserId },
    create: {
      userId: authUserId,
      ...privacySettingDefaults,
      ...updates,
    },
    update: updates,
  });

  return {
    settings: mapPrivacySettings(updated as unknown as SeedRow, authUserId),
  };
}

function mapBookingPreferences(
  row: SeedRow | null | undefined,
  userId: string,
): BookingPreferencesPayload {
  return {
    userId,
    allowBookSelf: typeof row?.allowBookSelf === 'boolean' ? row.allowBookSelf : false,
    createdAt: isoStringOrNow(row?.createdAt),
    updatedAt: isoStringOrNow(row?.updatedAt ?? row?.createdAt),
  };
}

function getMutableBookingPreferenceRows(): { rows: SeedRow[]; seedVersion?: string } | null {
  if (getApiDataBackend() === 'seed') {
    const store = getMarketplaceSeedStore();
    return {
      rows: mutableRows(store.tables, 'userBookingPreferences'),
      seedVersion: store.version,
    };
  }

  if (shouldUseDbFixtureFallback()) {
    const store = getDbFixtureStore();
    return {
      rows: mutableRows(store.tables, 'userBookingPreferences'),
      seedVersion: store.version,
    };
  }

  return null;
}

async function getBookingPreferencesForUser(authUserId: string): Promise<{
  preferences: BookingPreferencesPayload;
  seedVersion?: string;
}> {
  const table = getMutableBookingPreferenceRows();
  if (table) {
    const existing = table.rows.find((row) => asString(row.userId) === authUserId);
    return {
      preferences: mapBookingPreferences(existing, authUserId),
      seedVersion: table.seedVersion,
    };
  }

  const prisma = getPrismaClientOrThrow();
  const existing = await prisma.userBookingPreference.findUnique({
    where: { userId: authUserId },
  });

  return {
    preferences: mapBookingPreferences(existing as unknown as SeedRow | null, authUserId),
  };
}

async function updateBookingPreferencesForUser(
  authUserId: string,
  updates: { allowBookSelf: boolean },
): Promise<{
  preferences: BookingPreferencesPayload;
  seedVersion?: string;
}> {
  const now = nowIso();
  const table = getMutableBookingPreferenceRows();
  if (table) {
    let row = table.rows.find((entry) => asString(entry.userId) === authUserId);
    if (!row) {
      row = {
        userId: authUserId,
        allowBookSelf: false,
        createdAt: now,
        updatedAt: now,
      };
      table.rows.push(row);
    }

    row.allowBookSelf = updates.allowBookSelf;
    row.updatedAt = now;

    return {
      preferences: mapBookingPreferences(row, authUserId),
      seedVersion: table.seedVersion,
    };
  }

  const prisma = getPrismaClientOrThrow();
  const updated = await prisma.userBookingPreference.upsert({
    where: { userId: authUserId },
    create: {
      userId: authUserId,
      allowBookSelf: updates.allowBookSelf,
    },
    update: {
      allowBookSelf: updates.allowBookSelf,
    },
  });

  return {
    preferences: mapBookingPreferences(updated as unknown as SeedRow, authUserId),
  };
}

const wave2PlusRoutes: FastifyPluginAsync = async (app) => {
  app.get('/invoices', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }

    const query = invoiceListQuerySchema.parse(request.query ?? {});
    const isAdmin = isPrivilegedAdminAuth(request.auth);
    await assertDbModePrismaAvailable({
      request,
      action: 'invoice.list',
      resourceType: 'invoice',
      sensitiveRead: true,
      metadata: {
        status: query.status ?? null,
      },
    });
    const invoices = await listAccessibleInvoices(authUserId, isAdmin, query);
    await recordAuditEvent({
      request,
      action: 'invoice.list',
      resourceType: 'invoice',
      result: 'SUCCESS',
      sensitiveRead: true,
      metadata: {
        total: invoices.length,
        status: query.status ?? null,
      },
    });

    return reply.send({
      invoices,
      total: invoices.length,
      requestId: request.requestId,
    });
  });

  app.get('/invoices/:invoiceId', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }

    const invoiceId = asString((request.params as { invoiceId?: string }).invoiceId);
    if (!invoiceId) {
      throw notFound('Invoice id is required');
    }

    await assertDbModePrismaAvailable({
      request,
      action: 'invoice.read',
      resourceType: 'invoice',
      resourceId: invoiceId,
      sensitiveRead: true,
    });
    const detail = await getInvoiceDetail(invoiceId);
    if (!detail) {
      throw notFound('Invoice not found', { invoiceId });
    }
    const isAdmin = isPrivilegedAdminAuth(request.auth);
    const invoice = await getInvoiceRow(invoiceId);
    if (!invoice) {
      throw notFound('Invoice not found', { invoiceId });
    }
    const canManageMoney = await canManageInvoiceMoneyAction(invoice, authUserId, isAdmin);
    const canAccess = asString(detail.invoice.userId) === authUserId || canManageMoney;
    if (!canAccess) {
      throw forbidden('Not allowed to access this invoice');
    }

    await recordAuditEvent({
      request,
      action: 'invoice.read',
      resourceType: 'invoice',
      resourceId: invoiceId,
      subjectUserId: asString(detail.invoice.userId) ?? null,
      result: 'SUCCESS',
      sensitiveRead: true,
    });

    return reply.send({
      invoice: { ...detail.invoice, canManageMoney },
      lineItems: detail.lineItems,
      events: detail.events,
      reconcilerEntry: detail.reconcilerEntry,
      reminders: detail.reminders,
      paymentInstructionTemplates: detail.paymentInstructionTemplates,
      paymentAttempts: detail.paymentAttempts,
      requestId: request.requestId,
    });
  });

  app.post('/invoices/generate', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }

    await assertDbModePrismaAvailable({
      request,
      action: 'invoice.generate',
      resourceType: 'invoice',
      subjectUserId: authUserId,
      metadata: {
        bodyProvided: request.body != null,
      },
    });
    const body = generateInvoiceRequestSchema.parse(request.body ?? {});
    const booking = await getBookingInvoiceContext(body.bookingId);
    if (!booking) {
      throw notFound('Booking not found', { bookingId: body.bookingId });
    }
    const isAdmin = isPrivilegedAdminAuth(request.auth);
    if (!isAdmin && booking.coachUserId !== authUserId) {
      throw forbidden('Not allowed to generate an invoice for this booking');
    }

    const generated = await generateInvoiceForBooking({
      bookingId: body.bookingId,
      actorUserId: authUserId,
      notes: body.notes,
      dueDate: body.dueDate,
      taxRatePercent: body.taxRate,
    });
    const detail = await getInvoiceDetail(asString(generated.invoice.id) ?? '');
    if (!detail) {
      throw notFound('Generated invoice not found', { bookingId: body.bookingId });
    }

    await recordAuditEvent({
      request,
      action: 'invoice.generate',
      resourceType: 'invoice',
      resourceId: asString(generated.invoice.id) ?? null,
      subjectUserId: asString(detail.invoice.userId) ?? null,
      result: 'SUCCESS',
      metadata: {
        bookingId: body.bookingId,
        created: generated.created,
      },
    });

    reply.code(generated.created ? 201 : 200);
    return reply.send({
      invoice: detail.invoice,
      lineItems: detail.lineItems,
      events: detail.events,
      requestId: request.requestId,
    });
  });

  app.post('/invoices/:invoiceId/payments', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }

    const invoiceId = asString((request.params as { invoiceId?: string }).invoiceId);
    if (!invoiceId) {
      throw notFound('Invoice id is required');
    }
    await assertDbModePrismaAvailable({
      request,
      action: 'invoice.payment_session_create',
      resourceType: 'invoice',
      resourceId: invoiceId,
      subjectUserId: authUserId,
      metadata: {
        bodyProvided: request.body != null,
      },
    });
    const invoice = await getInvoiceRow(invoiceId);
    if (!invoice) {
      throw notFound('Invoice not found', { invoiceId });
    }

    const isAdmin = isPrivilegedAdminAuth(request.auth);
    const canPay =
      isAdmin ||
      asString(invoice.payerUserId) === authUserId ||
      asString(invoice.userId) === authUserId;
    if (!canPay) {
      throw forbidden('Not allowed to pay this invoice');
    }
    const body = invoicePaymentRequestSchema.parse(request.body);
    const totalMinor = asNumber(invoice.totalMinor);
    if (!totalMinor || totalMinor <= 0) {
      throw badRequest('Invoice total is invalid for payment processing', { invoiceId });
    }
    const amountMinor = body.amountMinor ?? totalMinor;
    if (amountMinor !== totalMinor) {
      throw badRequest('Payment amount must match invoice total', {
        invoiceId,
        totalMinor,
        amountMinor,
      });
    }

    const paymentSession = await createInvoicePaymentSession({
      invoiceId,
      actorUserId: authUserId,
      idempotencyKey: body.idempotencyKey,
      returnUrl: body.returnUrl,
      cancelUrl: body.cancelUrl,
    });

    await recordAuditEvent({
      request,
      action: 'invoice.payment_session_create',
      resourceType: 'invoice',
      resourceId: invoiceId,
      subjectUserId: asString(invoice.payerUserId) ?? null,
      result: 'SUCCESS',
      metadata: {
        reused: paymentSession.reused,
        amountMinor,
        method: body.method,
        attemptId: asString(paymentSession.attempt.id) ?? null,
        provider: paymentSession.hostedSession.provider,
      },
    });

    reply.code(paymentSession.reused ? 200 : 201);
    return reply.send({
      invoiceId,
      invoiceStatus: asString(paymentSession.invoice.status) ?? 'SENT',
      paymentSession: {
        attemptId: asString(paymentSession.attempt.id) ?? '',
        provider: paymentSession.hostedSession.provider,
        status: paymentSession.hostedSession.status,
        amountMinor,
        currency: asString(paymentSession.invoice.currency) ?? 'GBP',
        expiresAt: paymentSession.hostedSession.expiresAt,
        nextAction: paymentSession.hostedSession.nextAction,
      },
      requestId: request.requestId,
    });
  });

  app.post('/invoices/:invoiceId/refunds', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }

    const invoiceId = asString((request.params as { invoiceId?: string }).invoiceId);
    if (!invoiceId) {
      throw notFound('Invoice id is required');
    }
    await assertDbModePrismaAvailable({
      request,
      action: 'invoice.refund_approve',
      resourceType: 'invoice',
      resourceId: invoiceId,
      subjectUserId: authUserId,
      metadata: {
        bodyProvided: request.body != null,
      },
    });
    const invoice = await getInvoiceRow(invoiceId);
    if (!invoice) {
      throw notFound('Invoice not found', { invoiceId });
    }

    const isAdmin = isPrivilegedAdminAuth(request.auth);
    if (!(await canManageInvoiceMoneyAction(invoice, authUserId, isAdmin))) {
      throw forbidden('Not allowed to refund this invoice');
    }

    const body = invoiceRefundRequestSchema.parse(request.body ?? {});
    const refund = await requestInvoiceRefund({
      invoiceId,
      actorUserId: authUserId,
      reason: body.reason,
      verificationCode: body.verificationCode,
      idempotencyKey: body.idempotencyKey,
      amountMinor: body.amountMinor,
      requestId: request.requestId,
    });

    const detail = await getInvoiceDetail(invoiceId).then(async (invoiceDetail) => {
      if (!invoiceDetail) {
        throw notFound('Invoice not found', { invoiceId });
      }
      await recordAuditEvent({
        request,
        action: 'invoice.refund_approve',
        resourceType: 'invoice',
        resourceId: invoiceId,
        subjectUserId: asString(invoiceDetail.invoice.userId) ?? null,
        result: 'SUCCESS',
        metadata: {
          reused: refund.reused,
          amountMinor: body.amountMinor ?? asNumber(invoice.totalMinor) ?? null,
          refundId: asString(coerceMetadata(refund.refund.metadataJson).refundId) ?? null,
        },
      });
      return invoiceDetail;
    });

    reply.code(refund.reused ? 200 : 201);
    return reply.send({
      invoice: detail.invoice,
      refund: refund.refund,
      events: detail.events,
      reconcilerEntry: detail.reconcilerEntry,
      reused: refund.reused,
      requestId: request.requestId,
    });
  });

  app.post('/invoices/:invoiceId/reminders', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }

    const invoiceId = asString((request.params as { invoiceId?: string }).invoiceId);
    if (!invoiceId) {
      throw notFound('Invoice id is required');
    }
    await assertDbModePrismaAvailable({
      request,
      action: 'invoice.reminder',
      resourceType: 'invoice',
      resourceId: invoiceId,
      subjectUserId: authUserId,
      metadata: {
        bodyProvided: request.body != null,
      },
    });
    const body = invoiceReminderRequestSchema.parse(request.body ?? {});
    const invoice = await getInvoiceRow(invoiceId);
    if (!invoice) {
      throw notFound('Invoice not found', { invoiceId });
    }

    const isAdmin = isPrivilegedAdminAuth(request.auth);
    if (
      !(await canManageInvoiceMoneyAction(invoice, authUserId, isAdmin)) &&
      asString(invoice.coachId) !== authUserId
    ) {
      throw forbidden('Not allowed to send reminders for this invoice');
    }

    const reminder = await createInvoiceReminder({
      invoiceId,
      actorUserId: authUserId,
      recipientEmail: body.recipientEmail,
      message: body.message,
    });
    const delivery = body.recipientEmail
      ? await deliverInvoiceReminderEmail({
          email: body.recipientEmail,
          invoiceNumber: asString(reminder.invoice.invoiceNumber) ?? invoiceId,
          amountLabel:
            typeof reminder.invoice.total === 'number'
              ? `${reminder.invoice.currency ?? 'GBP'} ${reminder.invoice.total.toFixed(2)}`
              : undefined,
          message: body.message,
          requestId: request.requestId,
        })
      : { provider: 'none' as const, status: 'skipped' as const };
    if (delivery.status === 'failed') {
      request.log.warn(
        {
          provider: delivery.provider,
          error: delivery.error,
          recipientEmailDomain: emailDomain(body.recipientEmail),
        },
        'Invoice reminder email delivery failed',
      );
    }
    const [updatedReminder, detail] = await Promise.all([
      updateInvoiceReminderDelivery({
        reminderId: asString(reminder.reminder.id) ?? '',
        deliveryStatus: delivery.status,
        deliveryProvider: delivery.provider,
        deliveryError: delivery.error,
      }),
      getInvoiceDetail(invoiceId),
    ]);
    await recordAuditEvent({
      request,
      action: 'invoice.reminder',
      resourceType: 'invoice',
      resourceId: invoiceId,
      subjectUserId:
        asString(reminder.invoice.payerUserId) ?? asString(reminder.invoice.userId) ?? null,
      result: 'SUCCESS',
      metadata: {
        sentAt: reminder.sentAt,
        recipientEmailDomain: emailDomain(body.recipientEmail),
        deliveryProvider: delivery.provider,
        deliveryStatus: delivery.status,
      },
    });
    return reply.send({
      invoice: detail?.invoice ?? reminder.invoice,
      reminder: updatedReminder,
      sentAt: reminder.sentAt,
      requestId: request.requestId,
    });
  });

  app.get('/payment-attempts/:attemptId/hosted', async (request, reply) => {
    const attemptId = asString((request.params as { attemptId?: string }).attemptId);
    const token =
      typeof (request.query as { token?: unknown } | undefined)?.token === 'string'
        ? (request.query as { token: string }).token
        : '';
    if (!attemptId || !token) {
      throw badRequest('Payment attempt token is required');
    }

    await assertDbModePrismaAvailable({
      request,
      action: 'invoice.payment_hosted_page',
      resourceType: 'payment_attempt',
      resourceId: attemptId,
      sensitiveRead: true,
    });
    const page = await getHostedPaymentPageData(attemptId, token);
    const completeUrl = `/v1/payment-attempts/${attemptId}/simulated-complete`;
    reply.type('text/html; charset=utf-8');
    return reply.send(
      renderHostedPaymentPage({
        invoiceNumber: asString(page.invoice.invoiceNumber) ?? attemptId,
        amountMinor: asNumber(page.attempt.amountMinor) ?? 0,
        currency: asString(page.attempt.currency) ?? 'GBP',
        completeUrl,
        token: page.token,
        returnUrl: page.returnUrl,
        cancelUrl: page.cancelUrl,
      }),
    );
  });

  app.post('/payment-attempts/:attemptId/simulated-complete', async (request, reply) => {
    const attemptId = asString((request.params as { attemptId?: string }).attemptId);
    if (!attemptId) {
      throw badRequest('Payment attempt id is required');
    }

    await assertDbModePrismaAvailable({
      request,
      action: 'invoice.payment_confirm',
      resourceType: 'payment_attempt',
      resourceId: attemptId,
    });
    const body = simulatedCompleteRequestSchema.parse(request.body ?? {});
    const completed = await completeSimulatedInvoicePayment({
      attemptId,
      token: body.token,
    });

    await recordAuditEvent({
      request,
      action: 'invoice.payment_confirm',
      resourceType: 'invoice',
      resourceId: asString(completed.invoice.id) ?? null,
      subjectUserId:
        asString(completed.invoice.payerUserId) ?? asString(completed.invoice.userId) ?? null,
      result: 'SUCCESS',
      metadata: {
        attemptId,
        alreadyCompleted: completed.alreadyCompleted,
      },
    });

    const acceptsHtml =
      typeof request.headers.accept === 'string' && request.headers.accept.includes('text/html');
    if (acceptsHtml) {
      const payload = verifySimulatedPaymentToken(body.token);
      const returnUrl = payload.returnUrl ? escapeHtml(payload.returnUrl) : '';
      reply.type('text/html; charset=utf-8');
      return reply.send(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Payment complete</title>
    <style>
      body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #f5f1e8; color: #1a1f1d; display: grid; place-items: center; min-height: 100vh; padding: 24px; }
      section { max-width: 420px; background: #fffaf2; border: 1px solid #d9cfbb; border-radius: 24px; padding: 24px; text-align: center; }
      a { display: inline-block; margin-top: 16px; padding: 14px 16px; border-radius: 14px; background: #0a7f5a; color: white; text-decoration: none; font-weight: 700; }
    </style>
  </head>
  <body>
    <section>
      <h1>Payment confirmed</h1>
      <p>The invoice is now marked as paid in Clubroom.</p>
      ${returnUrl ? `<a href="${returnUrl}">Return to Clubroom</a>` : ''}
    </section>
  </body>
</html>`);
    }

    return reply.send({
      invoiceId: asString(completed.invoice.id) ?? null,
      invoiceStatus: asString(completed.invoice.status) ?? 'PAID',
      attemptId,
      alreadyCompleted: completed.alreadyCompleted,
      requestId: request.requestId,
    });
  });

  app.post('/invoices/:invoiceId/mark-paid', async (request, reply) => {
    return handleInvoiceTransitionRoute(request, reply, {
      action: 'mark-paid',
      auditAction: 'invoice.mark_paid',
      accessDeniedMessage: 'Not allowed to reconcile this invoice',
    });
  });

  app.post('/invoices/:invoiceId/mark-unpaid', async (request, reply) => {
    return handleInvoiceTransitionRoute(request, reply, {
      action: 'mark-unpaid',
      auditAction: 'invoice.mark_unpaid',
      accessDeniedMessage: 'Not allowed to reconcile this invoice',
    });
  });

  app.post('/invoices/:invoiceId/write-off', async (request, reply) => {
    return handleInvoiceTransitionRoute(request, reply, {
      action: 'write-off',
      auditAction: 'invoice.write_off',
      accessDeniedMessage: 'Not allowed to reconcile this invoice',
    });
  });

  app.post('/invoices/:invoiceId/restore', async (request, reply) => {
    return handleInvoiceTransitionRoute(request, reply, {
      action: 'restore',
      auditAction: 'invoice.restore',
      accessDeniedMessage: 'Not allowed to reconcile this invoice',
    });
  });

  app.post('/invoices/:invoiceId/void', async (request, reply) => {
    return handleInvoiceTransitionRoute(request, reply, {
      action: 'void',
      auditAction: 'invoice.void',
      accessDeniedMessage: 'Not allowed to void this invoice',
    });
  });

  app.get('/session-media', async (request, reply) => {
    const query = sessionMediaQuerySchema.parse(request.query ?? {});
    try {
      await assertCanReadAthleteHealth(request, query.athleteId);
      const result = await listSessionMediaRowsBySession(query.sessionId, query.athleteId);
      const media = buildSessionMediaPayload(result.rows, result.tables);
      await recordAuditEvent({
        request,
        action: 'session_media.read',
        resourceType: 'session_media',
        resourceId: query.sessionId,
        result: 'SUCCESS',
        sensitiveRead: true,
        metadata: {
          athleteId: query.athleteId,
          assetCount: result.rows.length,
        },
      });
      return reply.send({
        media,
        seedVersion: result.seedVersion,
        requestId: request.requestId,
      });
    } catch (error) {
      await recordAuditEvent({
        request,
        action: 'session_media.read',
        resourceType: 'session_media',
        resourceId: query.sessionId,
        result: error instanceof ApiProblemError && error.status < 500 ? 'DENY' : 'ERROR',
        sensitiveRead: true,
        metadata: {
          athleteId: query.athleteId,
          errorCode: error instanceof ApiProblemError ? error.code : 'INTERNAL_ERROR',
          status: error instanceof ApiProblemError ? error.status : 500,
        },
      });
      throw error;
    }
  });

  app.get('/sessions/:sessionId/media', async (request, reply) => {
    const sessionId = asString((request.params as { sessionId?: string }).sessionId);
    if (!sessionId) {
      throw notFound('Session id is required');
    }
    const query = sessionMediaListQuerySchema.parse(request.query ?? {});
    const result = await listSessionMediaRowsBySession(sessionId, query.athleteId);
    const readableAthleteIds = await getReadableAthleteIds(
      request,
      result.rows.flatMap((row) => {
        const athleteId = asString(row.athleteId);
        return athleteId ? [athleteId] : [];
      }),
    );
    const allowedRows = result.rows.filter((row) => {
      const athleteId = asString(row.athleteId);
      return athleteId ? readableAthleteIds.has(athleteId) : false;
    });
    await recordAuditEvent({
      request,
      action: 'session_media.read',
      resourceType: 'session',
      resourceId: sessionId,
      result: 'SUCCESS',
      sensitiveRead: true,
      metadata: {
        athleteId: query.athleteId ?? null,
        assetCount: allowedRows.length,
      },
    });
    return reply.send({
      media: groupSessionMedia(allowedRows, result.tables),
      seedVersion: result.seedVersion,
      requestId: request.requestId,
    });
  });

  app.get('/athletes/:athleteId/session-media', async (request, reply) => {
    const athleteId = asString((request.params as { athleteId?: string }).athleteId);
    if (!athleteId) {
      throw notFound('Athlete id is required');
    }
    try {
      await assertCanReadAthleteHealth(request, athleteId);
      const result = await listSessionMediaRowsByAthlete(athleteId);
      const media = groupSessionMedia(result.rows, result.tables);
      await recordAuditEvent({
        request,
        action: 'session_media.read',
        resourceType: 'athlete',
        resourceId: athleteId,
        result: 'SUCCESS',
        sensitiveRead: true,
        metadata: {
          assetCount: result.rows.length,
        },
      });
      return reply.send({
        media,
        seedVersion: result.seedVersion,
        requestId: request.requestId,
      });
    } catch (error) {
      await recordAuditEvent({
        request,
        action: 'session_media.read',
        resourceType: 'athlete',
        resourceId: athleteId,
        result: error instanceof ApiProblemError && error.status < 500 ? 'DENY' : 'ERROR',
        sensitiveRead: true,
        metadata: {
          errorCode: error instanceof ApiProblemError ? error.code : 'INTERNAL_ERROR',
          status: error instanceof ApiProblemError ? error.status : 500,
        },
      });
      throw error;
    }
  });

  app.put('/session-media', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }
    const body = sessionMediaSaveRequestSchema.parse(request.body ?? {});
    try {
      const isAdmin = isPrivilegedAdminAuth(request.auth);
      const isActingCoach =
        request.auth?.actingRole === 'coach' || request.auth?.roles.includes('coach');
      if (!isAdmin && (!isActingCoach || authUserId !== body.coachId)) {
        throw forbidden('Only the assigned coach can save session media');
      }
      if (!isAdmin) {
        await assertCanWriteAthleteHealth(request, body.athleteId);
      }
      await assertSessionMediaConsent(body);
      const result = await saveSessionMedia(body, authUserId, isAdmin);
      await recordAuditEvent({
        request,
        action: 'session_media.save',
        resourceType: 'session_media',
        resourceId: body.sessionId,
        subjectUserId: body.coachId,
        result: 'SUCCESS',
        sensitiveRead: true,
        metadata: {
          athleteId: body.athleteId,
          photoCount: body.photos.length,
          hasVideo: Boolean(body.video),
        },
      });
      return reply.send({
        media: result.media,
        seedVersion: result.seedVersion,
        requestId: request.requestId,
      });
    } catch (error) {
      await recordAuditEvent({
        request,
        action: 'session_media.save',
        resourceType: 'session_media',
        resourceId: body.sessionId,
        subjectUserId: body.coachId,
        result: error instanceof ApiProblemError && error.status < 500 ? 'DENY' : 'ERROR',
        sensitiveRead: true,
        metadata: {
          athleteId: body.athleteId,
          errorCode: error instanceof ApiProblemError ? error.code : 'INTERNAL_ERROR',
          status: error instanceof ApiProblemError ? error.status : 500,
        },
      });
      throw error;
    }
  });

  app.delete('/session-media/assets/:assetId', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }
    const assetId = asString((request.params as { assetId?: string }).assetId);
    if (!assetId) {
      throw notFound('Session media asset id is required');
    }
    try {
      const asset = await findSessionMediaAsset(assetId);
      const athleteId = asString(asset.athleteId);
      if (!athleteId) {
        throw notFound('Session media asset athlete is missing');
      }
      await assertCanWriteAthleteHealth(request, athleteId);
      const existing = await removeSessionMediaAsset(assetId, authUserId);
      await recordAuditEvent({
        request,
        action: 'session_media.remove',
        resourceType: 'session_media_asset',
        resourceId: assetId,
        result: 'SUCCESS',
        sensitiveRead: true,
        metadata: {
          athleteId,
          sessionId: asString(existing.removed.sessionId) ?? null,
          kind: asString(existing.removed.kind) ?? null,
        },
      });
      return reply.send({
        media: existing.media,
        seedVersion: existing.seedVersion,
        requestId: request.requestId,
      });
    } catch (error) {
      await recordAuditEvent({
        request,
        action: 'session_media.remove',
        resourceType: 'session_media_asset',
        resourceId: assetId,
        result: error instanceof ApiProblemError && error.status < 500 ? 'DENY' : 'ERROR',
        sensitiveRead: true,
        metadata: {
          errorCode: error instanceof ApiProblemError ? error.code : 'INTERNAL_ERROR',
          status: error instanceof ApiProblemError ? error.status : 500,
        },
      });
      throw error;
    }
  });

  app.get('/coaches/:coachId/development-sessions', async (request, reply) => {
    const coachUserId = asString((request.params as { coachId?: string }).coachId);
    if (!coachUserId) {
      throw notFound('Coach id is required');
    }
    const query = coachDevelopmentSessionListQuerySchema.parse(request.query ?? {});
    try {
      const authUserId = request.auth?.userId;
      if (!authUserId) {
        throw forbidden('Authenticated user is required');
      }
      const canReadSelfCoach =
        authUserId === coachUserId && hasAnyGrantedRole(request.auth, ['coach']);
      if (!canReadSelfCoach && !isPrivilegedAdminAuth(request.auth)) {
        throw forbidden('Only the coach or privileged admin can read coach development sessions');
      }
      const result = await listCoachDevelopmentSessionFeedback(coachUserId, query);
      await recordAuditEvent({
        request,
        action: 'coach_development_sessions.read',
        resourceType: 'coach',
        resourceId: coachUserId,
        result: 'SUCCESS',
        sensitiveRead: true,
        metadata: {
          count: result.feedback.length,
          limit: query.limit,
        },
      });
      return reply.send({
        feedback: result.feedback,
        seedVersion: result.seedVersion,
        requestId: request.requestId,
      });
    } catch (error) {
      await recordAuditEvent({
        request,
        action: 'coach_development_sessions.read',
        resourceType: 'coach',
        resourceId: coachUserId,
        result: error instanceof ApiProblemError && error.status < 500 ? 'DENY' : 'ERROR',
        sensitiveRead: true,
        metadata: {
          errorCode: error instanceof ApiProblemError ? error.code : 'INTERNAL_ERROR',
          status: error instanceof ApiProblemError ? error.status : 500,
        },
      });
      throw error;
    }
  });

  app.get('/athletes/:athleteId/session-feedback', async (request, reply) => {
    const athleteId = asString((request.params as { athleteId?: string }).athleteId);
    if (!athleteId) {
      throw notFound('Athlete id is required');
    }
    const query = sessionFeedbackListQuerySchema.parse(request.query ?? {});
    try {
      await assertCanReadAthleteHealth(request, athleteId);
      const viewerRole = resolveSessionFeedbackViewerRole(request);
      const result = await listSessionFeedback(athleteId, {
        ...query,
        viewerRole,
      });
      await recordAuditEvent({
        request,
        action: 'session_feedback.read',
        resourceType: 'athlete',
        resourceId: athleteId,
        result: 'SUCCESS',
        sensitiveRead: true,
        metadata: {
          count: result.feedback.length,
          viewerRole,
          requestedViewerRole: query.viewerRole,
        },
      });
      return reply.send({
        feedback: result.feedback,
        seedVersion: result.seedVersion,
        requestId: request.requestId,
      });
    } catch (error) {
      await recordAuditEvent({
        request,
        action: 'session_feedback.read',
        resourceType: 'athlete',
        resourceId: athleteId,
        result: error instanceof ApiProblemError && error.status < 500 ? 'DENY' : 'ERROR',
        sensitiveRead: true,
        metadata: {
          errorCode: error instanceof ApiProblemError ? error.code : 'INTERNAL_ERROR',
          status: error instanceof ApiProblemError ? error.status : 500,
        },
      });
      throw error;
    }
  });

  app.get('/session-feedback', async (request, reply) => {
    const query = sessionFeedbackQuerySchema.parse(request.query ?? {});
    const result = await findSessionFeedbackBySession(query.sessionId);
    if (!result.row) {
      return reply.send({
        feedback: null,
        seedVersion: result.seedVersion,
        requestId: request.requestId,
      });
    }
    const athleteId = asString(result.row.athleteId);
    if (!athleteId) {
      throw notFound('Session feedback athlete id is missing');
    }
    try {
      await assertCanReadAthleteHealth(request, athleteId);
      const viewerRole = resolveSessionFeedbackViewerRole(request);
      const feedback = visibleSessionFeedback(result.row, viewerRole);
      await recordAuditEvent({
        request,
        action: 'session_feedback.read',
        resourceType: 'session_feedback',
        resourceId: asString(result.row.id) ?? query.sessionId,
        result: 'SUCCESS',
        sensitiveRead: true,
        metadata: {
          athleteId,
          viewerRole,
          requestedViewerRole: query.viewerRole,
        },
      });
      return reply.send({
        feedback,
        seedVersion: result.seedVersion,
        requestId: request.requestId,
      });
    } catch (error) {
      await recordAuditEvent({
        request,
        action: 'session_feedback.read',
        resourceType: 'session_feedback',
        resourceId: asString(result.row.id) ?? query.sessionId,
        result: error instanceof ApiProblemError && error.status < 500 ? 'DENY' : 'ERROR',
        sensitiveRead: true,
        metadata: {
          athleteId,
          errorCode: error instanceof ApiProblemError ? error.code : 'INTERNAL_ERROR',
          status: error instanceof ApiProblemError ? error.status : 500,
        },
      });
      throw error;
    }
  });

  app.post('/session-feedback', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }
    const body = sessionFeedbackRequestSchema.parse(request.body ?? {});
    try {
      const isPrivilegedAdmin = isPrivilegedAdminAuth(request.auth);
      const isActingCoach =
        request.auth?.actingRole === 'coach' || request.auth?.roles.includes('coach');
      if (!isPrivilegedAdmin && (!isActingCoach || authUserId !== body.coachId)) {
        throw forbidden('Only the assigned coach can submit session feedback');
      }
      if (!isPrivilegedAdmin) {
        await assertCanWriteAthleteHealth(request, body.athleteId);
      }
      const authoritativeBody = await withAuthoritativeSessionFeedbackNames(body);
      const result = await upsertSessionFeedback(authoritativeBody);
      await recordAuditEvent({
        request,
        action: 'session_feedback.save',
        resourceType: 'session_feedback',
        resourceId: result.feedback.id,
        subjectUserId: body.coachId,
        result: 'SUCCESS',
        sensitiveRead: body.visibility === 'coach_only',
        metadata: {
          athleteId: body.athleteId,
          sessionId: body.sessionId,
          bookingId: body.bookingId ?? null,
          visibility: body.visibility,
        },
      });
      return reply.status(200).send({
        feedback: result.feedback,
        seedVersion: result.seedVersion,
        requestId: request.requestId,
      });
    } catch (error) {
      await recordAuditEvent({
        request,
        action: 'session_feedback.save',
        resourceType: 'session_feedback',
        resourceId: body.sessionId,
        subjectUserId: body.coachId,
        result: error instanceof ApiProblemError && error.status < 500 ? 'DENY' : 'ERROR',
        sensitiveRead: body.visibility === 'coach_only',
        metadata: {
          athleteId: body.athleteId,
          bookingId: body.bookingId ?? null,
          errorCode: error instanceof ApiProblemError ? error.code : 'INTERNAL_ERROR',
          status: error instanceof ApiProblemError ? error.status : 500,
        },
      });
      throw error;
    }
  });

  app.get('/athletes/:athleteId/progress', async (request, reply) => {
    const athleteId = asString((request.params as { athleteId?: string }).athleteId);
    if (!athleteId) {
      throw notFound('Athlete id is required');
    }
    await assertCanReadAthleteHealth(request, athleteId);

    const [progress] = await Promise.all([
      getAthleteProgressPayload(athleteId),
      recordAuditEvent({
        request,
        action: 'athlete_progress.read',
        resourceType: 'athlete_progress',
        resourceId: athleteId,
        result: 'SUCCESS',
        sensitiveRead: true,
      }),
    ]);

    return reply.send({
      athleteId,
      sessionNotes: progress.sessionNotes,
      sessionFeedback: progress.sessionFeedback,
      skillAssessments: progress.skillAssessments,
      skillDefinitions: progress.skillDefinitions,
      seedVersion: progress.seedVersion,
      requestId: request.requestId,
    });
  });

  app.get('/athletes/:athleteId/practice-logs', async (request, reply) => {
    const athleteId = asString((request.params as { athleteId?: string }).athleteId);
    if (!athleteId) {
      throw notFound('Athlete id is required');
    }
    let subjectUserId: string | undefined;
    let responseContractInvalid = false;
    try {
      const query = practiceLogListQuerySchema.parse(request.query ?? {});
      await assertCanReadAthleteHealth(request, athleteId);
      subjectUserId = await resolvePracticeLogSubjectUserId(athleteId);
      const payload = await listPracticeLogsPayload(athleteId, query);
      const parsed = practiceLogListResponseSchema.safeParse({
        athleteId,
        logs: payload.logs,
        total: payload.total,
        seedVersion: payload.seedVersion,
        requestId: request.requestId,
      });
      if (!parsed.success) {
        responseContractInvalid = true;
        throw new ApiProblemError(500, 'INTERNAL_ERROR', 'Practice log list response invalid');
      }

      await recordAuditEvent({
        request,
        action: 'practice_logs.read',
        resourceType: 'practice_log',
        resourceId: athleteId,
        subjectUserId,
        result: 'SUCCESS',
        sensitiveRead: true,
        metadata: {
          returned: parsed.data.logs.length,
          total: parsed.data.total,
        },
      });

      return reply.send(parsed.data);
    } catch (error) {
      await recordAuditEvent({
        request,
        action: 'practice_logs.read',
        resourceType: 'practice_log',
        resourceId: athleteId,
        subjectUserId,
        result:
          isZodValidationError(error) ||
          (error instanceof ApiProblemError && error.status < 500)
            ? 'DENY'
            : 'ERROR',
        sensitiveRead: true,
        metadata: {
          errorCode: responseContractInvalid
            ? 'RESPONSE_CONTRACT_INVALID'
            : isZodValidationError(error)
              ? 'VALIDATION_FAILED'
              : error instanceof ApiProblemError
                ? error.code
                : 'INTERNAL_ERROR',
        },
      });
      throw error;
    }
  });

  app.get('/athletes/:athleteId/practice-logs/today', async (request, reply) => {
    const athleteId = asString((request.params as { athleteId?: string }).athleteId);
    const actorUserId = asString(request.auth?.userId);
    if (!athleteId) {
      throw notFound('Athlete id is required');
    }
    if (!actorUserId) {
      throw forbidden('Authenticated user is required');
    }

    let subjectUserId: string | undefined;
    let responseContractInvalid = false;
    try {
      await assertCanReadAthleteHealth(request, athleteId);
      subjectUserId = await resolvePracticeLogSubjectUserId(athleteId);
      const timeZone = await resolvePracticeLogTimeZone(actorUserId);
      const payload = await getTodayPracticeLogPayload(athleteId, actorUserId, timeZone);
      const parsed = practiceLogTodayResponseSchema.safeParse({
        athleteId,
        ...payload,
        requestId: request.requestId,
      });
      if (!parsed.success) {
        responseContractInvalid = true;
        throw new ApiProblemError(500, 'INTERNAL_ERROR', 'Today practice log response invalid');
      }

      await recordAuditEvent({
        request,
        action: 'practice_logs.today_read',
        resourceType: 'practice_log',
        resourceId: athleteId,
        subjectUserId,
        result: 'SUCCESS',
        sensitiveRead: true,
        metadata: {
          found: Boolean(parsed.data.log),
          dateKey: parsed.data.dateKey,
          timeZone: parsed.data.timeZone,
        },
      });

      return reply.send(parsed.data);
    } catch (error) {
      await recordAuditEvent({
        request,
        action: 'practice_logs.today_read',
        resourceType: 'practice_log',
        resourceId: athleteId,
        subjectUserId,
        result:
          error instanceof ApiProblemError && error.status < 500 ? 'DENY' : 'ERROR',
        sensitiveRead: true,
        metadata: {
          errorCode: responseContractInvalid
            ? 'RESPONSE_CONTRACT_INVALID'
            : error instanceof ApiProblemError
              ? error.code
              : 'INTERNAL_ERROR',
        },
      });
      throw error;
    }
  });

  app.post('/athletes/:athleteId/practice-logs', async (request, reply) => {
    const athleteId = asString((request.params as { athleteId?: string }).athleteId);
    const actorUserId = asString(request.auth?.userId);
    if (!athleteId) {
      throw notFound('Athlete id is required');
    }
    if (!actorUserId) {
      throw forbidden('Authenticated user is required');
    }
    let body: PracticeLogCreateRequest | null = null;
    let subjectUserId: string | undefined;
    let responseContractInvalid = false;
    try {
      body = practiceLogCreateRequestSchema.parse(request.body ?? {});
      await assertCanWriteAthleteHealth(request, athleteId);
      subjectUserId = await resolvePracticeLogSubjectUserId(athleteId);
      const timeZone = await resolvePracticeLogTimeZone(actorUserId);
      const result = await upsertPracticeLogPayload(
        athleteId,
        actorUserId,
        body,
        request.requestId,
        timeZone,
      );
      const parsed = practiceLogMutationResponseSchema.safeParse(result.response);
      if (!parsed.success) {
        responseContractInvalid = true;
        throw new ApiProblemError(500, 'INTERNAL_ERROR', 'Practice log mutation response invalid');
      }

      await recordAuditEvent({
        request,
        action: 'practice_logs.write',
        resourceType: 'practice_log',
        resourceId: parsed.data.log.id,
        subjectUserId,
        result: 'SUCCESS',
        metadata: {
          athleteId,
          addedMinutes: parsed.data.addedMinutes,
          totalMinutes: parsed.data.log.minutes,
          dateKey: parsed.data.log.dateKey,
          timeZone: parsed.data.timeZone,
          created: parsed.data.created,
          replayed: parsed.data.replayed,
        },
      });

      return reply.code(result.statusCode).send(parsed.data);
    } catch (error) {
      await recordAuditEvent({
        request,
        action: 'practice_logs.write',
        resourceType: 'practice_log',
        resourceId: athleteId,
        subjectUserId,
        result:
          isZodValidationError(error) ||
          (error instanceof ApiProblemError && error.status < 500)
            ? 'DENY'
            : 'ERROR',
        metadata: {
          requestedDateKey: body?.dateKey ?? null,
          errorCode: responseContractInvalid
            ? 'RESPONSE_CONTRACT_INVALID'
            : isZodValidationError(error)
              ? 'VALIDATION_FAILED'
              : error instanceof ApiProblemError
                ? error.code
                : 'INTERNAL_ERROR',
        },
      });
      throw error;
    }
  });

  app.get('/athletes/:athleteId/progress-challenge', async (request, reply) => {
    const athleteId = asString((request.params as { athleteId?: string }).athleteId);
    if (!athleteId) {
      throw notFound('Athlete id is required');
    }

    try {
      await assertCanReadAthleteHealth(request, athleteId);
    } catch (error) {
      await recordAuditEvent({
        request,
        action: 'progress_challenge.read',
        resourceType: 'progress_challenge',
        resourceId: athleteId,
        subjectUserId: athleteOwnerUserId(athleteId),
        result: 'DENY',
        sensitiveRead: true,
      });
      throw error;
    }

    const payload = await getActiveProgressChallengePayload(athleteId);

    await recordAuditEvent({
      request,
      action: 'progress_challenge.read',
      resourceType: 'progress_challenge',
      resourceId: athleteId,
      subjectUserId: athleteOwnerUserId(athleteId),
      result: 'SUCCESS',
      sensitiveRead: true,
      metadata: {
        found: Boolean((payload as { challenge?: unknown }).challenge),
      },
    });

    return reply.send({
      athleteId,
      challenge: (payload as { challenge?: unknown }).challenge ?? null,
      seedVersion: (payload as { seedVersion?: string | null }).seedVersion ?? null,
      requestId: request.requestId,
    });
  });

  app.get('/athletes/:athleteId/progress-challenges/history', async (request, reply) => {
    const athleteId = asString((request.params as { athleteId?: string }).athleteId);
    if (!athleteId) {
      throw notFound('Athlete id is required');
    }

    try {
      await assertCanReadAthleteHealth(request, athleteId);
    } catch (error) {
      await recordAuditEvent({
        request,
        action: 'progress_challenge.history_read',
        resourceType: 'progress_challenge',
        resourceId: athleteId,
        subjectUserId: athleteOwnerUserId(athleteId),
        result: 'DENY',
        sensitiveRead: true,
      });
      throw error;
    }

    const payload = await listProgressChallengeHistoryPayload(athleteId);
    const challenges = asRows((payload as { challenges?: unknown }).challenges);

    await recordAuditEvent({
      request,
      action: 'progress_challenge.history_read',
      resourceType: 'progress_challenge',
      resourceId: athleteId,
      subjectUserId: athleteOwnerUserId(athleteId),
      result: 'SUCCESS',
      sensitiveRead: true,
      metadata: {
        total: challenges.length,
      },
    });

    return reply.send({
      athleteId,
      challenges,
      seedVersion: (payload as { seedVersion?: string | null }).seedVersion ?? null,
      requestId: request.requestId,
    });
  });

  app.get('/progress-challenges/:challengeId', async (request, reply) => {
    const challengeId = asString((request.params as { challengeId?: string }).challengeId);
    if (!challengeId) {
      throw notFound('Progress challenge id is required');
    }
    const payload = await getProgressChallengePayloadById(challengeId);
    const challenge = (payload as { challenge?: { athleteId?: string } | null }).challenge;
    if (!challenge) {
      throw notFound('Progress challenge not found', { challengeId });
    }
    const athleteId = asString(challenge.athleteId);
    if (!athleteId) {
      throw notFound('Progress challenge athlete is missing');
    }

    try {
      await assertCanReadAthleteHealth(request, athleteId);
    } catch (error) {
      await recordAuditEvent({
        request,
        action: 'progress_challenge.read',
        resourceType: 'progress_challenge',
        resourceId: challengeId,
        subjectUserId: athleteOwnerUserId(athleteId),
        result: 'DENY',
        sensitiveRead: true,
      });
      throw error;
    }

    await recordAuditEvent({
      request,
      action: 'progress_challenge.read',
      resourceType: 'progress_challenge',
      resourceId: challengeId,
      subjectUserId: athleteOwnerUserId(athleteId),
      result: 'SUCCESS',
      sensitiveRead: true,
      metadata: {
        athleteId,
      },
    });

    return reply.send({
      challenge,
      seedVersion: (payload as { seedVersion?: string | null }).seedVersion ?? null,
      requestId: request.requestId,
    });
  });

  app.put('/athletes/:athleteId/progress-challenges/:challengeId', async (request, reply) => {
    const athleteId = asString((request.params as { athleteId?: string }).athleteId);
    const challengeId = asString((request.params as { challengeId?: string }).challengeId);
    const actorUserId = asString(request.auth?.userId);
    if (!athleteId) {
      throw notFound('Athlete id is required');
    }
    if (!challengeId) {
      throw notFound('Progress challenge id is required');
    }
    if (!actorUserId) {
      throw forbidden('Authenticated user is required');
    }
    const body = progressChallengeUpsertRequestSchema.parse(request.body ?? {});
    const action =
      body.status === 'completed'
        ? 'progress_challenge.complete'
        : body.status === 'expired'
          ? 'progress_challenge.expire'
          : 'progress_challenge.upsert';

    try {
      await assertCanWriteAthleteHealth(request, athleteId);
    } catch (error) {
      await recordAuditEvent({
        request,
        action,
        resourceType: 'progress_challenge',
        resourceId: challengeId,
        subjectUserId: athleteOwnerUserId(athleteId),
        result: 'DENY',
        sensitiveRead: true,
        metadata: {
          athleteId,
          status: body.status,
        },
      });
      throw error;
    }

    const payload = await upsertProgressChallengePayload(athleteId, challengeId, actorUserId, body);

    await recordAuditEvent({
      request,
      action,
      resourceType: 'progress_challenge',
      resourceId: challengeId,
      subjectUserId: athleteOwnerUserId(athleteId),
      result: 'SUCCESS',
      sensitiveRead: true,
      metadata: {
        athleteId,
        status: body.status,
      },
    });

    return reply.send({
      challenge: (payload as { challenge?: unknown }).challenge,
      seedVersion: (payload as { seedVersion?: string | null }).seedVersion ?? null,
      requestId: request.requestId,
    });
  });

  app.get('/athletes/:athleteId/self-assessments', async (request, reply) => {
    const athleteId = asString((request.params as { athleteId?: string }).athleteId);
    if (!athleteId) {
      throw notFound('Athlete id is required');
    }
    const query = selfAssessmentListQuerySchema.parse(request.query ?? {});

    try {
      await assertCanReadSelfAssessment(request, athleteId);
    } catch (error) {
      await recordAuditEvent({
        request,
        action: 'self_assessments.read',
        resourceType: 'self_assessment',
        resourceId: athleteId,
        subjectUserId: athleteOwnerUserId(athleteId),
        result: 'DENY',
        sensitiveRead: true,
      });
      throw error;
    }

    const payload = await listSelfAssessmentEntriesPayload(athleteId, query);

    await recordAuditEvent({
      request,
      action: 'self_assessments.read',
      resourceType: 'self_assessment',
      resourceId: athleteId,
      subjectUserId: athleteOwnerUserId(athleteId),
      result: 'SUCCESS',
      sensitiveRead: true,
      metadata: {
        total: payload.total,
      },
    });

    return reply.send({
      athleteId,
      entries: payload.entries,
      total: payload.total,
      seedVersion: payload.seedVersion,
      requestId: request.requestId,
    });
  });

  app.get('/me/self-assessment-prompts', async (request, reply) => {
    const query = selfAssessmentPromptListQuerySchema.parse(request.query ?? {});
    const athleteId = query.athleteId;

    try {
      await assertCanReadSelfAssessment(request, athleteId);
    } catch (error) {
      await recordAuditEvent({
        request,
        action: 'self_assessment_prompts.read',
        resourceType: 'self_assessment_prompt',
        resourceId: athleteId,
        subjectUserId: athleteOwnerUserId(athleteId),
        result: 'DENY',
        sensitiveRead: true,
      });
      throw error;
    }

    const payload = await listPendingSelfAssessmentPromptsPayload(athleteId);

    await recordAuditEvent({
      request,
      action: 'self_assessment_prompts.read',
      resourceType: 'self_assessment_prompt',
      resourceId: athleteId,
      subjectUserId: athleteOwnerUserId(athleteId),
      result: 'SUCCESS',
      sensitiveRead: true,
      metadata: {
        total: payload.prompts.length,
      },
    });

    return reply.send({
      athleteId,
      prompt: payload.prompts[0] ?? null,
      prompts: payload.prompts,
      seedVersion: payload.seedVersion,
      requestId: request.requestId,
    });
  });

  app.post('/self-assessments', async (request, reply) => {
    const actorUserId = asString(request.auth?.userId);
    if (!actorUserId) {
      throw forbidden('Authenticated user is required');
    }
    const body = selfAssessmentSubmitRequestSchema.parse(request.body ?? {});
    const actingRole = request.auth?.actingRole ?? request.auth?.roles?.[0];

    try {
      if (actingRole !== 'athlete' && actingRole !== 'parent') {
        throw forbidden('Only an athlete or linked guardian can submit a self-assessment');
      }
      await assertCanWriteAthleteHealth(request, body.athleteId);
    } catch (error) {
      await recordAuditEvent({
        request,
        action: 'self_assessments.submit',
        resourceType: 'self_assessment',
        resourceId: body.athleteId,
        subjectUserId: athleteOwnerUserId(body.athleteId),
        result: 'DENY',
        sensitiveRead: true,
        metadata: {
          bookingId: body.bookingId,
        },
      });
      throw error;
    }

    const payload = await submitSelfAssessmentPayload(actorUserId, body);

    await recordAuditEvent({
      request,
      action: 'self_assessments.submit',
      resourceType: 'self_assessment',
      resourceId: payload.entry.id,
      subjectUserId: athleteOwnerUserId(body.athleteId),
      result: 'SUCCESS',
      sensitiveRead: true,
      metadata: {
        athleteId: body.athleteId,
        bookingId: body.bookingId,
        promptId: payload.prompt?.id ?? null,
      },
    });

    return reply.code(201).send({
      entry: payload.entry,
      prompt: payload.prompt,
      seedVersion: payload.seedVersion,
      requestId: request.requestId,
    });
  });

  app.post('/self-assessment-prompts/:promptId/dispatch', async (request, reply) => {
    const actorUserId = asString(request.auth?.userId);
    if (!actorUserId) {
      throw forbidden('Authenticated user is required');
    }
    const params = selfAssessmentPromptParamsSchema.parse(request.params ?? {});
    if (!isPrivilegedAdminAuth(request.auth)) {
      await recordAuditEvent({
        request,
        action: 'self_assessment_prompts.dispatch',
        resourceType: 'self_assessment_prompt',
        resourceId: params.promptId,
        result: 'DENY',
        sensitiveRead: true,
      });
      throw forbidden('Only a privileged admin can dispatch self-assessment prompts');
    }
    const payload = await dispatchSelfAssessmentPromptPayload(params.promptId, actorUserId);

    await recordAuditEvent({
      request,
      action: 'self_assessment_prompts.dispatch',
      resourceType: 'self_assessment_prompt',
      resourceId: params.promptId,
      result: 'SUCCESS',
      sensitiveRead: true,
      metadata: {
        athleteId: payload.prompt.athleteId,
      },
    });

    return reply.send({
      prompt: payload.prompt,
      dispatched: true,
      seedVersion: payload.seedVersion,
      requestId: request.requestId,
    });
  });

  app.get('/athletes/:athleteId/termly-reports', async (request, reply) => {
    const params = termlyReportSnapshotParamsSchema.parse(request.params ?? {});
    try {
      await assertCanReadAthleteHealth(request, params.athleteId);
      const payload = await listTermlyReportSnapshotsPayload(params.athleteId);
      await recordAuditEvent({
        request,
        action: 'athlete_termly_reports.read',
        resourceType: 'termly_report_snapshot',
        resourceId: params.athleteId,
        subjectUserId: athleteOwnerUserId(params.athleteId),
        result: 'SUCCESS',
        sensitiveRead: true,
        metadata: {
          total: payload.total,
        },
      });

      return reply.send({
        athleteId: params.athleteId,
        snapshots: payload.snapshots,
        total: payload.total,
        seedVersion: payload.seedVersion,
        requestId: request.requestId,
      });
    } catch (error) {
      await recordAuditEvent({
        request,
        action: 'athlete_termly_reports.read',
        resourceType: 'termly_report_snapshot',
        resourceId: params.athleteId,
        subjectUserId: athleteOwnerUserId(params.athleteId),
        result: error instanceof ApiProblemError && error.status < 500 ? 'DENY' : 'ERROR',
        sensitiveRead: true,
        metadata: {
          errorCode: error instanceof ApiProblemError ? error.code : 'INTERNAL_ERROR',
        },
      });
      throw error;
    }
  });

  app.post('/athletes/:athleteId/termly-reports', async (request, reply) => {
    const params = termlyReportSnapshotParamsSchema.parse(request.params ?? {});
    const actorUserId = asString(request.auth?.userId);
    let body: TermlyReportSnapshotCreateBody | undefined;
    try {
      if (!actorUserId) {
        throw forbidden('Authenticated user is required');
      }
      body = termlyReportSnapshotCreateSchema.parse(request.body ?? {});
      await assertCanReadAthleteHealth(request, params.athleteId);
      const payload = await createTermlyReportSnapshotPayload(params.athleteId, actorUserId, body);

      await recordAuditEvent({
        request,
        action: 'athlete_termly_reports.create',
        resourceType: 'termly_report_snapshot',
        resourceId: payload.snapshot.id,
        subjectUserId: athleteOwnerUserId(params.athleteId),
        result: 'SUCCESS',
        sensitiveRead: true,
        metadata: {
          athleteId: params.athleteId,
          generatedAt: body.report.generatedAt,
          rangeLabel: body.report.range.label,
        },
      });

      return reply.code(201).send({
        snapshot: payload.snapshot,
        seedVersion: payload.seedVersion,
        requestId: request.requestId,
      });
    } catch (error) {
      await recordAuditEvent({
        request,
        action: 'athlete_termly_reports.create',
        resourceType: 'termly_report_snapshot',
        resourceId: params.athleteId,
        subjectUserId: athleteOwnerUserId(params.athleteId),
        result:
          isZodValidationError(error) ||
          (error instanceof ApiProblemError && error.status < 500)
            ? 'DENY'
            : 'ERROR',
        sensitiveRead: true,
        metadata: {
          athleteId: params.athleteId,
          generatedAt: body?.report.generatedAt ?? null,
          rangeLabel: body?.report.range.label ?? null,
          errorCode:
            isZodValidationError(error)
              ? 'VALIDATION_FAILED'
              : error instanceof ApiProblemError
                ? error.code
                : 'INTERNAL_ERROR',
        },
      });
      throw error;
    }
  });

  app.post('/athletes/:athleteId/weekly-recaps/dispatch', async (request, reply) => {
    const params = weeklyRecapDispatchParamsSchema.parse(request.params ?? {});
    let body: WeeklyRecapDispatchBody | undefined;
    try {
      body = weeklyRecapDispatchRequestSchema.parse(request.body ?? {});
      await assertCanReadAthleteHealth(request, params.athleteId);
      const payload = await createWeeklyRecapDispatchPayload(request, params.athleteId, body);

      await recordAuditEvent({
        request,
        action: 'athlete_weekly_recap.dispatch',
        resourceType: 'weekly_recap',
        resourceId: params.athleteId,
        subjectUserId: athleteOwnerUserId(params.athleteId),
        result: 'SUCCESS',
        sensitiveRead: true,
        metadata: {
          parentId: body.parentId,
          weekKey: payload.weekKey,
          sent: payload.sent,
          reason: payload.reason,
          notificationId: asString(payload.notification?.id) ?? null,
        },
      });

      return reply.send({
        sent: payload.sent,
        reason: payload.reason,
        weekKey: payload.weekKey,
        notification: payload.notification,
        seedVersion: payload.seedVersion,
        requestId: request.requestId,
      });
    } catch (error) {
      await recordAuditEvent({
        request,
        action: 'athlete_weekly_recap.dispatch',
        resourceType: 'weekly_recap',
        resourceId: params.athleteId,
        subjectUserId: athleteOwnerUserId(params.athleteId),
        result:
          isZodValidationError(error) ||
          (error instanceof ApiProblemError && error.status < 500)
            ? 'DENY'
            : 'ERROR',
        sensitiveRead: true,
        metadata: {
          parentId: body?.parentId ?? null,
          errorCode:
            isZodValidationError(error)
              ? 'VALIDATION_FAILED'
              : error instanceof ApiProblemError
                ? error.code
                : 'INTERNAL_ERROR',
        },
      });
      throw error;
    }
  });

  app.get('/athletes/:athleteId/analytics', async (request, reply) => {
    const athleteId = asString((request.params as { athleteId?: string }).athleteId);
    if (!athleteId) {
      throw notFound('Athlete id is required');
    }
    let requestValidated = false;
    let responseContractInvalid = false;
    let period: AthleteAnalyticsPeriod | undefined;
    try {
      const query = athleteAnalyticsQuerySchema.parse(request.query ?? {});
      requestValidated = true;
      period = query.period;
      await assertCanReadAthleteHealth(request, athleteId);
      const payload = await buildAthleteAnalyticsPayload(athleteId, query.period);
      const parsed = athleteAnalyticsResponseSchema.safeParse({
        ...payload,
        seedVersion: payload.seedVersion ?? null,
        requestId: request.requestId,
      });
      if (!parsed.success) {
        responseContractInvalid = true;
        throw new ApiProblemError(
          500,
          'INTERNAL_ERROR',
          'Athlete analytics response contract invalid',
        );
      }

      await recordAuditEvent({
        request,
        action: 'athlete_analytics.read',
        resourceType: 'athlete_analytics',
        resourceId: athleteId,
        subjectUserId: athleteOwnerUserId(athleteId),
        result: 'SUCCESS',
        sensitiveRead: true,
        metadata: {
          period: query.period,
          totalSessions: parsed.data.analytics.totalSessions,
          skillCount: parsed.data.analytics.skills.length,
        },
      });

      return reply.send(parsed.data);
    } catch (error) {
      await recordAuditEvent({
        request,
        action: 'athlete_analytics.read',
        resourceType: 'athlete_analytics',
        resourceId: athleteId,
        subjectUserId: athleteOwnerUserId(athleteId),
        result:
          (!requestValidated && isZodValidationError(error)) ||
          (error instanceof ApiProblemError && error.status < 500)
            ? 'DENY'
            : 'ERROR',
        sensitiveRead: true,
        metadata: {
          period: period ?? null,
          errorCode: responseContractInvalid
            ? 'RESPONSE_CONTRACT_INVALID'
            : isZodValidationError(error)
              ? 'VALIDATION_FAILED'
              : error instanceof ApiProblemError
                ? error.code
                : 'INTERNAL_ERROR',
        },
      });
      throw error;
    }
  });

  app.post('/drill-assignments', async (request, reply) => {
    const body = drillAssignmentCreateRequestSchema.parse(request.body ?? {});
    const auditMetadata = {
      athleteId: body.athleteId,
      drillId: body.drillId,
      dueDate: body.dueDate,
      requiresEvidence: body.requiresEvidence,
    };

    try {
      const actorUserId = await assertCanCreateDrillAssignment(request, body.athleteId);
      const payload = await createDrillAssignmentPayload(
        body,
        actorUserId,
        isPrivilegedAdminAuth(request.auth),
      );
      const assignmentId = asString((payload.assignment as SeedRow).id) ?? body.drillId;

      await recordAuditEvent({
        request,
        action: 'drill_assignment.create',
        resourceType: 'drill_assignment',
        resourceId: assignmentId,
        subjectUserId: athleteOwnerUserId(body.athleteId),
        result: 'SUCCESS',
        sensitiveRead: true,
        metadata: auditMetadata,
      });

      return reply.code(201).send({
        assignment: payload.assignment,
        seedVersion: payload.seedVersion,
        requestId: request.requestId,
      });
    } catch (error) {
      await recordAuditEvent({
        request,
        action: 'drill_assignment.create',
        resourceType: 'drill_assignment',
        resourceId: body.drillId,
        subjectUserId: athleteOwnerUserId(body.athleteId),
        result: error instanceof ApiProblemError && error.status < 500 ? 'DENY' : 'ERROR',
        sensitiveRead: true,
        metadata: auditMetadata,
      });
      throw error;
    }
  });

  app.get('/athletes/:athleteId/drill-assignments', async (request, reply) => {
    const athleteId = asString((request.params as { athleteId?: string }).athleteId);
    if (!athleteId) {
      throw notFound('Athlete id is required');
    }
    const query = drillAssignmentQuerySchema.parse(request.query ?? {});

    try {
      await assertCanReadAthleteHealth(request, athleteId);
    } catch (error) {
      await recordAuditEvent({
        request,
        action: 'drill_assignments.read',
        resourceType: 'drill_assignment',
        resourceId: athleteId,
        subjectUserId: athleteOwnerUserId(athleteId),
        result: 'DENY',
        sensitiveRead: true,
        metadata: {
          includeCompleted: query.includeCompleted,
        },
      });
      throw error;
    }

    const payload = await getAthleteDrillAssignmentsPayload(athleteId, query.includeCompleted);

    await recordAuditEvent({
      request,
      action: 'drill_assignments.read',
      resourceType: 'drill_assignment',
      resourceId: athleteId,
      subjectUserId: athleteOwnerUserId(athleteId),
      result: 'SUCCESS',
      sensitiveRead: true,
      metadata: {
        includeCompleted: query.includeCompleted,
        assignmentCount: payload.total,
      },
    });

    return reply.send({
      ...payload,
      requestId: request.requestId,
    });
  });

  app.get('/athletes/:athleteId/practice-tasks', async (request, reply) => {
    const athleteId = asString((request.params as { athleteId?: string }).athleteId);
    if (!athleteId) {
      throw notFound('Athlete id is required');
    }
    const query = practiceTaskQuerySchema.parse(request.query ?? {});

    try {
      await assertCanReadAthleteHealth(request, athleteId);
    } catch (error) {
      await recordAuditEvent({
        request,
        action: 'practice_tasks.read',
        resourceType: 'practice_task',
        resourceId: athleteId,
        subjectUserId: athleteOwnerUserId(athleteId),
        result: 'DENY',
        sensitiveRead: true,
        metadata: {
          viewerRole: query.viewerRole,
        },
      });
      throw error;
    }

    const payload = await getAthletePracticeTaskPayload(athleteId, query.viewerRole);

    await recordAuditEvent({
      request,
      action: 'practice_tasks.read',
      resourceType: 'practice_task',
      resourceId: athleteId,
      subjectUserId: athleteOwnerUserId(athleteId),
      result: 'SUCCESS',
      sensitiveRead: true,
      metadata: {
        viewerRole: query.viewerRole,
        taskCount: payload.total,
      },
    });

    return reply.send({
      ...payload,
      requestId: request.requestId,
    });
  });

  app.get('/drill-assignments/:assignmentId', async (request, reply) => {
    const assignmentId = asString((request.params as { assignmentId?: string }).assignmentId);
    if (!assignmentId) {
      throw notFound('Drill assignment id is required');
    }
    const context = await getPracticeTaskAssignmentContext(assignmentId);

    try {
      await assertCanReadAthleteHealth(request, context.athleteId);
    } catch (error) {
      await recordAuditEvent({
        request,
        action: 'drill_assignment.read',
        resourceType: 'drill_assignment',
        resourceId: context.assignmentId,
        subjectUserId: athleteOwnerUserId(context.athleteId),
        result: 'DENY',
        sensitiveRead: true,
        metadata: {
          athleteId: context.athleteId,
        },
      });
      throw error;
    }

    let payload: Awaited<ReturnType<typeof getDrillAssignmentDetailPayload>>;
    try {
      payload = await getDrillAssignmentDetailPayload(context);
    } catch (error) {
      await recordAuditEvent({
        request,
        action: 'drill_assignment.read',
        resourceType: 'drill_assignment',
        resourceId: context.assignmentId,
        subjectUserId: athleteOwnerUserId(context.athleteId),
        result: 'ERROR',
        sensitiveRead: true,
        metadata: {
          athleteId: context.athleteId,
        },
      });
      throw error;
    }

    await recordAuditEvent({
      request,
      action: 'drill_assignment.read',
      resourceType: 'drill_assignment',
      resourceId: context.assignmentId,
      subjectUserId: athleteOwnerUserId(context.athleteId),
      result: 'SUCCESS',
      sensitiveRead: true,
      metadata: {
        athleteId: context.athleteId,
      },
    });

    return reply.send({
      assignment: payload.assignment,
      seedVersion: payload.seedVersion,
      requestId: request.requestId,
    });
  });

  app.post('/practice-tasks/:taskId/completion', async (request, reply) => {
    const taskId = asString((request.params as { taskId?: string }).taskId);
    if (!taskId) {
      throw notFound('Practice task id is required');
    }
    const body = practiceTaskCompletionRequestSchema.parse(request.body ?? {});
    const context = await getPracticeTaskAssignmentContext(taskId);
    const actorUserId = asString(request.auth?.userId);

    try {
      if (!actorUserId) {
        throw forbidden('Authenticated user is required');
      }
      await assertCanWriteAthleteHealth(request, context.athleteId);
    } catch (error) {
      await recordAuditEvent({
        request,
        action: 'practice_task.completion_update',
        resourceType: 'practice_task',
        resourceId: context.assignmentId,
        subjectUserId: athleteOwnerUserId(context.athleteId),
        result: 'DENY',
        sensitiveRead: true,
        metadata: {
          taskId,
          athleteId: context.athleteId,
          completed: body.completed,
        },
      });
      throw error;
    }

    const payload = await setPracticeTaskCompletion(
      context,
      body.completed,
      actorUserId,
      body.completionNote,
    );

    await recordAuditEvent({
      request,
      action: 'practice_task.completion_update',
      resourceType: 'practice_task',
      resourceId: context.assignmentId,
      subjectUserId: athleteOwnerUserId(context.athleteId),
      result: 'SUCCESS',
      sensitiveRead: true,
      metadata: {
        taskId,
        athleteId: context.athleteId,
        completed: body.completed,
      },
    });

    return reply.send({
      task: payload.task,
      seedVersion: payload.seedVersion,
      requestId: request.requestId,
    });
  });

  app.patch('/drill-assignments/:assignmentId/completion', async (request, reply) => {
    const assignmentId = asString((request.params as { assignmentId?: string }).assignmentId);
    if (!assignmentId) {
      throw notFound('Drill assignment id is required');
    }
    const body = practiceTaskCompletionRequestSchema.parse(request.body ?? {});
    const context = await getPracticeTaskAssignmentContext(assignmentId);
    const actorUserId = asString(request.auth?.userId);

    try {
      if (!actorUserId) {
        throw forbidden('Authenticated user is required');
      }
      await assertCanWriteAthleteHealth(request, context.athleteId);
    } catch (error) {
      await recordAuditEvent({
        request,
        action: 'drill_assignment.completion_update',
        resourceType: 'drill_assignment',
        resourceId: context.assignmentId,
        subjectUserId: athleteOwnerUserId(context.athleteId),
        result: 'DENY',
        sensitiveRead: true,
        metadata: {
          athleteId: context.athleteId,
          completed: body.completed,
        },
      });
      throw error;
    }

    const taskPayload = await setPracticeTaskCompletion(
      context,
      body.completed,
      actorUserId,
      body.completionNote,
    );
    const assignmentsPayload = await getAthleteDrillAssignmentsPayload(context.athleteId, true);
    const assignment = assignmentsPayload.assignments.find(
      (entry) => asString((entry as SeedRow).id) === context.assignmentId,
    );
    if (!assignment) {
      throw notFound('Updated drill assignment not found', {
        assignmentId: context.assignmentId,
      });
    }

    await recordAuditEvent({
      request,
      action: 'drill_assignment.completion_update',
      resourceType: 'drill_assignment',
      resourceId: context.assignmentId,
      subjectUserId: athleteOwnerUserId(context.athleteId),
      result: 'SUCCESS',
      sensitiveRead: true,
      metadata: {
        athleteId: context.athleteId,
        completed: body.completed,
      },
    });

    return reply.send({
      assignment,
      task: taskPayload.task,
      seedVersion: assignmentsPayload.seedVersion ?? taskPayload.seedVersion,
      requestId: request.requestId,
    });
  });

  app.delete('/drill-assignments/:assignmentId', async (request, reply) => {
    const assignmentId = asString((request.params as { assignmentId?: string }).assignmentId);
    if (!assignmentId) {
      throw notFound('Drill assignment id is required');
    }
    const context = await getPracticeTaskAssignmentContext(assignmentId);

    let actorUserId: string;
    try {
      actorUserId = await assertCanCoachActOnPracticeTask(request, context);
    } catch (error) {
      await recordAuditEvent({
        request,
        action: 'drill_assignment.remove',
        resourceType: 'drill_assignment',
        resourceId: context.assignmentId,
        subjectUserId: athleteOwnerUserId(context.athleteId),
        result: 'DENY',
        sensitiveRead: true,
        metadata: {
          athleteId: context.athleteId,
        },
      });
      throw error;
    }

    let payload: Awaited<ReturnType<typeof softRemoveDrillAssignment>>;
    try {
      payload = await softRemoveDrillAssignment(context, actorUserId);
    } catch (error) {
      await recordAuditEvent({
        request,
        action: 'drill_assignment.remove',
        resourceType: 'drill_assignment',
        resourceId: context.assignmentId,
        subjectUserId: athleteOwnerUserId(context.athleteId),
        result: 'ERROR',
        sensitiveRead: true,
        metadata: {
          athleteId: context.athleteId,
        },
      });
      throw error;
    }

    await recordAuditEvent({
      request,
      action: 'drill_assignment.remove',
      resourceType: 'drill_assignment',
      resourceId: context.assignmentId,
      subjectUserId: athleteOwnerUserId(context.athleteId),
      result: 'SUCCESS',
      sensitiveRead: true,
      metadata: {
        athleteId: context.athleteId,
        removedAt: payload.assignment.deletedAt,
      },
    });

    return reply.send({
      removed: true,
      assignment: payload.assignment,
      seedVersion: payload.seedVersion,
      requestId: request.requestId,
    });
  });

  app.patch('/practice-tasks/:taskId/due-at', async (request, reply) => {
    const taskId = asString((request.params as { taskId?: string }).taskId);
    if (!taskId) {
      throw notFound('Practice task id is required');
    }
    const body = practiceTaskDueAtRequestSchema.parse(request.body ?? {});
    const context = await getPracticeTaskAssignmentContext(taskId);
    const actorUserId = asString(request.auth?.userId);
    const isPrivilegedAdmin = isPrivilegedAdminAuth(request.auth);

    try {
      if (!actorUserId) {
        throw forbidden('Authenticated user is required');
      }
      if (!isPrivilegedAdmin) {
        await assertCanWriteAthleteHealth(request, context.athleteId);
      }
      if (actorUserId !== context.coachUserId && !isPrivilegedAdmin) {
        throw forbidden('Only the assigned coach or privileged admin can update task due dates');
      }
    } catch (error) {
      await recordAuditEvent({
        request,
        action: 'practice_task.due_at_update',
        resourceType: 'practice_task',
        resourceId: context.assignmentId,
        subjectUserId: athleteOwnerUserId(context.athleteId),
        result: 'DENY',
        sensitiveRead: true,
        metadata: {
          taskId,
          athleteId: context.athleteId,
        },
      });
      throw error;
    }

    const payload = await updatePracticeTaskDueAt(context, body.dueAt, actorUserId);

    await recordAuditEvent({
      request,
      action: 'practice_task.due_at_update',
      resourceType: 'practice_task',
      resourceId: context.assignmentId,
      subjectUserId: athleteOwnerUserId(context.athleteId),
      result: 'SUCCESS',
      sensitiveRead: true,
      metadata: {
        taskId,
        athleteId: context.athleteId,
        dueAt: payload.task.dueAt,
      },
    });

    return reply.send({
      task: payload.task,
      seedVersion: payload.seedVersion,
      requestId: request.requestId,
    });
  });

  app.post('/practice-tasks/:taskId/snooze', async (request, reply) => {
    const taskId = asString((request.params as { taskId?: string }).taskId);
    if (!taskId) {
      throw notFound('Practice task id is required');
    }
    const body = practiceTaskSnoozeRequestSchema.parse(request.body ?? {});
    const context = await getPracticeTaskAssignmentContext(taskId);
    const actorUserId = asString(request.auth?.userId);
    const isPrivilegedAdmin = isPrivilegedAdminAuth(request.auth);

    try {
      if (!actorUserId) {
        throw forbidden('Authenticated user is required');
      }
      if (!isPrivilegedAdmin) {
        await assertCanWriteAthleteHealth(request, context.athleteId);
      }
      if (actorUserId !== context.coachUserId && !isPrivilegedAdmin) {
        throw forbidden('Only the assigned coach or privileged admin can snooze task due dates');
      }
    } catch (error) {
      await recordAuditEvent({
        request,
        action: 'practice_task.snooze',
        resourceType: 'practice_task',
        resourceId: context.assignmentId,
        subjectUserId: athleteOwnerUserId(context.athleteId),
        result: 'DENY',
        sensitiveRead: true,
        metadata: {
          taskId,
          athleteId: context.athleteId,
          hours: body.hours,
        },
      });
      throw error;
    }

    const current = (await getAthletePracticeTaskPayload(context.athleteId, 'coach')).tasks.find(
      (entry) => entry.drillAssignmentId === context.assignmentId,
    );
    if (!current) {
      throw notFound('Practice task not found', { taskId });
    }
    const baseDueMs = parseDateMs(current.dueAt);
    const baseMs = Number.isNaN(baseDueMs) ? Date.now() : Math.max(Date.now(), baseDueMs);
    const dueAt = new Date(baseMs + body.hours * 60 * 60 * 1000).toISOString();
    const payload = await updatePracticeTaskDueAt(context, dueAt, actorUserId);

    await recordAuditEvent({
      request,
      action: 'practice_task.snooze',
      resourceType: 'practice_task',
      resourceId: context.assignmentId,
      subjectUserId: athleteOwnerUserId(context.athleteId),
      result: 'SUCCESS',
      sensitiveRead: true,
      metadata: {
        taskId,
        athleteId: context.athleteId,
        hours: body.hours,
        dueAt: payload.task.dueAt,
      },
    });

    return reply.send({
      task: payload.task,
      seedVersion: payload.seedVersion,
      requestId: request.requestId,
    });
  });

  app.post('/practice-tasks/actions/review', async (request, reply) => {
    const body = practiceTaskBulkActionRequestSchema.parse(request.body ?? {});
    const taskIds = normalizePracticeTaskIds(body.taskIds);
    const contexts = await getPracticeTaskAssignmentContexts(taskIds);
    await authorizePracticeTaskBulkAction(request, contexts, 'practice_task.review');

    await Promise.all(
      contexts.map((context) =>
        recordPracticeTaskActionAudit({
          request,
          context,
          action: 'practice_task.review',
          result: 'SUCCESS',
        }),
      ),
    );

    return reply.send({
      requestedCount: taskIds.length,
      updatedCount: contexts.length,
      skippedCount: taskIds.length - contexts.length,
      requestId: request.requestId,
    });
  });

  app.post('/practice-tasks/actions/follow-up', async (request, reply) => {
    const body = practiceTaskFollowUpRequestSchema.parse(request.body ?? {});
    const taskIds = normalizePracticeTaskIds(body.taskIds);
    const contexts = await getPracticeTaskAssignmentContexts(taskIds);
    const metadata = { actionType: body.actionType };
    await authorizePracticeTaskBulkAction(request, contexts, 'practice_task.follow_up', metadata);

    await Promise.all(
      contexts.map((context) =>
        recordPracticeTaskActionAudit({
          request,
          context,
          action: 'practice_task.follow_up',
          result: 'SUCCESS',
          metadata,
        }),
      ),
    );

    return reply.send({
      requestedCount: taskIds.length,
      updatedCount: contexts.length,
      skippedCount: taskIds.length - contexts.length,
      requestId: request.requestId,
    });
  });

  app.post('/practice-tasks/actions/recovery-checkpoint', async (request, reply) => {
    const body = practiceTaskRecoveryCheckpointRequestSchema.parse(request.body ?? {});
    const taskIds = normalizePracticeTaskIds(body.taskIds);
    const contexts = await getPracticeTaskAssignmentContexts(taskIds);
    const actorUserId = await authorizePracticeTaskBulkAction(
      request,
      contexts,
      'practice_task.recovery_checkpoint',
      { hours: body.hours },
    );
    const dueAt = new Date(Date.now() + body.hours * 60 * 60 * 1000).toISOString();

    await Promise.all(
      contexts.map(async (context) => {
        await updatePracticeTaskDueAt(context, dueAt, actorUserId);
        await recordPracticeTaskActionAudit({
          request,
          context,
          action: 'practice_task.recovery_checkpoint',
          result: 'SUCCESS',
          metadata: {
            hours: body.hours,
            dueAt,
          },
        });
      }),
    );

    return reply.send({
      requestedCount: taskIds.length,
      updatedCount: contexts.length,
      skippedCount: taskIds.length - contexts.length,
      dueAt,
      requestId: request.requestId,
    });
  });

  app.get('/coaches/:coachId/practice-follow-ups', async (request, reply) => {
    const coachId = asString((request.params as { coachId?: string }).coachId);
    if (!coachId) {
      throw notFound('Coach id is required');
    }
    const authUserId = request.auth?.userId;
    const isPrivilegedAdmin = isPrivilegedAdminAuth(request.auth);

    try {
      if (!authUserId) {
        throw forbidden('Authenticated user is required');
      }
      if (authUserId !== coachId && !isPrivilegedAdmin) {
        throw forbidden('Only the coach or privileged admin can read practice follow-ups');
      }
    } catch (error) {
      await recordAuditEvent({
        request,
        action: 'practice_followups.read',
        resourceType: 'coach_practice_followup',
        resourceId: coachId,
        subjectUserId: coachId,
        result: 'DENY',
        sensitiveRead: true,
      });
      throw error;
    }

    const payload = await getCoachPracticeFollowUpPayload(coachId);

    await recordAuditEvent({
      request,
      action: 'practice_followups.read',
      resourceType: 'coach_practice_followup',
      resourceId: coachId,
      subjectUserId: coachId,
      result: 'SUCCESS',
      sensitiveRead: true,
      metadata: {
        queueCount: payload.total,
      },
    });

    return reply.send({
      ...payload,
      requestId: request.requestId,
    });
  });

  app.get('/athletes/:athleteId/skills/history', async (request, reply) => {
    const athleteId = asString((request.params as { athleteId?: string }).athleteId);
    if (!athleteId) {
      throw notFound('Athlete id is required');
    }
    let requestValidated = false;
    let responseContractInvalid = false;
    let filtered = false;
    try {
      const query = athleteSkillHistoryQuerySchema.parse(request.query ?? {});
      requestValidated = true;
      filtered = Boolean(query.skillName);
      await assertCanReadAthleteHealth(request, athleteId);
      const progress = await getAthleteProgressPayload(athleteId);
      const parsed = athleteSkillHistoryResponseSchema.safeParse({
        athleteId,
        skills: buildSkillProgress(
          progress.skillAssessments,
          progress.skillDefinitions,
          query.skillName,
        ),
        seedVersion: progress.seedVersion ?? null,
        requestId: request.requestId,
      });
      if (!parsed.success) {
        responseContractInvalid = true;
        throw new ApiProblemError(
          500,
          'INTERNAL_ERROR',
          'Athlete skill history response contract invalid',
        );
      }

      await recordAuditEvent({
        request,
        action: 'athlete_skill_history.read',
        resourceType: 'athlete_skill_history',
        resourceId: athleteId,
        subjectUserId: athleteOwnerUserId(athleteId),
        result: 'SUCCESS',
        sensitiveRead: true,
        metadata: {
          filtered,
          skillCount: parsed.data.skills.length,
        },
      });

      return reply.send(parsed.data);
    } catch (error) {
      await recordAuditEvent({
        request,
        action: 'athlete_skill_history.read',
        resourceType: 'athlete_skill_history',
        resourceId: athleteId,
        subjectUserId: athleteOwnerUserId(athleteId),
        result:
          (!requestValidated && isZodValidationError(error)) ||
          (error instanceof ApiProblemError && error.status < 500)
            ? 'DENY'
            : 'ERROR',
        sensitiveRead: true,
        metadata: {
          filtered,
          errorCode: responseContractInvalid
            ? 'RESPONSE_CONTRACT_INVALID'
            : isZodValidationError(error)
              ? 'VALIDATION_FAILED'
              : error instanceof ApiProblemError
                ? error.code
                : 'INTERNAL_ERROR',
        },
      });
      throw error;
    }
  });

  app.get('/athletes/:athleteId/squad-activity', async (request, reply) => {
    const athleteId = asString((request.params as { athleteId?: string }).athleteId);
    if (!athleteId) {
      throw notFound('Athlete id is required');
    }
    const query = squadActivityQuerySchema.parse(request.query ?? {});

    try {
      await assertCanReadAthleteHealth(request, athleteId);
    } catch (error) {
      await recordAuditEvent({
        request,
        action: 'athlete_squad_activity.read',
        resourceType: 'squad_activity',
        resourceId: athleteId,
        subjectUserId: athleteOwnerUserId(athleteId),
        result: 'DENY',
        sensitiveRead: true,
      });
      throw error;
    }

    const payload = await getAthleteSquadActivityPayload(athleteId, query);

    await recordAuditEvent({
      request,
      action: 'athlete_squad_activity.read',
      resourceType: 'squad_activity',
      resourceId: athleteId,
      subjectUserId: athleteOwnerUserId(athleteId),
      result: 'SUCCESS',
      sensitiveRead: true,
      metadata: {
        squadCount: payload.squadIds.length,
        itemCount: payload.items.length,
        totalItems: payload.summary.totalItems,
      },
    });

    return reply.send({
      ...payload,
      requestId: request.requestId,
    });
  });

  app.post('/athletes/:athleteId/skill-updates', async (request, reply) => {
    const athleteId = asString((request.params as { athleteId?: string }).athleteId);
    if (!athleteId) {
      throw notFound('Athlete id is required');
    }
    let body: AthleteSkillUpdateRequest | null = null;
    let responseContractInvalid = false;
    try {
      body = athleteSkillUpdateRequestSchema.parse(request.body);
      await assertCanCreateAthleteSkillUpdate(request, athleteId);
      const assessorUserId = request.auth?.userId;
      if (!assessorUserId) {
        throw forbidden('Authenticated user is required');
      }
      const payload = await createAthleteSkillUpdate(
        athleteId,
        body,
        assessorUserId,
        isPrivilegedAdminAuth(request.auth),
      );
      const parsed = athleteSkillUpdateResponseSchema.safeParse({
        athleteId,
        ...payload,
        requestId: request.requestId,
      });
      if (!parsed.success) {
        responseContractInvalid = true;
        throw new ApiProblemError(
          500,
          'INTERNAL_ERROR',
          'Athlete skill update response contract invalid',
        );
      }

      await recordAuditEvent({
        request,
        action: 'athlete_skill_update.create',
        resourceType: 'athlete_skill_update',
        resourceId: parsed.data.skillAssessment.id,
        subjectUserId: athleteOwnerUserId(athleteId),
        result: 'SUCCESS',
        metadata: {
          athleteId,
          skillCode: parsed.data.skillDefinition.code,
          previousScore: parsed.data.previousScore,
          score: parsed.data.score,
          sourceType: body.bookingId ? 'booking' : body.sessionId ? 'session' : 'ad_hoc',
          replayed: parsed.data.replayed,
        },
      });

      return reply.code(parsed.data.replayed ? 200 : 201).send(parsed.data);
    } catch (error) {
      await recordAuditEvent({
        request,
        action: 'athlete_skill_update.create',
        resourceType: 'athlete_skill_update',
        resourceId: athleteId,
        subjectUserId: athleteOwnerUserId(athleteId),
        result:
          isZodValidationError(error) ||
          (error instanceof ApiProblemError && error.status < 500)
            ? 'DENY'
            : 'ERROR',
        metadata: {
          skillCode: body ? skillDefinitionCode(body.skillName) : null,
          sourceType: body?.bookingId ? 'booking' : body?.sessionId ? 'session' : 'ad_hoc',
          errorCode: responseContractInvalid
            ? 'RESPONSE_CONTRACT_INVALID'
            : isZodValidationError(error)
              ? 'VALIDATION_FAILED'
              : error instanceof ApiProblemError
                ? error.code
                : 'INTERNAL_ERROR',
        },
      });
      throw error;
    }
  });

  app.get('/athletes/:athleteId/coach-observations', async (request, reply) => {
    const athleteId = asString((request.params as { athleteId?: string }).athleteId);
    if (!athleteId) {
      throw notFound('Athlete id is required');
    }
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }

    try {
      await assertCanManageCoachObservation(request, athleteId);
      const payload = await listCoachObservations({
        athleteId,
        authUserId,
        includeAll: isPrivilegedAdminAuth(request.auth),
      });

      await recordAuditEvent({
        request,
        action: 'coach_observation.read',
        resourceType: 'coach_observation',
        resourceId: athleteId,
        subjectUserId: athleteOwnerUserId(athleteId),
        result: 'SUCCESS',
        sensitiveRead: true,
        metadata: {
          count: payload.observations.length,
        },
      });

      return reply.send({
        athleteId,
        observations: payload.observations,
        total: payload.observations.length,
        seedVersion: payload.seedVersion,
        requestId: request.requestId,
      });
    } catch (error) {
      await recordAuditEvent({
        request,
        action: 'coach_observation.read',
        resourceType: 'coach_observation',
        resourceId: athleteId,
        subjectUserId: athleteOwnerUserId(athleteId),
        result: error instanceof ApiProblemError && error.status < 500 ? 'DENY' : 'ERROR',
        sensitiveRead: true,
      });
      throw error;
    }
  });

  app.post('/athletes/:athleteId/coach-observations', async (request, reply) => {
    const athleteId = asString((request.params as { athleteId?: string }).athleteId);
    if (!athleteId) {
      throw notFound('Athlete id is required');
    }
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }
    const body = coachObservationCreateRequestSchema.parse(request.body ?? {});

    try {
      await assertCanManageCoachObservation(request, athleteId);
      const payload = await createCoachObservation({
        athleteId,
        authUserId,
        body,
      });

      await recordAuditEvent({
        request,
        action: 'coach_observation.create',
        resourceType: 'coach_observation',
        resourceId: payload.observation.id,
        subjectUserId: athleteOwnerUserId(athleteId),
        result: 'SUCCESS',
        metadata: {
          athleteId,
          category: payload.observation.category,
          isPrivate: payload.observation.isPrivate,
        },
      });

      return reply.status(201).send({
        athleteId,
        observation: payload.observation,
        seedVersion: payload.seedVersion,
        requestId: request.requestId,
      });
    } catch (error) {
      await recordAuditEvent({
        request,
        action: 'coach_observation.create',
        resourceType: 'coach_observation',
        resourceId: athleteId,
        subjectUserId: athleteOwnerUserId(athleteId),
        result: error instanceof ApiProblemError && error.status < 500 ? 'DENY' : 'ERROR',
        metadata: {
          category: body.category,
          isPrivate: body.isPrivate,
        },
      });
      throw error;
    }
  });

  app.patch('/coach-observations/:observationId', async (request, reply) => {
    const observationId = asString((request.params as { observationId?: string }).observationId);
    if (!observationId) {
      throw notFound('Coach observation id is required');
    }
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }
    const body = coachObservationUpdateRequestSchema.parse(request.body ?? {});
    let athleteId = '';

    try {
      const existing = await findCoachObservationById(observationId);
      if (!existing) {
        throw notFound('Coach observation not found', { observationId });
      }
      athleteId = asString(existing.row.athleteId) ?? '';
      await assertCanManageCoachObservation(request, athleteId);

      const payload = await updateCoachObservation({
        observationId,
        authUserId,
        body,
      });

      await recordAuditEvent({
        request,
        action: 'coach_observation.update',
        resourceType: 'coach_observation',
        resourceId: observationId,
        subjectUserId: athleteId ? athleteOwnerUserId(athleteId) : null,
        result: 'SUCCESS',
        metadata: {
          athleteId,
          changedFields: Object.keys(body),
        },
      });

      return reply.send({
        athleteId,
        observation: payload.observation,
        seedVersion: payload.seedVersion,
        requestId: request.requestId,
      });
    } catch (error) {
      await recordAuditEvent({
        request,
        action: 'coach_observation.update',
        resourceType: 'coach_observation',
        resourceId: observationId,
        subjectUserId: athleteId ? athleteOwnerUserId(athleteId) : null,
        result: error instanceof ApiProblemError && error.status < 500 ? 'DENY' : 'ERROR',
        metadata: {
          athleteId: athleteId || null,
          changedFields: Object.keys(body),
        },
      });
      throw error;
    }
  });

  app.delete('/coach-observations/:observationId', async (request, reply) => {
    const observationId = asString((request.params as { observationId?: string }).observationId);
    if (!observationId) {
      throw notFound('Coach observation id is required');
    }
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }
    let athleteId = '';

    try {
      const existing = await findCoachObservationById(observationId);
      if (!existing) {
        throw notFound('Coach observation not found', { observationId });
      }
      athleteId = asString(existing.row.athleteId) ?? '';
      await assertCanManageCoachObservation(request, athleteId);

      const payload = await removeCoachObservation({
        observationId,
        authUserId,
      });

      await recordAuditEvent({
        request,
        action: 'coach_observation.remove',
        resourceType: 'coach_observation',
        resourceId: observationId,
        subjectUserId: athleteId ? athleteOwnerUserId(athleteId) : null,
        result: 'SUCCESS',
        metadata: {
          athleteId,
        },
      });

      return reply.status(200).send({
        removed: true,
        observationId,
        athleteId,
        coachId:
          asString(existing.row.coachUserId) ??
          asString(existing.row.createdByUserId) ??
          authUserId,
        seedVersion: payload.seedVersion,
        requestId: request.requestId,
      });
    } catch (error) {
      await recordAuditEvent({
        request,
        action: 'coach_observation.remove',
        resourceType: 'coach_observation',
        resourceId: observationId,
        subjectUserId: athleteId ? athleteOwnerUserId(athleteId) : null,
        result: error instanceof ApiProblemError && error.status < 500 ? 'DENY' : 'ERROR',
        metadata: {
          athleteId: athleteId || null,
        },
      });
      throw error;
    }
  });

  app.get('/athletes/:athleteId/goals', async (request, reply) => {
    const athleteId = asString((request.params as { athleteId?: string }).athleteId);
    if (!athleteId) {
      throw notFound('Athlete id is required');
    }
    await assertCanReadAthleteHealth(request, athleteId);

    const payload = await getAthleteGoalsPayload(athleteId);

    await recordAuditEvent({
      request,
      action: 'athlete_goals.read',
      resourceType: 'goal',
      resourceId: athleteId,
      result: 'SUCCESS',
      sensitiveRead: true,
    });

    return reply.send({
      athleteId,
      goals: payload.goals,
      milestones: payload.milestones,
      seedVersion: payload.seedVersion,
      requestId: request.requestId,
    });
  });

  app.post('/athletes/:athleteId/goals', async (request, reply) => {
    const athleteId = asString((request.params as { athleteId?: string }).athleteId);
    if (!athleteId) {
      throw notFound('Athlete id is required');
    }
    await assertCanWriteAthleteHealth(request, athleteId);
    const actorUserId = asString(request.auth?.userId);
    if (!actorUserId) {
      throw forbidden('Authenticated user is required');
    }
    const body = goalCreateRequestSchema.parse(request.body ?? {});
    const payload = await createGoalPayload(athleteId, actorUserId, body);

    await recordAuditEvent({
      request,
      action: 'athlete_goal.create',
      resourceType: 'goal',
      resourceId: asString(payload.goal.id) ?? athleteId,
      subjectUserId: athleteId,
      result: 'SUCCESS',
      metadata: {
        athleteId,
        milestoneCount: Array.isArray(payload.milestones) ? payload.milestones.length : 0,
      },
    });

    return reply.status(201).send({
      athleteId,
      ...payload,
      requestId: request.requestId,
    });
  });

  app.get('/goals/:goalId', async (request, reply) => {
    const goalId = asString((request.params as { goalId?: string }).goalId);
    if (!goalId) {
      throw notFound('Goal id is required');
    }
    const payload = await getGoalPayloadById(goalId);
    const athleteId = asString(payload.goal.athleteId);
    if (!athleteId) {
      throw notFound('Goal athlete is required', { goalId });
    }
    await assertCanReadAthleteHealth(request, athleteId);

    await recordAuditEvent({
      request,
      action: 'athlete_goal.read',
      resourceType: 'goal',
      resourceId: goalId,
      subjectUserId: athleteId,
      result: 'SUCCESS',
      sensitiveRead: true,
    });

    return reply.send({
      athleteId,
      ...payload,
      requestId: request.requestId,
    });
  });

  app.patch('/goals/:goalId', async (request, reply) => {
    const goalId = asString((request.params as { goalId?: string }).goalId);
    if (!goalId) {
      throw notFound('Goal id is required');
    }
    const goal = await getGoalForWrite(goalId);
    const athleteId = asString(goal.athleteId);
    if (!athleteId) {
      throw notFound('Goal athlete is required', { goalId });
    }
    await assertCanWriteAthleteHealth(request, athleteId);
    const actorUserId = asString(request.auth?.userId);
    if (!actorUserId) {
      throw forbidden('Authenticated user is required');
    }
    const body = goalUpdateRequestSchema.parse(request.body ?? {});
    const payload = await updateGoalPayload(goalId, actorUserId, body);

    await recordAuditEvent({
      request,
      action: 'athlete_goal.update',
      resourceType: 'goal',
      resourceId: goalId,
      subjectUserId: athleteId,
      result: 'SUCCESS',
      metadata: {
        athleteId,
        fields: Object.keys(body),
      },
    });

    return reply.send({
      athleteId,
      ...payload,
      requestId: request.requestId,
    });
  });

  app.patch('/goals/:goalId/progress', async (request, reply) => {
    const goalId = asString((request.params as { goalId?: string }).goalId);
    if (!goalId) {
      throw notFound('Goal id is required');
    }
    const goal = await getGoalForWrite(goalId);
    const athleteId = asString(goal.athleteId);
    if (!athleteId) {
      throw notFound('Goal athlete is required', { goalId });
    }
    try {
      await assertCanWriteAthleteHealth(request, athleteId);
    } catch (error) {
      await recordAuditEvent({
        request,
        action: 'athlete_goal.progress_update',
        resourceType: 'goal',
        resourceId: goalId,
        subjectUserId: athleteId,
        result: 'DENY',
        metadata: {
          athleteId,
        },
      });
      throw error;
    }
    const actorUserId = asString(request.auth?.userId);
    if (!actorUserId) {
      throw forbidden('Authenticated user is required');
    }
    const body = goalProgressUpdateRequestSchema.parse(request.body ?? {});
    const payload = await updateGoalProgressPayload(goalId, actorUserId, body);

    await recordAuditEvent({
      request,
      action: 'athlete_goal.progress_update',
      resourceType: 'goal',
      resourceId: goalId,
      subjectUserId: athleteId,
      result: 'SUCCESS',
      metadata: {
        athleteId,
        progress: body.progress,
        completedMilestoneCount: body.completedMilestoneIds?.length ?? null,
      },
    });

    return reply.send({
      athleteId,
      ...payload,
      requestId: request.requestId,
    });
  });

  app.delete('/goals/:goalId', async (request, reply) => {
    const goalId = asString((request.params as { goalId?: string }).goalId);
    if (!goalId) {
      throw notFound('Goal id is required');
    }
    const goal = await getGoalForWrite(goalId);
    const athleteId = asString(goal.athleteId);
    if (!athleteId) {
      throw notFound('Goal athlete is required', { goalId });
    }
    await assertCanWriteAthleteHealth(request, athleteId);
    const actorUserId = asString(request.auth?.userId);
    if (!actorUserId) {
      throw forbidden('Authenticated user is required');
    }
    await deleteGoalPayload(goalId, actorUserId);

    await recordAuditEvent({
      request,
      action: 'athlete_goal.archive',
      resourceType: 'goal',
      resourceId: goalId,
      subjectUserId: athleteId,
      result: 'SUCCESS',
      metadata: {
        athleteId,
      },
    });

    return reply.status(204).send();
  });

  app.post('/goals/:goalId/milestones', async (request, reply) => {
    const goalId = asString((request.params as { goalId?: string }).goalId);
    if (!goalId) {
      throw notFound('Goal id is required');
    }
    const goal = await getGoalForWrite(goalId);
    const athleteId = asString(goal.athleteId);
    if (!athleteId) {
      throw notFound('Goal athlete is required', { goalId });
    }
    await assertCanWriteAthleteHealth(request, athleteId);
    const actorUserId = asString(request.auth?.userId);
    if (!actorUserId) {
      throw forbidden('Authenticated user is required');
    }
    const body = goalMilestoneCreateRequestSchema.parse(request.body ?? {});
    const payload = await createGoalMilestonePayload(goalId, actorUserId, body);
    const milestoneId = asString(payload.milestone.id) ?? goalId;

    await recordAuditEvent({
      request,
      action: 'athlete_goal_milestone.create',
      resourceType: 'goal_milestone',
      resourceId: milestoneId,
      subjectUserId: athleteId,
      result: 'SUCCESS',
      metadata: {
        athleteId,
        goalId,
      },
    });

    return reply.status(201).send({
      athleteId,
      ...payload,
      requestId: request.requestId,
    });
  });

  app.patch('/goals/:goalId/milestones/:milestoneId', async (request, reply) => {
    const params = request.params as { goalId?: string; milestoneId?: string };
    const goalId = asString(params.goalId);
    const milestoneId = asString(params.milestoneId);
    if (!goalId || !milestoneId) {
      throw notFound('Goal milestone id is required');
    }
    const goal = await getGoalForWrite(goalId);
    const athleteId = asString(goal.athleteId);
    if (!athleteId) {
      throw notFound('Goal athlete is required', { goalId });
    }
    await assertCanWriteAthleteHealth(request, athleteId);
    const actorUserId = asString(request.auth?.userId);
    if (!actorUserId) {
      throw forbidden('Authenticated user is required');
    }
    const body = goalMilestoneUpdateRequestSchema.parse(request.body ?? {});
    const payload = await updateGoalMilestonePayload(goalId, milestoneId, actorUserId, body);

    await recordAuditEvent({
      request,
      action: 'athlete_goal_milestone.update',
      resourceType: 'goal_milestone',
      resourceId: milestoneId,
      subjectUserId: athleteId,
      result: 'SUCCESS',
      metadata: {
        athleteId,
        goalId,
        fields: Object.keys(body),
      },
    });

    return reply.send({
      athleteId,
      ...payload,
      requestId: request.requestId,
    });
  });

  app.patch('/milestones/:milestoneId', async (request, reply) => {
    const milestoneId = asString((request.params as { milestoneId?: string }).milestoneId);
    if (!milestoneId) {
      throw notFound('Goal milestone id is required');
    }
    const goalId = await resolveGoalIdForMilestone(milestoneId);
    const goal = await getGoalForWrite(goalId);
    const athleteId = asString(goal.athleteId);
    if (!athleteId) {
      throw notFound('Goal athlete is required', { goalId });
    }
    await assertCanWriteAthleteHealth(request, athleteId);
    const actorUserId = asString(request.auth?.userId);
    if (!actorUserId) {
      throw forbidden('Authenticated user is required');
    }
    const body = goalMilestoneUpdateRequestSchema.parse(request.body ?? {});
    const payload = await updateGoalMilestonePayload(goalId, milestoneId, actorUserId, body);

    await recordAuditEvent({
      request,
      action: 'athlete_goal_milestone.update',
      resourceType: 'goal_milestone',
      resourceId: milestoneId,
      subjectUserId: athleteId,
      result: 'SUCCESS',
      metadata: {
        athleteId,
        goalId,
        fields: Object.keys(body),
      },
    });

    return reply.send({
      athleteId,
      ...payload,
      requestId: request.requestId,
    });
  });

  app.delete('/goals/:goalId/milestones/:milestoneId', async (request, reply) => {
    const params = request.params as { goalId?: string; milestoneId?: string };
    const goalId = asString(params.goalId);
    const milestoneId = asString(params.milestoneId);
    if (!goalId || !milestoneId) {
      throw notFound('Goal milestone id is required');
    }
    const goal = await getGoalForWrite(goalId);
    const athleteId = asString(goal.athleteId);
    if (!athleteId) {
      throw notFound('Goal athlete is required', { goalId });
    }
    await assertCanWriteAthleteHealth(request, athleteId);
    const actorUserId = asString(request.auth?.userId);
    if (!actorUserId) {
      throw forbidden('Authenticated user is required');
    }
    await deleteGoalMilestonePayload(goalId, milestoneId, actorUserId);

    await recordAuditEvent({
      request,
      action: 'athlete_goal_milestone.archive',
      resourceType: 'goal_milestone',
      resourceId: milestoneId,
      subjectUserId: athleteId,
      result: 'SUCCESS',
      metadata: {
        athleteId,
        goalId,
      },
    });

    return reply.status(204).send();
  });

  app.delete('/milestones/:milestoneId', async (request, reply) => {
    const milestoneId = asString((request.params as { milestoneId?: string }).milestoneId);
    if (!milestoneId) {
      throw notFound('Goal milestone id is required');
    }
    const goalId = await resolveGoalIdForMilestone(milestoneId);
    const goal = await getGoalForWrite(goalId);
    const athleteId = asString(goal.athleteId);
    if (!athleteId) {
      throw notFound('Goal athlete is required', { goalId });
    }
    await assertCanWriteAthleteHealth(request, athleteId);
    const actorUserId = asString(request.auth?.userId);
    if (!actorUserId) {
      throw forbidden('Authenticated user is required');
    }
    await deleteGoalMilestonePayload(goalId, milestoneId, actorUserId);
    const payload = await getGoalPayloadById(goalId);

    await recordAuditEvent({
      request,
      action: 'athlete_goal_milestone.archive',
      resourceType: 'goal_milestone',
      resourceId: milestoneId,
      subjectUserId: athleteId,
      result: 'SUCCESS',
      metadata: {
        athleteId,
        goalId,
      },
    });

    return reply.send({
      athleteId,
      ...payload,
      requestId: request.requestId,
    });
  });

  app.get('/badge-definitions', async (request, reply) => {
    try {
      if (!request.auth?.userId) {
        throw forbidden('Authenticated user is required');
      }
      const payload = await getBadgeDefinitionsWithStatsPayload();

      await recordAuditEvent({
        request,
        action: 'badge_definitions.read',
        resourceType: 'badge_definition',
        resourceId: 'badge_definitions',
        result: 'SUCCESS',
        metadata: {
          definitionCount: payload.badgeDefinitions.length,
          awardedDefinitionCount: payload.badgeDefinitions.filter(
            (definition) => (asNumber(definition.awardCount) ?? 0) > 0,
          ).length,
        },
      });

      return reply.send({
        badgeDefinitions: payload.badgeDefinitions,
        seedVersion: payload.seedVersion,
        requestId: request.requestId,
      });
    } catch (error) {
      await recordAuditEvent({
        request,
        action: 'badge_definitions.read',
        resourceType: 'badge_definition',
        resourceId: 'badge_definitions',
        result: error instanceof ApiProblemError && error.status < 500 ? 'DENY' : 'ERROR',
        metadata: {
          errorCode: error instanceof ApiProblemError ? error.code : 'INTERNAL_ERROR',
        },
      });
      throw error;
    }
  });

  app.get('/athletes/:athleteId/badges', async (request, reply) => {
    const athleteId = asString((request.params as { athleteId?: string }).athleteId);
    if (!athleteId) {
      throw notFound('Athlete id is required');
    }
    try {
      await assertCanReadAthleteHealth(request, athleteId);
    } catch (error) {
      await recordAuditEvent({
        request,
        action: 'athlete_badges.read',
        resourceType: 'badge',
        resourceId: athleteId,
        subjectUserId: athleteOwnerUserId(athleteId),
        result: 'DENY',
        sensitiveRead: true,
      });
      throw error;
    }

    const payload = await getAthleteBadgesPayload(athleteId, request.auth?.userId);

    await recordAuditEvent({
      request,
      action: 'athlete_badges.read',
      resourceType: 'badge',
      resourceId: athleteId,
      subjectUserId: athleteOwnerUserId(athleteId),
      result: 'SUCCESS',
      sensitiveRead: true,
      metadata: {
        badgeCount: payload.badges.length,
        definitionCount: payload.badgeDefinitions.length,
      },
    });

    return reply.send({
      athleteId,
      badges: payload.badges,
      badgeDefinitions: payload.badgeDefinitions,
      seedVersion: payload.seedVersion,
      requestId: request.requestId,
    });
  });

  app.post('/athletes/:athleteId/badge-awards', async (request, reply) => {
    const athleteId = asString((request.params as { athleteId?: string }).athleteId);
    if (!athleteId) {
      throw notFound('Athlete id is required');
    }
    let body: BadgeAwardCreateBody | undefined;
    try {
      body = badgeAwardCreateRequestSchema.parse(request.body ?? {});
      const actorUserId = await assertCanCreateBadgeAward(request, athleteId);
      const payload = await createBadgeAwardPayload(
        athleteId,
        actorUserId,
        isPrivilegedAdminAuth(request.auth),
        body,
      );
      const badgeId = asString((payload.badge as SeedRow).id) ?? athleteId;

      await recordAuditEvent({
        request,
        action: BADGE_AWARD_CREATE_ACTION,
        resourceType: 'badge_award',
        resourceId: badgeId,
        subjectUserId: athleteOwnerUserId(athleteId),
        result: 'SUCCESS',
        sensitiveRead: true,
        metadata: {
          athleteId,
          badgeId: body.badgeId,
          badgeDefinitionId: asString((payload.badgeDefinition as SeedRow).id),
          sessionId: body.sessionId ?? null,
          visibility: body.visibility,
          reason: body.reason,
          presetId: body.presetId ?? null,
          context: body.context ?? (body.sessionId ? 'session' : 'athlete_profile'),
          cooldownBypassed: body.overrideCooldown,
          cooldownWindowDays: BADGE_AWARD_COOLDOWN_DAYS,
          overrideNote: body.overrideNote ?? null,
          badgeTier: body.badgeTier ?? null,
          badgePointValue: body.badgePointValue ?? null,
          badgeCategory: body.badgeCategory ?? null,
          createdDefinition: Boolean(payload.createdDefinition),
        },
      });

      return reply.status(201).send({
        athleteId,
        badge: payload.badge,
        badgeDefinition: payload.badgeDefinition,
        seedVersion: payload.seedVersion,
        requestId: request.requestId,
      });
    } catch (error) {
      await recordAuditEvent({
        request,
        action: BADGE_AWARD_CREATE_ACTION,
        resourceType: 'badge_award',
        resourceId: athleteId,
        subjectUserId: athleteOwnerUserId(athleteId),
        result:
          isZodValidationError(error) ||
          (error instanceof ApiProblemError && error.status < 500)
            ? 'DENY'
            : 'ERROR',
        sensitiveRead: true,
        metadata: {
          athleteId,
          badgeId: body?.badgeId ?? null,
          sessionId: body?.sessionId ?? null,
          errorCode:
            isZodValidationError(error)
              ? 'VALIDATION_FAILED'
              : error instanceof ApiProblemError
                ? error.code
                : 'INTERNAL_ERROR',
        },
      });
      throw error;
    }
  });

  app.post('/badge-awards/:awardId/share', async (request, reply) => {
    const params = badgeAwardParamsSchema.parse(request.params ?? {});
    let body: z.infer<typeof badgeAwardActionRequestSchema> = {};
    try {
      body = badgeAwardActionRequestSchema.parse(request.body ?? {});
      const payload = await markBadgeAwardActionPayload(
        request,
        params.awardId,
        BADGE_AWARD_SHARE_ACTION,
        body,
      );
      return reply.send({
        ...payload,
        requestId: request.requestId,
      });
    } catch (error) {
      await recordAuditEvent({
        request,
        action: BADGE_AWARD_SHARE_ACTION,
        resourceType: 'badge_award',
        resourceId: params.awardId,
        result:
          isZodValidationError(error) ||
          (error instanceof ApiProblemError && error.status < 500)
            ? 'DENY'
            : 'ERROR',
        sensitiveRead: true,
        metadata: {
          note: body.note ?? null,
          errorCode:
            isZodValidationError(error)
              ? 'VALIDATION_FAILED'
              : error instanceof ApiProblemError
                ? error.code
                : 'INTERNAL_ERROR',
        },
      });
      throw error;
    }
  });

  app.post('/badge-awards/:awardId/seen', async (request, reply) => {
    const params = badgeAwardParamsSchema.parse(request.params ?? {});
    let body: z.infer<typeof badgeAwardActionRequestSchema> = {};
    try {
      body = badgeAwardActionRequestSchema.parse(request.body ?? {});
      const payload = await markBadgeAwardActionPayload(
        request,
        params.awardId,
        BADGE_AWARD_SEEN_ACTION,
        body,
      );
      return reply.send({
        ...payload,
        requestId: request.requestId,
      });
    } catch (error) {
      await recordAuditEvent({
        request,
        action: BADGE_AWARD_SEEN_ACTION,
        resourceType: 'badge_award',
        resourceId: params.awardId,
        result:
          isZodValidationError(error) ||
          (error instanceof ApiProblemError && error.status < 500)
            ? 'DENY'
            : 'ERROR',
        sensitiveRead: true,
        metadata: {
          note: body.note ?? null,
          errorCode:
            isZodValidationError(error)
              ? 'VALIDATION_FAILED'
              : error instanceof ApiProblemError
                ? error.code
                : 'INTERNAL_ERROR',
        },
      });
      throw error;
    }
  });

  app.post('/badge-awards/:awardId/feed-post', async (request, reply) => {
    const params = badgeAwardParamsSchema.parse(request.params ?? {});
    let body: z.infer<typeof badgeAwardActionRequestSchema> = {};
    try {
      body = badgeAwardActionRequestSchema.parse(request.body ?? {});
      const payload = await createBadgeFeedPostsPayload(request, params.awardId, body);
      return reply.send({
        ...payload,
        requestId: request.requestId,
      });
    } catch (error) {
      await recordAuditEvent({
        request,
        action: BADGE_AWARD_FEED_POST_ACTION,
        resourceType: 'badge_award',
        resourceId: params.awardId,
        result:
          isZodValidationError(error) ||
          (error instanceof ApiProblemError && error.status < 500)
            ? 'DENY'
            : 'ERROR',
        sensitiveRead: true,
        metadata: {
          note: body.note ?? null,
          errorCode:
            isZodValidationError(error)
              ? 'VALIDATION_FAILED'
              : error instanceof ApiProblemError
                ? error.code
                : 'INTERNAL_ERROR',
        },
      });
      throw error;
    }
  });

  app.post('/athletes/:athleteId/badge-awards/seen', async (request, reply) => {
    const athleteId = asString((request.params as { athleteId?: string }).athleteId);
    if (!athleteId) {
      throw notFound('Athlete id is required');
    }
    try {
      const payload = await markAllBadgeAwardsSeenPayload(request, athleteId);
      return reply.send({
        athleteId,
        ...payload,
        requestId: request.requestId,
      });
    } catch (error) {
      await recordAuditEvent({
        request,
        action: BADGE_AWARD_SEEN_ACTION,
        resourceType: 'athlete',
        resourceId: athleteId,
        subjectUserId: athleteOwnerUserId(athleteId),
        result:
          isZodValidationError(error) ||
          (error instanceof ApiProblemError && error.status < 500)
            ? 'DENY'
            : 'ERROR',
        sensitiveRead: true,
        metadata: {
          bulk: true,
          errorCode:
            isZodValidationError(error)
              ? 'VALIDATION_FAILED'
              : error instanceof ApiProblemError
                ? error.code
                : 'INTERNAL_ERROR',
        },
      });
      throw error;
    }
  });

  app.get('/sessions/:sessionId/badges', async (request, reply) => {
    const sessionId = asString((request.params as { sessionId?: string }).sessionId);
    if (!sessionId) {
      throw notFound('Session id is required');
    }

    try {
      const athleteIds = await getSessionBadgeAthleteIds(sessionId);
      const readableAthleteIds = await getReadableAthleteIds(request, athleteIds);
      if (athleteIds.length > 0 && readableAthleteIds.size === 0) {
        throw forbidden('Not allowed to read this session badge resource', { sessionId });
      }

      const payload = await getSessionBadgesPayload(
        sessionId,
        readableAthleteIds,
        request.auth?.userId,
      );
      const readableAthleteIdList = [...readableAthleteIds];
      const subjectAthleteId = readableAthleteIdList[0];

      await recordAuditEvent({
        request,
        action: 'session_badges.read',
        resourceType: 'session',
        resourceId: sessionId,
        subjectUserId: subjectAthleteId ? athleteOwnerUserId(subjectAthleteId) : undefined,
        result: 'SUCCESS',
        sensitiveRead: true,
        metadata: {
          athleteIds: readableAthleteIdList,
          badgeCount: payload.badges.length,
          definitionCount: payload.badgeDefinitions.length,
        },
      });

      return reply.send({
        sessionId,
        badges: payload.badges,
        badgeDefinitions: payload.badgeDefinitions,
        seedVersion: payload.seedVersion,
        requestId: request.requestId,
      });
    } catch (error) {
      await recordAuditEvent({
        request,
        action: 'session_badges.read',
        resourceType: 'session',
        resourceId: sessionId,
        result: error instanceof ApiProblemError && error.status < 500 ? 'DENY' : 'ERROR',
        sensitiveRead: true,
        metadata: {
          errorCode: error instanceof ApiProblemError ? error.code : 'INTERNAL_ERROR',
          status: error instanceof ApiProblemError ? error.status : 500,
        },
      });
      throw error;
    }
  });

  app.get('/drills/:drillId', async (request, reply) => {
    const drillId = asString((request.params as { drillId?: string }).drillId);
    if (!drillId) {
      throw notFound('Drill id is required');
    }
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      await recordAuditEvent({
        request,
        action: 'drill.read',
        resourceType: 'drill',
        resourceId: drillId,
        result: 'DENY',
        sensitiveRead: true,
      });
      throw forbidden('Authenticated user is required');
    }
    if (!isCoachOrPrivilegedAdminAuth(request.auth)) {
      await recordAuditEvent({
        request,
        action: 'drill.read',
        resourceType: 'drill',
        resourceId: drillId,
        result: 'DENY',
        sensitiveRead: true,
      });
      throw forbidden('Drill library detail is coach/admin only');
    }

    const payload = await getDrillDetailPayload(drillId);
    const drillAuthorUserId =
      asString((payload.drill as SeedRow).authorUserId) ??
      asString((payload.drill as SeedRow).coachId);

    try {
      if (!drillAuthorUserId && !isPrivilegedAdminAuth(request.auth)) {
        throw forbidden('Drill author is required for drill detail reads');
      }
      if (drillAuthorUserId !== authUserId && !isPrivilegedAdminAuth(request.auth)) {
        throw forbidden('Drill detail can only be read by the owning coach or privileged admin');
      }
    } catch (error) {
      await recordAuditEvent({
        request,
        action: 'drill.read',
        resourceType: 'drill',
        resourceId: drillId,
        subjectUserId: drillAuthorUserId ?? null,
        result: 'DENY',
        sensitiveRead: true,
      });
      throw error;
    }

    await recordAuditEvent({
      request,
      action: 'drill.read',
      resourceType: 'drill',
      resourceId: drillId,
      subjectUserId: drillAuthorUserId ?? null,
      result: 'SUCCESS',
      sensitiveRead: true,
      metadata: {
        assignmentCount: Array.isArray((payload.drill as SeedRow).assignments)
          ? ((payload.drill as SeedRow).assignments as unknown[]).length
          : 0,
        backend: getApiDataBackend(),
      },
    });

    return reply.send({
      drill: payload.drill,
      seedVersion: payload.seedVersion,
      requestId: request.requestId,
    });
  });

  app.get('/drills', async (request, reply) => {
    const authUserId = request.auth?.userId;
    const requestedCoachUserId = asString(
      (request.query as { coachUserId?: string } | undefined)?.coachUserId,
    );
    const isPrivilegedAdmin = isPrivilegedAdminAuth(request.auth);
    const coachUserId = requestedCoachUserId ?? (isPrivilegedAdmin ? undefined : authUserId);

    try {
      if (!authUserId) {
        throw forbidden('Authenticated user is required');
      }
      if (!isCoachOrPrivilegedAdminAuth(request.auth)) {
        throw forbidden('Drill library reads are coach/admin only');
      }
      if (requestedCoachUserId && requestedCoachUserId !== authUserId && !isPrivilegedAdmin) {
        throw forbidden('coachUserId must match authenticated user');
      }
    } catch (error) {
      await recordAuditEvent({
        request,
        action: 'drills.read',
        resourceType: 'drill_library',
        resourceId: coachUserId ?? 'all',
        subjectUserId: coachUserId ?? null,
        result: 'DENY',
        sensitiveRead: true,
      });
      throw error;
    }

    const payload = await getDrillLibraryPayload(coachUserId);

    await recordAuditEvent({
      request,
      action: 'drills.read',
      resourceType: 'drill_library',
      resourceId: coachUserId ?? 'all',
      subjectUserId: coachUserId ?? null,
      result: 'SUCCESS',
      sensitiveRead: true,
      metadata: {
        drillCount: payload.drills.length,
        backend: getApiDataBackend(),
      },
    });

    return reply.send({
      drills: payload.drills,
      total: payload.drills.length,
      seedVersion: payload.seedVersion,
      requestId: request.requestId,
    });
  });

  app.post('/drills', async (request, reply) => {
    const authUserId = request.auth?.userId;
    const body = drillCreateRequestSchema.parse(request.body);
    const isPrivilegedAdmin = isPrivilegedAdminAuth(request.auth);
    const authorUserId = body.coachId ?? authUserId;

    try {
      if (!authUserId || !authorUserId) {
        throw forbidden('Authenticated user is required');
      }
      if (!isCoachOrPrivilegedAdminAuth(request.auth)) {
        throw forbidden('Drill library writes are coach/admin only');
      }
      if (authorUserId !== authUserId && !isPrivilegedAdmin) {
        throw forbidden('Drills can only be created by the owning coach or privileged admin');
      }
    } catch (error) {
      await recordAuditEvent({
        request,
        action: 'drill.create',
        resourceType: 'drill',
        resourceId: 'new',
        subjectUserId: authorUserId ?? null,
        result: 'DENY',
      });
      throw error;
    }

    let payload: { drill: unknown; seedVersion: string | null };
    if (getApiDataBackend() === 'db' && !shouldUseDbFixtureFallback()) {
      const prisma = getPrismaClientOrThrow();
      const created = await prisma.drill.create({
        data: {
          id: newId('drl'),
          authorUserId,
          title: body.title,
          description: body.description,
          difficulty: body.difficulty.toLowerCase(),
          active: true,
          metadataJson: drillMetadataFromInput(body) as never,
        },
      });
      payload = await getDrillDetailPayload(created.id);
    } else {
      const store =
        getApiDataBackend() === 'db' ? getDbFixtureStore() : getMarketplaceSeedStore();
      payload = createDrillInTables(store.tables, store.version, authorUserId, body);
    }

    const drillId = asString((payload.drill as SeedRow).id) ?? 'unknown';
    await recordAuditEvent({
      request,
      action: 'drill.create',
      resourceType: 'drill',
      resourceId: drillId,
      subjectUserId: authorUserId,
      result: 'SUCCESS',
      metadata: {
        backend: getApiDataBackend(),
      },
    });

    return reply.status(201).send({
      drill: payload.drill,
      seedVersion: payload.seedVersion,
      requestId: request.requestId,
    });
  });

  app.patch('/drills/:drillId', async (request, reply) => {
    const drillId = asString((request.params as { drillId?: string }).drillId);
    if (!drillId) {
      throw notFound('Drill id is required');
    }
    const authUserId = request.auth?.userId;
    const body = drillUpdateRequestSchema.parse(request.body);
    const isPrivilegedAdmin = isPrivilegedAdminAuth(request.auth);

    let currentPayload: { drill: unknown; seedVersion: string | null };
    let ownerUserIdForAudit: string | null = null;
    try {
      if (!authUserId) {
        throw forbidden('Authenticated user is required');
      }
      if (!isCoachOrPrivilegedAdminAuth(request.auth)) {
        throw forbidden('Drill library updates are coach/admin only');
      }
      currentPayload = await getDrillDetailPayload(drillId);
      const ownerUserId = asString((currentPayload.drill as SeedRow).authorUserId);
      ownerUserIdForAudit = ownerUserId ?? null;
      if (!ownerUserId && !isPrivilegedAdmin) {
        throw forbidden('Drill owner is required for updates');
      }
      if (ownerUserId !== authUserId && !isPrivilegedAdmin) {
        throw forbidden('Drills can only be updated by the owning coach or privileged admin');
      }
    } catch (error) {
      await recordAuditEvent({
        request,
        action: 'drill.update',
        resourceType: 'drill',
        resourceId: drillId,
        subjectUserId: ownerUserIdForAudit ?? authUserId ?? null,
        result: 'DENY',
      });
      throw error;
    }

    let payload: { drill: unknown; seedVersion: string | null };
    if (getApiDataBackend() === 'db' && !shouldUseDbFixtureFallback()) {
      const prisma = getPrismaClientOrThrow();
      const existingMetadata = coerceMetadata((currentPayload.drill as SeedRow).metadataJson);
      await prisma.drill.update({
        where: { id: drillId },
        data: {
          ...(body.title !== undefined ? { title: body.title } : {}),
          ...(body.description !== undefined ? { description: body.description } : {}),
          ...(body.difficulty !== undefined
            ? { difficulty: body.difficulty.toLowerCase() }
            : {}),
          metadataJson: drillMetadataFromInput(body, existingMetadata) as never,
        },
      });
      payload = await getDrillDetailPayload(drillId);
    } else {
      const store =
        getApiDataBackend() === 'db' ? getDbFixtureStore() : getMarketplaceSeedStore();
      payload = updateDrillInTables(store.tables, store.version, drillId, body);
    }

    const ownerUserId = asString((payload.drill as SeedRow).authorUserId);
    await recordAuditEvent({
      request,
      action: 'drill.update',
      resourceType: 'drill',
      resourceId: drillId,
      subjectUserId: ownerUserId ?? null,
      result: 'SUCCESS',
      metadata: {
        fields: Object.keys(body),
        backend: getApiDataBackend(),
      },
    });

    return reply.send({
      drill: payload.drill,
      seedVersion: payload.seedVersion,
      requestId: request.requestId,
    });
  });

  app.delete('/drills/:drillId', async (request, reply) => {
    const drillId = asString((request.params as { drillId?: string }).drillId);
    if (!drillId) {
      throw notFound('Drill id is required');
    }
    const authUserId = request.auth?.userId;
    const isPrivilegedAdmin = isPrivilegedAdminAuth(request.auth);

    let currentPayload: { drill: unknown; seedVersion: string | null };
    let ownerUserIdForAudit: string | null = null;
    try {
      if (!authUserId) {
        throw forbidden('Authenticated user is required');
      }
      if (!isCoachOrPrivilegedAdminAuth(request.auth)) {
        throw forbidden('Drill library removal is coach/admin only');
      }
      currentPayload = await getDrillDetailPayload(drillId);
      const ownerUserId = asString((currentPayload.drill as SeedRow).authorUserId);
      ownerUserIdForAudit = ownerUserId ?? null;
      if (!ownerUserId && !isPrivilegedAdmin) {
        throw forbidden('Drill owner is required for removal');
      }
      if (ownerUserId !== authUserId && !isPrivilegedAdmin) {
        throw forbidden('Drills can only be removed by the owning coach or privileged admin');
      }
    } catch (error) {
      await recordAuditEvent({
        request,
        action: 'drill.remove',
        resourceType: 'drill',
        resourceId: drillId,
        subjectUserId: ownerUserIdForAudit ?? authUserId ?? null,
        result: 'DENY',
      });
      throw error;
    }

    let payload: { drill: unknown; seedVersion: string | null };
    if (getApiDataBackend() === 'db' && !shouldUseDbFixtureFallback()) {
      const prisma = getPrismaClientOrThrow();
      const removedAt = new Date();
      await prisma.drill.update({
        where: { id: drillId },
        data: {
          active: false,
          deletedAt: removedAt,
        },
      });
      payload = {
        drill: {
          ...(currentPayload.drill as SeedRow),
          active: false,
          deletedAt: removedAt.toISOString(),
        },
        seedVersion: null,
      };
    } else {
      const store =
        getApiDataBackend() === 'db' ? getDbFixtureStore() : getMarketplaceSeedStore();
      payload = removeDrillInTables(store.tables, store.version, drillId);
    }

    const ownerUserId = asString((currentPayload.drill as SeedRow).authorUserId);
    await recordAuditEvent({
      request,
      action: 'drill.remove',
      resourceType: 'drill',
      resourceId: drillId,
      subjectUserId: ownerUserId ?? null,
      result: 'SUCCESS',
      metadata: {
        backend: getApiDataBackend(),
      },
    });

    return reply.send({
      removed: true,
      drill: payload.drill,
      seedVersion: payload.seedVersion,
      requestId: request.requestId,
    });
  });

  app.post('/uploads/init', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }

    const body = uploadInitRequestSchema.parse(request.body);

    if (getApiDataBackend() === 'db') {
      const initialized = await createUploadInit({
        requesterUserId: authUserId,
        kind: body.kind,
        contentType: body.contentType,
        fileName: body.fileName,
        sizeBytes: body.sizeBytes,
        metadata: body.metadata,
      });
      await recordAuditEvent({
        request,
        action: 'upload.init',
        resourceType: 'media_object',
        resourceId: initialized.mediaObjectId,
        result: 'SUCCESS',
        metadata: {
          uploadSessionId: initialized.uploadSessionId,
          kind: body.kind,
          contentType: body.contentType,
          sizeBytes: body.sizeBytes,
        },
      });
      return reply.status(201).send({
        ...initialized,
        requestId: request.requestId,
      });
    }

    const store = getMarketplaceSeedStore();
    const uploadSessions = asRows(store.tables.uploadSessions);
    const malwareScanResults = asRows(store.tables.malwareScanResults);
    const mediaObjects = asRows(store.tables.mediaObjects);
    const now = nowIso();
    const uploadSessionId = newId('ups');
    const mediaObjectId = newId('med');
    const storageKey = `uploads/${authUserId}/${uploadSessionId}/${body.fileName}`;

    const uploadSessionRow: SeedRow = {
      id: uploadSessionId,
      ownerUserId: authUserId,
      mediaObjectId,
      kind: body.kind,
      contentType: body.contentType,
      fileName: body.fileName,
      sizeBytes: body.sizeBytes,
      status: 'INITIATED',
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      metadataJson: body.metadata ?? {},
      createdAt: now,
      updatedAt: now,
    };
    uploadSessions.push(uploadSessionRow);

    mediaObjects.push({
      id: mediaObjectId,
      ownerUserId: authUserId,
      kind: body.kind,
      status: 'PENDING_UPLOAD',
      storageKey,
      bucketName: 'clubroom-private',
      contentType: body.contentType,
      sizeBytes: body.sizeBytes,
      sha256Hex: null,
      originalFileName: body.fileName,
      widthPx: null,
      heightPx: null,
      durationMs: null,
      visibilityScope: 'private',
      consentRequired: false,
      metadataJson: body.metadata ?? {},
      createdByUserId: authUserId,
      updatedByUserId: authUserId,
      version: 1,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      deletedByUserId: null,
    });

    malwareScanResults.push({
      id: newId('msr'),
      uploadSessionId,
      mediaObjectId,
      verdict: 'PENDING',
      status: 'PENDING',
      scanner: 'seed-runtime',
      engine: 'seed-runtime',
      scannedAt: null,
      detailsJson: {},
      signatureVersion: null,
      notes: null,
      createdAt: now,
      updatedAt: now,
    });

    await recordAuditEvent({
      request,
      action: 'upload.init',
      resourceType: 'media_object',
      resourceId: mediaObjectId,
      result: 'SUCCESS',
      metadata: {
        uploadSessionId,
        kind: body.kind,
        contentType: body.contentType,
        sizeBytes: body.sizeBytes,
      },
    });

    return reply.status(201).send({
      uploadSessionId,
      mediaObjectId,
      uploadMethod: 'PUT',
      uploadUrl: `https://uploads.clubroom.local/${uploadSessionId}`,
      uploadHeaders: {
        'content-type': body.contentType,
      },
      expiresAt: asString(uploadSessionRow.expiresAt),
      storageKey,
      bucketName: 'clubroom-private',
      requestId: request.requestId,
      seedVersion: store.version,
    });
  });

  app.post('/uploads/:uploadSessionId/complete', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }

    const params = uploadCompleteParamsSchema.parse(request.params ?? {});
    const body = uploadCompleteRequestSchema.parse(request.body ?? {});

    try {
      const completed = await completeUploadSession({
        requesterUserId: authUserId,
        uploadSessionId: params.uploadSessionId,
        mediaObjectId: body.mediaObjectId,
        sha256Hex: body.sha256Hex,
      });

      await recordAuditEvent({
        request,
        action: completed.pending ? 'upload.scan_pending' : 'upload.complete',
        resourceType: 'media_object',
        resourceId: completed.mediaObjectId,
        result: 'SUCCESS',
        metadata: {
          uploadSessionId: completed.uploadSessionId,
          scanVerdict: completed.scanVerdict,
          scanner: completed.scanner,
          pending: completed.pending,
        },
      });

      return reply.status(completed.pending ? 202 : 200).send({
        uploadSessionId: completed.uploadSessionId,
        mediaObjectId: completed.mediaObjectId,
        mediaStatus: completed.mediaStatus,
        scanVerdict: completed.scanVerdict,
        scanner: completed.scanner,
        scannedAt: completed.scannedAt,
        pending: completed.pending,
        retryAfterMs: completed.retryAfterMs,
        seedVersion: completed.dataVersion,
        requestId: request.requestId,
      });
    } catch (error) {
      await recordAuditEvent({
        request,
        action: 'upload.complete',
        resourceType: 'media_object',
        resourceId: body.mediaObjectId,
        result: error instanceof ApiProblemError && error.status < 500 ? 'DENY' : 'ERROR',
        metadata: {
          uploadSessionId: params.uploadSessionId,
          errorCode: error instanceof ApiProblemError ? error.code : 'INTERNAL_ERROR',
          status: error instanceof ApiProblemError ? error.status : 500,
        },
      });
      throw error;
    }
  });

  app.get('/uploads/:uploadSessionId', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }
    const params = uploadCompleteParamsSchema.parse(request.params ?? {});
    const status = await getUploadSessionStatus({
      requesterUserId: authUserId,
      uploadSessionId: params.uploadSessionId,
    });

    return reply.send({
      uploadSessionId: status.uploadSessionId,
      mediaObjectId: status.mediaObjectId,
      uploadStatus: status.uploadStatus,
      mediaStatus: status.mediaStatus,
      scanVerdict: status.scanVerdict,
      scanner: status.scanner,
      scannedAt: status.scannedAt,
      pending: status.pending,
      readyToComplete: status.readyToComplete,
      retryAfterMs: status.retryAfterMs,
      errorCode: status.errorCode,
      seedVersion: status.dataVersion,
      requestId: request.requestId,
    });
  });

  app.post('/uploads/:uploadSessionId/scan-result', async (request, reply) => {
    const params = uploadCompleteParamsSchema.parse(request.params ?? {});
    const rawBody =
      request.body && typeof request.body === 'object' && !Array.isArray(request.body)
        ? (request.body as Record<string, unknown>)
        : {};
    const authUserId = request.auth?.userId;
    const isSystemAdmin = isSystemAdminAuth(request.auth);
    const isScannerWorker = isUploadScanWorkerRequest(request);

    if (!isSystemAdmin && !isScannerWorker) {
      await recordAuditEvent({
        request,
        action: 'upload.scan_result',
        resourceType: 'media_object',
        resourceId: asString(rawBody.mediaObjectId),
        result: 'DENY',
        metadata: {
          uploadSessionId: params.uploadSessionId,
          reason: 'system_admin_or_scanner_worker_required',
          scannerWorkerTokenConfigured: Boolean(env.API_UPLOAD_SCAN_RESULT_TOKEN?.trim()),
          scannerWorkerTokenProvided: Boolean(
            singleHeaderValue(request, UPLOAD_SCAN_RESULT_TOKEN_HEADER)?.trim(),
          ),
        },
      });
      throw forbidden('Upload scan results require system admin auth or scanner worker auth');
    }

    let body: z.infer<typeof uploadScanResultRequestSchema> | undefined;
    try {
      body = uploadScanResultRequestSchema.parse(request.body ?? {});
      if (isScannerWorker) {
        if (!body.sourceResultId || !body.scanAttemptId) {
          throw badRequest('Scanner callbacks require sourceResultId and scanAttemptId');
        }
        if (
          body.verdict !== 'ERROR' &&
          (body.objectSizeBytes == null || !body.objectETag || !body.sha256Hex)
        ) {
          throw badRequest(
            'Completed scanner verdicts require object size, ETag, and SHA-256 proof',
          );
        }
        if (body.verdict === 'CLEAN' && !body.sealedStorageKey) {
          throw badRequest('Clean scanner verdicts require a server-sealed storage key');
        }
      } else if (body.verdict === 'CLEAN') {
        throw forbidden('Manual admin scan results cannot declare media CLEAN');
      }
      const scanActorKind = isSystemAdmin ? 'system_admin' : 'scanner_worker';
      const recordedByUserId =
        scanActorKind === 'system_admin' ? (authUserId as string) : UPLOAD_SCAN_WORKER_USER_ID;
      const recorded = await recordUploadMalwareScanResult({
        uploadSessionId: params.uploadSessionId,
        mediaObjectId: body.mediaObjectId,
        sourceResultId: body.sourceResultId,
        scanAttemptId: body.scanAttemptId,
        verdict: body.verdict,
        scanner: body.scanner,
        objectSizeBytes: body.objectSizeBytes,
        objectETag: body.objectETag,
        sha256Hex: body.sha256Hex,
        sealedStorageKey: body.sealedStorageKey,
        scannedAt: body.scannedAt,
        details: body.details,
        recordedByUserId,
        requireActiveAttempt: isScannerWorker,
      });

      await recordAuditEvent({
        request,
        action: 'upload.scan_result',
        resourceType: 'media_object',
        resourceId: recorded.mediaObjectId,
        result: 'SUCCESS',
        metadata: {
          uploadSessionId: recorded.uploadSessionId,
          verdict: recorded.verdict,
          scanner: recorded.scanner,
          actorKind: scanActorKind,
          replayed: recorded.replayed,
        },
      });

      return reply.status(recorded.replayed ? 200 : 201).send({
        scanResult: recorded,
        requestId: request.requestId,
      });
    } catch (error) {
      await recordAuditEvent({
        request,
        action: 'upload.scan_result',
        resourceType: 'media_object',
        resourceId: body?.mediaObjectId ?? asString(rawBody.mediaObjectId),
        result: error instanceof ApiProblemError && error.status < 500 ? 'DENY' : 'ERROR',
        metadata: {
          uploadSessionId: params.uploadSessionId,
          errorCode: error instanceof ApiProblemError ? error.code : 'INTERNAL_ERROR',
          status: error instanceof ApiProblemError ? error.status : 500,
        },
      });
      throw error;
    }
  });

  app.get('/videos', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }

    const query = videoListQuerySchema.parse(request.query ?? {});
    const result = await resolveVideoAuthorityRepository().listVideos({
      authUserId,
      isPrivilegedAdmin: isPrivilegedAdminAuth(request.auth),
      coachId: query.coachId,
      athleteId: query.athleteId,
    });

    if (query.athleteId) {
      await recordAuditEvent({
        request,
        action: 'video.list',
        resourceType: 'video',
        resourceId: query.athleteId,
        result: 'SUCCESS',
        sensitiveRead: true,
      });
    }

    return reply.send({
      videos: result.items.map(mapVideoRecord),
      seedVersion: result.dataVersion,
      requestId: request.requestId,
    });
  });

  app.post('/videos', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }

    const body = videoCreateRequestSchema.parse(request.body);
    try {
      const result = await resolveVideoAuthorityRepository().createVideo({
        authUserId,
        isPrivilegedAdmin: isPrivilegedAdminAuth(request.auth),
        mediaObjectId: body.mediaObjectId,
        athleteId: body.athleteIds[0],
        title: body.title,
        description: body.description,
        sourceContextType: body.bookingId ? 'booking' : body.sessionId ? 'session' : undefined,
        sourceContextId: body.bookingId ?? body.sessionId,
        durationMs:
          typeof body.durationSeconds === 'number' ? body.durationSeconds * 1000 : undefined,
      });

      await recordAuditEvent({
        request,
        action: 'video.create',
        resourceType: 'video',
        resourceId: asString(result.video.id) ?? undefined,
        result: 'SUCCESS',
        metadata: {
          mediaObjectId: body.mediaObjectId,
          athleteId: body.athleteIds[0] ?? null,
        },
      });

      return reply.status(201).send({
        video: mapVideoRecord(result),
        seedVersion: result.dataVersion,
        requestId: request.requestId,
      });
    } catch (error) {
      await recordAuditEvent({
        request,
        action: 'video.create',
        resourceType: 'media_object',
        resourceId: body.mediaObjectId,
        result: error instanceof ApiProblemError && error.status < 500 ? 'DENY' : 'ERROR',
        metadata: {
          athleteId: body.athleteIds[0] ?? null,
          errorCode: error instanceof ApiProblemError ? error.code : 'INTERNAL_ERROR',
          status: error instanceof ApiProblemError ? error.status : 500,
        },
      });
      throw error;
    }
  });

  app.get('/videos/:videoId', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }

    const videoId = asString((request.params as { videoId?: string }).videoId);
    if (!videoId) {
      throw notFound('Video id is required');
    }

    const result = await resolveVideoAuthorityRepository().getVideoDetail({
      authUserId,
      isPrivilegedAdmin: isPrivilegedAdminAuth(request.auth),
      videoId,
    });

    await recordAuditEvent({
      request,
      action: 'video.read',
      resourceType: 'video',
      resourceId: videoId,
      result: 'SUCCESS',
      sensitiveRead: true,
    });

    return reply.send({
      video: mapVideoRecord(result),
      seedVersion: result.dataVersion,
      requestId: request.requestId,
    });
  });

  app.patch('/videos/:videoId', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }

    const videoId = asString((request.params as { videoId?: string }).videoId);
    if (!videoId) {
      throw notFound('Video id is required');
    }

    const body = videoUpdateRequestSchema.parse(request.body ?? {});
    const result = await resolveVideoAuthorityRepository().updateVideo({
      authUserId,
      isPrivilegedAdmin: isPrivilegedAdminAuth(request.auth),
      videoId,
      title: body.title,
      description: body.description,
    });

    await recordAuditEvent({
      request,
      action: 'video.update',
      resourceType: 'video',
      resourceId: videoId,
      result: 'SUCCESS',
    });

    return reply.send({
      video: mapVideoRecord(result),
      seedVersion: result.dataVersion,
      requestId: request.requestId,
    });
  });

  app.patch('/videos/:videoId/share', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }

    const videoId = asString((request.params as { videoId?: string }).videoId);
    if (!videoId) {
      throw notFound('Video id is required');
    }

    const body = videoVisibilityRequestSchema.parse(request.body ?? {});
    const result = await resolveVideoAuthorityRepository().setVideoVisibility({
      authUserId,
      isPrivilegedAdmin: isPrivilegedAdminAuth(request.auth),
      videoId,
      visibility: body.visibility,
      recipientUserIds: body.recipientUserIds,
    });

    await recordAuditEvent({
      request,
      action: 'video.visibility.update',
      resourceType: 'video',
      resourceId: videoId,
      result: 'SUCCESS',
      metadata: {
        visibility: body.visibility,
        sharedWithUserIds: mapVideoRecord(result).sharedWithUserIds,
      },
    });

    return reply.send({
      video: mapVideoRecord(result),
      seedVersion: result.dataVersion,
      requestId: request.requestId,
    });
  });

  app.post('/videos/:videoId/annotations', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }

    const videoId = asString((request.params as { videoId?: string }).videoId);
    if (!videoId) {
      throw notFound('Video id is required');
    }

    const body = videoAnnotationRequestSchema.parse(request.body ?? {});
    const result = await resolveVideoAuthorityRepository().addVideoAnnotation({
      authUserId,
      isPrivilegedAdmin: isPrivilegedAdminAuth(request.auth),
      videoId,
      timestampMs: body.timestamp * 1000,
      label: body.label,
      note: body.note,
      annotationType: body.type,
    });

    await recordAuditEvent({
      request,
      action: 'video.annotation.create',
      resourceType: 'video_annotation',
      resourceId: asString(result.annotation.id) ?? undefined,
      result: 'SUCCESS',
      metadata: { videoId },
    });

    return reply.status(201).send({
      annotation: mapVideoAnnotation(result.annotation),
      seedVersion: result.dataVersion,
      requestId: request.requestId,
    });
  });

  app.patch('/videos/:videoId/annotations/:annotationId', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }

    const params = request.params as { videoId?: string; annotationId?: string };
    const videoId = asString(params.videoId);
    const annotationId = asString(params.annotationId);
    if (!videoId || !annotationId) {
      throw notFound('Video annotation id is required');
    }

    const body = videoAnnotationRequestSchema.parse(request.body ?? {});
    const result = await resolveVideoAuthorityRepository().updateVideoAnnotation({
      authUserId,
      isPrivilegedAdmin: isPrivilegedAdminAuth(request.auth),
      videoId,
      annotationId,
      timestampMs: body.timestamp * 1000,
      label: body.label,
      note: body.note,
      annotationType: body.type,
    });

    await recordAuditEvent({
      request,
      action: 'video.annotation.update',
      resourceType: 'video_annotation',
      resourceId: annotationId,
      result: 'SUCCESS',
      metadata: { videoId },
    });

    return reply.send({
      annotation: mapVideoAnnotation(result.annotation),
      seedVersion: result.dataVersion,
      requestId: request.requestId,
    });
  });

  app.delete('/videos/:videoId/annotations/:annotationId', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }

    const params = request.params as { videoId?: string; annotationId?: string };
    const videoId = asString(params.videoId);
    const annotationId = asString(params.annotationId);
    if (!videoId || !annotationId) {
      throw notFound('Video annotation id is required');
    }

    await resolveVideoAuthorityRepository().deleteVideoAnnotation({
      authUserId,
      isPrivilegedAdmin: isPrivilegedAdminAuth(request.auth),
      videoId,
      annotationId,
    });

    await recordAuditEvent({
      request,
      action: 'video.annotation.archive',
      resourceType: 'video_annotation',
      resourceId: annotationId,
      result: 'SUCCESS',
      metadata: { videoId },
    });

    return reply.status(204).send();
  });

  app.delete('/videos/:videoId', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }

    const videoId = asString((request.params as { videoId?: string }).videoId);
    if (!videoId) {
      throw notFound('Video id is required');
    }

    await resolveVideoAuthorityRepository().deleteVideo({
      authUserId,
      isPrivilegedAdmin: isPrivilegedAdminAuth(request.auth),
      videoId,
    });

    await recordAuditEvent({
      request,
      action: 'video.archive',
      resourceType: 'video',
      resourceId: videoId,
      result: 'SUCCESS',
    });

    return reply.status(204).send();
  });

  app.get('/community-groups', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }

    const result = await resolveCommunityMediaRepository().listCommunityGroups({
      authUserId,
      isPrivilegedAdmin: isPrivilegedAdminAuth(request.auth),
    });

    return reply.send({
      groups: result.groups,
      seedVersion: result.dataVersion,
      requestId: request.requestId,
    });
  });

  app.post('/community-groups', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }
    const body = communityGroupCreateRequestSchema.parse(request.body ?? {});
    const visibility = body.isPublic ? 'PUBLIC' : 'PRIVATE';
    const groupType = body.type ?? (body.squadId ? 'SQUAD' : body.clubId ? 'CLUB' : 'GENERAL');

    try {
      const result = await resolveCommunityMediaRepository().createCommunityGroup({
        authUserId,
        isPrivilegedAdmin: isPrivilegedAdminAuth(request.auth),
        name: body.name,
        description: body.description,
        type: groupType,
        clubId: body.clubId,
        squadId: body.squadId,
        visibility,
        memberUserIds: body.memberIds,
        idempotencyKey: body.idempotencyKey,
      });

      const createdClubId = asString(result.group.clubId) ?? body.clubId;
      await recordAuditEvent({
        request,
        action: 'community.group.create',
        resourceType: 'community_group',
        resourceId: asString(result.group.id),
        result: 'SUCCESS',
        metadata: {
          groupType,
          clubId: createdClubId,
          squadId: body.squadId,
          visibility,
          memberCount: asRows(result.group.memberships).length,
          idempotencyKey: body.idempotencyKey,
        },
      });

      return reply.status(201).send({
        group: result.group,
        seedVersion: result.dataVersion,
        requestId: request.requestId,
      });
    } catch (error) {
      await recordAuditEvent({
        request,
        action: 'community.group.create',
        resourceType: body.squadId ? 'squad' : body.clubId ? 'club' : 'community_group',
        resourceId: body.squadId ?? body.clubId,
        result: error instanceof ApiProblemError && error.status < 500 ? 'DENY' : 'ERROR',
        metadata: {
          groupType,
          clubId: body.clubId,
          squadId: body.squadId,
          visibility,
          memberIds: body.memberIds ?? [],
          idempotencyKey: body.idempotencyKey,
          errorCode: error instanceof ApiProblemError ? error.code : 'INTERNAL_ERROR',
          status: error instanceof ApiProblemError ? error.status : 500,
        },
      });
      throw error;
    }
  });

  app.post('/community-groups/:groupId/join', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }
    const params = communityGroupParamsSchema.parse(request.params ?? {});

    try {
      const result = await resolveCommunityMediaRepository().joinCommunityGroup({
        authUserId,
        isPrivilegedAdmin: isPrivilegedAdminAuth(request.auth),
        communityGroupId: params.groupId,
      });

      await recordAuditEvent({
        request,
        action: 'community.group.join',
        resourceType: 'community_group',
        resourceId: params.groupId,
        result: 'SUCCESS',
        metadata: {
          memberUserId: authUserId,
        },
      });

      return reply.send({
        group: result.group,
        seedVersion: result.dataVersion,
        requestId: request.requestId,
      });
    } catch (error) {
      await recordAuditEvent({
        request,
        action: 'community.group.join',
        resourceType: 'community_group',
        resourceId: params.groupId,
        result: error instanceof ApiProblemError && error.status < 500 ? 'DENY' : 'ERROR',
        metadata: {
          memberUserId: authUserId,
          errorCode: error instanceof ApiProblemError ? error.code : 'INTERNAL_ERROR',
          status: error instanceof ApiProblemError ? error.status : 500,
        },
      });
      throw error;
    }
  });

  app.post('/community-groups/:groupId/join-requests', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }
    const params = communityGroupParamsSchema.parse(request.params ?? {});
    const body = communityGroupJoinRequestCreateRequestSchema.parse(request.body ?? {});

    try {
      const result = await resolveCommunityMediaRepository().createCommunityGroupJoinRequest({
        authUserId,
        isPrivilegedAdmin: isPrivilegedAdminAuth(request.auth),
        communityGroupId: params.groupId,
        isCoach: body.isCoach,
      });

      await recordAuditEvent({
        request,
        action: 'community.group.join_request.create',
        resourceType: 'community_group_join_request',
        resourceId: asString(result.request.id),
        subjectUserId: authUserId,
        result: 'SUCCESS',
        metadata: {
          communityGroupId: params.groupId,
          isCoach: body.isCoach ?? false,
        },
      });

      return reply.status(201).send({
        request: result.request,
        seedVersion: result.dataVersion,
        requestId: request.requestId,
      });
    } catch (error) {
      await recordAuditEvent({
        request,
        action: 'community.group.join_request.create',
        resourceType: 'community_group',
        resourceId: params.groupId,
        subjectUserId: authUserId,
        result: error instanceof ApiProblemError && error.status < 500 ? 'DENY' : 'ERROR',
        metadata: {
          communityGroupId: params.groupId,
          isCoach: body.isCoach ?? false,
          errorCode: error instanceof ApiProblemError ? error.code : 'INTERNAL_ERROR',
          status: error instanceof ApiProblemError ? error.status : 500,
        },
      });
      throw error;
    }
  });

  app.get('/community-groups/:groupId/join-requests', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }
    const params = communityGroupParamsSchema.parse(request.params ?? {});

    try {
      const result = await resolveCommunityMediaRepository().listCommunityGroupJoinRequests({
        authUserId,
        isPrivilegedAdmin: isPrivilegedAdminAuth(request.auth),
        communityGroupId: params.groupId,
      });

      await recordAuditEvent({
        request,
        action: 'community.group.join_request.list',
        resourceType: 'community_group',
        resourceId: params.groupId,
        result: 'SUCCESS',
        sensitiveRead: true,
        metadata: {
          communityGroupId: params.groupId,
          count: result.requests.length,
        },
      });

      return reply.send({
        requests: result.requests,
        seedVersion: result.dataVersion,
        requestId: request.requestId,
      });
    } catch (error) {
      await recordAuditEvent({
        request,
        action: 'community.group.join_request.list',
        resourceType: 'community_group',
        resourceId: params.groupId,
        result: error instanceof ApiProblemError && error.status < 500 ? 'DENY' : 'ERROR',
        sensitiveRead: true,
        metadata: {
          communityGroupId: params.groupId,
          errorCode: error instanceof ApiProblemError ? error.code : 'INTERNAL_ERROR',
          status: error instanceof ApiProblemError ? error.status : 500,
        },
      });
      throw error;
    }
  });

  app.post(
    '/community-groups/:groupId/join-requests/:requestId/approve',
    async (request, reply) => {
      const authUserId = request.auth?.userId;
      if (!authUserId) {
        throw forbidden('Authenticated user is required');
      }
      const params = communityGroupJoinRequestParamsSchema.parse(request.params ?? {});

      try {
        const result = await resolveCommunityMediaRepository().approveCommunityGroupJoinRequest({
          authUserId,
          isPrivilegedAdmin: isPrivilegedAdminAuth(request.auth),
          communityGroupId: params.groupId,
          requestId: params.requestId,
        });

        await recordAuditEvent({
          request,
          action: 'community.group.join_request.approve',
          resourceType: 'community_group_join_request',
          resourceId: params.requestId,
          subjectUserId: asString(result.request.requesterId),
          result: 'SUCCESS',
          metadata: {
            communityGroupId: params.groupId,
            requesterId: asString(result.request.requesterId),
          },
        });

        return reply.send({
          request: result.request,
          group: result.group,
          seedVersion: result.dataVersion,
          requestId: request.requestId,
        });
      } catch (error) {
        await recordAuditEvent({
          request,
          action: 'community.group.join_request.approve',
          resourceType: 'community_group_join_request',
          resourceId: params.requestId,
          result: error instanceof ApiProblemError && error.status < 500 ? 'DENY' : 'ERROR',
          metadata: {
            communityGroupId: params.groupId,
            errorCode: error instanceof ApiProblemError ? error.code : 'INTERNAL_ERROR',
            status: error instanceof ApiProblemError ? error.status : 500,
          },
        });
        throw error;
      }
    },
  );

  app.post('/community-groups/:groupId/join-requests/:requestId/reject', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }
    const params = communityGroupJoinRequestParamsSchema.parse(request.params ?? {});

    try {
      const result = await resolveCommunityMediaRepository().rejectCommunityGroupJoinRequest({
        authUserId,
        isPrivilegedAdmin: isPrivilegedAdminAuth(request.auth),
        communityGroupId: params.groupId,
        requestId: params.requestId,
      });

      await recordAuditEvent({
        request,
        action: 'community.group.join_request.reject',
        resourceType: 'community_group_join_request',
        resourceId: params.requestId,
        subjectUserId: asString(result.request.requesterId),
        result: 'SUCCESS',
        metadata: {
          communityGroupId: params.groupId,
          requesterId: asString(result.request.requesterId),
        },
      });

      return reply.send({
        request: result.request,
        seedVersion: result.dataVersion,
        requestId: request.requestId,
      });
    } catch (error) {
      await recordAuditEvent({
        request,
        action: 'community.group.join_request.reject',
        resourceType: 'community_group_join_request',
        resourceId: params.requestId,
        result: error instanceof ApiProblemError && error.status < 500 ? 'DENY' : 'ERROR',
        metadata: {
          communityGroupId: params.groupId,
          errorCode: error instanceof ApiProblemError ? error.code : 'INTERNAL_ERROR',
          status: error instanceof ApiProblemError ? error.status : 500,
        },
      });
      throw error;
    }
  });

  app.post('/community-groups/:groupId/leave', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }
    const params = communityGroupParamsSchema.parse(request.params ?? {});

    try {
      const result = await resolveCommunityMediaRepository().leaveCommunityGroup({
        authUserId,
        isPrivilegedAdmin: isPrivilegedAdminAuth(request.auth),
        communityGroupId: params.groupId,
      });

      await recordAuditEvent({
        request,
        action: 'community.group.leave',
        resourceType: 'community_group_membership',
        resourceId: `${params.groupId}:${authUserId}`,
        result: 'SUCCESS',
        metadata: {
          communityGroupId: params.groupId,
          memberUserId: authUserId,
        },
      });

      return reply.send({
        group: result.group,
        seedVersion: result.dataVersion,
        requestId: request.requestId,
      });
    } catch (error) {
      await recordAuditEvent({
        request,
        action: 'community.group.leave',
        resourceType: 'community_group_membership',
        resourceId: `${params.groupId}:${authUserId}`,
        result: error instanceof ApiProblemError && error.status < 500 ? 'DENY' : 'ERROR',
        metadata: {
          communityGroupId: params.groupId,
          memberUserId: authUserId,
          errorCode: error instanceof ApiProblemError ? error.code : 'INTERNAL_ERROR',
          status: error instanceof ApiProblemError ? error.status : 500,
        },
      });
      throw error;
    }
  });

  app.post('/community-groups/:groupId/members', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }
    const params = communityGroupParamsSchema.parse(request.params ?? {});
    const body = communityGroupMemberAddRequestSchema.parse(request.body ?? {});

    try {
      const result = await resolveCommunityMediaRepository().addCommunityGroupMember({
        authUserId,
        isPrivilegedAdmin: isPrivilegedAdminAuth(request.auth),
        communityGroupId: params.groupId,
        memberUserId: body.memberUserId,
        role: body.role,
      });

      await recordAuditEvent({
        request,
        action: 'community.group.member.add',
        resourceType: 'community_group_membership',
        resourceId: `${params.groupId}:${body.memberUserId}`,
        subjectUserId: body.memberUserId,
        result: 'SUCCESS',
        metadata: {
          communityGroupId: params.groupId,
          memberUserId: body.memberUserId,
          role: body.role ?? 'MEMBER',
        },
      });

      return reply.send({
        group: result.group,
        seedVersion: result.dataVersion,
        requestId: request.requestId,
      });
    } catch (error) {
      await recordAuditEvent({
        request,
        action: 'community.group.member.add',
        resourceType: 'community_group_membership',
        resourceId: `${params.groupId}:${body.memberUserId}`,
        subjectUserId: body.memberUserId,
        result: error instanceof ApiProblemError && error.status < 500 ? 'DENY' : 'ERROR',
        metadata: {
          communityGroupId: params.groupId,
          memberUserId: body.memberUserId,
          role: body.role ?? 'MEMBER',
          errorCode: error instanceof ApiProblemError ? error.code : 'INTERNAL_ERROR',
          status: error instanceof ApiProblemError ? error.status : 500,
        },
      });
      throw error;
    }
  });

  app.patch('/community-groups/:groupId/members/:memberUserId/role', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }
    const params = communityGroupMemberParamsSchema.parse(request.params ?? {});
    const body = communityGroupMemberRoleUpdateRequestSchema.parse(request.body ?? {});

    try {
      const result = await resolveCommunityMediaRepository().updateCommunityGroupMemberRole({
        authUserId,
        isPrivilegedAdmin: isPrivilegedAdminAuth(request.auth),
        communityGroupId: params.groupId,
        memberUserId: params.memberUserId,
        role: body.role,
      });

      await recordAuditEvent({
        request,
        action: 'community.group.member.role_update',
        resourceType: 'community_group_membership',
        resourceId: `${params.groupId}:${params.memberUserId}`,
        result: 'SUCCESS',
        metadata: {
          communityGroupId: params.groupId,
          memberUserId: params.memberUserId,
          role: body.role,
        },
      });

      return reply.send({
        group: result.group,
        seedVersion: result.dataVersion,
        requestId: request.requestId,
      });
    } catch (error) {
      await recordAuditEvent({
        request,
        action: 'community.group.member.role_update',
        resourceType: 'community_group_membership',
        resourceId: `${params.groupId}:${params.memberUserId}`,
        result: error instanceof ApiProblemError && error.status < 500 ? 'DENY' : 'ERROR',
        metadata: {
          communityGroupId: params.groupId,
          memberUserId: params.memberUserId,
          role: body.role,
          errorCode: error instanceof ApiProblemError ? error.code : 'INTERNAL_ERROR',
          status: error instanceof ApiProblemError ? error.status : 500,
        },
      });
      throw error;
    }
  });

  app.post(
    '/community-groups/:groupId/members/:memberUserId/transfer-ownership',
    async (request, reply) => {
      const authUserId = request.auth?.userId;
      if (!authUserId) {
        throw forbidden('Authenticated user is required');
      }
      const params = communityGroupMemberParamsSchema.parse(request.params ?? {});

      try {
        const result = await resolveCommunityMediaRepository().transferCommunityGroupOwner({
          authUserId,
          isPrivilegedAdmin: isPrivilegedAdminAuth(request.auth),
          communityGroupId: params.groupId,
          memberUserId: params.memberUserId,
        });

        await recordAuditEvent({
          request,
          action: 'community.group.owner.transfer',
          resourceType: 'community_group',
          resourceId: params.groupId,
          subjectUserId: params.memberUserId,
          result: 'SUCCESS',
          metadata: {
            communityGroupId: params.groupId,
            newOwnerUserId: params.memberUserId,
          },
        });

        return reply.send({
          group: result.group,
          seedVersion: result.dataVersion,
          requestId: request.requestId,
        });
      } catch (error) {
        await recordAuditEvent({
          request,
          action: 'community.group.owner.transfer',
          resourceType: 'community_group',
          resourceId: params.groupId,
          subjectUserId: params.memberUserId,
          result: error instanceof ApiProblemError && error.status < 500 ? 'DENY' : 'ERROR',
          metadata: {
            communityGroupId: params.groupId,
            newOwnerUserId: params.memberUserId,
            errorCode: error instanceof ApiProblemError ? error.code : 'INTERNAL_ERROR',
            status: error instanceof ApiProblemError ? error.status : 500,
          },
        });
        throw error;
      }
    },
  );

  app.post('/community-groups/:groupId/members/:memberUserId/remove', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }
    const params = communityGroupMemberParamsSchema.parse(request.params ?? {});

    try {
      const result = await resolveCommunityMediaRepository().removeCommunityGroupMember({
        authUserId,
        isPrivilegedAdmin: isPrivilegedAdminAuth(request.auth),
        communityGroupId: params.groupId,
        memberUserId: params.memberUserId,
      });

      await recordAuditEvent({
        request,
        action: 'community.group.member.remove',
        resourceType: 'community_group_membership',
        resourceId: `${params.groupId}:${params.memberUserId}`,
        result: 'SUCCESS',
        metadata: {
          communityGroupId: params.groupId,
          memberUserId: params.memberUserId,
        },
      });

      return reply.send({
        group: result.group,
        seedVersion: result.dataVersion,
        requestId: request.requestId,
      });
    } catch (error) {
      await recordAuditEvent({
        request,
        action: 'community.group.member.remove',
        resourceType: 'community_group_membership',
        resourceId: `${params.groupId}:${params.memberUserId}`,
        result: error instanceof ApiProblemError && error.status < 500 ? 'DENY' : 'ERROR',
        metadata: {
          communityGroupId: params.groupId,
          memberUserId: params.memberUserId,
          errorCode: error instanceof ApiProblemError ? error.code : 'INTERNAL_ERROR',
          status: error instanceof ApiProblemError ? error.status : 500,
        },
      });
      throw error;
    }
  });

  app.post('/community-groups/:groupId/archive', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }
    const params = communityGroupParamsSchema.parse(request.params ?? {});

    try {
      const result = await resolveCommunityMediaRepository().archiveCommunityGroup({
        authUserId,
        isPrivilegedAdmin: isPrivilegedAdminAuth(request.auth),
        communityGroupId: params.groupId,
      });

      await recordAuditEvent({
        request,
        action: 'community.group.archive',
        resourceType: 'community_group',
        resourceId: params.groupId,
        result: 'SUCCESS',
        metadata: {
          communityGroupId: params.groupId,
        },
      });

      return reply.send({
        group: result.group,
        seedVersion: result.dataVersion,
        requestId: request.requestId,
      });
    } catch (error) {
      await recordAuditEvent({
        request,
        action: 'community.group.archive',
        resourceType: 'community_group',
        resourceId: params.groupId,
        result: error instanceof ApiProblemError && error.status < 500 ? 'DENY' : 'ERROR',
        metadata: {
          communityGroupId: params.groupId,
          errorCode: error instanceof ApiProblemError ? error.code : 'INTERNAL_ERROR',
          status: error instanceof ApiProblemError ? error.status : 500,
        },
      });
      throw error;
    }
  });

  app.post('/community-groups/:groupId/invites', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }
    const params = communityGroupParamsSchema.parse(request.params ?? {});
    const body = communityGroupInviteCreateRequestSchema.parse(request.body ?? {});

    try {
      const result = await resolveCommunityMediaRepository().createCommunityGroupInvite({
        authUserId,
        isPrivilegedAdmin: isPrivilegedAdminAuth(request.auth),
        communityGroupId: params.groupId,
        inviteeUserId: body.inviteeUserId,
        message: body.message,
      });

      await recordAuditEvent({
        request,
        action: 'community.group.invite.create',
        resourceType: 'community_group_invite',
        resourceId: asString(result.invite.id),
        subjectUserId: body.inviteeUserId,
        result: 'SUCCESS',
        metadata: {
          communityGroupId: params.groupId,
          inviteeUserId: body.inviteeUserId,
        },
      });

      return reply.status(201).send({
        invite: result.invite,
        seedVersion: result.dataVersion,
        requestId: request.requestId,
      });
    } catch (error) {
      await recordAuditEvent({
        request,
        action: 'community.group.invite.create',
        resourceType: 'community_group',
        resourceId: params.groupId,
        subjectUserId: body.inviteeUserId,
        result: error instanceof ApiProblemError && error.status < 500 ? 'DENY' : 'ERROR',
        metadata: {
          communityGroupId: params.groupId,
          inviteeUserId: body.inviteeUserId,
          errorCode: error instanceof ApiProblemError ? error.code : 'INTERNAL_ERROR',
          status: error instanceof ApiProblemError ? error.status : 500,
        },
      });
      throw error;
    }
  });

  app.get('/me/community-group-invites', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }

    const result = await resolveCommunityMediaRepository().listCommunityGroupInvites({
      authUserId,
      isPrivilegedAdmin: isPrivilegedAdminAuth(request.auth),
    });

    return reply.send({
      invites: result.invites,
      seedVersion: result.dataVersion,
      requestId: request.requestId,
    });
  });

  app.post('/community-group-invites/:inviteId/accept', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }
    const params = communityGroupInviteParamsSchema.parse(request.params ?? {});

    try {
      const result = await resolveCommunityMediaRepository().acceptCommunityGroupInvite({
        authUserId,
        isPrivilegedAdmin: isPrivilegedAdminAuth(request.auth),
        inviteId: params.inviteId,
      });

      await recordAuditEvent({
        request,
        action: 'community.group.invite.accept',
        resourceType: 'community_group_invite',
        resourceId: params.inviteId,
        result: 'SUCCESS',
        metadata: {
          communityGroupId: asString(result.invite.groupId),
        },
      });

      return reply.send({
        invite: result.invite,
        group: result.group,
        seedVersion: result.dataVersion,
        requestId: request.requestId,
      });
    } catch (error) {
      await recordAuditEvent({
        request,
        action: 'community.group.invite.accept',
        resourceType: 'community_group_invite',
        resourceId: params.inviteId,
        result: error instanceof ApiProblemError && error.status < 500 ? 'DENY' : 'ERROR',
        metadata: {
          errorCode: error instanceof ApiProblemError ? error.code : 'INTERNAL_ERROR',
          status: error instanceof ApiProblemError ? error.status : 500,
        },
      });
      throw error;
    }
  });

  app.post('/community-group-invites/:inviteId/decline', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }
    const params = communityGroupInviteParamsSchema.parse(request.params ?? {});

    try {
      const result = await resolveCommunityMediaRepository().declineCommunityGroupInvite({
        authUserId,
        isPrivilegedAdmin: isPrivilegedAdminAuth(request.auth),
        inviteId: params.inviteId,
      });

      await recordAuditEvent({
        request,
        action: 'community.group.invite.decline',
        resourceType: 'community_group_invite',
        resourceId: params.inviteId,
        result: 'SUCCESS',
        metadata: {
          communityGroupId: asString(result.invite.groupId),
        },
      });

      return reply.send({
        invite: result.invite,
        seedVersion: result.dataVersion,
        requestId: request.requestId,
      });
    } catch (error) {
      await recordAuditEvent({
        request,
        action: 'community.group.invite.decline',
        resourceType: 'community_group_invite',
        resourceId: params.inviteId,
        result: error instanceof ApiProblemError && error.status < 500 ? 'DENY' : 'ERROR',
        metadata: {
          errorCode: error instanceof ApiProblemError ? error.code : 'INTERNAL_ERROR',
          status: error instanceof ApiProblemError ? error.status : 500,
        },
      });
      throw error;
    }
  });

  app.get('/posts', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }

    const query =
      request.query as
        | { clubId?: string; communityGroupId?: string; followingOnly?: string | boolean }
        | undefined;
    const clubId = asString(query?.clubId);
    const groupId = asString(query?.communityGroupId);
    const followingOnly = query?.followingOnly === true || query?.followingOnly === 'true';
    const result = await resolveCommunityMediaRepository().listPosts({
      authUserId,
      isPrivilegedAdmin: isPrivilegedAdminAuth(request.auth),
      clubId,
      communityGroupId: groupId,
      followingOnly,
    });

    return reply.send({
      posts: result.posts,
      seedVersion: result.dataVersion,
      requestId: request.requestId,
    });
  });

  app.post('/posts', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }
    const body = postCreateRequestSchema.parse(request.body ?? {});

    try {
      assertSupportedPostMetadata(body);
      const result = await resolveCommunityMediaRepository().createPost({
        authUserId,
        isPrivilegedAdmin: isPrivilegedAdminAuth(request.auth),
        clubId: body.clubId,
        communityGroupId: body.communityGroupId,
        content: body.content,
        visibility: body.visibility,
        metadata: body.metadata,
        attachments: body.attachments,
        idempotencyKey: body.idempotencyKey,
      });

      await recordAuditEvent({
        request,
        action: 'community.post.create',
        resourceType: 'post',
        resourceId: asString(result.post.id),
        result: 'SUCCESS',
        metadata: {
          clubId: body.clubId,
          communityGroupId: body.communityGroupId,
          visibility: asString(result.post.visibility),
          idempotencyKey: body.idempotencyKey,
          attachmentCount: body.attachments?.length ?? 0,
        },
      });

      return reply.status(201).send({
        post: result.post,
        seedVersion: result.dataVersion,
        requestId: request.requestId,
      });
    } catch (error) {
      await recordAuditEvent({
        request,
        action: 'community.post.create',
        resourceType: body.communityGroupId ? 'community_group' : 'club',
        resourceId: body.communityGroupId ?? body.clubId,
        result: error instanceof ApiProblemError && error.status < 500 ? 'DENY' : 'ERROR',
        metadata: {
          clubId: body.clubId,
          communityGroupId: body.communityGroupId,
          idempotencyKey: body.idempotencyKey,
          errorCode: error instanceof ApiProblemError ? error.code : 'INTERNAL_ERROR',
          status: error instanceof ApiProblemError ? error.status : 500,
        },
      });
      throw error;
    }
  });

  app.get('/posts/:postId', async (request, reply) => {
    const authUserId = request.auth?.userId;
    const params = postParamsSchema.parse(request.params ?? {});
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }

    const result = await resolveCommunityMediaRepository().listPosts({
      authUserId,
      isPrivilegedAdmin: isPrivilegedAdminAuth(request.auth),
    });
    const post = result.posts.find((candidate) => asString(candidate.id) === params.postId);
    if (!post) {
      throw notFound('Post not found', { postId: params.postId });
    }

    return reply.send({
      post,
      seedVersion: result.dataVersion,
      requestId: request.requestId,
    });
  });

  app.get('/posts/:postId/comments', async (request, reply) => {
    const authUserId = request.auth?.userId;
    const params = postParamsSchema.parse(request.params ?? {});
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }

    const result = await resolveCommunityMediaRepository().listPostComments({
      authUserId,
      isPrivilegedAdmin: isPrivilegedAdminAuth(request.auth),
      postId: params.postId,
    });

    return reply.send({
      comments: result.comments,
      seedVersion: result.dataVersion,
      requestId: request.requestId,
    });
  });

  app.get('/comments/:commentId', async (request, reply) => {
    const authUserId = request.auth?.userId;
    const params = commentParamsSchema.parse(request.params ?? {});
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }

    const result = await resolveCommunityMediaRepository().getPostComment({
      authUserId,
      isPrivilegedAdmin: isPrivilegedAdminAuth(request.auth),
      commentId: params.commentId,
    });

    return reply.send({
      comment: result.comment,
      seedVersion: result.dataVersion,
      requestId: request.requestId,
    });
  });

  app.post('/comments/:commentId/reactions/toggle', async (request, reply) => {
    const authUserId = request.auth?.userId;
    const params = commentParamsSchema.parse(request.params ?? {});
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }

    try {
      const result = await resolveCommunityMediaRepository().togglePostCommentReaction({
        authUserId,
        isPrivilegedAdmin: isPrivilegedAdminAuth(request.auth),
        commentId: params.commentId,
      });

      await recordAuditEvent({
        request,
        action: 'community.comment.reaction.toggle',
        resourceType: 'post_comment',
        resourceId: params.commentId,
        result: 'SUCCESS',
        metadata: {
          postId: asString(result.comment.postId),
          likedByCurrentUser: result.comment.likedByCurrentUser === true,
          likesCount: asNumber(result.comment.likesCount),
        },
      });

      return reply.send({
        comment: result.comment,
        seedVersion: result.dataVersion,
        requestId: request.requestId,
      });
    } catch (error) {
      await recordAuditEvent({
        request,
        action: 'community.comment.reaction.toggle',
        resourceType: 'post_comment',
        resourceId: params.commentId,
        result: error instanceof ApiProblemError && error.status < 500 ? 'DENY' : 'ERROR',
        metadata: {
          errorCode: error instanceof ApiProblemError ? error.code : 'INTERNAL_ERROR',
          status: error instanceof ApiProblemError ? error.status : 500,
        },
      });
      throw error;
    }
  });

  app.post('/posts/:postId/reactions/toggle', async (request, reply) => {
    const authUserId = request.auth?.userId;
    const params = postParamsSchema.parse(request.params ?? {});
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }

    try {
      const result = await resolveCommunityMediaRepository().togglePostReaction({
        authUserId,
        isPrivilegedAdmin: isPrivilegedAdminAuth(request.auth),
        postId: params.postId,
      });

      await recordAuditEvent({
        request,
        action: 'community.post.reaction.toggle',
        resourceType: 'post',
        resourceId: params.postId,
        result: 'SUCCESS',
        metadata: {
          likedByCurrentUser: result.post.likedByCurrentUser === true,
          reactionsCount: asNumber(result.post.reactionsCount),
        },
      });

      return reply.send({
        post: result.post,
        seedVersion: result.dataVersion,
        requestId: request.requestId,
      });
    } catch (error) {
      await recordAuditEvent({
        request,
        action: 'community.post.reaction.toggle',
        resourceType: 'post',
        resourceId: params.postId,
        result: error instanceof ApiProblemError && error.status < 500 ? 'DENY' : 'ERROR',
        metadata: {
          errorCode: error instanceof ApiProblemError ? error.code : 'INTERNAL_ERROR',
          status: error instanceof ApiProblemError ? error.status : 500,
        },
      });
      throw error;
    }
  });

  app.patch('/posts/:postId/pin', async (request, reply) => {
    const authUserId = request.auth?.userId;
    const params = postParamsSchema.parse(request.params ?? {});
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }
    const body = postPinRequestSchema.parse(request.body ?? {});

    try {
      const result = await resolveCommunityMediaRepository().setPostPin({
        authUserId,
        isPrivilegedAdmin: isPrivilegedAdminAuth(request.auth),
        postId: params.postId,
        pinned: body.pinned,
      });

      await recordAuditEvent({
        request,
        action: 'community.post.pin.update',
        resourceType: 'post',
        resourceId: params.postId,
        result: 'SUCCESS',
        metadata: {
          pinned: body.pinned,
          clubId: asString(result.post.clubId),
          communityGroupId: asString(result.post.communityGroupId),
        },
      });

      return reply.send({
        post: result.post,
        seedVersion: result.dataVersion,
        requestId: request.requestId,
      });
    } catch (error) {
      await recordAuditEvent({
        request,
        action: 'community.post.pin.update',
        resourceType: 'post',
        resourceId: params.postId,
        result: error instanceof ApiProblemError && error.status < 500 ? 'DENY' : 'ERROR',
        metadata: {
          pinned: body.pinned,
          errorCode: error instanceof ApiProblemError ? error.code : 'INTERNAL_ERROR',
          status: error instanceof ApiProblemError ? error.status : 500,
        },
      });
      throw error;
    }
  });

  app.post('/posts/:postId/comments', async (request, reply) => {
    const authUserId = request.auth?.userId;
    const params = postParamsSchema.parse(request.params ?? {});
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }
    const body = postCommentCreateRequestSchema.parse(request.body ?? {});

    try {
      const result = await resolveCommunityMediaRepository().createPostComment({
        authUserId,
        isPrivilegedAdmin: isPrivilegedAdminAuth(request.auth),
        postId: params.postId,
        content: body.content,
        parentCommentId: body.parentCommentId,
        idempotencyKey: body.idempotencyKey,
      });

      await recordAuditEvent({
        request,
        action: 'community.comment.create',
        resourceType: 'post_comment',
        resourceId: asString(result.comment.id),
        result: 'SUCCESS',
        metadata: {
          postId: params.postId,
          parentCommentId: body.parentCommentId,
          idempotencyKey: body.idempotencyKey,
        },
      });

      return reply.status(201).send({
        comment: result.comment,
        seedVersion: result.dataVersion,
        requestId: request.requestId,
      });
    } catch (error) {
      await recordAuditEvent({
        request,
        action: 'community.comment.create',
        resourceType: 'post',
        resourceId: params.postId,
        result: error instanceof ApiProblemError && error.status < 500 ? 'DENY' : 'ERROR',
        metadata: {
          parentCommentId: body.parentCommentId,
          idempotencyKey: body.idempotencyKey,
          errorCode: error instanceof ApiProblemError ? error.code : 'INTERNAL_ERROR',
          status: error instanceof ApiProblemError ? error.status : 500,
        },
      });
      throw error;
    }
  });

  app.delete('/comments/:commentId', async (request, reply) => {
    const authUserId = request.auth?.userId;
    const params = commentParamsSchema.parse(request.params ?? {});
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }

    try {
      const result = await resolveCommunityMediaRepository().deletePostComment({
        authUserId,
        isPrivilegedAdmin: isPrivilegedAdminAuth(request.auth),
        commentId: params.commentId,
      });

      await recordAuditEvent({
        request,
        action: 'community.comment.remove',
        resourceType: 'post_comment',
        resourceId: params.commentId,
        result: 'SUCCESS',
        metadata: {
          postId: asString(result.comment.postId),
        },
      });

      return reply.send({
        comment: result.comment,
        seedVersion: result.dataVersion,
        requestId: request.requestId,
      });
    } catch (error) {
      await recordAuditEvent({
        request,
        action: 'community.comment.remove',
        resourceType: 'post_comment',
        resourceId: params.commentId,
        result: error instanceof ApiProblemError && error.status < 500 ? 'DENY' : 'ERROR',
        metadata: {
          errorCode: error instanceof ApiProblemError ? error.code : 'INTERNAL_ERROR',
          status: error instanceof ApiProblemError ? error.status : 500,
        },
      });
      throw error;
    }
  });

  app.post('/community-groups/:groupId/messages', async (request, reply) => {
    const authUserId = request.auth?.userId;
    const params = communityGroupParamsSchema.parse(request.params ?? {});
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }

    let body: z.infer<typeof groupMessageCreateRequestSchema> | undefined;
    try {
      body = groupMessageCreateRequestSchema.parse(request.body ?? {});
      const result = await resolveCommunityMediaRepository().createGroupMessage({
        authUserId,
        isPrivilegedAdmin: isPrivilegedAdminAuth(request.auth),
        communityGroupId: params.groupId,
        body: body.body,
        attachments: body.attachments,
        idempotencyKey: body.idempotencyKey,
      });

      await recordAuditEvent({
        request,
        action: 'community.message.create',
        resourceType: 'message',
        resourceId: asString(result.message.id),
        result: 'SUCCESS',
        metadata: {
          communityGroupId: params.groupId,
          messageThreadId: asString(result.message.messageThreadId),
          idempotencyKey: body.idempotencyKey,
          attachmentCount: body.attachments?.length ?? 0,
        },
      });

      return reply.status(201).send({
        message: result.message,
        thread: result.thread,
        seedVersion: result.dataVersion,
        requestId: request.requestId,
      });
    } catch (error) {
      await recordAuditEvent({
        request,
        action: 'community.message.create',
        resourceType: 'community_group',
        resourceId: params.groupId,
        result:
          isZodValidationError(error) ||
          (error instanceof ApiProblemError && error.status < 500)
            ? 'DENY'
            : 'ERROR',
        metadata: {
          idempotencyKey: body?.idempotencyKey,
          errorCode:
            isZodValidationError(error)
              ? 'VALIDATION_FAILED'
              : error instanceof ApiProblemError
                ? error.code
                : 'INTERNAL_ERROR',
          status:
            isZodValidationError(error)
              ? 400
              : error instanceof ApiProblemError
                ? error.status
                : 500,
        },
      });
      throw error;
    }
  });

  app.post('/community-groups/:groupId/messages/read', async (request, reply) => {
    const authUserId = request.auth?.userId;
    const params = communityGroupParamsSchema.parse(request.params ?? {});
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }

    try {
      const result = await resolveCommunityMediaRepository().markGroupMessagesRead({
        authUserId,
        isPrivilegedAdmin: isPrivilegedAdminAuth(request.auth),
        communityGroupId: params.groupId,
      });

      await recordAuditEvent({
        request,
        action: 'community.message.read',
        resourceType: 'community_group',
        resourceId: params.groupId,
        result: 'SUCCESS',
      });

      return reply.send({
        thread: result.thread,
        seedVersion: result.dataVersion,
        requestId: request.requestId,
      });
    } catch (error) {
      await recordAuditEvent({
        request,
        action: 'community.message.read',
        resourceType: 'community_group',
        resourceId: params.groupId,
        result: error instanceof ApiProblemError && error.status < 500 ? 'DENY' : 'ERROR',
        metadata: {
          errorCode: error instanceof ApiProblemError ? error.code : 'INTERNAL_ERROR',
          status: error instanceof ApiProblemError ? error.status : 500,
        },
      });
      throw error;
    }
  });

  app.post('/message-threads/:threadId/messages', async (request, reply) => {
    const authUserId = request.auth?.userId;
    const params = messageThreadParamsSchema.parse(request.params ?? {});
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }

    let body: z.infer<typeof groupMessageCreateRequestSchema> | undefined;
    try {
      body = groupMessageCreateRequestSchema.parse(request.body ?? {});
      const result = await resolveCommunityMediaRepository().createThreadMessage({
        authUserId,
        isPrivilegedAdmin: isPrivilegedAdminAuth(request.auth),
        messageThreadId: params.threadId,
        body: body.body,
        attachments: body.attachments,
        idempotencyKey: body.idempotencyKey,
      });

      await recordAuditEvent({
        request,
        action: 'community.thread-message.create',
        resourceType: 'message',
        resourceId: asString(result.message.id),
        result: 'SUCCESS',
        metadata: {
          messageThreadId: params.threadId,
          idempotencyKey: body.idempotencyKey,
          attachmentCount: body.attachments?.length ?? 0,
        },
      });

      return reply.status(201).send({
        message: result.message,
        thread: result.thread,
        seedVersion: result.dataVersion,
        requestId: request.requestId,
      });
    } catch (error) {
      await recordAuditEvent({
        request,
        action: 'community.thread-message.create',
        resourceType: 'message_thread',
        resourceId: params.threadId,
        result:
          isZodValidationError(error) ||
          (error instanceof ApiProblemError && error.status < 500)
            ? 'DENY'
            : 'ERROR',
        metadata: {
          idempotencyKey: body?.idempotencyKey,
          errorCode:
            isZodValidationError(error)
              ? 'VALIDATION_FAILED'
              : error instanceof ApiProblemError
                ? error.code
                : 'INTERNAL_ERROR',
          status:
            isZodValidationError(error)
              ? 400
              : error instanceof ApiProblemError
                ? error.status
                : 500,
        },
      });
      throw error;
    }
  });

  app.post('/message-threads/:threadId/read', async (request, reply) => {
    const authUserId = request.auth?.userId;
    const params = messageThreadParamsSchema.parse(request.params ?? {});
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }

    try {
      const result = await resolveCommunityMediaRepository().markThreadMessagesRead({
        authUserId,
        isPrivilegedAdmin: isPrivilegedAdminAuth(request.auth),
        messageThreadId: params.threadId,
      });

      await recordAuditEvent({
        request,
        action: 'community.thread-message.read',
        resourceType: 'message_thread',
        resourceId: params.threadId,
        result: 'SUCCESS',
      });

      return reply.send({
        thread: result.thread,
        seedVersion: result.dataVersion,
        requestId: request.requestId,
      });
    } catch (error) {
      await recordAuditEvent({
        request,
        action: 'community.thread-message.read',
        resourceType: 'message_thread',
        resourceId: params.threadId,
        result: error instanceof ApiProblemError && error.status < 500 ? 'DENY' : 'ERROR',
        metadata: {
          errorCode: error instanceof ApiProblemError ? error.code : 'INTERNAL_ERROR',
          status: error instanceof ApiProblemError ? error.status : 500,
        },
      });
      throw error;
    }
  });

  app.delete('/messages/:messageId', async (request, reply) => {
    const authUserId = request.auth?.userId;
    const params = messageParamsSchema.parse(request.params ?? {});
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }

    try {
      const result = await resolveCommunityMediaRepository().deleteMessage({
        authUserId,
        isPrivilegedAdmin: isPrivilegedAdminAuth(request.auth),
        messageId: params.messageId,
      });

      await recordAuditEvent({
        request,
        action: 'community.message.remove',
        resourceType: 'message',
        resourceId: params.messageId,
        result: 'SUCCESS',
        metadata: {
          messageThreadId: asString(result.message.messageThreadId),
        },
      });

      return reply.send({
        message: result.message,
        thread: result.thread,
        seedVersion: result.dataVersion,
        requestId: request.requestId,
      });
    } catch (error) {
      await recordAuditEvent({
        request,
        action: 'community.message.remove',
        resourceType: 'message',
        resourceId: params.messageId,
        result: error instanceof ApiProblemError && error.status < 500 ? 'DENY' : 'ERROR',
        metadata: {
          errorCode: error instanceof ApiProblemError ? error.code : 'INTERNAL_ERROR',
          status: error instanceof ApiProblemError ? error.status : 500,
        },
      });
      throw error;
    }
  });

  app.get('/message-threads', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }

    const result = await resolveCommunityMediaRepository().listMessageThreads({
      authUserId,
      isPrivilegedAdmin: isPrivilegedAdminAuth(request.auth),
    });

    return reply.send({
      threads: result.threads,
      seedVersion: result.dataVersion,
      requestId: request.requestId,
    });
  });

  app.get('/me/notifications', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }

    const result = await resolveCommunityMediaRepository().listNotifications({
      authUserId,
      isPrivilegedAdmin: isPrivilegedAdminAuth(request.auth),
    });

    return reply.send({
      notifications: result.notifications,
      preferences: result.preferences,
      mutedSources: result.mutedSources,
      quietHours: result.quietHours,
      unreadCount: result.unreadCount,
      seedVersion: result.dataVersion,
      requestId: request.requestId,
    });
  });

  app.patch('/me/notifications/preferences', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }

    let body: z.infer<typeof notificationPreferenceUpdateSchema> | undefined;
    try {
      body = notificationPreferenceUpdateSchema.parse(request.body ?? {});
      const result = await resolveCommunityMediaRepository().updateNotificationPreferences({
        authUserId,
        isPrivilegedAdmin: isPrivilegedAdminAuth(request.auth),
        channels: body.channels,
        quietHours: body.quietHours,
        typePreferences: body.typePreferences,
        mutedCoaches: body.mutedCoaches,
      });

      await recordAuditEvent({
        request,
        action: 'notification.preferences.update',
        resourceType: 'notification_preference',
        resourceId: authUserId,
        result: 'SUCCESS',
        metadata: {
          channels: body.channels ? Object.keys(body.channels) : [],
          quietHours: Boolean(body.quietHours),
          typePreferenceCount: body.typePreferences ? Object.keys(body.typePreferences).length : 0,
          mutedCoachCount: body.mutedCoaches?.length ?? 0,
        },
      });

      return reply.send({
        preferences: result.preferences,
        mutedSources: result.mutedSources,
        quietHours: result.quietHours,
        seedVersion: result.dataVersion,
        requestId: request.requestId,
      });
    } catch (error) {
      await recordAuditEvent({
        request,
        action: 'notification.preferences.update',
        resourceType: 'notification_preference',
        resourceId: authUserId,
        result:
          isZodValidationError(error) ||
          (error instanceof ApiProblemError && error.status < 500)
            ? 'DENY'
            : 'ERROR',
        metadata: {
          errorCode:
            isZodValidationError(error)
              ? 'VALIDATION_FAILED'
              : error instanceof ApiProblemError
                ? error.code
                : 'INTERNAL_ERROR',
          status:
            isZodValidationError(error)
              ? 400
              : error instanceof ApiProblemError
                ? error.status
                : 500,
        },
      });
      throw error;
    }
  });

  app.get('/me/privacy-settings', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }

    try {
      const result = await getPrivacySettingsForUser(authUserId);

      await recordAuditEvent({
        request,
        action: 'privacy_settings.read',
        resourceType: 'privacy_settings',
        resourceId: authUserId,
        subjectUserId: authUserId,
        result: 'SUCCESS',
        sensitiveRead: true,
      });

      return reply.send({
        settings: result.settings,
        seedVersion: result.seedVersion,
        requestId: request.requestId,
      });
    } catch (error) {
      await recordAuditEvent({
        request,
        action: 'privacy_settings.read',
        resourceType: 'privacy_settings',
        resourceId: authUserId,
        subjectUserId: authUserId,
        result: error instanceof ApiProblemError && error.status < 500 ? 'DENY' : 'ERROR',
        sensitiveRead: true,
        metadata: {
          errorCode: error instanceof ApiProblemError ? error.code : 'INTERNAL_ERROR',
          status: error instanceof ApiProblemError ? error.status : 500,
        },
      });
      throw error;
    }
  });

  app.patch('/me/privacy-settings', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }
    const body = privacySettingsUpdateSchema.parse(request.body ?? {});
    const changedKeys = privacySettingKeys.filter((key) => body[key] !== undefined);

    try {
      const result = await updatePrivacySettingsForUser(authUserId, body);

      await recordAuditEvent({
        request,
        action: 'privacy_settings.update',
        resourceType: 'privacy_settings',
        resourceId: authUserId,
        subjectUserId: authUserId,
        result: 'SUCCESS',
        metadata: {
          changedKeys,
        },
      });

      return reply.send({
        settings: result.settings,
        seedVersion: result.seedVersion,
        requestId: request.requestId,
      });
    } catch (error) {
      await recordAuditEvent({
        request,
        action: 'privacy_settings.update',
        resourceType: 'privacy_settings',
        resourceId: authUserId,
        subjectUserId: authUserId,
        result: error instanceof ApiProblemError && error.status < 500 ? 'DENY' : 'ERROR',
        metadata: {
          changedKeys,
          errorCode: error instanceof ApiProblemError ? error.code : 'INTERNAL_ERROR',
          status: error instanceof ApiProblemError ? error.status : 500,
        },
      });
      throw error;
    }
  });

  app.get('/me/booking-preferences', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }

    try {
      const result = await getBookingPreferencesForUser(authUserId);

      await recordAuditEvent({
        request,
        action: 'booking_preferences.read',
        resourceType: 'booking_preferences',
        resourceId: authUserId,
        subjectUserId: authUserId,
        result: 'SUCCESS',
        sensitiveRead: true,
      });

      return reply.send({
        preferences: result.preferences,
        seedVersion: result.seedVersion,
        requestId: request.requestId,
      });
    } catch (error) {
      await recordAuditEvent({
        request,
        action: 'booking_preferences.read',
        resourceType: 'booking_preferences',
        resourceId: authUserId,
        subjectUserId: authUserId,
        result: error instanceof ApiProblemError && error.status < 500 ? 'DENY' : 'ERROR',
        sensitiveRead: true,
        metadata: {
          errorCode: error instanceof ApiProblemError ? error.code : 'INTERNAL_ERROR',
          status: error instanceof ApiProblemError ? error.status : 500,
        },
      });
      throw error;
    }
  });

  app.patch('/me/booking-preferences', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }
    const body = bookingPreferencesUpdateSchema.parse(request.body ?? {});

    try {
      const result = await updateBookingPreferencesForUser(authUserId, body);

      await recordAuditEvent({
        request,
        action: 'booking_preferences.update',
        resourceType: 'booking_preferences',
        resourceId: authUserId,
        subjectUserId: authUserId,
        result: 'SUCCESS',
        metadata: {
          changedKeys: ['allowBookSelf'],
        },
      });

      return reply.send({
        preferences: result.preferences,
        seedVersion: result.seedVersion,
        requestId: request.requestId,
      });
    } catch (error) {
      await recordAuditEvent({
        request,
        action: 'booking_preferences.update',
        resourceType: 'booking_preferences',
        resourceId: authUserId,
        subjectUserId: authUserId,
        result: error instanceof ApiProblemError && error.status < 500 ? 'DENY' : 'ERROR',
        metadata: {
          changedKeys: ['allowBookSelf'],
          errorCode: error instanceof ApiProblemError ? error.code : 'INTERNAL_ERROR',
          status: error instanceof ApiProblemError ? error.status : 500,
        },
      });
      throw error;
    }
  });

  app.post('/me/notifications/read-all', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }

    try {
      const result = await resolveCommunityMediaRepository().markAllNotificationsRead({
        authUserId,
        isPrivilegedAdmin: isPrivilegedAdminAuth(request.auth),
      });

      await recordAuditEvent({
        request,
        action: 'notification.read_all',
        resourceType: 'notification',
        resourceId: authUserId,
        result: 'SUCCESS',
        metadata: {
          count: result.notifications.length,
        },
      });

      return reply.send({
        notifications: result.notifications,
        unreadCount: result.unreadCount,
        seedVersion: result.dataVersion,
        requestId: request.requestId,
      });
    } catch (error) {
      await recordAuditEvent({
        request,
        action: 'notification.read_all',
        resourceType: 'notification',
        resourceId: authUserId,
        result: error instanceof ApiProblemError && error.status < 500 ? 'DENY' : 'ERROR',
        metadata: {
          errorCode: error instanceof ApiProblemError ? error.code : 'INTERNAL_ERROR',
          status: error instanceof ApiProblemError ? error.status : 500,
        },
      });
      throw error;
    }
  });

  app.post('/me/notifications/dismiss-all', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }

    try {
      const result = await resolveCommunityMediaRepository().dismissAllNotifications({
        authUserId,
        isPrivilegedAdmin: isPrivilegedAdminAuth(request.auth),
      });

      await recordAuditEvent({
        request,
        action: 'notification.dismiss_all',
        resourceType: 'notification',
        resourceId: authUserId,
        result: 'SUCCESS',
        metadata: {
          count: result.notifications.length,
        },
      });

      return reply.send({
        notifications: result.notifications,
        unreadCount: result.unreadCount,
        seedVersion: result.dataVersion,
        requestId: request.requestId,
      });
    } catch (error) {
      await recordAuditEvent({
        request,
        action: 'notification.dismiss_all',
        resourceType: 'notification',
        resourceId: authUserId,
        result: error instanceof ApiProblemError && error.status < 500 ? 'DENY' : 'ERROR',
        metadata: {
          errorCode: error instanceof ApiProblemError ? error.code : 'INTERNAL_ERROR',
          status: error instanceof ApiProblemError ? error.status : 500,
        },
      });
      throw error;
    }
  });

  app.post('/me/notifications/:notificationId/read', async (request, reply) => {
    const authUserId = request.auth?.userId;
    const params = notificationParamsSchema.parse(request.params ?? {});
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }

    try {
      const result = await resolveCommunityMediaRepository().markNotificationRead({
        authUserId,
        isPrivilegedAdmin: isPrivilegedAdminAuth(request.auth),
        notificationId: params.notificationId,
      });

      await recordAuditEvent({
        request,
        action: 'notification.read',
        resourceType: 'notification',
        resourceId: params.notificationId,
        result: 'SUCCESS',
      });

      return reply.send({
        notification: result.notification,
        seedVersion: result.dataVersion,
        requestId: request.requestId,
      });
    } catch (error) {
      await recordAuditEvent({
        request,
        action: 'notification.read',
        resourceType: 'notification',
        resourceId: params.notificationId,
        result: error instanceof ApiProblemError && error.status < 500 ? 'DENY' : 'ERROR',
        metadata: {
          errorCode: error instanceof ApiProblemError ? error.code : 'INTERNAL_ERROR',
          status: error instanceof ApiProblemError ? error.status : 500,
        },
      });
      throw error;
    }
  });

  app.post('/me/notifications/:notificationId/dismiss', async (request, reply) => {
    const authUserId = request.auth?.userId;
    const params = notificationParamsSchema.parse(request.params ?? {});
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }

    try {
      const result = await resolveCommunityMediaRepository().dismissNotification({
        authUserId,
        isPrivilegedAdmin: isPrivilegedAdminAuth(request.auth),
        notificationId: params.notificationId,
      });

      await recordAuditEvent({
        request,
        action: 'notification.dismiss',
        resourceType: 'notification',
        resourceId: params.notificationId,
        result: 'SUCCESS',
      });

      return reply.send({
        notification: result.notification,
        seedVersion: result.dataVersion,
        requestId: request.requestId,
      });
    } catch (error) {
      await recordAuditEvent({
        request,
        action: 'notification.dismiss',
        resourceType: 'notification',
        resourceId: params.notificationId,
        result: error instanceof ApiProblemError && error.status < 500 ? 'DENY' : 'ERROR',
        metadata: {
          errorCode: error instanceof ApiProblemError ? error.code : 'INTERNAL_ERROR',
          status: error instanceof ApiProblemError ? error.status : 500,
        },
      });
      throw error;
    }
  });

  app.get('/access-grants', async (request, reply) => {
    const isAdmin = isPrivilegedAdminAuth(request.auth);
    if (!isAdmin) {
      await recordAuditEvent({
        request,
        action: 'access_grants.read',
        resourceType: 'access_grant',
        result: 'DENY',
        sensitiveRead: true,
        metadata: {
          reason: 'ADMIN_REQUIRED',
        },
      });
      throw forbidden('Admin role required');
    }

    await assertDbModePrismaAvailable({
      request,
      action: 'access_grants.read',
      resourceType: 'access_grant',
      sensitiveRead: true,
    });
    const overview = await resolveTrustAccessRepository().getTrustAdminOverview();
    await recordAuditEvent({
      request,
      action: 'access_grants.read',
      resourceType: 'access_grant',
      result: 'SUCCESS',
      sensitiveRead: true,
      metadata: {
        grantCount: overview.grants.length,
      },
    });

    return reply.send({
      grants: overview.grants,
      auditEvents: overview.auditEvents,
      securityEvents: overview.securityEvents,
      retentionPolicies: overview.retentionPolicies,
      legalHolds: overview.legalHolds,
      seedVersion: overview.dataVersion,
      requestId: request.requestId,
    });
  });

  app.get('/admin/retention-runs', async (request, reply) => {
    const isAdmin = isPrivilegedAdminAuth(request.auth);
    if (!isAdmin) {
      await recordAuditEvent({
        request,
        action: 'retention_runs.read',
        resourceType: 'retention_run',
        result: 'DENY',
        sensitiveRead: true,
        metadata: {
          reason: 'ADMIN_REQUIRED',
        },
      });
      throw forbidden('Admin role required');
    }

    await assertDbModePrismaAvailable({
      request,
      action: 'retention_runs.read',
      resourceType: 'retention_run',
      sensitiveRead: true,
    });
    const retentionRuns = await resolveTrustAccessRepository().listRetentionRuns();
    await recordAuditEvent({
      request,
      action: 'retention_runs.read',
      resourceType: 'retention_run',
      result: 'SUCCESS',
      sensitiveRead: true,
      metadata: {
        runCount: retentionRuns.runs.length,
      },
    });
    return reply.send({
      runs: retentionRuns.runs,
      requestId: request.requestId,
      seedVersion: retentionRuns.dataVersion,
    });
  });

  app.get('/me/data-deletion-requests', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      await recordAuditEvent({
        request,
        action: 'data_deletion_requests.read',
        resourceType: 'data_deletion_request',
        result: 'DENY',
        sensitiveRead: true,
        metadata: {
          reason: 'AUTH_REQUIRED',
        },
      });
      throw forbidden('Authenticated user is required');
    }

    await assertDbModePrismaAvailable({
      request,
      action: 'data_deletion_requests.read',
      resourceType: 'data_deletion_request',
      subjectUserId: authUserId,
      sensitiveRead: true,
    });
    const deletionRequests =
      await resolveTrustAccessRepository().listDataDeletionRequestsForUser(authUserId);
    await recordAuditEvent({
      request,
      action: 'data_deletion_requests.read',
      resourceType: 'data_deletion_request',
      result: 'SUCCESS',
      sensitiveRead: true,
      metadata: {
        requestCount: deletionRequests.requests.length,
      },
    });
    return reply.send({
      requests: deletionRequests.requests,
      total: deletionRequests.requests.length,
      requestId: request.requestId,
      seedVersion: deletionRequests.dataVersion,
    });
  });

  app.post('/me/data-deletion-requests', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      await recordAuditEvent({
        request,
        action: 'data_deletion_requests.create',
        resourceType: 'data_deletion_request',
        result: 'DENY',
        sensitiveRead: true,
        metadata: {
          reason: 'AUTH_REQUIRED',
        },
      });
      throw forbidden('Authenticated user is required');
    }

    const body = dataDeletionRequestCreateSchema.parse(request.body ?? {});
    await assertDbModePrismaAvailable({
      request,
      action: 'data_deletion_requests.create',
      resourceType: 'data_deletion_request',
      subjectUserId: authUserId,
      sensitiveRead: true,
      metadata: {
        reasonProvided: Boolean(body.reason),
      },
    });
    const result = await resolveTrustAccessRepository().createDataDeletionRequestForUser(
      authUserId,
      body,
    );

    await recordAuditEvent({
      request,
      action: 'data_deletion_requests.create',
      resourceType: 'data_deletion_request',
      resourceId: asString(result.request.id),
      result: 'SUCCESS',
      sensitiveRead: true,
      metadata: {
        status: asString(result.request.status),
        duplicatePending: !result.created,
      },
    });

    return reply.status(result.created ? 201 : 200).send({
      request: result.request,
      created: result.created,
      requestId: request.requestId,
      seedVersion: result.dataVersion,
    });
  });
};

export default wave2PlusRoutes;
