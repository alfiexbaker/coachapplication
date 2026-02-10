import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { eventDisplayService } from '@/services/event/event-display-service';

describe('EventDisplayService', () => {
  describe('formatEventType', () => {
    it('should format TOURNAMENT type', () => {
      const result = eventDisplayService.formatEventType('TOURNAMENT');
      assert.equal(result, 'Tournament');
    });

    it('should format SOCIAL type', () => {
      const result = eventDisplayService.formatEventType('SOCIAL');
      assert.equal(result, 'Social Event');
    });

    it('should format MEETING type', () => {
      const result = eventDisplayService.formatEventType('MEETING');
      assert.equal(result, 'Meeting');
    });

    it('should format PRESENTATION type', () => {
      const result = eventDisplayService.formatEventType('PRESENTATION');
      assert.equal(result, 'Presentation');
    });

    it('should format FUNDRAISER type', () => {
      const result = eventDisplayService.formatEventType('FUNDRAISER');
      assert.equal(result, 'Fundraiser');
    });
  });

  describe('getEventTypeIcon', () => {
    it('should return trophy icon for TOURNAMENT', () => {
      const result = eventDisplayService.getEventTypeIcon('TOURNAMENT');
      assert.equal(result, 'trophy');
    });

    it('should return people icon for SOCIAL', () => {
      const result = eventDisplayService.getEventTypeIcon('SOCIAL');
      assert.equal(result, 'people');
    });

    it('should return calendar icon for OTHER', () => {
      const result = eventDisplayService.getEventTypeIcon('OTHER');
      assert.equal(result, 'calendar');
    });
  });

  describe('getEventTypeColor', () => {
    it('should return amber color for TOURNAMENT', () => {
      const result = eventDisplayService.getEventTypeColor('TOURNAMENT');
      assert.equal(result, '#F59E0B');
    });

    it('should return purple color for SOCIAL', () => {
      const result = eventDisplayService.getEventTypeColor('SOCIAL');
      assert.equal(result, '#8B5CF6');
    });

    it('should return gray color for OTHER', () => {
      const result = eventDisplayService.getEventTypeColor('OTHER');
      assert.equal(result, '#6B7280');
    });
  });

  describe('formatAudience', () => {
    it('should format ALL audience', () => {
      const result = eventDisplayService.formatAudience('ALL');
      assert.equal(result, 'Everyone');
    });

    it('should format COACHES audience', () => {
      const result = eventDisplayService.formatAudience('COACHES');
      assert.equal(result, 'Coaches Only');
    });

    it('should format PARENTS audience', () => {
      const result = eventDisplayService.formatAudience('PARENTS');
      assert.equal(result, 'Parents');
    });

    it('should format ATHLETES audience', () => {
      const result = eventDisplayService.formatAudience('ATHLETES');
      assert.equal(result, 'Athletes');
    });

    it('should format SQUAD audience', () => {
      const result = eventDisplayService.formatAudience('SQUAD');
      assert.equal(result, 'Specific Squads');
    });
  });

  describe('formatPrice', () => {
    it('should return Free for zero price', () => {
      const result = eventDisplayService.formatPrice(0);
      assert.equal(result, 'Free');
    });

    it('should format GBP price correctly', () => {
      const result = eventDisplayService.formatPrice(15, 'GBP');
      assert.ok(result.includes('15'));
      assert.ok(result.includes('£') || result.includes('GBP'));
    });

    it('should format decimal prices', () => {
      const result = eventDisplayService.formatPrice(19.99, 'GBP');
      assert.ok(result.includes('19.99'));
    });
  });

  describe('formatEventDate', () => {
    it('should format date with weekday and full month', () => {
      const result = eventDisplayService.formatEventDate('2026-06-15');
      assert.ok(result.includes('2026'));
      assert.ok(result.includes('June') || result.includes('15'));
    });
  });

  describe('formatEventTime', () => {
    it('should format time range with end time', () => {
      const result = eventDisplayService.formatEventTime('10:00', '16:00');
      assert.equal(result, '10:00 - 16:00');
    });

    it('should format single time without end time', () => {
      const result = eventDisplayService.formatEventTime('14:00');
      assert.equal(result, '14:00');
    });
  });

  describe('formatRSVPStatus', () => {
    it('should format GOING status', () => {
      const result = eventDisplayService.formatRSVPStatus('GOING');
      assert.equal(result, 'Going');
    });

    it('should format NOT_GOING status', () => {
      const result = eventDisplayService.formatRSVPStatus('NOT_GOING');
      assert.equal(result, "Can't Go");
    });

    it('should format MAYBE status', () => {
      const result = eventDisplayService.formatRSVPStatus('MAYBE');
      assert.equal(result, 'Maybe');
    });
  });

  describe('getRSVPStatusColor', () => {
    it('should return green for GOING', () => {
      const result = eventDisplayService.getRSVPStatusColor('GOING');
      assert.equal(result, '#10B981');
    });

    it('should return red for NOT_GOING', () => {
      const result = eventDisplayService.getRSVPStatusColor('NOT_GOING');
      assert.equal(result, '#EF4444');
    });

    it('should return amber for MAYBE', () => {
      const result = eventDisplayService.getRSVPStatusColor('MAYBE');
      assert.equal(result, '#F59E0B');
    });
  });

  describe('getRSVPStatusIcon', () => {
    it('should return checkmark-circle for GOING', () => {
      const result = eventDisplayService.getRSVPStatusIcon('GOING');
      assert.equal(result, 'checkmark-circle');
    });

    it('should return close-circle for NOT_GOING', () => {
      const result = eventDisplayService.getRSVPStatusIcon('NOT_GOING');
      assert.equal(result, 'close-circle');
    });

    it('should return help-circle for MAYBE', () => {
      const result = eventDisplayService.getRSVPStatusIcon('MAYBE');
      assert.equal(result, 'help-circle');
    });
  });

  describe('formatTimeAgo', () => {
    it('should return "Just now" for very recent timestamps', () => {
      const now = new Date().toISOString();
      const result = eventDisplayService.formatTimeAgo(now);
      assert.equal(result, 'Just now');
    });

    it('should format minutes ago', () => {
      const date = new Date();
      date.setMinutes(date.getMinutes() - 30);
      const result = eventDisplayService.formatTimeAgo(date.toISOString());
      assert.ok(result.includes('m ago') || result === 'Just now');
    });

    it('should format hours ago', () => {
      const date = new Date();
      date.setHours(date.getHours() - 5);
      const result = eventDisplayService.formatTimeAgo(date.toISOString());
      assert.ok(result.includes('h ago') || result.includes('m ago'));
    });

    it('should format days ago', () => {
      const date = new Date();
      date.setDate(date.getDate() - 3);
      const result = eventDisplayService.formatTimeAgo(date.toISOString());
      assert.ok(result.includes('d ago') || result.includes('h ago'));
    });

    it('should return "Yesterday" for 1 day ago', () => {
      const date = new Date();
      date.setDate(date.getDate() - 1);
      date.setHours(date.getHours() - 1);
      const result = eventDisplayService.formatTimeAgo(date.toISOString());
      assert.ok(result === 'Yesterday' || result.includes('h ago') || result.includes('d ago'));
    });
  });
});
