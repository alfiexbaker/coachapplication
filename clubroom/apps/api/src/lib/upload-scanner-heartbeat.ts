import { Prisma, type PrismaClient } from '@clubroom/db';

export const UPLOAD_SCANNER_WORKER_TYPE = 'upload-scanner';
export const UPLOAD_SCANNER_HEARTBEAT_TTL_MS = 2 * 60_000;

export type UploadScannerHeartbeatStatus = 'STARTING' | 'READY' | 'ERROR';

export async function writeUploadScannerHeartbeat(input: {
  prisma: PrismaClient;
  workerId: string;
  status: UploadScannerHeartbeatStatus;
  version?: string;
  metadata?: Prisma.InputJsonObject;
  now?: Date;
}): Promise<void> {
  const now = input.now ?? new Date();
  const expiresAt = new Date(now.getTime() + UPLOAD_SCANNER_HEARTBEAT_TTL_MS);
  await input.prisma.runtimeWorkerHeartbeat.upsert({
    where: { id: input.workerId },
    create: {
      id: input.workerId,
      workerType: UPLOAD_SCANNER_WORKER_TYPE,
      status: input.status,
      version: input.version,
      metadataJson: input.metadata,
      lastReadyAt: input.status === 'READY' ? now : null,
      expiresAt,
      createdAt: now,
      updatedAt: now,
    },
    update: {
      status: input.status,
      version: input.version,
      metadataJson: input.metadata,
      ...(input.status === 'READY' ? { lastReadyAt: now } : {}),
      expiresAt,
      updatedAt: now,
    },
  });
}

export async function removeUploadScannerHeartbeat(input: {
  prisma: PrismaClient;
  workerId: string;
}): Promise<void> {
  await input.prisma.runtimeWorkerHeartbeat.deleteMany({
    where: { id: input.workerId },
  });
}

export async function isUploadScannerReady(input: {
  prisma: PrismaClient;
  now?: Date;
}): Promise<boolean> {
  const now = input.now ?? new Date();
  const active = await input.prisma.runtimeWorkerHeartbeat.count({
    where: {
      workerType: UPLOAD_SCANNER_WORKER_TYPE,
      status: 'READY',
      expiresAt: { gt: now },
      lastReadyAt: { not: null },
    },
  });
  return active > 0;
}

export async function pruneUploadScannerHeartbeats(input: {
  prisma: PrismaClient;
  now?: Date;
}): Promise<void> {
  const now = input.now ?? new Date();
  await input.prisma.runtimeWorkerHeartbeat.deleteMany({
    where: {
      workerType: UPLOAD_SCANNER_WORKER_TYPE,
      expiresAt: { lt: new Date(now.getTime() - 7 * 24 * 60 * 60_000) },
    },
  });
}
