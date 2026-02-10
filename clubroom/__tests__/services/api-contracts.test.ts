/**
 * API Contracts Tests
 *
 * Tests for API_CONFIG constants and SERVICE_MIGRATION_STATUS
 * to ensure contract definitions remain consistent.
 */

import assert from 'node:assert/strict';
import test, { describe } from 'node:test';

import { API_CONFIG, SERVICE_MIGRATION_STATUS } from '../../services/api-contracts';

describe('API Contracts', () => {
  // ---------------------------------------------------------------------------
  // API_CONFIG
  // ---------------------------------------------------------------------------

  describe('API_CONFIG', () => {
    test('has baseUrl, version, and timeout', () => {
      assert.ok(API_CONFIG.baseUrl, 'baseUrl should be defined');
      assert.equal(typeof API_CONFIG.baseUrl, 'string');
      assert.equal(API_CONFIG.version, 'v1');
      assert.equal(API_CONFIG.timeout, 30000);
    });

    test('baseUrl is a valid URL format', () => {
      assert.ok(
        API_CONFIG.baseUrl.startsWith('http'),
        `baseUrl should start with http, got: ${API_CONFIG.baseUrl}`
      );
    });
  });

  // ---------------------------------------------------------------------------
  // SERVICE_MIGRATION_STATUS
  // ---------------------------------------------------------------------------

  describe('SERVICE_MIGRATION_STATUS', () => {
    test('has entries for core services', () => {
      assert.ok(SERVICE_MIGRATION_STATUS['availability-service']);
      assert.ok(SERVICE_MIGRATION_STATUS['booking-service']);
      assert.ok(SERVICE_MIGRATION_STATUS['invite-service']);
      assert.ok(SERVICE_MIGRATION_STATUS['family-service']);
      assert.ok(SERVICE_MIGRATION_STATUS['wallet-service']);
      assert.ok(SERVICE_MIGRATION_STATUS['earnings-service']);
    });

    test('high priority services are READY', () => {
      const highPriority = [
        'availability-service',
        'booking-service',
        'invite-service',
        'family-service',
        'wallet-service',
        'earnings-service',
      ] as const;

      for (const svc of highPriority) {
        assert.equal(
          SERVICE_MIGRATION_STATUS[svc].status,
          'READY',
          `${svc} should be READY`
        );
      }
    });

    test('every entry has status and endpoints count', () => {
      const entries = Object.entries(SERVICE_MIGRATION_STATUS);
      assert.ok(entries.length >= 10, `Expected at least 10 services, got ${entries.length}`);

      for (const [name, info] of entries) {
        assert.ok(
          info.status === 'READY' || info.status === 'PARTIAL',
          `${name} should have status READY or PARTIAL, got: ${info.status}`
        );
        assert.equal(typeof info.endpoints, 'number', `${name} should have numeric endpoints`);
        assert.ok(info.endpoints > 0, `${name} should have at least 1 endpoint`);
      }
    });

    test('total endpoint count is reasonable', () => {
      const totalEndpoints = Object.values(SERVICE_MIGRATION_STATUS).reduce(
        (sum, svc) => sum + svc.endpoints,
        0
      );
      assert.ok(
        totalEndpoints >= 40,
        `Expected at least 40 total endpoints, got ${totalEndpoints}`
      );
    });
  });
});
