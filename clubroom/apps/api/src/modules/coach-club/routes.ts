import type { FastifyPluginAsync } from 'fastify';
import { getClubGovernanceSnapshot, parseOrganizationRole } from '@clubroom/shared-contracts';
import { forbidden, notFound } from '../../lib/http-errors.js';
import { getMarketplaceSeedStore } from '../../lib/marketplace-seed-store.js';

type SeedRow = Record<string, unknown>;

const asRows = (value: unknown): SeedRow[] => (Array.isArray(value) ? (value as SeedRow[]) : []);
const asString = (value: unknown): string | undefined => (typeof value === 'string' ? value : undefined);

const coachClubRoutes: FastifyPluginAsync = async (app) => {
  app.get('/coaches/me/profile', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }

    const store = getMarketplaceSeedStore();
    const coachProfiles = asRows(store.tables.coachProfiles);
    const coachLocations = asRows(store.tables.coachLocations);
    const availabilityTemplates = asRows(store.tables.availabilityTemplates);
    const availabilityOverrides = asRows(store.tables.availabilityOverrides);
    const schedulingRules = asRows(store.tables.schedulingRules);
    const cancellationPolicyRules = asRows(store.tables.cancellationPolicyRules);

    const profile = coachProfiles.find((row) => asString(row.userId) === authUserId);
    if (!profile) {
      throw notFound('Coach profile not found', { userId: authUserId });
    }

    const cancellationPolicyId = asString(
      schedulingRules.find((row) => asString(row.coachUserId) === authUserId)?.cancellationPolicyId,
    );

    return reply.send({
      profile,
      locations: coachLocations.filter((row) => asString(row.coachUserId) === authUserId),
      availabilityTemplates: availabilityTemplates.filter((row) => asString(row.coachUserId) === authUserId),
      availabilityOverrides: availabilityOverrides.filter((row) => asString(row.coachUserId) === authUserId),
      schedulingRules: schedulingRules.filter((row) => asString(row.coachUserId) === authUserId),
      cancellationPolicyRules: cancellationPolicyRules.filter((row) =>
        asString(row.coachUserId) === authUserId
        || (cancellationPolicyId && asString(row.id) === cancellationPolicyId)
      ),
      seedVersion: store.version,
      requestId: request.requestId,
    });
  });

  app.get('/coaches/me/offerings', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }

    const store = getMarketplaceSeedStore();
    const offerings = asRows(store.tables.coachingOfferings).filter(
      (row) => asString(row.coachUserId) === authUserId,
    );

    return reply.send({
      offerings,
      total: offerings.length,
      seedVersion: store.version,
      requestId: request.requestId,
    });
  });

  app.get('/coaches/me/verifications/:type/documents', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }

    const requestedType = asString((request.params as { type?: string }).type)?.toLowerCase();
    if (!requestedType) {
      throw notFound('Verification type is required');
    }

    const store = getMarketplaceSeedStore();
    const coachVerifications = asRows(store.tables.coachVerifications).filter((row) => {
      const owner = asString(row.coachUserId);
      const verificationType = asString(row.verificationType)?.toLowerCase();
      return owner === authUserId && verificationType === requestedType;
    });

    const verificationDocuments = asRows(store.tables.verificationDocuments);
    const mediaObjects = asRows(store.tables.mediaObjects);

    const documents = coachVerifications.map((verification) => {
      const verificationId = asString(verification.id);
      const linkedDocuments = verificationDocuments
        .filter((row) => asString(row.coachVerificationId) === verificationId)
        .map((row) => {
          const mediaObjectId = asString(row.mediaObjectId);
          const media = mediaObjects.find((item) => asString(item.id) === mediaObjectId) ?? null;
          return {
            ...row,
            mediaObject: media,
          };
        });

      return {
        verification,
        documents: linkedDocuments,
      };
    });

    return reply.send({
      type: requestedType,
      items: documents,
      total: documents.length,
      seedVersion: store.version,
      requestId: request.requestId,
    });
  });

  app.get('/clubs', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }

    const isClubAdmin =
      request.auth?.roles.includes('club_admin') || request.auth?.actingRole === 'club_admin';

    const store = getMarketplaceSeedStore();
    const clubs = asRows(store.tables.clubs);
    const clubMemberships = asRows(store.tables.clubMemberships);
    const squads = asRows(store.tables.squads);

    const allowedClubIds = new Set(
      clubMemberships
        .filter((row) => asString(row.userId) === authUserId)
        .map((row) => asString(row.clubId))
        .filter((id): id is string => Boolean(id)),
    );

    const visibleClubs = clubs.filter((club) => {
      if (isClubAdmin) {
        return true;
      }
      const clubId = asString(club.id);
      return Boolean(clubId && allowedClubIds.has(clubId));
    });

    const payload = visibleClubs.map((club) => {
      const clubId = asString(club.id);
      const memberships = clubMemberships.filter((row) => asString(row.clubId) === clubId);
      const clubSquads = squads.filter((row) => asString(row.clubId) === clubId);
      const viewerMembership = memberships.find((row) => asString(row.userId) === authUserId) ?? null;
      const viewerRole = parseOrganizationRole(asString(viewerMembership?.role));
      return {
        ...club,
        memberships,
        viewerMembership,
        viewerGovernance: getClubGovernanceSnapshot(viewerRole),
        squads: clubSquads,
      };
    });

    return reply.send({
      clubs: payload,
      total: payload.length,
      seedVersion: store.version,
      requestId: request.requestId,
    });
  });
};

export default coachClubRoutes;
