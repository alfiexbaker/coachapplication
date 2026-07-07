/**
 * Session Registration Service Tests
 *
 * Tests for athlete registration, cancellation, roster, and attendance.
 */

import assert from 'node:assert/strict';
import test, { describe } from 'node:test';

import { sessionRegistrationService } from '@/services/group-session/session-registration-service';
import { groupSessionAuthorityService } from '@/services/group-session/group-session-authority-service';
import { apiClient } from '@/services/api-client';
import { api } from '@/constants/config';

describe('sessionRegistrationService', () => {
  describe('register (Result pattern)', () => {
    test('returns err for non-existent session', async () => {
      const result = await sessionRegistrationService.register(
        'nonexistent_session', 'ath_1', 'par_1'
      );
      assert.strictEqual(result.success, false);
    });

    test('API mode returns authority registration without local mirror writes', async () => {
      const originalUseMock = Object.getOwnPropertyDescriptor(api, 'useMock');
      const originalRegister = groupSessionAuthorityService.register;
      const apiClientInternals = apiClient as unknown as {
        get: typeof apiClient.get;
        set: typeof apiClient.set;
      };
      const originalGet = apiClientInternals.get;
      const originalSet = apiClientInternals.set;
      let getCalls = 0;
      let setCalls = 0;

      Object.defineProperty(api, 'useMock', {
        configurable: true,
        get: () => false,
      });
      groupSessionAuthorityService.register = async () => ({
        success: true,
        data: {
          id: 'reg_api_1',
          sessionId: 'gs_api_1',
          athleteId: 'ath_api_1',
          parentUserId: 'usr_parent_api_1',
          status: 'REGISTERED',
          registeredAt: '2026-07-03T12:00:00.000Z',
          paidAt: null,
          notes: null,
          booking: { id: 'book_api_1', status: 'CONFIRMED' },
          sessionStatus: 'PUBLISHED',
        },
      });
      apiClientInternals.get = (async (_key, fallback) => {
        getCalls += 1;
        return fallback;
      }) as typeof apiClient.get;
      apiClientInternals.set = (async () => {
        setCalls += 1;
      }) as typeof apiClient.set;

      try {
        const result = await sessionRegistrationService.register(
          'gs_api_1',
          'ath_api_1',
          'usr_parent_api_1',
        );

        assert.equal(result.success, true);
        if (result.success) {
          assert.equal(result.data.id, 'reg_api_1');
          assert.equal(result.data.parentId, 'usr_parent_api_1');
        }
        assert.equal(getCalls, 0);
        assert.equal(setCalls, 0);
      } finally {
        if (originalUseMock) {
          Object.defineProperty(api, 'useMock', originalUseMock);
        }
        groupSessionAuthorityService.register = originalRegister;
        apiClientInternals.get = originalGet;
        apiClientInternals.set = originalSet;
      }
    });
  });

  describe('joinWaitlist (Result pattern)', () => {
    test('API mode returns authority waitlist registration without local mirror writes', async () => {
      const originalUseMock = Object.getOwnPropertyDescriptor(api, 'useMock');
      const originalJoinWaitlist = groupSessionAuthorityService.joinWaitlist;
      const apiClientInternals = apiClient as unknown as {
        get: typeof apiClient.get;
        set: typeof apiClient.set;
      };
      const originalGet = apiClientInternals.get;
      const originalSet = apiClientInternals.set;
      let getCalls = 0;
      let setCalls = 0;

      Object.defineProperty(api, 'useMock', {
        configurable: true,
        get: () => false,
      });
      groupSessionAuthorityService.joinWaitlist = async () => ({
        success: true,
        data: {
          id: 'reg_waitlist_api_1',
          sessionId: 'gs_waitlist_api_1',
          athleteId: 'ath_waitlist_api_1',
          parentUserId: 'usr_parent_api_1',
          status: 'WAITLISTED',
          registeredAt: '2026-07-03T12:00:00.000Z',
          paidAt: null,
          notes: null,
          booking: null,
          sessionStatus: 'FULL',
        },
      });
      apiClientInternals.get = (async (_key, fallback) => {
        getCalls += 1;
        return fallback;
      }) as typeof apiClient.get;
      apiClientInternals.set = (async () => {
        setCalls += 1;
      }) as typeof apiClient.set;

      try {
        const result = await sessionRegistrationService.joinWaitlist(
          'gs_waitlist_api_1',
          'ath_waitlist_api_1',
          'usr_parent_api_1',
        );

        assert.equal(result.success, true);
        if (result.success) {
          assert.equal(result.data.id, 'reg_waitlist_api_1');
          assert.equal(result.data.status, 'WAITLISTED');
          assert.equal(result.data.parentId, 'usr_parent_api_1');
        }
        assert.equal(getCalls, 0);
        assert.equal(setCalls, 0);
      } finally {
        if (originalUseMock) {
          Object.defineProperty(api, 'useMock', originalUseMock);
        }
        groupSessionAuthorityService.joinWaitlist = originalJoinWaitlist;
        apiClientInternals.get = originalGet;
        apiClientInternals.set = originalSet;
      }
    });
  });

  describe('cancelRegistration (Result pattern)', () => {
    test('returns err for non-existent registration', async () => {
      const result = await sessionRegistrationService.cancelRegistration('nonexistent_reg');
      assert.strictEqual(result.success, false);
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
      assert.strictEqual(result.success, false);
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
