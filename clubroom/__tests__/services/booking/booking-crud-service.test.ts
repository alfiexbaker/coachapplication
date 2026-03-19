import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { bookingCrudService } from '@/services/booking/booking-crud-service';
import { authService } from '@/services/auth-service';
import { apiClient } from '@/services/api-client';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import { onTyped, ServiceEvents } from '@/services/event-bus';
import { bookingAuthorityService } from '@/services/booking/booking-authority-service';
import type { SessionOffering } from '@/constants/types';
import { ok } from '@/types/result';

function makeSessionOffering(
  overrides: Partial<SessionOffering> & { id: string; coachId: string; title: string },
): SessionOffering {
  const { id, coachId, title, ...rest } = overrides;
  return {
    id,
    coachId,
    title,
    sessionType: 'group',
    maxParticipants: 12,
    location: 'Test Pitch',
    scheduledAt: '2026-03-10T18:00:00.000Z',
    isRecurring: false,
    recurrenceType: 'none',
    status: 'active',
    registrations: [],
    createdAt: '2026-03-01T00:00:00.000Z',
    ...rest,
  };
}

describe('BookingCrudService', () => {
  beforeEach(async () => {
    // Clear storage and reset draft
    await apiClient.remove(STORAGE_KEYS.BOOKINGS);
    await apiClient.remove(STORAGE_KEYS.COACH_SESSIONS);
    await apiClient.remove(STORAGE_KEYS.SESSION_OFFERINGS);
    await apiClient.remove(STORAGE_KEYS.PROGRESS_SELF_ASSESSMENT_PROMPTS);
    await apiClient.remove(STORAGE_KEYS.PROGRESS_SELF_ASSESSMENTS);
    await apiClient.remove(STORAGE_KEYS.SESSION_JOURNAL);
    bookingCrudService.resetDraft();
  });

  describe('draft management', () => {
    it('should get empty draft initially', () => {
      const draft = bookingCrudService.getDraft();
      assert.deepEqual(draft, {});
    });

    it('should update draft with partial data', () => {
      bookingCrudService.updateDraft({ sessionType: '1-on-1', duration: 60 });
      const draft = bookingCrudService.getDraft();

      assert.equal(draft.sessionType, '1-on-1');
      assert.equal(draft.duration, 60);
    });

    it('should merge draft updates', () => {
      bookingCrudService.updateDraft({ sessionType: '1-on-1' });
      bookingCrudService.updateDraft({ duration: 60 });
      const draft = bookingCrudService.getDraft();

      assert.equal(draft.sessionType, '1-on-1');
      assert.equal(draft.duration, 60);
    });

    it('should reset draft to empty', () => {
      bookingCrudService.updateDraft({ sessionType: '1-on-1', duration: 60 });
      bookingCrudService.resetDraft();
      const draft = bookingCrudService.getDraft();

      assert.deepEqual(draft, {});
    });
  });

  describe('create', () => {
    it('should return ok() when creating valid booking', async () => {
      const params = {
        coachId: 'coach-' + Math.random().toString(36).slice(2),
        coachName: 'Test Coach',
        athleteIds: ['athlete-' + Math.random().toString(36).slice(2)],
        athleteNames: ['Test Athlete'],
        bookedById: 'parent-' + Math.random().toString(36).slice(2),
        bookedByName: 'Test Parent',
        scheduledAt: new Date(Date.now() + 86400000).toISOString(),
        duration: 60,
        location: 'Test Field',
        service: '1-on-1 Coaching',
        serviceType: 'COACHING',
        price: 50,
        skipAvailabilityValidation: true,
      };

      const result = await bookingCrudService.createBooking(params);

      assert.ok(result.success);
      assert.ok(result.data.id);
      assert.equal(result.data.coachId, params.coachId);
      assert.equal(result.data.status, 'CONFIRMED');
    });

    it('should create booking via API in non-mock mode when actor matches bookedBy', async () => {
      const originalIsMockMode = Object.getOwnPropertyDescriptor(apiClient, 'isMockMode');
      const originalGetCurrentUser = authService.getCurrentUser;
      const originalCreateViaApi = bookingAuthorityService.createBooking;
      const apiCalls: Array<Record<string, unknown>> = [];

      Object.defineProperty(apiClient, 'isMockMode', {
        configurable: true,
        get: () => false,
      });
      authService.getCurrentUser = async () => ({
        id: 'usr_parent-api-create',
        email: 'parent@example.com',
        accountType: 'PARENT',
        firstName: 'Test',
        lastName: 'Parent',
        isVerified: false,
        onboardingComplete: true,
        createdAt: '2026-03-18T00:00:00.000Z',
        updatedAt: '2026-03-18T00:00:00.000Z',
        roles: ['parent'],
      });
      bookingAuthorityService.createBooking = async (
        input,
      ) => {
        apiCalls.push(input as unknown as Record<string, unknown>);
        return ok({
          id: 'bok_api_create_1',
          coachUserId: 'usr_coach_api_create',
          bookedByUserId: 'usr_parent-api-create',
          status: 'CONFIRMED',
          scheduledAt: '2030-01-10T10:00:00.000Z',
          durationMinutes: 60,
          location: 'API Test Field',
          serviceType: 'COACHING',
          sessionTemplateId: null,
          objectives: ['Finishing'],
          notes: 'Created through API',
          priceMinor: 8400,
          currency: 'GBP',
          participants: [
            {
              athleteId: 'ath_api_create_1',
              guardianUserId: 'usr_parent-api-create',
              status: 'confirmed',
            },
            {
              athleteId: 'ath_api_create_2',
              guardianUserId: 'usr_parent-api-create',
              status: 'confirmed',
            },
          ],
          version: 1,
          createdAt: '2026-03-18T12:00:00.000Z',
          updatedAt: '2026-03-18T12:00:00.000Z',
          cancelledAt: null,
        });
      };

      try {
        const result = await bookingCrudService.createBooking({
          coachId: 'coach-api-create',
          coachName: 'API Coach',
          athleteIds: ['athlete-api-create-1', 'athlete-api-create-2'],
          athleteNames: ['Athlete One', 'Athlete Two'],
          bookedById: 'parent-api-create',
          bookedByName: 'API Parent',
          scheduledAt: '2030-01-10T10:00:00',
          duration: 60,
          location: 'API Test Field',
          service: '1-on-1 Coaching',
          serviceType: 'COACHING',
          objectives: ['Finishing'],
          price: 42,
          notes: 'Created through API',
          skipAvailabilityValidation: true,
        });

        assert.ok(result.success);
        if (!result.success) return;

        assert.equal(apiCalls.length, 1);
        assert.equal(result.data.id, 'bok_api_create_1');
        assert.equal(result.data.scheduledAt, '2030-01-10T10:00:00.000Z');
        assert.equal(result.data.price, 84);

        const stored = await apiClient.get<Array<{ id: string }>>(STORAGE_KEYS.BOOKINGS, []);
        assert.equal(stored.length, 1);
        assert.equal(stored[0]?.id, 'bok_api_create_1');
      } finally {
        authService.getCurrentUser = originalGetCurrentUser;
        bookingAuthorityService.createBooking = originalCreateViaApi;
        if (originalIsMockMode) {
          Object.defineProperty(apiClient, 'isMockMode', originalIsMockMode);
        }
      }
    });

    it('should keep delegated booking creation on the local path when actor cannot satisfy backend authz', async () => {
      const originalIsMockMode = Object.getOwnPropertyDescriptor(apiClient, 'isMockMode');
      const originalGetCurrentUser = authService.getCurrentUser;
      const originalCreateViaApi = bookingAuthorityService.createBooking;
      let apiCallCount = 0;

      Object.defineProperty(apiClient, 'isMockMode', {
        configurable: true,
        get: () => false,
      });
      authService.getCurrentUser = async () => ({
        id: 'usr_coach-delegated-create',
        email: 'coach@example.com',
        accountType: 'COACH',
        firstName: 'Delegated',
        lastName: 'Coach',
        isVerified: true,
        onboardingComplete: true,
        createdAt: '2026-03-18T00:00:00.000Z',
        updatedAt: '2026-03-18T00:00:00.000Z',
        roles: ['coach'],
      });
      bookingAuthorityService.createBooking = async () => {
        apiCallCount += 1;
        return ok({
          id: 'bok_should_not_be_used',
          coachUserId: 'usr_coach-delegated-create',
          bookedByUserId: 'usr_parent-delegated-create',
          status: 'CONFIRMED',
          scheduledAt: '2030-01-11T11:00:00.000Z',
          durationMinutes: 60,
          location: 'Delegated Test Field',
          serviceType: 'COACHING',
          objectives: [],
          currency: 'GBP',
          participants: [],
          version: 1,
          createdAt: '2026-03-18T12:00:00.000Z',
          updatedAt: '2026-03-18T12:00:00.000Z',
          cancelledAt: null,
        });
      };

      try {
        const result = await bookingCrudService.createBooking({
          coachId: 'coach-delegated-create',
          coachName: 'Delegated Coach',
          athleteIds: ['athlete-delegated-create'],
          athleteNames: ['Delegated Athlete'],
          bookedById: 'parent-delegated-create',
          bookedByName: 'Delegated Parent',
          scheduledAt: '2030-01-11T11:00:00.000Z',
          duration: 60,
          location: 'Delegated Test Field',
          service: '1-on-1 Coaching',
          serviceType: 'COACHING',
          createdByRole: 'COACH',
          createdByUserId: 'coach-delegated-create',
          skipAvailabilityValidation: true,
        });

        assert.ok(result.success);
        if (!result.success) return;

        assert.equal(apiCallCount, 0);
        assert.match(result.data.id, /^booking_/);
      } finally {
        authService.getCurrentUser = originalGetCurrentUser;
        bookingAuthorityService.createBooking = originalCreateViaApi;
        if (originalIsMockMode) {
          Object.defineProperty(apiClient, 'isMockMode', originalIsMockMode);
        }
      }
    });

    it('should return err() when scheduledAt is missing', async () => {
      const params = {
        coachId: 'coach1',
        coachName: 'Test Coach',
        athleteIds: ['athlete1'],
        athleteNames: ['Test Athlete'],
        bookedById: 'parent1',
        bookedByName: 'Test Parent',
        scheduledAt: '',
        duration: 60,
        location: 'Test Field',
        service: '1-on-1 Coaching',
        serviceType: 'COACHING',
        skipAvailabilityValidation: true,
      };

      const result = await bookingCrudService.createBooking(params);

      assert.ok(!result.success);
      assert.equal(result.error.code, 'VALIDATION');
    });

    it('should emit BOOKING_CREATED event on success', async () => {
      const events: any[] = [];
      const unsub = onTyped(ServiceEvents.BOOKING_CREATED, (payload) => {
        events.push(payload);
      });

      const params = {
        coachId: 'coach-' + Math.random().toString(36).slice(2),
        coachName: 'Test Coach',
        athleteIds: ['athlete-' + Math.random().toString(36).slice(2)],
        athleteNames: ['Test Athlete'],
        bookedById: 'parent-' + Math.random().toString(36).slice(2),
        bookedByName: 'Test Parent',
        scheduledAt: new Date(Date.now() + 86400000).toISOString(),
        duration: 60,
        location: 'Test Field',
        service: '1-on-1 Coaching',
        serviceType: 'COACHING',
        skipAvailabilityValidation: true,
      };

      const result = await bookingCrudService.createBooking(params);
      assert.ok(result.success);
      await new Promise((resolve) => setTimeout(resolve, 0));

      assert.ok(events.some((event) => event.bookingId === result.data.id));
      assert.ok(events.some((event) => event.coachId === params.coachId));
      unsub();
    });

    it('should handle multiple athletes in booking', async () => {
      const athleteIds = [
        'athlete-' + Math.random().toString(36).slice(2),
        'athlete-' + Math.random().toString(36).slice(2),
      ];
      const params = {
        coachId: 'coach-' + Math.random().toString(36).slice(2),
        coachName: 'Test Coach',
        athleteIds,
        athleteNames: ['Athlete 1', 'Athlete 2'],
        bookedById: 'parent-' + Math.random().toString(36).slice(2),
        bookedByName: 'Test Parent',
        scheduledAt: new Date(Date.now() + 86400000).toISOString(),
        duration: 60,
        location: 'Test Field',
        service: 'Group Session',
        serviceType: 'GROUP',
        skipAvailabilityValidation: true,
      };

      const result = await bookingCrudService.createBooking(params);

      assert.ok(result.success);
      assert.equal(result.data.athleteIds?.length, 2);
    });

    it('should return err() when booking persistence fails', async () => {
      const apiClientMutable = apiClient as unknown as { set: typeof apiClient.set };
      const originalSet = apiClientMutable.set;
      apiClientMutable.set = async () => {
        throw new Error('forced write failure');
      };

      try {
        const result = await bookingCrudService.createBooking({
          coachId: 'coach-' + Math.random().toString(36).slice(2),
          coachName: 'Test Coach',
          athleteIds: ['athlete-' + Math.random().toString(36).slice(2)],
          athleteNames: ['Test Athlete'],
          bookedById: 'parent-' + Math.random().toString(36).slice(2),
          bookedByName: 'Test Parent',
          scheduledAt: new Date(Date.now() + 86400000).toISOString(),
          duration: 60,
          location: 'Test Field',
          service: '1-on-1 Coaching',
          serviceType: 'COACHING',
          skipAvailabilityValidation: true,
        });

        assert.equal(result.success, false);
        if (!result.success) {
          assert.equal(result.error.code, 'STORAGE');
        }
      } finally {
        apiClientMutable.set = originalSet;
      }
    });

    it('should allow linked-session bookings outside coach hours', async () => {
      const coachId = 'coach-linked-hours';
      await apiClient.set(STORAGE_KEYS.SESSION_OFFERINGS, [
        makeSessionOffering({
          id: 'offering_linked_hours',
          coachId,
          title: 'Linked Session',
          source: 'direct',
          sourceEntityId: 'offering_linked_hours',
        }),
      ]);

      const result = await bookingCrudService.createBooking({
        coachId,
        coachName: 'Coach Linked',
        athleteIds: ['athlete-linked-hours'],
        athleteNames: ['Athlete Linked'],
        bookedById: 'parent-linked-hours',
        bookedByName: 'Parent Linked',
        scheduledAt: '2026-01-01T03:00:00.000Z',
        duration: 60,
        location: 'Pitch 1',
        service: 'Linked Session',
        serviceType: 'GROUP',
        sessionSource: 'direct',
        sessionSourceEntityId: 'offering_linked_hours',
      });

      assert.equal(result.success, true);
    });

    it('should reject ad-hoc bookings outside coach hours', async () => {
      const result = await bookingCrudService.createBooking({
        coachId: 'coach-adhoc-hours',
        coachName: 'Coach Adhoc',
        athleteIds: ['athlete-adhoc-hours'],
        athleteNames: ['Athlete Adhoc'],
        bookedById: 'parent-adhoc-hours',
        bookedByName: 'Parent Adhoc',
        scheduledAt: '2026-01-01T03:00:00.000Z',
        duration: 60,
        location: 'Pitch 2',
        service: 'Adhoc Session',
        serviceType: 'COACHING',
      });

      assert.equal(result.success, false);
      if (!result.success) {
        assert.equal(result.error.code, 'VALIDATION');
      }
    });

    it('should block duplicate athlete booking on same linked session', async () => {
      const coachId = 'coach-linked-duplicate';
      const sessionEntityId = 'offering_linked_duplicate';
      await apiClient.set(STORAGE_KEYS.SESSION_OFFERINGS, [
        makeSessionOffering({
          id: sessionEntityId,
          coachId,
          title: 'Linked Duplicate Session',
          source: 'direct',
          sourceEntityId: sessionEntityId,
        }),
      ]);

      const first = await bookingCrudService.createBooking({
        coachId,
        coachName: 'Coach Duplicate',
        athleteIds: ['athlete-dup-1'],
        athleteNames: ['Athlete Dup'],
        bookedById: 'parent-dup',
        bookedByName: 'Parent Dup',
        scheduledAt: '2026-01-02T03:00:00.000Z',
        duration: 60,
        location: 'Pitch 3',
        service: 'Linked Session',
        serviceType: 'GROUP',
        sessionSource: 'direct',
        sessionSourceEntityId: sessionEntityId,
      });
      assert.equal(first.success, true);

      const duplicate = await bookingCrudService.createBooking({
        coachId,
        coachName: 'Coach Duplicate',
        athleteIds: ['athlete-dup-1'],
        athleteNames: ['Athlete Dup'],
        bookedById: 'parent-dup',
        bookedByName: 'Parent Dup',
        scheduledAt: '2026-01-02T03:00:00.000Z',
        duration: 60,
        location: 'Pitch 3',
        service: 'Linked Session',
        serviceType: 'GROUP',
        sessionSource: 'direct',
        sessionSourceEntityId: sessionEntityId,
      });

      assert.equal(duplicate.success, false);
      if (!duplicate.success) {
        assert.equal(duplicate.error.code, 'CONFLICT');
      }
    });

    it('should block linked-session bookings when capacity is exceeded', async () => {
      const coachId = 'coach-linked-capacity';
      const sessionEntityId = 'offering_linked_capacity';
      await apiClient.set(STORAGE_KEYS.SESSION_OFFERINGS, [
        makeSessionOffering({
          id: sessionEntityId,
          coachId,
          title: 'Linked Capacity Session',
          source: 'direct',
          sourceEntityId: sessionEntityId,
          maxParticipants: 1,
        }),
      ]);

      const first = await bookingCrudService.createBooking({
        coachId,
        coachName: 'Coach Capacity',
        athleteIds: ['athlete-cap-1'],
        athleteNames: ['Athlete Cap 1'],
        bookedById: 'parent-cap',
        bookedByName: 'Parent Cap',
        scheduledAt: '2026-01-03T03:00:00.000Z',
        duration: 60,
        location: 'Pitch 4',
        service: 'Linked Session',
        serviceType: 'GROUP',
        sessionSource: 'direct',
        sessionSourceEntityId: sessionEntityId,
      });
      assert.equal(first.success, true);

      const overflow = await bookingCrudService.createBooking({
        coachId,
        coachName: 'Coach Capacity',
        athleteIds: ['athlete-cap-2'],
        athleteNames: ['Athlete Cap 2'],
        bookedById: 'parent-cap',
        bookedByName: 'Parent Cap',
        scheduledAt: '2026-01-03T03:00:00.000Z',
        duration: 60,
        location: 'Pitch 4',
        service: 'Linked Session',
        serviceType: 'GROUP',
        sessionSource: 'direct',
        sessionSourceEntityId: sessionEntityId,
      });

      assert.equal(overflow.success, false);
      if (!overflow.success) {
        assert.equal(overflow.error.code, 'CONFLICT');
      }
    });
  });

  describe('list', () => {
    it('should return empty array initially', async () => {
      const bookings = await bookingCrudService.list();
      assert.ok(Array.isArray(bookings));
      assert.equal(bookings.length, 0);
    });

    it('should return all bookings after creation', async () => {
      await bookingCrudService.createBooking({
        coachId: 'coach-' + Math.random().toString(36).slice(2),
        coachName: 'Coach 1',
        athleteIds: ['athlete-' + Math.random().toString(36).slice(2)],
        athleteNames: ['Athlete 1'],
        bookedById: 'parent-' + Math.random().toString(36).slice(2),
        bookedByName: 'Parent',
        scheduledAt: new Date(Date.now() + 86400000).toISOString(),
        duration: 60,
        location: 'Field',
        service: '1-on-1',
        serviceType: 'COACHING',
        skipAvailabilityValidation: true,
      });

      const bookings = await bookingCrudService.list();
      assert.equal(bookings.length, 1);
    });

    it('should use API-first list in non-mock mode and keep local-only metadata', async () => {
      const originalIsMockMode = Object.getOwnPropertyDescriptor(apiClient, 'isMockMode');
      const originalListViaApi = bookingAuthorityService.listBookings;

      Object.defineProperty(apiClient, 'isMockMode', {
        configurable: true,
        get: () => false,
      });
      await apiClient.set(STORAGE_KEYS.BOOKINGS, [
        {
          id: 'bok_api_read_1',
          coachId: 'coach-api-read',
          coachName: 'Readable Coach',
          athleteIds: ['athlete-local-1'],
          athleteNames: ['Readable Athlete'],
          athleteId: 'athlete-local-1',
          bookedById: 'parent-api-read',
          bookedByName: 'Readable Parent',
          scheduledAt: '2030-01-12T10:00:00.000Z',
          status: 'CONFIRMED',
          duration: 60,
          location: 'Local Pitch',
          service: 'Local display label',
          serviceType: 'COACHING',
          notes: 'local-only metadata',
        },
      ]);
      bookingAuthorityService.listBookings = async () =>
        ok([
          {
            id: 'bok_api_read_1',
            coachUserId: 'usr_coach-api-read',
            bookedByUserId: 'usr_parent-api-read',
            status: 'CONFIRMED',
            scheduledAt: '2030-01-12T10:30:00.000Z',
            durationMinutes: 75,
            location: 'Authoritative Pitch',
            serviceType: 'COACHING',
            objectives: ['Awareness'],
            notes: 'authoritative notes',
            priceMinor: 6700,
            currency: 'GBP',
            participants: [
              {
                athleteId: 'ath_athlete-local-1',
                guardianUserId: 'usr_parent-api-read',
                status: 'confirmed',
              },
            ],
            version: 2,
            createdAt: '2026-03-19T15:00:00.000Z',
            updatedAt: '2026-03-19T15:30:00.000Z',
            cancelledAt: null,
          },
        ]);

      try {
        const bookings = await bookingCrudService.list();
        assert.equal(bookings.length, 1);
        assert.equal(bookings[0]?.id, 'bok_api_read_1');
        assert.equal(bookings[0]?.coachId, 'coach-api-read');
        assert.equal(bookings[0]?.scheduledAt, '2030-01-12T10:30:00.000Z');
        assert.equal(bookings[0]?.duration, 75);
        assert.equal(bookings[0]?.location, 'Authoritative Pitch');
        assert.equal(bookings[0]?.service, 'Local display label');
        assert.deepEqual(bookings[0]?.objectives, ['Awareness']);
      } finally {
        bookingAuthorityService.listBookings = originalListViaApi;
        if (originalIsMockMode) {
          Object.defineProperty(apiClient, 'isMockMode', originalIsMockMode);
        }
      }
    });
  });

  describe('getBooking', () => {
    it('should return booking by id', async () => {
      const createResult = await bookingCrudService.createBooking({
        coachId: 'coach-' + Math.random().toString(36).slice(2),
        coachName: 'Test Coach',
        athleteIds: ['athlete-' + Math.random().toString(36).slice(2)],
        athleteNames: ['Test Athlete'],
        bookedById: 'parent-' + Math.random().toString(36).slice(2),
        bookedByName: 'Test Parent',
        scheduledAt: new Date(Date.now() + 86400000).toISOString(),
        duration: 60,
        location: 'Test Field',
        service: '1-on-1',
        serviceType: 'COACHING',
        skipAvailabilityValidation: true,
      });

      assert.ok(createResult.success);
      const booking = await bookingCrudService.getBooking(createResult.data.id);

      assert.ok(booking);
      assert.equal(booking.id, createResult.data.id);
    });

    it('should return null for non-existent booking', async () => {
      const booking = await bookingCrudService.getBooking('fake-id-' + Math.random().toString(36).slice(2));
      assert.equal(booking, null);
    });

    it('should use API-first detail in non-mock mode and mirror the result', async () => {
      const originalIsMockMode = Object.getOwnPropertyDescriptor(apiClient, 'isMockMode');
      const originalGetViaApi = bookingAuthorityService.getBooking;

      Object.defineProperty(apiClient, 'isMockMode', {
        configurable: true,
        get: () => false,
      });
      await apiClient.set(STORAGE_KEYS.BOOKINGS, [
        {
          id: 'bok_api_detail_1',
          coachId: 'coach-api-detail',
          coachName: 'Detail Coach',
          athleteIds: ['athlete-local-detail'],
          athleteNames: ['Detail Athlete'],
          athleteId: 'athlete-local-detail',
          bookedById: 'parent-api-detail',
          bookedByName: 'Detail Parent',
          scheduledAt: '2030-01-13T10:00:00.000Z',
          status: 'CONFIRMED',
          duration: 60,
          location: 'Local Detail Pitch',
          service: 'Saved label',
          serviceType: 'COACHING',
        },
      ]);
      bookingAuthorityService.getBooking = async () =>
        ok({
          id: 'bok_api_detail_1',
          coachUserId: 'usr_coach-api-detail',
          bookedByUserId: 'usr_parent-api-detail',
          status: 'CANCELLED',
          scheduledAt: '2030-01-13T11:15:00.000Z',
          durationMinutes: 90,
          location: 'Authoritative Detail Pitch',
          serviceType: 'COACHING',
          objectives: ['Positioning'],
          notes: 'authoritative detail',
          priceMinor: 9100,
          currency: 'GBP',
          participants: [
            {
              athleteId: 'ath_athlete-local-detail',
              guardianUserId: 'usr_parent-api-detail',
              status: 'confirmed',
            },
          ],
          version: 4,
          createdAt: '2026-03-19T15:00:00.000Z',
          updatedAt: '2026-03-19T16:00:00.000Z',
          cancelledAt: '2026-03-19T16:00:00.000Z',
        });

      try {
        const booking = await bookingCrudService.getBooking('bok_api_detail_1');
        assert.ok(booking);
        assert.equal(booking?.status, 'CANCELLED');
        assert.equal(booking?.coachId, 'coach-api-detail');
        assert.equal(booking?.scheduledAt, '2030-01-13T11:15:00.000Z');
        assert.equal(booking?.location, 'Authoritative Detail Pitch');
        assert.equal(booking?.service, 'Saved label');

        const mirrored = await apiClient.get<Array<{ id: string; status: string; location: string }>>(
          STORAGE_KEYS.BOOKINGS,
          [],
        );
        assert.equal(mirrored[0]?.status, 'CANCELLED');
        assert.equal(mirrored[0]?.location, 'Authoritative Detail Pitch');
      } finally {
        bookingAuthorityService.getBooking = originalGetViaApi;
        if (originalIsMockMode) {
          Object.defineProperty(apiClient, 'isMockMode', originalIsMockMode);
        }
      }
    });
  });

  describe('updateBooking', () => {
    it('should return ok() and update booking', async () => {
      const createResult = await bookingCrudService.createBooking({
        coachId: 'coach-' + Math.random().toString(36).slice(2),
        coachName: 'Test Coach',
        athleteIds: ['athlete-' + Math.random().toString(36).slice(2)],
        athleteNames: ['Test Athlete'],
        bookedById: 'parent-' + Math.random().toString(36).slice(2),
        bookedByName: 'Test Parent',
        scheduledAt: new Date(Date.now() + 86400000).toISOString(),
        duration: 60,
        location: 'Test Field',
        service: '1-on-1',
        serviceType: 'COACHING',
        skipAvailabilityValidation: true,
      });

      assert.ok(createResult.success);
      const updateResult = await bookingCrudService.updateBooking(createResult.data.id, {
        status: 'CONFIRMED',
        notes: 'Updated notes',
      });

      assert.ok(updateResult.success);
      assert.equal(updateResult.data.status, 'CONFIRMED');
      assert.equal(updateResult.data.notes, 'Updated notes');
    });

    it('should return error for non-existent booking', async () => {
      const result = await bookingCrudService.updateBooking('fake-id-' + Math.random().toString(36).slice(2), {
        status: 'CONFIRMED',
      });

      assert.ok(!result.success);
    });

    it('should ingest completed booking into coach sessions exactly once', async () => {
      const athleteId = 'athlete-' + Math.random().toString(36).slice(2);
      const createResult = await bookingCrudService.createBooking({
        coachId: 'coach-' + Math.random().toString(36).slice(2),
        coachName: 'Test Coach',
        athleteIds: [athleteId],
        athleteNames: ['Test Athlete'],
        bookedById: 'parent-' + Math.random().toString(36).slice(2),
        bookedByName: 'Test Parent',
        scheduledAt: new Date(Date.now() + 86400000).toISOString(),
        duration: 60,
        location: 'Test Field',
        service: '1-on-1',
        serviceType: 'COACHING',
        skipAvailabilityValidation: true,
      });

      assert.ok(createResult.success);
      if (!createResult.success) return;

      const firstUpdate = await bookingCrudService.updateBooking(createResult.data.id, {
        status: 'COMPLETED',
      });
      assert.ok(firstUpdate.success);

      const sessionsAfterFirstUpdate = await apiClient.get(STORAGE_KEYS.COACH_SESSIONS, []);
      const ingestedAfterFirstUpdate = sessionsAfterFirstUpdate.filter(
        (session: { bookingId?: string; athleteId?: string }) =>
          session.bookingId === createResult.data.id && session.athleteId === athleteId,
      );
      assert.equal(ingestedAfterFirstUpdate.length, 1);

      const promptsAfterFirstUpdate = await apiClient.get(
        STORAGE_KEYS.PROGRESS_SELF_ASSESSMENT_PROMPTS,
        [],
      );
      const athletePromptsAfterFirstUpdate = promptsAfterFirstUpdate.filter(
        (prompt: { bookingId?: string; athleteId?: string }) =>
          prompt.bookingId === createResult.data.id && prompt.athleteId === athleteId,
      );
      assert.equal(athletePromptsAfterFirstUpdate.length, 1);

      const secondUpdate = await bookingCrudService.updateBooking(createResult.data.id, {
        notes: 'Coach added note after completion',
      });
      assert.ok(secondUpdate.success);

      const sessionsAfterSecondUpdate = await apiClient.get(STORAGE_KEYS.COACH_SESSIONS, []);
      const ingestedAfterSecondUpdate = sessionsAfterSecondUpdate.filter(
        (session: { bookingId?: string; athleteId?: string }) =>
          session.bookingId === createResult.data.id && session.athleteId === athleteId,
      );
      assert.equal(ingestedAfterSecondUpdate.length, 1);

      const promptsAfterSecondUpdate = await apiClient.get(
        STORAGE_KEYS.PROGRESS_SELF_ASSESSMENT_PROMPTS,
        [],
      );
      const athletePromptsAfterSecondUpdate = promptsAfterSecondUpdate.filter(
        (prompt: { bookingId?: string; athleteId?: string }) =>
          prompt.bookingId === createResult.data.id && prompt.athleteId === athleteId,
      );
      assert.equal(athletePromptsAfterSecondUpdate.length, 1);
    });
  });

  describe('updateStatus', () => {
    it('ingests completed booking session when status changes via updateStatus()', async () => {
      const athleteId = 'athlete-' + Math.random().toString(36).slice(2);
      const createResult = await bookingCrudService.createBooking({
        coachId: 'coach-' + Math.random().toString(36).slice(2),
        coachName: 'Test Coach',
        athleteIds: [athleteId],
        athleteNames: ['Test Athlete'],
        bookedById: 'parent-' + Math.random().toString(36).slice(2),
        bookedByName: 'Test Parent',
        scheduledAt: new Date(Date.now() + 86400000).toISOString(),
        duration: 60,
        location: 'Test Field',
        service: '1-on-1',
        serviceType: 'COACHING',
        skipAvailabilityValidation: true,
      });

      assert.ok(createResult.success);
      if (!createResult.success) return;

      const updated = await bookingCrudService.updateStatus(createResult.data.id, 'COMPLETED');
      assert.ok(updated);
      assert.equal(updated?.status, 'COMPLETED');

      const sessions = await apiClient.get(STORAGE_KEYS.COACH_SESSIONS, []);
      const ingested = sessions.filter(
        (session: { bookingId?: string; athleteId?: string }) =>
          session.bookingId === createResult.data.id && session.athleteId === athleteId,
      );
      assert.equal(ingested.length, 1);

      const prompts = await apiClient.get(STORAGE_KEYS.PROGRESS_SELF_ASSESSMENT_PROMPTS, []);
      const athletePrompts = prompts.filter(
        (prompt: { bookingId?: string; athleteId?: string }) =>
          prompt.bookingId === createResult.data.id && prompt.athleteId === athleteId,
      );
      assert.equal(athletePrompts.length, 1);
    });
  });

  describe('cancel', () => {
    it('should return ok() and cancel booking', async () => {
      const createResult = await bookingCrudService.createBooking({
        coachId: 'coach-' + Math.random().toString(36).slice(2),
        coachName: 'Test Coach',
        athleteIds: ['athlete-' + Math.random().toString(36).slice(2)],
        athleteNames: ['Test Athlete'],
        bookedById: 'parent-' + Math.random().toString(36).slice(2),
        bookedByName: 'Test Parent',
        scheduledAt: new Date(Date.now() + 86400000).toISOString(),
        duration: 60,
        location: 'Test Field',
        service: '1-on-1',
        serviceType: 'COACHING',
        skipAvailabilityValidation: true,
      });

      assert.ok(createResult.success);
      const cancelResult = await bookingCrudService.cancel(
        createResult.data.id,
        'Schedule conflict',
        'coach'
      );

      assert.ok(cancelResult);
      assert.equal(cancelResult.status, 'CANCELLED');
      assert.equal(cancelResult.cancellationReason, 'Schedule conflict');
    });

    it('should return err() for non-existent booking', async () => {
      const result = await bookingCrudService.cancel(
        'fake-id-' + Math.random().toString(36).slice(2),
        'Test',
        'coach'
      );

      assert.equal(result, undefined);
    });

    it('should emit BOOKING_CANCELLED event', async () => {
      const events: any[] = [];
      const unsub = onTyped(ServiceEvents.BOOKING_CANCELLED, (payload) => {
        events.push(payload);
      });

      const createResult = await bookingCrudService.createBooking({
        coachId: 'coach-' + Math.random().toString(36).slice(2),
        coachName: 'Test Coach',
        athleteIds: ['athlete-' + Math.random().toString(36).slice(2)],
        athleteNames: ['Test Athlete'],
        bookedById: 'parent-' + Math.random().toString(36).slice(2),
        bookedByName: 'Test Parent',
        scheduledAt: new Date(Date.now() + 86400000).toISOString(),
        duration: 60,
        location: 'Test Field',
        service: '1-on-1',
        serviceType: 'COACHING',
        skipAvailabilityValidation: true,
      });

      assert.ok(createResult.success);
      await bookingCrudService.cancel(createResult.data.id, 'Test reason', 'coach');

      assert.equal(events.length, 1);
      assert.equal(events[0].bookingId, createResult.data.id);
      unsub();
    });

    it('should not emit BOOKING_CANCELLED when persistence fails', async () => {
      const createResult = await bookingCrudService.createBooking({
        coachId: 'coach-' + Math.random().toString(36).slice(2),
        coachName: 'Test Coach',
        athleteIds: ['athlete-' + Math.random().toString(36).slice(2)],
        athleteNames: ['Test Athlete'],
        bookedById: 'parent-' + Math.random().toString(36).slice(2),
        bookedByName: 'Test Parent',
        scheduledAt: new Date(Date.now() + 86400000).toISOString(),
        duration: 60,
        location: 'Test Field',
        service: '1-on-1',
        serviceType: 'COACHING',
        skipAvailabilityValidation: true,
      });
      assert.ok(createResult.success);

      const events: any[] = [];
      const unsub = onTyped(ServiceEvents.BOOKING_CANCELLED, (payload) => {
        events.push(payload);
      });

      const apiClientMutable = apiClient as unknown as { set: typeof apiClient.set };
      const originalSet = apiClientMutable.set;
      apiClientMutable.set = async () => {
        throw new Error('forced cancel write failure');
      };

      try {
        const result = await bookingCrudService.cancel(createResult.data.id, 'Schedule conflict', 'coach');
        assert.equal(result, undefined);
        assert.equal(events.length, 0);
      } finally {
        apiClientMutable.set = originalSet;
        unsub();
      }
    });
  });

  describe('reopen', () => {
    it('should restore a cancelled booking to its prior active status', async () => {
      const createResult = await bookingCrudService.createBooking({
        coachId: 'coach-' + Math.random().toString(36).slice(2),
        coachName: 'Test Coach',
        athleteIds: ['athlete-' + Math.random().toString(36).slice(2)],
        athleteNames: ['Test Athlete'],
        bookedById: 'parent-' + Math.random().toString(36).slice(2),
        bookedByName: 'Test Parent',
        scheduledAt: new Date(Date.now() + 86400000).toISOString(),
        duration: 60,
        location: 'Test Field',
        service: '1-on-1',
        serviceType: 'COACHING',
        skipAvailabilityValidation: true,
      });

      assert.ok(createResult.success);
      const cancelResult = await bookingCrudService.cancel(
        createResult.data.id,
        'Schedule conflict',
        'coach',
      );

      assert.ok(cancelResult);
      const reopenResult = await bookingCrudService.reopen(createResult.data.id, 'coach');

      assert.ok(reopenResult);
      assert.equal(reopenResult.status, 'CONFIRMED');
      assert.equal(reopenResult.cancelReason, undefined);
      assert.equal(reopenResult.cancelledAt, undefined);
      assert.equal(reopenResult.statusBeforeCancellation, undefined);
    });

    it('should return undefined when reopening a non-cancelled booking', async () => {
      const createResult = await bookingCrudService.createBooking({
        coachId: 'coach-' + Math.random().toString(36).slice(2),
        coachName: 'Test Coach',
        athleteIds: ['athlete-' + Math.random().toString(36).slice(2)],
        athleteNames: ['Test Athlete'],
        bookedById: 'parent-' + Math.random().toString(36).slice(2),
        bookedByName: 'Test Parent',
        scheduledAt: new Date(Date.now() + 86400000).toISOString(),
        duration: 60,
        location: 'Test Field',
        service: '1-on-1',
        serviceType: 'COACHING',
        skipAvailabilityValidation: true,
      });

      assert.ok(createResult.success);
      const reopenResult = await bookingCrudService.reopen(createResult.data.id, 'parent');

      assert.equal(reopenResult, undefined);
    });
  });
});
