import { randomUUID } from 'node:crypto';
import { getApiDataBackend } from '../../lib/data-backend.js';
import { getDbFixtureStore } from '../../lib/db-fixture-store.js';
import { badRequest, notFound } from '../../lib/http-errors.js';
import { getMarketplaceSeedStore } from '../../lib/marketplace-seed-store.js';
import { getPrismaClientOrThrow, shouldUseDbFixtureFallback } from '../../lib/prisma-runtime.js';
import { normalizeForJson } from './normalize.js';

type SeedRow = Record<string, unknown>;
type SeedTables = Record<string, SeedRow[]>;

export type BlockRelationship = 'none' | 'blocked_by_actor' | 'blocked_by_target' | 'mutual';

export interface UserBlockRecord {
  id: string;
  blockerUserId: string;
  blockedUserId: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserBlockStatus {
  relationship: BlockRelationship;
  blocked: boolean;
  blockerId: string | null;
  blockedId: string | null;
}

export interface UserBlockListResponse {
  blocks: UserBlockRecord[];
  blockedUserIds: string[];
  total: number;
  dataVersion: string | null;
}

export interface UserBlockRepository {
  listBlockedUsers(actorUserId: string): Promise<UserBlockListResponse>;
  getBlockStatus(actorUserId: string, targetUserId: string): Promise<UserBlockStatus>;
  blockUser(actorUserId: string, targetUserId: string): Promise<UserBlockStatus>;
  unblockUser(actorUserId: string, targetUserId: string): Promise<UserBlockStatus>;
}

const asRows = (value: unknown): SeedRow[] => (Array.isArray(value) ? (value as SeedRow[]) : []);
const asString = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;
const nowIso = () => new Date().toISOString();
const newId = () => `ubl_${randomUUID()}`;

function ensureTable(tables: SeedTables, key: string): SeedRow[] {
  if (!Array.isArray(tables[key])) {
    tables[key] = [];
  }
  return tables[key];
}

function assertCanTarget(actorUserId: string, targetUserId: string): void {
  if (actorUserId === targetUserId) {
    throw badRequest('Users cannot block themselves');
  }
}

function isActiveBlock(row: SeedRow): boolean {
  return !asString(row.deletedAt);
}

function mapSeedBlock(row: SeedRow): UserBlockRecord {
  const createdAt = asString(row.createdAt) ?? nowIso();
  return {
    id: asString(row.id) ?? '',
    blockerUserId: asString(row.blockerUserId) ?? '',
    blockedUserId: asString(row.blockedUserId) ?? '',
    createdAt,
    updatedAt: asString(row.updatedAt) ?? createdAt,
  };
}

function resolveStatus(params: {
  actorUserId: string;
  targetUserId: string;
  actorBlockedTarget: boolean;
  targetBlockedActor: boolean;
}): UserBlockStatus {
  if (params.actorBlockedTarget && params.targetBlockedActor) {
    return {
      relationship: 'mutual',
      blocked: true,
      blockerId: params.actorUserId,
      blockedId: params.targetUserId,
    };
  }
  if (params.actorBlockedTarget) {
    return {
      relationship: 'blocked_by_actor',
      blocked: true,
      blockerId: params.actorUserId,
      blockedId: params.targetUserId,
    };
  }
  if (params.targetBlockedActor) {
    return {
      relationship: 'blocked_by_target',
      blocked: true,
      blockerId: params.targetUserId,
      blockedId: params.actorUserId,
    };
  }
  return {
    relationship: 'none',
    blocked: false,
    blockerId: null,
    blockedId: null,
  };
}

function ensureSeedTargetUser(tables: SeedTables, targetUserId: string): void {
  const target = asRows(tables.users).find(
    (user) =>
      asString(user.id) === targetUserId &&
      asString(user.accountStatus) !== 'disabled' &&
      !asString(user.deletedAt),
  );
  if (!target) {
    throw notFound('Target user not found', { targetUserId });
  }
}

class StoreUserBlockRepository implements UserBlockRepository {
  constructor(
    private readonly storeProvider: () => { tables: SeedTables; version: string | null },
  ) {}

  async listBlockedUsers(actorUserId: string): Promise<UserBlockListResponse> {
    const store = this.storeProvider();
    const blocks = asRows(store.tables.userBlocks)
      .filter((row) => asString(row.blockerUserId) === actorUserId && isActiveBlock(row))
      .map(mapSeedBlock)
      .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt));
    return {
      blocks,
      blockedUserIds: blocks.map((block) => block.blockedUserId),
      total: blocks.length,
      dataVersion: store.version,
    };
  }

  async getBlockStatus(actorUserId: string, targetUserId: string): Promise<UserBlockStatus> {
    assertCanTarget(actorUserId, targetUserId);
    const store = this.storeProvider();
    const rows = asRows(store.tables.userBlocks).filter(isActiveBlock);
    return resolveStatus({
      actorUserId,
      targetUserId,
      actorBlockedTarget: rows.some(
        (row) =>
          asString(row.blockerUserId) === actorUserId &&
          asString(row.blockedUserId) === targetUserId,
      ),
      targetBlockedActor: rows.some(
        (row) =>
          asString(row.blockerUserId) === targetUserId &&
          asString(row.blockedUserId) === actorUserId,
      ),
    });
  }

  async blockUser(actorUserId: string, targetUserId: string): Promise<UserBlockStatus> {
    assertCanTarget(actorUserId, targetUserId);
    const store = this.storeProvider();
    ensureSeedTargetUser(store.tables, targetUserId);
    const rows = ensureTable(store.tables, 'userBlocks');
    const existing = rows.find(
      (row) =>
        asString(row.blockerUserId) === actorUserId && asString(row.blockedUserId) === targetUserId,
    );
    const now = nowIso();
    if (existing) {
      Object.assign(existing, {
        deletedAt: null,
        deletedByUserId: null,
        updatedAt: now,
      });
    } else {
      rows.push({
        id: newId(),
        blockerUserId: actorUserId,
        blockedUserId: targetUserId,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
        deletedByUserId: null,
      });
    }
    return this.getBlockStatus(actorUserId, targetUserId);
  }

  async unblockUser(actorUserId: string, targetUserId: string): Promise<UserBlockStatus> {
    assertCanTarget(actorUserId, targetUserId);
    const store = this.storeProvider();
    const row = ensureTable(store.tables, 'userBlocks').find(
      (candidate) =>
        asString(candidate.blockerUserId) === actorUserId &&
        asString(candidate.blockedUserId) === targetUserId &&
        isActiveBlock(candidate),
    );
    if (row) {
      const now = nowIso();
      Object.assign(row, {
        deletedAt: now,
        deletedByUserId: actorUserId,
        updatedAt: now,
      });
    }
    return this.getBlockStatus(actorUserId, targetUserId);
  }
}

class DbUserBlockRepository implements UserBlockRepository {
  private readonly fixture = new StoreUserBlockRepository(() => ({
    tables: getDbFixtureStore().tables,
    version: getDbFixtureStore().version,
  }));

  async listBlockedUsers(actorUserId: string): Promise<UserBlockListResponse> {
    if (shouldUseDbFixtureFallback()) {
      return this.fixture.listBlockedUsers(actorUserId);
    }
    const prisma = getPrismaClientOrThrow();
    const blocks = await prisma.userBlock.findMany({
      where: {
        blockerUserId: actorUserId,
        deletedAt: null,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    const mapped = blocks.map((block) => ({
      id: block.id,
      blockerUserId: block.blockerUserId,
      blockedUserId: block.blockedUserId,
      createdAt: block.createdAt.toISOString(),
      updatedAt: block.updatedAt.toISOString(),
    }));
    return normalizeForJson({
      blocks: mapped,
      blockedUserIds: mapped.map((block) => block.blockedUserId),
      total: mapped.length,
      dataVersion: null,
    });
  }

  async getBlockStatus(actorUserId: string, targetUserId: string): Promise<UserBlockStatus> {
    assertCanTarget(actorUserId, targetUserId);
    if (shouldUseDbFixtureFallback()) {
      return this.fixture.getBlockStatus(actorUserId, targetUserId);
    }
    const prisma = getPrismaClientOrThrow();
    const rows = await prisma.userBlock.findMany({
      where: {
        deletedAt: null,
        OR: [
          {
            blockerUserId: actorUserId,
            blockedUserId: targetUserId,
          },
          {
            blockerUserId: targetUserId,
            blockedUserId: actorUserId,
          },
        ],
      },
      select: {
        blockerUserId: true,
        blockedUserId: true,
      },
    });
    return resolveStatus({
      actorUserId,
      targetUserId,
      actorBlockedTarget: rows.some(
        (row) => row.blockerUserId === actorUserId && row.blockedUserId === targetUserId,
      ),
      targetBlockedActor: rows.some(
        (row) => row.blockerUserId === targetUserId && row.blockedUserId === actorUserId,
      ),
    });
  }

  async blockUser(actorUserId: string, targetUserId: string): Promise<UserBlockStatus> {
    assertCanTarget(actorUserId, targetUserId);
    if (shouldUseDbFixtureFallback()) {
      return this.fixture.blockUser(actorUserId, targetUserId);
    }
    const prisma = getPrismaClientOrThrow();
    await prisma.$transaction(async (tx) => {
      const target = await tx.user.findFirst({
        where: {
          id: targetUserId,
          accountStatus: 'active',
          deletedAt: null,
        },
        select: {
          id: true,
        },
      });
      if (!target) {
        throw notFound('Target user not found', { targetUserId });
      }
      await tx.userBlock.upsert({
        where: {
          blockerUserId_blockedUserId: {
            blockerUserId: actorUserId,
            blockedUserId: targetUserId,
          },
        },
        create: {
          id: newId(),
          blockerUserId: actorUserId,
          blockedUserId: targetUserId,
        },
        update: {
          deletedAt: null,
          deletedByUserId: null,
        },
      });
    });
    return this.getBlockStatus(actorUserId, targetUserId);
  }

  async unblockUser(actorUserId: string, targetUserId: string): Promise<UserBlockStatus> {
    assertCanTarget(actorUserId, targetUserId);
    if (shouldUseDbFixtureFallback()) {
      return this.fixture.unblockUser(actorUserId, targetUserId);
    }
    const prisma = getPrismaClientOrThrow();
    await prisma.userBlock.updateMany({
      where: {
        blockerUserId: actorUserId,
        blockedUserId: targetUserId,
        deletedAt: null,
      },
      data: {
        deletedAt: new Date(),
        deletedByUserId: actorUserId,
      },
    });
    return this.getBlockStatus(actorUserId, targetUserId);
  }
}

const seedRepository = new StoreUserBlockRepository(() => ({
  tables: getMarketplaceSeedStore().tables,
  version: getMarketplaceSeedStore().version,
}));
const dbRepository = new DbUserBlockRepository();

export function resolveUserBlockRepository(): UserBlockRepository {
  return getApiDataBackend() === 'db' ? dbRepository : seedRepository;
}
