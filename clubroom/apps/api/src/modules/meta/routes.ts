import type { FastifyPluginAsync } from 'fastify';
import { env } from '@clubroom/config';
import { getApiDataBackend } from '../../lib/data-backend.js';
import { isPrivilegedAdminAuth } from '../../lib/authz.js';
import { forbidden } from '../../lib/http-errors.js';
import { getMarketplaceSeedStore } from '../../lib/marketplace-seed-store.js';

type SeedRow = Record<string, unknown>;

const asRows = (value: unknown): SeedRow[] => (Array.isArray(value) ? (value as SeedRow[]) : []);
const asString = (value: unknown): string | undefined => (typeof value === 'string' ? value : undefined);
const asNumber = (value: unknown): number | undefined => (typeof value === 'number' ? value : undefined);

const metaRoutes: FastifyPluginAsync = async (app) => {
  app.get('/meta/version', async () => ({
    service: 'clubroom-api',
    version: '0.1.0-scaffold',
    apiVersion: 'v1',
    apiDataBackend: getApiDataBackend(),
    marketplaceSeedEnabled: env.API_MARKETPLACE_SEED_ENABLED,
  }));

  app.get('/meta/seed-health', async (request) => {
    if (!request.auth?.userId) {
      throw forbidden('Authenticated user is required');
    }
    if (!isPrivilegedAdminAuth(request.auth)) {
      throw forbidden('Seed health is restricted to privileged administrators');
    }

    const store = getMarketplaceSeedStore();
    const tables = store.tables;
    const entries = Object.entries(tables);
    const tableCount = entries.length;
    const rowCount = entries.reduce((sum, [, rows]) => sum + asRows(rows).length, 0);
    const emptyTables = entries
      .filter(([, rows]) => asRows(rows).length === 0)
      .map(([table]) => table)
      .sort((a, b) => a.localeCompare(b));

    const users = asRows(tables.users);
    const roleMemberships = asRows(tables.userRoleMemberships);
    const familyMemberships = asRows(tables.familyMemberships);
    const guardianChildLinks = asRows(tables.guardianChildLinks);
    const clubMemberships = asRows(tables.clubMemberships);
    const coachProfiles = asRows(tables.coachProfiles);
    const offerings = asRows(tables.coachingOfferings);
    const availabilityTemplates = asRows(tables.availabilityTemplates);
    const availabilityOverrides = asRows(tables.availabilityOverrides);
    const invoices = asRows(tables.invoices);

    const userIdsWithFamily = new Set(
      familyMemberships
        .map((row) => asString(row.userId))
        .filter((userId): userId is string => Boolean(userId)),
    );
    const userIdsWithClub = new Set(
      clubMemberships
        .map((row) => asString(row.userId))
        .filter((userId): userId is string => Boolean(userId)),
    );

    const rolesByUserId = new Map<string, Set<string>>();
    for (const row of roleMemberships) {
      const userId = asString(row.userId);
      const role = asString(row.role);
      if (!userId || !role) {
        continue;
      }
      const roles = rolesByUserId.get(userId) ?? new Set<string>();
      roles.add(role);
      rolesByUserId.set(userId, roles);
    }

    const roleCounts = [...rolesByUserId.values()].reduce<Record<string, number>>((acc, roles) => {
      for (const role of roles) {
        acc[role] = (acc[role] ?? 0) + 1;
      }
      return acc;
    }, {});

    const coachIds = new Set(
      coachProfiles
        .map((row) => asString(row.userId))
        .filter((userId): userId is string => Boolean(userId)),
    );
    const coachIdsWithOfferings = new Set(
      offerings
        .map((row) => asString(row.coachUserId))
        .filter((userId): userId is string => Boolean(userId)),
    );
    const coachIdsWithAvailability = new Set(
      availabilityTemplates
        .map((row) => asString(row.coachUserId))
        .filter((userId): userId is string => Boolean(userId)),
    );
    const coachIdsWithOfferingsAndAvailability = new Set(
      [...coachIds].filter(
        (userId) => coachIdsWithOfferings.has(userId) && coachIdsWithAvailability.has(userId),
      ),
    );

    const parentUserIds = [...rolesByUserId.entries()]
      .filter(([, roles]) => roles.has('parent'))
      .map(([userId]) => userId);
    const parentUserIdsWithoutFamily = parentUserIds.filter((userId) => !userIdsWithFamily.has(userId));
    const parentUserIdsWithKids = new Set(
      guardianChildLinks
        .map((row) => asString(row.guardianUserId))
        .filter((userId): userId is string => Boolean(userId)),
    );
    const parentUserIdsWithoutKids = parentUserIds.filter((userId) => !parentUserIdsWithKids.has(userId));

    const standaloneUserIds = users
      .map((row) => asString(row.id))
      .filter((userId): userId is string => Boolean(userId))
      .filter((userId) => !userIdsWithFamily.has(userId) && !userIdsWithClub.has(userId));

    const memberUserIds = [...rolesByUserId.entries()]
      .filter(([, roles]) => roles.has('member'))
      .map(([userId]) => userId);

    const standaloneMemberUserIds = standaloneUserIds.filter((userId) => memberUserIds.includes(userId));
    const clubLinkedMemberUserIds = memberUserIds.filter((userId) => userIdsWithClub.has(userId));

    const coachOfferingCounts = new Map<string, number>();
    for (const offering of offerings) {
      const coachUserId = asString(offering.coachUserId);
      if (!coachUserId) {
        continue;
      }
      coachOfferingCounts.set(coachUserId, (coachOfferingCounts.get(coachUserId) ?? 0) + 1);
    }

    const coachAvailabilityWindowSets = new Map<string, Set<string>>();
    for (const row of availabilityTemplates) {
      const coachUserId = asString(row.coachUserId);
      const dayOfWeek = asNumber(row.dayOfWeek);
      const startTimeLocal = asString(row.startTimeLocal);
      const endTimeLocal = asString(row.endTimeLocal);
      if (!coachUserId || dayOfWeek === undefined || !startTimeLocal || !endTimeLocal) {
        continue;
      }
      const windows = coachAvailabilityWindowSets.get(coachUserId) ?? new Set<string>();
      windows.add(`${dayOfWeek}:${startTimeLocal}-${endTimeLocal}`);
      coachAvailabilityWindowSets.set(coachUserId, windows);
    }

    const availabilityWindows = new Set(
      availabilityTemplates
        .map((row) => {
          const dayOfWeek = asNumber(row.dayOfWeek);
          const startTimeLocal = asString(row.startTimeLocal);
          const endTimeLocal = asString(row.endTimeLocal);
          if (dayOfWeek === undefined || !startTimeLocal || !endTimeLocal) {
            return undefined;
          }
          return `${dayOfWeek}:${startTimeLocal}-${endTimeLocal}`;
        })
        .filter((value): value is string => Boolean(value)),
    );
    const offeringDurations = new Set(
      offerings
        .map((row) => asNumber(row.durationMinutes))
        .filter((duration): duration is number => duration !== undefined),
    );
    const offeringServiceTypes = new Set(
      offerings
        .map((row) => asString(row.serviceType))
        .filter((serviceType): serviceType is string => Boolean(serviceType)),
    );
    const availabilityDaysCovered = new Set(
      availabilityTemplates
        .map((row) => asNumber(row.dayOfWeek))
        .filter((day): day is number => day !== undefined),
    );

    return {
      seedVersion: store.version,
      generatedAt: new Date().toISOString(),
      tableCount,
      rowCount,
      emptyTables,
      roleCounts,
      coverage: {
        userCount: users.length,
        usersConnectedToClub: userIdsWithClub.size,
        usersNotConnectedToClub: users.length - userIdsWithClub.size,
        parentsWithFamily: parentUserIds.length - parentUserIdsWithoutFamily.length,
        parentsWithoutFamily: parentUserIdsWithoutFamily.length,
        parentsWithKids: parentUserIds.length - parentUserIdsWithoutKids.length,
        parentsWithoutKids: parentUserIdsWithoutKids.length,
        standaloneUsers: standaloneUserIds.length,
        standaloneMembers: standaloneMemberUserIds.length,
        clubLinkedMembers: clubLinkedMemberUserIds.length,
        coachesTotal: coachIds.size,
        coachesWithOfferings: coachIdsWithOfferings.size,
        coachesWithAvailability: coachIdsWithAvailability.size,
        coachesWithOfferingsAndAvailability: coachIdsWithOfferingsAndAvailability.size,
        coachesWithMultipleOfferings: [...coachIds].filter(
          (userId) => (coachOfferingCounts.get(userId) ?? 0) >= 2,
        ).length,
        coachesWithMultipleAvailabilityWindows: [...coachIds].filter(
          (userId) => (coachAvailabilityWindowSets.get(userId)?.size ?? 0) >= 2,
        ).length,
        coachesWithAvailabilityOverrides: new Set(
          availabilityOverrides
            .map((row) => asString(row.coachUserId))
            .filter((userId): userId is string => Boolean(userId)),
        ).size,
        offeringServiceTypeCount: offeringServiceTypes.size,
        offeringDurationCount: offeringDurations.size,
        availabilityWindowCount: availabilityWindows.size,
        availabilityDayCoverage: availabilityDaysCovered.size,
        invoicePaidCount: invoices.filter((row) => asString(row.status) === 'PAID').length,
        invoiceOutstandingCount: invoices.filter((row) => asString(row.status) === 'SENT').length,
      },
      sections: {
        identity: {
          users: users.length,
          profiles: asRows(tables.userProfiles).length,
          roleMemberships: roleMemberships.length,
          devices: asRows(tables.userDevices).length,
          sessions: asRows(tables.authSessions).length,
        },
        marketplace: {
          coachProfiles: coachProfiles.length,
          offerings: offerings.length,
          availabilityTemplates: availabilityTemplates.length,
          bookings: asRows(tables.bookings).length,
          invoices: asRows(tables.invoices).length,
        },
        development: {
          goals: asRows(tables.goals).length,
          badges: asRows(tables.athleteBadges).length,
          notes: asRows(tables.sessionNotes).length,
          drills: asRows(tables.drills).length,
        },
        community: {
          groups: asRows(tables.communityGroups).length,
          posts: asRows(tables.posts).length,
          threads: asRows(tables.messageThreads).length,
          notifications: asRows(tables.notifications).length,
        },
        trustOps: {
          verifications: asRows(tables.coachVerifications).length,
          accessGrants: asRows(tables.accessGrants).length,
          safeguardingIncidents: asRows(tables.safeguardingIncidents).length,
          retentionRuns: asRows(tables.retentionRuns).length,
          dataDeletionRequests: asRows(tables.dataDeletionRequests).length,
        },
      },
    };
  });
};

export default metaRoutes;
