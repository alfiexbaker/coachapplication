import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { findRepeatSlot } from '@/services/invite/repeat-invite-helper';
import { apiClient } from '@/services/api-client';
import { STORAGE_KEYS } from '@/constants/storage-keys';

describe('RepeatInviteHelper', () => {
  beforeEach(async () => {
    await apiClient.remove(STORAGE_KEYS.AVAILABILITY);
  });

  describe('findRepeatSlot', () => {
    it('should return null primarySlot when coach has no availability', async () => {
      const coachId = 'test-coach-' + Math.random().toString(36).slice(2);
      const originalDate = '2026-03-15';
      const originalStartTime = '14:00';

      const result = await findRepeatSlot(coachId, originalDate, originalStartTime);

      assert.equal(result.primarySlot, null);
      assert.equal(result.alternatives.length, 0);
    });

    it('should find primary slot one week later at same time', async () => {
      const coachId = 'test-coach-' + Math.random().toString(36).slice(2);
      const originalDate = '2026-03-15';
      const originalStartTime = '14:00';

      // Mock availability one week later
      const nextWeekDate = '2026-03-22';
      const availability = [
        {
          id: 'test-slot-' + Math.random().toString(36).slice(2),
          coachId,
          date: nextWeekDate,
          startTime: '14:00',
          endTime: '15:00',
          status: 'AVAILABLE' as const,
          sessionTemplateId: undefined,
        },
      ];

      await apiClient.set(STORAGE_KEYS.AVAILABILITY, availability);

      const result = await findRepeatSlot(coachId, originalDate, originalStartTime);

      assert.ok(result.primarySlot);
      assert.equal(result.primarySlot.date, nextWeekDate);
      assert.equal(result.primarySlot.startTime, '14:00');
    });

    it('should provide alternatives when primary slot not available', async () => {
      const coachId = 'test-coach-' + Math.random().toString(36).slice(2);
      const originalDate = '2026-03-15';
      const originalStartTime = '14:00';

      const nextWeekDate = '2026-03-22';
      const availability = [
        {
          id: 'test-slot-1-' + Math.random().toString(36).slice(2),
          coachId,
          date: nextWeekDate,
          startTime: '15:00',
          endTime: '16:00',
          status: 'AVAILABLE' as const,
          sessionTemplateId: undefined,
        },
        {
          id: 'test-slot-2-' + Math.random().toString(36).slice(2),
          coachId,
          date: nextWeekDate,
          startTime: '16:00',
          endTime: '17:00',
          status: 'AVAILABLE' as const,
          sessionTemplateId: undefined,
        },
      ];

      await apiClient.set(STORAGE_KEYS.AVAILABILITY, availability);

      const result = await findRepeatSlot(coachId, originalDate, originalStartTime);

      assert.equal(result.primarySlot, null);
      assert.ok(result.alternatives.length > 0);
    });

    it('should limit alternatives to max 5', async () => {
      const coachId = 'test-coach-' + Math.random().toString(36).slice(2);
      const originalDate = '2026-03-15';
      const originalStartTime = '14:00';

      const nextWeekDate = '2026-03-22';
      const availability = Array.from({ length: 10 }, (_, i) => ({
        id: 'test-slot-' + i + '-' + Math.random().toString(36).slice(2),
        coachId,
        date: nextWeekDate,
        startTime: `${10 + i}:00`,
        endTime: `${11 + i}:00`,
        status: 'AVAILABLE' as const,
        sessionTemplateId: undefined,
      }));

      await apiClient.set(STORAGE_KEYS.AVAILABILITY, availability);

      const result = await findRepeatSlot(coachId, originalDate, originalStartTime);

      assert.ok(result.alternatives.length <= 5);
    });

    it('should exclude primary slot from alternatives', async () => {
      const coachId = 'test-coach-' + Math.random().toString(36).slice(2);
      const originalDate = '2026-03-15';
      const originalStartTime = '14:00';

      const nextWeekDate = '2026-03-22';
      const availability = [
        {
          id: 'test-slot-primary-' + Math.random().toString(36).slice(2),
          coachId,
          date: nextWeekDate,
          startTime: '14:00',
          endTime: '15:00',
          status: 'AVAILABLE' as const,
          sessionTemplateId: undefined,
        },
        {
          id: 'test-slot-alt-' + Math.random().toString(36).slice(2),
          coachId,
          date: nextWeekDate,
          startTime: '15:00',
          endTime: '16:00',
          status: 'AVAILABLE' as const,
          sessionTemplateId: undefined,
        },
      ];

      await apiClient.set(STORAGE_KEYS.AVAILABILITY, availability);

      const result = await findRepeatSlot(coachId, originalDate, originalStartTime);

      assert.ok(result.primarySlot);
      assert.equal(result.primarySlot.startTime, '14:00');
      // Primary should not be in alternatives
      const hasPrimaryInAlts = result.alternatives.some(
        (alt) => alt.startTime === '14:00' && alt.date === nextWeekDate
      );
      assert.equal(hasPrimaryInAlts, false);
    });

    it('should handle optional sessionTemplateId parameter', async () => {
      const coachId = 'test-coach-' + Math.random().toString(36).slice(2);
      const originalDate = '2026-03-15';
      const originalStartTime = '14:00';
      const templateId = 'test-template-' + Math.random().toString(36).slice(2);

      const result = await findRepeatSlot(coachId, originalDate, originalStartTime, templateId);

      // Should complete without error even if no matches
      assert.ok(result);
      assert.ok(result.primarySlot !== undefined);
      assert.ok(Array.isArray(result.alternatives));
    });
  });
});
