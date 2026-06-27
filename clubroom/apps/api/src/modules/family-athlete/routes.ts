import type { FastifyPluginAsync, FastifyRequest } from "fastify";
import { z } from "zod";
import {
  athleteIdSchema,
  consentsResponseSchema,
  consentTypeSchema,
  createInjuryRequestSchema,
  createGuardianInviteRequestSchema,
  emergencyContactsResponseSchema,
  familyIdSchema,
  guardianInviteListResponseSchema,
  guardianInviteResponseSchema,
  injuryIdSchema,
  injuriesResponseSchema,
  medicalRecordResponseSchema,
  updateEmergencyContactsRequestSchema,
  updateInjuryRequestSchema,
  updateMedicalRecordRequestSchema,
  upsertConsentsRequestSchema,
} from "@clubroom/shared-contracts";
import { ApiProblemError, forbidden, notFound } from "../../lib/http-errors.js";
import {
  assertCanReadAthleteHealth,
  assertCanReadAthleteMedical,
  assertCanWriteAthleteHealth,
  assertCanWriteAthleteMedical,
  isPrivilegedAdminAuth,
} from "../../lib/authz.js";
import { recordAuditEvent } from "../../lib/audit-runtime.js";
import {
  decorateFamilyAthleteRecord,
  resolveFamilyAthleteRepository,
} from "../../repositories/p0/family-athlete-repository.js";
import { resolveFamilyRepository } from "../../repositories/p0/family-repository.js";
import { resolveClubAuthorityRepository } from "../../repositories/p0/club-authority-repository.js";
type SeedRow = Record<string, unknown>;
type Gender = "MALE" | "FEMALE" | "OTHER" | "PREFER_NOT_TO_SAY";
type Relationship = "SON" | "DAUGHTER" | "WARD" | "GRANDCHILD" | "OTHER";
interface DisabilityRecord {
  id?: string;
  type: string;
  diagnosisDate?: string;
  description?: string;
  supportRequired?: string;
  communicationPreferences?: string[];
  triggers?: string[];
  calmingStrategies?: string[];
}
interface SpecialNeedRecord {
  id?: string;
  category:
    | "PHYSICAL"
    | "LEARNING"
    | "SENSORY"
    | "BEHAVIORAL"
    | "MEDICAL"
    | "OTHER";
  name: string;
  description?: string;
  severity?: "MILD" | "MODERATE" | "SEVERE";
  accommodationsNeeded?: string[];
  parentHints?: string;
}
const asString = (value: unknown): string | undefined =>
  typeof value === "string" ? value : undefined;
const disabilitySchema = z.object({
  id: z.string().optional(),
  type: z.string().min(1),
  diagnosisDate: z.string().optional(),
  description: z.string().optional(),
  supportRequired: z.string().optional(),
  communicationPreferences: z.array(z.string()).optional(),
  triggers: z.array(z.string()).optional(),
  calmingStrategies: z.array(z.string()).optional(),
});
const specialNeedSchema = z.object({
  id: z.string().optional(),
  category: z.enum([
    "PHYSICAL",
    "LEARNING",
    "SENSORY",
    "BEHAVIORAL",
    "MEDICAL",
    "OTHER",
  ]),
  name: z.string().min(1),
  description: z.string().optional(),
  severity: z.enum(["MILD", "MODERATE", "SEVERE"]).optional(),
  accommodationsNeeded: z.array(z.string()).optional(),
  parentHints: z.string().optional(),
});
const createAthleteRequestSchema = z.object({
  familyId: familyIdSchema,
  firstName: z.string().trim().min(1),
  lastName: z.string().trim().min(1),
  nickname: z.string().trim().optional(),
  dateOfBirth: z.string().trim().optional(),
  gender: z
    .enum(["MALE", "FEMALE", "OTHER", "PREFER_NOT_TO_SAY"])
    .default("PREFER_NOT_TO_SAY"),
  relationship: z
    .enum(["SON", "DAUGHTER", "WARD", "GRANDCHILD", "OTHER"])
    .default("OTHER"),
  primaryPosition: z.string().trim().nullable().optional(),
  photoUrl: z.string().trim().optional(),
  disabilities: z.array(disabilitySchema).optional(),
  specialNeeds: z.array(specialNeedSchema).optional(),
  communicationNotes: z.string().trim().optional(),
  behavioralNotes: z.string().trim().optional(),
});
const updateAthleteRequestSchema = createAthleteRequestSchema
  .omit({
    familyId: true,
  })
  .partial();
const athleteSquadMembershipsResponseSchema = z.object({
  athleteId: athleteIdSchema,
  memberships: z.array(
    z.object({
      id: z.string(),
      athleteId: athleteIdSchema,
      squadId: z.string(),
      clubId: z.string(),
      squadName: z.string(),
      squadLevel: z.string(),
      status: z.enum(["ACTIVE", "INACTIVE", "PENDING"]),
      joinedAt: z.string(),
    }),
  ),
});
const guardianInviteIdSchema = z.string().regex(/^ginv_[A-Za-z0-9-]+$/);
const familyGuardianIdSchema = z.string().trim().min(1);
function resolveParentIdFromAthlete(
  athlete: Record<string, unknown>,
): string | null {
  const guardians = Array.isArray(athlete.guardians)
    ? (athlete.guardians as SeedRow[])
    : [];
  const primary = guardians.find((row) => row.isPrimary === true);
  return (
    asString(primary?.guardianUserId) ??
    asString(guardians[0]?.guardianUserId) ??
    null
  );
}
function decorateAthlete(
  athlete: Record<string, unknown>,
): Record<string, unknown> {
  return decorateFamilyAthleteRecord(
    athlete,
    resolveParentIdFromAthlete(athlete),
  );
}
async function ensureCanReadAthleteProfile(
  request: FastifyRequest,
  athleteId: string,
  familyId: string,
): Promise<void> {
  const authUserId = request.auth?.userId;
  if (!authUserId) {
    throw forbidden("Authenticated user is required");
  }
  if (isPrivilegedAdminAuth(request.auth)) {
    return;
  }
  const repository = resolveFamilyAthleteRepository();
  if (await repository.hasFamilyMembership(familyId, authUserId)) {
    return;
  }
  await assertCanReadAthleteHealth(request, athleteId);
}
const ensureAuthUserId = (userId?: string) => {
  if (!userId) {
    throw forbidden("Authenticated user is required");
  }
  return userId;
};
export function resetFamilyAthleteRouteStateForTests(): void {}
function auditResultForError(error: unknown): "DENY" | "ERROR" {
  if (
    error instanceof ApiProblemError &&
    [400, 403, 409].includes(error.status)
  ) {
    return "DENY";
  }
  return "ERROR";
}
const familyAthleteRoutes: FastifyPluginAsync = async (app) => {
  app.get("/families/:familyId", async (request, reply) => {
    const familyId = familyIdSchema.parse(
      (
        request.params as {
          familyId: string;
        }
      ).familyId,
    );
    const authUserId = ensureAuthUserId(request.auth?.userId);
    const isClubAdmin = isPrivilegedAdminAuth(request.auth);
    const repository = resolveFamilyRepository();
    const aggregate = await repository.getFamilyAggregate(
      familyId,
      authUserId,
      isClubAdmin,
    );
    await recordAuditEvent({
      request,
      action: "family.read",
      resourceType: "family",
      resourceId: familyId,
      result: "SUCCESS",
      sensitiveRead: true,
      metadata: {
        athleteCount: aggregate.athletes.length,
      },
    });
    return reply.send({
      family: aggregate.family,
      memberships: aggregate.memberships,
      athletes: aggregate.athletes.flatMap((athlete) =>
        !asString(athlete.deletedAt) ? [decorateAthlete(athlete)] : [],
      ),
      guardianInvites: aggregate.guardianInvites,
      pendingGuardianInvites: aggregate.guardianInvites,
      seedVersion: aggregate.dataVersion,
      requestId: request.requestId,
    });
  });
  app.get("/me/guardian-invites", async (request, reply) => {
    const authUserId = ensureAuthUserId(request.auth?.userId);
    const repository = resolveFamilyRepository();
    const invites = await repository.listGuardianInvitesForUser(authUserId);
    await recordAuditEvent({
      request,
      action: "family_guardian_invite.list",
      resourceType: "family_guardian_invite",
      resourceId: authUserId,
      result: "SUCCESS",
      sensitiveRead: true,
      metadata: {
        count: invites.length,
      },
    });
    return reply.send(
      guardianInviteListResponseSchema.parse({
        invites,
      }),
    );
  });
  app.post("/families/:familyId/guardians", async (request, reply) => {
    const familyId = familyIdSchema.parse(
      (
        request.params as {
          familyId: string;
        }
      ).familyId,
    );
    const authUserId = ensureAuthUserId(request.auth?.userId);
    const body = createGuardianInviteRequestSchema.parse(request.body);
    const repository = resolveFamilyRepository();
    try {
      const result = await repository.createGuardianInvite({
        familyId,
        inviterUserId: authUserId,
        inviteeEmail: body.inviteeEmail,
        inviteeName: body.inviteeName,
        role: body.role,
        relationship: body.relationship,
        childAccess: body.childAccess,
        message: body.message,
      });
      await recordAuditEvent({
        request,
        action: "family_guardian_invite.create",
        resourceType: "family_guardian_invite",
        resourceId: result.invite.id,
        subjectUserId: null,
        result: "SUCCESS",
        metadata: {
          familyId,
          inviteeEmail: result.invite.inviteeEmail,
          role: result.invite.role,
          replayed: result.replayed,
        },
      });
      return reply
        .code(result.replayed ? 200 : 201)
        .send(guardianInviteResponseSchema.parse(result.invite));
    } catch (error) {
      await recordAuditEvent({
        request,
        action: "family_guardian_invite.create",
        resourceType: "family_guardian_invite",
        resourceId: null,
        result: auditResultForError(error),
        metadata: {
          familyId,
          inviteeEmail: body.inviteeEmail.toLowerCase(),
          role: body.role,
        },
      });
      throw error;
    }
  });
  app.post("/guardian-invites/:inviteId/accept", async (request, reply) => {
    const inviteId = guardianInviteIdSchema.parse(
      (
        request.params as {
          inviteId: string;
        }
      ).inviteId,
    );
    const authUserId = ensureAuthUserId(request.auth?.userId);
    const repository = resolveFamilyRepository();
    try {
      const result = await repository.respondGuardianInvite(
        inviteId,
        authUserId,
        "ACCEPTED",
      );
      await recordAuditEvent({
        request,
        action: "family_guardian_invite.accept",
        resourceType: "family_guardian_invite",
        resourceId: inviteId,
        result: "SUCCESS",
        metadata: {
          familyId: result.familyId,
          replayed: result.replayed,
        },
      });
      return reply.send({
        ...guardianInviteResponseSchema.parse(result.invite),
        familyId: result.familyId,
        replayed: result.replayed,
      });
    } catch (error) {
      await recordAuditEvent({
        request,
        action: "family_guardian_invite.accept",
        resourceType: "family_guardian_invite",
        resourceId: inviteId,
        result: auditResultForError(error),
      });
      throw error;
    }
  });
  app.post("/guardian-invites/:inviteId/decline", async (request, reply) => {
    const inviteId = guardianInviteIdSchema.parse(
      (
        request.params as {
          inviteId: string;
        }
      ).inviteId,
    );
    const authUserId = ensureAuthUserId(request.auth?.userId);
    const repository = resolveFamilyRepository();
    try {
      const result = await repository.respondGuardianInvite(
        inviteId,
        authUserId,
        "DECLINED",
      );
      await recordAuditEvent({
        request,
        action: "family_guardian_invite.decline",
        resourceType: "family_guardian_invite",
        resourceId: inviteId,
        result: "SUCCESS",
        metadata: {
          familyId: result.familyId,
          replayed: result.replayed,
        },
      });
      return reply.send({
        ...guardianInviteResponseSchema.parse(result.invite),
        familyId: result.familyId,
        replayed: result.replayed,
      });
    } catch (error) {
      await recordAuditEvent({
        request,
        action: "family_guardian_invite.decline",
        resourceType: "family_guardian_invite",
        resourceId: inviteId,
        result: auditResultForError(error),
      });
      throw error;
    }
  });
  app.delete(
    "/families/:familyId/guardian-invites/:inviteId",
    async (request, reply) => {
      const familyId = familyIdSchema.parse(
        (
          request.params as {
            familyId: string;
          }
        ).familyId,
      );
      const inviteId = guardianInviteIdSchema.parse(
        (
          request.params as {
            inviteId: string;
          }
        ).inviteId,
      );
      const authUserId = ensureAuthUserId(request.auth?.userId);
      const repository = resolveFamilyRepository();
      try {
        const cancelled = await repository.cancelGuardianInvite(
          familyId,
          inviteId,
          authUserId,
        );
        if (!cancelled) {
          throw notFound("Guardian invitation not found", {
            inviteId,
          });
        }
        await recordAuditEvent({
          request,
          action: "family_guardian_invite.cancel",
          resourceType: "family_guardian_invite",
          resourceId: inviteId,
          result: "SUCCESS",
          metadata: {
            familyId,
          },
        });
        return reply.code(204).send();
      } catch (error) {
        await recordAuditEvent({
          request,
          action: "family_guardian_invite.cancel",
          resourceType: "family_guardian_invite",
          resourceId: inviteId,
          result: auditResultForError(error),
          metadata: {
            familyId,
          },
        });
        throw error;
      }
    },
  );
  app.delete(
    "/families/:familyId/guardians/:guardianId",
    async (request, reply) => {
      const familyId = familyIdSchema.parse(
        (
          request.params as {
            familyId: string;
          }
        ).familyId,
      );
      const guardianId = familyGuardianIdSchema.parse(
        (
          request.params as {
            guardianId: string;
          }
        ).guardianId,
      );
      const authUserId = ensureAuthUserId(request.auth?.userId);
      const repository = resolveFamilyRepository();
      try {
        const removed = await repository.removeGuardian(
          familyId,
          guardianId,
          authUserId,
        );
        if (!removed) {
          throw notFound("Guardian not found", {
            guardianId,
          });
        }
        await recordAuditEvent({
          request,
          action: "family_guardian.remove",
          resourceType: "family_guardian",
          resourceId: guardianId,
          result: "SUCCESS",
          metadata: {
            familyId,
          },
        });
        return reply.code(204).send();
      } catch (error) {
        await recordAuditEvent({
          request,
          action: "family_guardian.remove",
          resourceType: "family_guardian",
          resourceId: guardianId,
          result: auditResultForError(error),
          metadata: {
            familyId,
          },
        });
        throw error;
      }
    },
  );
  app.post("/athletes", async (request, reply) => {
    const authUserId = ensureAuthUserId(request.auth?.userId);
    const body = createAthleteRequestSchema.parse(request.body);
    const repository = resolveFamilyAthleteRepository();
    if (!(await repository.hasFamilyMembership(body.familyId, authUserId))) {
      throw forbidden("Not allowed to manage this family");
    }
    const athlete = await repository.createAthlete(
      {
        familyId: body.familyId,
        firstName: body.firstName,
        lastName: body.lastName,
        nickname: body.nickname,
        dateOfBirth: body.dateOfBirth,
        gender: body.gender as Gender,
        relationship: body.relationship as Relationship,
        primaryPosition: body.primaryPosition,
        photoUrl: body.photoUrl,
        disabilities: body.disabilities as DisabilityRecord[] | undefined,
        specialNeeds: body.specialNeeds as SpecialNeedRecord[] | undefined,
        communicationNotes: body.communicationNotes,
        behavioralNotes: body.behavioralNotes,
      },
      authUserId,
    );
    await recordAuditEvent({
      request,
      action: "athlete.create",
      resourceType: "athlete",
      resourceId: athlete.id as string,
      result: "SUCCESS",
      metadata: {
        familyId: body.familyId,
      },
    });
    return reply.code(201).send({
      athleteId: athlete.id,
      ...athlete,
    });
  });
  app.get("/athletes/:athleteId", async (request, reply) => {
    const athleteId = athleteIdSchema.parse(
      (
        request.params as {
          athleteId: string;
        }
      ).athleteId,
    );
    const repository = resolveFamilyAthleteRepository();
    const familyId = await repository.resolveAthleteFamilyId(athleteId);
    if (familyId) {
      await ensureCanReadAthleteProfile(request, athleteId, familyId);
    } else {
      await assertCanReadAthleteHealth(request, athleteId);
    }
    const athlete = await repository.getAthlete(athleteId);
    if (!athlete) {
      throw notFound("Athlete not found", {
        athleteId,
      });
    }
    await recordAuditEvent({
      request,
      action: "athlete.read",
      resourceType: "athlete",
      resourceId: athleteId,
      result: "SUCCESS",
      sensitiveRead: true,
    });
    return reply.send({
      athleteId,
      ...athlete,
    });
  });
  app.get("/athletes/:athleteId/squad-memberships", async (request, reply) => {
    const athleteId = athleteIdSchema.parse(
      (
        request.params as {
          athleteId: string;
        }
      ).athleteId,
    );
    const authUserId = ensureAuthUserId(request.auth?.userId);
    const repository = resolveClubAuthorityRepository();
    try {
      const memberships = await repository.listAthleteSquadMemberships({
        athleteId,
        authUserId,
        isPrivilegedAdmin: isPrivilegedAdminAuth(request.auth),
      });
      await recordAuditEvent({
        request,
        action: "athlete_squad_membership.list",
        resourceType: "athlete",
        resourceId: athleteId,
        result: "SUCCESS",
        sensitiveRead: true,
        metadata: {
          count: memberships.length,
        },
      });
      return reply.send(
        athleteSquadMembershipsResponseSchema.parse({
          athleteId,
          memberships,
        }),
      );
    } catch (error) {
      await recordAuditEvent({
        request,
        action: "athlete_squad_membership.list",
        resourceType: "athlete",
        resourceId: athleteId,
        result: auditResultForError(error),
        sensitiveRead: true,
      });
      throw error;
    }
  });
  app.patch("/athletes/:athleteId", async (request, reply) => {
    const authUserId = ensureAuthUserId(request.auth?.userId);
    const athleteId = athleteIdSchema.parse(
      (
        request.params as {
          athleteId: string;
        }
      ).athleteId,
    );
    const body = updateAthleteRequestSchema.parse(request.body);
    const repository = resolveFamilyAthleteRepository();
    const familyId = await repository.resolveAthleteFamilyId(athleteId);
    if (!familyId) {
      throw notFound("Athlete not found", {
        athleteId,
      });
    }
    if (!(await repository.hasFamilyMembership(familyId, authUserId))) {
      throw forbidden("Not allowed to manage this family");
    }
    const athlete = await repository.updateAthlete(
      athleteId,
      {
        firstName: body.firstName,
        lastName: body.lastName,
        nickname: body.nickname,
        dateOfBirth: body.dateOfBirth,
        gender: body.gender as Gender | undefined,
        relationship: body.relationship as Relationship | undefined,
        primaryPosition: body.primaryPosition,
        photoUrl: body.photoUrl,
        disabilities: body.disabilities as DisabilityRecord[] | undefined,
        specialNeeds: body.specialNeeds as SpecialNeedRecord[] | undefined,
        communicationNotes: body.communicationNotes,
        behavioralNotes: body.behavioralNotes,
      },
      authUserId,
    );
    if (!athlete) {
      throw notFound("Athlete not found", {
        athleteId,
      });
    }
    await recordAuditEvent({
      request,
      action: "athlete.update",
      resourceType: "athlete",
      resourceId: athleteId,
      result: "SUCCESS",
    });
    return reply.send({
      athleteId,
      ...athlete,
    });
  });
  app.delete("/athletes/:athleteId", async (request, reply) => {
    const authUserId = ensureAuthUserId(request.auth?.userId);
    const athleteId = athleteIdSchema.parse(
      (
        request.params as {
          athleteId: string;
        }
      ).athleteId,
    );
    const repository = resolveFamilyAthleteRepository();
    const familyId = await repository.resolveAthleteFamilyId(athleteId);
    if (!familyId) {
      throw notFound("Athlete not found", {
        athleteId,
      });
    }
    if (!(await repository.hasFamilyMembership(familyId, authUserId))) {
      throw forbidden("Not allowed to manage this family");
    }
    const deleted = await repository.deleteAthlete(athleteId, authUserId);
    if (!deleted) {
      throw notFound("Athlete not found", {
        athleteId,
      });
    }
    await recordAuditEvent({
      request,
      action: "athlete.delete",
      resourceType: "athlete",
      resourceId: athleteId,
      result: "SUCCESS",
    });
    return reply.code(204).send();
  });
  app.get("/athletes/:athleteId/injuries", async (request, reply) => {
    const athleteId = athleteIdSchema.parse(
      (
        request.params as {
          athleteId: string;
        }
      ).athleteId,
    );
    await assertCanReadAthleteHealth(request, athleteId);
    const repository = resolveFamilyAthleteRepository();
    const injuries = await repository.listInjuries(athleteId);
    const payload = injuriesResponseSchema.parse({
      athleteId,
      injuries,
    });
    await recordAuditEvent({
      request,
      action: "athlete_injury.read",
      resourceType: "athlete_injury",
      resourceId: athleteId,
      result: "SUCCESS",
      sensitiveRead: true,
      metadata: {
        count: injuries.length,
      },
    });
    return reply.send(payload);
  });
  app.post("/athletes/:athleteId/injuries", async (request, reply) => {
    const athleteId = athleteIdSchema.parse(
      (
        request.params as {
          athleteId: string;
        }
      ).athleteId,
    );
    await assertCanWriteAthleteHealth(request, athleteId);
    const body = createInjuryRequestSchema.parse(request.body);
    const createdByUserId = ensureAuthUserId(request.auth?.userId);
    const repository = resolveFamilyAthleteRepository();
    const injury = await repository.createInjury(
      athleteId,
      {
        title: body.title,
        type: body.type,
        severity: body.severity,
        reportedAt: body.reportedAt,
        expectedRecoveryDate: body.expectedRecoveryDate,
        notes: body.notes ?? null,
      },
      createdByUserId,
    );
    await recordAuditEvent({
      request,
      action: "athlete_injury.create",
      resourceType: "athlete_injury",
      resourceId: injury.id,
      result: "SUCCESS",
      metadata: {
        athleteId,
      },
    });
    return reply.status(201).send(injury);
  });
  app.patch("/injuries/:injuryId", async (request, reply) => {
    const injuryId = injuryIdSchema.parse(
      (
        request.params as {
          injuryId: string;
        }
      ).injuryId,
    );
    const body = updateInjuryRequestSchema.parse(request.body);
    const repository = resolveFamilyAthleteRepository();
    const current = await repository.getInjury(injuryId);
    if (!current) {
      throw notFound("Injury record not found", {
        injuryId,
      });
    }
    await assertCanWriteAthleteHealth(request, current.athleteId);
    const updated = await repository.updateInjury(
      injuryId,
      {
        title: body.title,
        type: body.type,
        severity: body.severity,
        status: body.status,
        expectedRecoveryDate: body.expectedRecoveryDate,
        resolvedAt: body.resolvedAt,
        notes: body.notes ?? null,
      },
      ensureAuthUserId(request.auth?.userId),
    );
    if (!updated) {
      throw notFound("Injury record not found", {
        injuryId,
      });
    }
    await recordAuditEvent({
      request,
      action: "athlete_injury.update",
      resourceType: "athlete_injury",
      resourceId: injuryId,
      result: "SUCCESS",
      metadata: {
        athleteId: current.athleteId,
      },
    });
    return reply.send(updated);
  });
  app.get("/athletes/:athleteId/medical", async (request, reply) => {
    const athleteId = athleteIdSchema.parse(
      (
        request.params as {
          athleteId: string;
        }
      ).athleteId,
    );
    await assertCanReadAthleteMedical(request, athleteId);
    const userId = ensureAuthUserId(request.auth?.userId);
    const repository = resolveFamilyAthleteRepository();
    const record = await repository.getMedical(athleteId, userId);
    await recordAuditEvent({
      request,
      action: "medical.read",
      resourceType: "child_medical_record",
      resourceId: athleteId,
      result: "SUCCESS",
      sensitiveRead: true,
    });
    return reply.send(medicalRecordResponseSchema.parse(record));
  });
  app.patch("/athletes/:athleteId/medical", async (request, reply) => {
    const athleteId = athleteIdSchema.parse(
      (
        request.params as {
          athleteId: string;
        }
      ).athleteId,
    );
    await assertCanWriteAthleteMedical(request, athleteId);
    const body = updateMedicalRecordRequestSchema.parse(request.body);
    const userId = ensureAuthUserId(request.auth?.userId);
    const repository = resolveFamilyAthleteRepository();
    const updated = await repository.upsertMedical(
      athleteId,
      {
        conditions: body.conditions,
        allergies: body.allergies,
        medications: body.medications,
        restrictions: body.restrictions,
        doctorName: body.doctorName,
        doctorPhone: body.doctorPhone,
        insuranceProvider: body.insuranceProvider,
        insuranceNumber: body.insuranceNumber,
        emergencyNotes: body.emergencyNotes,
        senNotes: body.senNotes,
      },
      userId,
    );
    await recordAuditEvent({
      request,
      action: "medical.update",
      resourceType: "child_medical_record",
      resourceId: athleteId,
      result: "SUCCESS",
    });
    return reply.send(medicalRecordResponseSchema.parse(updated));
  });
  app.get("/athletes/:athleteId/emergency-contacts", async (request, reply) => {
    const athleteId = athleteIdSchema.parse(
      (
        request.params as {
          athleteId: string;
        }
      ).athleteId,
    );
    await assertCanReadAthleteMedical(request, athleteId);
    const userId = ensureAuthUserId(request.auth?.userId);
    const repository = resolveFamilyAthleteRepository();
    const record = await repository.getEmergencyContacts(athleteId, userId);
    await recordAuditEvent({
      request,
      action: "emergency_contacts.read",
      resourceType: "child_emergency_contact",
      resourceId: athleteId,
      result: "SUCCESS",
      sensitiveRead: true,
    });
    return reply.send(emergencyContactsResponseSchema.parse(record));
  });
  app.patch(
    "/athletes/:athleteId/emergency-contacts",
    async (request, reply) => {
      const athleteId = athleteIdSchema.parse(
        (
          request.params as {
            athleteId: string;
          }
        ).athleteId,
      );
      await assertCanWriteAthleteMedical(request, athleteId);
      const body = updateEmergencyContactsRequestSchema.parse(request.body);
      const userId = ensureAuthUserId(request.auth?.userId);
      const repository = resolveFamilyAthleteRepository();
      const updated = await repository.replaceEmergencyContacts(
        athleteId,
        {
          contacts: body.contacts,
        },
        userId,
      );
      await recordAuditEvent({
        request,
        action: "emergency_contacts.update",
        resourceType: "child_emergency_contact",
        resourceId: athleteId,
        result: "SUCCESS",
        metadata: {
          count: body.contacts.length,
        },
      });
      return reply.send(emergencyContactsResponseSchema.parse(updated));
    },
  );
  app.get("/athletes/:athleteId/consents", async (request, reply) => {
    const athleteId = athleteIdSchema.parse(
      (
        request.params as {
          athleteId: string;
        }
      ).athleteId,
    );
    await assertCanReadAthleteMedical(request, athleteId);
    const userId = ensureAuthUserId(request.auth?.userId);
    const repository = resolveFamilyAthleteRepository();
    const record = await repository.getConsents(athleteId, userId);
    await recordAuditEvent({
      request,
      action: "consents.read",
      resourceType: "child_consent",
      resourceId: athleteId,
      result: "SUCCESS",
      sensitiveRead: true,
    });
    return reply.send(consentsResponseSchema.parse(record));
  });
  app.put("/athletes/:athleteId/consents", async (request, reply) => {
    const athleteId = athleteIdSchema.parse(
      (
        request.params as {
          athleteId: string;
        }
      ).athleteId,
    );
    await assertCanWriteAthleteMedical(request, athleteId);
    const body = upsertConsentsRequestSchema.parse(request.body);
    const userId = ensureAuthUserId(request.auth?.userId);
    const repository = resolveFamilyAthleteRepository();
    const updated = await repository.replaceConsents(
      athleteId,
      {
        consents: body.consents.map((consent) => ({
          type: consent.type as (typeof consentTypeSchema.options)[number],
          granted: consent.granted,
          grantedAt: consent.grantedAt,
          grantedBy: consent.grantedBy,
          expiryAt: consent.expiryAt,
        })),
      },
      userId,
    );
    await recordAuditEvent({
      request,
      action: "consents.update",
      resourceType: "child_consent",
      resourceId: athleteId,
      result: "SUCCESS",
      metadata: {
        count: body.consents.length,
      },
    });
    return reply.send(consentsResponseSchema.parse(updated));
  });
};
export default familyAthleteRoutes;
