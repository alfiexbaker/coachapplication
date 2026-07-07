import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '@prisma/client';

const REQUIRED_CONFIRMATION = '1';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../../..');
const datasetPath = path.resolve(
  repoRoot,
  'docs/backend-api/test-data/marketplace/linked-dataset.json',
);

const prisma = new PrismaClient();

const asRows = (value) => (Array.isArray(value) ? value : []);
const asString = (value) => (typeof value === 'string' ? value : undefined);
const asBoolean = (value, fallback = false) => (typeof value === 'boolean' ? value : fallback);
const asNumber = (value, fallback = 1) => (typeof value === 'number' ? value : fallback);
const toDate = (value, fallback = null) => (typeof value === 'string' ? new Date(value) : fallback);
const toBigInt = (value, fallback = 1) => BigInt(asNumber(value, fallback));

function assertConfirmed() {
  if (process.env.CLUBROOM_IMPORT_PRACTICE_TASKS !== REQUIRED_CONFIRMATION) {
    throw new Error('Refusing to import practice tasks without CLUBROOM_IMPORT_PRACTICE_TASKS=1');
  }
}

async function main() {
  assertConfirmed();
  const raw = await fs.readFile(datasetPath, 'utf8');
  const dataset = JSON.parse(raw);
  const tables = dataset.tables ?? {};
  const drills = asRows(tables.drills);
  const assignments = asRows(tables.drillAssignments);
  const submissions = asRows(tables.assignmentSubmissions);

  const mediaIds = submissions
    .map((row) => asString(row.mediaObjectId))
    .filter((id) => Boolean(id));
  const existingMediaRows =
    mediaIds.length > 0
      ? await prisma.mediaObject.findMany({
          where: {
            id: {
              in: mediaIds,
            },
          },
          select: {
            id: true,
          },
        })
      : [];
  const existingMediaIds = new Set(existingMediaRows.map((row) => row.id));
  let skippedMediaLinks = 0;

  await prisma.$transaction(async (tx) => {
    for (const row of drills) {
      await tx.drill.upsert({
        where: {
          id: row.id,
        },
        create: {
          id: row.id,
          authorUserId: asString(row.authorUserId) ?? null,
          title: asString(row.title) ?? 'Practice drill',
          description: asString(row.description) ?? null,
          difficulty: asString(row.difficulty) ?? null,
          active: asBoolean(row.active, true),
          metadataJson: row.metadataJson ?? undefined,
          createdAt: toDate(row.createdAt, new Date()),
          updatedAt: toDate(row.updatedAt, new Date()),
          deletedAt: toDate(row.deletedAt),
        },
        update: {
          authorUserId: asString(row.authorUserId) ?? null,
          title: asString(row.title) ?? 'Practice drill',
          description: asString(row.description) ?? null,
          difficulty: asString(row.difficulty) ?? null,
          active: asBoolean(row.active, true),
          metadataJson: row.metadataJson ?? undefined,
          updatedAt: toDate(row.updatedAt, new Date()),
          deletedAt: toDate(row.deletedAt),
        },
      });
    }

    for (const row of assignments) {
      await tx.drillAssignment.upsert({
        where: {
          id: row.id,
        },
        create: {
          id: row.id,
          drillId: row.drillId,
          athleteId: row.athleteId,
          coachUserId: row.coachUserId,
          title: asString(row.title) ?? null,
          instructions: asString(row.instructions) ?? null,
          requiresEvidence: asBoolean(row.requiresEvidence, false),
          dueDate: toDate(row.dueDate),
          status: asString(row.status) ?? 'ASSIGNED',
          createdByUserId: asString(row.createdByUserId) ?? asString(row.coachUserId) ?? '',
          updatedByUserId: asString(row.updatedByUserId) ?? asString(row.coachUserId) ?? '',
          version: toBigInt(row.version, 1),
          createdAt: toDate(row.createdAt, new Date()),
          updatedAt: toDate(row.updatedAt, new Date()),
          deletedAt: toDate(row.deletedAt),
        },
        update: {
          drillId: row.drillId,
          athleteId: row.athleteId,
          coachUserId: row.coachUserId,
          title: asString(row.title) ?? null,
          instructions: asString(row.instructions) ?? null,
          requiresEvidence: asBoolean(row.requiresEvidence, false),
          dueDate: toDate(row.dueDate),
          status: asString(row.status) ?? 'ASSIGNED',
          updatedByUserId: asString(row.updatedByUserId) ?? asString(row.coachUserId) ?? '',
          version: toBigInt(row.version, 1),
          updatedAt: toDate(row.updatedAt, new Date()),
          deletedAt: toDate(row.deletedAt),
        },
      });
    }

    for (const row of submissions) {
      const mediaObjectId = asString(row.mediaObjectId);
      const safeMediaObjectId =
        mediaObjectId && existingMediaIds.has(mediaObjectId) ? mediaObjectId : null;
      if (mediaObjectId && !safeMediaObjectId) {
        skippedMediaLinks += 1;
      }
      await tx.assignmentSubmission.upsert({
        where: {
          id: row.id,
        },
        create: {
          id: row.id,
          drillAssignmentId: row.drillAssignmentId,
          athleteId: row.athleteId,
          submittedByUserId: row.submittedByUserId,
          mediaObjectId: safeMediaObjectId,
          notes: asString(row.notes) ?? null,
          status: asString(row.status) ?? 'SUBMITTED',
          submittedAt: toDate(row.submittedAt, new Date()),
          createdAt: toDate(row.createdAt, new Date()),
          updatedAt: toDate(row.updatedAt, new Date()),
        },
        update: {
          drillAssignmentId: row.drillAssignmentId,
          athleteId: row.athleteId,
          submittedByUserId: row.submittedByUserId,
          mediaObjectId: safeMediaObjectId,
          notes: asString(row.notes) ?? null,
          status: asString(row.status) ?? 'SUBMITTED',
          submittedAt: toDate(row.submittedAt, new Date()),
          updatedAt: toDate(row.updatedAt, new Date()),
        },
      });
    }
  });

  console.log(
    JSON.stringify(
      {
        drills: drills.length,
        drillAssignments: assignments.length,
        assignmentSubmissions: submissions.length,
        skippedMediaLinks,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
