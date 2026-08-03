import { err, ok, serviceError, type Result, type ServiceError } from '@/types/result';

export interface ApiUploadCompleteResponse {
  uploadSessionId: string;
  mediaObjectId: string;
  mediaStatus: 'UPLOADED_UNSCANNED' | 'AVAILABLE';
  scanVerdict: 'PENDING' | 'ERROR' | 'CLEAN';
  pending: boolean;
  retryAfterMs: number | null;
}

export interface ApiUploadStatusResponse {
  uploadSessionId: string;
  mediaObjectId: string;
  uploadStatus: string;
  mediaStatus: string;
  scanVerdict: 'PENDING' | 'ERROR' | 'CLEAN' | 'INFECTED';
  pending: boolean;
  readyToComplete: boolean;
  retryAfterMs: number | null;
  errorCode: string | null;
}

interface UploadCompletionInput {
  uploadSessionId: string;
  mediaObjectId: string;
  sha256Hex?: string;
}

// Keep the client wait longer than the default 47-minute worker lease so a
// valid in-flight scan cannot be misreported as failed.
const MAX_SCAN_WAIT_MS = 60 * 60_000;

function invalidCompletionState(message: string): Result<never, ServiceError> {
  return err(serviceError('UNKNOWN', message));
}

function scanWaitExpired(input: UploadCompletionInput): Result<never, ServiceError> {
  return err(
    serviceError(
      'UNKNOWN',
      'Upload security review is still processing. The uploaded file remains queued.',
      {
        uploadSessionId: input.uploadSessionId,
        mediaObjectId: input.mediaObjectId,
        pending: true,
      },
    ),
  );
}

function uploadScanRejected(
  input: UploadCompletionInput,
  status: ApiUploadStatusResponse,
): Result<never, ServiceError> {
  return err(
    serviceError('VALIDATION', 'The uploaded file did not pass security review.', {
      uploadSessionId: input.uploadSessionId,
      mediaObjectId: input.mediaObjectId,
      uploadStatus: status.uploadStatus,
      mediaStatus: status.mediaStatus,
      scanVerdict: status.scanVerdict,
      errorCode: status.errorCode,
    }),
  );
}

export async function waitForUploadScanCompletion(
  input: UploadCompletionInput,
  options: {
    maxWaitMs?: number;
    now?: () => number;
    sleep?: (ms: number) => Promise<void>;
    complete?: (
      input: UploadCompletionInput,
    ) => Promise<Result<ApiUploadCompleteResponse, ServiceError>>;
    status?: (
      input: UploadCompletionInput,
    ) => Promise<Result<ApiUploadStatusResponse, ServiceError>>;
  } = {},
): Promise<Result<ApiUploadCompleteResponse, ServiceError>> {
  const now = options.now ?? Date.now;
  const sleep =
    options.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  const complete =
    options.complete ??
    (async (request: UploadCompletionInput) => {
      const { apiFetch } = await import('@/services/api-client');
      return apiFetch<ApiUploadCompleteResponse>(
        `/v1/uploads/${encodeURIComponent(request.uploadSessionId)}/complete`,
        {
          method: 'POST',
          body: JSON.stringify({
            mediaObjectId: request.mediaObjectId,
            ...(request.sha256Hex ? { sha256Hex: request.sha256Hex } : {}),
          }),
        },
      );
    });
  const status =
    options.status ??
    (async (request: UploadCompletionInput) => {
      const { apiFetch } = await import('@/services/api-client');
      return apiFetch<ApiUploadStatusResponse>(
        `/v1/uploads/${encodeURIComponent(request.uploadSessionId)}`,
      );
    });
  const startedAt = now();
  const maxWaitMs = Math.max(0, options.maxWaitMs ?? MAX_SCAN_WAIT_MS);
  let transientFailureCount = 0;
  let pendingCompletion: ApiUploadCompleteResponse | undefined;

  while (true) {
    if (!pendingCompletion) {
      const result = await complete(input);
      if (!result.success) {
        if (!['NETWORK', 'RATE_LIMITED'].includes(result.error.code)) {
          return result;
        }
        const elapsedMs = now() - startedAt;
        if (elapsedMs >= maxWaitMs) {
          return scanWaitExpired(input);
        }
        transientFailureCount += 1;
        const retryDelayMs = Math.min(1000 * 2 ** (transientFailureCount - 1), 10_000);
        await sleep(Math.min(retryDelayMs, maxWaitMs - elapsedMs));
        continue;
      }
      transientFailureCount = 0;
      const completion = result.data;
      if (
        completion.uploadSessionId !== input.uploadSessionId ||
        completion.mediaObjectId !== input.mediaObjectId
      ) {
        return invalidCompletionState('Upload completion returned the wrong upload identity');
      }
      if (!completion.pending) {
        return completion.mediaStatus === 'AVAILABLE' && completion.scanVerdict === 'CLEAN'
          ? result
          : invalidCompletionState('Upload completion returned an invalid terminal scan state');
      }
      if (
        completion.mediaStatus !== 'UPLOADED_UNSCANNED' ||
        !['PENDING', 'ERROR'].includes(completion.scanVerdict)
      ) {
        return invalidCompletionState('Upload completion returned an invalid pending scan state');
      }
      pendingCompletion = completion;
    }

    const elapsedMs = now() - startedAt;
    if (elapsedMs >= maxWaitMs) {
      return scanWaitExpired(input);
    }
    const initialRetryAfterMs = pendingCompletion.retryAfterMs;
    const retryAfterMs =
      typeof initialRetryAfterMs === 'number' && Number.isFinite(initialRetryAfterMs)
        ? initialRetryAfterMs
        : 5000;
    await sleep(Math.min(Math.max(retryAfterMs, 1000), 10_000, maxWaitMs - elapsedMs));

    const observed = await status(input);
    if (!observed.success) {
      if (!['NETWORK', 'RATE_LIMITED'].includes(observed.error.code)) {
        return observed;
      }
      transientFailureCount += 1;
      pendingCompletion = {
        ...pendingCompletion,
        retryAfterMs: Math.min(1000 * 2 ** (transientFailureCount - 1), 10_000),
      };
      continue;
    }
    transientFailureCount = 0;
    const uploadStatus = observed.data;
    if (
      uploadStatus.uploadSessionId !== input.uploadSessionId ||
      uploadStatus.mediaObjectId !== input.mediaObjectId
    ) {
      return invalidCompletionState('Upload status returned the wrong upload identity');
    }
    if (
      uploadStatus.mediaStatus === 'AVAILABLE' &&
      uploadStatus.scanVerdict === 'CLEAN' &&
      !uploadStatus.pending
    ) {
      return ok({
        uploadSessionId: uploadStatus.uploadSessionId,
        mediaObjectId: uploadStatus.mediaObjectId,
        mediaStatus: 'AVAILABLE',
        scanVerdict: 'CLEAN',
        pending: false,
        retryAfterMs: null,
      });
    }
    if (uploadStatus.readyToComplete && uploadStatus.scanVerdict === 'CLEAN') {
      pendingCompletion = undefined;
      continue;
    }
    if (!uploadStatus.pending) {
      return uploadScanRejected(input, uploadStatus);
    }
    pendingCompletion = {
      ...pendingCompletion,
      retryAfterMs: uploadStatus.retryAfterMs,
    };
  }
}
