import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { PrismaClient } from '@clubroom/db';
import {
  isUploadScannerReady,
  removeUploadScannerHeartbeat,
  writeUploadScannerHeartbeat,
} from '../../lib/upload-scanner-heartbeat.js';

describe('upload scanner heartbeat', () => {
  it('writes a bounded READY lease and removes its own worker row', async () => {
    const writes: Array<Record<string, unknown>> = [];
    const removals: Array<Record<string, unknown>> = [];
    const prisma = {
      runtimeWorkerHeartbeat: {
        upsert: async (input: Record<string, unknown>) => {
          writes.push(input);
          return input;
        },
        deleteMany: async (input: Record<string, unknown>) => {
          removals.push(input);
          return { count: 1 };
        },
        count: async () => 1,
      },
    } as unknown as PrismaClient;
    const now = new Date('2030-01-01T00:00:00.000Z');

    await writeUploadScannerHeartbeat({
      prisma,
      workerId: 'scanner:test',
      status: 'READY',
      version: 'clamav:test',
      now,
    });
    assert.equal(writes.length, 1);
    assert.equal(await isUploadScannerReady({ prisma, now }), true);
    await removeUploadScannerHeartbeat({ prisma, workerId: 'scanner:test' });
    assert.deepEqual(removals[0], { where: { id: 'scanner:test' } });
  });

  it('fails closed when no unexpired READY worker exists', async () => {
    const prisma = {
      runtimeWorkerHeartbeat: {
        count: async () => 0,
      },
    } as unknown as PrismaClient;
    assert.equal(await isUploadScannerReady({ prisma }), false);
  });
});
