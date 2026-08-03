import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import { createReadStream } from 'node:fs';
import { open, mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { env } from '@clubroom/config';
import { Prisma, type PrismaClient } from '@clubroom/db';
import {
  buildSealedStorageKey,
  createSignedPrivateWriteUrl,
  createSignedReadUrl,
  deletePrivateStorageObject,
  shouldRejectUploadScanError,
} from './storage-runtime.js';
import {
  UploadFilePolicyError,
  assertUploadFileContent,
  type UploadFileKind,
} from './upload-file-policy.js';

const SCANNER_ACTOR_ID = 'system_upload_scan_worker';
const SCAN_RESULT_TOKEN_HEADER = 'x-clubroom-upload-scan-token';
const MAX_SCANNER_OUTPUT_BYTES = 64 * 1024;
const MAX_SCAN_ERROR_LENGTH = 500;
const MAX_SCANNER_PREFLIGHT_INTERVAL_MS = 60 * 60_000;
const MIN_DATABASE_RETRY_DELAY_MS = 1_000;
const MAX_DATABASE_RETRY_BASE_DELAY_MS = 5_000;
const MAX_DATABASE_RETRY_DELAY_MS = 30_000;
const RECOVERABLE_DATABASE_ERROR_CODES = new Set(['P1001', 'P1002', 'P1008', 'P1017', 'P2024']);
const RECOVERABLE_DATABASE_ERROR_MESSAGES = [
  "can't reach database server",
  'connection terminated unexpectedly',
  'connection reset by peer',
  'server has closed the connection',
  'timed out fetching a new connection from the connection pool',
  'econnrefused',
  'econnreset',
  'etimedout',
  'eai_again',
];

export interface ClaimedUploadScan {
  uploadSessionId: string;
  mediaObjectId: string;
  scanAttemptId: string;
  bucketName: string;
  storageKey: string;
  kind: UploadFileKind;
  contentType: string;
  originalFileName: string;
  expectedBytes: number;
  uploadUrlExpiresAt: Date;
  attemptNumber: number;
}

export interface ClaimedStagingCleanup {
  uploadSessionId: string;
  mediaObjectId: string;
  uploadStatus: string;
  bucketName: string;
  storageKey: string;
  attemptNumber: number;
}

export interface StagingCleanupResult {
  outcome: 'CLEANED' | 'RETRY';
  errorCode: string | null;
  errorMessage: string | null;
}

export interface UploadScannerWorkerConfig {
  apiBaseUrl: string;
  resultToken: string;
  command: string;
  databaseDir?: string;
  batchSize: number;
  pollIntervalMs: number;
  leaseMs: number;
  downloadTimeoutMs: number;
  scanTimeoutMs: number;
  maxBytes: number;
  maxAttempts: number;
  maxDefinitionAgeHours: number;
}

export interface DownloadedObject {
  filePath: string;
  bytes: number;
  sha256Hex: string;
  objectETag: string;
  cleanup: () => Promise<void>;
}

export interface ClamAvResult {
  verdict: 'CLEAN' | 'INFECTED' | 'ERROR';
  exitCode: number | null;
  signature: string | null;
  errorCode: string | null;
}

export interface ScanCallbackPayload {
  mediaObjectId: string;
  sourceResultId: string;
  scanAttemptId: string;
  verdict: 'CLEAN' | 'INFECTED' | 'ERROR';
  scanner: string;
  objectSizeBytes?: number;
  objectETag?: string;
  sha256Hex?: string;
  sealedStorageKey?: string;
  scannedAt: string;
  details: Record<string, unknown>;
}

export interface ProcessUploadScanDependencies {
  createReadUrl: (input: { bucketName: string; storageKey: string }) => string;
  download: (input: {
    url: string;
    expectedBytes: number;
    maxBytes: number;
    timeoutMs: number;
  }) => Promise<DownloadedObject>;
  scan: (input: {
    command: string;
    filePath: string;
    timeoutMs: number;
    databaseDir?: string;
    maxBytes: number;
  }) => Promise<ClamAvResult>;
  validateFileType: (input: {
    claim: ClaimedUploadScan;
    filePath: string;
  }) => Promise<string>;
  seal: (input: {
    claim: ClaimedUploadScan;
    downloaded: DownloadedObject;
    timeoutMs: number;
  }) => Promise<{ storageKey: string; objectETag: string }>;
  report: (input: { uploadSessionId: string; payload: ScanCallbackPayload }) => Promise<void>;
  deleteSource: (claim: ClaimedUploadScan) => Promise<void>;
  markObjectObserved: (claim: ClaimedUploadScan) => Promise<void>;
  release: (input: {
    claim: ClaimedUploadScan;
    status: string;
    retryAt: Date | null;
    errorCode: string | null;
  }) => Promise<void>;
  now: () => Date;
  newResultId: () => string;
}

export interface ProcessUploadScanResult {
  uploadSessionId: string;
  mediaObjectId: string;
  outcome: 'CLEAN' | 'INFECTED' | 'REJECTED' | 'RETRY';
  errorCode: string | null;
  cleanupErrorCode: string | null;
}

interface StorageDownloadErrorOptions {
  status?: number;
  code: string;
  message: string;
}

export class StorageDownloadError extends Error {
  readonly status?: number;
  readonly code: string;

  constructor(options: StorageDownloadErrorOptions) {
    super(options.message);
    this.status = options.status;
    this.code = options.code;
  }
}

interface ClaimRow {
  uploadSessionId: string;
  mediaObjectId: string;
  activeScanAttemptId: string;
  bucketName: string;
  storageKey: string;
  kind: UploadFileKind;
  contentType: string;
  originalFileName: string | null;
  expectedMaxBytes: bigint | null;
  sizeBytes: bigint;
  uploadUrlExpiresAt: Date;
  scanAttemptCount: number;
}

interface StagingCleanupClaimRow {
  uploadSessionId: string;
  mediaObjectId: string;
  uploadStatus: string;
  bucketName: string;
  storageKey: string;
  stagingCleanupAttemptCount: number;
}

function toSafeNumber(value: bigint, field: string): number {
  const result = Number(value);
  if (!Number.isSafeInteger(result) || result < 0) {
    throw new Error(`${field} is outside the supported integer range`);
  }
  return result;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function truncateError(value: string | null): string | null {
  return value ? value.slice(0, MAX_SCAN_ERROR_LENGTH) : null;
}

export function isRecoverableUploadScannerDatabaseError(error: unknown): boolean {
  const seen = new Set<unknown>();
  let current: unknown = error;

  while (current && !seen.has(current)) {
    seen.add(current);
    if (typeof current === 'object') {
      const candidate = current as {
        code?: unknown;
        errorCode?: unknown;
        message?: unknown;
        cause?: unknown;
      };
      const code =
        typeof candidate.code === 'string'
          ? candidate.code
          : typeof candidate.errorCode === 'string'
            ? candidate.errorCode
            : undefined;
      if (code && RECOVERABLE_DATABASE_ERROR_CODES.has(code.toUpperCase())) {
        return true;
      }
      const candidateMessage =
        typeof candidate.message === 'string' ? candidate.message.toLowerCase() : undefined;
      if (
        candidateMessage &&
        RECOVERABLE_DATABASE_ERROR_MESSAGES.some((message) => candidateMessage.includes(message))
      ) {
        return true;
      }
      current = candidate.cause;
      continue;
    }
    const currentMessage = typeof current === 'string' ? current.toLowerCase() : undefined;
    if (
      currentMessage &&
      RECOVERABLE_DATABASE_ERROR_MESSAGES.some((message) => currentMessage.includes(message))
    ) {
      return true;
    }
    break;
  }

  return false;
}

export function uploadScannerDatabaseRetryDelayMs(
  consecutiveFailureCount: number,
  pollIntervalMs: number,
): number {
  const failureCount = Math.max(1, Math.floor(consecutiveFailureCount));
  const baseDelayMs = Math.max(
    MIN_DATABASE_RETRY_DELAY_MS,
    Math.min(MAX_DATABASE_RETRY_BASE_DELAY_MS, pollIntervalMs),
  );
  return Math.min(MAX_DATABASE_RETRY_DELAY_MS, baseDelayMs * 2 ** Math.min(failureCount - 1, 5));
}

export function readUploadScannerWorkerConfig(): UploadScannerWorkerConfig {
  const resultToken = env.API_UPLOAD_SCAN_RESULT_TOKEN?.trim();
  if (!resultToken) {
    throw new Error('API_UPLOAD_SCAN_RESULT_TOKEN is required by the upload scanner worker');
  }
  if (!env.DATABASE_URL?.trim()) {
    throw new Error('DATABASE_URL is required by the upload scanner worker');
  }

  const apiBaseUrl =
    env.API_UPLOAD_SCAN_API_BASE_URL?.trim() || `http://127.0.0.1:${env.API_PORT}/v1`;

  return {
    apiBaseUrl: apiBaseUrl.replace(/\/+$/, ''),
    resultToken,
    command: env.API_UPLOAD_SCAN_COMMAND,
    databaseDir: env.API_UPLOAD_SCAN_DATABASE_DIR,
    batchSize: env.API_UPLOAD_SCAN_BATCH_SIZE,
    pollIntervalMs: env.API_UPLOAD_SCAN_POLL_INTERVAL_MS,
    leaseMs: env.API_UPLOAD_SCAN_LEASE_MS,
    downloadTimeoutMs: env.API_UPLOAD_SCAN_DOWNLOAD_TIMEOUT_MS,
    scanTimeoutMs: env.API_UPLOAD_SCAN_TIMEOUT_MS,
    maxBytes: env.API_UPLOAD_SCAN_MAX_BYTES,
    maxAttempts: env.API_UPLOAD_SCAN_MAX_ATTEMPTS,
    maxDefinitionAgeHours: env.API_UPLOAD_SCAN_MAX_DEFINITION_AGE_HOURS,
  };
}

export function waitForAbortableDelay(ms: number, signal: AbortSignal): Promise<void> {
  if (signal.aborted) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    let settled = false;
    let timeout: ReturnType<typeof setTimeout>;
    const finish = () => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timeout);
      signal.removeEventListener('abort', finish);
      resolve();
    };

    timeout = setTimeout(finish, ms);
    signal.addEventListener('abort', finish, { once: true });
    if (signal.aborted) {
      finish();
    }
  });
}

export async function claimPendingUploadScans(input: {
  prisma: PrismaClient;
  workerId: string;
  limit: number;
  leaseMs: number;
  maxAttempts: number;
  uploadSessionId?: string;
  now?: Date;
}): Promise<ClaimedUploadScan[]> {
  const now = input.now ?? new Date();
  const leaseExpiresAt = new Date(now.getTime() + input.leaseMs);
  const sessionFilter = input.uploadSessionId
    ? Prisma.sql`AND us."id" = ${input.uploadSessionId}`
    : Prisma.empty;

  const rows = await input.prisma.$queryRaw<ClaimRow[]>(Prisma.sql`
    WITH exhausted AS (
      UPDATE "UploadSession" us
      SET "status" = 'REJECTED',
          "scanClaimedAt" = NULL,
          "scanClaimedBy" = NULL,
          "activeScanAttemptId" = NULL,
          "scanLeaseExpiresAt" = NULL,
          "scanNextAttemptAt" = NULL,
          "scanLastError" = 'MAX_SCAN_ATTEMPTS_EXHAUSTED',
          "updatedAt" = ${now}
      FROM "MediaObject" mo
      WHERE us."mediaObjectId" = mo."id"
        AND us."status" IN ('UPLOADED', 'SCAN_RETRY', 'SCANNING')
        AND us."scanAttemptCount" >= ${input.maxAttempts}
        AND (us."scanLeaseExpiresAt" IS NULL OR us."scanLeaseExpiresAt" <= ${now})
        AND mo."deletedAt" IS NULL
        AND mo."status" IN ('PENDING_UPLOAD', 'UPLOADED_UNSCANNED')
        ${sessionFilter}
      RETURNING us."id" AS "uploadSessionId",
                us."mediaObjectId" AS "mediaObjectId",
                us."scanAttemptCount" AS "scanAttemptCount"
    ),
    rejected_media AS (
      UPDATE "MediaObject" mo
      SET "status" = 'REJECTED',
          "updatedByUserId" = ${SCANNER_ACTOR_ID},
          "version" = mo."version" + 1,
          "updatedAt" = ${now}
      FROM exhausted
      WHERE mo."id" = exhausted."mediaObjectId"
        AND mo."status" IN ('PENDING_UPLOAD', 'UPLOADED_UNSCANNED')
      RETURNING mo."id"
    ),
    exhaustion_audit AS (
      INSERT INTO "AuditEvent" (
        "id",
        "occurredAt",
        "action",
        "resourceType",
        "resourceId",
        "result",
        "sensitiveRead",
        "metadataJson"
      )
      SELECT
        CONCAT(
          'aud_',
          MD5(
            'upload-scan-attempts-exhausted:' ||
            exhausted."uploadSessionId" ||
            ':' ||
            exhausted."scanAttemptCount"::text
          )
        ),
        ${now},
        'upload.scan_attempts_exhausted',
        'media_object',
        exhausted."mediaObjectId",
        'SUCCESS',
        FALSE,
        jsonb_build_object(
          'uploadSessionId', exhausted."uploadSessionId",
          'attemptNumber', exhausted."scanAttemptCount",
          'errorCode', 'MAX_SCAN_ATTEMPTS_EXHAUSTED',
          'actorKind', 'scanner_worker'
        )
      FROM exhausted
      ON CONFLICT ("id") DO NOTHING
      RETURNING "id"
    ),
    candidate AS (
      SELECT us."id"
      FROM "UploadSession" us
      INNER JOIN "MediaObject" mo ON mo."id" = us."mediaObjectId"
      LEFT JOIN LATERAL (
        SELECT ms."verdict"
        FROM "MalwareScanResult" ms
        WHERE ms."mediaObjectId" = mo."id"
        ORDER BY COALESCE(ms."scannedAt", ms."createdAt") DESC, ms."createdAt" DESC, ms."id" DESC
        LIMIT 1
      ) latest_scan ON TRUE
      WHERE us."status" IN ('UPLOADED', 'SCAN_RETRY', 'SCANNING')
        AND us."scanAttemptCount" < ${input.maxAttempts}
        AND mo."deletedAt" IS NULL
        AND mo."status" IN ('PENDING_UPLOAD', 'UPLOADED_UNSCANNED')
        AND (latest_scan."verdict" IS NULL OR latest_scan."verdict" IN ('PENDING', 'ERROR'))
        AND (us."scanNextAttemptAt" IS NULL OR us."scanNextAttemptAt" <= ${now})
        AND (us."scanLeaseExpiresAt" IS NULL OR us."scanLeaseExpiresAt" <= ${now})
        ${sessionFilter}
      ORDER BY us."createdAt" ASC
      FOR UPDATE OF us SKIP LOCKED
      LIMIT ${input.limit}
    ),
    claimed AS (
      UPDATE "UploadSession" us
      SET "status" = 'SCANNING',
          "scanClaimedAt" = ${now},
          "scanClaimedBy" = ${input.workerId},
          "activeScanAttemptId" = CONCAT(
            'sat_',
            MD5(${input.workerId} || ':' || us."id" || ':' || (us."scanAttemptCount" + 1)::text || ':' || ${now}::text)
          ),
          "scanLeaseExpiresAt" = ${leaseExpiresAt},
          "scanAttemptCount" = us."scanAttemptCount" + 1,
          "scanNextAttemptAt" = NULL,
          "scanLastError" = NULL,
          "updatedAt" = ${now}
      FROM candidate
      WHERE us."id" = candidate."id"
      RETURNING us.*
    )
    SELECT claimed."id" AS "uploadSessionId",
           claimed."mediaObjectId" AS "mediaObjectId",
           claimed."activeScanAttemptId" AS "activeScanAttemptId",
           mo."bucketName" AS "bucketName",
	           mo."storageKey" AS "storageKey",
	           mo."kind" AS "kind",
	           mo."contentType" AS "contentType",
	           mo."originalFileName" AS "originalFileName",
           claimed."expectedMaxBytes" AS "expectedMaxBytes",
           mo."sizeBytes" AS "sizeBytes",
           claimed."uploadUrlExpiresAt" AS "uploadUrlExpiresAt",
           claimed."scanAttemptCount" AS "scanAttemptCount"
    FROM claimed
    INNER JOIN "MediaObject" mo ON mo."id" = claimed."mediaObjectId"
  `);

  return rows.map((row) => {
    if (!row.mediaObjectId) {
      throw new Error(`Upload session ${row.uploadSessionId} has no media object`);
    }
    const declaredBytes = row.expectedMaxBytes ?? row.sizeBytes;
    return {
      uploadSessionId: row.uploadSessionId,
      mediaObjectId: row.mediaObjectId,
      scanAttemptId: row.activeScanAttemptId,
      bucketName: row.bucketName,
      storageKey: row.storageKey,
      kind: row.kind,
      contentType: row.contentType,
      originalFileName: row.originalFileName ?? path.basename(row.storageKey),
      expectedBytes: toSafeNumber(declaredBytes, 'Upload expected bytes'),
      uploadUrlExpiresAt: row.uploadUrlExpiresAt,
      attemptNumber: row.scanAttemptCount,
    };
  });
}

export async function markUploadObjectObserved(input: {
  prisma: PrismaClient;
  workerId: string;
  claim: ClaimedUploadScan;
}): Promise<void> {
  await input.prisma.$transaction(async (tx) => {
    const claimed = await tx.uploadSession.updateMany({
      where: {
        id: input.claim.uploadSessionId,
        mediaObjectId: input.claim.mediaObjectId,
        scanClaimedBy: input.workerId,
        activeScanAttemptId: input.claim.scanAttemptId,
        scanLeaseExpiresAt: {
          gt: new Date(),
        },
      },
      data: {
        status: 'SCANNING',
      },
    });
    if (claimed.count !== 1) {
      throw new Error(`Upload scan lease was lost for ${input.claim.uploadSessionId}`);
    }

    await tx.mediaObject.updateMany({
      where: {
        id: input.claim.mediaObjectId,
        status: 'PENDING_UPLOAD',
        deletedAt: null,
      },
      data: {
        status: 'UPLOADED_UNSCANNED',
        updatedByUserId: SCANNER_ACTOR_ID,
        version: {
          increment: 1n,
        },
      },
    });
  });
}

export async function releaseUploadScanClaim(input: {
  prisma: PrismaClient;
  workerId: string;
  claim: ClaimedUploadScan;
  status: string;
  retryAt: Date | null;
  errorCode: string | null;
}): Promise<void> {
  await input.prisma.$transaction(async (tx) => {
    const released = await tx.uploadSession.updateMany({
      where: {
        id: input.claim.uploadSessionId,
        scanClaimedBy: input.workerId,
        activeScanAttemptId: input.claim.scanAttemptId,
      },
      data: {
        status: input.status,
        scanClaimedAt: null,
        scanClaimedBy: null,
        activeScanAttemptId: null,
        scanLeaseExpiresAt: null,
        scanNextAttemptAt: input.retryAt,
        scanLastError: truncateError(input.errorCode),
      },
    });
    if (released.count !== 1) {
      throw new Error(`Upload scan lease was lost for ${input.claim.uploadSessionId}`);
    }
    if (input.status !== 'REJECTED') {
      return;
    }

    await tx.mediaObject.updateMany({
      where: {
        id: input.claim.mediaObjectId,
        status: {
          in: ['PENDING_UPLOAD', 'UPLOADED_UNSCANNED'],
        },
        deletedAt: null,
      },
      data: {
        status: 'REJECTED',
        updatedByUserId: SCANNER_ACTOR_ID,
        version: {
          increment: 1n,
        },
      },
    });
    await tx.auditEvent.upsert({
      where: {
        id: `aud_${crypto
          .createHash('md5')
          .update(
            `upload-scan-attempts-exhausted:${input.claim.uploadSessionId}:${input.claim.attemptNumber}`,
          )
          .digest('hex')}`,
      },
      create: {
        id: `aud_${crypto
          .createHash('md5')
          .update(
            `upload-scan-attempts-exhausted:${input.claim.uploadSessionId}:${input.claim.attemptNumber}`,
          )
          .digest('hex')}`,
        action: 'upload.scan_attempts_exhausted',
        resourceType: 'media_object',
        resourceId: input.claim.mediaObjectId,
        result: 'SUCCESS',
        metadataJson: {
          uploadSessionId: input.claim.uploadSessionId,
          attemptNumber: input.claim.attemptNumber,
          errorCode: truncateError(input.errorCode) ?? 'MAX_SCAN_ATTEMPTS_EXHAUSTED',
          actorKind: 'scanner_worker',
        },
      },
      update: {},
    });
  });
}

export async function claimPendingStagingCleanups(input: {
  prisma: PrismaClient;
  workerId: string;
  limit: number;
  leaseMs: number;
  uploadSessionId?: string;
  now?: Date;
}): Promise<ClaimedStagingCleanup[]> {
  const now = input.now ?? new Date();
  const leaseExpiresAt = new Date(now.getTime() + input.leaseMs);
  const sessionFilter = input.uploadSessionId
    ? Prisma.sql`AND us."id" = ${input.uploadSessionId}`
    : Prisma.empty;
  return input.prisma.$queryRaw<StagingCleanupClaimRow[]>(Prisma.sql`
    WITH candidate AS (
      SELECT us."id"
      FROM "UploadSession" us
      INNER JOIN "MediaObject" mo ON mo."id" = us."mediaObjectId"
      WHERE us."stagingStorageKey" IS NOT NULL
        AND us."stagingCleanupDueAt" IS NOT NULL
        AND us."stagingCleanupDueAt" <= ${now}
        AND us."stagingCleanupCompletedAt" IS NULL
        AND (
          us."stagingCleanupNextAttemptAt" IS NULL OR
          us."stagingCleanupNextAttemptAt" <= ${now}
        )
        AND (
          us."stagingCleanupLeaseExpiresAt" IS NULL OR
          us."stagingCleanupLeaseExpiresAt" <= ${now}
        )
        AND (
          (us."status" = 'INITIATED' AND mo."status" = 'PENDING_UPLOAD') OR
          us."status" IN ('SCAN_CLEAN', 'COMPLETED', 'REJECTED')
        )
        ${sessionFilter}
      ORDER BY us."stagingCleanupDueAt" ASC, us."createdAt" ASC
      FOR UPDATE OF us SKIP LOCKED
      LIMIT ${input.limit}
    ),
    claimed AS (
      UPDATE "UploadSession" us
      SET "stagingCleanupClaimedAt" = ${now},
          "stagingCleanupClaimedBy" = ${input.workerId},
          "stagingCleanupLeaseExpiresAt" = ${leaseExpiresAt},
          "stagingCleanupNextAttemptAt" = NULL,
          "stagingCleanupLastError" = NULL,
          "stagingCleanupAttemptCount" = us."stagingCleanupAttemptCount" + 1,
          "updatedAt" = ${now}
      FROM candidate
      WHERE us."id" = candidate."id"
      RETURNING us.*
    )
    SELECT claimed."id" AS "uploadSessionId",
           claimed."mediaObjectId" AS "mediaObjectId",
           claimed."status" AS "uploadStatus",
           mo."bucketName" AS "bucketName",
           claimed."stagingStorageKey" AS "storageKey",
           claimed."stagingCleanupAttemptCount" AS "stagingCleanupAttemptCount"
    FROM claimed
    INNER JOIN "MediaObject" mo ON mo."id" = claimed."mediaObjectId"
  `).then((rows) =>
    rows.map((row) => ({
      uploadSessionId: row.uploadSessionId,
      mediaObjectId: row.mediaObjectId,
      uploadStatus: row.uploadStatus,
      bucketName: row.bucketName,
      storageKey: row.storageKey,
      attemptNumber: row.stagingCleanupAttemptCount,
    })),
  );
}

export async function completeStagingCleanup(input: {
  prisma: PrismaClient;
  workerId: string;
  claim: ClaimedStagingCleanup;
  now?: Date;
}): Promise<void> {
  const now = input.now ?? new Date();
  await input.prisma.$transaction(async (tx) => {
    const completed = await tx.uploadSession.updateMany({
      where: {
        id: input.claim.uploadSessionId,
        mediaObjectId: input.claim.mediaObjectId,
        stagingCleanupClaimedBy: input.workerId,
        stagingCleanupLeaseExpiresAt: {
          gt: now,
        },
      },
      data: {
        ...(input.claim.uploadStatus === 'INITIATED'
          ? {
              status: 'REJECTED',
              scanLastError: 'UPLOAD_URL_EXPIRED',
            }
          : {}),
        stagingCleanupClaimedAt: null,
        stagingCleanupClaimedBy: null,
        stagingCleanupLeaseExpiresAt: null,
        stagingCleanupCompletedAt: now,
        stagingCleanupNextAttemptAt: null,
        stagingCleanupLastError: null,
      },
    });
    if (completed.count !== 1) {
      throw new Error(`Upload staging cleanup lease was lost for ${input.claim.uploadSessionId}`);
    }
    if (input.claim.uploadStatus === 'INITIATED') {
      await tx.mediaObject.updateMany({
        where: {
          id: input.claim.mediaObjectId,
          status: 'PENDING_UPLOAD',
          deletedAt: null,
        },
        data: {
          status: 'REJECTED',
          updatedByUserId: SCANNER_ACTOR_ID,
          version: {
            increment: 1n,
          },
        },
      });
    }
    const auditId = `aud_${crypto
      .createHash('md5')
      .update(`upload-staging-cleanup:${input.claim.uploadSessionId}`)
      .digest('hex')}`;
    await tx.auditEvent.upsert({
      where: { id: auditId },
      create: {
        id: auditId,
        action: 'upload.staging_cleanup',
        resourceType: 'upload_session',
        resourceId: input.claim.uploadSessionId,
        result: 'SUCCESS',
        metadataJson: {
          mediaObjectId: input.claim.mediaObjectId,
          previousStatus: input.claim.uploadStatus,
          actorKind: 'scanner_worker',
        },
      },
      update: {},
    });
  });
}

export async function releaseStagingCleanup(input: {
  prisma: PrismaClient;
  workerId: string;
  claim: ClaimedStagingCleanup;
  retryAt: Date;
  errorCode: string;
  errorMessage: string;
}): Promise<void> {
  await input.prisma.$transaction(async (tx) => {
    const released = await tx.uploadSession.updateMany({
      where: {
        id: input.claim.uploadSessionId,
        mediaObjectId: input.claim.mediaObjectId,
        stagingCleanupClaimedBy: input.workerId,
      },
      data: {
        stagingCleanupClaimedAt: null,
        stagingCleanupClaimedBy: null,
        stagingCleanupLeaseExpiresAt: null,
        stagingCleanupNextAttemptAt: input.retryAt,
        stagingCleanupLastError: truncateError(
          `${input.errorCode}: ${input.errorMessage}`,
        ),
      },
    });
    if (released.count !== 1) {
      throw new Error(`Upload staging cleanup lease was lost for ${input.claim.uploadSessionId}`);
    }
    const auditId = `aud_${crypto
      .createHash('md5')
      .update(
        `upload-staging-cleanup-failed:${input.claim.uploadSessionId}:${input.claim.attemptNumber}`,
      )
      .digest('hex')}`;
    await tx.auditEvent.upsert({
      where: { id: auditId },
      create: {
        id: auditId,
        action: 'upload.staging_cleanup_failed',
        resourceType: 'upload_session',
        resourceId: input.claim.uploadSessionId,
        result: 'ERROR',
        metadataJson: {
          mediaObjectId: input.claim.mediaObjectId,
          attemptNumber: input.claim.attemptNumber,
          errorCode: input.errorCode,
          errorMessage: truncateError(input.errorMessage),
          retryAt: input.retryAt.toISOString(),
          actorKind: 'scanner_worker',
        },
      },
      update: {},
    });
  });
}

export async function processClaimedStagingCleanup(input: {
  prisma: PrismaClient;
  workerId: string;
  claim: ClaimedStagingCleanup;
  deleteObject?: (claim: ClaimedStagingCleanup) => Promise<void>;
  now?: () => Date;
}): Promise<StagingCleanupResult> {
  const now = input.now ?? (() => new Date());
  try {
    await (
      input.deleteObject ??
      ((claim) =>
        deletePrivateStorageObject({
          bucketName: claim.bucketName,
          storageKey: claim.storageKey,
        }))
    )(input.claim);
    await completeStagingCleanup({
      prisma: input.prisma,
      workerId: input.workerId,
      claim: input.claim,
      now: now(),
    });
    return {
      outcome: 'CLEANED',
      errorCode: null,
      errorMessage: null,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown staging cleanup failure';
    const retryDelayMs = Math.min(
      6 * 60 * 60_000,
      5 * 60_000 * 2 ** Math.min(Math.max(input.claim.attemptNumber - 1, 0), 7),
    );
    await releaseStagingCleanup({
      prisma: input.prisma,
      workerId: input.workerId,
      claim: input.claim,
      retryAt: new Date(now().getTime() + retryDelayMs),
      errorCode: 'STAGING_CLEANUP_FAILED',
      errorMessage,
    });
    return {
      outcome: 'RETRY',
      errorCode: 'STAGING_CLEANUP_FAILED',
      errorMessage: truncateError(errorMessage),
    };
  }
}

export async function downloadObjectToPrivateTempFile(input: {
  url: string;
  expectedBytes: number;
  maxBytes: number;
  timeoutMs: number;
  fetchImpl?: typeof fetch;
}): Promise<DownloadedObject> {
  if (input.expectedBytes > input.maxBytes) {
    throw new StorageDownloadError({
      code: 'DECLARED_SIZE_EXCEEDS_SCAN_LIMIT',
      message: 'Declared upload size exceeds the configured scanner limit',
    });
  }

  const tempDirectory = await mkdtemp(path.join(os.tmpdir(), 'clubroom-upload-scan-'));
  const filePath = path.join(tempDirectory, 'object.bin');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), input.timeoutMs);
  let file;

  try {
    const response = await (input.fetchImpl ?? fetch)(input.url, {
      method: 'GET',
      redirect: 'error',
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new StorageDownloadError({
        status: response.status,
        code: response.status === 404 ? 'OBJECT_NOT_FOUND' : 'STORAGE_DOWNLOAD_FAILED',
        message: `Private object storage returned HTTP ${response.status}`,
      });
    }
    if (!response.body) {
      throw new StorageDownloadError({
        code: 'EMPTY_STORAGE_RESPONSE',
        message: 'Private object storage returned no response body',
      });
    }

    const contentLength = response.headers.get('content-length');
    const objectETag = response.headers.get('etag')?.trim();
    if (!objectETag) {
      throw new StorageDownloadError({
        code: 'OBJECT_ETAG_MISSING',
        message: 'Private object storage response did not include an ETag',
      });
    }
    if (contentLength) {
      const parsedLength = Number(contentLength);
      if (Number.isFinite(parsedLength) && parsedLength > input.maxBytes) {
        throw new StorageDownloadError({
          code: 'OBJECT_EXCEEDS_SCAN_LIMIT',
          message: 'Stored object exceeds the configured scanner limit',
        });
      }
    }

    file = await open(filePath, 'wx', 0o600);
    const hash = crypto.createHash('sha256');
    let bytes = 0;
    const reader = response.body.getReader();
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) {
        break;
      }
      const buffer = Buffer.from(chunk.value);
      bytes += buffer.length;
      if (bytes > input.maxBytes || bytes > input.expectedBytes) {
        controller.abort();
        throw new StorageDownloadError({
          code: 'OBJECT_SIZE_MISMATCH',
          message: 'Stored object is larger than the declared upload size',
        });
      }
      hash.update(buffer);
      await file.write(buffer);
    }

    if (bytes !== input.expectedBytes) {
      throw new StorageDownloadError({
        code: 'OBJECT_SIZE_MISMATCH',
        message: 'Stored object size does not match the declared upload size',
      });
    }

    await file.sync();
    await file.close();
    file = undefined;

    return {
      filePath,
      bytes,
      sha256Hex: hash.digest('hex'),
      objectETag,
      cleanup: () => rm(tempDirectory, { recursive: true, force: true }),
    };
  } catch (error) {
    if (file) {
      await file.close().catch(() => undefined);
    }
    await rm(tempDirectory, { recursive: true, force: true });
    if (error instanceof StorageDownloadError) {
      throw error;
    }
    if (controller.signal.aborted) {
      throw new StorageDownloadError({
        code: 'STORAGE_DOWNLOAD_TIMEOUT',
        message: 'Private object download timed out',
      });
    }
    throw new StorageDownloadError({
      code: 'STORAGE_DOWNLOAD_FAILED',
      message: error instanceof Error ? error.message : 'Private object download failed',
    });
  } finally {
    clearTimeout(timeout);
  }
}

export async function sealDownloadedUploadObject(input: {
  claim: ClaimedUploadScan;
  downloaded: DownloadedObject;
  timeoutMs: number;
  fetchImpl?: typeof fetch;
}): Promise<{ storageKey: string; objectETag: string }> {
  const storageKey = buildSealedStorageKey(input.claim.storageKey, input.downloaded.sha256Hex);
  const signed = createSignedPrivateWriteUrl({
    bucketName: input.claim.bucketName,
    storageKey,
    contentType: input.claim.contentType,
    contentLength: input.downloaded.bytes,
    expiresInSeconds: Math.ceil(input.timeoutMs / 1000) + 60,
  });
  const body = createReadStream(input.downloaded.filePath);
  try {
    const request: RequestInit & { duplex: 'half' } = {
      method: 'PUT',
      headers: {
        ...signed.uploadHeaders,
        'content-length': String(input.downloaded.bytes),
      },
      body: body as unknown as BodyInit,
      duplex: 'half',
      redirect: 'error',
      signal: AbortSignal.timeout(input.timeoutMs),
    };
    const response = await (input.fetchImpl ?? fetch)(signed.uploadUrl, request);
    if (!response.ok) {
      throw new Error(
        `Sealed object upload returned HTTP ${response.status}: ${(await response.text()).slice(0, 500)}`,
      );
    }
    const objectETag = response.headers.get('etag')?.trim();
    if (!objectETag) {
      throw new Error('Sealed object upload did not return an ETag');
    }
    return { storageKey, objectETag };
  } finally {
    body.destroy();
  }
}

function collectProcessOutput(current: string, chunk: Buffer): string {
  if (current.length >= MAX_SCANNER_OUTPUT_BYTES) {
    return current;
  }
  return `${current}${chunk.toString('utf8')}`.slice(0, MAX_SCANNER_OUTPUT_BYTES);
}

function parseClamAvSignature(output: string): string | null {
  const infectedLine = output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.endsWith(' FOUND'));
  if (!infectedLine) {
    return null;
  }
  const separator = infectedLine.lastIndexOf(': ');
  const signature = infectedLine.slice(separator >= 0 ? separator + 2 : 0, -' FOUND'.length).trim();
  return signature.slice(0, 240) || null;
}

function hasClamAvCleanLine(output: string): boolean {
  return output.split(/\r?\n/).some((line) => line.trim().endsWith(': OK'));
}

export function scannerArgsForCommand(
  command: string,
  filePath: string,
  databaseDir?: string,
  maxBytes = 2_000_000_000,
  timeoutMs = 900_000,
): string[] {
  const commandName = path.basename(command).toLowerCase();
  if (commandName !== 'clamscan') {
    throw new Error('The upload scanner currently requires standalone clamscan');
  }
  return [
    '--no-summary',
    '--stdout',
    '--alert-exceeds-max=yes',
    `--max-filesize=${maxBytes}`,
    `--max-scansize=${maxBytes}`,
    `--max-scantime=${timeoutMs}`,
    ...(databaseDir ? [`--database=${databaseDir}`] : []),
    filePath,
  ];
}

export function interpretClamAvExit(input: {
  exitCode: number | null;
  signal: NodeJS.Signals | null;
  output: string;
  timedOut: boolean;
}): ClamAvResult {
  if (input.timedOut) {
    return {
      verdict: 'ERROR',
      exitCode: input.exitCode,
      signature: null,
      errorCode: 'SCAN_TIMEOUT',
    };
  }
  if (input.signal) {
    return {
      verdict: 'ERROR',
      exitCode: input.exitCode,
      signature: null,
      errorCode: 'SCAN_PROCESS_TERMINATED',
    };
  }
  if (input.exitCode === 0) {
    if (parseClamAvSignature(input.output) || !hasClamAvCleanLine(input.output)) {
      return {
        verdict: 'ERROR',
        exitCode: 0,
        signature: null,
        errorCode: 'INCONSISTENT_SCANNER_RESULT',
      };
    }
    return {
      verdict: 'CLEAN',
      exitCode: 0,
      signature: null,
      errorCode: null,
    };
  }
  if (input.exitCode === 1) {
    const signature = parseClamAvSignature(input.output);
    if (!signature || signature.startsWith('Heuristics.Limits.Exceeded')) {
      return {
        verdict: 'ERROR',
        exitCode: 1,
        signature: null,
        errorCode: signature ? 'SCAN_LIMIT_EXCEEDED' : 'INCONSISTENT_SCANNER_RESULT',
      };
    }
    return {
      verdict: 'INFECTED',
      exitCode: 1,
      signature,
      errorCode: null,
    };
  }
  return {
    verdict: 'ERROR',
    exitCode: input.exitCode,
    signature: null,
    errorCode: 'SCAN_ENGINE_ERROR',
  };
}

export async function runClamAvScan(input: {
  command: string;
  filePath: string;
  timeoutMs: number;
  databaseDir?: string;
  maxBytes: number;
}): Promise<ClamAvResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      input.command,
      scannerArgsForCommand(
        input.command,
        input.filePath,
        input.databaseDir,
        input.maxBytes,
        input.timeoutMs,
      ),
      {
        shell: false,
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    );
    let output = '';
    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      child.kill('SIGKILL');
    }, input.timeoutMs);

    child.stdout.on('data', (chunk: Buffer) => {
      output = collectProcessOutput(output, chunk);
    });
    child.stderr.on('data', (chunk: Buffer) => {
      output = collectProcessOutput(output, chunk);
    });
    child.once('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child.once('close', (exitCode, signal) => {
      clearTimeout(timeout);
      resolve(interpretClamAvExit({ exitCode, signal, output, timedOut }));
    });
  });
}

export async function assertClamAvAvailable(input: {
  command: string;
  timeoutMs?: number;
  databaseDir?: string;
  maxDefinitionAgeHours: number;
  now?: Date;
}): Promise<string> {
  const timeoutMs = input.timeoutMs ?? 60_000;
  const rawVersion = await new Promise<string>((resolve, reject) => {
    const child = spawn(
      input.command,
      ['--version', ...(input.databaseDir ? [`--database=${input.databaseDir}`] : [])],
      {
        shell: false,
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    );
    let output = '';
    const timeout = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error(`ClamAV preflight timed out after ${timeoutMs}ms`));
    }, timeoutMs);
    child.stdout.on('data', (chunk: Buffer) => {
      output = collectProcessOutput(output, chunk);
    });
    child.stderr.on('data', (chunk: Buffer) => {
      output = collectProcessOutput(output, chunk);
    });
    child.once('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child.once('close', (exitCode) => {
      clearTimeout(timeout);
      if (exitCode !== 0) {
        reject(new Error(`ClamAV preflight exited with code ${exitCode ?? 'null'}`));
        return;
      }
      resolve(output.trim().slice(0, 120) || 'ClamAV');
    });
  });
  const version = normalizeClamAvVersion(rawVersion);
  const definitionTimestamp = parseClamAvDefinitionTimestamp(version);
  const definitionAgeMs =
    (input.now ?? new Date()).getTime() - (definitionTimestamp?.getTime() ?? Number.NaN);
  if (
    !definitionTimestamp ||
    !Number.isFinite(definitionAgeMs) ||
    definitionAgeMs < 0 ||
    definitionAgeMs > input.maxDefinitionAgeHours * 60 * 60_000
  ) {
    throw new Error(
      `ClamAV definitions are missing, future-dated, or older than ${input.maxDefinitionAgeHours} hours`,
    );
  }
  const tempDirectory = await mkdtemp(path.join(os.tmpdir(), 'clubroom-clamav-preflight-'));
  const probePath = path.join(tempDirectory, 'probe.txt');
  const detectionProbePath = path.join(tempDirectory, 'detection-probe.txt');
  try {
    const probe = await open(probePath, 'wx', 0o600);
    await probe.writeFile('Clubroom ClamAV preflight probe\n', 'utf8');
    await probe.close();
    const scanResult = await runClamAvScan({
      command: input.command,
      filePath: probePath,
      timeoutMs,
      databaseDir: input.databaseDir,
      maxBytes: 1024 * 1024,
    });
    if (scanResult.verdict !== 'CLEAN') {
      throw new Error(
        `ClamAV preflight probe failed with ${scanResult.errorCode ?? scanResult.verdict}`,
      );
    }
    const detectionProbe = await open(detectionProbePath, 'wx', 0o600);
    await detectionProbe.writeFile(
      ['X5O!P%@AP[4', '\\PZX54(P^)7CC)7}$', 'EICAR-STANDARD-ANTIVIRUS-', 'TEST-FILE!$H+H*'].join(
        '',
      ),
      'utf8',
    );
    await detectionProbe.close();
    const detectionResult = await runClamAvScan({
      command: input.command,
      filePath: detectionProbePath,
      timeoutMs,
      databaseDir: input.databaseDir,
      maxBytes: 1024 * 1024,
    });
    if (detectionResult.verdict !== 'INFECTED') {
      throw new Error(
        `ClamAV detection probe failed with ${detectionResult.errorCode ?? detectionResult.verdict}`,
      );
    }
    return version;
  } finally {
    await rm(tempDirectory, { recursive: true, force: true });
  }
}

export function parseClamAvDefinitionTimestamp(output: string): Date | null {
  const versionLine = output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => /^ClamAV\b/i.test(line));
  const parts = versionLine?.split('/') ?? [];
  if (parts.length < 3) {
    return null;
  }
  const timestamp = Date.parse(`${parts.slice(2).join('/').trim()} UTC`);
  return Number.isNaN(timestamp) ? null : new Date(timestamp);
}

export function normalizeClamAvVersion(output: string): string {
  const versionLine = output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => /^ClamAV\b/i.test(line));
  return (versionLine ?? output).replace(/\s+/g, ' ').trim().slice(0, 100) || 'ClamAV';
}

export function scannerPreflightIntervalMs(maxDefinitionAgeHours: number): number {
  return Math.max(
    60_000,
    Math.min(
      MAX_SCANNER_PREFLIGHT_INTERVAL_MS,
      Math.floor((maxDefinitionAgeHours * 60 * 60_000) / 2),
    ),
  );
}

export async function postUploadScanResult(input: {
  apiBaseUrl: string;
  resultToken: string;
  uploadSessionId: string;
  payload: ScanCallbackPayload;
  fetchImpl?: typeof fetch;
}): Promise<void> {
  const url = `${input.apiBaseUrl.replace(/\/+$/, '')}/uploads/${encodeURIComponent(
    input.uploadSessionId,
  )}/scan-result`;
  const retryDelays = [0, 500, 1500, 4000, 8000];
  let lastError: Error | undefined;

  for (const [attemptIndex, retryDelay] of retryDelays.entries()) {
    if (retryDelay > 0) {
      await delay(retryDelay);
    }
    let response: Response;
    try {
      response = await (input.fetchImpl ?? fetch)(url, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          [SCAN_RESULT_TOKEN_HEADER]: input.resultToken,
        },
        body: JSON.stringify(input.payload),
        signal: AbortSignal.timeout(15_000),
      });
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Upload scan callback failed');
      continue;
    }

    if (response.status === 200 || response.status === 201) {
      const body = (await response.json()) as {
        scanResult?: {
          uploadSessionId?: string;
          mediaObjectId?: string;
          sourceResultId?: string | null;
          scanAttemptId?: string | null;
          verdict?: string;
        };
      };
      if (
        body.scanResult?.uploadSessionId !== input.uploadSessionId ||
        body.scanResult.mediaObjectId !== input.payload.mediaObjectId ||
        body.scanResult.sourceResultId !== input.payload.sourceResultId ||
        body.scanResult.scanAttemptId !== input.payload.scanAttemptId ||
        body.scanResult.verdict !== input.payload.verdict
      ) {
        throw new Error('Upload scan callback returned a mismatched result');
      }
      return;
    }

    const responseText = (await response.text()).slice(0, 500);
    const error = new Error(
      `Upload scan callback returned HTTP ${response.status}: ${responseText}`,
    );
    if (response.status < 500 && ![408, 425, 429].includes(response.status)) {
      throw error;
    }
    lastError = error;
    if (attemptIndex === retryDelays.length - 1) {
      break;
    }
  }

  throw lastError ?? new Error('Upload scan callback failed');
}

async function reportErrorResult(input: {
  claim: ClaimedUploadScan;
  errorCode: string;
  sourceResultId: string;
  scanner: string;
  now: Date;
  details?: Record<string, unknown>;
  dependencies: ProcessUploadScanDependencies;
}): Promise<void> {
  await input.dependencies.report({
    uploadSessionId: input.claim.uploadSessionId,
    payload: {
      mediaObjectId: input.claim.mediaObjectId,
      sourceResultId: input.sourceResultId,
      scanAttemptId: input.claim.scanAttemptId,
      verdict: 'ERROR',
      scanner: input.scanner,
      scannedAt: input.now.toISOString(),
      details: {
        attemptNumber: input.claim.attemptNumber,
        errorCode: input.errorCode,
        ...input.details,
      },
    },
  });
}

export async function processClaimedUploadScan(input: {
  claim: ClaimedUploadScan;
  config: UploadScannerWorkerConfig;
  scannerIdentity: string;
  dependencies: ProcessUploadScanDependencies;
}): Promise<ProcessUploadScanResult> {
  const { claim, config, dependencies } = input;
  const sourceResultId = dependencies.newResultId();
  const startedAt = dependencies.now();
  let downloaded: DownloadedObject | undefined;
  const errorOutcome = (errorCode: string): 'REJECTED' | 'RETRY' =>
    shouldRejectUploadScanError(errorCode, claim.attemptNumber, config.maxAttempts)
      ? 'REJECTED'
      : 'RETRY';

  try {
    const readUrl = dependencies.createReadUrl({
      bucketName: claim.bucketName,
      storageKey: claim.storageKey,
    });
    try {
      downloaded = await dependencies.download({
        url: readUrl,
        expectedBytes: claim.expectedBytes,
        maxBytes: config.maxBytes,
        timeoutMs: config.downloadTimeoutMs,
      });
    } catch (error) {
      const downloadError =
        error instanceof StorageDownloadError
          ? error
          : new StorageDownloadError({
              code: 'STORAGE_DOWNLOAD_FAILED',
              message: error instanceof Error ? error.message : 'Private object download failed',
            });
      const now = dependencies.now();
      await reportErrorResult({
        claim,
        errorCode: downloadError.code,
        sourceResultId,
        scanner: input.scannerIdentity,
        now,
        details: downloadError.status ? { storageStatus: downloadError.status } : undefined,
        dependencies,
      });
      return {
        uploadSessionId: claim.uploadSessionId,
        mediaObjectId: claim.mediaObjectId,
        outcome: errorOutcome(downloadError.code),
        errorCode: downloadError.code,
        cleanupErrorCode: null,
      };
    }

    let detectedContentType: string;
    try {
      detectedContentType = await dependencies.validateFileType({
        claim,
        filePath: downloaded.filePath,
      });
    } catch (error) {
      const errorCode =
        error instanceof UploadFilePolicyError ? error.code : 'FILE_TYPE_VALIDATION_FAILED';
      const now = dependencies.now();
      await reportErrorResult({
        claim,
        errorCode,
        sourceResultId,
        scanner: input.scannerIdentity,
        now,
        details: {
          message:
            error instanceof Error
              ? error.message.slice(0, MAX_SCAN_ERROR_LENGTH)
              : 'File type validation failed',
        },
        dependencies,
      });
      return {
        uploadSessionId: claim.uploadSessionId,
        mediaObjectId: claim.mediaObjectId,
        outcome: errorOutcome(errorCode),
        errorCode,
        cleanupErrorCode: null,
      };
    }

    await dependencies.markObjectObserved(claim);
    let scanResult: ClamAvResult;
    try {
      scanResult = await dependencies.scan({
        command: config.command,
        filePath: downloaded.filePath,
        timeoutMs: config.scanTimeoutMs,
        databaseDir: config.databaseDir,
        maxBytes: config.maxBytes,
      });
    } catch {
      scanResult = {
        verdict: 'ERROR',
        exitCode: null,
        signature: null,
        errorCode: 'SCAN_PROCESS_FAILED',
      };
    }

    let sealedStorageKey: string | undefined;
    let proofETag = downloaded.objectETag;
    if (scanResult.verdict === 'CLEAN') {
      try {
        const sealed = await dependencies.seal({
          claim,
          downloaded,
          timeoutMs: config.downloadTimeoutMs,
        });
        sealedStorageKey = sealed.storageKey;
        proofETag = sealed.objectETag;
      } catch (error) {
        const now = dependencies.now();
        await reportErrorResult({
          claim,
          errorCode: 'OBJECT_SEAL_FAILED',
          sourceResultId,
          scanner: input.scannerIdentity,
          now,
          details: {
            message:
              error instanceof Error
                ? error.message.slice(0, MAX_SCAN_ERROR_LENGTH)
                : 'Sealed object upload failed',
          },
          dependencies,
        });
        return {
          uploadSessionId: claim.uploadSessionId,
          mediaObjectId: claim.mediaObjectId,
          outcome: errorOutcome('OBJECT_SEAL_FAILED'),
          errorCode: 'OBJECT_SEAL_FAILED',
          cleanupErrorCode: null,
        };
      }
    }

    const scannedAt = dependencies.now();
    await dependencies.report({
      uploadSessionId: claim.uploadSessionId,
      payload: {
        mediaObjectId: claim.mediaObjectId,
        sourceResultId,
        scanAttemptId: claim.scanAttemptId,
        verdict: scanResult.verdict,
        scanner: input.scannerIdentity,
        objectSizeBytes: downloaded.bytes,
        objectETag: proofETag,
        sha256Hex: downloaded.sha256Hex,
        sealedStorageKey,
        scannedAt: scannedAt.toISOString(),
        details: {
          attemptNumber: claim.attemptNumber,
          detectedContentType,
          durationMs: Math.max(0, scannedAt.getTime() - startedAt.getTime()),
          engineExitCode: scanResult.exitCode,
          ...(scanResult.signature ? { signature: scanResult.signature } : {}),
          ...(scanResult.errorCode ? { errorCode: scanResult.errorCode } : {}),
        },
      },
    });

    if (scanResult.verdict === 'CLEAN') {
      let cleanupErrorCode: string | null = null;
      try {
        await dependencies.deleteSource(claim);
      } catch {
        cleanupErrorCode = 'STAGING_CLEANUP_FAILED';
      }
      return {
        uploadSessionId: claim.uploadSessionId,
        mediaObjectId: claim.mediaObjectId,
        outcome: 'CLEAN',
        errorCode: null,
        cleanupErrorCode,
      };
    }
    if (scanResult.verdict === 'INFECTED') {
      return {
        uploadSessionId: claim.uploadSessionId,
        mediaObjectId: claim.mediaObjectId,
        outcome: 'INFECTED',
        errorCode: null,
        cleanupErrorCode: null,
      };
    }

    return {
      uploadSessionId: claim.uploadSessionId,
      mediaObjectId: claim.mediaObjectId,
      outcome: errorOutcome(scanResult.errorCode ?? 'SCAN_ENGINE_ERROR'),
      errorCode: scanResult.errorCode ?? 'SCAN_ENGINE_ERROR',
      cleanupErrorCode: null,
    };
  } finally {
    await downloaded?.cleanup();
  }
}

export function createProductionScanDependencies(input: {
  prisma: PrismaClient;
  workerId: string;
  config: UploadScannerWorkerConfig;
}): ProcessUploadScanDependencies {
  return {
    createReadUrl: ({ bucketName, storageKey }) =>
      createSignedReadUrl({
        bucketName,
        storageKey,
        expiresInSeconds: Math.ceil(input.config.downloadTimeoutMs / 1000) + 60,
      }).url,
    download: downloadObjectToPrivateTempFile,
    scan: runClamAvScan,
    validateFileType: ({ claim, filePath }) =>
      assertUploadFileContent({
        kind: claim.kind,
        contentType: claim.contentType,
        fileName: claim.originalFileName,
        filePath,
      }),
    seal: sealDownloadedUploadObject,
    report: ({ uploadSessionId, payload }) =>
      postUploadScanResult({
        apiBaseUrl: input.config.apiBaseUrl,
        resultToken: input.config.resultToken,
        uploadSessionId,
        payload,
      }),
    deleteSource: (claim) =>
      deletePrivateStorageObject({
        bucketName: claim.bucketName,
        storageKey: claim.storageKey,
      }),
    markObjectObserved: (claim) =>
      markUploadObjectObserved({
        prisma: input.prisma,
        workerId: input.workerId,
        claim,
      }),
    release: ({ claim, status, retryAt: nextAttemptAt, errorCode }) =>
      releaseUploadScanClaim({
        prisma: input.prisma,
        workerId: input.workerId,
        claim,
        status,
        retryAt: nextAttemptAt,
        errorCode,
      }),
    now: () => new Date(),
    newResultId: () => `scan_${crypto.randomUUID()}`,
  };
}
