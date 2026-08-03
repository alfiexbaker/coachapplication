import '../instrument.js';
import crypto from 'node:crypto';
import os from 'node:os';
import { getPrismaClient } from '@clubroom/db';
import { captureException, flush, setTag } from '@sentry/node';
import {
  assertClamAvAvailable,
  claimPendingStagingCleanups,
  claimPendingUploadScans,
  createProductionScanDependencies,
  isRecoverableUploadScannerDatabaseError,
  processClaimedStagingCleanup,
  processClaimedUploadScan,
  readUploadScannerWorkerConfig,
  releaseUploadScanClaim,
  scannerPreflightIntervalMs,
  type ClaimedUploadScan,
  uploadScannerDatabaseRetryDelayMs,
  waitForAbortableDelay,
} from '../lib/upload-scanner-worker.js';
import {
  pruneUploadScannerHeartbeats,
  removeUploadScannerHeartbeat,
  writeUploadScannerHeartbeat,
} from '../lib/upload-scanner-heartbeat.js';

const HEARTBEAT_INTERVAL_MS = 30_000;
const ONCE_DATABASE_RETRY_LIMIT = 3;

setTag('service', 'clubroom-upload-scanner');

interface WorkerCliOptions {
  once: boolean;
  uploadSessionId?: string;
}

function parseCliOptions(argv: string[]): WorkerCliOptions {
  const uploadSessionArgument = argv.find((argument) =>
    argument.startsWith('--upload-session-id='),
  );
  const uploadSessionId = uploadSessionArgument?.slice('--upload-session-id='.length).trim();
  if (uploadSessionArgument && !uploadSessionId) {
    throw new Error('--upload-session-id requires a non-empty value');
  }
  return {
    once: argv.includes('--once') || Boolean(uploadSessionId),
    uploadSessionId,
  };
}

function log(
  level: 'info' | 'warn' | 'error',
  event: string,
  details: Record<string, unknown> = {},
): void {
  process.stdout.write(
    `${JSON.stringify({
      level,
      event,
      at: new Date().toISOString(),
      ...details,
    })}\n`,
  );
}

async function releaseAfterUnexpectedFailure(input: {
  prisma: ReturnType<typeof getPrismaClient>;
  workerId: string;
  claim: ClaimedUploadScan;
  maxAttempts: number;
}): Promise<void> {
  const terminal = input.claim.attemptNumber >= input.maxAttempts;
  await releaseUploadScanClaim({
    prisma: input.prisma,
    workerId: input.workerId,
    claim: input.claim,
    status: terminal ? 'REJECTED' : 'SCAN_RETRY',
    retryAt: terminal ? null : new Date(Date.now() + 30_000),
    errorCode: 'WORKER_ATTEMPT_FAILED',
  });
}

async function main(): Promise<void> {
  const options = parseCliOptions(process.argv.slice(2));
  const config = readUploadScannerWorkerConfig();
  const callbackUrl = new URL(config.apiBaseUrl);
  if (
    process.env.NODE_ENV === 'production' &&
    callbackUrl.protocol !== 'https:' &&
    !['127.0.0.1', 'localhost', '::1'].includes(callbackUrl.hostname)
  ) {
    throw new Error('Production upload scanner callbacks must use HTTPS');
  }

  const preflight = () =>
    assertClamAvAvailable({
      command: config.command,
      databaseDir: config.databaseDir,
      timeoutMs: Math.min(config.scanTimeoutMs, 120_000),
      maxDefinitionAgeHours: config.maxDefinitionAgeHours,
    });
  let scannerIdentity: string | undefined;
  const preflightIntervalMs = scannerPreflightIntervalMs(config.maxDefinitionAgeHours);
  let nextPreflightAt = 0;
  const workerId = `${os.hostname()}:${process.pid}:${crypto.randomUUID()}`.slice(0, 240);
  const prisma = getPrismaClient();
  const stopController = new AbortController();
  let heartbeatTimer: NodeJS.Timeout | undefined;
  let heartbeatWriteInFlight = false;
  let databaseFailureCount = 0;
  let databaseInitialized = false;
  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.once(signal, () => {
      log('info', 'upload_scanner.stop_requested', { signal });
      stopController.abort();
    });
  }

  log('info', 'upload_scanner.started', {
    command: config.command,
    scannerIdentity: null,
    batchSize: config.batchSize,
    once: options.once,
    targetedSession: Boolean(options.uploadSessionId),
  });

  try {
    do {
      try {
        if (!databaseInitialized) {
          await pruneUploadScannerHeartbeats({ prisma });
          await writeUploadScannerHeartbeat({
            prisma,
            workerId,
            status: 'STARTING',
            metadata: { command: config.command },
          });
          databaseInitialized = true;
        }
        if (databaseFailureCount > 0) {
          if (scannerIdentity) {
            await writeUploadScannerHeartbeat({
              prisma,
              workerId,
              status: 'READY',
              version: scannerIdentity,
              metadata: { command: config.command },
            });
          }
          log('info', 'upload_scanner.database_recovered', {
            consecutiveFailures: databaseFailureCount,
          });
          databaseFailureCount = 0;
        }

        const cleanupClaims = await claimPendingStagingCleanups({
          prisma,
          workerId,
          limit: options.uploadSessionId ? 1 : config.batchSize,
          leaseMs: config.leaseMs,
          uploadSessionId: options.uploadSessionId,
        });
        const cleanupOutcomes = await Promise.all(
          cleanupClaims.map(async (claim) => {
            const outcome = await processClaimedStagingCleanup({
              prisma,
              workerId,
              claim,
            });
            log(
              outcome.outcome === 'CLEANED' ? 'info' : 'warn',
              'upload_scanner.staging_cleanup_finished',
              {
                uploadSessionId: claim.uploadSessionId,
                mediaObjectId: claim.mediaObjectId,
                attemptNumber: claim.attemptNumber,
                outcome: outcome.outcome,
                errorCode: outcome.errorCode,
                errorMessage: outcome.errorMessage,
              },
            );
            return outcome;
          }),
        );
        if (!scannerIdentity || Date.now() >= nextPreflightAt) {
          let scannerVersion: string;
          try {
            scannerVersion = await preflight();
          } catch (error) {
            await writeUploadScannerHeartbeat({
              prisma,
              workerId,
              status: 'ERROR',
              metadata: {
                command: config.command,
                error: error instanceof Error ? error.message.slice(0, 500) : 'Unknown error',
              },
            }).catch(() => undefined);
            throw error;
          }
          scannerIdentity = `clamav:${scannerVersion}`.slice(0, 120);
          nextPreflightAt = Date.now() + preflightIntervalMs;
          await writeUploadScannerHeartbeat({
            prisma,
            workerId,
            status: 'READY',
            version: scannerIdentity,
            metadata: { command: config.command },
          });
          if (!heartbeatTimer) {
            heartbeatTimer = setInterval(() => {
              if (heartbeatWriteInFlight || !scannerIdentity) {
                return;
              }
              heartbeatWriteInFlight = true;
              void writeUploadScannerHeartbeat({
                prisma,
                workerId,
                status: 'READY',
                version: scannerIdentity,
                metadata: { command: config.command },
              })
                .catch((error) => {
                  log('error', 'upload_scanner.heartbeat_failed', {
                    error:
                      error instanceof Error ? error.message : 'Unknown heartbeat failure',
                  });
                })
                .finally(() => {
                  heartbeatWriteInFlight = false;
                });
            }, HEARTBEAT_INTERVAL_MS);
            heartbeatTimer.unref();
          }
          log('info', 'upload_scanner.preflight_passed', {
            scannerIdentity,
            nextPreflightAt: new Date(nextPreflightAt).toISOString(),
          });
        }
        if (!scannerIdentity) {
          throw new Error('Upload scanner preflight did not provide a scanner identity');
        }
        const currentScannerIdentity = scannerIdentity;
        const claims = await claimPendingUploadScans({
          prisma,
          workerId,
          limit: options.uploadSessionId ? 1 : config.batchSize,
          leaseMs: config.leaseMs,
          maxAttempts: config.maxAttempts,
          uploadSessionId: options.uploadSessionId,
        });
        if (claims.length === 0) {
          if (options.once) {
            if (cleanupClaims.length === 0) {
              log('info', 'upload_scanner.no_claimable_uploads');
            }
            if (cleanupOutcomes.some((outcome) => outcome.outcome === 'RETRY')) {
              process.exitCode = 1;
            }
            break;
          }
          await waitForAbortableDelay(config.pollIntervalMs, stopController.signal);
          continue;
        }

        const dependencies = createProductionScanDependencies({
          prisma,
          workerId,
          config,
        });
        const outcomes = await Promise.all(
          claims.map(async (claim) => {
            try {
              const result = await processClaimedUploadScan({
                claim,
                config,
                scannerIdentity: currentScannerIdentity,
                dependencies,
              });
              log(
                result.outcome === 'CLEAN' && !result.cleanupErrorCode ? 'info' : 'warn',
                'upload_scanner.scan_finished',
                {
                  uploadSessionId: result.uploadSessionId,
                  mediaObjectId: result.mediaObjectId,
                  outcome: result.outcome,
                  errorCode: result.errorCode,
                  cleanupErrorCode: result.cleanupErrorCode,
                },
              );
              return result;
            } catch (error) {
              await releaseAfterUnexpectedFailure({
                prisma,
                workerId,
                claim,
                maxAttempts: config.maxAttempts,
              }).catch((releaseError) => {
                log('error', 'upload_scanner.release_failed', {
                  uploadSessionId: claim.uploadSessionId,
                  error:
                    releaseError instanceof Error
                      ? releaseError.message
                      : 'Unknown claim release error',
                });
              });
              log('error', 'upload_scanner.scan_failed', {
                uploadSessionId: claim.uploadSessionId,
                mediaObjectId: claim.mediaObjectId,
                error: error instanceof Error ? error.message : 'Unknown scanner worker error',
              });
              return null;
            }
          }),
        );

        if (options.once) {
          if (options.uploadSessionId && outcomes.every((outcome) => outcome === null)) {
            process.exitCode = 1;
          }
          break;
        }
      } catch (error) {
        if (!isRecoverableUploadScannerDatabaseError(error)) {
          throw error;
        }
        const nextFailureCount = databaseFailureCount + 1;
        if (options.once && nextFailureCount > ONCE_DATABASE_RETRY_LIMIT) {
          throw error;
        }
        databaseFailureCount = nextFailureCount;
        const retryInMs = uploadScannerDatabaseRetryDelayMs(
          databaseFailureCount,
          config.pollIntervalMs,
        );
        log('warn', 'upload_scanner.database_unavailable', {
          consecutiveFailures: databaseFailureCount,
          retryInMs,
          error: error instanceof Error ? error.message.slice(0, 500) : 'Unknown database error',
        });
        await waitForAbortableDelay(retryInMs, stopController.signal);
      }
    } while (!stopController.signal.aborted);
  } finally {
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
    }
    await removeUploadScannerHeartbeat({ prisma, workerId }).catch((error) => {
      log('warn', 'upload_scanner.heartbeat_remove_failed', {
        error: error instanceof Error ? error.message : 'Unknown heartbeat removal failure',
      });
    });
    await prisma.$disconnect();
    log('info', 'upload_scanner.stopped');
  }
}

void main().catch(async (error) => {
  log('error', 'upload_scanner.fatal', {
    error: error instanceof Error ? error.message : 'Unknown scanner worker failure',
  });
  captureException(error);
  await flush(2_000);
  process.exitCode = 1;
});
