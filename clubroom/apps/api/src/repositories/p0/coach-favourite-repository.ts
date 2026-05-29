import { randomUUID } from "node:crypto";
import { getApiDataBackend } from "../../lib/data-backend.js";
import { getDbFixtureStore } from "../../lib/db-fixture-store.js";
import { notFound } from "../../lib/http-errors.js";
import { getMarketplaceSeedStore } from "../../lib/marketplace-seed-store.js";
import {
  getPrismaClientOrThrow,
  shouldUseDbFixtureFallback,
} from "../../lib/prisma-runtime.js";
type SeedRow = Record<string, unknown>;
type SeedTables = Record<string, SeedRow[]>;
type StoreShape = {
  version: string;
  tables: SeedTables;
};
export interface CoachFavouriteDto {
  id: string;
  userId: string;
  coachId: string;
  isFavourite: boolean;
  createdAt: string;
  updatedAt?: string;
  note?: string;
  coachName?: string;
  coachAvatar?: string;
  coachSport?: "Football";
  coachPriceMin?: number;
  coachPriceMax?: number;
  coachCity?: string;
}
export interface CoachFavouriteStatusResult {
  isFavourite: boolean;
  favourite: CoachFavouriteDto | null;
}
export interface CoachFavouriteRepository {
  listForUser(userId: string): Promise<{
    favourites: CoachFavouriteDto[];
    dataVersion: string | null;
  }>;
  getStatus(
    userId: string,
    coachUserId: string,
  ): Promise<CoachFavouriteStatusResult>;
  saveForUser(input: {
    userId: string;
    coachUserId: string;
    note?: string | null;
  }): Promise<CoachFavouriteDto>;
  removeForUser(
    userId: string,
    coachUserId: string,
  ): Promise<CoachFavouriteDto>;
}
const asRows = (value: unknown): SeedRow[] =>
  Array.isArray(value) ? (value as SeedRow[]) : [];
const asString = (value: unknown): string | undefined =>
  typeof value === "string" ? value : undefined;
const asNumber = (value: unknown): number | undefined =>
  typeof value === "number" ? value : undefined;
const asBoolean = (value: unknown, fallback = false): boolean =>
  typeof value === "boolean" ? value : fallback;
const isoNow = () => new Date().toISOString();
const newId = (prefix: string) => `${prefix}_${randomUUID()}`;
function ensureTable(tables: SeedTables, key: string): SeedRow[] {
  if (!Array.isArray(tables[key])) {
    tables[key] = [];
  }
  return tables[key];
}
function normalizeNote(
  value: string | null | undefined,
): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }
  const trimmed = value?.trim() ?? "";
  return trimmed ? trimmed : null;
}
function toIso(value: unknown): string {
  if (value instanceof Date) {
    return value.toISOString();
  }
  return asString(value) ?? isoNow();
}
function toSortTime(value: string | undefined): number {
  return value ? Date.parse(value) || 0 : 0;
}
function isActiveFavourite(row: SeedRow): boolean {
  return asBoolean(row.isFavourite, true) && !asString(row.deletedAt);
}
function getActiveCoachProfile(
  tables: SeedTables,
  coachUserId: string,
): SeedRow | undefined {
  return asRows(tables.coachProfiles).find(
    (row) => asString(row.userId) === coachUserId && !asString(row.deletedAt),
  );
}
function getCoachDisplaySnapshot(
  tables: SeedTables,
  coachUserId: string,
): Pick<
  CoachFavouriteDto,
  | "coachName"
  | "coachAvatar"
  | "coachSport"
  | "coachPriceMin"
  | "coachPriceMax"
  | "coachCity"
> {
  const user = asRows(tables.users).find(
    (row) => asString(row.id) === coachUserId,
  );
  const locations = asRows(tables.coachLocations).filter(
    (row) =>
      asString(row.coachUserId) === coachUserId && !asString(row.deletedAt),
  );
  const defaultLocation =
    locations.find((row) => row.isDefault === true) ?? locations[0];
  const prices = asRows(tables.coachingOfferings)
    .flatMap((row) => {
      if (
        !(
          asString(row.coachUserId) === coachUserId &&
          asBoolean(row.active, true) &&
          !asString(row.deletedAt)
        )
      )
        return [];
      const mapped = asNumber(row.priceMinor);
      return typeof mapped === "number" ? [mapped] : [];
    })
    .sort((left, right) => left - right);
  return {
    coachName: asString(user?.name) ?? coachUserId,
    coachAvatar: asString(user?.avatarUrl),
    coachSport: "Football",
    coachPriceMin: prices[0] !== undefined ? prices[0] / 100 : undefined,
    coachPriceMax:
      prices.at(-1) !== undefined ? (prices.at(-1) as number) / 100 : undefined,
    coachCity:
      asString(defaultLocation?.label) ??
      asString(defaultLocation?.addressText),
  };
}
function mapStoreFavourite(
  tables: SeedTables,
  row: SeedRow,
): CoachFavouriteDto {
  const coachUserId = asString(row.coachUserId) ?? asString(row.coachId) ?? "";
  const note = normalizeNote(asString(row.note) ?? null) ?? undefined;
  return {
    id: asString(row.id) ?? "",
    userId: asString(row.userId) ?? "",
    coachId: coachUserId,
    isFavourite: isActiveFavourite(row),
    createdAt: toIso(row.createdAt),
    updatedAt: asString(row.updatedAt),
    ...(note
      ? {
          note,
        }
      : {}),
    ...getCoachDisplaySnapshot(tables, coachUserId),
  };
}
interface PrismaFavouriteWithCoach {
  id: string;
  userId: string;
  coachUserId: string;
  isFavourite: boolean;
  note: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  coach: {
    user: {
      name: string;
      avatarUrl: string | null;
    };
    locations: Array<{
      label: string;
      addressText: string | null;
      isDefault: boolean;
      deletedAt: Date | null;
    }>;
    offerings: Array<{
      priceMinor: number;
      active: boolean;
      deletedAt: Date | null;
    }>;
  };
}
function mapPrismaFavourite(row: PrismaFavouriteWithCoach): CoachFavouriteDto {
  const locations = row.coach.locations.filter(
    (location) => !location.deletedAt,
  );
  const defaultLocation =
    locations.find((location) => location.isDefault) ?? locations[0];
  const prices = row.coach.offerings
    .flatMap((offering) =>
      offering.active && !offering.deletedAt ? [offering.priceMinor] : [],
    )
    .sort((left, right) => left - right);
  const note = normalizeNote(row.note);
  return {
    id: row.id,
    userId: row.userId,
    coachId: row.coachUserId,
    isFavourite: row.isFavourite && !row.deletedAt,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    ...(note
      ? {
          note,
        }
      : {}),
    coachName: row.coach.user.name,
    coachAvatar: row.coach.user.avatarUrl ?? undefined,
    coachSport: "Football",
    coachPriceMin: prices[0] !== undefined ? prices[0] / 100 : undefined,
    coachPriceMax:
      prices.at(-1) !== undefined ? (prices.at(-1) as number) / 100 : undefined,
    coachCity:
      defaultLocation?.label ?? defaultLocation?.addressText ?? undefined,
  };
}
class StoreCoachFavouriteRepository implements CoachFavouriteRepository {
  constructor(private readonly storeProvider: () => StoreShape) {}
  async listForUser(userId: string): Promise<{
    favourites: CoachFavouriteDto[];
    dataVersion: string | null;
  }> {
    const store = this.storeProvider();
    const favourites = asRows(store.tables.coachFavourites)
      .flatMap((row) =>
        asString(row.userId) === userId && isActiveFavourite(row)
          ? [mapStoreFavourite(store.tables, row)]
          : [],
      )
      .sort(
        (left, right) =>
          toSortTime(right.createdAt) - toSortTime(left.createdAt),
      );
    return {
      favourites,
      dataVersion: store.version,
    };
  }
  async getStatus(
    userId: string,
    coachUserId: string,
  ): Promise<CoachFavouriteStatusResult> {
    const store = this.storeProvider();
    const row = asRows(store.tables.coachFavourites).find(
      (candidate) =>
        asString(candidate.userId) === userId &&
        (asString(candidate.coachUserId) === coachUserId ||
          asString(candidate.coachId) === coachUserId),
    );
    if (!row || !isActiveFavourite(row)) {
      return {
        isFavourite: false,
        favourite: null,
      };
    }
    return {
      isFavourite: true,
      favourite: mapStoreFavourite(store.tables, row),
    };
  }
  async saveForUser(input: {
    userId: string;
    coachUserId: string;
    note?: string | null;
  }): Promise<CoachFavouriteDto> {
    const store = this.storeProvider();
    if (!getActiveCoachProfile(store.tables, input.coachUserId)) {
      throw notFound("Coach not found", {
        coachId: input.coachUserId,
      });
    }
    const rows = ensureTable(store.tables, "coachFavourites");
    const now = isoNow();
    const nextNote = normalizeNote(input.note);
    const existing = rows.find(
      (row) =>
        asString(row.userId) === input.userId &&
        (asString(row.coachUserId) === input.coachUserId ||
          asString(row.coachId) === input.coachUserId),
    );
    if (existing) {
      existing.coachUserId = input.coachUserId;
      existing.isFavourite = true;
      existing.deletedAt = null;
      existing.deletedByUserId = null;
      existing.updatedAt = now;
      existing.updatedByUserId = input.userId;
      existing.version = Number(existing.version ?? 1) + 1;
      if (nextNote !== undefined) {
        existing.note = nextNote;
      }
      return mapStoreFavourite(store.tables, existing);
    }
    const row: SeedRow = {
      id: newId("cfav"),
      userId: input.userId,
      coachUserId: input.coachUserId,
      isFavourite: true,
      note: nextNote ?? null,
      createdAt: now,
      updatedAt: now,
      createdByUserId: input.userId,
      updatedByUserId: input.userId,
      version: 1,
      deletedAt: null,
      deletedByUserId: null,
    };
    rows.push(row);
    return mapStoreFavourite(store.tables, row);
  }
  async removeForUser(
    userId: string,
    coachUserId: string,
  ): Promise<CoachFavouriteDto> {
    const store = this.storeProvider();
    const rows = ensureTable(store.tables, "coachFavourites");
    const row = rows.find(
      (candidate) =>
        asString(candidate.userId) === userId &&
        (asString(candidate.coachUserId) === coachUserId ||
          asString(candidate.coachId) === coachUserId),
    );
    if (!row || !isActiveFavourite(row)) {
      throw notFound("Favourite not found", {
        coachId: coachUserId,
      });
    }
    row.isFavourite = false;
    row.deletedAt = isoNow();
    row.deletedByUserId = userId;
    row.updatedAt = row.deletedAt;
    row.updatedByUserId = userId;
    row.version = Number(row.version ?? 1) + 1;
    return mapStoreFavourite(store.tables, row);
  }
}
class PrismaCoachFavouriteRepository implements CoachFavouriteRepository {
  private readonly fallback = new StoreCoachFavouriteRepository(() =>
    getDbFixtureStore(),
  );
  private readonly includeCoachSnapshot = {
    coach: {
      include: {
        user: true,
        locations: true,
        offerings: true,
      },
    },
  } as const;
  async listForUser(userId: string): Promise<{
    favourites: CoachFavouriteDto[];
    dataVersion: string | null;
  }> {
    if (shouldUseDbFixtureFallback()) {
      return this.fallback.listForUser(userId);
    }
    const prisma = getPrismaClientOrThrow();
    const rows = await prisma.coachFavourite.findMany({
      where: {
        userId,
        isFavourite: true,
        deletedAt: null,
      },
      include: this.includeCoachSnapshot,
      orderBy: {
        createdAt: "desc",
      },
    });
    return {
      favourites: rows.map((row) => mapPrismaFavourite(row)),
      dataVersion: null,
    };
  }
  async getStatus(
    userId: string,
    coachUserId: string,
  ): Promise<CoachFavouriteStatusResult> {
    if (shouldUseDbFixtureFallback()) {
      return this.fallback.getStatus(userId, coachUserId);
    }
    const prisma = getPrismaClientOrThrow();
    const row = await prisma.coachFavourite.findUnique({
      where: {
        userId_coachUserId: {
          userId,
          coachUserId,
        },
      },
      include: this.includeCoachSnapshot,
    });
    if (!row || !row.isFavourite || row.deletedAt) {
      return {
        isFavourite: false,
        favourite: null,
      };
    }
    return {
      isFavourite: true,
      favourite: mapPrismaFavourite(row),
    };
  }
  async saveForUser(input: {
    userId: string;
    coachUserId: string;
    note?: string | null;
  }): Promise<CoachFavouriteDto> {
    if (shouldUseDbFixtureFallback()) {
      return this.fallback.saveForUser(input);
    }
    const prisma = getPrismaClientOrThrow();
    const coach = await prisma.coachProfile.findFirst({
      where: {
        userId: input.coachUserId,
        deletedAt: null,
      },
      select: {
        userId: true,
      },
    });
    if (!coach) {
      throw notFound("Coach not found", {
        coachId: input.coachUserId,
      });
    }
    const nextNote = normalizeNote(input.note);
    const existing = await prisma.coachFavourite.findUnique({
      where: {
        userId_coachUserId: {
          userId: input.userId,
          coachUserId: input.coachUserId,
        },
      },
    });
    if (existing) {
      const row = await prisma.coachFavourite.update({
        where: {
          id: existing.id,
        },
        data: {
          isFavourite: true,
          deletedAt: null,
          deletedByUserId: null,
          ...(nextNote !== undefined
            ? {
                note: nextNote,
              }
            : {}),
          updatedByUserId: input.userId,
          version: (existing.version ?? 1n) + 1n,
        },
        include: this.includeCoachSnapshot,
      });
      return mapPrismaFavourite(row);
    }
    const row = await prisma.coachFavourite.create({
      data: {
        id: newId("cfav"),
        userId: input.userId,
        coachUserId: input.coachUserId,
        isFavourite: true,
        note: nextNote ?? null,
        createdByUserId: input.userId,
        updatedByUserId: input.userId,
        version: 1n,
      },
      include: this.includeCoachSnapshot,
    });
    return mapPrismaFavourite(row);
  }
  async removeForUser(
    userId: string,
    coachUserId: string,
  ): Promise<CoachFavouriteDto> {
    if (shouldUseDbFixtureFallback()) {
      return this.fallback.removeForUser(userId, coachUserId);
    }
    const prisma = getPrismaClientOrThrow();
    const existing = await prisma.coachFavourite.findUnique({
      where: {
        userId_coachUserId: {
          userId,
          coachUserId,
        },
      },
    });
    if (!existing || !existing.isFavourite || existing.deletedAt) {
      throw notFound("Favourite not found", {
        coachId: coachUserId,
      });
    }
    const row = await prisma.coachFavourite.update({
      where: {
        id: existing.id,
      },
      data: {
        isFavourite: false,
        deletedAt: new Date(),
        deletedByUserId: userId,
        updatedByUserId: userId,
        version: (existing.version ?? 1n) + 1n,
      },
      include: this.includeCoachSnapshot,
    });
    return mapPrismaFavourite(row);
  }
}
const seedRepository = new StoreCoachFavouriteRepository(() =>
  getMarketplaceSeedStore(),
);
const dbRepository = new PrismaCoachFavouriteRepository();
export function resolveCoachFavouriteRepository(): CoachFavouriteRepository {
  return getApiDataBackend() === "db" ? dbRepository : seedRepository;
}
