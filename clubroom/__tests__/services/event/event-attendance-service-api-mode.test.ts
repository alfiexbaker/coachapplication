import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { STORAGE_KEYS } from '@/constants/storage-keys';

process.env.EXPO_PUBLIC_USE_MOCK = 'false';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('eventAttendanceService API mode', () => {
  it('surfaces /v1 attendance read failures instead of empty check-in state', async (t) => {
    const [{ eventAttendanceService }, { apiClient }] = await Promise.all([
      import('@/services/event/event-attendance-service'),
      import('@/services/api-client'),
    ]);

    const original = {
      get: apiClient.get,
      set: apiClient.set,
      fetch: globalThis.fetch,
    };
    const localAttendanceStorageCalls: string[] = [];
    const calls: Array<{ method: string; path: string }> = [];

    apiClient.get = async <T,>(key: string, fallback: T): Promise<T> => {
      if (key === STORAGE_KEYS.EVENT_ATTENDANCE) {
        localAttendanceStorageCalls.push(`get:${key}`);
        throw new Error('local event attendance read should not run in API mode');
      }
      return (await original.get.call(apiClient, key, fallback)) as T;
    };
    apiClient.set = async <T,>(key: string, data: T): Promise<void> => {
      if (key === STORAGE_KEYS.EVENT_ATTENDANCE) {
        localAttendanceStorageCalls.push(`set:${key}`);
        throw new Error('local event attendance write should not run in API mode');
      }
      return original.set.call(apiClient, key, data);
    };
    globalThis.fetch = (async (input, init) => {
      const url = new URL(String(input));
      const method = init?.method ?? 'GET';
      calls.push({ method, path: url.pathname });

      if (url.pathname === '/v1/events/event_empty/attendance/user_api' && method === 'GET') {
        return jsonResponse({ attendance: null });
      }
      return jsonResponse({ message: 'event attendance down' }, 503);
    }) as typeof fetch;

    t.after(() => {
      apiClient.get = original.get;
      apiClient.set = original.set;
      globalThis.fetch = original.fetch;
    });

    await assert.rejects(
      () => eventAttendanceService.getAttendeeList('event_api'),
      /event attendance down/i,
    );
    await assert.rejects(
      () => eventAttendanceService.getUserAttendance('event_api', 'user_api'),
      /event attendance down/i,
    );
    await assert.rejects(
      () => eventAttendanceService.isUserCheckedIn('event_api', 'user_api'),
      /event attendance down/i,
    );
    assert.equal(await eventAttendanceService.getUserAttendance('event_empty', 'user_api'), null);

    assert.deepEqual(localAttendanceStorageCalls, []);
    assert.deepEqual(calls, [
      { method: 'GET', path: '/v1/events/event_api/attendance' },
      { method: 'GET', path: '/v1/events/event_api/attendance/user_api' },
      { method: 'GET', path: '/v1/events/event_api/attendance/user_api' },
      { method: 'GET', path: '/v1/events/event_empty/attendance/user_api' },
    ]);
  });

  it('uses event attendance APIs without local attendance mirrors', async (t) => {
    const [{ eventAttendanceService }, { apiClient }] = await Promise.all([
      import('@/services/event/event-attendance-service'),
      import('@/services/api-client'),
    ]);

    const original = {
      get: apiClient.get,
      set: apiClient.set,
      fetch: globalThis.fetch,
    };
    const localAttendanceStorageCalls: string[] = [];
    const calls: Array<{ method: string; path: string; body?: unknown }> = [];

    apiClient.get = async <T,>(key: string, fallback: T): Promise<T> => {
      if (key === STORAGE_KEYS.EVENT_ATTENDANCE) {
        localAttendanceStorageCalls.push(`get:${key}`);
        throw new Error('local event attendance read should not run in API mode');
      }
      return (await original.get.call(apiClient, key, fallback)) as T;
    };
    apiClient.set = async <T,>(key: string, data: T): Promise<void> => {
      if (key === STORAGE_KEYS.EVENT_ATTENDANCE) {
        localAttendanceStorageCalls.push(`set:${key}`);
        throw new Error('local event attendance write should not run in API mode');
      }
      return original.set.call(apiClient, key, data);
    };
    globalThis.fetch = (async (input, init) => {
      const url = new URL(String(input));
      const method = init?.method ?? 'GET';
      calls.push({
        method,
        path: url.pathname,
        body: init?.body ? JSON.parse(String(init.body)) : undefined,
      });

      if (url.pathname === '/v1/events/event_api/checkins' && method === 'POST') {
        return jsonResponse({
          attendance: {
            id: 'attendance_api',
            eventId: 'event_api',
            userId: 'user_api',
            userRole: 'PARENT',
            checkedInAt: '2030-06-01T09:00:00.000Z',
            checkedInByUserId: 'coach_api',
            checkInMethod: 'COACH',
            guestsCheckedIn: 1,
            notes: 'arrived',
          },
        });
      }

      if (url.pathname === '/v1/events/event_api/attendance' && method === 'GET') {
        return jsonResponse({
          attendance: [
            {
              id: 'attendance_api',
              eventId: 'event_api',
              userId: 'user_api',
              userRole: 'PARENT',
              checkedInAt: '2030-06-01T09:00:00.000Z',
              checkedInByUserId: 'coach_api',
              checkInMethod: 'COACH',
              guestsCheckedIn: 1,
            },
          ],
        });
      }

      if (url.pathname === '/v1/events/event_api/attendance/user_api' && method === 'GET') {
        return jsonResponse({
          attendance: {
            id: 'attendance_api',
            eventId: 'event_api',
            userId: 'user_api',
            userRole: 'PARENT',
            checkedInAt: '2030-06-01T09:00:00.000Z',
            checkedInByUserId: 'coach_api',
            checkInMethod: 'COACH',
            guestsCheckedIn: 1,
          },
        });
      }

      if (url.pathname === '/v1/events/event_api/attendance/stats' && method === 'GET') {
        return jsonResponse({
          eventId: 'event_api',
          rsvpCounts: { going: 2, notGoing: 0, maybe: 0, noResponse: 0 },
          expectedGuests: 1,
          checkedInCount: 1,
          guestsCheckedInCount: 1,
          attendanceRate: 50,
          byRole: {
            coaches: { rsvp: 0, checkedIn: 0 },
            parents: { rsvp: 2, checkedIn: 1 },
            athletes: { rsvp: 0, checkedIn: 0 },
          },
          updatedAt: '2030-06-01T09:05:00.000Z',
        });
      }

      return jsonResponse({ message: `unexpected ${method} ${url.pathname}` }, 404);
    }) as typeof fetch;

    t.after(() => {
      apiClient.get = original.get;
      apiClient.set = original.set;
      globalThis.fetch = original.fetch;
    });

    const checkedIn = await eventAttendanceService.checkIn({
      eventId: 'event_api',
      userId: 'user_api',
      userRole: 'PARENT',
      checkedInBy: 'coach_api',
      checkInMethod: 'COACH',
      guestsCheckedIn: 1,
      notes: 'arrived',
    });
    assert.equal(checkedIn.id, 'attendance_api');

    const attendees = await eventAttendanceService.getAttendeeList('event_api');
    assert.deepEqual(
      attendees.map((attendance) => attendance.id),
      ['attendance_api'],
    );

    const userAttendance = await eventAttendanceService.getUserAttendance('event_api', 'user_api');
    assert.equal(userAttendance?.id, 'attendance_api');
    assert.equal(await eventAttendanceService.isUserCheckedIn('event_api', 'user_api'), true);

    const stats = await eventAttendanceService.getAttendanceStats('event_api');
    assert.equal(stats.checkedInCount, 1);

    assert.deepEqual(localAttendanceStorageCalls, []);
    assert.deepEqual(calls, [
      {
        method: 'POST',
        path: '/v1/events/event_api/checkins',
        body: {
          userId: 'user_api',
          userRole: 'PARENT',
          checkInMethod: 'COACH',
          guestsCheckedIn: 1,
          notes: 'arrived',
        },
      },
      { method: 'GET', path: '/v1/events/event_api/attendance', body: undefined },
      { method: 'GET', path: '/v1/events/event_api/attendance/user_api', body: undefined },
      { method: 'GET', path: '/v1/events/event_api/attendance/user_api', body: undefined },
      { method: 'GET', path: '/v1/events/event_api/attendance/stats', body: undefined },
    ]);
  });
});
