import { randomUUID } from "node:crypto";
import { getApiDataBackend } from "../../lib/data-backend.js";
import { notFound } from "../../lib/http-errors.js";
import { getMarketplaceSeedStore } from "../../lib/marketplace-seed-store.js";
import {
  getPrismaClientOrThrow,
  shouldUseDbFixtureFallback,
} from "../../lib/prisma-runtime.js";

type SeedRow = Record<string, unknown>;
type SeedTables = Record<string, SeedRow[]>;

const DEFAULT_PAYMENT_NOTES =
  "Please use the invoice number as the payment reference and message me once sent so I can mark it as paid in the app.";

const asRows = (value: unknown): SeedRow[] =>
  Array.isArray(value) ? (value as SeedRow[]) : [];
const asString = (value: unknown): string | undefined =>
  typeof value === "string" ? value : undefined;
const asIsoString = (value: unknown, fallback = new Date().toISOString()): string =>
  typeof value === "string"
    ? value
    : value instanceof Date
      ? value.toISOString()
      : fallback;

export interface CoachPaymentInstructions {
  coachId: string;
  payeeName: string;
  bankTransferDetails: string;
  paymentNotes: string;
  updatedAt: string;
}

export interface CoachPaymentInstructionsPatch {
  payeeName: string;
  bankTransferDetails: string;
  paymentNotes: string;
}

export interface CoachPaymentInstructionsRepository {
  get(coachUserId: string): Promise<CoachPaymentInstructions>;
  update(
    coachUserId: string,
    patch: CoachPaymentInstructionsPatch,
  ): Promise<CoachPaymentInstructions>;
}

function mapInstructions(row: SeedRow): CoachPaymentInstructions {
  return {
    coachId: asString(row.coachUserId) ?? "",
    payeeName: asString(row.payeeName) ?? "",
    bankTransferDetails: asString(row.bankTransferDetails) ?? "",
    paymentNotes: asString(row.paymentNotes) ?? DEFAULT_PAYMENT_NOTES,
    updatedAt: asIsoString(row.updatedAt),
  };
}

function defaultInstructions(coachUserId: string): CoachPaymentInstructions {
  return {
    coachId: coachUserId,
    payeeName: "",
    bankTransferDetails: "",
    paymentNotes: DEFAULT_PAYMENT_NOTES,
    updatedAt: new Date().toISOString(),
  };
}

function requireStoreCoach(tables: SeedTables, coachUserId: string): void {
  const coach = asRows(tables.coachProfiles).find(
    (row) => asString(row.userId) === coachUserId && !asString(row.deletedAt),
  );
  if (!coach) {
    throw notFound("Coach profile not found");
  }
}

function instructionRows(tables: SeedTables): SeedRow[] {
  if (!Array.isArray(tables.coachPaymentInstructions)) {
    tables.coachPaymentInstructions = [];
  }
  return tables.coachPaymentInstructions;
}

class StoreCoachPaymentInstructionsRepository
  implements CoachPaymentInstructionsRepository
{
  constructor(private readonly getTables: () => SeedTables) {}

  async get(coachUserId: string): Promise<CoachPaymentInstructions> {
    const tables = this.getTables();
    requireStoreCoach(tables, coachUserId);
    const row = instructionRows(tables).find(
      (entry) => asString(entry.coachUserId) === coachUserId,
    );
    return row ? mapInstructions(row) : defaultInstructions(coachUserId);
  }

  async update(
    coachUserId: string,
    patch: CoachPaymentInstructionsPatch,
  ): Promise<CoachPaymentInstructions> {
    const tables = this.getTables();
    requireStoreCoach(tables, coachUserId);
    const rows = instructionRows(tables);
    let row = rows.find((entry) => asString(entry.coachUserId) === coachUserId);
    const now = new Date().toISOString();
    if (!row) {
      row = {
        id: `cpi_${randomUUID()}`,
        coachUserId,
        createdByUserId: coachUserId,
        createdAt: now,
        version: 1,
      };
      rows.push(row);
    }
    Object.assign(row, {
      payeeName: patch.payeeName,
      bankTransferDetails: patch.bankTransferDetails,
      paymentNotes: patch.paymentNotes,
      updatedByUserId: coachUserId,
      updatedAt: now,
      version: Number(row.version ?? 0) + 1,
    });
    return mapInstructions(row);
  }
}

class DbCoachPaymentInstructionsRepository implements CoachPaymentInstructionsRepository {
  async get(coachUserId: string): Promise<CoachPaymentInstructions> {
    if (shouldUseDbFixtureFallback()) {
      getPrismaClientOrThrow();
    }
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
    const row = await prisma.coachPaymentInstruction.findUnique({
      where: {
        coachUserId,
      },
    });
    return row ? mapInstructions(row as unknown as SeedRow) : defaultInstructions(coachUserId);
  }

  async update(
    coachUserId: string,
    patch: CoachPaymentInstructionsPatch,
  ): Promise<CoachPaymentInstructions> {
    if (shouldUseDbFixtureFallback()) {
      getPrismaClientOrThrow();
    }
    const prisma = getPrismaClientOrThrow();
    const row = await prisma.$transaction(async (tx) => {
      const coach = await tx.coachProfile.findFirst({
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
      return tx.coachPaymentInstruction.upsert({
        where: {
          coachUserId,
        },
        create: {
          coachUserId,
          payeeName: patch.payeeName,
          bankTransferDetails: patch.bankTransferDetails,
          paymentNotes: patch.paymentNotes,
          createdByUserId: coachUserId,
          updatedByUserId: coachUserId,
        },
        update: {
          payeeName: patch.payeeName,
          bankTransferDetails: patch.bankTransferDetails,
          paymentNotes: patch.paymentNotes,
          updatedByUserId: coachUserId,
          version: {
            increment: 1,
          },
        },
      });
    });
    return mapInstructions(row as unknown as SeedRow);
  }
}

const seedRepository = new StoreCoachPaymentInstructionsRepository(
  () => getMarketplaceSeedStore().tables,
);
const dbRepository = new DbCoachPaymentInstructionsRepository();

export function resolveCoachPaymentInstructionsRepository(): CoachPaymentInstructionsRepository {
  return getApiDataBackend() === "db" ? dbRepository : seedRepository;
}
