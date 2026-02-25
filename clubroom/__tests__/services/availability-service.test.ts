/**
 * Availability Service Tests
 *
 * Tests for coach availability templates, overrides, blocked dates,
 * and slot generation.
 */

import assert from 'node:assert/strict';
import test, { describe, beforeEach } from 'node:test';

import { availabilityService } from '@/services/availability-service';
import { apiClient } from '@/services/api-client';
import { STORAGE_KEYS } from '@/constants/storage-keys';

const rid = () => Math.random().toString(36).slice(2, 10);

describe('availabilityService', () => {
  beforeEach(async () => {
    await apiClient.remove(STORAGE_KEYS.AVAILABILITY_TEMPLATES);
    await apiClient.remove(STORAGE_KEYS.AVAILABILITY_OVERRIDES);
    await apiClient.remove(STORAGE_KEYS.BLOCKED_DATES);
    await apiClient.remove(STORAGE_KEYS.BOOKINGS);
    await apiClient.remove(STORAGE_KEYS.SESSION_OFFERINGS);
  });

  // ---------------------------------------------------------------------------
  // getTemplates
  // ---------------------------------------------------------------------------
  describe('getTemplates', () => {
    test('returns array for known coach (may include mock data)', async () => {
      const templates = await availabilityService.getTemplates('coach1');
      assert.ok(Array.isArray(templates));
      // Mock data includes coach1 templates
      assert.ok(templates.length > 0);
    });

    test('returns empty array for unknown coach (with no stored data)', async () => {
      const coachId = `coach_unknown_${rid()}`;
      const templates = await availabilityService.getTemplates(coachId);
      assert.ok(Array.isArray(templates));
      assert.equal(templates.length, 0);
    });
  });

  // ---------------------------------------------------------------------------
  // saveTemplate
  // ---------------------------------------------------------------------------
  describe('saveTemplate', () => {
    test('returns saved template with generated ID', async () => {
      const coachId = `coach_${rid()}`;
      const saved = await availabilityService.saveTemplate({
        coachId,
        dayOfWeek: 2,
        startTime: '10:00',
        endTime: '14:00',
        isRecurring: true,
        maxConcurrent: 1,
        bufferMinutes: 15,
        location: 'Test Park',
      });

      assert.ok(saved.id);
      assert.ok(saved.id.startsWith('tmpl'));
      assert.equal(saved.coachId, coachId);
      assert.equal(saved.dayOfWeek, 2);
      assert.equal(saved.startTime, '10:00');
      assert.equal(saved.endTime, '14:00');
      assert.equal(saved.location, 'Test Park');
    });

    test('preserves existing ID on update', async () => {
      const coachId = `coach_${rid()}`;
      const saved = await availabilityService.saveTemplate({
        coachId,
        dayOfWeek: 1,
        startTime: '09:00',
        endTime: '12:00',
        isRecurring: true,
        maxConcurrent: 1,
        bufferMinutes: 15,
      });

      const updated = await availabilityService.saveTemplate({
        ...saved,
        endTime: '13:00',
      });

      assert.equal(updated.id, saved.id);
      assert.equal(updated.endTime, '13:00');
    });

    test('saved template appears in getTemplates', async () => {
      const coachId = `coach_${rid()}`;
      await availabilityService.saveTemplate({
        coachId,
        dayOfWeek: 3,
        startTime: '16:00',
        endTime: '19:00',
        isRecurring: true,
        maxConcurrent: 1,
        bufferMinutes: 15,
      });

      const templates = await availabilityService.getTemplates(coachId);
      assert.ok(templates.length >= 1);
      assert.ok(templates.some((t) => t.coachId === coachId && t.dayOfWeek === 3));
    });
  });

  // ---------------------------------------------------------------------------
  // deleteTemplate
  // ---------------------------------------------------------------------------
  describe('deleteTemplate', () => {
    test('removes template from storage', async () => {
      const coachId = `coach_${rid()}`;
      const saved = await availabilityService.saveTemplate({
        coachId,
        dayOfWeek: 4,
        startTime: '10:00',
        endTime: '12:00',
        isRecurring: true,
        maxConcurrent: 1,
        bufferMinutes: 15,
      });

      await availabilityService.deleteTemplate(saved.id);

      const templates = await availabilityService.getTemplates(coachId);
      assert.ok(!templates.some((t) => t.id === saved.id));
    });

    test('deleting non-existent template does not throw', async () => {
      await availabilityService.deleteTemplate(`tmpl_nonexistent_${rid()}`);
      // Should complete without error
    });
  });

  // ---------------------------------------------------------------------------
  // getOverrides
  // ---------------------------------------------------------------------------
  describe('getOverrides', () => {
    test('returns array for coach', async () => {
      const overrides = await availabilityService.getOverrides('coach1');
      assert.ok(Array.isArray(overrides));
    });

    test('filters by date range', async () => {
      const coachId = `coach_${rid()}`;
      await availabilityService.saveOverride({
        coachId,
        date: '2026-03-10',
        isBlocked: true,
        reason: 'Holiday',
      });
      await availabilityService.saveOverride({
        coachId,
        date: '2026-04-15',
        isBlocked: true,
        reason: 'Training',
      });

      const filtered = await availabilityService.getOverrides(coachId, '2026-03-01', '2026-03-31');
      assert.ok(filtered.every((o) => o.date >= '2026-03-01' && o.date <= '2026-03-31'));
      assert.ok(filtered.some((o) => o.date === '2026-03-10'));
      assert.ok(!filtered.some((o) => o.date === '2026-04-15'));
    });
  });

  // ---------------------------------------------------------------------------
  // blockDate
  // ---------------------------------------------------------------------------
  describe('blockDate', () => {
    test('creates a blocked override for the date', async () => {
      const coachId = `coach_${rid()}`;
      const override = await availabilityService.blockDate(coachId, '2026-05-01', 'Personal');

      assert.ok(override.id);
      assert.equal(override.coachId, coachId);
      assert.equal(override.date, '2026-05-01');
      assert.equal(override.isBlocked, true);
      assert.equal(override.reason, 'Personal');
    });

    test('blocked date appears in overrides', async () => {
      const coachId = `coach_${rid()}`;
      await availabilityService.blockDate(coachId, '2026-06-15', 'Conference');

      const overrides = await availabilityService.getOverrides(coachId);
      assert.ok(overrides.some((o) => o.date === '2026-06-15' && o.isBlocked === true));
    });
  });

  // ---------------------------------------------------------------------------
  // unblockDate
  // ---------------------------------------------------------------------------
  describe('unblockDate', () => {
    test('removes block for the specified date', async () => {
      const coachId = `coach_${rid()}`;
      await availabilityService.blockDate(coachId, '2026-07-01', 'Off day');

      await availabilityService.unblockDate(coachId, '2026-07-01');

      const overrides = await availabilityService.getOverrides(coachId);
      assert.ok(!overrides.some((o) => o.coachId === coachId && o.date === '2026-07-01'));
    });

    test('unblocking non-blocked date does not throw', async () => {
      const coachId = `coach_${rid()}`;
      await availabilityService.unblockDate(coachId, '2026-12-25');
      // Should complete without error
    });
  });

  // ---------------------------------------------------------------------------
  // getAvailableSlots
  // ---------------------------------------------------------------------------
  describe('getAvailableSlots', () => {
    test('returns slots array for coach with templates', async () => {
      const coachId = `coach_${rid()}`;
      // Create a template for Monday (dayOfWeek 1)
      await availabilityService.saveTemplate({
        coachId,
        dayOfWeek: 1, // Monday
        startTime: '10:00',
        endTime: '12:00',
        isRecurring: true,
        maxConcurrent: 1,
        bufferMinutes: 15,
      });

      // Find a Monday in the range
      const start = new Date('2026-03-02'); // Monday
      const end = new Date('2026-03-08'); // Sunday

      const slots = await availabilityService.getAvailableSlots(
        coachId,
        '2026-03-02',
        '2026-03-08',
      );

      assert.ok(Array.isArray(slots));
      // Should have at least one slot on Monday
      const mondaySlots = slots.filter((s) => s.date === '2026-03-02');
      assert.ok(mondaySlots.length > 0);
    });

    test('returns empty array for coach with no templates', async () => {
      const coachId = `coach_no_templates_${rid()}`;
      const slots = await availabilityService.getAvailableSlots(
        coachId,
        '2026-03-02',
        '2026-03-08',
      );
      assert.ok(Array.isArray(slots));
      assert.equal(slots.length, 0);
    });

    test('excludes blocked dates from slots', async () => {
      const coachId = `coach_${rid()}`;
      // Template for Monday
      await availabilityService.saveTemplate({
        coachId,
        dayOfWeek: 1,
        startTime: '10:00',
        endTime: '12:00',
        isRecurring: true,
        maxConcurrent: 1,
        bufferMinutes: 15,
      });

      // Block the Monday
      await availabilityService.blockDate(coachId, '2026-03-02', 'Blocked');

      const slots = await availabilityService.getAvailableSlots(
        coachId,
        '2026-03-02',
        '2026-03-08',
      );

      const mondaySlots = slots.filter((s) => s.date === '2026-03-02');
      assert.equal(mondaySlots.length, 0);
    });

    test('slots are sorted by date then time', async () => {
      const coachId = `coach_${rid()}`;
      // Templates for two days
      await availabilityService.saveTemplate({
        coachId,
        dayOfWeek: 1,
        startTime: '14:00',
        endTime: '16:00',
        isRecurring: true,
        maxConcurrent: 1,
        bufferMinutes: 15,
      });
      await availabilityService.saveTemplate({
        coachId,
        dayOfWeek: 1,
        startTime: '09:00',
        endTime: '11:00',
        isRecurring: true,
        maxConcurrent: 1,
        bufferMinutes: 15,
      });

      const slots = await availabilityService.getAvailableSlots(
        coachId,
        '2026-03-02',
        '2026-03-08',
      );

      for (let i = 1; i < slots.length; i++) {
        const prev = `${slots[i - 1].date}T${slots[i - 1].startTime}`;
        const curr = `${slots[i].date}T${slots[i].startTime}`;
        assert.ok(prev <= curr, `Slots not sorted: ${prev} > ${curr}`);
      }
    });
  });

  // ---------------------------------------------------------------------------
  // getAvailabilitySummary
  // ---------------------------------------------------------------------------
  describe('getAvailabilitySummary', () => {
    test('returns summary object with expected fields', async () => {
      const coachId = `coach_${rid()}`;
      await availabilityService.saveTemplate({
        coachId,
        dayOfWeek: 2,
        startTime: '10:00',
        endTime: '14:00',
        isRecurring: true,
        maxConcurrent: 1,
        bufferMinutes: 15,
      });

      const summary = await availabilityService.getAvailabilitySummary(coachId);

      assert.ok(typeof summary.weeklyHours === 'number');
      assert.ok(summary.weeklyHours > 0);
      assert.ok(Array.isArray(summary.daysAvailable));
      assert.ok(summary.daysAvailable.length > 0);
    });

    test('returns zero hours for coach with no templates', async () => {
      const coachId = `coach_empty_${rid()}`;
      const summary = await availabilityService.getAvailabilitySummary(coachId);

      assert.equal(summary.weeklyHours, 0);
      assert.equal(summary.daysAvailable.length, 0);
    });
  });
});
