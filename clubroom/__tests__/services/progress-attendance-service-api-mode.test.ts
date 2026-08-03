import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { Booking } from '@/constants/app-types';

process.env.EXPO_PUBLIC_USE_MOCK = 'false';

describe('progressAttendanceService API mode', () => {
  it('fails closed instead of mirroring completed bookings into local coach sessions', async () => {
    const [{ progressAttendanceService }, { apiClient }] = await Promise.all([
      import('@/services/progress/progress-attendance-service'),
      import('@/services/api-client'),
    ]);

    const originalGet = apiClient.get;
    const originalSet = apiClient.set;
    apiClient.get = async () => {
      throw new Error('local get should not run in API mode');
    };
    apiClient.set = async () => {
      throw new Error('local set should not run in API mode');
    };

    try {
      const booking: Booking = {
        id: 'booking_api_progress',
        coachId: 'coach_api_progress',
        athleteId: 'athlete_api_progress',
        athleteIds: ['athlete_api_progress'],
        status: 'COMPLETED',
        scheduledAt: '2026-07-05T10:00:00.000Z',
        createdAt: '2026-07-04T10:00:00.000Z',
        location: 'Training ground',
      };
      const result = await progressAttendanceService.upsertCompletedBookingSessions(booking);

      assert.equal(result.success, false);
      assert.equal(result.success ? undefined : result.error.code, 'UNSUPPORTED');
      assert.match(
        result.success ? '' : result.error.message,
        /mock-only; API mode uses \/v1 booking completion or group attendance authority/,
      );
    } finally {
      apiClient.get = originalGet;
      apiClient.set = originalSet;
    }
  });
});
