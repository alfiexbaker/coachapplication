import type { FastifyPluginAsync } from 'fastify';
import { env } from '@clubroom/config';
import { apiVersionResponseSchema } from '@clubroom/shared-contracts';
import {
  API_MINIMUM_DEPRECATION_DAYS,
  API_SERVICE_VERSION,
  API_STATUS,
  API_VERSION,
} from '../../lib/api-lifecycle.js';
import { getApiDataBackend } from '../../lib/data-backend.js';
import { isPrivilegedAdminAuth } from '../../lib/authz.js';
import { forbidden, notFound } from '../../lib/http-errors.js';
import { getMarketplaceSeedStore } from '../../lib/marketplace-seed-store.js';
import { openApiDocument } from '../../generated/openapi.js';
type SeedRow = Record<string, unknown>;
const asRows = (value: unknown): SeedRow[] => (Array.isArray(value) ? (value as SeedRow[]) : []);
const asString = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;
const asNumber = (value: unknown): number | undefined =>
  typeof value === 'number' ? value : undefined;
const isOpenApiEnabled = () =>
  process.env.NODE_ENV !== 'production' || process.env.API_OPENAPI_ENABLED === '1';
function assertOpenApiEnabled() {
  if (!isOpenApiEnabled()) {
    throw notFound('API documentation is not enabled');
  }
}
const swaggerDocsHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Clubroom API Swagger</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css" />
    <style>
      body { margin: 0; background: #ffffff; }
      .clubroom-docs-banner {
        box-sizing: border-box;
        width: 100%;
        padding: 12px 32px;
        border-bottom: 1px solid #d9e2ec;
        color: #102a43;
        font: 14px/1.45 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }
      .clubroom-docs-banner strong { font-weight: 700; }
      #swagger-ui { min-height: 100vh; }
    </style>
  </head>
  <body>
    <div class="clubroom-docs-banner">
      <strong>OpenAPI 3.1 rendered with Swagger UI.</strong>
      Current contract major: <code>/v1</code> (preview). Breaking changes require a new
      major path. Once stable, deprecations receive at least 180 days notice and use
      the standard <code>Deprecation</code> and <code>Sunset</code> response headers.
      Clubroom lifecycle effects are exposed as <code>x-clubroom-effect</code>
      so HTTP DELETE routes can still document remove/archive/dismiss/revoke semantics.
      Google AIP conformance is not claimed.
    </div>
    <div id="swagger-ui"></div>
    <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
    <script>
      window.addEventListener('load', () => {
        window.ui = SwaggerUIBundle({
          url: '/v1/openapi.json',
          dom_id: '#swagger-ui',
          deepLinking: true,
          persistAuthorization: true,
        });
      });
    </script>
  </body>
</html>`;
const swaggerDocsContentSecurityPolicy = [
  "default-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
  "frame-ancestors 'none'",
  "connect-src 'self'",
  "img-src data:",
  "script-src https://cdn.jsdelivr.net 'unsafe-inline'",
  "style-src https://cdn.jsdelivr.net 'unsafe-inline'",
].join('; ');
const metaRoutes: FastifyPluginAsync = async (app) => {
  app.get('/openapi.json', async (_request, reply) => {
    assertOpenApiEnabled();
    return reply.type('application/json; charset=utf-8').send(openApiDocument);
  });
  app.get('/docs', async (_request, reply) => {
    assertOpenApiEnabled();
    return reply
      .header('content-security-policy', swaggerDocsContentSecurityPolicy)
      .type('text/html; charset=utf-8')
      .send(swaggerDocsHtml);
  });
  app.get('/meta/version', async () =>
    apiVersionResponseSchema.parse({
      service: 'clubroom-api',
      version: API_SERVICE_VERSION,
      apiVersion: API_VERSION,
      apiStatus: API_STATUS,
      minimumDeprecationDays: API_MINIMUM_DEPRECATION_DAYS,
      apiDataBackend: getApiDataBackend(),
      marketplaceSeedEnabled: env.API_MARKETPLACE_SEED_ENABLED,
    }),
  );
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
      .flatMap((item) =>
        (([, rows]) => asRows(rows).length === 0)(item) ? [(([table]) => table)(item)] : [],
      )
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
      familyMemberships.flatMap((row) => {
        const mapped = asString(row.userId);
        return Boolean(mapped) ? [mapped] : [];
      }),
    );
    const userIdsWithClub = new Set(
      clubMemberships.flatMap((row) => {
        const mapped = asString(row.userId);
        return Boolean(mapped) ? [mapped] : [];
      }),
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
      coachProfiles.flatMap((row) => {
        const mapped = asString(row.userId);
        return mapped ? [mapped] : [];
      }),
    );
    const coachIdsWithOfferings = new Set(
      offerings.flatMap((row) => {
        const mapped = asString(row.coachUserId);
        return mapped ? [mapped] : [];
      }),
    );
    const coachIdsWithAvailability = new Set(
      availabilityTemplates.flatMap((row) => {
        const mapped = asString(row.coachUserId);
        return mapped ? [mapped] : [];
      }),
    );
    const coachIdsWithOfferingsAndAvailability = new Set(
      [...coachIds].filter(
        (userId) => coachIdsWithOfferings.has(userId) && coachIdsWithAvailability.has(userId),
      ),
    );
    const parentUserIds = [...rolesByUserId.entries()].flatMap(([userId, roles]) =>
      roles.has('parent') ? [userId] : [],
    );
    const parentUserIdsWithoutFamily = parentUserIds.filter(
      (userId) => !userIdsWithFamily.has(userId),
    );
    const parentUserIdsWithKids = new Set(
      guardianChildLinks.flatMap((row) => {
        const mapped = asString(row.guardianUserId);
        return mapped ? [mapped] : [];
      }),
    );
    const parentUserIdsWithoutKids = parentUserIds.filter(
      (userId) => !parentUserIdsWithKids.has(userId),
    );
    const standaloneUserIds = users.flatMap((row) => {
      const mapped = (() => {
        return asString(row.id);
      })();
      return mapped && !userIdsWithFamily.has(mapped) && !userIdsWithClub.has(mapped)
        ? [mapped]
        : [];
    });
    const memberUserIds = [...rolesByUserId.entries()].flatMap(([userId, roles]) =>
      roles.has('member') ? [userId] : [],
    );
    const standaloneMemberUserIds = standaloneUserIds.filter((userId) =>
      memberUserIds.includes(userId),
    );
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
      availabilityTemplates.flatMap((row) => {
        const mapped = (() => {
          const dayOfWeek = asNumber(row.dayOfWeek);
          const startTimeLocal = asString(row.startTimeLocal);
          const endTimeLocal = asString(row.endTimeLocal);
          if (dayOfWeek === undefined || !startTimeLocal || !endTimeLocal) {
            return undefined;
          }
          return `${dayOfWeek}:${startTimeLocal}-${endTimeLocal}`;
        })();
        return mapped ? [mapped] : [];
      }),
    );
    const offeringDurations = new Set(
      offerings.flatMap((row) => {
        const mapped = asNumber(row.durationMinutes);
        return mapped !== undefined ? [mapped] : [];
      }),
    );
    const offeringServiceTypes = new Set(
      offerings.flatMap((row) => {
        const mapped = asString(row.serviceType);
        return mapped ? [mapped] : [];
      }),
    );
    const availabilityDaysCovered = new Set(
      availabilityTemplates.flatMap((row) => {
        const mapped = asNumber(row.dayOfWeek);
        return mapped !== undefined ? [mapped] : [];
      }),
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
          availabilityOverrides.flatMap((row) => {
            const mapped = asString(row.coachUserId);
            return mapped ? [mapped] : [];
          }),
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
