import crypto from "node:crypto";
import type { FastifyPluginAsync, FastifyRequest } from "fastify";
import { z } from "zod";
import {
  clubInvitesResponseSchema,
  createClubInvitesRequestSchema,
  createClubInvitesResponseSchema,
  getClubGovernanceSnapshot,
  isClubStaffRole,
  joinClubRequestSchema,
  joinClubResponseSchema,
  parseOrganizationRole,
  respondToClubInviteRequestSchema,
  respondToClubInviteResponseSchema,
  resolveClubJoinCodeResponseSchema,
  validateSocialLinkInput,
  type SocialLinkPlatform,
} from "@clubroom/shared-contracts";
import {
  buildAuditSecretReference,
  recordAuditEvent,
} from "../../lib/audit-runtime.js";
import {
  canUseStaffInviteLinks,
  hasAnyGrantedRole,
  isPrivilegedAdminAuth,
} from "../../lib/authz.js";
import { getApiDataBackend } from "../../lib/data-backend.js";
import { getDbFixtureStore } from "../../lib/db-fixture-store.js";
import { listAccessibleInvoices } from "../../lib/invoice-runtime.js";
import {
  ApiProblemError,
  badRequest,
  forbidden,
  isZodValidationError,
  notFound,
} from "../../lib/http-errors.js";
import { deliverClubInviteEmail } from "../../lib/password-reset-delivery.js";
import { getMarketplaceSeedStore } from "../../lib/marketplace-seed-store.js";
import {
  API_DB_TRANSACTION_OPTIONS,
  getPrismaClientOrThrow,
  shouldUseDbFixtureFallback,
} from "../../lib/prisma-runtime.js";
import {
  resetClubAuthorityRepositoryForTests,
  resolveClubAuthorityRepository,
  type VisibleClub,
} from "../../repositories/p0/club-authority-repository.js";
import { resolveClubBrandingRepository } from "../../repositories/p0/club-branding-repository.js";
import { resolveClubIntegrationRepository } from "../../repositories/p0/club-integration-repository.js";
import {
  type CoachAnalyticsPeriod,
  resolveCoachAnalyticsRepository,
} from "../../repositories/p0/coach-analytics-repository.js";
import { resolveCoachEarningsRepository } from "../../repositories/p0/coach-earnings-repository.js";
import { resolveCoachFavouriteRepository } from "../../repositories/p0/coach-favourite-repository.js";
import { resolveCoachPaymentInstructionsRepository } from "../../repositories/p0/coach-payment-instructions-repository.js";
import { resolveCoachRosterConsentRepository } from "../../repositories/p0/coach-roster-consent-repository.js";
import { resolveCoachRosterRepository } from "../../repositories/p0/coach-roster-repository.js";
import {
  resolveCoachSessionTemplateRepository,
  type CoachSessionTemplate,
} from "../../repositories/p0/coach-session-template-repository.js";
import {
  resolveCoachSelfRepository,
  type PublicCoachSearchSort,
} from "../../repositories/p0/coach-self-repository.js";
import { resolveCoachTravelSettingsRepository } from "../../repositories/p0/coach-travel-settings-repository.js";
import { resolveCoachTrialOfferingRepository } from "../../repositories/p0/coach-trial-offering-repository.js";
import { resolveCoachTrialUsageRepository } from "../../repositories/p0/coach-trial-usage-repository.js";
import { resolveCoachVenueRepository } from "../../repositories/p0/coach-venue-repository.js";
import { normalizeForJson } from "../../repositories/p0/normalize.js";
import {
  parseAvailabilityConflictQuery,
  parseAvailabilitySlotQuery,
  resolveCoachAvailabilityConflicts,
  resolveCoachAvailabilityTables,
  resolveCoachAvailabilitySlots,
} from "./availability.js";
import {
  buildClubScheduleActivities,
  findClubScheduleActivity,
} from "./schedule.js";
import { registerClubHeadCoachRoutes } from "./head-coach-oversight.js";
import { registerClubMatchRoutes } from "./matches.js";
import { registerClubOwnerDashboardRoutes } from "./owner-dashboard.js";
import { registerClubStaffingRoutes } from "./staffing-console.js";
type SeedRow = Record<string, unknown>;
type SeedTables = Record<string, SeedRow[]>;

function parseClubJoinPreviewResponse(payload: unknown) {
  const parsed = resolveClubJoinCodeResponseSchema.safeParse(payload);
  if (!parsed.success) {
    throw new ApiProblemError(
      500,
      "INTERNAL_ERROR",
      "Club join preview response invalid",
    );
  }
  return parsed.data;
}

function parseClubJoinResponse(payload: unknown) {
  const parsed = joinClubResponseSchema.safeParse(payload);
  if (!parsed.success) {
    throw new ApiProblemError(500, "INTERNAL_ERROR", "Club join response invalid");
  }
  return parsed.data;
}

function parseClubInvitesResponse(payload: unknown) {
  const parsed = clubInvitesResponseSchema.safeParse(payload);
  if (!parsed.success) {
    throw new ApiProblemError(500, "INTERNAL_ERROR", "Club invites response invalid");
  }
  return parsed.data;
}

function parseCreateClubInvitesResponse(payload: unknown) {
  const parsed = createClubInvitesResponseSchema.safeParse(payload);
  if (!parsed.success) {
    throw new ApiProblemError(500, "INTERNAL_ERROR", "Create club invites response invalid");
  }
  return parsed.data;
}

function parseRespondToClubInviteResponse(payload: unknown) {
  const parsed = respondToClubInviteResponseSchema.safeParse(payload);
  if (!parsed.success) {
    throw new ApiProblemError(500, "INTERNAL_ERROR", "Club invite response invalid");
  }
  return parsed.data;
}

function serializeVisibleClub(club: VisibleClub, isPrivilegedAdmin = false) {
  const viewerRole = parseOrganizationRole(club.viewerMembership?.role);
  const viewerGovernance = getClubGovernanceSnapshot(viewerRole);
  const coachCount = club.memberships.filter((membership) => {
    const role = parseOrganizationRole(membership.role);
    return (
      role === "OWNER" ||
      role === "ADMIN" ||
      role === "HEAD_COACH" ||
      role === "COACH" ||
      role === "ASSISTANT"
    );
  }).length;
  const { memberships, inviteCode, squads, ...summary } = club;

  return {
    ...summary,
    inviteCode: viewerGovernance.canManageMembers ? inviteCode : null,
    memberCount: memberships.length,
    coachCount,
    squads: squads.flatMap((squad) => {
      const id = asString(squad.id);
      return id ? [{ id }] : [];
    }),
    viewerGovernance,
    canManageMatches: isPrivilegedAdmin || Boolean(viewerRole && isClubStaffRole(viewerRole)),
  };
}
const cancellationPolicyPayloadSchema = z
  .object({
    name: z.string().trim().min(1).max(80),
    description: z.string().trim().max(500),
    tiers: z
      .array(
        z
          .object({
            hoursBeforeSession: z.number().int().min(0).max(8_760),
            refundPercentage: z.number().int().min(0).max(100),
            description: z.string().trim().max(240),
          })
          .strict(),
      )
      .min(1)
      .max(12),
    minimumNoticeHours: z.number().int().min(0).max(8_760),
    allowCancellations: z.boolean(),
    isDefault: z.boolean(),
  })
  .strict();
const schedulingRulesPatchBodySchema = z
  .object({
    minimumAdvanceBookingHours: z.number().int().min(0).max(72).optional(),
    maxAdvanceBookingDays: z.number().int().min(7).max(90).optional(),
    bufferMinutesDefault: z.number().int().min(0).max(60).optional(),
    maxConcurrentDefault: z.number().int().min(1).max(100).optional(),
    allowSameDayBookings: z.boolean().optional(),
    cancellationPolicy: cancellationPolicyPayloadSchema.nullable().optional(),
  })
  .strict()
  .refine((body) => Object.keys(body).length > 0, {
    message: "At least one scheduling rule is required",
  });
type SchedulingRulesPatchBody = z.infer<typeof schedulingRulesPatchBodySchema>;
const favouriteCoachParamsSchema = z.object({
  coachId: z.string().min(1),
});
const queryStringListSchema = z.preprocess((value) => {
  if (value == null) return undefined;
  const rawValues = Array.isArray(value) ? value : [value];
  const values = rawValues.flatMap((entry) =>
    typeof entry === "string" ? entry.split(",") : [],
  );
  return values.map((entry) => entry.trim()).filter(Boolean);
}, z.array(z.string().min(1).max(80)).max(20).optional());
const coachPublicSearchQuerySchema = z
  .object({
    query: z.string().trim().max(100).optional(),
    priceMin: z.coerce.number().min(0).max(10_000).optional(),
    priceMax: z.coerce.number().min(0).max(10_000).optional(),
    rating: z.coerce.number().min(0).max(5).optional(),
    sports: queryStringListSchema,
    focuses: queryStringListSchema,
    formats: queryStringListSchema,
    languages: queryStringListSchema,
    lat: z.coerce.number().min(-90).max(90).optional(),
    lng: z.coerce.number().min(-180).max(180).optional(),
    radiusKm: z.coerce.number().min(0).max(500).optional(),
    sortBy: z
      .enum(["relevance", "distance", "rating", "price_low", "price_high", "reviews"])
      .default("relevance"),
    page: z.coerce.number().int().min(1).max(1_000).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict()
  .superRefine((value, context) => {
    const hasLat = value.lat != null;
    const hasLng = value.lng != null;
    const needsOrigin = hasLat || hasLng || value.radiusKm != null || value.sortBy === "distance";
    if (needsOrigin && (!hasLat || !hasLng)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "lat and lng are required for location distance search",
        path: ["lat"],
      });
    }
  });
const coachSessionTemplateParamsSchema = z.object({
  templateId: z.string().min(1),
});
const coachEarningsQuerySchema = z
  .object({
    period: z.enum(["week", "month", "year"]).default("month"),
    limit: z.coerce.number().int().min(1).max(100).optional(),
  })
  .strict();
const coachAnalyticsParamsSchema = z.object({
  coachId: z.string().min(1),
});
const delegatedAvailabilityTemplateParamsSchema = z.object({
  coachId: z.string().min(1),
  templateId: z.string().min(1),
});
const delegatedAvailabilityOverrideParamsSchema = z.object({
  coachId: z.string().min(1),
  overrideId: z.string().min(1),
});
const coachRosterParamsSchema = z.object({
  coachId: z.string().min(1),
});
const coachRosterConsentsQuerySchema = z
  .object({
    type: z.enum(["PHOTO", "VIDEO", "SOCIAL_MEDIA", "EMERGENCY_TREATMENT"]).optional(),
    status: z.enum(["granted", "denied", "all"]).default("all"),
    search: z.string().trim().max(100).optional(),
  })
  .strict();
const coachTrialOfferingParamsSchema = z.object({
  coachId: z.string().min(1),
});
const coachTrialUsageQuerySchema = z
  .object({
    parentId: z.string().min(1).optional(),
  })
  .strict();
const coachTrialUsageBodySchema = z
  .object({
    parentId: z.string().min(1),
    familyId: z.string().min(1).optional(),
    bookingId: z.string().min(1),
  })
  .strict();
const coachTrialConversionQuerySchema = z
  .object({
    trialBookingId: z.string().min(1).optional(),
  })
  .strict();
const coachTrialConversionBodySchema = z
  .object({
    parentId: z.string().min(1),
    trialBookingId: z.string().min(1),
    regularBookingId: z.string().min(1),
  })
  .strict();
const coachRosterAthleteParamsSchema = z.object({
  coachId: z.string().min(1),
  athleteId: z.string().min(1),
});
const coachRosterNoteParamsSchema = z.object({
  coachId: z.string().min(1),
  athleteId: z.string().min(1),
  noteId: z.string().min(1),
});
const coachRosterRemovalParamsSchema = z.object({
  coachId: z.string().min(1),
  removalId: z.string().min(1),
});
const coachRosterNoteBodySchema = z
  .object({
    content: z.string().trim().min(1).max(2000),
  })
  .strict();
const coachRosterCreateBodySchema = z
  .object({
    athleteId: z.string().trim().min(1),
    status: z
      .preprocess(
        (value) => (typeof value === "string" ? value.toUpperCase() : value),
        z.enum(["ACTIVE", "PAUSED", "GRADUATED", "INACTIVE"]),
      )
      .optional(),
    tags: z.array(z.string().trim().min(1).max(80)).max(24).optional(),
    primaryFocus: z.string().trim().max(80).nullable().optional(),
    notificationPreference: z
      .preprocess(
        (value) => (typeof value === "string" ? value.toUpperCase() : value),
        z.enum(["ALL", "IMPORTANT", "NONE"]),
      )
      .optional(),
  })
  .strict();
const coachRosterUpdateBodySchema = z
  .object({
    status: z
      .preprocess(
        (value) => (typeof value === "string" ? value.toUpperCase() : value),
        z.enum(["ACTIVE", "PAUSED", "GRADUATED", "INACTIVE"]),
      )
      .optional(),
    tags: z.array(z.string().trim().min(1).max(80)).max(24).optional(),
    primaryFocus: z.string().trim().max(80).nullable().optional(),
    notificationPreference: z
      .preprocess(
        (value) => (typeof value === "string" ? value.toUpperCase() : value),
        z.enum(["ALL", "IMPORTANT", "NONE"]),
      )
      .optional(),
  })
  .strict()
  .refine((body) => Object.keys(body).length > 0, {
    message: "At least one roster field is required",
  });
const coachRosterRemovalBodySchema = z
  .object({
    reason: z
      .preprocess(
        (value) => (typeof value === "string" ? value.toUpperCase() : value),
        z.enum(["GRADUATED", "MOVED", "INACTIVE", "OTHER"]),
      )
      .default("OTHER"),
    customReason: z.string().trim().max(500).nullable().optional(),
    archive: z.boolean().default(true),
  })
  .strict();
const coachAnalyticsQuerySchema = z
  .object({
    period: z
      .preprocess(
        (value) => (typeof value === "string" ? value.toUpperCase() : value),
        z.enum(["WEEK", "MONTH", "QUARTER", "YEAR", "ALL"]),
      )
      .default("MONTH"),
  })
  .strict();
const coachInvoiceListQuerySchema = z
  .object({
    status: z.string().trim().min(1).max(120).optional(),
    bookingId: z.string().trim().min(1).max(120).optional(),
    dateFrom: z.string().trim().min(1).max(64).optional(),
    dateTo: z.string().trim().min(1).max(64).optional(),
  })
  .strict();
const payoutMethodParamsSchema = z.object({
  methodId: z.string().min(1),
});
const withdrawalParamsSchema = z.object({
  withdrawalId: z.string().min(1),
});
const payoutMethodBodySchema = z
  .object({
    type: z.enum(["BANK_ACCOUNT", "PAYPAL", "STRIPE"]),
    isDefault: z.boolean().optional(),
    bankName: z.string().trim().min(1).max(120).optional(),
    accountLastFour: z.string().regex(/^\d{4}$/).optional(),
    sortCode: z.string().trim().min(1).max(24).optional(),
    paypalEmail: z.string().email().max(254).optional(),
    stripeAccountId: z.string().trim().min(1).max(120).optional(),
    nickname: z.string().trim().min(1).max(80).optional(),
  })
  .strict();
const withdrawalQuerySchema = z
  .object({
    status: z.enum(["pending"]).optional(),
  })
  .strict();
const withdrawalBodySchema = z
  .object({
    amount: z.coerce.number().finite().min(0.01).max(1000000).multipleOf(0.01),
    payoutMethodId: z.string().min(1),
  })
  .strict();
const coachPaymentInstructionsBodySchema = z
  .object({
    payeeName: z.string().trim().max(80).default(""),
    bankTransferDetails: z.string().trim().max(600).default(""),
    paymentNotes: z.string().trim().max(400).default(""),
  })
  .strict()
  .refine(
    (body) =>
      body.bankTransferDetails.trim().length > 0 ||
      body.paymentNotes.trim().length > 0,
    {
      message: "Add bank details or payment notes so families know how to pay you",
    },
  );
const profileLinkSchema = (platform: SocialLinkPlatform) =>
  z
    .string()
    .trim()
    .max(300)
    .superRefine((value, context) => {
      const error = validateSocialLinkInput(platform, value);
      if (error) context.addIssue({ code: z.ZodIssueCode.custom, message: error });
    });
const coachProfilePatchBodySchema = z
  .object({
    bio: z.string().trim().max(2000).nullable().optional(),
    yearsExperience: z.coerce.number().int().min(0).max(80).nullable().optional(),
    sessionRateMinor: z.coerce
      .number()
      .int()
      .min(0)
      .max(10_000_000)
      .nullable()
      .optional(),
    priceMaxMinor: z.coerce
      .number()
      .int()
      .min(0)
      .max(10_000_000)
      .nullable()
      .optional(),
    currency: z
      .string()
      .trim()
      .regex(/^[a-zA-Z]{3}$/)
      .transform((value) => value.toUpperCase())
      .optional(),
    website: profileLinkSchema("website").nullable().optional(),
    socialLinks: z
      .object({
        instagram: profileLinkSchema("instagram").optional(),
        twitter: profileLinkSchema("twitter").optional(),
        facebook: profileLinkSchema("facebook").optional(),
        linkedin: profileLinkSchema("linkedin").optional(),
        youtube: profileLinkSchema("youtube").optional(),
        tiktok: profileLinkSchema("tiktok").optional(),
      })
      .strict()
      .optional(),
    experiences: z
      .array(
        z
          .object({
            id: z.string().trim().min(1).max(80),
            title: z.string().trim().max(120),
            organization: z.string().trim().max(120),
            startDate: z.string().trim().max(32),
            endDate: z.string().trim().max(32).optional(),
            description: z.string().trim().max(1000).optional(),
            current: z.boolean(),
          })
          .strict(),
      )
      .max(20)
      .optional(),
    languages: z
      .array(
        z
          .object({
            id: z.string().trim().min(1).max(80),
            name: z.string().trim().min(1).max(80),
            proficiency: z.enum(["Native", "Fluent", "Conversational", "Basic"]),
          })
          .strict(),
      )
      .max(20)
      .optional(),
    specialties: z.array(z.string().trim().min(1).max(80)).max(24).optional(),
    qualifications: z
      .array(z.string().trim().min(1).max(120))
      .max(24)
      .optional(),
  })
  .strict()
  .refine((body) => Object.keys(body).length > 0, {
    message: "At least one profile field is required",
  });
const coachTravelSettingsPatchBodySchema = z
  .object({
    radiusMiles: z.number().int().min(1).max(50).optional(),
    acceptsTravelSessions: z.boolean().optional(),
    acceptsRemoteSessions: z.boolean().optional(),
  })
  .strict()
  .refine((body) => Object.keys(body).length > 0, {
    message: "At least one travel setting is required",
  });
const coachVenueParamsSchema = z.object({
  venueId: z.string().min(1),
});
const coachVenueBodySchema = z
  .object({
    label: z.string().trim().min(1).max(160),
    isDefault: z.boolean().optional(),
  })
  .strict();
const coachVenuePatchSchema = coachVenueBodySchema
  .partial()
  .strict()
  .refine((body) => Object.keys(body).length > 0, {
    message: "At least one venue field is required",
  });
const coachSessionTemplateBodySchema = z
  .object({
    name: z.string().trim().min(3).max(100),
    type: z.enum(["1-to-1", "small-group", "clinic", "assessment"]),
    duration: z.number().int().min(15).max(480),
    capacity: z.number().int().min(1).max(100),
    defaultPrice: z.number().finite().min(0).max(100000).multipleOf(0.01),
    description: z.string().trim().max(2000).optional(),
    defaultLocation: z.string().trim().max(500).optional(),
    skillsFocus: z.array(z.string().trim().min(1).max(100)).max(50).default([]),
  })
  .strict();
const coachSessionTemplatePatchSchema = coachSessionTemplateBodySchema
  .partial()
  .strict()
  .refine((body) => Object.keys(body).length > 0, {
    message: "At least one session template field is required",
  });
const coachOfferingParamsSchema = z.object({
  offeringId: z.string().min(1),
});
const coachOfferingServiceTypeSchema = z.enum([
  "1-to-1",
  "small-group",
  "clinic",
  "assessment",
  "one_to_one",
  "small_group",
]);
const coachOfferingBodySchema = z
  .object({
    title: z.string().trim().min(3).max(100),
    serviceType: coachOfferingServiceTypeSchema,
    durationMinutes: z.number().int().min(15).max(480),
    capacity: z.number().int().min(1).max(100),
    priceMinor: z.number().int().min(0).max(10_000_000),
    description: z.string().trim().max(2000).optional(),
    defaultLocation: z.string().trim().max(500).optional(),
    skillsFocus: z.array(z.string().trim().min(1).max(100)).max(50).default([]),
  })
  .strict();
const coachOfferingPatchSchema = coachOfferingBodySchema
  .partial()
  .strict()
  .refine((body) => Object.keys(body).length > 0, {
    message: "At least one offering field is required",
  });
type CoachOfferingBody = z.infer<typeof coachOfferingBodySchema>;
type CoachOfferingPatchBody = z.infer<typeof coachOfferingPatchSchema>;
function normalizeOfferingServiceType(
  value: CoachOfferingBody["serviceType"],
): CoachSessionTemplate["type"] {
  if (value === "one_to_one") return "1-to-1";
  if (value === "small_group") return "small-group";
  return value;
}
function offeringBodyToTemplateInput(body: CoachOfferingBody) {
  return {
    name: body.title,
    type: normalizeOfferingServiceType(body.serviceType),
    duration: body.durationMinutes,
    capacity: body.capacity,
    defaultPrice: body.priceMinor / 100,
    ...(body.description !== undefined ? { description: body.description } : {}),
    ...(body.defaultLocation !== undefined ? { defaultLocation: body.defaultLocation } : {}),
    skillsFocus: body.skillsFocus,
  };
}
function offeringPatchToTemplatePatch(body: CoachOfferingPatchBody) {
  return {
    ...(body.title !== undefined ? { name: body.title } : {}),
    ...(body.serviceType !== undefined
      ? { type: normalizeOfferingServiceType(body.serviceType) }
      : {}),
    ...(body.durationMinutes !== undefined ? { duration: body.durationMinutes } : {}),
    ...(body.capacity !== undefined ? { capacity: body.capacity } : {}),
    ...(body.priceMinor !== undefined ? { defaultPrice: body.priceMinor / 100 } : {}),
    ...(body.description !== undefined ? { description: body.description } : {}),
    ...(body.defaultLocation !== undefined ? { defaultLocation: body.defaultLocation } : {}),
    ...(body.skillsFocus !== undefined ? { skillsFocus: body.skillsFocus } : {}),
  };
}
function templateToOffering(template: CoachSessionTemplate) {
  return {
    id: template.id,
    coachUserId: template.coachId,
    title: template.name,
    serviceType: template.type,
    durationMinutes: template.duration,
    capacity: template.capacity,
    priceMinor: Math.round(template.defaultPrice * 100),
    currency: "GBP",
    ...(template.description ? { description: template.description } : {}),
    ...(template.defaultLocation ? { defaultLocation: template.defaultLocation } : {}),
    skillsFocus: template.skillsFocus,
    active: true,
    createdAt: template.createdAt,
  };
}
const coachTrialOfferingBodySchema = z
  .object({
    enabled: z.boolean(),
    trialPrice: z.number().finite().min(0).max(100000).multipleOf(0.01),
    normalPrice: z.number().finite().min(0).max(100000).multipleOf(0.01),
    durationMinutes: z.number().int().min(15).max(480),
    limitPerFamily: z.number().int().min(1).max(20),
    description: z.string().trim().max(2000).default(""),
  })
  .strict()
  .superRefine((body, context) => {
    if (body.enabled && body.trialPrice >= body.normalPrice) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["trialPrice"],
        message: "Trial price must be lower than normal price",
      });
    }
  });
const clubMemberParamsSchema = z.object({
  clubId: z.string().min(1),
  userId: z.string().min(1),
});
const clubMemberRemovalRestoreParamsSchema = z.object({
  clubId: z.string().min(1),
  removalId: z.string().min(1),
});
const clubSquadMemberParamsSchema = z.object({
  clubId: z.string().min(1),
  squadId: z.string().min(1),
  userId: z.string().min(1),
});
const noRequestBodySchema = z.undefined();
const clubSquadParamsSchema = z.object({
  clubId: z.string().min(1),
  squadId: z.string().min(1),
});
const squadParamsSchema = z.object({
  squadId: z.string().min(1),
});
const clubParamsSchema = z.object({
  clubId: z.string().min(1),
});
const clubManagementCreateBodySchema = z
  .object({
    name: z.string().trim().min(3).max(100),
    city: z.string().trim().min(2).max(120),
    country: z.string().trim().min(2).max(80).optional(),
    tagline: z.string().trim().max(160).optional(),
    badge: z.string().trim().max(20).optional(),
    visibility: z.enum(["private", "public"]).default("private"),
    joinPolicy: z
      .enum(["INVITE_ONLY", "REQUEST_TO_JOIN", "OPEN"])
      .default("INVITE_ONLY"),
    commercialMode: z.enum(["COACH_OWNED", "ORG_OWNED"]).default("COACH_OWNED"),
    firstStaffRole: z
      .enum(["ADMIN", "HEAD_COACH", "COACH", "ASSISTANT"])
      .nullable()
      .optional(),
  })
  .strict();
const clubManagementPatchBodySchema = z
  .object({
    name: z.string().trim().min(3).max(100).optional(),
    city: z.string().trim().min(2).max(120).optional(),
    country: z.string().trim().min(2).max(80).nullable().optional(),
    tagline: z.string().trim().max(160).nullable().optional(),
    visibility: z.enum(["private", "public"]).optional(),
    joinPolicy: z.enum(["INVITE_ONLY", "REQUEST_TO_JOIN", "OPEN"]).optional(),
    commercialMode: z.enum(["COACH_OWNED", "ORG_OWNED"]).optional(),
  })
  .strict()
  .refine((body) => Object.keys(body).length > 0, {
    message: "At least one club field is required",
  });
const clubBrandingBodySchema = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    tagline: z.string().trim().max(160).optional(),
    badgeUrl: z
      .union([z.literal(""), z.string().trim().url().max(2048)])
      .optional(),
    coverPhotoUrl: z
      .union([z.literal(""), z.string().trim().url().max(2048)])
      .optional(),
    primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  })
  .strict()
  .refine((body) => Object.keys(body).length > 0, {
    message: "At least one branding field is required",
  });
const secretMetadataKeyPattern =
  /(?:secret|token|password|api[_-]?key|private[_-]?key|credential)/i;
function containsSecretMetadataKey(value: unknown): boolean {
  if (!value || typeof value !== "object") {
    return false;
  }
  if (Array.isArray(value)) {
    return value.some(containsSecretMetadataKey);
  }
  return Object.entries(value as Record<string, unknown>).some(
    ([key, child]) =>
      secretMetadataKeyPattern.test(key) || containsSecretMetadataKey(child),
  );
}
const clubIntegrationProviderSchema = z.preprocess(
  (value) => (typeof value === "string" ? value.trim().toUpperCase() : value),
  z.string().regex(/^[A-Z0-9_]{2,60}$/),
);
const clubIntegrationMetadataSchema = z
  .record(z.unknown())
  .nullable()
  .optional()
  .superRefine((value, context) => {
    if (containsSecretMetadataKey(value)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Integration metadata must not contain secrets or credentials",
      });
    }
  });
const clubIntegrationBodySchema = z
  .object({
    provider: clubIntegrationProviderSchema,
    status: z
      .enum(["DISCONNECTED", "CONNECTED", "NEEDS_REAUTH", "DISABLED"])
      .default("DISCONNECTED"),
    displayName: z.string().trim().min(1).max(120).nullable().optional(),
    externalAccountId: z.string().trim().min(1).max(160).nullable().optional(),
    metadataJson: clubIntegrationMetadataSchema,
  })
  .strict();
const clubIntegrationPatchBodySchema = clubIntegrationBodySchema
  .partial({
    status: true,
    displayName: true,
    externalAccountId: true,
    metadataJson: true,
  })
  .required({ provider: true })
  .refine((body) => Object.keys(body).some((key) => key !== "provider"), {
    message: "At least one integration field is required",
  });
const favouriteCoachBodySchema = z
  .object({
    note: z.string().max(500).nullable().optional(),
    userId: z.string().optional(),
  })
  .passthrough();
const clubMemberRoleBodySchema = z.object({
  role: z.enum(["OWNER", "ADMIN", "HEAD_COACH", "COACH", "ASSISTANT", "MEMBER"]),
});
const clubMemberRemovalBodySchema = z.object({
  reason: z
    .enum(["LEFT_CLUB", "INACTIVE", "CONDUCT", "SEASON_END", "OTHER"])
    .default("OTHER"),
  customReason: z.string().max(500).nullable().optional(),
});
const clubMemberSelfLeaveBodySchema = z.object({
  reason: z
    .enum(["LEFT_CLUB", "INACTIVE", "CONDUCT", "SEASON_END", "OTHER"])
    .default("LEFT_CLUB"),
  customReason: z.string().max(500).nullable().optional(),
});
const clubInviteCodeCreateBodySchema = z
  .object({
    role: z.enum(["MEMBER", "COACH", "ADMIN"]),
  })
  .strict();
const clubMemberBanBodySchema = z.object({
  reason: z.string().trim().min(3).max(500),
});
const clubSquadCreateBodySchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    level: z.string().trim().min(1).max(100).optional(),
    ageGroup: z.string().trim().min(1).max(50).optional(),
    skillLevel: z.string().trim().min(1).max(50).optional(),
  })
  .strict();
const clubSquadPatchBodySchema = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    level: z.string().trim().min(1).max(100).optional(),
    ageGroup: z.string().trim().min(1).max(50).optional(),
    skillLevel: z.string().trim().min(1).max(50).optional(),
  })
  .strict()
  .refine((body) => Object.keys(body).length > 0, {
    message: "At least one squad field is required",
  });
const coachVerificationDocumentBodySchema = z
  .object({
    mediaObjectId: z.string().trim().min(1),
    fileLabel: z.string().trim().min(1).max(160).optional(),
  })
  .strict();
const coachVerificationReviewBodySchema = z
  .object({
    status: z.enum(["APPROVED", "REJECTED", "EXPIRED"]),
    expiresAt: z.string().datetime().nullable().optional(),
    notes: z.string().trim().max(1000).nullable().optional(),
    verificationId: z.string().trim().min(1).optional(),
  })
  .strict();
const asRows = (value: unknown): SeedRow[] =>
  Array.isArray(value) ? (value as SeedRow[]) : [];
const asString = (value: unknown): string | undefined =>
  typeof value === "string" ? value : undefined;
const asNumber = (value: unknown): number | undefined =>
  typeof value === "number" && Number.isFinite(value) ? value : undefined;
const asBoolean = (value: unknown): boolean | undefined =>
  typeof value === "boolean" ? value : undefined;
const asIsoString = (value: unknown, fallback = new Date().toISOString()): string =>
  typeof value === "string"
    ? value
    : value instanceof Date
      ? value.toISOString()
      : fallback;
function inviteEmailDomainsForAudit(emails: string[]): string[] {
  return Array.from(
    new Set(
      emails
        .map((email) => email.trim().toLowerCase().split("@")[1])
        .filter((domain): domain is string => Boolean(domain)),
    ),
  );
}
function summarizeInviteEmailDelivery(
  results: Array<{ provider: string; status: "sent" | "skipped" | "failed" }>,
): {
  total: number;
  sent: number;
  skipped: number;
  failed: number;
  providers: string[];
} {
  return {
    total: results.length,
    sent: results.filter((result) => result.status === "sent").length,
    skipped: results.filter((result) => result.status === "skipped").length,
    failed: results.filter((result) => result.status === "failed").length,
    providers: Array.from(new Set(results.map((result) => result.provider))),
  };
}
const newId = (prefix: string): string => `${prefix}_${crypto.randomUUID()}`;
function resolveSquadLevel(body: {
  level?: string;
  ageGroup?: string;
  skillLevel?: string;
}): string | undefined {
  const level = body.level?.trim();
  if (level) {
    return level;
  }
  const ageGroup = body.ageGroup?.trim();
  const skillLevel = body.skillLevel?.trim();
  if (ageGroup && skillLevel) {
    return `${ageGroup} · ${skillLevel}`;
  }
  return ageGroup || skillLevel || undefined;
}
export function resetCoachClubRouteStateForTests(): void {
  resetClubAuthorityRepositoryForTests();
}
function getActiveMemberships(clubMemberships: SeedRow[]): SeedRow[] {
  return clubMemberships.filter(
    (row) => row.active !== false && !asString(row.deletedAt),
  );
}
function getActiveRows(rows: SeedRow[]): SeedRow[] {
  return rows.filter((row) => row.active !== false && !asString(row.deletedAt));
}
function getViewerMembership(
  clubMemberships: SeedRow[],
  clubId: string,
  userId: string,
): SeedRow | null {
  return (
    getActiveMemberships(clubMemberships).find(
      (row) =>
        asString(row.clubId) === clubId && asString(row.userId) === userId,
    ) ?? null
  );
}
function requireAuthUserId(authUserId: string | undefined): string {
  if (!authUserId) {
    throw forbidden("Authenticated user is required");
  }
  return authUserId;
}
function requireCoachRosterActor(request: FastifyRequest, coachId: string): string {
  const authUserId = requireAuthUserId(request.auth?.userId);
  if (authUserId !== coachId && !isPrivilegedAdminAuth(request.auth)) {
    throw forbidden("Only the coach or a privileged admin can manage coach roster", {
      coachId,
    });
  }
  return authUserId;
}
function requireCoachVerificationViewer(
  request: FastifyRequest,
  coachUserId: string,
): string {
  const authUserId = requireAuthUserId(request.auth?.userId);
  if (
    authUserId !== coachUserId &&
    !hasAnyGrantedRole(request.auth, ["admin", "security_admin"])
  ) {
    throw forbidden(
      "Only the coach or a platform verification reviewer can view verification status",
      {
        coachUserId,
      },
    );
  }
  return authUserId;
}
type CoachVerificationType = "DBS" | "INSURANCE" | "CREDENTIAL" | "IDENTITY";
const supportedVerificationTypes = new Set<CoachVerificationType>([
  "DBS",
  "INSURANCE",
  "CREDENTIAL",
  "IDENTITY",
]);
const verificationDocumentMediaKinds = new Set(["DOCUMENT", "IMAGE"]);
const verificationDocumentContentTypes = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
]);
const verificationDocumentMaxBytes = 20 * 1024 * 1024;
const asOptionalIsoString = (value: unknown): string | undefined =>
  typeof value === "string" && value
    ? value
    : value instanceof Date
      ? value.toISOString()
      : undefined;
function normalizeVerificationType(type: string): CoachVerificationType {
  const normalized = type.toUpperCase();
  if (!supportedVerificationTypes.has(normalized as CoachVerificationType)) {
    throw badRequest("Unsupported verification type", {
      type,
      supportedTypes: [...supportedVerificationTypes].map((entry) =>
        entry.toLowerCase(),
      ),
    });
  }
  return normalized as CoachVerificationType;
}
function verificationRowTimestamp(row: SeedRow): number {
  const parsed = Date.parse(
    asOptionalIsoString(row.updatedAt) ??
      asOptionalIsoString(row.reviewedAt) ??
      asOptionalIsoString(row.createdAt) ??
      "",
  );
  return Number.isFinite(parsed) ? parsed : 0;
}
function isCurrentApprovedVerification(row: SeedRow): boolean {
  if (asString(row.status) !== "APPROVED") return false;
  const expiresAt = asOptionalIsoString(row.expiresAt);
  if (!expiresAt) return true;
  const expiryTime = Date.parse(expiresAt);
  return Number.isFinite(expiryTime) && expiryTime > Date.now();
}
function pickVerificationRow(
  rows: SeedRow[],
  verificationType: string,
): SeedRow | undefined {
  const candidates = rows
    .filter((row) => asString(row.verificationType) === verificationType)
    .sort((left, right) => verificationRowTimestamp(right) - verificationRowTimestamp(left));
  return candidates.find(isCurrentApprovedVerification) ?? candidates[0];
}
function mapCoachVerificationItem(
  row: SeedRow | undefined,
  fallbackVerified = false,
): SeedRow {
  if (!row) {
    return {
      status: fallbackVerified ? "VERIFIED" : "NOT_STARTED",
    };
  }
  const expiresAt = asOptionalIsoString(row.expiresAt);
  const reviewedAt = asOptionalIsoString(row.reviewedAt);
  let status: string;
  switch (asString(row.status)) {
    case "APPROVED":
      status = "VERIFIED";
      break;
    case "PENDING":
      status = "PENDING";
      break;
    case "REJECTED":
      status = "FAILED";
      break;
    case "EXPIRED":
      status = "EXPIRED";
      break;
    default:
      status = fallbackVerified ? "VERIFIED" : "NOT_STARTED";
  }
  if (status === "VERIFIED" && expiresAt) {
    const expiryTime = Date.parse(expiresAt);
    if (!Number.isFinite(expiryTime) || expiryTime <= Date.now()) {
      status = "EXPIRED";
    }
  }
  return {
    status,
    ...(reviewedAt && status === "VERIFIED"
      ? {
          verifiedAt: reviewedAt,
        }
      : {}),
    ...(expiresAt
      ? {
          expiresAt,
        }
      : {}),
  };
}
function calculateCoachVerificationLevel(status: SeedRow): string {
  const emailVerified =
    (status.email as SeedRow | undefined)?.status === "VERIFIED";
  const phoneVerified =
    (status.phone as SeedRow | undefined)?.status === "VERIFIED";
  const identityVerified =
    (status.identity as SeedRow | undefined)?.status === "VERIFIED";
  const backgroundVerified =
    (status.backgroundCheck as SeedRow | undefined)?.status === "VERIFIED";
  const insuranceVerified =
    (status.insurance as SeedRow | undefined)?.status === "VERIFIED";
  const hasVerifiedCredentials = asRows(status.credentials).some(
    (credential) => credential.status === "VERIFIED",
  );
  if (
    emailVerified &&
    phoneVerified &&
    identityVerified &&
    backgroundVerified &&
    insuranceVerified &&
    hasVerifiedCredentials
  ) {
    return "PREMIUM";
  }
  if (emailVerified && phoneVerified && identityVerified && backgroundVerified) {
    return "VERIFIED";
  }
  if (emailVerified && phoneVerified) {
    return "BASIC";
  }
  return "NONE";
}
function latestTimestamp(values: unknown[]): string {
  const latest = values
    .flatMap((value) => {
      const parsed = Date.parse(asOptionalIsoString(value) ?? "");
      return Number.isFinite(parsed) ? [parsed] : [];
    })
    .sort((left, right) => right - left)[0];
  return new Date(latest ?? Date.now()).toISOString();
}
async function loadCoachVerificationSources(coachUserId: string): Promise<{
  user: SeedRow | null;
  profile: SeedRow;
  verifications: SeedRow[];
  dataVersion: string | null;
}> {
  if (getApiDataBackend() === "db" && !shouldUseDbFixtureFallback()) {
    const prisma = getPrismaClientOrThrow();
    const [user, profile, verifications] = await Promise.all([
      prisma.user.findFirst({
        where: {
          id: coachUserId,
          deletedAt: null,
        },
      }),
      prisma.coachProfile.findFirst({
        where: {
          userId: coachUserId,
          deletedAt: null,
        },
      }),
      prisma.coachVerification.findMany({
        where: {
          coachUserId,
        },
        orderBy: [
          {
            updatedAt: "desc",
          },
          {
            createdAt: "desc",
          },
        ],
      }),
    ]);
    if (!profile) {
      throw notFound("Coach profile not found", {
        coachUserId,
      });
    }
    return {
      user: user ? (normalizeForJson(user) as SeedRow) : null,
      profile: normalizeForJson(profile) as SeedRow,
      verifications: normalizeForJson(verifications) as SeedRow[],
      dataVersion: null,
    };
  }
  const store =
    getApiDataBackend() === "db" ? getDbFixtureStore() : getMarketplaceSeedStore();
  const profile = asRows(store.tables.coachProfiles).find(
    (row) => asString(row.userId) === coachUserId && !asString(row.deletedAt),
  );
  if (!profile) {
    throw notFound("Coach profile not found", {
      coachUserId,
    });
  }
  return {
    user:
      asRows(store.tables.users).find(
        (row) => asString(row.id) === coachUserId && !asString(row.deletedAt),
      ) ?? null,
    profile,
    verifications: asRows(store.tables.coachVerifications).filter(
      (row) => asString(row.coachUserId) === coachUserId,
    ),
    dataVersion: store.version,
  };
}
function buildCoachVerificationStatus(input: {
  coachUserId: string;
  user: SeedRow | null;
  profile: SeedRow;
  verifications: SeedRow[];
}): SeedRow {
  const dbs = pickVerificationRow(input.verifications, "DBS");
  const identity = pickVerificationRow(input.verifications, "IDENTITY");
  const insurance = pickVerificationRow(input.verifications, "INSURANCE");
  const credentials = input.verifications
    .filter((row) => asString(row.verificationType) === "CREDENTIAL")
    .map((row) => mapCoachVerificationItem(row));
  const status: SeedRow = {
    coachId: input.coachUserId,
    email:
      input.user?.isVerified === true && asString(input.user.email)
        ? {
            status: "VERIFIED",
            verifiedAt: asOptionalIsoString(input.user.updatedAt),
          }
        : {
            status: "NOT_STARTED",
          },
    phone: {
      status: "NOT_STARTED",
    },
    identity: mapCoachVerificationItem(identity),
    backgroundCheck: mapCoachVerificationItem(
      dbs,
      input.profile.dbsChecked === true,
    ),
    credentials,
    insurance: mapCoachVerificationItem(insurance),
    lastUpdated: latestTimestamp([
      input.user?.updatedAt,
      input.profile.updatedAt,
      ...input.verifications.flatMap((row) => [
        row.updatedAt,
        row.reviewedAt,
        row.createdAt,
      ]),
    ]),
  };
  status.overallLevel = calculateCoachVerificationLevel(status);
  return status;
}
function assertVerificationDocumentMediaObject(
  mediaObject: SeedRow | null | undefined,
  authUserId: string,
  mediaObjectId: string,
): SeedRow {
  if (!mediaObject || asString(mediaObject.deletedAt)) {
    throw notFound("Media object not found", {
      mediaObjectId,
    });
  }
  if (asString(mediaObject.ownerUserId) !== authUserId) {
    throw forbidden("Media object does not belong to authenticated user", {
      mediaObjectId,
    });
  }
  if (asString(mediaObject.status) !== "AVAILABLE") {
    throw badRequest("Verification document media is not available", {
      mediaObjectId,
      status: asString(mediaObject.status) ?? null,
    });
  }
  if (asString(mediaObject.visibilityScope) !== "private") {
    throw badRequest("Verification document media must be private", {
      mediaObjectId,
      visibilityScope: asString(mediaObject.visibilityScope) ?? null,
    });
  }
  const kind = asString(mediaObject.kind);
  if (!kind || !verificationDocumentMediaKinds.has(kind)) {
    throw badRequest("Verification document media must be an image or document", {
      mediaObjectId,
      kind: kind ?? null,
    });
  }
  const contentType = asString(mediaObject.contentType)?.trim().toLowerCase();
  if (!contentType || !verificationDocumentContentTypes.has(contentType)) {
    throw badRequest(
      "Verification documents must be PDF, JPEG, PNG, WebP, or HEIC",
      {
        mediaObjectId,
        contentType: contentType ?? null,
      },
    );
  }
  if (
    (kind === "IMAGE" && !contentType.startsWith("image/")) ||
    (kind === "DOCUMENT" && contentType !== "application/pdf")
  ) {
    throw badRequest("Verification document kind does not match its content type", {
      mediaObjectId,
      kind,
      contentType,
    });
  }
  const sizeBytes = asNumber(mediaObject.sizeBytes);
  if (!sizeBytes || sizeBytes > verificationDocumentMaxBytes) {
    throw badRequest("Verification documents must be non-empty and 20 MB or smaller", {
      mediaObjectId,
      sizeBytes: sizeBytes ?? null,
      maxBytes: verificationDocumentMaxBytes,
    });
  }
  return mediaObject;
}
function scanVerdict(value: SeedRow | undefined): string | undefined {
  if (!value) {
    return undefined;
  }
  return String(value.verdict ?? value.status ?? "").toUpperCase();
}
function latestScanForMedia(tables: SeedTables, mediaObjectId: string): SeedRow | undefined {
  return asRows(tables.malwareScanResults).reduce<SeedRow | undefined>((latest, row) => {
    if (asString(row.mediaObjectId) !== mediaObjectId) {
      return latest;
    }
    if (!latest) {
      return row;
    }
    const rowTime = Date.parse(asString(row.scannedAt) ?? asString(row.createdAt) ?? "");
    const latestTime = Date.parse(asString(latest.scannedAt) ?? asString(latest.createdAt) ?? "");
    return (Number.isFinite(rowTime) ? rowTime : 0) > (Number.isFinite(latestTime) ? latestTime : 0)
      ? row
      : latest;
  }, undefined);
}
function assertVerificationDocumentScanClean(
  latestScan: SeedRow | undefined,
  mediaObjectId: string,
): void {
  const verdict = scanVerdict(latestScan);
  if (verdict !== "CLEAN") {
    throw badRequest("Verification document media must pass malware scanning", {
      mediaObjectId,
      scanVerdict: verdict ?? null,
    });
  }
}
async function listCoachVerificationDocumentBundles(
  authUserId: string,
  requestedType: string,
): Promise<{
  type: string;
  items: SeedRow[];
  total: number;
  dataVersion: string | null;
}> {
  const verificationType = normalizeVerificationType(requestedType);
  if (getApiDataBackend() === "db" && !shouldUseDbFixtureFallback()) {
    const prisma = getPrismaClientOrThrow();
    const verifications = normalizeForJson(
      await prisma.coachVerification.findMany({
        where: {
          coachUserId: authUserId,
          verificationType,
        },
        include: {
          documents: {
            include: {
              mediaObject: true,
            },
            orderBy: {
              createdAt: "asc",
            },
          },
        },
        orderBy: [
          {
            updatedAt: "desc",
          },
          {
            createdAt: "desc",
          },
        ],
      }),
    ) as SeedRow[];
    const items = verifications.map((row) => {
      const documents = asRows(row.documents).map((document) => ({
        ...document,
        mediaObject:
          typeof document.mediaObject === "object" &&
          document.mediaObject !== null
            ? document.mediaObject
            : null,
      }));
      const { documents: _documents, ...verification } = row;
      void _documents;
      return {
        verification,
        documents,
      };
    });
    return {
      type: verificationType.toLowerCase(),
      items,
      total: items.length,
      dataVersion: null,
    };
  }
  const store =
    getApiDataBackend() === "db" ? getDbFixtureStore() : getMarketplaceSeedStore();
  const coachVerifications = asRows(store.tables.coachVerifications).filter(
    (row) =>
      asString(row.coachUserId) === authUserId &&
      asString(row.verificationType) === verificationType,
  );
  const verificationDocuments = asRows(store.tables.verificationDocuments);
  const mediaObjects = asRows(store.tables.mediaObjects);
  const items = coachVerifications.map((verification) => {
    const verificationId = asString(verification.id);
    const linkedDocuments = verificationDocuments.flatMap((row) => {
      if (!(asString(row.coachVerificationId) === verificationId)) return [];
      const mediaObjectId = asString(row.mediaObjectId);
      const media =
        mediaObjects.find((item) => asString(item.id) === mediaObjectId) ??
        null;
      return [
        {
          ...row,
          mediaObject: media,
        },
      ];
    });
    return {
      verification,
      documents: linkedDocuments,
    };
  });
  return {
    type: verificationType.toLowerCase(),
    items,
    total: items.length,
    dataVersion: store.version,
  };
}
async function submitCoachVerificationDocument(params: {
  authUserId: string;
  requestedType: string;
  mediaObjectId: string;
  fileLabel?: string;
}): Promise<{
  type: string;
  verification: SeedRow;
  document: SeedRow;
  documents: SeedRow[];
  dataVersion: string | null;
}> {
  const verificationType = normalizeVerificationType(params.requestedType);
  if (getApiDataBackend() === "db" && !shouldUseDbFixtureFallback()) {
    const prisma = getPrismaClientOrThrow();
    const result = await prisma.$transaction(async (tx) => {
      const profile = await tx.coachProfile.findFirst({
        where: {
          userId: params.authUserId,
          deletedAt: null,
        },
        select: {
          userId: true,
        },
      });
      if (!profile) {
        throw notFound("Coach profile not found", {
          coachUserId: params.authUserId,
        });
      }
      const mediaObject = await tx.mediaObject.findFirst({
        where: {
          id: params.mediaObjectId,
          deletedAt: null,
        },
        include: {
          scans: {
            orderBy: {
              createdAt: "desc",
            },
            take: 1,
          },
        },
      });
      const mediaObjectRow = assertVerificationDocumentMediaObject(
        normalizeForJson(mediaObject) as SeedRow | null,
        params.authUserId,
        params.mediaObjectId,
      );
      assertVerificationDocumentScanClean(asRows(mediaObjectRow.scans)[0], params.mediaObjectId);
      const existingPending = await tx.coachVerification.findFirst({
        where: {
          coachUserId: params.authUserId,
          verificationType,
          status: "PENDING",
        },
        orderBy: [
          {
            updatedAt: "desc",
          },
          {
            createdAt: "desc",
          },
        ],
      });
      const verification = existingPending
        ? await tx.coachVerification.update({
            where: {
              id: existingPending.id,
            },
            data: {
              updatedByUserId: params.authUserId,
              version: {
                increment: 1,
              },
            },
          })
        : await tx.coachVerification.create({
            data: {
              id: newId("cvf"),
              coachUserId: params.authUserId,
              verificationType,
              status: "PENDING",
              createdByUserId: params.authUserId,
              updatedByUserId: params.authUserId,
            },
          });
      const existingDocument = await tx.verificationDocument.findFirst({
        where: {
          coachVerificationId: verification.id,
          mediaObjectId: params.mediaObjectId,
        },
        include: {
          mediaObject: true,
        },
      });
      const document =
        existingDocument ??
        (await tx.verificationDocument.create({
          data: {
            id: newId("vdoc"),
            coachVerificationId: verification.id,
            mediaObjectId: params.mediaObjectId,
            fileLabel: params.fileLabel ?? null,
          },
          include: {
            mediaObject: true,
          },
        }));
      const documents = await tx.verificationDocument.findMany({
        where: {
          coachVerificationId: verification.id,
        },
        include: {
          mediaObject: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      });
      return {
        verification,
        document,
        documents,
      };
    });
    return {
      type: verificationType.toLowerCase(),
      verification: normalizeForJson(result.verification) as SeedRow,
      document: normalizeForJson(result.document) as SeedRow,
      documents: normalizeForJson(result.documents) as SeedRow[],
      dataVersion: null,
    };
  }

  const store =
    getApiDataBackend() === "db" ? getDbFixtureStore() : getMarketplaceSeedStore();
  const profile = asRows(store.tables.coachProfiles).find(
    (row) => asString(row.userId) === params.authUserId && !asString(row.deletedAt),
  );
  if (!profile) {
    throw notFound("Coach profile not found", {
      coachUserId: params.authUserId,
    });
  }
  const mediaObjects = asRows(store.tables.mediaObjects);
  const mediaObject = assertVerificationDocumentMediaObject(
    mediaObjects.find((row) => asString(row.id) === params.mediaObjectId),
    params.authUserId,
    params.mediaObjectId,
  );
  assertVerificationDocumentScanClean(
    latestScanForMedia(store.tables, params.mediaObjectId),
    params.mediaObjectId,
  );
  const now = new Date().toISOString();
  const coachVerifications = Array.isArray(store.tables.coachVerifications)
    ? store.tables.coachVerifications
    : (store.tables.coachVerifications = []);
  let verification = coachVerifications.find(
    (row) =>
      asString(row.coachUserId) === params.authUserId &&
      asString(row.verificationType) === verificationType &&
      asString(row.status) === "PENDING",
  );
  if (verification) {
    verification.updatedAt = now;
    verification.updatedByUserId = params.authUserId;
    verification.version = Number(verification.version ?? 1) + 1;
  } else {
    verification = {
      id: newId("cvf"),
      coachUserId: params.authUserId,
      verificationType,
      status: "PENDING",
      reviewedByUserId: null,
      reviewedAt: null,
      expiresAt: null,
      notes: null,
      createdByUserId: params.authUserId,
      updatedByUserId: params.authUserId,
      version: 1,
      createdAt: now,
      updatedAt: now,
    };
    coachVerifications.push(verification);
  }
  const verificationId = asString(verification.id) as string;
  const verificationDocuments = Array.isArray(store.tables.verificationDocuments)
    ? store.tables.verificationDocuments
    : (store.tables.verificationDocuments = []);
  let document = verificationDocuments.find(
    (row) =>
      asString(row.coachVerificationId) === verificationId &&
      asString(row.mediaObjectId) === params.mediaObjectId,
  );
  if (!document) {
    document = {
      id: newId("vdoc"),
      coachVerificationId: verificationId,
      mediaObjectId: params.mediaObjectId,
      fileLabel: params.fileLabel ?? null,
      createdAt: now,
    };
    verificationDocuments.push(document);
  }
  const documents = verificationDocuments
    .filter((row) => asString(row.coachVerificationId) === verificationId)
    .map((row) => ({
      ...row,
      mediaObject:
        mediaObjects.find((item) => asString(item.id) === asString(row.mediaObjectId)) ??
        null,
    }));
  return {
    type: verificationType.toLowerCase(),
    verification,
    document: {
      ...document,
      mediaObject,
    },
    documents,
    dataVersion: store.version,
  };
}
type CoachVerificationReviewStatus = "APPROVED" | "REJECTED" | "EXPIRED";
function requireVerificationReviewer(request: FastifyRequest): string {
  const authUserId = requireAuthUserId(request.auth?.userId);
  if (!hasAnyGrantedRole(request.auth, ["admin", "security_admin"])) {
    throw forbidden("Only platform verification reviewers can review coach verification evidence");
  }
  return authUserId;
}
function defaultVerificationExpiryIso(): string {
  const expiry = new Date();
  expiry.setUTCFullYear(expiry.getUTCFullYear() + 3);
  return expiry.toISOString();
}
function reviewExpiresAt(status: CoachVerificationReviewStatus, expiresAt?: string | null): Date | null {
  if (status !== "APPROVED") {
    return expiresAt ? new Date(expiresAt) : null;
  }
  const resolved = new Date(expiresAt ?? defaultVerificationExpiryIso());
  if (!Number.isFinite(resolved.getTime()) || resolved.getTime() <= Date.now()) {
    throw badRequest("Approved verification expiry must be in the future");
  }
  return resolved;
}
async function reviewCoachVerification(params: {
  reviewerUserId: string;
  coachUserId: string;
  requestedType: string;
  status: CoachVerificationReviewStatus;
  expiresAt?: string | null;
  notes?: string | null;
  verificationId?: string;
}): Promise<{
  type: string;
  verification: SeedRow;
  status: SeedRow;
  dataVersion: string | null;
}> {
  const verificationType = normalizeVerificationType(params.requestedType);
  const expiresAt = reviewExpiresAt(params.status, params.expiresAt);
  const now = new Date();
  if (getApiDataBackend() === "db" && !shouldUseDbFixtureFallback()) {
    const prisma = getPrismaClientOrThrow();
    const updated = await prisma.$transaction(async (tx) => {
      const profile = await tx.coachProfile.findFirst({
        where: {
          userId: params.coachUserId,
          deletedAt: null,
        },
        select: {
          userId: true,
        },
      });
      if (!profile) {
        throw notFound("Coach profile not found", {
          coachUserId: params.coachUserId,
        });
      }
      const target = params.verificationId
        ? await tx.coachVerification.findFirst({
            where: {
              id: params.verificationId,
              coachUserId: params.coachUserId,
              verificationType,
            },
          })
        : (await tx.coachVerification.findFirst({
            where: {
              coachUserId: params.coachUserId,
              verificationType,
              status: "PENDING",
            },
            orderBy: [
              {
                updatedAt: "desc",
              },
              {
                createdAt: "desc",
              },
            ],
          })) ??
          (await tx.coachVerification.findFirst({
            where: {
              coachUserId: params.coachUserId,
              verificationType,
            },
            orderBy: [
              {
                updatedAt: "desc",
              },
              {
                createdAt: "desc",
              },
            ],
          }));
      if (!target) {
        throw notFound("Coach verification not found", {
          coachUserId: params.coachUserId,
          verificationType,
        });
      }
      const verification = await tx.coachVerification.update({
        where: {
          id: target.id,
        },
        data: {
          status: params.status,
          reviewedByUserId: params.reviewerUserId,
          reviewedAt: now,
          expiresAt,
          notes: params.notes ?? null,
          updatedByUserId: params.reviewerUserId,
          version: {
            increment: 1,
          },
        },
      });
      if (verificationType === "DBS") {
        await tx.coachProfile.update({
          where: {
            userId: params.coachUserId,
          },
          data: {
            dbsChecked: params.status === "APPROVED",
          },
        });
      }
      return verification;
    });
    const sources = await loadCoachVerificationSources(params.coachUserId);
    return {
      type: verificationType.toLowerCase(),
      verification: normalizeForJson(updated) as SeedRow,
      status: buildCoachVerificationStatus({
        coachUserId: params.coachUserId,
        user: sources.user,
        profile: sources.profile,
        verifications: sources.verifications,
      }),
      dataVersion: null,
    };
  }

  const store =
    getApiDataBackend() === "db" ? getDbFixtureStore() : getMarketplaceSeedStore();
  const profile = asRows(store.tables.coachProfiles).find(
    (row) => asString(row.userId) === params.coachUserId && !asString(row.deletedAt),
  );
  if (!profile) {
    throw notFound("Coach profile not found", {
      coachUserId: params.coachUserId,
    });
  }
  const coachVerifications = Array.isArray(store.tables.coachVerifications)
    ? store.tables.coachVerifications
    : (store.tables.coachVerifications = []);
  const target = params.verificationId
    ? coachVerifications.find(
        (row) =>
          asString(row.id) === params.verificationId &&
          asString(row.coachUserId) === params.coachUserId &&
          asString(row.verificationType) === verificationType,
      )
    : coachVerifications
        .filter(
          (row) =>
            asString(row.coachUserId) === params.coachUserId &&
            asString(row.verificationType) === verificationType,
        )
        .sort((left, right) => {
          const leftPending = asString(left.status) === "PENDING" ? 1 : 0;
          const rightPending = asString(right.status) === "PENDING" ? 1 : 0;
          return rightPending - leftPending || verificationRowTimestamp(right) - verificationRowTimestamp(left);
        })[0];
  if (!target) {
    throw notFound("Coach verification not found", {
      coachUserId: params.coachUserId,
      verificationType,
    });
  }
  target.status = params.status;
  target.reviewedByUserId = params.reviewerUserId;
  target.reviewedAt = now.toISOString();
  target.expiresAt = expiresAt?.toISOString() ?? null;
  target.notes = params.notes ?? null;
  target.updatedByUserId = params.reviewerUserId;
  target.updatedAt = now.toISOString();
  target.version = Number(target.version ?? 1) + 1;
  if (verificationType === "DBS") {
    profile.dbsChecked = params.status === "APPROVED";
    profile.updatedAt = now.toISOString();
  }
  const sources = await loadCoachVerificationSources(params.coachUserId);
  return {
    type: verificationType.toLowerCase(),
    verification: target,
    status: buildCoachVerificationStatus({
      coachUserId: params.coachUserId,
      user: sources.user,
      profile: sources.profile,
      verifications: sources.verifications,
    }),
    dataVersion: store.version,
  };
}
function mutationAuditResult(error: unknown): "DENY" | "ERROR" {
  return isZodValidationError(error) ||
    (error instanceof ApiProblemError && error.status < 500)
    ? "DENY"
    : "ERROR";
}
function mutationAuditErrorCode(error: unknown): string {
  if (isZodValidationError(error)) {
    return "VALIDATION_FAILED";
  }
  return error instanceof ApiProblemError ? error.code : "INTERNAL_ERROR";
}
async function recordCoachFavouriteAudit(params: {
  request: FastifyRequest;
  action: string;
  coachId: string;
  result: "SUCCESS" | "DENY" | "ERROR";
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await recordAuditEvent({
    request: params.request,
    action: params.action,
    resourceType: "coach_favourite",
    resourceId: params.coachId,
    subjectUserId: params.request.auth?.userId ?? null,
    result: params.result,
    metadata: params.metadata,
  });
}
async function recordCoachSessionTemplateAudit(params: {
  request: FastifyRequest;
  action:
    | "coach_session_template.create"
    | "coach_session_template.update"
    | "coach_session_template.archive";
  templateId?: string;
  result: "SUCCESS" | "DENY" | "ERROR";
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await recordAuditEvent({
    request: params.request,
    action: params.action,
    resourceType: "coach_session_template",
    resourceId: params.templateId ?? null,
    subjectUserId: params.request.auth?.userId ?? null,
    result: params.result,
    metadata: params.metadata,
  });
}
async function recordCoachOfferingAudit(params: {
  request: FastifyRequest;
  action: "coach_offering.create" | "coach_offering.update";
  offeringId?: string;
  result: "SUCCESS" | "DENY" | "ERROR";
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await recordAuditEvent({
    request: params.request,
    action: params.action,
    resourceType: "coaching_offering",
    resourceId: params.offeringId ?? null,
    subjectUserId: params.request.auth?.userId ?? null,
    result: params.result,
    metadata: params.metadata,
  });
}
function assertCanManageCoachAvailability(
  request: FastifyRequest,
  authUserId: string,
  coachId: string,
): void {
  if (authUserId === coachId || isPrivilegedAdminAuth(request.auth)) {
    return;
  }
  throw forbidden("Only the coach or a privileged admin can manage coach availability", {
    coachId,
  });
}
async function recordDelegatedAvailabilityAudit(params: {
  request: FastifyRequest;
  action:
    | "coach_availability_template.delegated_read"
    | "coach_availability_template.delegated_create"
    | "coach_availability_template.delegated_update"
    | "coach_availability_template.delegated_remove"
    | "coach_availability_override.delegated_read"
    | "coach_availability_override.delegated_create"
    | "coach_availability_override.delegated_update"
    | "coach_availability_override.delegated_remove";
  resourceType: "coach_availability_template" | "coach_availability_override";
  resourceId?: string | null;
  coachId: string;
  result: "SUCCESS" | "DENY" | "ERROR";
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await recordAuditEvent({
    request: params.request,
    action: params.action,
    resourceType: params.resourceType,
    resourceId: params.resourceId ?? null,
    subjectUserId: params.coachId,
    result: params.result,
    metadata: params.metadata,
  });
}
async function recordSelfAvailabilityAudit(params: {
  request: FastifyRequest;
  action:
    | "coach_availability_template.read"
    | "coach_availability_template.create"
    | "coach_availability_template.update"
    | "coach_availability_template.remove"
    | "coach_availability_override.read"
    | "coach_availability_override.create"
    | "coach_availability_override.update"
    | "coach_availability_override.remove";
  resourceType: "coach_availability_template" | "coach_availability_override";
  resourceId?: string | null;
  coachId: string;
  result: "SUCCESS" | "DENY" | "ERROR";
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await recordAuditEvent({
    request: params.request,
    action: params.action,
    resourceType: params.resourceType,
    resourceId: params.resourceId ?? null,
    subjectUserId: params.coachId,
    result: params.result,
    sensitiveRead: params.action.endsWith(".read"),
    metadata: params.metadata,
  });
}
async function recordCoachTrialOfferingAudit(params: {
  request: FastifyRequest;
  action:
    | "coach_trial_offering.read"
    | "coach_trial_offering.discover"
    | "coach_trial_offering.save"
    | "coach_trial_offering.archive";
  coachId?: string | null;
  result: "SUCCESS" | "DENY" | "ERROR";
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await recordAuditEvent({
    request: params.request,
    action: params.action,
    resourceType: "coach_trial_offering",
    resourceId: params.coachId ?? null,
    subjectUserId: params.coachId ?? params.request.auth?.userId ?? null,
    result: params.result,
    metadata: params.metadata,
  });
}
async function recordCoachTrialUsageAudit(params: {
  request: FastifyRequest;
  action:
    | "coach_trial_usage.read"
    | "coach_trial_usage.record"
    | "coach_trial_conversion.read"
    | "coach_trial_conversion.record";
  resourceType: "coach_trial_usage" | "coach_trial_conversion";
  resourceId?: string | null;
  coachId: string;
  result: "SUCCESS" | "DENY" | "ERROR";
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await recordAuditEvent({
    request: params.request,
    action: params.action,
    resourceType: params.resourceType,
    resourceId: params.resourceId ?? null,
    subjectUserId: params.coachId,
    result: params.result,
    metadata: params.metadata,
  });
}
async function recordCoachProfileAudit(params: {
  request: FastifyRequest;
  action: "coach_profile.read" | "coach_profile.update";
  result: "SUCCESS" | "DENY" | "ERROR";
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await recordAuditEvent({
    request: params.request,
    action: params.action,
    resourceType: "coach_profile",
    resourceId: params.request.auth?.userId ?? null,
    subjectUserId: params.request.auth?.userId ?? null,
    result: params.result,
    sensitiveRead: params.action === "coach_profile.read",
    metadata: params.metadata,
  });
}
async function recordCoachTravelSettingsAudit(params: {
  request: FastifyRequest;
  action: "coach_travel_settings.read" | "coach_travel_settings.update";
  result: "SUCCESS" | "DENY" | "ERROR";
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await recordAuditEvent({
    request: params.request,
    action: params.action,
    resourceType: "coach_travel_settings",
    resourceId: params.request.auth?.userId ?? null,
    subjectUserId: params.request.auth?.userId ?? null,
    result: params.result,
    metadata: params.metadata,
  });
}
async function recordCoachVenueAudit(params: {
  request: FastifyRequest;
  action:
    | "coach_venue.read"
    | "coach_venue.create"
    | "coach_venue.update"
    | "coach_venue.archive";
  venueId?: string | null;
  result: "SUCCESS" | "DENY" | "ERROR";
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await recordAuditEvent({
    request: params.request,
    action: params.action,
    resourceType: "coach_venue",
    resourceId: params.venueId ?? null,
    subjectUserId: params.request.auth?.userId ?? null,
    result: params.result,
    metadata: params.metadata,
  });
}
async function recordCoachEarningsAudit(params: {
  request: FastifyRequest;
  result: "SUCCESS" | "DENY" | "ERROR";
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await recordAuditEvent({
    request: params.request,
    action: "coach_earnings.read",
    resourceType: "coach_earnings",
    resourceId: params.request.auth?.userId ?? null,
    subjectUserId: params.request.auth?.userId ?? null,
    result: params.result,
    sensitiveRead: true,
    metadata: params.metadata,
  });
}
async function recordCoachAnalyticsAudit(params: {
  request: FastifyRequest;
  coachId: string;
  result: "SUCCESS" | "DENY" | "ERROR";
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await recordAuditEvent({
    request: params.request,
    action: "coach_analytics.read",
    resourceType: "coach_analytics",
    resourceId: params.coachId,
    subjectUserId: params.coachId,
    result: params.result,
    sensitiveRead: true,
    metadata: params.metadata,
  });
}
async function recordCoachRosterAudit(params: {
  request: FastifyRequest;
  action?:
    | "coach_roster.read"
    | "coach_roster.create"
    | "coach_roster.update"
    | "coach_roster.remove"
    | "coach_roster.restore";
  coachId: string;
  athleteId?: string | null;
  result: "SUCCESS" | "DENY" | "ERROR";
  sensitiveRead?: boolean;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const action = params.action ?? "coach_roster.read";
  await recordAuditEvent({
    request: params.request,
    action,
    resourceType: "coach_roster",
    resourceId: params.athleteId ? `${params.coachId}:${params.athleteId}` : params.coachId,
    subjectUserId: params.coachId,
    result: params.result,
    sensitiveRead: params.sensitiveRead ?? action === "coach_roster.read",
    metadata: {
      coachId: params.coachId,
      athleteId: params.athleteId ?? null,
      ...params.metadata,
    },
  });
}
async function recordCoachRosterNoteAudit(params: {
  request: FastifyRequest;
  action: "coach_roster_note.create" | "coach_roster_note.update" | "coach_roster_note.remove";
  coachId: string;
  athleteId: string;
  noteId?: string | null;
  result: "SUCCESS" | "DENY" | "ERROR";
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await recordAuditEvent({
    request: params.request,
    action: params.action,
    resourceType: "coach_roster_note",
    resourceId: params.noteId ?? `${params.coachId}:${params.athleteId}`,
    subjectUserId: params.coachId,
    result: params.result,
    metadata: {
      coachId: params.coachId,
      athleteId: params.athleteId,
      noteId: params.noteId ?? null,
      ...params.metadata,
    },
  });
}
async function recordCoachRosterConsentsAudit(params: {
  request: FastifyRequest;
  coachId: string;
  result: "SUCCESS" | "DENY" | "ERROR";
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await recordAuditEvent({
    request: params.request,
    action: "coach_roster_consents.read",
    resourceType: "coach_roster_consents",
    resourceId: params.coachId,
    subjectUserId: params.coachId,
    result: params.result,
    sensitiveRead: true,
    metadata: params.metadata,
  });
}
async function recordCoachPayoutAudit(params: {
  request: FastifyRequest;
  action:
    | "coach_payout_methods.read"
    | "coach_payout_methods.create"
    | "coach_payout_methods.remove"
    | "coach_payout_methods.set_default"
    | "coach_withdrawals.read"
    | "coach_withdrawals.create"
    | "coach_withdrawals.cancel"
    | "coach_withdrawals.complete";
  resourceId?: string | null;
  result: "SUCCESS" | "DENY" | "ERROR";
  sensitiveRead?: boolean;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await recordAuditEvent({
    request: params.request,
    action: params.action,
    resourceType: "coach_payout",
    resourceId: params.resourceId ?? params.request.auth?.userId ?? null,
    subjectUserId: params.request.auth?.userId ?? null,
    result: params.result,
    sensitiveRead: params.sensitiveRead === true,
    metadata: params.metadata,
  });
}
async function recordCoachPaymentInstructionsAudit(params: {
  request: FastifyRequest;
  action: "coach_payment_instructions.read" | "coach_payment_instructions.update";
  result: "SUCCESS" | "DENY" | "ERROR";
  sensitiveRead?: boolean;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await recordAuditEvent({
    request: params.request,
    action: params.action,
    resourceType: "coach_payment_instructions",
    resourceId: params.request.auth?.userId ?? null,
    subjectUserId: params.request.auth?.userId ?? null,
    result: params.result,
    sensitiveRead: params.sensitiveRead === true,
    metadata: params.metadata,
  });
}
async function recordClubMemberAudit(params: {
  request: FastifyRequest;
  action: string;
  clubId: string;
  targetUserId: string;
  result: "SUCCESS" | "DENY" | "ERROR";
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await recordAuditEvent({
    request: params.request,
    action: params.action,
    resourceType: "club_member",
    resourceId: `${params.clubId}:${params.targetUserId}`,
    subjectUserId: params.targetUserId,
    result: params.result,
    metadata: {
      clubId: params.clubId,
      targetUserId: params.targetUserId,
      ...params.metadata,
    },
  });
}

async function requireActiveCoachProfile(coachUserId: string): Promise<void> {
  if (getApiDataBackend() === "db" && !shouldUseDbFixtureFallback()) {
    const prisma = getPrismaClientOrThrow();
    const coach = await prisma.coachProfile.findFirst({
      where: {
        userId: coachUserId,
        deletedAt: null,
      },
      select: {
        userId: true,
      },
    });
    if (!coach) {
      throw notFound("Coach profile not found");
    }
    return;
  }

  const tables =
    getApiDataBackend() === "db"
      ? getDbFixtureStore().tables
      : getMarketplaceSeedStore().tables;
  const coach = asRows(tables.coachProfiles).find(
    (row) => asString(row.userId) === coachUserId && !asString(row.deletedAt),
  );
  if (!coach) {
    throw notFound("Coach profile not found");
  }
}

async function requireCoachFinanceActor(authUserId: string): Promise<void> {
  await requireActiveCoachProfile(authUserId);
}

type PayoutMethodType = "BANK_ACCOUNT" | "PAYPAL" | "STRIPE";
type WithdrawalStatus =
  | "PENDING"
  | "PROCESSING"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED";
type PayoutMethodBody = z.infer<typeof payoutMethodBodySchema>;
type WithdrawalBody = z.infer<typeof withdrawalBodySchema>;

interface PayoutMethodPayload {
  id: string;
  coachId: string;
  type: PayoutMethodType;
  isDefault: boolean;
  isVerified: boolean;
  bankName?: string;
  accountLastFour?: string;
  paypalEmail?: string;
  stripeAccountId?: string;
  nickname?: string;
  createdAt: string;
  verifiedAt?: string;
}

interface WithdrawalPayload {
  id: string;
  coachId: string;
  amount: number;
  currency: string;
  fee: number;
  netAmount: number;
  payoutMethodId: string;
  payoutMethod: PayoutMethodType;
  status: WithdrawalStatus;
  requestedAt: string;
  processedAt?: string;
  completedAt?: string;
  failureReason?: string;
  reference?: string;
}

const SIMULATED_PAYOUT_PROVIDER = "simulated";
const pendingWithdrawalStatuses = new Set<WithdrawalStatus>([
  "PENDING",
  "PROCESSING",
]);

function payoutTables(): SeedTables {
  if (getApiDataBackend() === "db") {
    getPrismaClientOrThrow();
  }
  return getMarketplaceSeedStore().tables;
}

function assertCoachMoneyDbAuthorityAvailable(): void {
  if (getApiDataBackend() === "db") {
    getPrismaClientOrThrow();
  }
}

function payoutMethodRows(tables: SeedTables): SeedRow[] {
  if (!Array.isArray(tables.coachPayoutMethods)) {
    tables.coachPayoutMethods = [];
  }
  return tables.coachPayoutMethods;
}

function withdrawalRows(tables: SeedTables): SeedRow[] {
  if (!Array.isArray(tables.coachWithdrawals)) {
    tables.coachWithdrawals = [];
  }
  return tables.coachWithdrawals;
}

function toPayoutMethodType(value: unknown): PayoutMethodType {
  if (value === "PAYPAL" || value === "STRIPE") {
    return value;
  }
  return "BANK_ACCOUNT";
}

function toWithdrawalStatus(value: unknown): WithdrawalStatus {
  if (
    value === "PROCESSING" ||
    value === "COMPLETED" ||
    value === "FAILED" ||
    value === "CANCELLED"
  ) {
    return value;
  }
  return "PENDING";
}

function moneyFromMinor(value: unknown): number {
  return Math.round(((asNumber(value) ?? 0) / 100) * 100) / 100;
}

function moneyToMinor(value: number): number {
  return Math.round(value * 100);
}

function maskEmail(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }
  const [local, domain] = value.toLowerCase().split("@");
  if (!local || !domain) {
    return undefined;
  }
  return `${local.slice(0, 1)}***@${domain}`;
}

function referenceForWithdrawal(): string {
  return `SIM-WD-${new Date().getUTCFullYear()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
}

function validatePayoutMethodBody(body: PayoutMethodBody): void {
  if (body.type === "BANK_ACCOUNT" && !body.accountLastFour) {
    throw badRequest("Bank payout method requires accountLastFour");
  }
  if (body.type === "PAYPAL" && !body.paypalEmail) {
    throw badRequest("PayPal payout method requires paypalEmail");
  }
  if (body.type === "STRIPE" && !body.stripeAccountId) {
    throw badRequest("Stripe payout method requires stripeAccountId");
  }
}

function simulatedPayoutMethodFields(body: PayoutMethodBody): {
  bankName?: string;
  accountLastFour?: string;
  paypalEmail?: string;
  stripeAccountId?: string;
  nickname?: string;
} {
  return {
    bankName: body.type === "BANK_ACCOUNT" ? body.bankName : undefined,
    accountLastFour: body.type === "BANK_ACCOUNT" ? body.accountLastFour : undefined,
    paypalEmail: body.type === "PAYPAL" ? maskEmail(body.paypalEmail) : undefined,
    stripeAccountId:
      body.type === "STRIPE" ? `simulated:${body.stripeAccountId?.slice(-6)}` : undefined,
    nickname: body.nickname,
  };
}

function mapPayoutMethodRow(row: SeedRow): PayoutMethodPayload {
  const bankName = asString(row.bankName);
  const accountLastFour = asString(row.accountLastFour);
  const paypalEmail = asString(row.paypalEmail);
  const stripeAccountId = asString(row.stripeAccountId);
  const nickname = asString(row.nickname);
  const verifiedAt = row.verifiedAt ? asIsoString(row.verifiedAt) : undefined;
  return {
    id: asString(row.id) ?? "",
    coachId: asString(row.coachUserId) ?? "",
    type: toPayoutMethodType(row.type),
    isDefault: asBoolean(row.isDefault) ?? false,
    isVerified: asBoolean(row.isVerified) ?? false,
    ...(bankName ? { bankName } : {}),
    ...(accountLastFour ? { accountLastFour } : {}),
    ...(paypalEmail ? { paypalEmail } : {}),
    ...(stripeAccountId ? { stripeAccountId } : {}),
    ...(nickname ? { nickname } : {}),
    createdAt: asIsoString(row.createdAt),
    ...(verifiedAt ? { verifiedAt } : {}),
  };
}

function mapWithdrawalRow(row: SeedRow): WithdrawalPayload {
  const processedAt = row.processedAt ? asIsoString(row.processedAt) : undefined;
  const completedAt = row.completedAt ? asIsoString(row.completedAt) : undefined;
  const failureReason = asString(row.failureReason);
  const reference = asString(row.reference);
  return {
    id: asString(row.id) ?? "",
    coachId: asString(row.coachUserId) ?? "",
    amount: moneyFromMinor(row.amountMinor),
    currency: asString(row.currency) ?? "GBP",
    fee: moneyFromMinor(row.feeMinor),
    netAmount: moneyFromMinor(row.netAmountMinor),
    payoutMethodId: asString(row.payoutMethodId) ?? "",
    payoutMethod: toPayoutMethodType(row.payoutMethodType),
    status: toWithdrawalStatus(row.status),
    requestedAt: asIsoString(row.requestedAt),
    ...(processedAt ? { processedAt } : {}),
    ...(completedAt ? { completedAt } : {}),
    ...(failureReason ? { failureReason } : {}),
    ...(reference ? { reference } : {}),
  };
}

async function listPayoutMethods(coachUserId: string): Promise<PayoutMethodPayload[]> {
  if (getApiDataBackend() === "db") {
    const prisma = getPrismaClientOrThrow();
    const rows = await prisma.coachPayoutMethod.findMany({
      where: { coachUserId, deletedAt: null },
      orderBy: { createdAt: "asc" },
    });
    return rows.map((row) => mapPayoutMethodRow(row as unknown as SeedRow));
  }

  return payoutMethodRows(payoutTables())
    .filter((row) => asString(row.coachUserId) === coachUserId && !row.deletedAt)
    .sort(
      (a, b) =>
        new Date(asIsoString(a.createdAt)).getTime() -
        new Date(asIsoString(b.createdAt)).getTime(),
    )
    .map(mapPayoutMethodRow);
}

async function createPayoutMethod(
  coachUserId: string,
  body: PayoutMethodBody,
): Promise<PayoutMethodPayload> {
  validatePayoutMethodBody(body);
  const now = new Date();
  const fields = simulatedPayoutMethodFields(body);

  if (getApiDataBackend() === "db") {
    const prisma = getPrismaClientOrThrow();
    const row = await prisma.$transaction(async (tx) => {
      const activeCount = await tx.coachPayoutMethod.count({
        where: { coachUserId, deletedAt: null },
      });
      const isDefault = body.isDefault === true || activeCount === 0;
      if (isDefault) {
        await tx.coachPayoutMethod.updateMany({
          where: { coachUserId, deletedAt: null },
          data: { isDefault: false },
        });
      }
      return tx.coachPayoutMethod.create({
        data: {
          id: newId("pm"),
          coachUserId,
          type: body.type,
          isDefault,
          isVerified: true,
          bankName: fields.bankName,
          accountLastFour: fields.accountLastFour,
          paypalEmail: fields.paypalEmail,
          stripeAccountId: fields.stripeAccountId,
          nickname: fields.nickname,
          provider: SIMULATED_PAYOUT_PROVIDER,
          providerRef: newId("simpm"),
          verifiedAt: now,
        },
      });
    });
    return mapPayoutMethodRow(row as unknown as SeedRow);
  }

  const rows = payoutMethodRows(payoutTables());
  const activeRows = rows.filter(
    (row) => asString(row.coachUserId) === coachUserId && !row.deletedAt,
  );
  const isDefault = body.isDefault === true || activeRows.length === 0;
  if (isDefault) {
    for (const row of activeRows) {
      row.isDefault = false;
    }
  }
  const row: SeedRow = {
    id: newId("pm"),
    coachUserId,
    type: body.type,
    isDefault,
    isVerified: true,
    ...fields,
    provider: SIMULATED_PAYOUT_PROVIDER,
    providerRef: newId("simpm"),
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    verifiedAt: now.toISOString(),
    deletedAt: null,
  };
  rows.push(row);
  return mapPayoutMethodRow(row);
}

async function removePayoutMethod(coachUserId: string, methodId: string): Promise<void> {
  const now = new Date();
  if (getApiDataBackend() === "db") {
    const prisma = getPrismaClientOrThrow();
    await prisma.$transaction(async (tx) => {
      const method = await tx.coachPayoutMethod.findFirst({
        where: { id: methodId, coachUserId, deletedAt: null },
      });
      if (!method) {
        throw notFound("Payout method not found");
      }
      const activeWithdrawal = await tx.coachWithdrawal.findFirst({
        where: {
          coachUserId,
          payoutMethodId: methodId,
          status: { in: ["PENDING", "PROCESSING"] },
        },
        select: { id: true },
      });
      if (activeWithdrawal) {
        throw badRequest("Cannot remove payout method with active withdrawals");
      }
      await tx.coachPayoutMethod.update({
        where: { id: methodId },
        data: {
          deletedAt: now,
          deletedByUserId: coachUserId,
          isDefault: false,
        },
      });
      if (method.isDefault) {
        const replacement = await tx.coachPayoutMethod.findFirst({
          where: {
            coachUserId,
            deletedAt: null,
            id: { not: methodId },
          },
          orderBy: { createdAt: "asc" },
        });
        if (replacement) {
          await tx.coachPayoutMethod.update({
            where: { id: replacement.id },
            data: { isDefault: true },
          });
        }
      }
    }, API_DB_TRANSACTION_OPTIONS);
    return;
  }

  const tables = payoutTables();
  const rows = payoutMethodRows(tables);
  const method = rows.find(
    (row) =>
      asString(row.id) === methodId &&
      asString(row.coachUserId) === coachUserId &&
      !row.deletedAt,
  );
  if (!method) {
    throw notFound("Payout method not found");
  }
  const activeWithdrawal = withdrawalRows(tables).find(
    (row) =>
      asString(row.coachUserId) === coachUserId &&
      asString(row.payoutMethodId) === methodId &&
      pendingWithdrawalStatuses.has(toWithdrawalStatus(row.status)),
  );
  if (activeWithdrawal) {
    throw badRequest("Cannot remove payout method with active withdrawals");
  }
  const wasDefault = asBoolean(method.isDefault) === true;
  method.deletedAt = now.toISOString();
  method.deletedByUserId = coachUserId;
  method.isDefault = false;
  if (wasDefault) {
    const replacement = rows.find(
      (row) =>
        asString(row.coachUserId) === coachUserId &&
        asString(row.id) !== methodId &&
        !row.deletedAt,
    );
    if (replacement) {
      replacement.isDefault = true;
    }
  }
}

async function setDefaultPayoutMethod(
  coachUserId: string,
  methodId: string,
): Promise<PayoutMethodPayload> {
  if (getApiDataBackend() === "db") {
    const prisma = getPrismaClientOrThrow();
    const row = await prisma.$transaction(async (tx) => {
      const method = await tx.coachPayoutMethod.findFirst({
        where: { id: methodId, coachUserId, deletedAt: null },
      });
      if (!method) {
        throw notFound("Payout method not found");
      }
      if (!method.isVerified) {
        throw badRequest("Cannot set an unverified payout method as default");
      }
      await tx.coachPayoutMethod.updateMany({
        where: { coachUserId, deletedAt: null },
        data: { isDefault: false },
      });
      return tx.coachPayoutMethod.update({
        where: { id: methodId },
        data: { isDefault: true },
      });
    });
    return mapPayoutMethodRow(row as unknown as SeedRow);
  }

  const rows = payoutMethodRows(payoutTables());
  const method = rows.find(
    (row) =>
      asString(row.id) === methodId &&
      asString(row.coachUserId) === coachUserId &&
      !row.deletedAt,
  );
  if (!method) {
    throw notFound("Payout method not found");
  }
  if (asBoolean(method.isVerified) !== true) {
    throw badRequest("Cannot set an unverified payout method as default");
  }
  for (const row of rows) {
    if (asString(row.coachUserId) === coachUserId && !row.deletedAt) {
      row.isDefault = asString(row.id) === methodId;
    }
  }
  return mapPayoutMethodRow(method);
}

async function listWithdrawals(
  coachUserId: string,
  status?: "pending",
): Promise<WithdrawalPayload[]> {
  const statusFilter = status === "pending" ? ["PENDING", "PROCESSING"] : undefined;
  if (getApiDataBackend() === "db") {
    const prisma = getPrismaClientOrThrow();
    const rows = await prisma.coachWithdrawal.findMany({
      where: {
        coachUserId,
        ...(statusFilter ? { status: { in: statusFilter } } : {}),
      },
      orderBy: { requestedAt: "desc" },
    });
    return rows.map((row) => mapWithdrawalRow(row as unknown as SeedRow));
  }

  return withdrawalRows(payoutTables())
    .filter((row) => {
      if (asString(row.coachUserId) !== coachUserId) {
        return false;
      }
      return status === "pending"
        ? pendingWithdrawalStatuses.has(toWithdrawalStatus(row.status))
        : true;
    })
    .sort(
      (a, b) =>
        new Date(asIsoString(b.requestedAt)).getTime() -
        new Date(asIsoString(a.requestedAt)).getTime(),
    )
    .map(mapWithdrawalRow);
}

async function requestWithdrawal(
  coachUserId: string,
  body: WithdrawalBody,
): Promise<WithdrawalPayload> {
  const amountMinor = moneyToMinor(body.amount);
  const now = new Date();

  if (getApiDataBackend() === "db") {
    const prisma = getPrismaClientOrThrow();
    const method = await prisma.coachPayoutMethod.findFirst({
      where: {
        id: body.payoutMethodId,
        coachUserId,
        deletedAt: null,
      },
    });
    if (!method) {
      throw notFound("Payout method not found");
    }
    if (!method.isVerified) {
      throw badRequest("Payout method is not verified");
    }
    const snapshot = await resolveCoachEarningsRepository().getSnapshot(
      coachUserId,
      "month",
      1,
    );
    if (moneyToMinor(snapshot.earnings.availableBalance) < amountMinor) {
      throw badRequest("Insufficient available balance");
    }
    const row = await prisma.coachWithdrawal.create({
      data: {
        id: newId("wd"),
        coachUserId,
        amountMinor,
        currency: "GBP",
        feeMinor: 0,
        netAmountMinor: amountMinor,
        payoutMethodId: method.id,
        payoutMethodType: method.type,
        status: "PENDING",
        requestedAt: now,
        provider: SIMULATED_PAYOUT_PROVIDER,
        providerRef: newId("simwd"),
      },
    });
    return mapWithdrawalRow(row as unknown as SeedRow);
  }

  const tables = payoutTables();
  const method = payoutMethodRows(tables).find(
    (row) =>
      asString(row.id) === body.payoutMethodId &&
      asString(row.coachUserId) === coachUserId &&
      !row.deletedAt,
  );
  if (!method) {
    throw notFound("Payout method not found");
  }
  if (asBoolean(method.isVerified) !== true) {
    throw badRequest("Payout method is not verified");
  }
  const snapshot = await resolveCoachEarningsRepository().getSnapshot(
    coachUserId,
    "month",
    1,
  );
  if (moneyToMinor(snapshot.earnings.availableBalance) < amountMinor) {
    throw badRequest("Insufficient available balance");
  }
  const row: SeedRow = {
    id: newId("wd"),
    coachUserId,
    amountMinor,
    currency: "GBP",
    feeMinor: 0,
    netAmountMinor: amountMinor,
    payoutMethodId: body.payoutMethodId,
    payoutMethodType: toPayoutMethodType(method.type),
    status: "PENDING",
    requestedAt: now.toISOString(),
    provider: SIMULATED_PAYOUT_PROVIDER,
    providerRef: newId("simwd"),
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
  withdrawalRows(tables).push(row);
  return mapWithdrawalRow(row);
}

async function updateWithdrawalStatus(
  coachUserId: string,
  withdrawalId: string,
  nextStatus: "CANCELLED" | "COMPLETED",
): Promise<WithdrawalPayload> {
  const now = new Date();
  if (getApiDataBackend() === "db") {
    const prisma = getPrismaClientOrThrow();
    const row = await prisma.$transaction(async (tx) => {
      const withdrawal = await tx.coachWithdrawal.findFirst({
        where: { id: withdrawalId, coachUserId },
      });
      if (!withdrawal) {
        throw notFound("Withdrawal not found");
      }
      const currentStatus = toWithdrawalStatus(withdrawal.status);
      if (nextStatus === "CANCELLED") {
        if (currentStatus !== "PENDING") {
          throw badRequest("Only pending withdrawals can be cancelled");
        }
        return tx.coachWithdrawal.update({
          where: { id: withdrawalId },
          data: { status: "CANCELLED" },
        });
      }
      if (currentStatus === "COMPLETED") {
        return withdrawal;
      }
      if (!pendingWithdrawalStatuses.has(currentStatus)) {
        throw badRequest("Only pending or processing withdrawals can be completed");
      }
      return tx.coachWithdrawal.update({
        where: { id: withdrawalId },
        data: {
          status: "COMPLETED",
          processedAt: withdrawal.processedAt ?? now,
          completedAt: now,
          reference: withdrawal.reference ?? referenceForWithdrawal(),
        },
      });
    });
    return mapWithdrawalRow(row as unknown as SeedRow);
  }

  const row = withdrawalRows(payoutTables()).find(
    (entry) =>
      asString(entry.id) === withdrawalId && asString(entry.coachUserId) === coachUserId,
  );
  if (!row) {
    throw notFound("Withdrawal not found");
  }
  const currentStatus = toWithdrawalStatus(row.status);
  if (nextStatus === "CANCELLED") {
    if (currentStatus !== "PENDING") {
      throw badRequest("Only pending withdrawals can be cancelled");
    }
    row.status = "CANCELLED";
    row.updatedAt = now.toISOString();
    return mapWithdrawalRow(row);
  }
  if (currentStatus === "COMPLETED") {
    return mapWithdrawalRow(row);
  }
  if (!pendingWithdrawalStatuses.has(currentStatus)) {
    throw badRequest("Only pending or processing withdrawals can be completed");
  }
  row.status = "COMPLETED";
  row.processedAt = row.processedAt ?? now.toISOString();
  row.completedAt = now.toISOString();
  row.reference = row.reference ?? referenceForWithdrawal();
  row.updatedAt = now.toISOString();
  return mapWithdrawalRow(row);
}
async function recordClubBrandingAudit(params: {
  request: FastifyRequest;
  action: "club_branding.read" | "club_branding.update";
  clubId: string;
  result: "SUCCESS" | "DENY" | "ERROR";
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await recordAuditEvent({
    request: params.request,
    action: params.action,
    resourceType: "club_branding",
    resourceId: params.clubId,
    subjectUserId: params.request.auth?.userId ?? null,
    result: params.result,
    metadata: {
      clubId: params.clubId,
      ...params.metadata,
    },
  });
}
async function recordClubManagementAudit(params: {
  request: FastifyRequest;
  action: "club.create" | "club.update" | "club.archive";
  clubId: string;
  result: "SUCCESS" | "DENY" | "ERROR";
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await recordAuditEvent({
    request: params.request,
    action: params.action,
    resourceType: "club",
    resourceId: params.clubId,
    subjectUserId: params.request.auth?.userId ?? null,
    result: params.result,
    metadata: {
      clubId: params.clubId,
      ...params.metadata,
    },
  });
}
async function recordClubIntegrationAudit(params: {
  request: FastifyRequest;
  action:
    | "club_integration.read"
    | "club_integration.create"
    | "club_integration.update";
  clubId: string;
  provider?: string;
  result: "SUCCESS" | "DENY" | "ERROR";
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await recordAuditEvent({
    request: params.request,
    action: params.action,
    resourceType: "club_integration",
    resourceId: params.provider
      ? `${params.clubId}:${params.provider}`
      : params.clubId,
    subjectUserId: params.request.auth?.userId ?? null,
    result: params.result,
    sensitiveRead: params.action === "club_integration.read",
    metadata: {
      clubId: params.clubId,
      provider: params.provider ?? null,
      ...params.metadata,
    },
  });
}
async function recordClubSquadAudit(params: {
  request: FastifyRequest;
  action: string;
  clubId: string;
  squadId?: string;
  result: "SUCCESS" | "DENY" | "ERROR";
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await recordAuditEvent({
    request: params.request,
    action: params.action,
    resourceType: "club_squad",
    resourceId: params.squadId
      ? `${params.clubId}:${params.squadId}`
      : params.clubId,
    subjectUserId: params.request.auth?.userId ?? null,
    result: params.result,
    metadata: {
      clubId: params.clubId,
      squadId: params.squadId,
      ...params.metadata,
    },
  });
}
async function recordClubSquadMemberAudit(params: {
  request: FastifyRequest;
  action: string;
  clubId: string;
  squadId: string;
  targetUserId: string;
  result: "SUCCESS" | "DENY" | "ERROR";
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await recordAuditEvent({
    request: params.request,
    action: params.action,
    resourceType: "squad_member",
    resourceId: `${params.clubId}:${params.squadId}:${params.targetUserId}`,
    subjectUserId: params.request.auth?.userId ?? null,
    result: params.result,
    metadata: {
      clubId: params.clubId,
      squadId: params.squadId,
      targetUserId: params.targetUserId,
      ...params.metadata,
    },
  });
}
async function recordClubSquadRosterAudit(params: {
  request: FastifyRequest;
  squadId: string;
  result: "SUCCESS" | "DENY" | "ERROR";
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await recordAuditEvent({
    request: params.request,
    action: "club_squad_roster.read",
    resourceType: "squad_roster",
    resourceId: params.squadId,
    subjectUserId: params.request.auth?.userId ?? null,
    result: params.result,
    metadata: params.metadata,
  });
}
function toDateOnly(value: string | undefined): string {
  if (!value) {
    return "";
  }
  return value.includes("T") ? value.slice(0, 10) : value;
}
function normalizeTime(value: string | undefined): string {
  return value?.slice(0, 5) ?? "00:00";
}
function mapAvailabilityTemplate(row: SeedRow) {
  return {
    id: asString(row.id) ?? "",
    coachId: asString(row.coachUserId) ?? "",
    dayOfWeek: Number(row.dayOfWeek ?? 0) as 0 | 1 | 2 | 3 | 4 | 5 | 6,
    startTime: normalizeTime(asString(row.startTimeLocal)),
    endTime: normalizeTime(asString(row.endTimeLocal)),
    isRecurring: true,
    maxConcurrent: Number(row.maxConcurrent ?? 1),
    bufferMinutes: Number(row.bufferMinutes ?? row.bufferMinutesDefault ?? 15),
    location: asString(row.location),
    sessionTemplateId: asString(row.sessionTemplateId),
  };
}
function mapAvailabilityOverride(row: SeedRow) {
  const startTime = asString(row.startTimeLocal);
  const endTime = asString(row.endTimeLocal);
  const location = asString(row.location);
  return {
    id: asString(row.id) ?? "",
    coachId: asString(row.coachUserId) ?? "",
    date: toDateOnly(asString(row.overrideDate)),
    isBlocked: row.isBlocked === true,
    reason: asString(row.reason),
    customSlots:
      startTime && endTime
        ? [
            {
              date: toDateOnly(asString(row.overrideDate)),
              startTime: normalizeTime(startTime),
              endTime: normalizeTime(endTime),
              location,
            },
          ]
        : undefined,
    repeatUntil: toDateOnly(asString(row.repeatUntil)),
    repeatDayOfWeek:
      typeof row.repeatDayOfWeek === "number"
        ? (row.repeatDayOfWeek as 0 | 1 | 2 | 3 | 4 | 5 | 6)
        : undefined,
    repeatGroupId: asString(row.repeatGroupId),
  };
}
function mapCoachSchedulingRules(
  row: SeedRow | undefined,
  coachUserId: string,
) {
  const now = new Date().toISOString();
  return {
    id: asString(row?.id) ?? `rules_${coachUserId}`,
    coachId: coachUserId,
    minimumAdvanceBookingHours: Number(row?.minimumAdvanceBookingHours ?? 24),
    maxAdvanceBookingDays: Number(row?.maxAdvanceBookingDays ?? 30),
    bufferMinutesDefault: Number(row?.bufferMinutesDefault ?? 15),
    maxConcurrentDefault: Number(row?.maxConcurrentDefault ?? 1),
    allowSameDayBookings: row?.allowSameDayBookings === true,
    cancellationPolicyId: asString(row?.cancellationPolicyId),
    createdAt: asString(row?.createdAt) ?? now,
    updatedAt: asString(row?.updatedAt) ?? now,
  };
}
function mapCancellationPolicy(rows: SeedRow[], coachUserId: string) {
  const activeRows = getActiveRows(rows)
    .filter((row) => asString(row.coachUserId) === coachUserId)
    .sort(
      (left, right) =>
        Number(left.sortOrder ?? 0) - Number(right.sortOrder ?? 0),
    );
  if (activeRows.length === 0) {
    return null;
  }
  const first = activeRows[0];
  return {
    id: asString(first.id) ?? `policy_${coachUserId}`,
    coachId: coachUserId,
    name: asString(first.name) ?? "Cancellation policy",
    description:
      asString(first.description) ?? "Coach-defined cancellation policy",
    tiers: activeRows
      .map((row) => ({
        hoursBeforeSession: Number(row.noticeHoursMin ?? 0),
        refundPercentage: Number(row.refundPercent ?? 0),
        description:
          asString(row.description) ??
          `${Number(row.refundPercent ?? 0)}% refund if cancelled ${Number(row.noticeHoursMin ?? 0)}+ hours before`,
      }))
      .sort(
        (left, right) => right.hoursBeforeSession - left.hoursBeforeSession,
      ),
    minimumNoticeHours: Math.min(
      ...activeRows.map((row) => Number(row.noticeHoursMin ?? 0)),
    ),
    allowCancellations:
      activeRows.some((row) => Number(row.refundPercent ?? 0) > 0) ||
      activeRows.length > 0,
    isDefault: activeRows[0]?.isDefault === true,
    createdAt: asString(first.createdAt) ?? new Date().toISOString(),
    updatedAt:
      asString(first.updatedAt) ??
      asString(first.createdAt) ??
      new Date().toISOString(),
  };
}
function canViewClubSchedule(params: {
  club: SeedRow;
  viewerMembership: SeedRow | null;
  isPrivilegedAdmin: boolean;
}): boolean {
  if (params.isPrivilegedAdmin || params.viewerMembership) {
    return true;
  }
  return asString(params.club.visibility) === "public";
}
function requireClubScheduleAccess(params: {
  clubId: string | undefined;
  authUserId: string;
  isPrivilegedAdmin: boolean;
  tables: Record<string, unknown>;
}) {
  if (!params.clubId) {
    throw notFound("Club not found");
  }
  const clubs = asRows(params.tables.clubs);
  const clubMemberships = asRows(params.tables.clubMemberships);
  const club = clubs.find((row) => asString(row.id) === params.clubId);
  if (!club) {
    throw notFound("Club not found");
  }
  const viewerMembership = getViewerMembership(
    clubMemberships,
    params.clubId,
    params.authUserId,
  );
  if (
    !canViewClubSchedule({
      club,
      viewerMembership,
      isPrivilegedAdmin: params.isPrivilegedAdmin,
    })
  ) {
    throw forbidden("You do not have permission to view this club schedule");
  }
  return {
    club,
    viewerMembership,
  };
}
async function requireDbClubScheduleAccess(params: {
  clubId: string;
  authUserId: string;
  isPrivilegedAdmin: boolean;
}): Promise<void> {
  const prisma = getPrismaClientOrThrow();
  const club = await prisma.club.findFirst({
    where: {
      id: params.clubId,
      deletedAt: null,
    },
    select: {
      id: true,
      visibility: true,
    },
  });
  if (!club) {
    throw notFound("Club not found");
  }
  if (params.isPrivilegedAdmin || club.visibility === "public") {
    return;
  }
  const viewerMembership = await prisma.clubMembership.findUnique({
    where: {
      clubId_userId: {
        clubId: params.clubId,
        userId: params.authUserId,
      },
    },
    select: {
      active: true,
      deletedAt: true,
    },
  });
  if (viewerMembership?.active === true && viewerMembership.deletedAt === null) {
    return;
  }
  throw forbidden("You do not have permission to view this club schedule");
}
async function resolveClubScheduleSource(params: {
  clubId: string | undefined;
  authUserId: string;
  isPrivilegedAdmin: boolean;
}): Promise<{
  clubId: string;
  tables: Record<string, unknown>;
  seedVersion: string | null;
}> {
  if (!params.clubId) {
    throw notFound("Club not found");
  }
  if (getApiDataBackend() === "db") {
    await requireDbClubScheduleAccess({
      clubId: params.clubId,
      authUserId: params.authUserId,
      isPrivilegedAdmin: params.isPrivilegedAdmin,
    });
    const prisma = getPrismaClientOrThrow();
    const [clubEvents, groupSessions, matches] = await Promise.all([
      prisma.clubEvent.findMany({
        where: {
          clubId: params.clubId,
          deletedAt: null,
        },
        orderBy: {
          startsAt: "asc",
        },
      }),
      prisma.groupSession.findMany({
        where: {
          clubId: params.clubId,
          deletedAt: null,
        },
        orderBy: {
          createdAt: "asc",
        },
      }),
      prisma.clubMatch.findMany({
        where: {
          clubId: params.clubId,
          deletedAt: null,
        },
        orderBy: {
          startsAt: "asc",
        },
      }),
    ]);
    return {
      clubId: params.clubId,
      tables: normalizeForJson({
        clubEvents,
        groupSessions,
        matches,
      }),
      seedVersion: null,
    };
  }
  const store = getMarketplaceSeedStore();
  requireClubScheduleAccess({
    clubId: params.clubId,
    authUserId: params.authUserId,
    isPrivilegedAdmin: params.isPrivilegedAdmin,
    tables: store.tables,
  });
  return {
    clubId: params.clubId,
    tables: store.tables,
    seedVersion: store.version,
  };
}
const coachClubRoutes: FastifyPluginAsync = async (app) => {
  registerClubMatchRoutes(app);
  registerClubStaffingRoutes(app);
  registerClubHeadCoachRoutes(app);
  registerClubOwnerDashboardRoutes(app);

  app.get("/coaches/me/profile", async (request, reply) => {
    try {
      const authUserId = requireAuthUserId(request.auth?.userId);
      const repository = resolveCoachSelfRepository();
      const result = await repository.getProfileBundle(authUserId);
      await recordCoachProfileAudit({
        request,
        action: "coach_profile.read",
        result: "SUCCESS",
      });
      return reply.send({
        profile: result.profile,
        seedVersion: result.dataVersion,
        requestId: request.requestId,
      });
    } catch (error) {
      await recordCoachProfileAudit({
        request,
        action: "coach_profile.read",
        result: mutationAuditResult(error),
        metadata: {
          errorCode: mutationAuditErrorCode(error),
        },
      });
      throw error;
    }
  });
  app.patch("/coaches/me/profile", async (request, reply) => {
    try {
      const authUserId = requireAuthUserId(request.auth?.userId);
      const body = coachProfilePatchBodySchema.parse(request.body ?? {});
      const repository = resolveCoachSelfRepository();
      const result = await repository.patchProfile(authUserId, body);
      await recordCoachProfileAudit({
        request,
        action: "coach_profile.update",
        result: "SUCCESS",
        metadata: {
          changedFields: Object.keys(body),
        },
      });
      return reply.send({
        profile: result.profile,
        seedVersion: result.dataVersion,
        requestId: request.requestId,
      });
    } catch (error) {
      await recordCoachProfileAudit({
        request,
        action: "coach_profile.update",
        result: mutationAuditResult(error),
        metadata: {
          errorCode: mutationAuditErrorCode(error),
        },
      });
      throw error;
    }
  });
  app.get("/coaches/me/offerings", async (request, reply) => {
    const authUserId = requireAuthUserId(request.auth?.userId);
    const repository = resolveCoachSelfRepository();
    const result = await repository.listOfferings(authUserId);
    return reply.send({
      offerings: result.offerings,
      total: result.offerings.length,
      seedVersion: result.dataVersion,
      requestId: request.requestId,
    });
  });
  app.post("/coaches/me/offerings", async (request, reply) => {
    const repository = resolveCoachSessionTemplateRepository();
    let offeringId: string | undefined;
    try {
      const authUserId = requireAuthUserId(request.auth?.userId);
      const body = coachOfferingBodySchema.parse(request.body ?? {});
      const template = await repository.create(authUserId, offeringBodyToTemplateInput(body));
      const offering = templateToOffering(template);
      offeringId = offering.id;
      await recordCoachOfferingAudit({
        request,
        action: "coach_offering.create",
        offeringId,
        result: "SUCCESS",
        metadata: {
          fields: Object.keys(body),
        },
      });
      return reply.code(201).send({
        offering,
        requestId: request.requestId,
      });
    } catch (error) {
      await recordCoachOfferingAudit({
        request,
        action: "coach_offering.create",
        offeringId,
        result: mutationAuditResult(error),
        metadata: {
          errorCode: mutationAuditErrorCode(error),
        },
      });
      throw error;
    }
  });
  app.patch("/coaches/me/offerings/:offeringId", async (request, reply) => {
    const { offeringId } = coachOfferingParamsSchema.parse(request.params);
    const repository = resolveCoachSessionTemplateRepository();
    try {
      const authUserId = requireAuthUserId(request.auth?.userId);
      const body = coachOfferingPatchSchema.parse(request.body ?? {});
      const template = await repository.update(
        authUserId,
        offeringId,
        offeringPatchToTemplatePatch(body),
      );
      const offering = templateToOffering(template);
      await recordCoachOfferingAudit({
        request,
        action: "coach_offering.update",
        offeringId,
        result: "SUCCESS",
        metadata: {
          fields: Object.keys(body),
        },
      });
      return reply.send({
        offering,
        requestId: request.requestId,
      });
    } catch (error) {
      await recordCoachOfferingAudit({
        request,
        action: "coach_offering.update",
        offeringId,
        result: mutationAuditResult(error),
        metadata: {
          errorCode: mutationAuditErrorCode(error),
        },
      });
      throw error;
    }
  });
  app.get("/coaches/me/travel-settings", async (request, reply) => {
    try {
      const authUserId = requireAuthUserId(request.auth?.userId);
      const repository = resolveCoachTravelSettingsRepository();
      const settings = await repository.get(authUserId);
      await recordCoachTravelSettingsAudit({
        request,
        action: "coach_travel_settings.read",
        result: "SUCCESS",
      });
      return reply.send({
        settings,
        requestId: request.requestId,
      });
    } catch (error) {
      await recordCoachTravelSettingsAudit({
        request,
        action: "coach_travel_settings.read",
        result: mutationAuditResult(error),
        metadata: {
          errorCode: mutationAuditErrorCode(error),
        },
      });
      throw error;
    }
  });
  app.patch("/coaches/me/travel-settings", async (request, reply) => {
    try {
      const authUserId = requireAuthUserId(request.auth?.userId);
      const body = coachTravelSettingsPatchBodySchema.parse(request.body ?? {});
      const repository = resolveCoachTravelSettingsRepository();
      const settings = await repository.update(authUserId, body);
      await recordCoachTravelSettingsAudit({
        request,
        action: "coach_travel_settings.update",
        result: "SUCCESS",
        metadata: {
          changedFields: Object.keys(body),
        },
      });
      return reply.send({
        settings,
        requestId: request.requestId,
      });
    } catch (error) {
      await recordCoachTravelSettingsAudit({
        request,
        action: "coach_travel_settings.update",
        result: mutationAuditResult(error),
        metadata: {
          errorCode: mutationAuditErrorCode(error),
        },
      });
      throw error;
    }
  });
  app.get("/coaches/me/venues", async (request, reply) => {
    try {
      const authUserId = requireAuthUserId(request.auth?.userId);
      const repository = resolveCoachVenueRepository();
      const venues = await repository.list(authUserId);
      await recordCoachVenueAudit({
        request,
        action: "coach_venue.read",
        result: "SUCCESS",
        metadata: {
          total: venues.length,
        },
      });
      return reply.send({
        venues,
        total: venues.length,
        requestId: request.requestId,
      });
    } catch (error) {
      await recordCoachVenueAudit({
        request,
        action: "coach_venue.read",
        result: mutationAuditResult(error),
        metadata: {
          errorCode: mutationAuditErrorCode(error),
        },
      });
      throw error;
    }
  });
  app.post("/coaches/me/venues", async (request, reply) => {
    let venueId: string | undefined;
    try {
      const authUserId = requireAuthUserId(request.auth?.userId);
      const body = coachVenueBodySchema.parse(request.body ?? {});
      const repository = resolveCoachVenueRepository();
      const venue = await repository.create(authUserId, body);
      venueId = venue.id;
      await recordCoachVenueAudit({
        request,
        action: "coach_venue.create",
        venueId,
        result: "SUCCESS",
        metadata: {
          fields: Object.keys(body),
        },
      });
      return reply.code(201).send({
        venue,
        requestId: request.requestId,
      });
    } catch (error) {
      await recordCoachVenueAudit({
        request,
        action: "coach_venue.create",
        venueId,
        result: mutationAuditResult(error),
        metadata: {
          errorCode: mutationAuditErrorCode(error),
        },
      });
      throw error;
    }
  });
  app.patch("/coaches/me/venues/:venueId", async (request, reply) => {
    const { venueId } = coachVenueParamsSchema.parse(request.params);
    try {
      const authUserId = requireAuthUserId(request.auth?.userId);
      const body = coachVenuePatchSchema.parse(request.body ?? {});
      const repository = resolveCoachVenueRepository();
      const venue = await repository.update(authUserId, venueId, body);
      await recordCoachVenueAudit({
        request,
        action: "coach_venue.update",
        venueId,
        result: "SUCCESS",
        metadata: {
          fields: Object.keys(body),
        },
      });
      return reply.send({
        venue,
        requestId: request.requestId,
      });
    } catch (error) {
      await recordCoachVenueAudit({
        request,
        action: "coach_venue.update",
        venueId,
        result: mutationAuditResult(error),
        metadata: {
          errorCode: mutationAuditErrorCode(error),
        },
      });
      throw error;
    }
  });
  app.delete("/coaches/me/venues/:venueId", async (request, reply) => {
    const { venueId } = coachVenueParamsSchema.parse(request.params);
    try {
      const authUserId = requireAuthUserId(request.auth?.userId);
      const repository = resolveCoachVenueRepository();
      await repository.delete(authUserId, venueId);
      await recordCoachVenueAudit({
        request,
        action: "coach_venue.archive",
        venueId,
        result: "SUCCESS",
      });
      return reply.code(204).send();
    } catch (error) {
      await recordCoachVenueAudit({
        request,
        action: "coach_venue.archive",
        venueId,
        result: mutationAuditResult(error),
        metadata: {
          errorCode: mutationAuditErrorCode(error),
        },
      });
      throw error;
    }
  });
  app.get("/coaches/me/session-templates", async (request, reply) => {
    const authUserId = requireAuthUserId(request.auth?.userId);
    const repository = resolveCoachSessionTemplateRepository();
    const templates = await repository.list(authUserId);
    return reply.send({
      templates,
      total: templates.length,
      requestId: request.requestId,
    });
  });
  app.get("/coaches/me/session-templates/:templateId", async (request, reply) => {
    const authUserId = requireAuthUserId(request.auth?.userId);
    const { templateId } = coachSessionTemplateParamsSchema.parse(request.params);
    const repository = resolveCoachSessionTemplateRepository();
    const template = await repository.get(authUserId, templateId);
    return reply.send({
      template,
      requestId: request.requestId,
    });
  });
  app.get("/coaches/:coachId/trial-offering", async (request, reply) => {
    const { coachId } = coachTrialOfferingParamsSchema.parse(request.params ?? {});
    try {
      const authUserId = requireAuthUserId(request.auth?.userId);
      const includePrivate = authUserId === coachId || isPrivilegedAdminAuth(request.auth);
      const repository = resolveCoachTrialOfferingRepository();
      const offering = await repository.get(coachId, { includePrivate });
      await recordCoachTrialOfferingAudit({
        request,
        action: "coach_trial_offering.read",
        coachId,
        result: "SUCCESS",
        metadata: {
          visible: Boolean(offering),
          includePrivate,
        },
      });
      return reply.send({
        offering,
        requestId: request.requestId,
      });
    } catch (error) {
      await recordCoachTrialOfferingAudit({
        request,
        action: "coach_trial_offering.read",
        coachId,
        result: mutationAuditResult(error),
        metadata: {
          errorCode: mutationAuditErrorCode(error),
        },
      });
      throw error;
    }
  });
  app.put("/coaches/:coachId/trial-offering", async (request, reply) => {
    const { coachId } = coachTrialOfferingParamsSchema.parse(request.params ?? {});
    try {
      const authUserId = requireAuthUserId(request.auth?.userId);
      if (authUserId !== coachId) {
        throw forbidden("Only the coach can save trial settings", { coachId });
      }
      const body = coachTrialOfferingBodySchema.parse(request.body ?? {});
      const repository = resolveCoachTrialOfferingRepository();
      const offering = await repository.upsert(coachId, body);
      await recordCoachTrialOfferingAudit({
        request,
        action: "coach_trial_offering.save",
        coachId,
        result: "SUCCESS",
        metadata: {
          enabled: offering.enabled,
        },
      });
      return reply.send({
        offering,
        requestId: request.requestId,
      });
    } catch (error) {
      await recordCoachTrialOfferingAudit({
        request,
        action: "coach_trial_offering.save",
        coachId,
        result: mutationAuditResult(error),
        metadata: {
          errorCode: mutationAuditErrorCode(error),
        },
      });
      throw error;
    }
  });
  app.delete("/coaches/:coachId/trial-offering", async (request, reply) => {
    const { coachId } = coachTrialOfferingParamsSchema.parse(request.params ?? {});
    try {
      const authUserId = requireAuthUserId(request.auth?.userId);
      if (authUserId !== coachId) {
        throw forbidden("Only the coach can archive trial settings", { coachId });
      }
      const repository = resolveCoachTrialOfferingRepository();
      await repository.archive(coachId);
      await recordCoachTrialOfferingAudit({
        request,
        action: "coach_trial_offering.archive",
        coachId,
        result: "SUCCESS",
      });
      return reply.code(204).send();
    } catch (error) {
      await recordCoachTrialOfferingAudit({
        request,
        action: "coach_trial_offering.archive",
        coachId,
        result: mutationAuditResult(error),
        metadata: {
          errorCode: mutationAuditErrorCode(error),
        },
      });
      throw error;
    }
  });
  app.get("/trial-offerings", async (request, reply) => {
    try {
      requireAuthUserId(request.auth?.userId);
      const repository = resolveCoachTrialOfferingRepository();
      const offerings = await repository.listActive();
      await recordCoachTrialOfferingAudit({
        request,
        action: "coach_trial_offering.discover",
        result: "SUCCESS",
        metadata: {
          total: offerings.length,
        },
      });
      return reply.send({
        offerings,
        total: offerings.length,
        requestId: request.requestId,
      });
    } catch (error) {
      await recordCoachTrialOfferingAudit({
        request,
        action: "coach_trial_offering.discover",
        result: mutationAuditResult(error),
        metadata: {
          errorCode: mutationAuditErrorCode(error),
        },
      });
      throw error;
    }
  });
  app.get("/coaches/:coachId/trial-usages", async (request, reply) => {
    const { coachId } = coachTrialOfferingParamsSchema.parse(request.params ?? {});
    const query = coachTrialUsageQuerySchema.parse(request.query ?? {});
    try {
      const authUserId = requireAuthUserId(request.auth?.userId);
      const coachScoped = authUserId === coachId || isPrivilegedAdminAuth(request.auth);
      if (!coachScoped && query.parentId !== authUserId) {
        throw forbidden("Only the coach, privileged admin, or linked parent can read trial usage", {
          coachId,
          parentId: query.parentId ?? null,
        });
      }
      const repository = resolveCoachTrialUsageRepository();
      const usages = await repository.listUsages(coachId, query);
      await recordCoachTrialUsageAudit({
        request,
        action: "coach_trial_usage.read",
        resourceType: "coach_trial_usage",
        coachId,
        result: "SUCCESS",
        metadata: {
          parentId: query.parentId ?? null,
          total: usages.length,
        },
      });
      return reply.send({
        coachId,
        ...(query.parentId ? { parentId: query.parentId } : {}),
        usages,
        total: usages.length,
        requestId: request.requestId,
      });
    } catch (error) {
      await recordCoachTrialUsageAudit({
        request,
        action: "coach_trial_usage.read",
        resourceType: "coach_trial_usage",
        coachId,
        result: mutationAuditResult(error),
        metadata: {
          parentId: query.parentId ?? null,
          errorCode: mutationAuditErrorCode(error),
        },
      });
      throw error;
    }
  });
  app.post("/coaches/:coachId/trial-usages", async (request, reply) => {
    const { coachId } = coachTrialOfferingParamsSchema.parse(request.params ?? {});
    const body = coachTrialUsageBodySchema.parse(request.body ?? {});
    let usageId: string | undefined;
    try {
      const authUserId = requireAuthUserId(request.auth?.userId);
      if (
        authUserId !== coachId &&
        authUserId !== body.parentId &&
        !isPrivilegedAdminAuth(request.auth)
      ) {
        throw forbidden("Only the coach, privileged admin, or booking parent can record trial usage", {
          coachId,
          parentId: body.parentId,
        });
      }
      const repository = resolveCoachTrialUsageRepository();
      const { usage, replay } = await repository.recordUsage(coachId, {
        ...body,
        actorUserId: authUserId,
        requestId: request.requestId,
      });
      usageId = usage.id;
      await recordCoachTrialUsageAudit({
        request,
        action: "coach_trial_usage.record",
        resourceType: "coach_trial_usage",
        resourceId: usage.id,
        coachId,
        result: "SUCCESS",
        metadata: {
          bookingId: body.bookingId,
          parentId: body.parentId,
          replay,
        },
      });
      return reply.code(replay ? 200 : 201).send({
        usage,
        replay,
        requestId: request.requestId,
      });
    } catch (error) {
      await recordCoachTrialUsageAudit({
        request,
        action: "coach_trial_usage.record",
        resourceType: "coach_trial_usage",
        resourceId: usageId ?? body.bookingId,
        coachId,
        result: mutationAuditResult(error),
        metadata: {
          bookingId: body.bookingId,
          parentId: body.parentId,
          errorCode: mutationAuditErrorCode(error),
        },
      });
      throw error;
    }
  });
  app.get("/coaches/:coachId/trial-conversions", async (request, reply) => {
    const { coachId } = coachTrialOfferingParamsSchema.parse(request.params ?? {});
    const query = coachTrialConversionQuerySchema.parse(request.query ?? {});
    try {
      const authUserId = requireAuthUserId(request.auth?.userId);
      if (authUserId !== coachId && !isPrivilegedAdminAuth(request.auth)) {
        throw forbidden("Only the coach or privileged admin can read trial conversions", {
          coachId,
        });
      }
      const repository = resolveCoachTrialUsageRepository();
      const conversions = await repository.listConversions(coachId, query);
      await recordCoachTrialUsageAudit({
        request,
        action: "coach_trial_conversion.read",
        resourceType: "coach_trial_conversion",
        coachId,
        result: "SUCCESS",
        metadata: {
          total: conversions.length,
          trialBookingId: query.trialBookingId ?? null,
        },
      });
      return reply.send({
        coachId,
        conversions,
        total: conversions.length,
        requestId: request.requestId,
      });
    } catch (error) {
      await recordCoachTrialUsageAudit({
        request,
        action: "coach_trial_conversion.read",
        resourceType: "coach_trial_conversion",
        coachId,
        result: mutationAuditResult(error),
        metadata: {
          trialBookingId: query.trialBookingId ?? null,
          errorCode: mutationAuditErrorCode(error),
        },
      });
      throw error;
    }
  });
  app.post("/coaches/:coachId/trial-conversions", async (request, reply) => {
    const { coachId } = coachTrialOfferingParamsSchema.parse(request.params ?? {});
    const body = coachTrialConversionBodySchema.parse(request.body ?? {});
    let conversionId: string | undefined;
    try {
      const authUserId = requireAuthUserId(request.auth?.userId);
      if (authUserId !== coachId && !isPrivilegedAdminAuth(request.auth)) {
        throw forbidden("Only the coach or privileged admin can record trial conversions", {
          coachId,
        });
      }
      const repository = resolveCoachTrialUsageRepository();
      const { conversion, replay } = await repository.recordConversion(coachId, {
        ...body,
        actorUserId: authUserId,
        requestId: request.requestId,
      });
      conversionId = conversion.id;
      await recordCoachTrialUsageAudit({
        request,
        action: "coach_trial_conversion.record",
        resourceType: "coach_trial_conversion",
        resourceId: conversion.id,
        coachId,
        result: "SUCCESS",
        metadata: {
          parentId: body.parentId,
          trialBookingId: body.trialBookingId,
          regularBookingId: body.regularBookingId,
          replay,
        },
      });
      return reply.code(replay ? 200 : 201).send({
        conversion,
        replay,
        requestId: request.requestId,
      });
    } catch (error) {
      await recordCoachTrialUsageAudit({
        request,
        action: "coach_trial_conversion.record",
        resourceType: "coach_trial_conversion",
        resourceId: conversionId ?? body.regularBookingId,
        coachId,
        result: mutationAuditResult(error),
        metadata: {
          parentId: body.parentId,
          trialBookingId: body.trialBookingId,
          regularBookingId: body.regularBookingId,
          errorCode: mutationAuditErrorCode(error),
        },
      });
      throw error;
    }
  });
  app.get("/coaches/:coachId/analytics", async (request, reply) => {
    const { coachId } = coachAnalyticsParamsSchema.parse(request.params ?? {});
    try {
      const authUserId = requireAuthUserId(request.auth?.userId);
      if (authUserId !== coachId && !isPrivilegedAdminAuth(request.auth)) {
        throw forbidden("Only the coach or a privileged admin can read coach analytics", {
          coachId,
        });
      }
      const query = coachAnalyticsQuerySchema.parse(request.query ?? {});
      const repository = resolveCoachAnalyticsRepository();
      const result = await repository.getAnalytics(
        coachId,
        query.period as CoachAnalyticsPeriod,
      );
      await recordCoachAnalyticsAudit({
        request,
        coachId,
        result: "SUCCESS",
        metadata: {
          period: query.period,
          totalRevenue: result.analytics.totalRevenue,
          totalSessions: result.analytics.sessions.totalSessions,
          reviewCount: result.analytics.reviewCount,
        },
      });
      return reply.send({
        analytics: result.analytics,
        seedVersion: result.dataVersion,
        requestId: request.requestId,
      });
    } catch (error) {
      await recordCoachAnalyticsAudit({
        request,
        coachId,
        result: mutationAuditResult(error),
        metadata: {
          errorCode: mutationAuditErrorCode(error),
        },
      });
      throw error;
    }
  });
  app.get("/coaches/:coachId/roster", async (request, reply) => {
    const { coachId } = coachRosterParamsSchema.parse(request.params ?? {});
    try {
      const authUserId = requireAuthUserId(request.auth?.userId);
      if (authUserId !== coachId && !isPrivilegedAdminAuth(request.auth)) {
        throw forbidden("Only the coach or a privileged admin can read coach roster", {
          coachId,
        });
      }
      const repository = resolveCoachRosterRepository();
      const result = await repository.list(coachId);
      await recordCoachRosterAudit({
        request,
        coachId,
        result: "SUCCESS",
        metadata: {
          total: result.entries.length,
        },
      });
      return reply.send({
        entries: result.entries,
        total: result.entries.length,
        seedVersion: result.dataVersion,
        requestId: request.requestId,
      });
    } catch (error) {
      await recordCoachRosterAudit({
        request,
        coachId,
        result: mutationAuditResult(error),
        metadata: {
          errorCode: mutationAuditErrorCode(error),
        },
      });
      throw error;
    }
  });
  app.post("/coaches/:coachId/roster", async (request, reply) => {
    const { coachId } = coachRosterParamsSchema.parse(request.params ?? {});
    let athleteId: string | undefined;
    try {
      const body = coachRosterCreateBodySchema.parse(request.body ?? {});
      athleteId = body.athleteId;
      const actorUserId = requireCoachRosterActor(request, coachId);
      const repository = resolveCoachRosterRepository();
      const entry = await repository.create(coachId, actorUserId, body);
      await recordCoachRosterAudit({
        request,
        action: "coach_roster.create",
        coachId,
        athleteId: entry.athleteId,
        result: "SUCCESS",
        metadata: {
          changedFields: Object.keys(body).filter((field) => field !== "athleteId"),
        },
      });
      return reply.code(201).send({
        entry,
        requestId: request.requestId,
      });
    } catch (error) {
      await recordCoachRosterAudit({
        request,
        action: "coach_roster.create",
        coachId,
        athleteId,
        result: mutationAuditResult(error),
        metadata: {
          errorCode: mutationAuditErrorCode(error),
        },
      });
      throw error;
    }
  });
  app.get("/coaches/:coachId/roster/consents", async (request, reply) => {
    const { coachId } = coachRosterParamsSchema.parse(request.params ?? {});
    try {
      const authUserId = requireAuthUserId(request.auth?.userId);
      if (authUserId !== coachId && !isPrivilegedAdminAuth(request.auth)) {
        throw forbidden("Only the coach or a privileged admin can read coach roster consents", {
          coachId,
        });
      }
      const query = coachRosterConsentsQuerySchema.parse(request.query ?? {});
      const repository = resolveCoachRosterConsentRepository();
      const result = await repository.list(coachId, query);
      await recordCoachRosterConsentsAudit({
        request,
        coachId,
        result: "SUCCESS",
        metadata: {
          total: result.consents.length,
          type: query.type ?? null,
          status: query.status,
          hasSearch: Boolean(query.search),
        },
      });
      return reply.send({
        consents: result.consents,
        total: result.consents.length,
        summary: result.summary,
        seedVersion: result.dataVersion,
        requestId: request.requestId,
      });
    } catch (error) {
      await recordCoachRosterConsentsAudit({
        request,
        coachId,
        result: mutationAuditResult(error),
        metadata: {
          errorCode: mutationAuditErrorCode(error),
        },
      });
      throw error;
    }
  });
  app.get("/coaches/:coachId/roster/removals", async (request, reply) => {
    const { coachId } = coachRosterParamsSchema.parse(request.params ?? {});
    try {
      const authUserId = requireAuthUserId(request.auth?.userId);
      if (authUserId !== coachId && !isPrivilegedAdminAuth(request.auth)) {
        throw forbidden("Only the coach or a privileged admin can read coach roster removals", {
          coachId,
        });
      }
      const repository = resolveCoachRosterRepository();
      const removals = await repository.listRemovals(coachId);
      await recordCoachRosterAudit({
        request,
        coachId,
        result: "SUCCESS",
        metadata: {
          surface: "removal_history",
          total: removals.length,
        },
      });
      return reply.send({
        removals,
        total: removals.length,
        requestId: request.requestId,
      });
    } catch (error) {
      await recordCoachRosterAudit({
        request,
        coachId,
        result: mutationAuditResult(error),
        metadata: {
          surface: "removal_history",
          errorCode: mutationAuditErrorCode(error),
        },
      });
      throw error;
    }
  });
  app.post("/coaches/:coachId/roster/removals/:removalId/undo", async (request, reply) => {
    const { coachId, removalId } = coachRosterRemovalParamsSchema.parse(request.params ?? {});
    try {
      const actorUserId = requireCoachRosterActor(request, coachId);
      const repository = resolveCoachRosterRepository();
      const entry = await repository.undoRemoval(coachId, removalId, actorUserId);
      await recordCoachRosterAudit({
        request,
        action: "coach_roster.restore",
        coachId,
        athleteId: entry.athleteId,
        result: "SUCCESS",
        metadata: {
          removalId,
        },
      });
      return reply.send({
        entry,
        requestId: request.requestId,
      });
    } catch (error) {
      await recordCoachRosterAudit({
        request,
        action: "coach_roster.restore",
        coachId,
        result: mutationAuditResult(error),
        metadata: {
          removalId,
          errorCode: mutationAuditErrorCode(error),
        },
      });
      throw error;
    }
  });
  app.post("/coaches/:coachId/roster/:athleteId/notes", async (request, reply) => {
    const { coachId, athleteId } = coachRosterAthleteParamsSchema.parse(request.params ?? {});
    let noteId: string | undefined;
    try {
      const actorUserId = requireCoachRosterActor(request, coachId);
      const body = coachRosterNoteBodySchema.parse(request.body ?? {});
      const repository = resolveCoachRosterRepository();
      const note = await repository.createNote(coachId, athleteId, actorUserId, body);
      noteId = note.id;
      await recordCoachRosterNoteAudit({
        request,
        action: "coach_roster_note.create",
        coachId,
        athleteId,
        noteId,
        result: "SUCCESS",
        metadata: {
          contentLength: body.content.length,
        },
      });
      return reply.code(201).send({
        note,
        requestId: request.requestId,
      });
    } catch (error) {
      await recordCoachRosterNoteAudit({
        request,
        action: "coach_roster_note.create",
        coachId,
        athleteId,
        noteId,
        result: mutationAuditResult(error),
        metadata: {
          errorCode: mutationAuditErrorCode(error),
        },
      });
      throw error;
    }
  });
  app.patch("/coaches/:coachId/roster/:athleteId/notes/:noteId", async (request, reply) => {
    const { coachId, athleteId, noteId } = coachRosterNoteParamsSchema.parse(request.params ?? {});
    try {
      const actorUserId = requireCoachRosterActor(request, coachId);
      const body = coachRosterNoteBodySchema.parse(request.body ?? {});
      const repository = resolveCoachRosterRepository();
      const note = await repository.updateNote(coachId, athleteId, noteId, actorUserId, body);
      await recordCoachRosterNoteAudit({
        request,
        action: "coach_roster_note.update",
        coachId,
        athleteId,
        noteId,
        result: "SUCCESS",
        metadata: {
          contentLength: body.content.length,
        },
      });
      return reply.send({
        note,
        requestId: request.requestId,
      });
    } catch (error) {
      await recordCoachRosterNoteAudit({
        request,
        action: "coach_roster_note.update",
        coachId,
        athleteId,
        noteId,
        result: mutationAuditResult(error),
        metadata: {
          errorCode: mutationAuditErrorCode(error),
        },
      });
      throw error;
    }
  });
  app.delete("/coaches/:coachId/roster/:athleteId/notes/:noteId", async (request, reply) => {
    const { coachId, athleteId, noteId } = coachRosterNoteParamsSchema.parse(request.params ?? {});
    try {
      const actorUserId = requireCoachRosterActor(request, coachId);
      const repository = resolveCoachRosterRepository();
      const note = await repository.removeNote(coachId, athleteId, noteId, actorUserId);
      await recordCoachRosterNoteAudit({
        request,
        action: "coach_roster_note.remove",
        coachId,
        athleteId,
        noteId,
        result: "SUCCESS",
      });
      return reply.send({
        removed: true,
        note,
        requestId: request.requestId,
      });
    } catch (error) {
      await recordCoachRosterNoteAudit({
        request,
        action: "coach_roster_note.remove",
        coachId,
        athleteId,
        noteId,
        result: mutationAuditResult(error),
        metadata: {
          errorCode: mutationAuditErrorCode(error),
        },
      });
      throw error;
    }
  });
  app.patch("/coaches/:coachId/roster/:athleteId", async (request, reply) => {
    const { coachId, athleteId } = coachRosterAthleteParamsSchema.parse(request.params ?? {});
    try {
      const actorUserId = requireCoachRosterActor(request, coachId);
      const body = coachRosterUpdateBodySchema.parse(request.body ?? {});
      const repository = resolveCoachRosterRepository();
      const entry = await repository.update(coachId, athleteId, actorUserId, body);
      await recordCoachRosterAudit({
        request,
        action: "coach_roster.update",
        coachId,
        athleteId,
        result: "SUCCESS",
        metadata: {
          changedFields: Object.keys(body),
        },
      });
      return reply.send({
        entry,
        requestId: request.requestId,
      });
    } catch (error) {
      await recordCoachRosterAudit({
        request,
        action: "coach_roster.update",
        coachId,
        athleteId,
        result: mutationAuditResult(error),
        metadata: {
          errorCode: mutationAuditErrorCode(error),
        },
      });
      throw error;
    }
  });
  app.delete("/coaches/:coachId/roster/:athleteId", async (request, reply) => {
    const { coachId, athleteId } = coachRosterAthleteParamsSchema.parse(request.params ?? {});
    try {
      const actorUserId = requireCoachRosterActor(request, coachId);
      const body = coachRosterRemovalBodySchema.parse(request.body ?? {});
      const repository = resolveCoachRosterRepository();
      const removal = await repository.remove(coachId, athleteId, actorUserId, {
        reason: body.reason,
        customReason: body.customReason ?? undefined,
        archived: body.archive,
      });
      await recordCoachRosterAudit({
        request,
        action: "coach_roster.remove",
        coachId,
        athleteId,
        result: "SUCCESS",
        metadata: {
          removalId: removal.id,
          reason: removal.reason,
          archived: removal.archived,
        },
      });
      return reply.send({
        removed: true,
        removal,
        requestId: request.requestId,
      });
    } catch (error) {
      await recordCoachRosterAudit({
        request,
        action: "coach_roster.remove",
        coachId,
        athleteId,
        result: mutationAuditResult(error),
        metadata: {
          errorCode: mutationAuditErrorCode(error),
        },
      });
      throw error;
    }
  });
  app.get("/coaches/:coachId/roster/:athleteId", async (request, reply) => {
    const { coachId, athleteId } = coachRosterAthleteParamsSchema.parse(request.params ?? {});
    try {
      const authUserId = requireAuthUserId(request.auth?.userId);
      if (authUserId !== coachId && !isPrivilegedAdminAuth(request.auth)) {
        throw forbidden("Only the coach or a privileged admin can read coach roster", {
          coachId,
          athleteId,
        });
      }
      const repository = resolveCoachRosterRepository();
      const entry = await repository.get(coachId, athleteId);
      if (!entry) {
        throw notFound("Roster entry not found", {
          coachId,
          athleteId,
        });
      }
      await recordCoachRosterAudit({
        request,
        coachId,
        athleteId,
        result: "SUCCESS",
      });
      return reply.send({
        entry,
        requestId: request.requestId,
      });
    } catch (error) {
      await recordCoachRosterAudit({
        request,
        coachId,
        athleteId,
        result: mutationAuditResult(error),
        metadata: {
          errorCode: mutationAuditErrorCode(error),
        },
      });
      throw error;
    }
  });
  app.get("/coaches/me/earnings", async (request, reply) => {
    const repository = resolveCoachEarningsRepository();
    try {
      const authUserId = requireAuthUserId(request.auth?.userId);
      assertCoachMoneyDbAuthorityAvailable();
      const query = coachEarningsQuerySchema.parse(request.query ?? {});
      const snapshot = await repository.getSnapshot(
        authUserId,
        query.period,
        query.limit,
      );
      await recordCoachEarningsAudit({
        request,
        result: "SUCCESS",
        metadata: {
          period: query.period,
          limit: query.limit ?? null,
          totalTransactions: snapshot.totalTransactions,
        },
      });
      return reply.send({
        ...snapshot,
        requestId: request.requestId,
      });
    } catch (error) {
      await recordCoachEarningsAudit({
        request,
        result: mutationAuditResult(error),
        metadata: {
          errorCode: mutationAuditErrorCode(error),
        },
      });
      throw error;
    }
  });
  app.get("/coaches/me/invoices", async (request, reply) => {
    let authUserId: string | undefined;
    try {
      authUserId = requireAuthUserId(request.auth?.userId);
      const query = coachInvoiceListQuerySchema.parse(request.query ?? {});
      await requireCoachFinanceActor(authUserId);
      const invoices = await listAccessibleInvoices(authUserId, false, {
        ...query,
        coachId: authUserId,
      });
      await recordAuditEvent({
        request,
        action: "coach_invoices.read",
        resourceType: "invoice",
        resourceId: authUserId,
        subjectUserId: authUserId,
        result: "SUCCESS",
        sensitiveRead: true,
        metadata: {
          total: invoices.length,
          status: query.status ?? null,
          bookingId: query.bookingId ?? null,
        },
      });
      return reply.send({
        invoices,
        total: invoices.length,
        requestId: request.requestId,
      });
    } catch (error) {
      await recordAuditEvent({
        request,
        action: "coach_invoices.read",
        resourceType: "invoice",
        resourceId: authUserId ?? null,
        subjectUserId: authUserId ?? request.auth?.userId ?? null,
        result: mutationAuditResult(error),
        sensitiveRead: true,
        metadata: {
          errorCode: mutationAuditErrorCode(error),
        },
      });
      throw error;
    }
  });
  app.get("/coaches/me/payment-instructions", async (request, reply) => {
    try {
      const authUserId = requireAuthUserId(request.auth?.userId);
      const repository = resolveCoachPaymentInstructionsRepository();
      const instructions = await repository.get(authUserId);
      await recordCoachPaymentInstructionsAudit({
        request,
        action: "coach_payment_instructions.read",
        result: "SUCCESS",
        sensitiveRead: true,
      });
      return reply.send({
        instructions,
        requestId: request.requestId,
      });
    } catch (error) {
      await recordCoachPaymentInstructionsAudit({
        request,
        action: "coach_payment_instructions.read",
        result: mutationAuditResult(error),
        sensitiveRead: true,
        metadata: {
          errorCode: mutationAuditErrorCode(error),
        },
      });
      throw error;
    }
  });
  app.patch("/coaches/me/payment-instructions", async (request, reply) => {
    try {
      const authUserId = requireAuthUserId(request.auth?.userId);
      const body = coachPaymentInstructionsBodySchema.parse(request.body ?? {});
      const repository = resolveCoachPaymentInstructionsRepository();
      const instructions = await repository.update(authUserId, body);
      await recordCoachPaymentInstructionsAudit({
        request,
        action: "coach_payment_instructions.update",
        result: "SUCCESS",
        metadata: {
          changedFields: Object.keys(body),
        },
      });
      return reply.send({
        instructions,
        requestId: request.requestId,
      });
    } catch (error) {
      await recordCoachPaymentInstructionsAudit({
        request,
        action: "coach_payment_instructions.update",
        result: mutationAuditResult(error),
        metadata: {
          errorCode: mutationAuditErrorCode(error),
        },
      });
      throw error;
    }
  });
  app.get("/coaches/me/payout-methods", async (request, reply) => {
    try {
      const authUserId = requireAuthUserId(request.auth?.userId);
      assertCoachMoneyDbAuthorityAvailable();
      await requireCoachFinanceActor(authUserId);
      const payoutMethods = await listPayoutMethods(authUserId);
      await recordCoachPayoutAudit({
        request,
        action: "coach_payout_methods.read",
        result: "SUCCESS",
        sensitiveRead: true,
        metadata: {
          provider: SIMULATED_PAYOUT_PROVIDER,
          providerConfigured: false,
          total: payoutMethods.length,
        },
      });
      return reply.send({
        payoutMethods,
        total: payoutMethods.length,
        provider: SIMULATED_PAYOUT_PROVIDER,
        providerConfigured: false,
        requestId: request.requestId,
      });
    } catch (error) {
      await recordCoachPayoutAudit({
        request,
        action: "coach_payout_methods.read",
        result: mutationAuditResult(error),
        sensitiveRead: true,
        metadata: {
          errorCode: mutationAuditErrorCode(error),
        },
      });
      throw error;
    }
  });
  app.post("/coaches/me/payout-methods", async (request) => {
    let methodId: string | undefined;
    try {
      const authUserId = requireAuthUserId(request.auth?.userId);
      assertCoachMoneyDbAuthorityAvailable();
      const body = payoutMethodBodySchema.parse(request.body ?? {});
      await requireCoachFinanceActor(authUserId);
      const payoutMethod = await createPayoutMethod(authUserId, body);
      methodId = payoutMethod.id;
      const payoutMethods = await listPayoutMethods(authUserId);
      await recordCoachPayoutAudit({
        request,
        action: "coach_payout_methods.create",
        resourceId: payoutMethod.id,
        result: "SUCCESS",
        metadata: {
          methodType: body.type,
          provider: SIMULATED_PAYOUT_PROVIDER,
          providerConfigured: false,
        },
      });
      return {
        payoutMethod,
        payoutMethods,
        total: payoutMethods.length,
        provider: SIMULATED_PAYOUT_PROVIDER,
        providerConfigured: false,
        requestId: request.requestId,
      };
    } catch (error) {
      await recordCoachPayoutAudit({
        request,
        action: "coach_payout_methods.create",
        resourceId: methodId,
        result: mutationAuditResult(error),
        metadata: {
          errorCode: mutationAuditErrorCode(error),
        },
      });
      throw error;
    }
  });
  app.delete("/coaches/me/payout-methods/:methodId", async (request) => {
    let methodId: string | undefined;
    try {
      const authUserId = requireAuthUserId(request.auth?.userId);
      assertCoachMoneyDbAuthorityAvailable();
      const params = payoutMethodParamsSchema.parse(request.params ?? {});
      methodId = params.methodId;
      await requireCoachFinanceActor(authUserId);
      await removePayoutMethod(authUserId, params.methodId);
      const payoutMethods = await listPayoutMethods(authUserId);
      await recordCoachPayoutAudit({
        request,
        action: "coach_payout_methods.remove",
        resourceId: params.methodId,
        result: "SUCCESS",
        metadata: {
          provider: SIMULATED_PAYOUT_PROVIDER,
          providerConfigured: false,
        },
      });
      return {
        payoutMethods,
        total: payoutMethods.length,
        provider: SIMULATED_PAYOUT_PROVIDER,
        providerConfigured: false,
        requestId: request.requestId,
      };
    } catch (error) {
      await recordCoachPayoutAudit({
        request,
        action: "coach_payout_methods.remove",
        resourceId: methodId,
        result: mutationAuditResult(error),
        metadata: {
          errorCode: mutationAuditErrorCode(error),
        },
      });
      throw error;
    }
  });
  app.patch("/coaches/me/payout-methods/:methodId/default", async (request) => {
    let methodId: string | undefined;
    try {
      const authUserId = requireAuthUserId(request.auth?.userId);
      assertCoachMoneyDbAuthorityAvailable();
      const params = payoutMethodParamsSchema.parse(request.params ?? {});
      methodId = params.methodId;
      await requireCoachFinanceActor(authUserId);
      const payoutMethod = await setDefaultPayoutMethod(authUserId, params.methodId);
      const payoutMethods = await listPayoutMethods(authUserId);
      await recordCoachPayoutAudit({
        request,
        action: "coach_payout_methods.set_default",
        resourceId: params.methodId,
        result: "SUCCESS",
        metadata: {
          provider: SIMULATED_PAYOUT_PROVIDER,
          providerConfigured: false,
        },
      });
      return {
        payoutMethod,
        payoutMethods,
        total: payoutMethods.length,
        provider: SIMULATED_PAYOUT_PROVIDER,
        providerConfigured: false,
        requestId: request.requestId,
      };
    } catch (error) {
      await recordCoachPayoutAudit({
        request,
        action: "coach_payout_methods.set_default",
        resourceId: methodId,
        result: mutationAuditResult(error),
        metadata: {
          errorCode: mutationAuditErrorCode(error),
        },
      });
      throw error;
    }
  });
  app.get("/coaches/me/withdrawals", async (request, reply) => {
    try {
      const authUserId = requireAuthUserId(request.auth?.userId);
      assertCoachMoneyDbAuthorityAvailable();
      const query = withdrawalQuerySchema.parse(request.query ?? {});
      await requireCoachFinanceActor(authUserId);
      const withdrawals = await listWithdrawals(authUserId, query.status);
      await recordCoachPayoutAudit({
        request,
        action: "coach_withdrawals.read",
        result: "SUCCESS",
        sensitiveRead: true,
        metadata: {
          status: query.status ?? "all",
          provider: SIMULATED_PAYOUT_PROVIDER,
          providerConfigured: false,
          total: withdrawals.length,
        },
      });
      return reply.send({
        withdrawals,
        total: withdrawals.length,
        status: query.status ?? "all",
        provider: SIMULATED_PAYOUT_PROVIDER,
        providerConfigured: false,
        requestId: request.requestId,
      });
    } catch (error) {
      await recordCoachPayoutAudit({
        request,
        action: "coach_withdrawals.read",
        result: mutationAuditResult(error),
        sensitiveRead: true,
        metadata: {
          errorCode: mutationAuditErrorCode(error),
        },
      });
      throw error;
    }
  });
  app.post("/coaches/me/withdrawals", async (request) => {
    let withdrawalId: string | undefined;
    try {
      const authUserId = requireAuthUserId(request.auth?.userId);
      assertCoachMoneyDbAuthorityAvailable();
      const body = withdrawalBodySchema.parse(request.body ?? {});
      await requireCoachFinanceActor(authUserId);
      const withdrawal = await requestWithdrawal(authUserId, body);
      withdrawalId = withdrawal.id;
      const withdrawals = await listWithdrawals(authUserId);
      await recordCoachPayoutAudit({
        request,
        action: "coach_withdrawals.create",
        resourceId: withdrawal.id,
        result: "SUCCESS",
        metadata: {
          amount: body.amount,
          payoutMethodId: body.payoutMethodId,
          provider: SIMULATED_PAYOUT_PROVIDER,
          providerConfigured: false,
        },
      });
      return {
        withdrawal,
        withdrawals,
        total: withdrawals.length,
        status: "all",
        provider: SIMULATED_PAYOUT_PROVIDER,
        providerConfigured: false,
        requestId: request.requestId,
      };
    } catch (error) {
      await recordCoachPayoutAudit({
        request,
        action: "coach_withdrawals.create",
        resourceId: withdrawalId,
        result: mutationAuditResult(error),
        metadata: {
          errorCode: mutationAuditErrorCode(error),
        },
      });
      throw error;
    }
  });
  app.post("/coaches/me/withdrawals/:withdrawalId/cancel", async (request) => {
    let withdrawalId: string | undefined;
    try {
      const authUserId = requireAuthUserId(request.auth?.userId);
      assertCoachMoneyDbAuthorityAvailable();
      const params = withdrawalParamsSchema.parse(request.params ?? {});
      withdrawalId = params.withdrawalId;
      await requireCoachFinanceActor(authUserId);
      const withdrawal = await updateWithdrawalStatus(
        authUserId,
        params.withdrawalId,
        "CANCELLED",
      );
      const withdrawals = await listWithdrawals(authUserId);
      await recordCoachPayoutAudit({
        request,
        action: "coach_withdrawals.cancel",
        resourceId: params.withdrawalId,
        result: "SUCCESS",
        metadata: {
          provider: SIMULATED_PAYOUT_PROVIDER,
          providerConfigured: false,
        },
      });
      return {
        withdrawal,
        withdrawals,
        total: withdrawals.length,
        status: "all",
        provider: SIMULATED_PAYOUT_PROVIDER,
        providerConfigured: false,
        requestId: request.requestId,
      };
    } catch (error) {
      await recordCoachPayoutAudit({
        request,
        action: "coach_withdrawals.cancel",
        resourceId: withdrawalId,
        result: mutationAuditResult(error),
        metadata: {
          errorCode: mutationAuditErrorCode(error),
        },
      });
      throw error;
    }
  });
  app.post("/coaches/me/withdrawals/:withdrawalId/complete", async (request) => {
    let withdrawalId: string | undefined;
    try {
      const authUserId = requireAuthUserId(request.auth?.userId);
      assertCoachMoneyDbAuthorityAvailable();
      const params = withdrawalParamsSchema.parse(request.params ?? {});
      withdrawalId = params.withdrawalId;
      await requireCoachFinanceActor(authUserId);
      const withdrawal = await updateWithdrawalStatus(
        authUserId,
        params.withdrawalId,
        "COMPLETED",
      );
      const withdrawals = await listWithdrawals(authUserId);
      await recordCoachPayoutAudit({
        request,
        action: "coach_withdrawals.complete",
        resourceId: params.withdrawalId,
        result: "SUCCESS",
        metadata: {
          provider: SIMULATED_PAYOUT_PROVIDER,
          providerConfigured: false,
          status: withdrawal.status,
        },
      });
      return {
        withdrawal,
        withdrawals,
        total: withdrawals.length,
        status: "all",
        provider: SIMULATED_PAYOUT_PROVIDER,
        providerConfigured: false,
        requestId: request.requestId,
      };
    } catch (error) {
      await recordCoachPayoutAudit({
        request,
        action: "coach_withdrawals.complete",
        resourceId: withdrawalId,
        result: mutationAuditResult(error),
        metadata: {
          errorCode: mutationAuditErrorCode(error),
        },
      });
      throw error;
    }
  });
  app.post("/coaches/me/session-templates", async (request, reply) => {
    const repository = resolveCoachSessionTemplateRepository();
    let templateId: string | undefined;
    try {
      const authUserId = requireAuthUserId(request.auth?.userId);
      const body = coachSessionTemplateBodySchema.parse(request.body ?? {});
      const template = await repository.create(authUserId, body);
      templateId = template.id;
      await recordCoachSessionTemplateAudit({
        request,
        action: "coach_session_template.create",
        templateId,
        result: "SUCCESS",
        metadata: {
          fields: Object.keys(body),
        },
      });
      return reply.code(201).send({
        template,
        requestId: request.requestId,
      });
    } catch (error) {
      await recordCoachSessionTemplateAudit({
        request,
        action: "coach_session_template.create",
        templateId,
        result: mutationAuditResult(error),
        metadata: {
          errorCode: mutationAuditErrorCode(error),
        },
      });
      throw error;
    }
  });
  app.patch("/coaches/me/session-templates/:templateId", async (request, reply) => {
    const { templateId } = coachSessionTemplateParamsSchema.parse(request.params);
    const repository = resolveCoachSessionTemplateRepository();
    try {
      const authUserId = requireAuthUserId(request.auth?.userId);
      const body = coachSessionTemplatePatchSchema.parse(request.body ?? {});
      const template = await repository.update(authUserId, templateId, body);
      await recordCoachSessionTemplateAudit({
        request,
        action: "coach_session_template.update",
        templateId,
        result: "SUCCESS",
        metadata: {
          fields: Object.keys(body),
        },
      });
      return reply.send({
        template,
        requestId: request.requestId,
      });
    } catch (error) {
      await recordCoachSessionTemplateAudit({
        request,
        action: "coach_session_template.update",
        templateId,
        result: mutationAuditResult(error),
        metadata: {
          errorCode: mutationAuditErrorCode(error),
        },
      });
      throw error;
    }
  });
  app.delete("/coaches/me/session-templates/:templateId", async (request, reply) => {
    const { templateId } = coachSessionTemplateParamsSchema.parse(request.params);
    const repository = resolveCoachSessionTemplateRepository();
    try {
      const authUserId = requireAuthUserId(request.auth?.userId);
      await repository.delete(authUserId, templateId);
      await recordCoachSessionTemplateAudit({
        request,
        action: "coach_session_template.archive",
        templateId,
        result: "SUCCESS",
      });
      return reply.code(204).send();
    } catch (error) {
      await recordCoachSessionTemplateAudit({
        request,
        action: "coach_session_template.archive",
        templateId,
        result: mutationAuditResult(error),
        metadata: {
          errorCode: mutationAuditErrorCode(error),
        },
      });
      throw error;
    }
  });
  app.get("/coaches/offerings", async (request, reply) => {
    requireAuthUserId(request.auth?.userId);
    const repository = resolveCoachSelfRepository();
    const result = await repository.listPublicOfferingIndex();
    return reply.send({
      offerings: result.offerings,
      total: result.offerings.length,
      seedVersion: result.dataVersion,
      requestId: request.requestId,
    });
  });
  app.get("/coaches/search", async (request, reply) => {
    requireAuthUserId(request.auth?.userId);
    const query = coachPublicSearchQuerySchema.parse(request.query ?? {});
    const repository = resolveCoachSelfRepository();
    const result = await repository.searchPublicCoaches({
      query: query.query || undefined,
      priceMinMinor:
        query.priceMin == null ? undefined : Math.round(query.priceMin * 100),
      priceMaxMinor:
        query.priceMax == null ? undefined : Math.round(query.priceMax * 100),
      rating: query.rating,
      sports: query.sports,
      focuses: query.focuses,
      formats: query.formats,
      languages: query.languages,
      location:
        query.lat != null && query.lng != null
          ? {
              lat: query.lat,
              lng: query.lng,
              radiusKm: query.radiusKm,
            }
          : undefined,
      sortBy: query.sortBy as PublicCoachSearchSort,
      page: query.page,
      pageSize: query.pageSize,
    });
    return reply.send({
      results: result.results,
      offerings: result.offerings,
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
      hasMore: result.hasMore,
      filterOptions: result.filterOptions,
      seedVersion: result.dataVersion,
      requestId: request.requestId,
    });
  });
  app.get("/coaches/:coachId/profile", async (request, reply) => {
    requireAuthUserId(request.auth?.userId);
    const { coachId } = favouriteCoachParamsSchema.parse(request.params);
    const repository = resolveCoachSelfRepository();
    const result = await repository.getPublicProfile(coachId);
    return reply.send({
      coachId,
      coachProfile: result.coachProfile,
      offerings: result.offerings,
      total: result.offerings.length,
      seedVersion: result.dataVersion,
      requestId: request.requestId,
    });
  });
  app.get("/coaches/:coachId/offerings", async (request, reply) => {
    requireAuthUserId(request.auth?.userId);
    const { coachId } = favouriteCoachParamsSchema.parse(request.params);
    const repository = resolveCoachSelfRepository();
    const result = await repository.listPublicOfferings(coachId);
    return reply.send({
      coachId,
      offerings: result.offerings,
      total: result.offerings.length,
      seedVersion: result.dataVersion,
      requestId: request.requestId,
    });
  });
  app.get("/me/favourite-coaches", async (request, reply) => {
    const authUserId = requireAuthUserId(request.auth?.userId);
    const repository = resolveCoachFavouriteRepository();
    const result = await repository.listForUser(authUserId);
    return reply.send({
      favourites: result.favourites,
      total: result.favourites.length,
      seedVersion: result.dataVersion,
      requestId: request.requestId,
    });
  });
  app.get("/me/favourite-coaches/:coachId", async (request, reply) => {
    const authUserId = requireAuthUserId(request.auth?.userId);
    const { coachId } = favouriteCoachParamsSchema.parse(request.params);
    const repository = resolveCoachFavouriteRepository();
    const result = await repository.getStatus(authUserId, coachId);
    return reply.send({
      coachId,
      isFavourite: result.isFavourite,
      favourite: result.favourite,
      requestId: request.requestId,
    });
  });
  app.post("/me/favourite-coaches/:coachId", async (request, reply) => {
    const authUserId = requireAuthUserId(request.auth?.userId);
    const { coachId } = favouriteCoachParamsSchema.parse(request.params);
    const body = favouriteCoachBodySchema.parse(request.body ?? {});
    const repository = resolveCoachFavouriteRepository();
    try {
      if (coachId === authUserId) {
        throw forbidden("You cannot save your own coach profile");
      }
      const favourite = await repository.saveForUser({
        userId: authUserId,
        coachUserId: coachId,
        note: body.note,
      });
      await recordCoachFavouriteAudit({
        request,
        action: "coach_favourite.save",
        coachId,
        result: "SUCCESS",
        metadata: {
          ignoredBodyUserId: body.userId ?? null,
        },
      });
      return reply.code(201).send({
        favourite,
        isFavourite: true,
        requestId: request.requestId,
      });
    } catch (error) {
      await recordCoachFavouriteAudit({
        request,
        action: "coach_favourite.save",
        coachId,
        result:
          error instanceof ApiProblemError && error.status < 500
            ? "DENY"
            : "ERROR",
        metadata: {
          ignoredBodyUserId: body.userId ?? null,
          errorCode:
            error instanceof ApiProblemError ? error.code : "INTERNAL_ERROR",
        },
      });
      throw error;
    }
  });
  app.delete("/me/favourite-coaches/:coachId", async (request, reply) => {
    const authUserId = requireAuthUserId(request.auth?.userId);
    const { coachId } = favouriteCoachParamsSchema.parse(request.params);
    const repository = resolveCoachFavouriteRepository();
    try {
      const favourite = await repository.removeForUser(authUserId, coachId);
      await recordCoachFavouriteAudit({
        request,
        action: "coach_favourite.remove",
        coachId,
        result: "SUCCESS",
      });
      return reply.send({
        favourite,
        isFavourite: false,
        requestId: request.requestId,
      });
    } catch (error) {
      await recordCoachFavouriteAudit({
        request,
        action: "coach_favourite.remove",
        coachId,
        result:
          error instanceof ApiProblemError && error.status < 500
            ? "DENY"
            : "ERROR",
        metadata: {
          errorCode:
            error instanceof ApiProblemError ? error.code : "INTERNAL_ERROR",
        },
      });
      throw error;
    }
  });
  app.get("/coaches/me/availability/templates", async (request, reply) => {
    const authUserId = requireAuthUserId(request.auth?.userId);
    try {
      await requireActiveCoachProfile(authUserId);
      const repository = resolveCoachSelfRepository();
      const result = await repository.listAvailabilityTemplateRows(authUserId);
      const templates = result.templates.map(mapAvailabilityTemplate);
      await recordSelfAvailabilityAudit({
        request,
        action: "coach_availability_template.read",
        resourceType: "coach_availability_template",
        resourceId: authUserId,
        coachId: authUserId,
        result: "SUCCESS",
        metadata: {
          count: templates.length,
        },
      });
      return reply.send({
        templates,
        total: templates.length,
        seedVersion: result.dataVersion,
        requestId: request.requestId,
      });
    } catch (error) {
      await recordSelfAvailabilityAudit({
        request,
        action: "coach_availability_template.read",
        resourceType: "coach_availability_template",
        resourceId: authUserId,
        coachId: authUserId,
        result: mutationAuditResult(error),
        metadata: {
          errorCode: mutationAuditErrorCode(error),
        },
      });
      throw error;
    }
  });
  app.post("/coaches/me/availability/templates", async (request, reply) => {
    const authUserId = requireAuthUserId(request.auth?.userId);
    const body = request.body as {
      id?: string;
      dayOfWeek: number;
      startTime: string;
      endTime: string;
      isRecurring?: boolean;
      maxConcurrent?: number;
      bufferMinutes?: number;
      location?: string;
      sessionTemplateId?: string;
    };
    let templateId: string | undefined;
    try {
      await requireActiveCoachProfile(authUserId);
      const repository = resolveCoachSelfRepository();
      const { row, dataVersion } = await repository.createAvailabilityTemplate(
        authUserId,
        body,
      );
      templateId = asString(row.id);
      await recordSelfAvailabilityAudit({
        request,
        action: "coach_availability_template.create",
        resourceType: "coach_availability_template",
        resourceId: templateId ?? null,
        coachId: authUserId,
        result: "SUCCESS",
        metadata: {
          fields: Object.keys(body),
        },
      });
      return reply.code(201).send({
        ...mapAvailabilityTemplate(row),
        seedVersion: dataVersion,
      });
    } catch (error) {
      await recordSelfAvailabilityAudit({
        request,
        action: "coach_availability_template.create",
        resourceType: "coach_availability_template",
        resourceId: templateId ?? null,
        coachId: authUserId,
        result: mutationAuditResult(error),
        metadata: {
          fields: Object.keys(body),
          errorCode: mutationAuditErrorCode(error),
        },
      });
      throw error;
    }
  });
  app.patch(
    "/coaches/me/availability/templates/:templateId",
    async (request, reply) => {
      const authUserId = requireAuthUserId(request.auth?.userId);
      const templateId =
        asString(
          (
            request.params as {
              templateId?: string;
            }
          ).templateId,
        ) ?? "";
      const body = request.body as {
        dayOfWeek?: number;
        startTime?: string;
        endTime?: string;
        maxConcurrent?: number;
        bufferMinutes?: number;
        location?: string;
        sessionTemplateId?: string;
      };
      try {
        await requireActiveCoachProfile(authUserId);
        const repository = resolveCoachSelfRepository();
        const { row } = await repository.updateAvailabilityTemplate(
          authUserId,
          templateId,
          body,
        );
        await recordSelfAvailabilityAudit({
          request,
          action: "coach_availability_template.update",
          resourceType: "coach_availability_template",
          resourceId: templateId || null,
          coachId: authUserId,
          result: "SUCCESS",
          metadata: {
            fields: Object.keys(body),
          },
        });
        return reply.send(mapAvailabilityTemplate(row));
      } catch (error) {
        await recordSelfAvailabilityAudit({
          request,
          action: "coach_availability_template.update",
          resourceType: "coach_availability_template",
          resourceId: templateId || null,
          coachId: authUserId,
          result: mutationAuditResult(error),
          metadata: {
            fields: Object.keys(body),
            errorCode: mutationAuditErrorCode(error),
          },
        });
        throw error;
      }
    },
  );
  app.delete(
    "/coaches/me/availability/templates/:templateId",
    async (request, reply) => {
      const authUserId = requireAuthUserId(request.auth?.userId);
      const templateId =
        asString(
          (
            request.params as {
              templateId?: string;
            }
          ).templateId,
        ) ?? "";
      try {
        await requireActiveCoachProfile(authUserId);
        const repository = resolveCoachSelfRepository();
        await repository.deleteAvailabilityTemplate(authUserId, templateId);
        await recordSelfAvailabilityAudit({
          request,
          action: "coach_availability_template.remove",
          resourceType: "coach_availability_template",
          resourceId: templateId || null,
          coachId: authUserId,
          result: "SUCCESS",
        });
        return reply.code(204).send();
      } catch (error) {
        await recordSelfAvailabilityAudit({
          request,
          action: "coach_availability_template.remove",
          resourceType: "coach_availability_template",
          resourceId: templateId || null,
          coachId: authUserId,
          result: mutationAuditResult(error),
          metadata: {
            errorCode: mutationAuditErrorCode(error),
          },
        });
        throw error;
      }
    },
  );
  app.get("/coaches/me/availability/overrides", async (request, reply) => {
    const authUserId = requireAuthUserId(request.auth?.userId);
    const query = request.query as {
      start?: string;
      end?: string;
    };
    try {
      await requireActiveCoachProfile(authUserId);
      const repository = resolveCoachSelfRepository();
      const result = await repository.listAvailabilityOverrideRows(
        authUserId,
        query,
      );
      const overrides = result.overrides.flatMap((item) => {
        const mapped = mapAvailabilityOverride(item);
        return (!query.start || mapped.date >= query.start) &&
          (!query.end || mapped.date <= query.end)
          ? [mapped]
          : [];
      });
      await recordSelfAvailabilityAudit({
        request,
        action: "coach_availability_override.read",
        resourceType: "coach_availability_override",
        resourceId: authUserId,
        coachId: authUserId,
        result: "SUCCESS",
        metadata: {
          count: overrides.length,
          filtered: Boolean(query.start || query.end),
        },
      });
      return reply.send({
        overrides,
        total: overrides.length,
        seedVersion: result.dataVersion,
        requestId: request.requestId,
      });
    } catch (error) {
      await recordSelfAvailabilityAudit({
        request,
        action: "coach_availability_override.read",
        resourceType: "coach_availability_override",
        resourceId: authUserId,
        coachId: authUserId,
        result: mutationAuditResult(error),
        metadata: {
          filtered: Boolean(query.start || query.end),
          errorCode: mutationAuditErrorCode(error),
        },
      });
      throw error;
    }
  });
  app.post("/coaches/me/availability/overrides", async (request, reply) => {
    const authUserId = requireAuthUserId(request.auth?.userId);
    const body = request.body as {
      id?: string;
      date: string;
      isBlocked: boolean;
      reason?: string;
      customSlots?: Array<{
        startTime: string;
        endTime: string;
        location?: string;
      }>;
      repeatUntil?: string;
      repeatDayOfWeek?: number;
      repeatGroupId?: string;
    };
    let overrideId: string | undefined;
    try {
      await requireActiveCoachProfile(authUserId);
      const repository = resolveCoachSelfRepository();
      const { row } = await repository.createAvailabilityOverride(
        authUserId,
        body,
      );
      overrideId = asString(row.id);
      await recordSelfAvailabilityAudit({
        request,
        action: "coach_availability_override.create",
        resourceType: "coach_availability_override",
        resourceId: overrideId ?? null,
        coachId: authUserId,
        result: "SUCCESS",
        metadata: {
          fields: Object.keys(body),
        },
      });
      return reply.code(201).send(mapAvailabilityOverride(row));
    } catch (error) {
      await recordSelfAvailabilityAudit({
        request,
        action: "coach_availability_override.create",
        resourceType: "coach_availability_override",
        resourceId: overrideId ?? null,
        coachId: authUserId,
        result: mutationAuditResult(error),
        metadata: {
          fields: Object.keys(body),
          errorCode: mutationAuditErrorCode(error),
        },
      });
      throw error;
    }
  });
  app.patch(
    "/coaches/me/availability/overrides/:overrideId",
    async (request, reply) => {
      const authUserId = requireAuthUserId(request.auth?.userId);
      const overrideId =
        asString(
          (
            request.params as {
              overrideId?: string;
            }
          ).overrideId,
        ) ?? "";
      const body = request.body as {
        date?: string;
        isBlocked?: boolean;
        reason?: string;
        customSlots?: Array<{
          startTime: string;
          endTime: string;
          location?: string;
        }>;
        repeatUntil?: string;
        repeatDayOfWeek?: number;
        repeatGroupId?: string;
      };
      try {
        await requireActiveCoachProfile(authUserId);
        const repository = resolveCoachSelfRepository();
        const { row } = await repository.updateAvailabilityOverride(
          authUserId,
          overrideId,
          body,
        );
        await recordSelfAvailabilityAudit({
          request,
          action: "coach_availability_override.update",
          resourceType: "coach_availability_override",
          resourceId: overrideId || null,
          coachId: authUserId,
          result: "SUCCESS",
          metadata: {
            fields: Object.keys(body),
          },
        });
        return reply.send(mapAvailabilityOverride(row));
      } catch (error) {
        await recordSelfAvailabilityAudit({
          request,
          action: "coach_availability_override.update",
          resourceType: "coach_availability_override",
          resourceId: overrideId || null,
          coachId: authUserId,
          result: mutationAuditResult(error),
          metadata: {
            fields: Object.keys(body),
            errorCode: mutationAuditErrorCode(error),
          },
        });
        throw error;
      }
    },
  );
  app.delete(
    "/coaches/me/availability/overrides/:overrideId",
    async (request, reply) => {
      const authUserId = requireAuthUserId(request.auth?.userId);
      const overrideId =
        asString(
          (
            request.params as {
              overrideId?: string;
            }
          ).overrideId,
        ) ?? "";
      try {
        await requireActiveCoachProfile(authUserId);
        const repository = resolveCoachSelfRepository();
        await repository.deleteAvailabilityOverride(authUserId, overrideId);
        await recordSelfAvailabilityAudit({
          request,
          action: "coach_availability_override.remove",
          resourceType: "coach_availability_override",
          resourceId: overrideId || null,
          coachId: authUserId,
          result: "SUCCESS",
        });
        return reply.code(204).send();
      } catch (error) {
        await recordSelfAvailabilityAudit({
          request,
          action: "coach_availability_override.remove",
          resourceType: "coach_availability_override",
          resourceId: overrideId || null,
          coachId: authUserId,
          result: mutationAuditResult(error),
          metadata: {
            errorCode: mutationAuditErrorCode(error),
          },
        });
        throw error;
      }
    },
  );
  app.get("/coaches/:coachId/availability/templates", async (request, reply) => {
    const { coachId } = coachAnalyticsParamsSchema.parse(request.params ?? {});
    const authUserId = requireAuthUserId(request.auth?.userId);
    try {
      assertCanManageCoachAvailability(request, authUserId, coachId);
      const repository = resolveCoachSelfRepository();
      const result = await repository.listAvailabilityTemplateRows(coachId);
      const templates = result.templates.map(mapAvailabilityTemplate);
      await recordDelegatedAvailabilityAudit({
        request,
        action: "coach_availability_template.delegated_read",
        resourceType: "coach_availability_template",
        coachId,
        result: "SUCCESS",
        metadata: {
          count: templates.length,
        },
      });
      return reply.send({
        coachId,
        templates,
        total: templates.length,
        seedVersion: result.dataVersion,
        requestId: request.requestId,
      });
    } catch (error) {
      await recordDelegatedAvailabilityAudit({
        request,
        action: "coach_availability_template.delegated_read",
        resourceType: "coach_availability_template",
        coachId,
        result: mutationAuditResult(error),
        metadata: {
          errorCode: mutationAuditErrorCode(error),
        },
      });
      throw error;
    }
  });
  app.post("/coaches/:coachId/availability/templates", async (request, reply) => {
    const { coachId } = coachAnalyticsParamsSchema.parse(request.params ?? {});
    const authUserId = requireAuthUserId(request.auth?.userId);
    const body = request.body as {
      id?: string;
      dayOfWeek: number;
      startTime: string;
      endTime: string;
      maxConcurrent?: number;
      bufferMinutes?: number;
      location?: string;
      sessionTemplateId?: string;
    };
    let templateId: string | undefined;
    try {
      assertCanManageCoachAvailability(request, authUserId, coachId);
      const repository = resolveCoachSelfRepository();
      const { row, dataVersion } = await repository.createAvailabilityTemplate(
        coachId,
        body,
        authUserId,
      );
      templateId = asString(row.id);
      await recordDelegatedAvailabilityAudit({
        request,
        action: "coach_availability_template.delegated_create",
        resourceType: "coach_availability_template",
        resourceId: templateId ?? null,
        coachId,
        result: "SUCCESS",
        metadata: {
          fields: Object.keys(body),
        },
      });
      return reply.code(201).send({
        ...mapAvailabilityTemplate(row),
        seedVersion: dataVersion,
        requestId: request.requestId,
      });
    } catch (error) {
      await recordDelegatedAvailabilityAudit({
        request,
        action: "coach_availability_template.delegated_create",
        resourceType: "coach_availability_template",
        resourceId: templateId ?? null,
        coachId,
        result: mutationAuditResult(error),
        metadata: {
          errorCode: mutationAuditErrorCode(error),
        },
      });
      throw error;
    }
  });
  app.patch(
    "/coaches/:coachId/availability/templates/:templateId",
    async (request, reply) => {
      const { coachId, templateId } = delegatedAvailabilityTemplateParamsSchema.parse(
        request.params ?? {},
      );
      const authUserId = requireAuthUserId(request.auth?.userId);
      const body = request.body as {
        dayOfWeek?: number;
        startTime?: string;
        endTime?: string;
        maxConcurrent?: number;
        bufferMinutes?: number;
        location?: string;
        sessionTemplateId?: string;
      };
      try {
        assertCanManageCoachAvailability(request, authUserId, coachId);
        const repository = resolveCoachSelfRepository();
        const { row, dataVersion } = await repository.updateAvailabilityTemplate(
          coachId,
          templateId,
          body,
          authUserId,
        );
        await recordDelegatedAvailabilityAudit({
          request,
          action: "coach_availability_template.delegated_update",
          resourceType: "coach_availability_template",
          resourceId: templateId,
          coachId,
          result: "SUCCESS",
          metadata: {
            fields: Object.keys(body),
          },
        });
        return reply.send({
          ...mapAvailabilityTemplate(row),
          seedVersion: dataVersion,
          requestId: request.requestId,
        });
      } catch (error) {
        await recordDelegatedAvailabilityAudit({
          request,
          action: "coach_availability_template.delegated_update",
          resourceType: "coach_availability_template",
          resourceId: templateId,
          coachId,
          result: mutationAuditResult(error),
          metadata: {
            errorCode: mutationAuditErrorCode(error),
          },
        });
        throw error;
      }
    },
  );
  app.delete(
    "/coaches/:coachId/availability/templates/:templateId",
    async (request, reply) => {
      const { coachId, templateId } = delegatedAvailabilityTemplateParamsSchema.parse(
        request.params ?? {},
      );
      const authUserId = requireAuthUserId(request.auth?.userId);
      try {
        assertCanManageCoachAvailability(request, authUserId, coachId);
        const repository = resolveCoachSelfRepository();
        await repository.deleteAvailabilityTemplate(coachId, templateId, authUserId);
        await recordDelegatedAvailabilityAudit({
          request,
          action: "coach_availability_template.delegated_remove",
          resourceType: "coach_availability_template",
          resourceId: templateId,
          coachId,
          result: "SUCCESS",
        });
        return reply.code(204).send();
      } catch (error) {
        await recordDelegatedAvailabilityAudit({
          request,
          action: "coach_availability_template.delegated_remove",
          resourceType: "coach_availability_template",
          resourceId: templateId,
          coachId,
          result: mutationAuditResult(error),
          metadata: {
            errorCode: mutationAuditErrorCode(error),
          },
        });
        throw error;
      }
    },
  );
  app.get("/coaches/:coachId/availability/overrides", async (request, reply) => {
    const { coachId } = coachAnalyticsParamsSchema.parse(request.params ?? {});
    const authUserId = requireAuthUserId(request.auth?.userId);
    const query = request.query as {
      start?: string;
      end?: string;
    };
    try {
      assertCanManageCoachAvailability(request, authUserId, coachId);
      const repository = resolveCoachSelfRepository();
      const result = await repository.listAvailabilityOverrideRows(coachId, query);
      const overrides = result.overrides.map(mapAvailabilityOverride);
      await recordDelegatedAvailabilityAudit({
        request,
        action: "coach_availability_override.delegated_read",
        resourceType: "coach_availability_override",
        coachId,
        result: "SUCCESS",
        metadata: {
          count: overrides.length,
          start: query.start ?? null,
          end: query.end ?? null,
        },
      });
      return reply.send({
        coachId,
        overrides,
        total: overrides.length,
        seedVersion: result.dataVersion,
        requestId: request.requestId,
      });
    } catch (error) {
      await recordDelegatedAvailabilityAudit({
        request,
        action: "coach_availability_override.delegated_read",
        resourceType: "coach_availability_override",
        coachId,
        result: mutationAuditResult(error),
        metadata: {
          errorCode: mutationAuditErrorCode(error),
        },
      });
      throw error;
    }
  });
  app.post("/coaches/:coachId/availability/overrides", async (request, reply) => {
    const { coachId } = coachAnalyticsParamsSchema.parse(request.params ?? {});
    const authUserId = requireAuthUserId(request.auth?.userId);
    const body = request.body as {
      id?: string;
      date: string;
      isBlocked: boolean;
      reason?: string;
      customSlots?: Array<{
        startTime: string;
        endTime: string;
        location?: string;
      }>;
      repeatUntil?: string;
      repeatDayOfWeek?: number;
      repeatGroupId?: string;
    };
    let overrideId: string | undefined;
    try {
      assertCanManageCoachAvailability(request, authUserId, coachId);
      const repository = resolveCoachSelfRepository();
      const { row, dataVersion } = await repository.createAvailabilityOverride(
        coachId,
        body,
        authUserId,
      );
      overrideId = asString(row.id);
      await recordDelegatedAvailabilityAudit({
        request,
        action: "coach_availability_override.delegated_create",
        resourceType: "coach_availability_override",
        resourceId: overrideId ?? null,
        coachId,
        result: "SUCCESS",
        metadata: {
          fields: Object.keys(body),
        },
      });
      return reply.code(201).send({
        ...mapAvailabilityOverride(row),
        seedVersion: dataVersion,
        requestId: request.requestId,
      });
    } catch (error) {
      await recordDelegatedAvailabilityAudit({
        request,
        action: "coach_availability_override.delegated_create",
        resourceType: "coach_availability_override",
        resourceId: overrideId ?? null,
        coachId,
        result: mutationAuditResult(error),
        metadata: {
          errorCode: mutationAuditErrorCode(error),
        },
      });
      throw error;
    }
  });
  app.patch(
    "/coaches/:coachId/availability/overrides/:overrideId",
    async (request, reply) => {
      const { coachId, overrideId } = delegatedAvailabilityOverrideParamsSchema.parse(
        request.params ?? {},
      );
      const authUserId = requireAuthUserId(request.auth?.userId);
      const body = request.body as {
        date?: string;
        isBlocked?: boolean;
        reason?: string;
        customSlots?: Array<{
          startTime: string;
          endTime: string;
          location?: string;
        }>;
        repeatUntil?: string;
        repeatDayOfWeek?: number;
        repeatGroupId?: string;
      };
      try {
        assertCanManageCoachAvailability(request, authUserId, coachId);
        const repository = resolveCoachSelfRepository();
        const { row, dataVersion } = await repository.updateAvailabilityOverride(
          coachId,
          overrideId,
          body,
          authUserId,
        );
        await recordDelegatedAvailabilityAudit({
          request,
          action: "coach_availability_override.delegated_update",
          resourceType: "coach_availability_override",
          resourceId: overrideId,
          coachId,
          result: "SUCCESS",
          metadata: {
            fields: Object.keys(body),
          },
        });
        return reply.send({
          ...mapAvailabilityOverride(row),
          seedVersion: dataVersion,
          requestId: request.requestId,
        });
      } catch (error) {
        await recordDelegatedAvailabilityAudit({
          request,
          action: "coach_availability_override.delegated_update",
          resourceType: "coach_availability_override",
          resourceId: overrideId,
          coachId,
          result: mutationAuditResult(error),
          metadata: {
            errorCode: mutationAuditErrorCode(error),
          },
        });
        throw error;
      }
    },
  );
  app.delete(
    "/coaches/:coachId/availability/overrides/:overrideId",
    async (request, reply) => {
      const { coachId, overrideId } = delegatedAvailabilityOverrideParamsSchema.parse(
        request.params ?? {},
      );
      const authUserId = requireAuthUserId(request.auth?.userId);
      try {
        assertCanManageCoachAvailability(request, authUserId, coachId);
        const repository = resolveCoachSelfRepository();
        await repository.deleteAvailabilityOverride(coachId, overrideId, authUserId);
        await recordDelegatedAvailabilityAudit({
          request,
          action: "coach_availability_override.delegated_remove",
          resourceType: "coach_availability_override",
          resourceId: overrideId,
          coachId,
          result: "SUCCESS",
        });
        return reply.code(204).send();
      } catch (error) {
        await recordDelegatedAvailabilityAudit({
          request,
          action: "coach_availability_override.delegated_remove",
          resourceType: "coach_availability_override",
          resourceId: overrideId,
          coachId,
          result: mutationAuditResult(error),
          metadata: {
            errorCode: mutationAuditErrorCode(error),
          },
        });
        throw error;
      }
    },
  );
  app.get("/coaches/me/scheduling-rules", async (request, reply) => {
    const authUserId = requireAuthUserId(request.auth?.userId);
    const repository = resolveCoachSelfRepository();
    const result = await repository.getSchedulingRows(authUserId);
    const policy = mapCancellationPolicy(result.policyRows, authUserId);
    return reply.send({
      rules: mapCoachSchedulingRules(result.rulesRow, authUserId),
      cancellationPolicy: policy,
      seedVersion: result.dataVersion,
      requestId: request.requestId,
    });
  });
  app.get("/coaches/:coachId/scheduling-rules", async (request, reply) => {
    const authUserId = requireAuthUserId(request.auth?.userId);
    const { coachId } = coachAnalyticsParamsSchema.parse(request.params ?? {});
    try {
      await requireActiveCoachProfile(coachId);
      const repository = resolveCoachSelfRepository();
      const result = await repository.getSchedulingRows(coachId);
      const policy = mapCancellationPolicy(result.policyRows, coachId);
      await recordAuditEvent({
        request,
        action: "coach_scheduling_rules.read",
        resourceType: "coach_scheduling_rules",
        resourceId: coachId,
        subjectUserId: coachId,
        result: "SUCCESS",
        metadata: {
          viewerUserId: authUserId,
          hasCancellationPolicy: Boolean(policy),
        },
      });
      return reply.send({
        rules: mapCoachSchedulingRules(result.rulesRow, coachId),
        cancellationPolicy: policy,
        seedVersion: result.dataVersion,
        requestId: request.requestId,
      });
    } catch (error) {
      await recordAuditEvent({
        request,
        action: "coach_scheduling_rules.read",
        resourceType: "coach_scheduling_rules",
        resourceId: coachId,
        subjectUserId: coachId,
        result: mutationAuditResult(error),
        metadata: {
          viewerUserId: authUserId,
          errorCode: mutationAuditErrorCode(error),
        },
      });
      throw error;
    }
  });
  app.patch("/coaches/me/scheduling-rules", async (request, reply) => {
    const authUserId = requireAuthUserId(request.auth?.userId);
    const rawBody = request.body ?? {};
    let changedFields: string[] = [];
    try {
      const body: SchedulingRulesPatchBody = schedulingRulesPatchBodySchema.parse(rawBody);
      changedFields = Object.keys(body);
      const repository = resolveCoachSelfRepository();
      const result = await repository.patchSchedulingRows(authUserId, body);
      await recordAuditEvent({
        request,
        action: "coach_scheduling_rules.update",
        resourceType: "coach_scheduling_rules",
        resourceId: authUserId,
        subjectUserId: authUserId,
        result: "SUCCESS",
        metadata: { changedFields },
      });
      return reply.send({
        rules: mapCoachSchedulingRules(result.rulesRow, authUserId),
        cancellationPolicy: mapCancellationPolicy(result.policyRows, authUserId),
        seedVersion: result.dataVersion,
        requestId: request.requestId,
      });
    } catch (error) {
      await recordAuditEvent({
        request,
        action: "coach_scheduling_rules.update",
        resourceType: "coach_scheduling_rules",
        resourceId: authUserId,
        subjectUserId: authUserId,
        result: mutationAuditResult(error),
        metadata: {
          changedFields,
          errorCode: mutationAuditErrorCode(error),
        },
      });
      throw error;
    }
  });
  app.get("/coaches/:coachId/verification-status", async (request, reply) => {
    const authUserId = requireAuthUserId(request.auth?.userId);
    const coachUserId = asString(
      (
        request.params as {
          coachId?: string;
        }
      ).coachId,
    );
    if (!coachUserId) {
      throw notFound("Coach profile not found");
    }
    try {
      requireCoachVerificationViewer(request, coachUserId);
      const sources = await loadCoachVerificationSources(coachUserId);
      const status = buildCoachVerificationStatus({
        coachUserId,
        user: sources.user,
        profile: sources.profile,
        verifications: sources.verifications,
      });
      await recordAuditEvent({
        request,
        action: "coach_verification_status.read",
        resourceType: "coach_verification_status",
        resourceId: coachUserId,
        subjectUserId: coachUserId,
        result: "SUCCESS",
        sensitiveRead: true,
        metadata: {
          viewerUserId: authUserId,
          selfRead: authUserId === coachUserId,
        },
      });
      return reply.send({
        status,
        seedVersion: sources.dataVersion,
        requestId: request.requestId,
      });
    } catch (error) {
      await recordAuditEvent({
        request,
        action: "coach_verification_status.read",
        resourceType: "coach_verification_status",
        resourceId: coachUserId,
        subjectUserId: coachUserId,
        result: mutationAuditResult(error),
        sensitiveRead: true,
        metadata: {
          viewerUserId: authUserId,
          errorCode: mutationAuditErrorCode(error),
        },
      });
      throw error;
    }
  });
  app.get(
    "/coaches/me/verifications/:type/documents",
    async (request, reply) => {
      const authUserId = requireAuthUserId(request.auth?.userId);
      const requestedType = asString(
        (
          request.params as {
            type?: string;
          }
        ).type,
      )?.toLowerCase();
      if (!requestedType) {
        throw notFound("Verification type is required");
      }
      try {
        const documents = await listCoachVerificationDocumentBundles(
          authUserId,
          requestedType,
        );
        await recordAuditEvent({
          request,
          action: "coach_verification_documents.read",
          resourceType: "coach_verification_documents",
          resourceId: `${authUserId}:${documents.type}`,
          subjectUserId: authUserId,
          result: "SUCCESS",
          sensitiveRead: true,
          metadata: {
            verificationType: documents.type,
            total: documents.total,
          },
        });
        return reply.send({
          type: documents.type,
          items: documents.items,
          total: documents.total,
          seedVersion: documents.dataVersion,
          requestId: request.requestId,
        });
      } catch (error) {
        await recordAuditEvent({
          request,
          action: "coach_verification_documents.read",
          resourceType: "coach_verification_documents",
          resourceId: `${authUserId}:${requestedType}`,
          subjectUserId: authUserId,
          result: mutationAuditResult(error),
          sensitiveRead: true,
          metadata: {
            verificationType: requestedType,
            errorCode: mutationAuditErrorCode(error),
          },
        });
        throw error;
      }
    },
  );
  app.post(
    "/coaches/me/verifications/:type/documents",
    async (request, reply) => {
      const authUserId = requireAuthUserId(request.auth?.userId);
      const requestedType = asString(
        (
          request.params as {
            type?: string;
          }
        ).type,
      )?.toLowerCase();
      if (!requestedType) {
        throw notFound("Verification type is required");
      }
      let mediaObjectId: string | null = null;
      try {
        const body = coachVerificationDocumentBodySchema.parse(request.body ?? {});
        mediaObjectId = body.mediaObjectId;
        const result = await submitCoachVerificationDocument({
          authUserId,
          requestedType,
          mediaObjectId: body.mediaObjectId,
          fileLabel: body.fileLabel,
        });
        await recordAuditEvent({
          request,
          action: "coach_verification_documents.submit",
          resourceType: "coach_verification_documents",
          resourceId: `${authUserId}:${result.type}`,
          subjectUserId: authUserId,
          result: "SUCCESS",
          metadata: {
            verificationType: result.type,
            mediaObjectId,
            documentId: asString(result.document.id) ?? null,
          },
        });
        return reply.code(201).send({
          type: result.type,
          verification: result.verification,
          document: result.document,
          documents: result.documents,
          total: result.documents.length,
          seedVersion: result.dataVersion,
          requestId: request.requestId,
        });
      } catch (error) {
        await recordAuditEvent({
          request,
          action: "coach_verification_documents.submit",
          resourceType: "coach_verification_documents",
          resourceId: `${authUserId}:${requestedType}`,
          subjectUserId: authUserId,
          result: mutationAuditResult(error),
          metadata: {
            verificationType: requestedType,
            mediaObjectId,
            errorCode: mutationAuditErrorCode(error),
          },
        });
        throw error;
      }
    },
  );
  app.patch(
    "/coaches/:coachId/verifications/:type/review",
    async (request, reply) => {
      requireAuthUserId(request.auth?.userId);
      const coachUserId = asString(
        (
          request.params as {
            coachId?: string;
          }
        ).coachId,
      );
      const requestedType = asString(
        (
          request.params as {
            type?: string;
          }
        ).type,
      )?.toLowerCase();
      if (!coachUserId) {
        throw notFound("Coach profile not found");
      }
      if (!requestedType) {
        throw notFound("Verification type is required");
      }
      let reviewerUserId = request.auth?.userId ?? null;
      let reviewStatus: string | null = null;
      let verificationId: string | null = null;
      try {
        reviewerUserId = requireVerificationReviewer(request);
        const body = coachVerificationReviewBodySchema.parse(request.body ?? {});
        reviewStatus = body.status;
        verificationId = body.verificationId ?? null;
        const result = await reviewCoachVerification({
          reviewerUserId,
          coachUserId,
          requestedType,
          status: body.status,
          expiresAt: body.expiresAt,
          notes: body.notes,
          verificationId: body.verificationId,
        });
        await recordAuditEvent({
          request,
          action: "coach_verification.review",
          resourceType: "coach_verification",
          resourceId: asString(result.verification.id) ?? `${coachUserId}:${result.type}`,
          subjectUserId: coachUserId,
          result: "SUCCESS",
          metadata: {
            reviewerUserId,
            verificationType: result.type,
            status: body.status,
          },
        });
        return reply.send({
          type: result.type,
          verification: result.verification,
          status: result.status,
          seedVersion: result.dataVersion,
          requestId: request.requestId,
        });
      } catch (error) {
        await recordAuditEvent({
          request,
          action: "coach_verification.review",
          resourceType: "coach_verification",
          resourceId: verificationId ?? `${coachUserId}:${requestedType}`,
          subjectUserId: coachUserId,
          result: mutationAuditResult(error),
          metadata: {
            reviewerUserId,
            verificationType: requestedType,
            status: reviewStatus,
            errorCode: mutationAuditErrorCode(error),
          },
        });
        throw error;
      }
    },
  );
  app.get("/coaches/:coachId/availability/slots", async (request, reply) => {
    requireAuthUserId(request.auth?.userId);
    const coachUserId = asString(
      (
        request.params as {
          coachId?: string;
        }
      ).coachId,
    );
    if (!coachUserId) {
      throw notFound("Coach not found");
    }
    const query = parseAvailabilitySlotQuery(
      request.query as Record<string, unknown>,
    );
    const availability = await resolveCoachAvailabilityTables(coachUserId);
    const slots = resolveCoachAvailabilitySlots({
      tables: availability.tables,
      coachUserId,
      startDate: query.startDate,
      endDate: query.endDate,
      durationMinutes: query.durationMinutes,
      sessionTemplateId: query.sessionTemplateId,
      excludePendingInvites: query.excludePendingInvites,
      applySchedulingRules: query.applySchedulingRules,
    });
    return reply.send({
      coachId: coachUserId,
      slots,
      total: slots.length,
      seedVersion: availability.dataVersion,
      requestId: request.requestId,
    });
  });
  app.get("/coaches/:coachId/availability/conflicts", async (request, reply) => {
    requireAuthUserId(request.auth?.userId);
    const coachUserId = asString(
      (
        request.params as {
          coachId?: string;
        }
      ).coachId,
    );
    if (!coachUserId) {
      throw notFound("Coach not found");
    }
    const query = parseAvailabilityConflictQuery(
      request.query as Record<string, unknown>,
    );
    const availability = await resolveCoachAvailabilityTables(coachUserId);
    const conflicts = resolveCoachAvailabilityConflicts({
      tables: availability.tables,
      coachUserId,
      dates: query.dates,
    });
    return reply.send({
      coachId: coachUserId,
      ...conflicts,
      seedVersion: availability.dataVersion,
      requestId: request.requestId,
    });
  });
  app.get("/clubs", async (request, reply) => {
    const authUserId = requireAuthUserId(request.auth?.userId);
    const isPrivilegedAdmin = isPrivilegedAdminAuth(request.auth);
    const repository = resolveClubAuthorityRepository();
    const clubs = await repository.listVisibleClubs({
      authUserId,
      isPrivilegedAdmin,
    });
    const payload = clubs.map((club) => serializeVisibleClub(club, isPrivilegedAdmin));
    return reply.send({
      clubs: payload,
      total: payload.length,
      requestId: request.requestId,
    });
  });
  app.get("/clubs/:clubId", async (request, reply) => {
    const authUserId = requireAuthUserId(request.auth?.userId);
    const params = clubParamsSchema.parse(request.params ?? {});
    const isPrivilegedAdmin = isPrivilegedAdminAuth(request.auth);
    const repository = resolveClubAuthorityRepository();
    const clubs = await repository.listVisibleClubs({
      authUserId,
      isPrivilegedAdmin,
    });
    const club = clubs.find((candidate) => candidate.id === params.clubId);
    if (!club) {
      throw notFound("Club not found");
    }
    return reply.send({
      club: serializeVisibleClub(club, isPrivilegedAdmin),
      requestId: request.requestId,
    });
  });
  app.post("/clubs", async (request, reply) => {
    const authUserId = requireAuthUserId(request.auth?.userId);
    const body = clubManagementCreateBodySchema.parse(request.body ?? {});
    const repository = resolveClubAuthorityRepository();
    let auditClubId = "new";
    try {
      const created = await repository.createClub({
        name: body.name,
        city: body.city,
        country: body.country ?? null,
        tagline: body.tagline ?? null,
        badge: body.badge ?? null,
        visibility: body.visibility,
        joinPolicy: body.joinPolicy,
        commercialMode: body.commercialMode,
        firstStaffRole: body.firstStaffRole ?? null,
        authUserId,
      });
      auditClubId = created.club.id;
      await recordClubManagementAudit({
        request,
        action: "club.create",
        clubId: created.club.id,
        result: "SUCCESS",
        metadata: {
          visibility: body.visibility,
          joinPolicy: body.joinPolicy,
          commercialMode: body.commercialMode,
          firstStaffRole: body.firstStaffRole ?? null,
        },
      });
      return reply.code(201).send({
        ...created,
        requestId: request.requestId,
      });
    } catch (error) {
      await recordClubManagementAudit({
        request,
        action: "club.create",
        clubId: auditClubId,
        result:
          error instanceof ApiProblemError && error.status < 500
            ? "DENY"
            : "ERROR",
        metadata: {
          errorCode:
            error instanceof ApiProblemError ? error.code : "INTERNAL_ERROR",
        },
      });
      throw error;
    }
  });
  app.patch("/clubs/:clubId", async (request, reply) => {
    const authUserId = requireAuthUserId(request.auth?.userId);
    const params = clubParamsSchema.parse(request.params ?? {});
    const body = clubManagementPatchBodySchema.parse(request.body ?? {});
    const repository = resolveClubAuthorityRepository();
    try {
      const club = await repository.updateClub({
        clubId: params.clubId,
        ...body,
        authUserId,
        isPrivilegedAdmin: isPrivilegedAdminAuth(request.auth),
      });
      await recordClubManagementAudit({
        request,
        action: "club.update",
        clubId: params.clubId,
        result: "SUCCESS",
        metadata: {
          fields: Object.keys(body),
        },
      });
      return reply.send({
        club: serializeVisibleClub(club),
        requestId: request.requestId,
      });
    } catch (error) {
      await recordClubManagementAudit({
        request,
        action: "club.update",
        clubId: params.clubId,
        result:
          error instanceof ApiProblemError && error.status < 500
            ? "DENY"
            : "ERROR",
        metadata: {
          fields: Object.keys(body),
          errorCode:
            error instanceof ApiProblemError ? error.code : "INTERNAL_ERROR",
        },
      });
      throw error;
    }
  });
  app.delete("/clubs/:clubId", async (request, reply) => {
    const authUserId = requireAuthUserId(request.auth?.userId);
    const params = clubParamsSchema.parse(request.params ?? {});
    const repository = resolveClubAuthorityRepository();
    try {
      await repository.deleteClub({
        clubId: params.clubId,
        authUserId,
        isPrivilegedAdmin: isPrivilegedAdminAuth(request.auth),
      });
      await recordClubManagementAudit({
        request,
        action: "club.archive",
        clubId: params.clubId,
        result: "SUCCESS",
      });
      return reply.code(204).send();
    } catch (error) {
      await recordClubManagementAudit({
        request,
        action: "club.archive",
        clubId: params.clubId,
        result:
          error instanceof ApiProblemError && error.status < 500
            ? "DENY"
            : "ERROR",
        metadata: {
          errorCode:
            error instanceof ApiProblemError ? error.code : "INTERNAL_ERROR",
        },
      });
      throw error;
    }
  });
  app.get("/clubs/:clubId/branding", async (request, reply) => {
    const params = clubParamsSchema.parse(request.params ?? {});
    const repository = resolveClubBrandingRepository();
    try {
      const authUserId = requireAuthUserId(request.auth?.userId);
      const branding = await repository.getClubBranding({
        clubId: params.clubId,
        authUserId,
        isPrivilegedAdmin: isPrivilegedAdminAuth(request.auth),
      });
      await recordClubBrandingAudit({
        request,
        action: "club_branding.read",
        clubId: params.clubId,
        result: "SUCCESS",
      });
      return reply.send({
        branding,
        requestId: request.requestId,
      });
    } catch (error) {
      await recordClubBrandingAudit({
        request,
        action: "club_branding.read",
        clubId: params.clubId,
        result:
          error instanceof ApiProblemError && error.status < 500
            ? "DENY"
            : "ERROR",
        metadata: {
          errorCode:
            error instanceof ApiProblemError ? error.code : "INTERNAL_ERROR",
        },
      });
      throw error;
    }
  });
  app.put("/clubs/:clubId/branding", async (request, reply) => {
    const params = clubParamsSchema.parse(request.params ?? {});
    const repository = resolveClubBrandingRepository();
    try {
      const authUserId = requireAuthUserId(request.auth?.userId);
      const body = clubBrandingBodySchema.parse(request.body ?? {});
      const branding = await repository.updateClubBranding({
        clubId: params.clubId,
        patch: body,
        authUserId,
        isPrivilegedAdmin: isPrivilegedAdminAuth(request.auth),
      });
      await recordClubBrandingAudit({
        request,
        action: "club_branding.update",
        clubId: params.clubId,
        result: "SUCCESS",
        metadata: {
          fields: Object.keys(body),
        },
      });
      return reply.send({
        branding,
        requestId: request.requestId,
      });
    } catch (error) {
      await recordClubBrandingAudit({
        request,
        action: "club_branding.update",
        clubId: params.clubId,
        result:
          error instanceof ApiProblemError && error.status < 500
            ? "DENY"
            : "ERROR",
        metadata: {
          errorCode:
            error instanceof ApiProblemError ? error.code : "INTERNAL_ERROR",
        },
      });
      throw error;
    }
  });
  app.get("/clubs/:clubId/integrations", async (request, reply) => {
    const params = clubParamsSchema.parse(request.params ?? {});
    const repository = resolveClubIntegrationRepository();
    try {
      const authUserId = requireAuthUserId(request.auth?.userId);
      const integrations = await repository.list({
        clubId: params.clubId,
        authUserId,
        isPrivilegedAdmin: isPrivilegedAdminAuth(request.auth),
      });
      await recordClubIntegrationAudit({
        request,
        action: "club_integration.read",
        clubId: params.clubId,
        result: "SUCCESS",
        metadata: {
          count: integrations.length,
        },
      });
      return reply.send({
        clubId: params.clubId,
        integrations,
        total: integrations.length,
        requestId: request.requestId,
      });
    } catch (error) {
      await recordClubIntegrationAudit({
        request,
        action: "club_integration.read",
        clubId: params.clubId,
        result:
          error instanceof ApiProblemError && error.status < 500
            ? "DENY"
            : "ERROR",
        metadata: {
          errorCode:
            error instanceof ApiProblemError ? error.code : "INTERNAL_ERROR",
        },
      });
      throw error;
    }
  });
  app.post("/clubs/:clubId/integrations", async (request, reply) => {
    const params = clubParamsSchema.parse(request.params ?? {});
    const body = clubIntegrationBodySchema.parse(request.body ?? {});
    const repository = resolveClubIntegrationRepository();
    try {
      const authUserId = requireAuthUserId(request.auth?.userId);
      const integration = await repository.create({
        clubId: params.clubId,
        ...body,
        authUserId,
        isPrivilegedAdmin: isPrivilegedAdminAuth(request.auth),
      });
      await recordClubIntegrationAudit({
        request,
        action: "club_integration.create",
        clubId: params.clubId,
        provider: body.provider,
        result: "SUCCESS",
        metadata: {
          status: integration.status,
        },
      });
      return reply.code(201).send({
        integration,
        requestId: request.requestId,
      });
    } catch (error) {
      await recordClubIntegrationAudit({
        request,
        action: "club_integration.create",
        clubId: params.clubId,
        provider: body.provider,
        result:
          error instanceof ApiProblemError && error.status < 500
            ? "DENY"
            : "ERROR",
        metadata: {
          errorCode:
            error instanceof ApiProblemError ? error.code : "INTERNAL_ERROR",
        },
      });
      throw error;
    }
  });
  app.patch("/clubs/:clubId/integrations", async (request, reply) => {
    const params = clubParamsSchema.parse(request.params ?? {});
    const body = clubIntegrationPatchBodySchema.parse(request.body ?? {});
    const repository = resolveClubIntegrationRepository();
    try {
      const authUserId = requireAuthUserId(request.auth?.userId);
      const integration = await repository.update({
        clubId: params.clubId,
        ...body,
        authUserId,
        isPrivilegedAdmin: isPrivilegedAdminAuth(request.auth),
      });
      await recordClubIntegrationAudit({
        request,
        action: "club_integration.update",
        clubId: params.clubId,
        provider: body.provider,
        result: "SUCCESS",
        metadata: {
          fields: Object.keys(body).filter((field) => field !== "provider"),
          status: integration.status,
        },
      });
      return reply.send({
        integration,
        requestId: request.requestId,
      });
    } catch (error) {
      await recordClubIntegrationAudit({
        request,
        action: "club_integration.update",
        clubId: params.clubId,
        provider: body.provider,
        result:
          error instanceof ApiProblemError && error.status < 500
            ? "DENY"
            : "ERROR",
        metadata: {
          fields: Object.keys(body).filter((field) => field !== "provider"),
          errorCode:
            error instanceof ApiProblemError ? error.code : "INTERNAL_ERROR",
        },
      });
      throw error;
    }
  });
  app.get("/clubs/:clubId/squads", async (request, reply) => {
    const authUserId = requireAuthUserId(request.auth?.userId);
    const params = clubParamsSchema.parse(request.params ?? {});
    const repository = resolveClubAuthorityRepository();
    const squads = await repository.listClubSquads({
      clubId: params.clubId,
      authUserId,
      isPrivilegedAdmin: isPrivilegedAdminAuth(request.auth),
    });
    return reply.send({
      clubId: params.clubId,
      squads,
      total: squads.length,
      requestId: request.requestId,
    });
  });
  app.post("/clubs/:clubId/squads", async (request, reply) => {
    const authUserId = requireAuthUserId(request.auth?.userId);
    const params = clubParamsSchema.parse(request.params ?? {});
    const repository = resolveClubAuthorityRepository();
    try {
      const body = clubSquadCreateBodySchema.parse(request.body ?? {});
      const squad = await repository.createClubSquad({
        clubId: params.clubId,
        name: body.name,
        level: resolveSquadLevel(body),
        authUserId,
        isPrivilegedAdmin: isPrivilegedAdminAuth(request.auth),
      });
      await recordClubSquadAudit({
        request,
        action: "club_squad.create",
        clubId: params.clubId,
        squadId: squad.id,
        result: "SUCCESS",
      });
      return reply.code(201).send({
        squad,
        requestId: request.requestId,
      });
    } catch (error) {
      await recordClubSquadAudit({
        request,
        action: "club_squad.create",
        clubId: params.clubId,
        result: mutationAuditResult(error),
        metadata: {
          errorCode: mutationAuditErrorCode(error),
        },
      });
      throw error;
    }
  });
  app.get("/squads/:squadId", async (request, reply) => {
    const authUserId = requireAuthUserId(request.auth?.userId);
    const params = squadParamsSchema.parse(request.params ?? {});
    const repository = resolveClubAuthorityRepository();
    const squad = await repository.getClubSquad({
      squadId: params.squadId,
      authUserId,
      isPrivilegedAdmin: isPrivilegedAdminAuth(request.auth),
    });
    return reply.send({
      squad,
      requestId: request.requestId,
    });
  });
  app.get("/squads/:squadId/members", async (request, reply) => {
    const params = squadParamsSchema.parse(request.params ?? {});
    const repository = resolveClubAuthorityRepository();
    try {
      const authUserId = requireAuthUserId(request.auth?.userId);
      const members = await repository.listSquadMembers({
        squadId: params.squadId,
        authUserId,
        isPrivilegedAdmin: isPrivilegedAdminAuth(request.auth),
      });
      await recordClubSquadRosterAudit({
        request,
        squadId: params.squadId,
        result: "SUCCESS",
        metadata: {
          memberCount: members.length,
        },
      });
      return reply.send({
        squadId: params.squadId,
        members,
        total: members.length,
        requestId: request.requestId,
      });
    } catch (error) {
      await recordClubSquadRosterAudit({
        request,
        squadId: params.squadId,
        result:
          error instanceof ApiProblemError && error.status < 500
            ? "DENY"
            : "ERROR",
        metadata: {
          errorCode:
            error instanceof ApiProblemError ? error.code : "INTERNAL_ERROR",
        },
      });
      throw error;
    }
  });
  app.patch("/clubs/:clubId/squads/:squadId", async (request, reply) => {
    const authUserId = requireAuthUserId(request.auth?.userId);
    const params = clubSquadParamsSchema.parse(request.params ?? {});
    const repository = resolveClubAuthorityRepository();
    try {
      const body = clubSquadPatchBodySchema.parse(request.body ?? {});
      const squad = await repository.updateClubSquad({
        clubId: params.clubId,
        squadId: params.squadId,
        name: body.name,
        level: resolveSquadLevel(body),
        authUserId,
        isPrivilegedAdmin: isPrivilegedAdminAuth(request.auth),
      });
      await recordClubSquadAudit({
        request,
        action: "club_squad.update",
        clubId: params.clubId,
        squadId: params.squadId,
        result: "SUCCESS",
      });
      return reply.send({
        squad,
        requestId: request.requestId,
      });
    } catch (error) {
      await recordClubSquadAudit({
        request,
        action: "club_squad.update",
        clubId: params.clubId,
        squadId: params.squadId,
        result: mutationAuditResult(error),
        metadata: {
          errorCode: mutationAuditErrorCode(error),
        },
      });
      throw error;
    }
  });
  app.delete("/clubs/:clubId/squads/:squadId", async (request, reply) => {
    const authUserId = requireAuthUserId(request.auth?.userId);
    const params = clubSquadParamsSchema.parse(request.params ?? {});
    const repository = resolveClubAuthorityRepository();
    try {
      await repository.deleteClubSquad({
        clubId: params.clubId,
        squadId: params.squadId,
        authUserId,
        isPrivilegedAdmin: isPrivilegedAdminAuth(request.auth),
      });
      await recordClubSquadAudit({
        request,
        action: "club_squad.archive",
        clubId: params.clubId,
        squadId: params.squadId,
        result: "SUCCESS",
      });
      return reply.code(204).send();
    } catch (error) {
      await recordClubSquadAudit({
        request,
        action: "club_squad.archive",
        clubId: params.clubId,
        squadId: params.squadId,
        result:
          error instanceof ApiProblemError && error.status < 500
            ? "DENY"
            : "ERROR",
        metadata: {
          errorCode:
            error instanceof ApiProblemError ? error.code : "INTERNAL_ERROR",
        },
      });
      throw error;
    }
  });
  app.get("/clubs/:clubId/members", async (request, reply) => {
    const authUserId = requireAuthUserId(request.auth?.userId);
    const params = clubParamsSchema.parse(request.params ?? {});
    const repository = resolveClubAuthorityRepository();
    const members = await repository.listClubMembers({
      clubId: params.clubId,
      authUserId,
      isPrivilegedAdmin: isPrivilegedAdminAuth(request.auth),
    });
    return reply.send({
      clubId: params.clubId,
      members,
      total: members.length,
      requestId: request.requestId,
    });
  });
  app.get("/clubs/:clubId/members/removals", async (request, reply) => {
    const authUserId = requireAuthUserId(request.auth?.userId);
    const params = clubParamsSchema.parse(request.params ?? {});
    const repository = resolveClubAuthorityRepository();
    try {
      const removals = await repository.listClubMemberRemovals({
        clubId: params.clubId,
        authUserId,
        isPrivilegedAdmin: isPrivilegedAdminAuth(request.auth),
      });
      await recordAuditEvent({
        request,
        action: "club_member_removals.read",
        resourceType: "club_member_removals",
        resourceId: params.clubId,
        subjectUserId: authUserId,
        result: "SUCCESS",
        sensitiveRead: true,
        metadata: {
          clubId: params.clubId,
          count: removals.length,
        },
      });
      return reply.send({
        clubId: params.clubId,
        removals,
        total: removals.length,
        requestId: request.requestId,
      });
    } catch (error) {
      await recordAuditEvent({
        request,
        action: "club_member_removals.read",
        resourceType: "club_member_removals",
        resourceId: params.clubId,
        subjectUserId: authUserId,
        result: mutationAuditResult(error),
        sensitiveRead: true,
        metadata: {
          clubId: params.clubId,
          errorCode: mutationAuditErrorCode(error),
        },
      });
      throw error;
    }
  });
  app.patch("/clubs/:clubId/members/:userId/role", async (request, reply) => {
    const authUserId = requireAuthUserId(request.auth?.userId);
    const params = clubMemberParamsSchema.parse(request.params ?? {});
    const body = clubMemberRoleBodySchema.parse(request.body ?? {});
    const repository = resolveClubAuthorityRepository();
    try {
      const member = await repository.updateClubMemberRole({
        clubId: params.clubId,
        userId: params.userId,
        role: body.role,
        authUserId,
        isPrivilegedAdmin: isPrivilegedAdminAuth(request.auth),
      });
      await recordClubMemberAudit({
        request,
        action: "club_member.role.update",
        clubId: params.clubId,
        targetUserId: params.userId,
        result: "SUCCESS",
        metadata: {
          role: body.role,
        },
      });
      return reply.send({
        member,
        requestId: request.requestId,
      });
    } catch (error) {
      await recordClubMemberAudit({
        request,
        action: "club_member.role.update",
        clubId: params.clubId,
        targetUserId: params.userId,
        result:
          error instanceof ApiProblemError && error.status < 500
            ? "DENY"
            : "ERROR",
        metadata: {
          role: body.role,
          errorCode:
            error instanceof ApiProblemError ? error.code : "INTERNAL_ERROR",
        },
      });
      throw error;
    }
  });
  app.post("/clubs/:clubId/members/me/leave", async (request, reply) => {
    const authUserId = requireAuthUserId(request.auth?.userId);
    const params = clubParamsSchema.parse(request.params ?? {});
    const body = clubMemberSelfLeaveBodySchema.parse(request.body ?? {});
    const repository = resolveClubAuthorityRepository();
    try {
      const removal = await repository.leaveClub({
        clubId: params.clubId,
        authUserId,
        reason: body.reason,
        customReason: body.customReason ?? null,
      });
      await recordClubMemberAudit({
        request,
        action: "club_member.leave",
        clubId: params.clubId,
        targetUserId: authUserId,
        result: "SUCCESS",
        metadata: {
          reason: body.reason,
          customReason: body.customReason ?? null,
        },
      });
      return reply.send({
        removal,
        requestId: request.requestId,
      });
    } catch (error) {
      await recordClubMemberAudit({
        request,
        action: "club_member.leave",
        clubId: params.clubId,
        targetUserId: authUserId,
        result:
          error instanceof ApiProblemError && error.status < 500
            ? "DENY"
            : "ERROR",
        metadata: {
          reason: body.reason,
          errorCode:
            error instanceof ApiProblemError ? error.code : "INTERNAL_ERROR",
        },
      });
      throw error;
    }
  });
  app.delete("/clubs/:clubId/members/:userId", async (request, reply) => {
    const authUserId = requireAuthUserId(request.auth?.userId);
    const params = clubMemberParamsSchema.parse(request.params ?? {});
    const body = clubMemberRemovalBodySchema.parse(request.body ?? {});
    const repository = resolveClubAuthorityRepository();
    try {
      const removal = await repository.removeClubMember({
        clubId: params.clubId,
        userId: params.userId,
        reason: body.reason,
        customReason: body.customReason ?? null,
        authUserId,
        isPrivilegedAdmin: isPrivilegedAdminAuth(request.auth),
      });
      await recordClubMemberAudit({
        request,
        action: "club_member.remove",
        clubId: params.clubId,
        targetUserId: params.userId,
        result: "SUCCESS",
        metadata: {
          reason: body.reason,
          customReason: body.customReason ?? null,
        },
      });
      return reply.send({
        removal,
        requestId: request.requestId,
      });
    } catch (error) {
      await recordClubMemberAudit({
        request,
        action: "club_member.remove",
        clubId: params.clubId,
        targetUserId: params.userId,
        result:
          error instanceof ApiProblemError && error.status < 500
            ? "DENY"
            : "ERROR",
        metadata: {
          reason: body.reason,
          errorCode:
            error instanceof ApiProblemError ? error.code : "INTERNAL_ERROR",
        },
      });
      throw error;
    }
  });
  app.post("/clubs/:clubId/members/:userId/ban", async (request, reply) => {
    const authUserId = requireAuthUserId(request.auth?.userId);
    const params = clubMemberParamsSchema.parse(request.params ?? {});
    const body = clubMemberBanBodySchema.parse(request.body ?? {});
    const repository = resolveClubAuthorityRepository();
    try {
      const removal = await repository.banClubMember({
        clubId: params.clubId,
        userId: params.userId,
        reason: body.reason,
        authUserId,
        isPrivilegedAdmin: isPrivilegedAdminAuth(request.auth),
      });
      await recordClubMemberAudit({
        request,
        action: "club_member.ban",
        clubId: params.clubId,
        targetUserId: params.userId,
        result: "SUCCESS",
        metadata: {
          reason: body.reason,
        },
      });
      return reply.send({
        removal,
        requestId: request.requestId,
      });
    } catch (error) {
      await recordClubMemberAudit({
        request,
        action: "club_member.ban",
        clubId: params.clubId,
        targetUserId: params.userId,
        result: mutationAuditResult(error),
        metadata: {
          reason: body.reason,
          errorCode: mutationAuditErrorCode(error),
        },
      });
      throw error;
    }
  });
  app.post("/clubs/:clubId/members/removals/:removalId/restore", async (request, reply) => {
    const authUserId = requireAuthUserId(request.auth?.userId);
    const params = clubMemberRemovalRestoreParamsSchema.parse(request.params ?? {});
    const repository = resolveClubAuthorityRepository();
    try {
      const member = await repository.restoreRemovedClubMember({
        clubId: params.clubId,
        removalId: params.removalId,
        authUserId,
        isPrivilegedAdmin: isPrivilegedAdminAuth(request.auth),
      });
      await recordClubMemberAudit({
        request,
        action: "club_member.restore",
        clubId: params.clubId,
        targetUserId: member.userId,
        result: "SUCCESS",
        metadata: {
          removalId: params.removalId,
        },
      });
      return reply.send({
        member,
        requestId: request.requestId,
      });
    } catch (error) {
      await recordClubMemberAudit({
        request,
        action: "club_member.restore",
        clubId: params.clubId,
        targetUserId: params.removalId,
        result: mutationAuditResult(error),
        metadata: {
          removalId: params.removalId,
          errorCode: mutationAuditErrorCode(error),
        },
      });
      throw error;
    }
  });
  app.put("/clubs/:clubId/squads/:squadId/members/:userId", async (request, reply) => {
    const authUserId = requireAuthUserId(request.auth?.userId);
    const params = clubSquadMemberParamsSchema.parse(request.params ?? {});
    const repository = resolveClubAuthorityRepository();
    try {
      noRequestBodySchema.parse(request.body);
      const member = await repository.addClubMemberToSquad({
        clubId: params.clubId,
        squadId: params.squadId,
        userId: params.userId,
        authUserId,
        isPrivilegedAdmin: isPrivilegedAdminAuth(request.auth),
      });
      await recordClubSquadMemberAudit({
        request,
        action: "club_squad_member.add",
        clubId: params.clubId,
        squadId: params.squadId,
        targetUserId: params.userId,
        result: "SUCCESS",
      });
      return reply.send({
        member,
        requestId: request.requestId,
      });
    } catch (error) {
      await recordClubSquadMemberAudit({
        request,
        action: "club_squad_member.add",
        clubId: params.clubId,
        squadId: params.squadId,
        targetUserId: params.userId,
        result: mutationAuditResult(error),
        metadata: {
          errorCode: mutationAuditErrorCode(error),
        },
      });
      throw error;
    }
  });
  app.delete("/clubs/:clubId/squads/:squadId/members/:userId", async (request, reply) => {
    const authUserId = requireAuthUserId(request.auth?.userId);
    const params = clubSquadMemberParamsSchema.parse(request.params ?? {});
    const repository = resolveClubAuthorityRepository();
    try {
      noRequestBodySchema.parse(request.body);
      const member = await repository.removeClubMemberFromSquad({
        clubId: params.clubId,
        squadId: params.squadId,
        userId: params.userId,
        authUserId,
        isPrivilegedAdmin: isPrivilegedAdminAuth(request.auth),
      });
      await recordClubSquadMemberAudit({
        request,
        action: "club_squad_member.remove",
        clubId: params.clubId,
        squadId: params.squadId,
        targetUserId: params.userId,
        result: "SUCCESS",
      });
      return reply.send({
        member,
        requestId: request.requestId,
      });
    } catch (error) {
      await recordClubSquadMemberAudit({
        request,
        action: "club_squad_member.remove",
        clubId: params.clubId,
        squadId: params.squadId,
        targetUserId: params.userId,
        result: mutationAuditResult(error),
        metadata: {
          errorCode: mutationAuditErrorCode(error),
        },
      });
      throw error;
    }
  });
  app.get("/clubs/:clubId/schedule", async (request, reply) => {
    const authUserId = requireAuthUserId(request.auth?.userId);
    const clubId = asString(
      (
        request.params as {
          clubId?: string;
        }
      ).clubId,
    );
    const isPrivilegedAdmin = isPrivilegedAdminAuth(request.auth);
    const source = await resolveClubScheduleSource({
      clubId,
      authUserId,
      isPrivilegedAdmin,
    });
    const activities = buildClubScheduleActivities(
      source.tables,
      source.clubId,
    );
    return reply.send({
      clubId: source.clubId,
      activities,
      total: activities.length,
      seedVersion: source.seedVersion,
      requestId: request.requestId,
    });
  });
  app.get("/clubs/:clubId/schedule/:activityId", async (request, reply) => {
    const authUserId = requireAuthUserId(request.auth?.userId);
    const { clubId, activityId } = request.params as {
      clubId?: string;
      activityId?: string;
    };
    const isPrivilegedAdmin = isPrivilegedAdminAuth(request.auth);
    const source = await resolveClubScheduleSource({
      clubId,
      authUserId,
      isPrivilegedAdmin,
    });
    const activity = activityId
      ? findClubScheduleActivity(source.tables, source.clubId, activityId)
      : null;
    if (!activity) {
      throw notFound("Club activity not found", {
        clubId: source.clubId,
        activityId,
      });
    }
    return reply.send({
      clubId: source.clubId,
      activity,
      seedVersion: source.seedVersion,
      requestId: request.requestId,
    });
  });
  app.get("/clubs/:clubId/invite-codes", async (request, reply) => {
    const authUserId = requireAuthUserId(request.auth?.userId);
    const clubId = asString(
      (
        request.params as {
          clubId?: string;
        }
      ).clubId,
    );
    if (!clubId) {
      throw notFound("Club not found");
    }
    const repository = resolveClubAuthorityRepository();
    try {
      const inviteCodes = await repository.listInviteCodes({
        clubId,
        authUserId,
      });
      await recordAuditEvent({
        request,
        action: "club_invite_code.read",
        resourceType: "club_invite_code",
        resourceId: clubId,
        subjectUserId: authUserId,
        result: "SUCCESS",
        sensitiveRead: true,
        metadata: {
          clubId,
          resultCount: inviteCodes.length,
        },
      });
      return reply.send({
        inviteCodes,
        requestId: request.requestId,
      });
    } catch (error) {
      await recordAuditEvent({
        request,
        action: "club_invite_code.read",
        resourceType: "club_invite_code",
        resourceId: clubId,
        subjectUserId: authUserId,
        result: mutationAuditResult(error),
        sensitiveRead: true,
        metadata: {
          clubId,
          errorCode: mutationAuditErrorCode(error),
        },
      });
      throw error;
    }
  });
  app.post("/clubs/:clubId/invite-codes", async (request, reply) => {
    const authUserId = requireAuthUserId(request.auth?.userId);
    const clubId = asString(
      (
        request.params as {
          clubId?: string;
        }
      ).clubId,
    );
    if (!clubId) {
      throw notFound("Club not found");
    }
    const repository = resolveClubAuthorityRepository();
    let codeReference: string | null = null;
    let role: "MEMBER" | "COACH" | "ADMIN" | null = null;
    try {
      role = clubInviteCodeCreateBodySchema.parse(request.body ?? {}).role;
      const inviteCode = await repository.createInviteCode({
        clubId,
        authUserId,
        role,
      });
      codeReference = buildAuditSecretReference("invite_code", inviteCode.code);
      await recordAuditEvent({
        request,
        action: "club_invite_code.create",
        resourceType: "club_invite_code",
        resourceId: `${clubId}:${codeReference}`,
        subjectUserId: authUserId,
        result: "SUCCESS",
        metadata: {
          clubId,
          codeReference,
          role,
        },
      });
      return reply.code(201).send({
        inviteCode,
        requestId: request.requestId,
      });
    } catch (error) {
      await recordAuditEvent({
        request,
        action: "club_invite_code.create",
        resourceType: "club_invite_code",
        resourceId: codeReference ? `${clubId}:${codeReference}` : clubId,
        subjectUserId: authUserId,
        result: mutationAuditResult(error),
        metadata: {
          clubId,
          codeReference,
          role,
          errorCode: mutationAuditErrorCode(error),
        },
      });
      throw error;
    }
  });
  app.post("/clubs/:clubId/invites", async (request, reply) => {
    const authUserId = requireAuthUserId(request.auth?.userId);
    const params = clubParamsSchema.parse(request.params ?? {});
    const rawBody = (request.body ?? {}) as {
      targetUserIds?: unknown;
      targetEmails?: unknown;
      role?: unknown;
    };
    let targetUserIds = Array.isArray(rawBody.targetUserIds)
      ? rawBody.targetUserIds.filter((value): value is string => typeof value === "string")
      : [];
    let targetEmails = Array.isArray(rawBody.targetEmails)
      ? rawBody.targetEmails.filter((value): value is string => typeof value === "string")
      : [];
    let role = asString(rawBody.role) ?? "MEMBER";
    try {
      const body = createClubInvitesRequestSchema.parse(request.body ?? {});
      targetUserIds = body.targetUserIds;
      targetEmails = body.targetEmails.map((email) => email.trim().toLowerCase());
      role = body.role;
      const repository = resolveClubAuthorityRepository();
      const invites = await repository.createDirectInvites({
        clubId: params.clubId,
        targetUserIds,
        targetEmails,
        role,
        authUserId,
        isPrivilegedAdmin: hasAnyGrantedRole(request.auth, ["admin", "security_admin"]),
      });
      const emailDelivery =
        targetEmails.length > 0
          ? summarizeInviteEmailDelivery(
              await Promise.all(
                targetEmails.map((email) =>
                  deliverClubInviteEmail({
                    email,
                    clubName: invites[0]?.clubName ?? "your club",
                    invitedByLabel: invites[0]?.invitedByLabel ?? "Club staff",
                    role,
                    requestId: request.requestId,
                  }).catch((error) => ({
                    provider: "none",
                    status: "failed" as const,
                    error: error instanceof Error ? error.message : "Club invite email failed",
                  })),
                ),
              ),
            )
          : undefined;
      const payload = parseCreateClubInvitesResponse({
        invites,
        total: invites.length,
        emailDelivery,
        requestId: request.requestId,
      });
      const subjectUserId =
        targetEmails.length === 0 && targetUserIds.length === 1 ? targetUserIds[0] : null;
      await recordAuditEvent({
        request,
        action: "club_invite.create",
        resourceType: "club_invite",
        resourceId: params.clubId,
        subjectUserId,
        result: "SUCCESS",
        metadata: {
          clubId: params.clubId,
          targetUserIds,
          targetUserCount: targetUserIds.length,
          targetEmailCount: targetEmails.length,
          targetEmailDomains: inviteEmailDomainsForAudit(targetEmails),
          inviteIds: invites.map((invite) => invite.id),
          role,
        },
      });
      if (emailDelivery) {
        await recordAuditEvent({
          request,
          action: "club_invite.email_delivery",
          resourceType: "club_invite",
          resourceId: params.clubId,
          subjectUserId: null,
          result: emailDelivery.failed > 0 ? "ERROR" : "SUCCESS",
          metadata: {
            clubId: params.clubId,
            inviteIds: invites.map((invite) => invite.id),
            targetEmailCount: targetEmails.length,
            targetEmailDomains: inviteEmailDomainsForAudit(targetEmails),
            delivery: emailDelivery,
            role,
          },
        });
      }
      return reply.code(201).send(payload);
    } catch (error) {
      await recordAuditEvent({
        request,
        action: "club_invite.create",
        resourceType: "club_invite",
        resourceId: params.clubId,
        subjectUserId:
          targetEmails.length === 0 && targetUserIds.length === 1 ? targetUserIds[0] : null,
        result: mutationAuditResult(error),
        metadata: {
          clubId: params.clubId,
          targetUserIds,
          targetUserCount: targetUserIds.length,
          targetEmailCount: targetEmails.length,
          targetEmailDomains: inviteEmailDomainsForAudit(targetEmails),
          role,
          errorCode: mutationAuditErrorCode(error),
        },
      });
      throw error;
    }
  });
  app.delete("/clubs/:clubId/invite-codes/:code", async (request, reply) => {
    const authUserId = requireAuthUserId(request.auth?.userId);
    const params = request.params as {
      clubId?: string;
      code?: string;
    };
    const clubId = asString(params.clubId);
    const code = asString(params.code) ?? "";
    const codeReference = code ? buildAuditSecretReference("invite_code", code) : null;
    try {
      if (!clubId || !code) {
        throw notFound("Invite code not found");
      }
      const repository = resolveClubAuthorityRepository();
      await repository.deleteInviteCode({
        clubId,
        authUserId,
        code,
      });
      await recordAuditEvent({
        request,
        action: "club_invite_code.remove",
        resourceType: "club_invite_code",
        resourceId: `${clubId}:${codeReference}`,
        subjectUserId: authUserId,
        result: "SUCCESS",
        metadata: {
          clubId,
          codeReference,
        },
      });
      return reply.code(204).send();
    } catch (error) {
      await recordAuditEvent({
        request,
        action: "club_invite_code.remove",
        resourceType: "club_invite_code",
        resourceId: clubId && codeReference ? `${clubId}:${codeReference}` : null,
        subjectUserId: authUserId,
        result: mutationAuditResult(error),
        metadata: {
          clubId: clubId ?? null,
          codeReference,
          errorCode: mutationAuditErrorCode(error),
        },
      });
      throw error;
    }
  });
  app.get("/clubs/join/resolve", async (request, reply) => {
    const authUserId = requireAuthUserId(request.auth?.userId);
    const rawCode =
      asString(
        (request.query as { code?: string } | undefined)?.code,
      ) ?? "";
    const repository = resolveClubAuthorityRepository();
    const codeReference = rawCode
      ? buildAuditSecretReference("invite_code", rawCode)
      : null;
    try {
      const { code } = joinClubRequestSchema.parse(request.query ?? {});
      const preview = await repository.resolveJoinCode({
        authUserId,
        code,
      });
      const payload = parseClubJoinPreviewResponse({
        preview,
        requestId: request.requestId,
      });
      await recordAuditEvent({
        request,
        action: "club.join.resolve",
        resourceType: "club_invite_code",
        resourceId: codeReference,
        subjectUserId: authUserId,
        result: "SUCCESS",
        sensitiveRead: true,
        metadata: {
          clubId: preview.clubId,
          codeReference,
          role: preview.role,
          joinFlow: preview.joinFlow,
        },
      });
      return reply.send(payload);
    } catch (error) {
      await recordAuditEvent({
        request,
        action: "club.join.resolve",
        resourceType: "club_invite_code",
        resourceId: codeReference,
        subjectUserId: authUserId,
        result: mutationAuditResult(error),
        sensitiveRead: true,
        metadata: {
          codeReference,
          errorCode: mutationAuditErrorCode(error),
        },
      });
      throw error;
    }
  });
  app.post("/clubs/join", async (request, reply) => {
    const authUserId = requireAuthUserId(request.auth?.userId);
    const rawCode =
      asString(
        (request.body as { code?: string } | undefined)?.code,
      ) ?? "";
    const repository = resolveClubAuthorityRepository();
    const codeReference = rawCode
      ? buildAuditSecretReference("invite_code", rawCode)
      : null;
    let clubId: string | null = null;
    let outcome: string | undefined;
    try {
      const { code } = joinClubRequestSchema.parse(request.body ?? {});
      const result = await repository.joinWithCode({
        authUserId,
        code,
        actingAuthCanUseStaffLinks: canUseStaffInviteLinks(request.auth),
      });
      clubId = result.club.id;
      outcome = result.outcome;
      const payload = parseClubJoinResponse({
        ...result,
        requestId: request.requestId,
      });
      await recordAuditEvent({
        request,
        action: "club.join",
        resourceType: "club",
        resourceId: clubId,
        subjectUserId: authUserId,
        result: "SUCCESS",
        metadata: {
          clubId,
          codeReference,
          outcome,
          membershipId: result.membership?.id ?? null,
          inviteId: result.invite?.id ?? null,
        },
      });
      return reply
        .code(
          result.outcome === "invite_pending"
            ? 202
            : result.outcome === "joined"
              ? 201
              : 200,
        )
        .send(payload);
    } catch (error) {
      await recordAuditEvent({
        request,
        action: "club.join",
        resourceType: "club",
        resourceId: clubId,
        subjectUserId: authUserId,
        result: mutationAuditResult(error),
        metadata: {
          clubId,
          codeReference,
          outcome,
          errorCode: mutationAuditErrorCode(error),
        },
      });
      throw error;
    }
  });
  app.get("/clubs/invites", async (request, reply) => {
    const authUserId = requireAuthUserId(request.auth?.userId);
    const repository = resolveClubAuthorityRepository();
    try {
      const invites = await repository.listPendingInvites({
        authUserId,
      });
      const payload = parseClubInvitesResponse({
        invites,
        requestId: request.requestId,
      });
      await recordAuditEvent({
        request,
        action: "club_invite.list",
        resourceType: "club_invite",
        resourceId: authUserId,
        subjectUserId: authUserId,
        result: "SUCCESS",
        sensitiveRead: true,
        metadata: {
          inviteCount: invites.length,
          clubIds: Array.from(new Set(invites.map((invite) => invite.clubId))),
        },
      });
      return reply.send(payload);
    } catch (error) {
      await recordAuditEvent({
        request,
        action: "club_invite.list",
        resourceType: "club_invite",
        resourceId: authUserId,
        subjectUserId: authUserId,
        result: mutationAuditResult(error),
        sensitiveRead: true,
        metadata: {
          errorCode: mutationAuditErrorCode(error),
        },
      });
      throw error;
    }
  });
  app.post("/clubs/invites/:inviteId/respond", async (request, reply) => {
    const authUserId = requireAuthUserId(request.auth?.userId);
    const inviteId = asString(
      (
        request.params as {
          inviteId?: string;
        }
      ).inviteId,
    );
    let response = asString(
      (
        request.body as {
          response?: string;
        }
      ).response,
    )?.toLowerCase();
    try {
      if (!inviteId) {
        throw notFound("Club invite not found");
      }
      const body = respondToClubInviteRequestSchema.parse(request.body ?? {});
      const parsedResponse = body.response;
      response = parsedResponse;
      const repository = resolveClubAuthorityRepository();
      const result = await repository.respondToInvite({
        authUserId,
        inviteId,
        response: parsedResponse,
      });
      const payload = parseRespondToClubInviteResponse({
        ...result,
        requestId: request.requestId,
      });
      await recordAuditEvent({
        request,
        action: "club_invite.respond",
        resourceType: "club_invite",
        resourceId: inviteId,
        subjectUserId: authUserId,
        result: "SUCCESS",
        metadata: {
          inviteId,
          clubId: result.invite.clubId,
          response: parsedResponse,
          membershipId: result.membership?.id ?? null,
          role: result.membership?.role ?? result.invite.role,
        },
      });
      return reply.send(payload);
    } catch (error) {
      await recordAuditEvent({
        request,
        action: "club_invite.respond",
        resourceType: "club_invite",
        resourceId: inviteId ?? null,
        subjectUserId: authUserId,
        result: mutationAuditResult(error),
        metadata: {
          inviteId: inviteId ?? null,
          response: response ?? null,
          errorCode: mutationAuditErrorCode(error),
        },
      });
      throw error;
    }
  });
};
export default coachClubRoutes;
