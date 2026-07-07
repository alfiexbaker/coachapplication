import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { beforeEach, describe, it } from 'node:test';

import { recordAuditEvent, recordSecurityEvent } from './audit-runtime.js';
import {
  getMarketplaceSeedStore,
  resetMarketplaceSeedStoreForTests,
} from './marketplace-seed-store.js';

type SeedRow = Record<string, unknown>;
type AuditableRequest = NonNullable<Parameters<typeof recordAuditEvent>[0]['request']>;
type SpoofedAuditableRequest = AuditableRequest & {
  headers: {
    'x-forwarded-for': string;
  };
};

const asRows = (value: unknown): SeedRow[] => (Array.isArray(value) ? (value as SeedRow[]) : []);

function sha256(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function requestWithResolvedIp(params: {
  requestId: string;
  ip: string;
  forwardedFor: string;
}): SpoofedAuditableRequest {
  return {
    auth: {
      userId: 'usr_audit_security',
      roles: ['admin'],
      actingRole: 'admin',
      sessionId: 'ses_audit_security',
    },
    headers: {
      'x-forwarded-for': params.forwardedFor,
    },
    ip: params.ip,
    requestId: params.requestId,
  };
}

describe('audit runtime IP hashing', () => {
  beforeEach(() => {
    resetMarketplaceSeedStoreForTests();
  });

  it('hashes Fastify request.ip instead of spoofable forwarded headers', async () => {
    await recordAuditEvent({
      request: requestWithResolvedIp({
        requestId: 'req_audit_spoofed_forwarded',
        ip: '127.0.0.1',
        forwardedFor: '203.0.113.100, 10.0.0.1',
      }),
      action: 'audit.ip.test',
      resourceType: 'test',
      resourceId: 'audit_ip',
      result: 'SUCCESS',
    });

    const auditEvent = asRows(getMarketplaceSeedStore().tables.auditEvents).find(
      (row) => row.requestId === 'req_audit_spoofed_forwarded',
    );

    assert.equal(auditEvent?.ipHash, sha256('127.0.0.1'));
    assert.notEqual(auditEvent?.ipHash, sha256('203.0.113.100'));
  });

  it('uses trusted proxy client IP only after Fastify resolves request.ip', async () => {
    await recordSecurityEvent({
      request: requestWithResolvedIp({
        requestId: 'req_audit_trusted_proxy',
        ip: '203.0.113.25',
        forwardedFor: '198.51.100.200, 10.0.0.1',
      }),
      eventType: 'audit.ip.trusted-proxy-test',
      severity: 'low',
      message: 'test',
    });

    const securityEvent = asRows(getMarketplaceSeedStore().tables.securityEvents).find(
      (row) => row.requestId === 'req_audit_trusted_proxy',
    );
    const metadata = securityEvent?.metadataJson as { ipHash?: unknown } | undefined;

    assert.equal(metadata?.ipHash, sha256('203.0.113.25'));
    assert.notEqual(metadata?.ipHash, sha256('198.51.100.200'));
  });
});
