/**
 * Concern Service Tests
 *
 * Tests for athlete concerns: raiseConcern, getForAthlete,
 * getOpenConcerns, resolveConcern, updateStatus, color helpers.
 * ConcernService extends BaseService<AthleteConcern>.
 */

import assert from 'node:assert/strict';
import test, { describe, beforeEach } from 'node:test';

import { concernService } from '../../services/concern-service';
import { apiClient } from '../../services/api-client';
import { authService, type UserProfile } from '../../services/auth-service';
import { eventBus, onTyped, ServiceEvents } from '../../services/event-bus';

const rid = () => Math.random().toString(36).slice(2, 10);

function makeConcernInput(overrides: Record<string, unknown> = {}) {
  return {
    coachId: `coach_${rid()}`,
    athleteId: `ath_${rid()}`,
    athleteName: 'Test Athlete',
    type: 'BEHAVIORAL' as const,
    severity: 'MEDIUM' as const,
    title: 'Test Concern',
    description: 'Detailed description of the concern',
    ...overrides,
  };
}

describe('concernService', () => {
  beforeEach(async () => {
    await apiClient.remove('clubroom.concerns');
    eventBus.clearAll();
  });

  // ---------------------------------------------------------------------------
  // raiseConcern
  // ---------------------------------------------------------------------------
  describe('raiseConcern', () => {
    test('creates a concern and returns ok', async () => {
      const result = await concernService.raiseConcern(makeConcernInput());
      assert.equal(result.success, true);
      if (result.success) {
        assert.ok(result.data.id);
        assert.equal(result.data.status, 'OPEN');
        assert.equal(result.data.title, 'Test Concern');
      }
    });

    test('emits CONCERN_RAISED event', async () => {
      let emitted = false;
      eventBus.on(ServiceEvents.CONCERN_RAISED, () => { emitted = true; });

      await concernService.raiseConcern(makeConcernInput());
      assert.equal(emitted, true);
    });

    test('returns err for empty title', async () => {
      const result = await concernService.raiseConcern(makeConcernInput({ title: '  ' }));
      assert.strictEqual(result.success, false);
    });

    test('returns err for empty description', async () => {
      const result = await concernService.raiseConcern(makeConcernInput({ description: '' }));
      assert.strictEqual(result.success, false);
    });

    test('API mode writes concern authority through safeguarding API without local mirror writes', async () => {
      const originalIsMockMode = Object.getOwnPropertyDescriptor(apiClient, 'isMockMode');
      const originalFetch = globalThis.fetch;
      const originalGetCurrentUser = authService.getCurrentUser;
      const apiClientInternals = apiClient as unknown as { set: typeof apiClient.set };
      const originalSet = apiClientInternals.set;
      const fetchUrls: string[] = [];
      let setCalls = 0;
      const apiCoachUser: UserProfile = {
        id: 'coach_api_concern_1',
        email: 'coach.concern@example.com',
        accountType: 'COACH',
        appRole: 'COACH',
        firstName: 'Coach',
        lastName: 'Concern',
        isVerified: true,
        onboardingComplete: true,
        createdAt: '2026-07-03T12:00:00.000Z',
        updatedAt: '2026-07-03T12:00:00.000Z',
      };

      Object.defineProperty(apiClient, 'isMockMode', {
        configurable: true,
        get: () => false,
      });
      authService.getCurrentUser = async () => apiCoachUser;
      apiClientInternals.set = async () => {
        setCalls += 1;
      };
      globalThis.fetch = (async (input) => {
        fetchUrls.push(String(input));
        return new Response(
          JSON.stringify({
            id: 'inc_api_concern_1',
            athleteId: 'ath_api_concern_1',
            category: 'session_conduct',
            severity: 'medium',
            status: 'open',
            summary: 'API concern',
            details: 'Concern details',
            reportedByUserId: 'usr_coach_api_concern_1',
            actions: [],
            createdAt: '2026-07-03T12:00:00.000Z',
            updatedAt: '2026-07-03T12:00:00.000Z',
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        );
      }) as typeof fetch;

      try {
        const result = await concernService.raiseConcern(
          makeConcernInput({
            athleteId: 'ath_api_concern_1',
            title: 'API concern',
            description: 'Concern details',
          }),
        );

        assert.equal(result.success, true);
        assert.match(fetchUrls[0], /\/v1\/safeguarding\/incidents$/);
        assert.equal(setCalls, 0);
      } finally {
        if (originalIsMockMode) {
          Object.defineProperty(apiClient, 'isMockMode', originalIsMockMode);
        }
        authService.getCurrentUser = originalGetCurrentUser;
        apiClientInternals.set = originalSet;
        globalThis.fetch = originalFetch;
      }
    });

    test('API mode fails closed when required auto-escalation action fails', async () => {
      const originalIsMockMode = Object.getOwnPropertyDescriptor(apiClient, 'isMockMode');
      const originalFetch = globalThis.fetch;
      const originalGetCurrentUser = authService.getCurrentUser;
      const fetchCalls: Array<{ method: string; url: string }> = [];
      let raisedEvents = 0;
      const apiCoachUser: UserProfile = {
        id: 'coach_api_concern_escalation',
        email: 'coach.escalation@example.com',
        accountType: 'COACH',
        appRole: 'COACH',
        firstName: 'Coach',
        lastName: 'Escalation',
        isVerified: true,
        onboardingComplete: true,
        createdAt: '2026-07-03T12:00:00.000Z',
        updatedAt: '2026-07-03T12:00:00.000Z',
      };

      Object.defineProperty(apiClient, 'isMockMode', {
        configurable: true,
        get: () => false,
      });
      authService.getCurrentUser = async () => apiCoachUser;
      eventBus.on(ServiceEvents.CONCERN_RAISED, () => {
        raisedEvents += 1;
      });
      globalThis.fetch = (async (input, init) => {
        const url = String(input);
        const method = init?.method ?? 'GET';
        fetchCalls.push({ method, url });

        if (method === 'POST' && url.endsWith('/v1/safeguarding/incidents')) {
          return new Response(
            JSON.stringify({
              id: 'inc_api_concern_escalation',
              athleteId: 'ath_api_concern_escalation',
              bookingId: null,
              category: 'session_conduct',
              severity: 'high',
              status: 'open',
              summary: 'Escalation concern',
              details: 'Escalation details',
              reportedByUserId: 'usr_coach_api_concern_escalation',
              actions: [],
              createdAt: '2026-07-03T12:00:00.000Z',
              updatedAt: '2026-07-03T12:00:00.000Z',
            }),
            {
              status: 201,
              headers: { 'Content-Type': 'application/json' },
            },
          );
        }

        if (
          method === 'POST' &&
          url.includes('/v1/safeguarding/incidents/inc_api_concern_escalation/actions')
        ) {
          return new Response(JSON.stringify({ message: 'escalation action unavailable' }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        return new Response(JSON.stringify({ message: `Unexpected request ${method} ${url}` }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }) as typeof fetch;

      try {
        const result = await concernService.raiseConcern(
          makeConcernInput({
            athleteId: 'ath_api_concern_escalation',
            type: 'SAFEGUARDING',
            severity: 'HIGH',
            title: 'Escalation concern',
            description: 'Escalation details',
          }),
        );

        assert.equal(result.success, false);
        if (!result.success) {
          assert.match(result.error.message, /escalation action unavailable/);
        }
        assert.equal(
          fetchCalls.some(
            (call) =>
              call.method === 'POST' &&
              call.url.includes('/v1/safeguarding/incidents/inc_api_concern_escalation/actions'),
          ),
          true,
        );
        assert.equal(raisedEvents, 0);
      } finally {
        if (originalIsMockMode) {
          Object.defineProperty(apiClient, 'isMockMode', originalIsMockMode);
        }
        authService.getCurrentUser = originalGetCurrentUser;
        globalThis.fetch = originalFetch;
      }
    });
  });

  // ---------------------------------------------------------------------------
  // getForAthlete
  // ---------------------------------------------------------------------------
  describe('getForAthlete', () => {
    test('returns concerns for specific athlete', async () => {
      const coachId = `coach_${rid()}`;
      const athleteId = `ath_${rid()}`;

      await concernService.raiseConcern(makeConcernInput({ coachId, athleteId }));
      await concernService.raiseConcern(makeConcernInput({ coachId, athleteId: `other_${rid()}` }));

      const result = await concernService.getForAthlete(coachId, athleteId);
      assert.equal(result.success, true);
      if (result.success) {
        assert.equal(result.data.length, 1);
        assert.equal(result.data[0].athleteId, athleteId);
      }
    });

    test('API mode lists and updates concerns through safeguarding API without local storage', async () => {
      const originalIsMockMode = Object.getOwnPropertyDescriptor(apiClient, 'isMockMode');
      const originalFetch = globalThis.fetch;
      const originalGetCurrentUser = authService.getCurrentUser;
      const apiClientInternals = apiClient as unknown as { get: typeof apiClient.get };
      const originalGet = apiClientInternals.get;
      const fetchCalls: Array<{ method: string; url: string }> = [];
      let getCalls = 0;
      let incidentStatus: 'open' | 'in_review' | 'closed' = 'open';
      const actions: Array<{
        id: string;
        incidentId: string;
        actionType: string;
        notes: string;
        performedByUserId: string;
        createdAt: string;
      }> = [];
      const apiCoachUser: UserProfile = {
        id: 'coach_api_concern_1',
        email: 'coach.concern@example.com',
        accountType: 'COACH',
        appRole: 'COACH',
        firstName: 'Coach',
        lastName: 'Concern',
        isVerified: true,
        onboardingComplete: true,
        createdAt: '2026-07-03T12:00:00.000Z',
        updatedAt: '2026-07-03T12:00:00.000Z',
      };
      const incident = () => ({
        id: 'safe_apiconcern1',
        athleteId: 'ath_api_concern_1',
        bookingId: null,
        category: 'session_conduct',
        severity: 'medium',
        status: incidentStatus,
        summary: 'API concern',
        details: 'Concern details',
        reportedByUserId: 'usr_coach_api_concern_1',
        actions,
        createdAt: '2026-07-03T12:00:00.000Z',
        updatedAt: '2026-07-03T12:10:00.000Z',
      });

      Object.defineProperty(apiClient, 'isMockMode', {
        configurable: true,
        get: () => false,
      });
      authService.getCurrentUser = async () => apiCoachUser;
      apiClientInternals.get = async <T,>(key: string, fallback: T): Promise<T> => {
        getCalls += 1;
        return originalGet<T>(key, fallback);
      };
      globalThis.fetch = (async (input, init) => {
        const url = String(input);
        const method = init?.method ?? 'GET';
        fetchCalls.push({ method, url });

        if (method === 'GET' && url.includes('/v1/safeguarding/incidents?')) {
          return new Response(
            JSON.stringify({ incidents: [incident()], total: 1, requestId: 'req_concern_list' }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          );
        }

        if (method === 'POST' && url.includes('/v1/safeguarding/incidents/safe_apiconcern1/actions')) {
          const body = JSON.parse(String(init?.body ?? '{}')) as {
            actionType: string;
            notes: string;
          };
          if (body.actionType === 'close_case') {
            incidentStatus = 'closed';
          }
          if (body.actionType === 'reopen_case') {
            incidentStatus = 'in_review';
          }
          const action = {
            id: `sact_${body.actionType}`,
            incidentId: 'safe_apiconcern1',
            actionType: body.actionType,
            notes: body.notes,
            performedByUserId: 'usr_coach_api_concern_1',
            createdAt:
              body.actionType === 'close_case'
                ? '2026-07-03T12:20:00.000Z'
                : '2026-07-03T12:30:00.000Z',
          };
          actions.unshift(action);
          return new Response(JSON.stringify(action), {
            status: 201,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        if (method === 'GET' && url.includes('/v1/safeguarding/incidents/safe_apiconcern1')) {
          return new Response(JSON.stringify(incident()), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        return new Response(JSON.stringify({ message: `Unexpected request ${method} ${url}` }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }) as typeof fetch;

      try {
        const athleteResult = await concernService.getForAthlete(
          'coach_api_concern_1',
          'ath_api_concern_1',
        );
        const openResult = await concernService.getOpenConcerns('coach_api_concern_1');
        const resolveResult = await concernService.resolveConcern(
          'safe_apiconcern1',
          'Resolved in API mode',
        );
        const updateResult = await concernService.updateStatus(
          'safe_apiconcern1',
          'IN_PROGRESS',
        );

        assert.equal(athleteResult.success, true);
        assert.equal(openResult.success, true);
        assert.equal(resolveResult.success, true);
        assert.equal(updateResult.success, true);
        if (athleteResult.success) {
          assert.equal(athleteResult.data[0].id, 'safe_apiconcern1');
          assert.equal(athleteResult.data[0].status, 'OPEN');
        }
        if (openResult.success) {
          assert.equal(openResult.data[0].athleteId, 'ath_api_concern_1');
        }
        if (resolveResult.success) {
          assert.equal(resolveResult.data.status, 'RESOLVED');
          assert.equal(resolveResult.data.resolution, 'Resolved in API mode');
        }
        if (updateResult.success) {
          assert.equal(updateResult.data.status, 'IN_PROGRESS');
        }
        assert.equal(
          fetchCalls.some((call) => call.method === 'GET' && call.url.includes('/v1/safeguarding/incidents?')),
          true,
        );
        assert.equal(
          fetchCalls.some(
            (call) =>
              call.method === 'POST' &&
              call.url.includes('/v1/safeguarding/incidents/safe_apiconcern1/actions'),
          ),
          true,
        );
        assert.equal(getCalls, 0);
      } finally {
        if (originalIsMockMode) {
          Object.defineProperty(apiClient, 'isMockMode', originalIsMockMode);
        }
        authService.getCurrentUser = originalGetCurrentUser;
        apiClientInternals.get = originalGet;
        globalThis.fetch = originalFetch;
      }
    });
  });

  // ---------------------------------------------------------------------------
  // getOpenConcerns
  // ---------------------------------------------------------------------------
  describe('getOpenConcerns', () => {
    test('returns only OPEN and IN_PROGRESS concerns', async () => {
      const coachId = `coach_${rid()}`;

      const r1 = await concernService.raiseConcern(makeConcernInput({ coachId }));
      const r2 = await concernService.raiseConcern(makeConcernInput({ coachId }));

      // Resolve one
      if (r2.success) {
        await concernService.resolveConcern(r2.data.id, 'Fixed');
      }

      const result = await concernService.getOpenConcerns(coachId);
      assert.equal(result.success, true);
      if (result.success) {
        for (const c of result.data) {
          assert.ok(c.status === 'OPEN' || c.status === 'IN_PROGRESS');
        }
      }
    });
  });

  // ---------------------------------------------------------------------------
  // resolveConcern
  // ---------------------------------------------------------------------------
  describe('resolveConcern', () => {
    test('sets status to RESOLVED with resolution text', async () => {
      const raised = await concernService.raiseConcern(makeConcernInput());
      assert.equal(raised.success, true);
      if (!raised.success) return;

      const result = await concernService.resolveConcern(raised.data.id, 'Spoke with parent');
      assert.equal(result.success, true);
      if (result.success) {
        assert.equal(result.data.status, 'RESOLVED');
        assert.equal(result.data.resolution, 'Spoke with parent');
      }
    });

    test('emits CONCERN_RESOLVED event', async () => {
      let emitted = false;
      eventBus.on(ServiceEvents.CONCERN_RESOLVED, () => { emitted = true; });

      const raised = await concernService.raiseConcern(makeConcernInput());
      if (raised.success) {
        await concernService.resolveConcern(raised.data.id, 'Done');
      }
      assert.equal(emitted, true);
    });
  });

  // ---------------------------------------------------------------------------
  // updateStatus
  // ---------------------------------------------------------------------------
  describe('updateStatus', () => {
    test('updates status and emits event', async () => {
      let emitted = false;
      eventBus.on(ServiceEvents.CONCERN_UPDATED, () => { emitted = true; });

      const raised = await concernService.raiseConcern(makeConcernInput());
      if (!raised.success) return;

      const result = await concernService.updateStatus(raised.data.id, 'IN_PROGRESS');
      assert.equal(result.success, true);
      if (result.success) {
        assert.equal(result.data.status, 'IN_PROGRESS');
      }
      assert.equal(emitted, true);
    });
  });

  // ---------------------------------------------------------------------------
  // Color helpers
  // ---------------------------------------------------------------------------
  describe('getSeverityColor', () => {
    test('returns a color string for each severity', () => {
      assert.equal(typeof concernService.getSeverityColor('LOW'), 'string');
      assert.equal(typeof concernService.getSeverityColor('URGENT'), 'string');
    });
  });

  describe('getStatusColor', () => {
    test('returns a color string for each status', () => {
      assert.equal(typeof concernService.getStatusColor('OPEN'), 'string');
      assert.equal(typeof concernService.getStatusColor('RESOLVED'), 'string');
    });
  });
});
