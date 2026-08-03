import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getPrismaClient } from '@clubroom/db';
import { buildApp } from '../src/app.js';
import {
  assertClamAvAvailable,
  claimPendingStagingCleanups,
  claimPendingUploadScans,
  createProductionScanDependencies,
  processClaimedStagingCleanup,
  processClaimedUploadScan,
  readUploadScannerWorkerConfig,
} from '../src/lib/upload-scanner-worker.js';
import { createSignedReadUrl, deletePrivateStorageObject } from '../src/lib/storage-runtime.js';
import {
  removeUploadScannerHeartbeat,
  writeUploadScannerHeartbeat,
} from '../src/lib/upload-scanner-heartbeat.js';

interface LoginResponse {
  user: {
    id: string;
    email: string;
    roles: string[];
  };
  tokens: {
    accessToken: string;
  };
}

interface UploadInitResponse {
  uploadSessionId: string;
  mediaObjectId: string;
  uploadUrl: string;
  uploadHeaders: Record<string, string>;
  bucketName: string;
  storageKey: string;
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../../..');

function projectRefFromDatabaseUrl(): string {
  const databaseUrl = new URL(process.env.DATABASE_URL as string);
  const match = /^postgres\.([a-z0-9]+)$/.exec(databaseUrl.username);
  if (!match?.[1]) {
    throw new Error('Could not derive a Supabase project ref from DATABASE_URL');
  }
  return match[1];
}

function assertExpectedSupabaseProject(projectRef: string): void {
  const mcpConfig = fs.readFileSync(path.join(repoRoot, '.mcp.json'), 'utf8');
  if (!mcpConfig.includes(projectRef)) {
    throw new Error(`DATABASE_URL project ${projectRef} does not match .mcp.json`);
  }
}

async function requestJson<T>(input: {
  url: string;
  method?: string;
  token?: string;
  actingRole?: string;
  body?: unknown;
  expectedStatus?: number;
}): Promise<T> {
  const response = await fetch(input.url, {
    method: input.method ?? 'GET',
    headers: {
      ...(input.body === undefined ? {} : { 'content-type': 'application/json' }),
      ...(input.token ? { authorization: `Bearer ${input.token}` } : {}),
      ...(input.actingRole ? { 'x-acting-role': input.actingRole } : {}),
    },
    body: input.body === undefined ? undefined : JSON.stringify(input.body),
  });
  const text = await response.text();
  const expectedStatus = input.expectedStatus ?? 200;
  if (response.status !== expectedStatus) {
    throw new Error(
      `${input.method ?? 'GET'} ${input.url} returned ${response.status}, expected ${expectedStatus}: ${text.slice(0, 1000)}`,
    );
  }
  return text ? (JSON.parse(text) as T) : (undefined as T);
}

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL?.trim()) {
    throw new Error('DATABASE_URL is required');
  }
  if (process.env.API_DATA_BACKEND !== 'db') {
    throw new Error('API_DATA_BACKEND=db is required');
  }

  const projectRef = projectRefFromDatabaseUrl();
  assertExpectedSupabaseProject(projectRef);
  const proofEmail = process.env.API_UPLOAD_SCAN_PROOF_EMAIL?.trim();
  const proofPassword = process.env.API_UPLOAD_SCAN_PROOF_PASSWORD;
  if (!proofEmail || !proofPassword) {
    throw new Error(
      'API_UPLOAD_SCAN_PROOF_EMAIL and API_UPLOAD_SCAN_PROOF_PASSWORD are required',
    );
  }
  const baseConfig = readUploadScannerWorkerConfig();
  const scannerVersion = await assertClamAvAvailable({
    command: baseConfig.command,
    databaseDir: baseConfig.databaseDir,
    timeoutMs: Math.min(baseConfig.scanTimeoutMs, 120_000),
    maxDefinitionAgeHours: baseConfig.maxDefinitionAgeHours,
  });
  const scannerIdentity = `clamav:${scannerVersion}`.slice(0, 120);
  const prisma = getPrismaClient();
  const app = buildApp({ allowTestAuthHeaders: false });
  const heartbeatWorkerId = `staging-proof-heartbeat:${process.pid}:${crypto.randomUUID()}`;
  let upload: UploadInitResponse | undefined;
  let exhaustedUpload: UploadInitResponse | undefined;
  let sealedStorageKey: string | undefined;

  try {
    await writeUploadScannerHeartbeat({
      prisma,
      workerId: heartbeatWorkerId,
      status: 'READY',
      version: scannerIdentity,
      metadata: { source: 'prove-upload-scanner-worker' },
    });
    const address = await app.listen({ host: '127.0.0.1', port: 0 });
    const apiBaseUrl = `${address}/v1`;
    const login = await requestJson<LoginResponse>({
      url: `${apiBaseUrl}/auth/login`,
      method: 'POST',
      body: {
        email: proofEmail,
        password: proofPassword,
      },
    });
    assert(login.user.roles.includes('coach'));

    const fileBody = Buffer.from(
      `Clubroom clean upload scanner staging proof ${crypto.randomUUID()}\n`,
      'utf8',
    );
    const sha256Hex = crypto.createHash('sha256').update(fileBody).digest('hex');
    upload = await requestJson<UploadInitResponse>({
      url: `${apiBaseUrl}/uploads/init`,
      method: 'POST',
      token: login.tokens.accessToken,
      actingRole: 'coach',
      expectedStatus: 201,
      body: {
        kind: 'DOCUMENT',
        contentType: 'text/plain',
        fileName: 'clubroom-upload-scanner-proof.txt',
        sizeBytes: fileBody.length,
        metadata: {
          source: 'prove-upload-scanner-worker',
        },
      },
    });

    const wrongSizePut = await fetch(upload.uploadUrl, {
      method: 'PUT',
      headers: upload.uploadHeaders,
      body: Buffer.concat([fileBody, Buffer.from('x')]),
    });
    assert.equal(
      wrongSizePut.ok,
      false,
      'expected the signed upload to reject a body larger than the declared byte count',
    );

    const put = await fetch(upload.uploadUrl, {
      method: 'PUT',
      headers: upload.uploadHeaders,
      body: fileBody,
    });
    if (!put.ok) {
      throw new Error(
        `Signed private upload returned ${put.status}: ${(await put.text()).slice(0, 500)}`,
      );
    }
    const handoff = await requestJson<{
      pending: boolean;
      mediaStatus: string;
      scanVerdict: string;
    }>({
      url: `${apiBaseUrl}/uploads/${encodeURIComponent(upload.uploadSessionId)}/complete`,
      method: 'POST',
      token: login.tokens.accessToken,
      actingRole: 'coach',
      expectedStatus: 202,
      body: {
        mediaObjectId: upload.mediaObjectId,
      },
    });
    assert.equal(handoff.pending, true);
    assert.equal(handoff.mediaStatus, 'UPLOADED_UNSCANNED');
    const pendingStatus = await requestJson<{
      pending: boolean;
      readyToComplete: boolean;
      scanVerdict: string;
    }>({
      url: `${apiBaseUrl}/uploads/${encodeURIComponent(upload.uploadSessionId)}`,
      token: login.tokens.accessToken,
      actingRole: 'coach',
    });
    assert.equal(pendingStatus.pending, true);
    assert.equal(pendingStatus.readyToComplete, false);
    assert.equal(pendingStatus.scanVerdict, 'PENDING');

    const workerIds = [
      `staging-proof-a:${process.pid}:${crypto.randomUUID()}`,
      `staging-proof-b:${process.pid}:${crypto.randomUUID()}`,
    ];
    const crashedLeaseNow = new Date();
    const claimSets = await Promise.all(
      workerIds.map((workerId) =>
        claimPendingUploadScans({
          prisma,
          workerId,
          limit: 1,
          leaseMs: 1000,
          maxAttempts: baseConfig.maxAttempts,
          uploadSessionId: upload?.uploadSessionId,
          now: crashedLeaseNow,
        }),
      ),
    );
    const winningWorkerIndex = claimSets.findIndex((claims) => claims.length === 1);
    assert.notEqual(winningWorkerIndex, -1, 'expected the proof upload to be claimable');
    assert.equal(
      claimSets.reduce((count, claims) => count + claims.length, 0),
      1,
      'expected only one concurrent worker to lease the upload',
    );
    const recoveryWorkerId = `staging-proof-recovery:${process.pid}:${crypto.randomUUID()}`;
    const claims = await claimPendingUploadScans({
      prisma,
      workerId: recoveryWorkerId,
      limit: 1,
      leaseMs: baseConfig.leaseMs,
      maxAttempts: baseConfig.maxAttempts,
      uploadSessionId: upload.uploadSessionId,
      now: new Date(crashedLeaseNow.getTime() + 1001),
    });
    assert.equal(claims.length, 1, 'expected the expired SCANNING lease to be recovered');
    assert.equal(claims[0]?.attemptNumber, 2);
    const config = {
      ...baseConfig,
      apiBaseUrl,
    };
    const outcome = await processClaimedUploadScan({
      claim: claims[0] as NonNullable<(typeof claims)[number]>,
      config,
      scannerIdentity,
      dependencies: createProductionScanDependencies({
        prisma,
        workerId: recoveryWorkerId,
        config,
      }),
    });
    assert.equal(outcome.outcome, 'CLEAN');
    const cleanStatus = await requestJson<{
      pending: boolean;
      readyToComplete: boolean;
      scanVerdict: string;
    }>({
      url: `${apiBaseUrl}/uploads/${encodeURIComponent(upload.uploadSessionId)}`,
      token: login.tokens.accessToken,
      actingRole: 'coach',
    });
    assert.equal(cleanStatus.pending, false);
    assert.equal(cleanStatus.readyToComplete, true);
    assert.equal(cleanStatus.scanVerdict, 'CLEAN');

    const storedScan = await prisma.malwareScanResult.findFirst({
      where: {
        mediaObjectId: upload.mediaObjectId,
        sourceResultId: { not: null },
      },
      orderBy: { createdAt: 'desc' },
      select: {
        sourceResultId: true,
        scanAttemptId: true,
        verdict: true,
        scanner: true,
        objectSizeBytes: true,
        objectETag: true,
        sha256Hex: true,
        sealedStorageKey: true,
        scannedAt: true,
        detailsJson: true,
      },
    });
    assert(storedScan?.sourceResultId);
    assert(storedScan.scanAttemptId);
    assert.equal(storedScan.verdict, 'CLEAN');
    assert.equal(storedScan.scanner, scannerIdentity);
    assert.equal(storedScan.objectSizeBytes, BigInt(fileBody.length));
    assert(storedScan.objectETag);
    assert.equal(storedScan.sha256Hex, sha256Hex);
    assert(storedScan.sealedStorageKey);
    sealedStorageKey = storedScan.sealedStorageKey;
    assert.notEqual(sealedStorageKey, upload.storageKey);

    const deletedStagingRead = await fetch(
      createSignedReadUrl({
        bucketName: upload.bucketName,
        storageKey: upload.storageKey,
        expiresInSeconds: 60,
      }).url,
    );
    assert.equal(deletedStagingRead.status, 404);

    const overwrite = await fetch(upload.uploadUrl, {
      method: 'PUT',
      headers: upload.uploadHeaders,
      body: Buffer.alloc(fileBody.length, 0x78),
    });
    assert.equal(
      overwrite.ok,
      true,
      'expected the proof to exercise Supabase mutable client staging keys',
    );

    const replay = await fetch(
      `${apiBaseUrl}/uploads/${encodeURIComponent(upload.uploadSessionId)}/scan-result`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-clubroom-upload-scan-token': baseConfig.resultToken,
        },
        body: JSON.stringify({
          mediaObjectId: upload.mediaObjectId,
          sourceResultId: storedScan.sourceResultId,
          scanAttemptId: storedScan.scanAttemptId,
          verdict: 'CLEAN',
          scanner: scannerIdentity,
          objectSizeBytes: fileBody.length,
          objectETag: storedScan.objectETag,
          sha256Hex,
          sealedStorageKey,
          scannedAt: storedScan.scannedAt?.toISOString(),
          details: (storedScan.detailsJson as Record<string, unknown> | null) ?? {},
        }),
      },
    );
    assert.equal(replay.status, 200, `expected idempotent replay, received ${replay.status}`);

    await requestJson({
      url: `${apiBaseUrl}/uploads/${encodeURIComponent(upload.uploadSessionId)}/complete`,
      method: 'POST',
      token: login.tokens.accessToken,
      actingRole: 'coach',
      body: {
        mediaObjectId: upload.mediaObjectId,
        sha256Hex,
      },
    });
    const cleanupSchedule = await prisma.uploadSession.findUniqueOrThrow({
      where: { id: upload.uploadSessionId },
      select: {
        uploadUrlExpiresAt: true,
        stagingCleanupDueAt: true,
      },
    });
    assert(cleanupSchedule.stagingCleanupDueAt);
    assert(
      cleanupSchedule.stagingCleanupDueAt.getTime() >=
        cleanupSchedule.uploadUrlExpiresAt.getTime() +
          Number(process.env.API_UPLOAD_STAGING_CLEANUP_GRACE_MS ?? 24 * 60 * 60_000),
      'expected staging cleanup after signed URL expiry plus grace',
    );
    const cleanupWorkerId = `staging-proof-cleanup:${process.pid}:${crypto.randomUUID()}`;
    const stagingCleanupClaims = await claimPendingStagingCleanups({
      prisma,
      workerId: cleanupWorkerId,
      limit: 1,
      leaseMs: baseConfig.leaseMs,
      uploadSessionId: upload.uploadSessionId,
      now: new Date(cleanupSchedule.stagingCleanupDueAt.getTime() + 1),
    });
    assert.equal(stagingCleanupClaims.length, 1);
    const cleanupResult = await processClaimedStagingCleanup({
      prisma,
      workerId: cleanupWorkerId,
      claim: stagingCleanupClaims[0]!,
    });
    assert.equal(cleanupResult.outcome, 'CLEANED');
    const cleanedStagingRead = await fetch(
      createSignedReadUrl({
        bucketName: upload.bucketName,
        storageKey: upload.storageKey,
        expiresInSeconds: 60,
      }).url,
    );
    assert.equal(cleanedStagingRead.status, 404);

    const [storedUpload, storedMedia, resultCount, auditEvents] = await Promise.all([
      prisma.uploadSession.findUnique({
        where: { id: upload.uploadSessionId },
        select: {
          status: true,
          completedAt: true,
          scanClaimedAt: true,
          scanClaimedBy: true,
          scanAttemptCount: true,
          scanNextAttemptAt: true,
          scanLastError: true,
          stagingCleanupCompletedAt: true,
          stagingCleanupLastError: true,
        },
      }),
      prisma.mediaObject.findUnique({
        where: { id: upload.mediaObjectId },
        select: {
          status: true,
          sha256Hex: true,
          storageKey: true,
          bucketName: true,
        },
      }),
      prisma.malwareScanResult.count({
        where: { sourceResultId: storedScan.sourceResultId },
      }),
      prisma.auditEvent.findMany({
        where: {
          action: {
            in: [
              'upload.init',
              'upload.scan_pending',
              'upload.scan_result',
              'upload.complete',
              'upload.staging_cleanup',
            ],
          },
          OR: [
            { resourceId: upload.mediaObjectId },
            { resourceId: upload.uploadSessionId },
          ],
        },
        select: {
          action: true,
          result: true,
          metadataJson: true,
        },
      }),
    ]);

    assert.equal(storedUpload?.status, 'COMPLETED');
    assert(storedUpload.completedAt);
    assert.equal(storedUpload.scanClaimedAt, null);
    assert.equal(storedUpload.scanClaimedBy, null);
    assert.equal(storedUpload.scanAttemptCount, 2);
    assert.equal(storedUpload.scanNextAttemptAt, null);
    assert.equal(storedUpload.scanLastError, null);
    assert(storedUpload.stagingCleanupCompletedAt);
    assert.equal(storedUpload.stagingCleanupLastError, null);
    assert.equal(storedMedia?.status, 'AVAILABLE');
    assert.equal(storedMedia.sha256Hex, sha256Hex);
    assert.equal(storedMedia.storageKey, sealedStorageKey);
    const sealedReadUrl = createSignedReadUrl({
      bucketName: storedMedia.bucketName,
      storageKey: storedMedia.storageKey,
      expiresInSeconds: 60,
    });
    const sealedRead = await fetch(sealedReadUrl.url);
    const sealedBody = Buffer.from(await sealedRead.arrayBuffer());
    assert.equal(sealedRead.ok, true);
    assert.equal(crypto.createHash('sha256').update(sealedBody).digest('hex'), sha256Hex);
    assert.equal(resultCount, 1);
    assert(
      auditEvents.some(
        (event) =>
          event.action === 'upload.scan_result' &&
          event.result === 'SUCCESS' &&
          (event.metadataJson as { actorKind?: string } | null)?.actorKind === 'scanner_worker',
      ),
    );
    assert(
      auditEvents.some(
        (event) =>
          event.action === 'upload.staging_cleanup' && event.result === 'SUCCESS',
      ),
    );

    exhaustedUpload = await requestJson<UploadInitResponse>({
      url: `${apiBaseUrl}/uploads/init`,
      method: 'POST',
      token: login.tokens.accessToken,
      actingRole: 'coach',
      expectedStatus: 201,
      body: {
        kind: 'DOCUMENT',
        contentType: 'text/plain',
        fileName: 'clubroom-upload-scanner-exhaustion-proof.txt',
        sizeBytes: 4,
        metadata: {
          source: 'prove-upload-scanner-worker',
          scenario: 'attempt-exhaustion',
        },
      },
    });
    await requestJson({
      url: `${apiBaseUrl}/uploads/${encodeURIComponent(exhaustedUpload.uploadSessionId)}/complete`,
      method: 'POST',
      token: login.tokens.accessToken,
      actingRole: 'coach',
      expectedStatus: 202,
      body: {
        mediaObjectId: exhaustedUpload.mediaObjectId,
      },
    });
    await prisma.uploadSession.update({
      where: { id: exhaustedUpload.uploadSessionId },
      data: {
        status: 'SCAN_RETRY',
        scanAttemptCount: baseConfig.maxAttempts,
        scanNextAttemptAt: new Date(0),
      },
    });
    const exhaustedClaims = await claimPendingUploadScans({
      prisma,
      workerId: `staging-proof-exhausted:${process.pid}:${crypto.randomUUID()}`,
      limit: 1,
      leaseMs: baseConfig.leaseMs,
      maxAttempts: baseConfig.maxAttempts,
      uploadSessionId: exhaustedUpload.uploadSessionId,
    });
    const [exhaustedSession, exhaustedMedia, exhaustedAuditCount] = await Promise.all([
      prisma.uploadSession.findUnique({
        where: { id: exhaustedUpload.uploadSessionId },
        select: { status: true, scanLastError: true },
      }),
      prisma.mediaObject.findUnique({
        where: { id: exhaustedUpload.mediaObjectId },
        select: { status: true },
      }),
      prisma.auditEvent.count({
        where: {
          action: 'upload.scan_attempts_exhausted',
          resourceId: exhaustedUpload.mediaObjectId,
        },
      }),
    ]);
    assert.equal(exhaustedClaims.length, 0);
    assert.equal(exhaustedSession?.status, 'REJECTED');
    assert.equal(exhaustedSession.scanLastError, 'MAX_SCAN_ATTEMPTS_EXHAUSTED');
    assert.equal(exhaustedMedia?.status, 'REJECTED');
    assert.equal(exhaustedAuditCount, 1);

    process.stdout.write(
      `${JSON.stringify(
        {
          ok: true,
          projectRef,
          scannerIdentity,
          uploadSessionId: upload.uploadSessionId,
          mediaObjectId: upload.mediaObjectId,
          outcome: outcome.outcome,
          concurrentClaimExclusive: true,
          expiredClaimRecovered: true,
          signedSizeMismatchRejected: true,
          exactSizeVerified: true,
          checksumVerified: true,
          readOnlyStatusVerified: true,
          stagingObjectRemovedAfterScan: true,
          stagingKeyMutable: true,
          cleanupScheduledAfterExpiryGrace: true,
          sealedObjectAuthoritative: true,
          callbackReplayIdempotent: true,
          exhaustedAttemptRejected: true,
          scanResultCount: resultCount,
          scanAttemptCount: storedUpload.scanAttemptCount,
          mediaStatus: storedMedia.status,
          uploadStatus: storedUpload.status,
          auditedActions: auditEvents.length,
        },
        null,
        2,
      )}\n`,
    );
  } finally {
    try {
      if (upload) {
        await deletePrivateStorageObject({
          bucketName: upload.bucketName,
          storageKey: upload.storageKey,
        }).catch((error) => {
          process.stderr.write(
            `Storage proof cleanup failed: ${error instanceof Error ? error.message : String(error)}\n`,
          );
        });
        if (sealedStorageKey) {
          await deletePrivateStorageObject({
            bucketName: upload.bucketName,
            storageKey: sealedStorageKey,
          }).catch((error) => {
            process.stderr.write(
              `Sealed storage proof cleanup failed: ${error instanceof Error ? error.message : String(error)}\n`,
            );
          });
        }
        await prisma.$transaction([
          prisma.auditEvent.deleteMany({
            where: {
              resourceId: upload.mediaObjectId,
              action: {
                in: [
                  'upload.init',
                  'upload.scan_pending',
                  'upload.scan_result',
                  'upload.complete',
                  'upload.staging_cleanup',
                ],
              },
            },
          }),
          prisma.auditEvent.deleteMany({
            where: {
              resourceId: upload.uploadSessionId,
              action: {
                in: ['upload.staging_cleanup', 'upload.staging_cleanup_failed'],
              },
            },
          }),
          prisma.uploadSession.deleteMany({
            where: { id: upload.uploadSessionId },
          }),
          prisma.malwareScanResult.deleteMany({
            where: { mediaObjectId: upload.mediaObjectId },
          }),
          prisma.mediaObject.deleteMany({
            where: { id: upload.mediaObjectId },
          }),
        ]);
      }
      if (exhaustedUpload) {
        await deletePrivateStorageObject({
          bucketName: exhaustedUpload.bucketName,
          storageKey: exhaustedUpload.storageKey,
        }).catch((error) => {
          process.stderr.write(
            `Exhaustion storage proof cleanup failed: ${
              error instanceof Error ? error.message : String(error)
            }\n`,
          );
        });
        await prisma.$transaction([
          prisma.auditEvent.deleteMany({
            where: {
              resourceId: exhaustedUpload.mediaObjectId,
              action: {
                in: ['upload.init', 'upload.scan_pending', 'upload.scan_attempts_exhausted'],
              },
            },
          }),
          prisma.uploadSession.deleteMany({
            where: { id: exhaustedUpload.uploadSessionId },
          }),
          prisma.malwareScanResult.deleteMany({
            where: { mediaObjectId: exhaustedUpload.mediaObjectId },
          }),
          prisma.mediaObject.deleteMany({
            where: { id: exhaustedUpload.mediaObjectId },
          }),
        ]);
      }
    } finally {
      await removeUploadScannerHeartbeat({
        prisma,
        workerId: heartbeatWorkerId,
      }).catch(() => undefined);
      await app.close();
      await prisma.$disconnect();
    }
  }
}

void main().catch((error) => {
  process.stderr.write(
    `Upload scanner staging proof failed: ${error instanceof Error ? error.stack : String(error)}\n`,
  );
  process.exitCode = 1;
});
