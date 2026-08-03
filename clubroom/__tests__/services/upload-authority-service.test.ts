import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';

import {
  waitForUploadScanCompletion,
  type ApiUploadCompleteResponse,
  type ApiUploadStatusResponse,
} from '@/services/upload-authority-service';
import { err, ok, serviceError } from '@/types/result';

const upload = {
  uploadSessionId: 'ups_test',
  mediaObjectId: 'med_test',
};

describe('upload authority service', () => {
  it('does not fabricate byte sizes for API uploads', () => {
    for (const file of [
      'services/media-service.ts',
      'services/verification-service.ts',
      'services/video-service.ts',
    ]) {
      const source = fs.readFileSync(path.join(process.cwd(), file), 'utf8');
      assert.match(source, /file size could not be determined/i);
    }
    const videoSource = fs.readFileSync(
      path.join(process.cwd(), 'services/video-service.ts'),
      'utf8',
    );
    assert.equal(videoSource.includes('sizeBytes: Math.max(1, fileSize)'), false);
    assert.equal(
      videoSource.includes('Number.isSafeInteger(providedSize) && providedSize > 0'),
      false,
    );
    const verificationSource = fs.readFileSync(
      path.join(process.cwd(), 'services/verification-service.ts'),
      'utf8',
    );
    assert.equal(verificationSource.includes('return input.sizeBytes as number'), false);
  });

  it('waits for the API scan authority before returning available media', async () => {
    const completions: ApiUploadCompleteResponse[] = [
      {
        ...upload,
        mediaStatus: 'UPLOADED_UNSCANNED',
        scanVerdict: 'PENDING',
        pending: true,
        retryAfterMs: 1,
      },
      {
        ...upload,
        mediaStatus: 'AVAILABLE',
        scanVerdict: 'CLEAN',
        pending: false,
        retryAfterMs: null,
      },
    ];
    const statuses: ApiUploadStatusResponse[] = [
      {
        ...upload,
        uploadStatus: 'SCANNING',
        mediaStatus: 'UPLOADED_UNSCANNED',
        scanVerdict: 'PENDING',
        pending: true,
        readyToComplete: false,
        retryAfterMs: 1,
        errorCode: null,
      },
      {
        ...upload,
        uploadStatus: 'SCAN_CLEAN',
        mediaStatus: 'UPLOADED_UNSCANNED',
        scanVerdict: 'CLEAN',
        pending: false,
        readyToComplete: true,
        retryAfterMs: null,
        errorCode: null,
      },
    ];
    const waits: number[] = [];

    const result = await waitForUploadScanCompletion(upload, {
      complete: async () => ok(completions.shift() as ApiUploadCompleteResponse),
      status: async () => ok(statuses.shift() as ApiUploadStatusResponse),
      sleep: async (ms) => {
        waits.push(ms);
      },
    });

    assert.equal(result.success, true);
    assert.equal(result.data?.scanVerdict, 'CLEAN');
    assert.deepEqual(waits, [1000, 1000]);
  });

  it('fails closed on invalid authority state and bounded timeout', async () => {
    const invalid = await waitForUploadScanCompletion(upload, {
      complete: async () =>
        ok({
          ...upload,
          mediaStatus: 'AVAILABLE',
          scanVerdict: 'PENDING',
          pending: false,
          retryAfterMs: null,
        }),
    });
    assert.equal(invalid.success, false);

    const timedOut = await waitForUploadScanCompletion(upload, {
      maxWaitMs: 0,
      complete: async () =>
        ok({
          ...upload,
          mediaStatus: 'UPLOADED_UNSCANNED',
          scanVerdict: 'PENDING',
          pending: true,
          retryAfterMs: 1000,
        }),
      status: async () => assert.fail('zero wait must not poll upload status'),
    });
    assert.equal(timedOut.success, false);
    assert.match(timedOut.error?.message ?? '', /still processing/i);
    assert.deepEqual(timedOut.error?.details, {
      uploadSessionId: upload.uploadSessionId,
      mediaObjectId: upload.mediaObjectId,
      pending: true,
    });
  });

  it('retries transient transport failures but not authority failures', async () => {
    const responses = [
      err(serviceError('NETWORK', 'offline')),
      err(serviceError('RATE_LIMITED', 'slow down')),
      ok<ApiUploadCompleteResponse>({
        ...upload,
        mediaStatus: 'AVAILABLE',
        scanVerdict: 'CLEAN',
        pending: false,
        retryAfterMs: null,
      }),
    ];
    const waits: number[] = [];
    const recovered = await waitForUploadScanCompletion(upload, {
      complete: async () => responses.shift() as (typeof responses)[number],
      status: async () => assert.fail('completed upload must not poll status'),
      sleep: async (ms) => {
        waits.push(ms);
      },
    });
    assert.equal(recovered.success, true);
    assert.deepEqual(waits, [1000, 2000]);

    const denied = await waitForUploadScanCompletion(upload, {
      complete: async () => err(serviceError('UNAUTHORIZED', 'denied')),
      status: async () => assert.fail('denied handoff must not poll status'),
      sleep: async () => {
        assert.fail('terminal authority failures must not be retried');
      },
    });
    assert.equal(denied.success, false);
    assert.equal(denied.error?.code, 'UNAUTHORIZED');
  });

  it('preserves terminal scanner failure details from the read-only status route', async () => {
    const result = await waitForUploadScanCompletion(upload, {
      complete: async () =>
        ok({
          ...upload,
          mediaStatus: 'UPLOADED_UNSCANNED',
          scanVerdict: 'PENDING',
          pending: true,
          retryAfterMs: 1,
        }),
      status: async () =>
        ok({
          ...upload,
          uploadStatus: 'REJECTED',
          mediaStatus: 'REJECTED',
          scanVerdict: 'ERROR',
          pending: false,
          readyToComplete: false,
          retryAfterMs: null,
          errorCode: 'FILE_TYPE_MISMATCH',
        }),
      sleep: async () => {},
    });

    assert.equal(result.success, false);
    assert.equal(result.error?.code, 'VALIDATION');
    assert.deepEqual(result.error?.details, {
      uploadSessionId: upload.uploadSessionId,
      mediaObjectId: upload.mediaObjectId,
      uploadStatus: 'REJECTED',
      mediaStatus: 'REJECTED',
      scanVerdict: 'ERROR',
      errorCode: 'FILE_TYPE_MISMATCH',
    });
  });
});
