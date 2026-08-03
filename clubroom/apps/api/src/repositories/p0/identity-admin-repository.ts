import type { AdminUserSummary } from '@clubroom/shared-contracts';

import { getApiDataBackend } from '../../lib/data-backend.js';
import { getDbFixtureStore } from '../../lib/db-fixture-store.js';
import { getMarketplaceSeedStore } from '../../lib/marketplace-seed-store.js';
import { getPrismaClientOrThrow, shouldUseDbFixtureFallback } from '../../lib/prisma-runtime.js';

type SeedRow = Record<string, unknown>;
type SeedTables = Record<string, SeedRow[]>;

const asRows = (value: unknown): SeedRow[] => (Array.isArray(value) ? (value as SeedRow[]) : []);
const asString = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;

export interface AdminUserSummaryResult {
  summary: AdminUserSummary;
  dataVersion: string | null;
}

export interface IdentityAdminRepository {
  getUserSummary(): Promise<AdminUserSummaryResult>;
}

function buildUserSummaryFromTables(
  tables: SeedTables,
  dataVersion: string | null,
): AdminUserSummaryResult {
  const activeUserIds = new Set(
    asRows(tables.users).flatMap((user) => {
      const userId = asString(user.id);
      const accountStatus = asString(user.accountStatus);
      const active =
        userId && (!accountStatus || accountStatus === 'active') && !asString(user.deletedAt);
      return active ? [userId] : [];
    }),
  );
  const usersByRole = new Map<string, Set<string>>();

  for (const membership of asRows(tables.userRoleMemberships)) {
    const userId = asString(membership.userId);
    const role = asString(membership.role);
    if (
      !userId ||
      !role ||
      !activeUserIds.has(userId) ||
      membership.active === false ||
      asString(membership.revokedAt)
    ) {
      continue;
    }
    const userIds = usersByRole.get(role) ?? new Set<string>();
    userIds.add(userId);
    usersByRole.set(role, userIds);
  }

  return {
    summary: {
      total: activeUserIds.size,
      coaches: usersByRole.get('coach')?.size ?? 0,
      athletes: usersByRole.get('athlete')?.size ?? 0,
      parents: usersByRole.get('parent')?.size ?? 0,
    },
    dataVersion,
  };
}

class SeedIdentityAdminRepository implements IdentityAdminRepository {
  async getUserSummary(): Promise<AdminUserSummaryResult> {
    const store = getMarketplaceSeedStore();
    return buildUserSummaryFromTables(store.tables, store.version);
  }
}

class FixtureIdentityAdminRepository implements IdentityAdminRepository {
  async getUserSummary(): Promise<AdminUserSummaryResult> {
    return buildUserSummaryFromTables(getDbFixtureStore().tables, null);
  }
}

class DbIdentityAdminRepository implements IdentityAdminRepository {
  async getUserSummary(): Promise<AdminUserSummaryResult> {
    if (shouldUseDbFixtureFallback()) {
      return new FixtureIdentityAdminRepository().getUserSummary();
    }

    const prisma = getPrismaClientOrThrow();
    const activeUserWhere = {
      accountStatus: 'active',
      deletedAt: null,
    } as const;
    const activeRoleWhere = (role: 'coach' | 'athlete' | 'parent') => ({
      ...activeUserWhere,
      roles: {
        some: {
          role,
          active: true,
          revokedAt: null,
        },
      },
    });
    const [total, coaches, athletes, parents] = await Promise.all([
      prisma.user.count({ where: activeUserWhere }),
      prisma.user.count({ where: activeRoleWhere('coach') }),
      prisma.user.count({ where: activeRoleWhere('athlete') }),
      prisma.user.count({ where: activeRoleWhere('parent') }),
    ]);

    return {
      summary: {
        total,
        coaches,
        athletes,
        parents,
      },
      dataVersion: null,
    };
  }
}

const seedIdentityAdminRepository = new SeedIdentityAdminRepository();
const dbIdentityAdminRepository = new DbIdentityAdminRepository();

export function resolveIdentityAdminRepository(): IdentityAdminRepository {
  return getApiDataBackend() === 'db' ? dbIdentityAdminRepository : seedIdentityAdminRepository;
}
