/**
 * Event Display Service Tests
 *
 * Pure synchronous formatting helpers — no storage, no async.
 */

import assert from 'node:assert/strict';
import test, { describe } from 'node:test';

import { eventDisplayService } from '../../services/event/event-display-service';

describe('eventDisplayService', () => {
  describe('formatEventType', () => {
    test('formats known event types', () => {
      assert.equal(eventDisplayService.formatEventType('SOCIAL'), 'Social Event');
      assert.equal(eventDisplayService.formatEventType('TOURNAMENT'), 'Tournament');
      assert.equal(eventDisplayService.formatEventType('FUNDRAISER'), 'Fundraiser');
      assert.equal(eventDisplayService.formatEventType('TRAINING_CAMP'), 'Training Camp');
      assert.equal(eventDisplayService.formatEventType('MEETING'), 'Meeting');
    });
  });

  describe('getEventTypeIcon', () => {
    test('returns icon for each event type', () => {
      const icon = eventDisplayService.getEventTypeIcon('SOCIAL');
      assert.equal(typeof icon, 'string');
      assert.ok(icon.length > 0);
    });
  });

  describe('getEventTypeColor', () => {
    test('returns a color string for each type', () => {
      const color = eventDisplayService.getEventTypeColor('SOCIAL');
      assert.equal(typeof color, 'string');
      assert.ok(color.startsWith('#'));
    });
  });

  describe('formatAudience', () => {
    test('formats known audience types', () => {
      assert.equal(eventDisplayService.formatAudience('ALL'), 'Everyone');
      assert.equal(eventDisplayService.formatAudience('PARENTS'), 'Parents');
      assert.equal(eventDisplayService.formatAudience('COACHES'), 'Coaches Only');
    });
  });

  describe('formatPrice', () => {
    test('returns Free for zero price', () => {
      assert.equal(eventDisplayService.formatPrice(0), 'Free');
    });

    test('formats non-zero price in GBP', () => {
      const result = eventDisplayService.formatPrice(25);
      assert.ok(result.includes('25'));
    });

    test('formats with explicit GBP currency', () => {
      const result = eventDisplayService.formatPrice(10, 'GBP');
      assert.ok(result.includes('10'));
    });
  });

  describe('formatEventDate', () => {
    test('formats a date string', () => {
      const result = eventDisplayService.formatEventDate('2026-03-15');
      assert.equal(typeof result, 'string');
      assert.ok(result.includes('March') || result.includes('Mar'));
    });
  });

  describe('formatEventTime', () => {
    test('formats start time only', () => {
      assert.equal(eventDisplayService.formatEventTime('14:00'), '14:00');
    });

    test('formats start and end time', () => {
      assert.equal(eventDisplayService.formatEventTime('14:00', '16:00'), '14:00 - 16:00');
    });
  });

  describe('formatRSVPStatus', () => {
    test('formats all statuses', () => {
      assert.equal(eventDisplayService.formatRSVPStatus('GOING'), 'Going');
      assert.equal(eventDisplayService.formatRSVPStatus('NOT_GOING'), "Can't Go");
      assert.equal(eventDisplayService.formatRSVPStatus('MAYBE'), 'Maybe');
    });
  });

  describe('getRSVPStatusColor', () => {
    test('returns green for GOING', () => {
      const color = eventDisplayService.getRSVPStatusColor('GOING');
      assert.equal(color, '#10B981');
    });

    test('returns red for NOT_GOING', () => {
      assert.equal(eventDisplayService.getRSVPStatusColor('NOT_GOING'), '#EF4444');
    });

    test('returns amber for MAYBE', () => {
      assert.equal(eventDisplayService.getRSVPStatusColor('MAYBE'), '#F59E0B');
    });
  });

  describe('getRSVPStatusIcon', () => {
    test('returns icon names for statuses', () => {
      assert.equal(eventDisplayService.getRSVPStatusIcon('GOING'), 'checkmark-circle');
      assert.equal(eventDisplayService.getRSVPStatusIcon('NOT_GOING'), 'close-circle');
      assert.equal(eventDisplayService.getRSVPStatusIcon('MAYBE'), 'help-circle');
    });
  });

  describe('formatTimeAgo', () => {
    test('returns "Just now" for very recent times', () => {
      const now = new Date().toISOString();
      assert.equal(eventDisplayService.formatTimeAgo(now), 'Just now');
    });

    test('returns minutes ago for recent times', () => {
      const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      assert.equal(eventDisplayService.formatTimeAgo(tenMinsAgo), '10m ago');
    });

    test('returns hours ago', () => {
      const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
      assert.equal(eventDisplayService.formatTimeAgo(threeHoursAgo), '3h ago');
    });

    test('returns Yesterday for 1 day ago', () => {
      const yesterday = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
      assert.equal(eventDisplayService.formatTimeAgo(yesterday), 'Yesterday');
    });
  });
});
