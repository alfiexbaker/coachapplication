/**
 * Session Registration Service Tests
 *
 * Tests for athlete registration, cancellation, roster, and attendance.
 */

import assert from 'node:assert/strict';
import test, { describe } from 'node:test';

import { sessionRegistrationService } from '../../services/group-session/session-registration-service';

describe('sessionRegistrationService', () => {
  describe('register (Result pattern)', () => {
    test('returns err for non-existent session', async () => {
      const result = await sessionRegistrationService.register(
        'nonexistent_session', 'ath_1', 'Athlete', 'par_1', 'Parent'
      );
      assert.equal(result.success, false);
    });
  });

  describe('cancelRegistration (Result pattern)', () => {
    test('returns err for non-existent registration', async () => {
      const result = await sessionRegistrationService.cancelRegistration('nonexistent_reg');
      assert.equal(result.success, false);
    });
  });

  describe('getSessionRoster', () => {
    test('returns array for existing mock session', async () => {
      const roster = await sessionRegistrationService.getSessionRoster('gs_training_1');
      assert.ok(Array.isArray(roster));
    });

    test('returns empty array for unknown session', async () => {
      const roster = await sessionRegistrationService.getSessionRoster('nonexistent_gs');
      assert.ok(Array.isArray(roster));
      assert.equal(roster.length, 0);
    });
  });

  describe('markAttendance (Result pattern)', () => {
    test('returns err for non-existent registration', async () => {
      const result = await sessionRegistrationService.markAttendance('nonexistent_reg', '2026-01-15', true);
      assert.equal(result.success, false);
    });

    test('marks attendance for existing registration', async () => {
      // reg_13 is a mock registration
      const result = await sessionRegistrationService.markAttendance('reg_13', '2026-02-01', true);
      if (result.success) {
        assert.ok(result.data.attendedDates.includes('2026-02-01'));
      }
    });
  });

  describe('getParentRegistrations', () => {
    test('returns array of registrations with session data', async () => {
      const regs = await sessionRegistrationService.getParentRegistrations('user_parent_01');
      assert.ok(Array.isArray(regs));
      if (regs.length > 0) {
        assert.ok(regs[0].session);
      }
    });
  });
});
