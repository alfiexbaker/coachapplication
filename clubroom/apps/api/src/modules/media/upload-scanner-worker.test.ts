import assert from 'node:assert/strict';
import { getEventListeners } from 'node:events';
import { stat } from 'node:fs/promises';
import { describe, it } from 'node:test';
import type { PrismaClient } from '@clubroom/db';
import {
  StorageDownloadError,
  downloadObjectToPrivateTempFile,
  interpretClamAvExit,
  isRecoverableUploadScannerDatabaseError,
  normalizeClamAvVersion,
  parseClamAvDefinitionTimestamp,
  postUploadScanResult,
  processClaimedStagingCleanup,
  processClaimedUploadScan,
  scannerArgsForCommand,
  scannerPreflightIntervalMs,
  type ClaimedUploadScan,
  type ClaimedStagingCleanup,
  type ProcessUploadScanDependencies,
  type ScanCallbackPayload,
  type UploadScannerWorkerConfig,
  uploadScannerDatabaseRetryDelayMs,
  waitForAbortableDelay,
} from '../../lib/upload-scanner-worker.js';
import { UploadFilePolicyError } from '../../lib/upload-file-policy.js';

const config: UploadScannerWorkerConfig = {
  apiBaseUrl: 'https://api.clubroom.test/v1',
  resultToken: 'test-upload-scanner-token',
  command: 'clamscan',
  databaseDir: undefined,
  batchSize: 2,
  pollIntervalMs: 5000,
  leaseMs: 1_920_000,
  downloadTimeoutMs: 15_000,
  scanTimeoutMs: 15_000,
  maxBytes: 10_000,
  maxAttempts: 5,
  maxDefinitionAgeHours: 48,
};

const claim: ClaimedUploadScan = {
  uploadSessionId: 'ups_test_scan',
  mediaObjectId: 'med_test_scan',
  scanAttemptId: 'sat_test_scan_1',
  bucketName: 'clubroom-private',
  storageKey: 'uploads/user/ups_test_scan/video.mp4',
  kind: 'VIDEO',
  contentType: 'video/mp4',
  originalFileName: 'video.mp4',
  expectedBytes: 4,
  uploadUrlExpiresAt: new Date('2030-01-01T00:00:00.000Z'),
  attemptNumber: 1,
};

describe('upload scanner worker lifecycle', () => {
  it('removes poll abort listeners after each completed delay', async () => {
    const controller = new AbortController();
    for (let iteration = 0; iteration < 12; iteration += 1) {
      await waitForAbortableDelay(0, controller.signal);
    }

    assert.equal(getEventListeners(controller.signal, 'abort').length, 0);
  });

  it('retries only transient database connectivity failures with capped backoff', () => {
    assert.equal(isRecoverableUploadScannerDatabaseError({ errorCode: 'P1001' }), true);
    assert.equal(isRecoverableUploadScannerDatabaseError({ code: 'P2024' }), true);
    assert.equal(
      isRecoverableUploadScannerDatabaseError({
        cause: new Error("Can't reach database server at `pooler.supabase.test:5432`"),
      }),
      true,
    );
    assert.equal(isRecoverableUploadScannerDatabaseError({ code: 'P2002' }), false);
    assert.equal(
      isRecoverableUploadScannerDatabaseError(new Error('Upload scanner callback was rejected')),
      false,
    );

    assert.equal(uploadScannerDatabaseRetryDelayMs(1, 5_000), 5_000);
    assert.equal(uploadScannerDatabaseRetryDelayMs(2, 5_000), 10_000);
    assert.equal(uploadScannerDatabaseRetryDelayMs(3, 5_000), 20_000);
    assert.equal(uploadScannerDatabaseRetryDelayMs(4, 5_000), 30_000);
    assert.equal(uploadScannerDatabaseRetryDelayMs(20, 5_000), 30_000);
    assert.equal(uploadScannerDatabaseRetryDelayMs(1, 100), 1_000);
  });
});

function createDependencies(input: {
  download?: ProcessUploadScanDependencies['download'];
  scan?: ProcessUploadScanDependencies['scan'];
  seal?: ProcessUploadScanDependencies['seal'];
}) {
  const reports: ScanCallbackPayload[] = [];
  const releases: Array<{
    status: string;
    retryAt: Date | null;
    errorCode: string | null;
  }> = [];
  let observed = 0;
  let cleaned = 0;
  let sealed = 0;
  let sourceDeleted = 0;

  const dependencies: ProcessUploadScanDependencies = {
    createReadUrl: () => 'https://storage.clubroom.test/private-object',
    download:
      input.download ??
      (async () => ({
        filePath: '/tmp/clubroom-test-upload.bin',
        bytes: 4,
        sha256Hex: 'a'.repeat(64),
        objectETag: '"test-etag"',
        cleanup: async () => {
          cleaned += 1;
        },
      })),
    scan:
      input.scan ??
      (async () => ({
        verdict: 'CLEAN',
        exitCode: 0,
        signature: null,
        errorCode: null,
      })),
    validateFileType: async () => 'video/iso-bmff',
    seal:
      input.seal ??
      (async ({ downloaded }) => {
        sealed += 1;
        return {
          storageKey: `uploads/user/ups_test_scan/sealed/${downloaded.sha256Hex}.mp4`,
          objectETag: '"sealed-etag"',
        };
      }),
    report: async ({ payload }) => {
      reports.push(payload);
    },
    deleteSource: async () => {
      sourceDeleted += 1;
    },
    markObjectObserved: async () => {
      observed += 1;
    },
    release: async ({ status, retryAt, errorCode }) => {
      releases.push({ status, retryAt, errorCode });
    },
    now: () => new Date('2029-01-01T00:00:00.000Z'),
    newResultId: () => 'scan_result_test_1',
  };

  return {
    dependencies,
    reports,
    releases,
    observed: () => observed,
    cleaned: () => cleaned,
    sealed: () => sealed,
    sourceDeleted: () => sourceDeleted,
  };
}

describe('upload scanner worker', () => {
  it('maps only ClamAV exit 0 to CLEAN and exit 1 to INFECTED', () => {
    assert.deepEqual(
      interpretClamAvExit({
        exitCode: 0,
        signal: null,
        output: '/tmp/object.bin: OK\n',
        timedOut: false,
      }),
      {
        verdict: 'CLEAN',
        exitCode: 0,
        signature: null,
        errorCode: null,
      },
    );
    assert.deepEqual(
      interpretClamAvExit({
        exitCode: 1,
        signal: null,
        output: '/tmp/object.bin: Eicar-Signature FOUND\n',
        timedOut: false,
      }),
      {
        verdict: 'INFECTED',
        exitCode: 1,
        signature: 'Eicar-Signature',
        errorCode: null,
      },
    );
    assert.equal(
      interpretClamAvExit({
        exitCode: 2,
        signal: null,
        output: 'scanner error',
        timedOut: false,
      }).verdict,
      'ERROR',
    );
    assert.equal(
      interpretClamAvExit({
        exitCode: 0,
        signal: null,
        output: '/tmp/object.bin: Unexpected-Signature FOUND\n',
        timedOut: false,
      }).verdict,
      'ERROR',
    );
    assert.equal(
      interpretClamAvExit({
        exitCode: 0,
        signal: null,
        output: 'scanner exited without an object result',
        timedOut: false,
      }).errorCode,
      'INCONSISTENT_SCANNER_RESULT',
    );
    assert.equal(
      interpretClamAvExit({
        exitCode: 1,
        signal: null,
        output: '/tmp/object.bin: Heuristics.Limits.Exceeded.MaxFileSize FOUND\n',
        timedOut: false,
      }).errorCode,
      'SCAN_LIMIT_EXCEEDED',
    );
    assert.equal(
      interpretClamAvExit({
        exitCode: null,
        signal: 'SIGKILL',
        output: '',
        timedOut: true,
      }).errorCode,
      'SCAN_TIMEOUT',
    );
  });

  it('uses fixed clamscan arguments without a shell and rejects clamdscan', () => {
    assert.deepEqual(scannerArgsForCommand('clamscan', '/tmp/object.bin'), [
      '--no-summary',
      '--stdout',
      '--alert-exceeds-max=yes',
      '--max-filesize=2000000000',
      '--max-scansize=2000000000',
      '--max-scantime=900000',
      '/tmp/object.bin',
    ]);
    assert.throws(
      () => scannerArgsForCommand('/usr/bin/clamdscan', '/tmp/object.bin'),
      /requires standalone clamscan/,
    );
    assert.deepEqual(scannerArgsForCommand('clamscan', '/tmp/object.bin', '/var/lib/clamav'), [
      '--no-summary',
      '--stdout',
      '--alert-exceeds-max=yes',
      '--max-filesize=2000000000',
      '--max-scansize=2000000000',
      '--max-scantime=900000',
      '--database=/var/lib/clamav',
      '/tmp/object.bin',
    ]);
  });

  it('keeps warnings out of the persisted scanner version identity', () => {
    assert.equal(
      normalizeClamAvVersion('WARNING: Failed to set locale\nClamAV 1.5.3\n'),
      'ClamAV 1.5.3',
    );
    assert.equal(
      parseClamAvDefinitionTimestamp('ClamAV 1.5.3/28077/Thu Jul 30 07:24:42 2026')?.toISOString(),
      '2026-07-30T07:24:42.000Z',
    );
    assert.equal(parseClamAvDefinitionTimestamp('ClamAV 1.5.3'), null);
    assert.equal(scannerPreflightIntervalMs(48), 60 * 60_000);
    assert.equal(scannerPreflightIntervalMs(1), 30 * 60_000);
  });

  it('downloads exact bytes to a private temporary file and computes SHA-256', async () => {
    const body = Buffer.from('safe');
    const downloaded = await downloadObjectToPrivateTempFile({
      url: 'https://storage.clubroom.test/object',
      expectedBytes: body.length,
      maxBytes: 100,
      timeoutMs: 5000,
      fetchImpl: (async () =>
        new Response(body, {
          status: 200,
          headers: {
            'content-length': String(body.length),
            etag: '"proof-etag"',
          },
        })) as typeof fetch,
    });

    try {
      const metadata = await stat(downloaded.filePath);
      assert.equal(metadata.mode & 0o777, 0o600);
      assert.equal(downloaded.bytes, body.length);
      assert.equal(downloaded.objectETag, '"proof-etag"');
      assert.equal(
        downloaded.sha256Hex,
        '8b3369944dd2a3fab39e32d1aeb1f763946a458ae3e6368a46432adc8f3a0860',
      );
    } finally {
      await downloaded.cleanup();
    }
  });

  it('fails closed when storage returns no object or a size mismatch', async () => {
    await assert.rejects(
      downloadObjectToPrivateTempFile({
        url: 'https://storage.clubroom.test/missing',
        expectedBytes: 4,
        maxBytes: 100,
        timeoutMs: 5000,
        fetchImpl: (async () => new Response(null, { status: 404 })) as typeof fetch,
      }),
      (error: unknown) =>
        error instanceof StorageDownloadError &&
        error.code === 'OBJECT_NOT_FOUND' &&
        error.status === 404,
    );
    await assert.rejects(
      downloadObjectToPrivateTempFile({
        url: 'https://storage.clubroom.test/wrong-size',
        expectedBytes: 4,
        maxBytes: 100,
        timeoutMs: 5000,
        fetchImpl: (async () =>
          new Response('abc', {
            status: 200,
            headers: { etag: '"wrong-size-etag"' },
          })) as typeof fetch,
      }),
      (error: unknown) =>
        error instanceof StorageDownloadError && error.code === 'OBJECT_SIZE_MISMATCH',
    );
  });

  it('reports a real clean verdict before releasing the job as scanned', async () => {
    const state = createDependencies({});
    const result = await processClaimedUploadScan({
      claim,
      config,
      scannerIdentity: 'clamav:test',
      dependencies: state.dependencies,
    });

    assert.equal(result.outcome, 'CLEAN');
    assert.equal(state.observed(), 1);
    assert.equal(state.cleaned(), 1);
    assert.equal(state.sealed(), 1);
    assert.equal(state.sourceDeleted(), 1);
    assert.equal(state.reports.length, 1);
    assert.equal(state.reports[0]?.sourceResultId, 'scan_result_test_1');
    assert.equal(state.reports[0]?.scanAttemptId, claim.scanAttemptId);
    assert.equal(state.reports[0]?.verdict, 'CLEAN');
    assert.equal(state.reports[0]?.objectSizeBytes, 4);
    assert.equal(state.reports[0]?.objectETag, '"sealed-etag"');
    assert.equal(state.reports[0]?.sha256Hex, 'a'.repeat(64));
    assert.equal(
      state.reports[0]?.sealedStorageKey,
      `uploads/user/ups_test_scan/sealed/${'a'.repeat(64)}.mp4`,
    );
    assert.equal(state.releases.length, 0);
  });

  it('rejects permanent scanner failures instead of retrying forever', async () => {
    const state = createDependencies({
      download: async () => {
        throw new StorageDownloadError({
          code: 'OBJECT_SIZE_MISMATCH',
          message: 'wrong size',
        });
      },
    });
    const result = await processClaimedUploadScan({
      claim,
      config,
      scannerIdentity: 'clamav:test',
      dependencies: state.dependencies,
    });

    assert.equal(result.outcome, 'REJECTED');
    assert.equal(state.reports[0]?.details.errorCode, 'OBJECT_SIZE_MISMATCH');
  });

  it('rejects clean malware results when file bytes do not match the declaration', async () => {
    const state = createDependencies({});
    state.dependencies.validateFileType = async () => {
      throw new UploadFilePolicyError('FILE_TYPE_MISMATCH', 'wrong bytes');
    };
    const result = await processClaimedUploadScan({
      claim,
      config,
      scannerIdentity: 'clamav:test',
      dependencies: state.dependencies,
    });

    assert.equal(result.outcome, 'REJECTED');
    assert.equal(result.errorCode, 'FILE_TYPE_MISMATCH');
    assert.equal(state.reports[0]?.verdict, 'ERROR');
    assert.equal(state.sealed(), 0);
  });

  it('keeps clean authority when staging cleanup fails', async () => {
    const state = createDependencies({});
    state.dependencies.deleteSource = async () => {
      throw new Error('temporary storage cleanup failure');
    };
    const result = await processClaimedUploadScan({
      claim,
      config,
      scannerIdentity: 'clamav:test',
      dependencies: state.dependencies,
    });

    assert.equal(result.outcome, 'CLEAN');
    assert.equal(result.cleanupErrorCode, 'STAGING_CLEANUP_FAILED');
  });

  it('backs off durable staging cleanup failures with diagnostics and audit', async () => {
    const updates: Array<Record<string, unknown>> = [];
    const audits: Array<Record<string, unknown>> = [];
    const prisma = {
      $transaction: async (
        run: (tx: {
          uploadSession: { updateMany: (input: Record<string, unknown>) => Promise<{ count: number }> };
          auditEvent: { upsert: (input: Record<string, unknown>) => Promise<unknown> };
        }) => Promise<void>,
      ) =>
        run({
          uploadSession: {
            updateMany: async (input) => {
              updates.push(input);
              return { count: 1 };
            },
          },
          auditEvent: {
            upsert: async (input) => {
              audits.push(input);
              return input;
            },
          },
        }),
    } as unknown as PrismaClient;
    const cleanupClaim: ClaimedStagingCleanup = {
      uploadSessionId: 'ups_cleanup',
      mediaObjectId: 'med_cleanup',
      uploadStatus: 'REJECTED',
      bucketName: 'clubroom-private',
      storageKey: 'uploads/user/ups_cleanup/proof.txt',
      attemptNumber: 3,
    };
    const now = new Date('2030-01-01T00:00:00.000Z');

    const result = await processClaimedStagingCleanup({
      prisma,
      workerId: 'cleanup-worker',
      claim: cleanupClaim,
      deleteObject: async () => {
        throw new Error('storage unavailable');
      },
      now: () => now,
    });

    assert.deepEqual(result, {
      outcome: 'RETRY',
      errorCode: 'STAGING_CLEANUP_FAILED',
      errorMessage: 'storage unavailable',
    });
    const update = updates[0] as {
      data: {
        stagingCleanupNextAttemptAt: Date;
        stagingCleanupLastError: string;
      };
    };
    assert.equal(
      update.data.stagingCleanupNextAttemptAt.toISOString(),
      '2030-01-01T00:20:00.000Z',
    );
    assert.match(update.data.stagingCleanupLastError, /storage unavailable/);
    assert.equal(
      (audits[0] as { create: { action: string } }).create.action,
      'upload.staging_cleanup_failed',
    );
  });

  it('does not invent a verdict while the upload object is not ready', async () => {
    const state = createDependencies({
      download: async () => {
        throw new StorageDownloadError({
          status: 404,
          code: 'OBJECT_NOT_FOUND',
          message: 'not uploaded yet',
        });
      },
    });
    const result = await processClaimedUploadScan({
      claim,
      config,
      scannerIdentity: 'clamav:test',
      dependencies: state.dependencies,
    });

    assert.equal(result.outcome, 'RETRY');
    assert.equal(result.errorCode, 'OBJECT_NOT_FOUND');
    assert.equal(state.observed(), 0);
    assert.equal(state.reports[0]?.verdict, 'ERROR');
    assert.equal(state.sealed(), 0);
    assert.equal(state.reports[0]?.scanAttemptId, claim.scanAttemptId);
    assert.equal(state.releases.length, 0);
  });

  it('records scanner errors but never promotes them to CLEAN', async () => {
    const state = createDependencies({
      scan: async () => ({
        verdict: 'ERROR',
        exitCode: 2,
        signature: null,
        errorCode: 'SCAN_ENGINE_ERROR',
      }),
    });
    const result = await processClaimedUploadScan({
      claim,
      config,
      scannerIdentity: 'clamav:test',
      dependencies: state.dependencies,
    });

    assert.equal(result.outcome, 'RETRY');
    assert.equal(state.reports[0]?.verdict, 'ERROR');
    assert.equal(state.sealed(), 0);
    assert.equal(state.releases.length, 0);
  });

  it('terminates retryable scanner errors at the configured attempt ceiling', async () => {
    const state = createDependencies({
      scan: async () => ({
        verdict: 'ERROR',
        exitCode: 2,
        signature: null,
        errorCode: 'SCAN_ENGINE_ERROR',
      }),
    });
    const result = await processClaimedUploadScan({
      claim: {
        ...claim,
        scanAttemptId: 'sat_test_scan_5',
        attemptNumber: config.maxAttempts,
      },
      config,
      scannerIdentity: 'clamav:test',
      dependencies: state.dependencies,
    });

    assert.equal(result.outcome, 'REJECTED');
    assert.equal(state.reports[0]?.verdict, 'ERROR');
  });

  it('retries a server callback with the same source result id', async () => {
    let attempts = 0;
    const payload: ScanCallbackPayload = {
      mediaObjectId: 'med_test_scan',
      sourceResultId: 'scan_result_retry',
      scanAttemptId: 'sat_test_scan_retry',
      verdict: 'CLEAN',
      scanner: 'clamav:test',
      objectSizeBytes: 4,
      objectETag: '"retry-etag"',
      sha256Hex: 'a'.repeat(64),
      sealedStorageKey: `uploads/user/ups_test_scan/sealed/${'a'.repeat(64)}.mp4`,
      scannedAt: '2029-01-01T00:00:00.000Z',
      details: { bytes: 4 },
    };

    await postUploadScanResult({
      apiBaseUrl: 'https://api.clubroom.test/v1',
      resultToken: 'test-upload-scanner-token',
      uploadSessionId: 'ups_test_scan',
      payload,
      fetchImpl: (async (_url: string | URL | Request, init?: RequestInit) => {
        attempts += 1;
        assert.equal(
          (JSON.parse(String(init?.body)) as ScanCallbackPayload).sourceResultId,
          payload.sourceResultId,
        );
        if (attempts === 1) {
          return new Response('temporary failure', { status: 503 });
        }
        return Response.json(
          {
            scanResult: {
              uploadSessionId: 'ups_test_scan',
              mediaObjectId: payload.mediaObjectId,
              sourceResultId: payload.sourceResultId,
              scanAttemptId: payload.scanAttemptId,
              verdict: payload.verdict,
            },
          },
          { status: 201 },
        );
      }) as typeof fetch,
    });

    assert.equal(attempts, 2);
  });

  it('does not retry a terminal callback 4xx', async () => {
    let attempts = 0;
    await assert.rejects(
      postUploadScanResult({
        apiBaseUrl: 'https://api.clubroom.test/v1',
        resultToken: 'test-upload-scanner-token',
        uploadSessionId: 'ups_test_scan',
        payload: {
          mediaObjectId: 'med_test_scan',
          sourceResultId: 'scan_result_terminal',
          scanAttemptId: 'sat_test_scan_terminal',
          verdict: 'ERROR',
          scanner: 'clamav:test',
          scannedAt: '2029-01-01T00:00:00.000Z',
          details: { errorCode: 'STALE_LEASE' },
        },
        fetchImpl: (async () => {
          attempts += 1;
          return new Response('stale lease', { status: 409 });
        }) as typeof fetch,
      }),
      /HTTP 409/,
    );
    assert.equal(attempts, 1);
  });
});
