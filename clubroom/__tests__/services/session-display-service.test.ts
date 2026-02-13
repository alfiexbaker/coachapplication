/**
 * Session Display Service Tests
 *
 * Pure synchronous formatting helpers for group sessions.
 */

import assert from 'node:assert/strict';
import test, { describe } from 'node:test';

import { sessionDisplayService } from '../../services/group-session/session-display-service';

describe('sessionDisplayService', () => {
  describe('formatPrice', () => {
    test('returns Free for zero amount', () => {
      assert.equal(sessionDisplayService.formatPrice(0), 'Free');
    });

    test('formats non-zero price in GBP by default', () => {
      const result = sessionDisplayService.formatPrice(15);
      assert.ok(result.includes('15'));
    });

    test('formats with explicit GBP currency', () => {
      const result = sessionDisplayService.formatPrice(20, 'GBP');
      assert.ok(result.includes('20'));
    });
  });

  describe('formatSessionType', () => {
    test('formats TRAINING type', () => {
      assert.equal(sessionDisplayService.formatSessionType('TRAINING'), 'Training');
    });

    test('formats CAMP type', () => {
      assert.equal(sessionDisplayService.formatSessionType('CAMP'), 'Camp');
    });

    test('formats CLINIC type', () => {
      assert.equal(sessionDisplayService.formatSessionType('CLINIC'), 'Clinic');
    });

    test('formats OPEN_SESSION type', () => {
      assert.equal(sessionDisplayService.formatSessionType('OPEN_SESSION'), 'Open Session');
    });
  });
});
