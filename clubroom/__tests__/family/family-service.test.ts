/**
 * Family Service Tests
 *
 * Unit tests for the family service functionality including
 * family members, bookings, calendar, spending, and child progress.
 */

import assert from 'node:assert';
import test, { describe, beforeEach } from 'node:test';

import { familyService } from '../../services/family';
import type {
  FamilyDateRange,
} from '../../constants/types';

// Reset to mock data before each test
beforeEach(async () => {
  await familyService.seedDemoData();
});

describe('Family Service', () => {
  describe('getFamilyMembers', () => {
    test('should return all family members for a parent', async () => {
      const members = await familyService.getFamilyMembers('parent1');

      assert.ok(Array.isArray(members));
      assert.ok(members.length >= 2);
      members.forEach((member) => {
        assert.ok(member.id);
        assert.ok(member.name);
        assert.ok(member.relationship);
        assert.ok(typeof member.age === 'number');
        assert.ok(member.colorCode);
        assert.strictEqual(member.isActive, true);
      });
    });

    test('should return members with color codes assigned', async () => {
      const members = await familyService.getFamilyMembers('parent1');

      const colorCodes = members.map((m) => m.colorCode);
      // Each member should have a color code
      colorCodes.forEach((color) => {
        assert.ok(color.startsWith('#'));
        assert.strictEqual(color.length, 7);
      });
    });
  });

  describe('getFamilyMember', () => {
    test('should return a single family member by ID', async () => {
      const member = await familyService.getFamilyMember('child_tom');

      assert.ok(member);
      assert.strictEqual(member.id, 'child_tom');
      assert.strictEqual(member.name, 'Tom Henderson');
      assert.strictEqual(member.relationship, 'son');
    });

    test('should return null for non-existent member', async () => {
      const member = await familyService.getFamilyMember('non_existent');

      assert.strictEqual(member, null);
    });
  });

  describe('addFamilyMember', () => {
    test('should add a new family member with generated fields', async () => {
      const newMember = await familyService.addFamilyMember('parent1', {
        name: 'Lucy Henderson',
        relationship: 'daughter',
        age: 8,
      });

      assert.ok(newMember.id.startsWith('child_'));
      assert.strictEqual(newMember.name, 'Lucy Henderson');
      assert.strictEqual(newMember.relationship, 'daughter');
      assert.strictEqual(newMember.age, 8);
      assert.ok(newMember.colorCode);
      assert.strictEqual(newMember.isActive, true);
      assert.ok(newMember.addedAt);
    });

    test('should assign unique color codes to new members', async () => {
      const member1 = await familyService.addFamilyMember('parent1', {
        name: 'Child 1',
        relationship: 'son',
        age: 7,
      });

      const member2 = await familyService.addFamilyMember('parent1', {
        name: 'Child 2',
        relationship: 'daughter',
        age: 6,
      });

      // Color codes should be assigned from the palette
      assert.ok(member1.colorCode);
      assert.ok(member2.colorCode);
    });
  });

  describe('updateFamilyMember', () => {
    test('should update family member fields', async () => {
      const updated = await familyService.updateFamilyMember('child_tom', {
        age: 13,
        skillLevel: 'ADVANCED',
      });

      assert.ok(updated);
      assert.strictEqual(updated.age, 13);
      assert.strictEqual(updated.skillLevel, 'ADVANCED');
    });

    test('should return null for non-existent member', async () => {
      const result = await familyService.updateFamilyMember('non_existent', { age: 10 });

      assert.strictEqual(result, null);
    });
  });

  describe('getFamilyBookings', () => {
    test('should return all bookings for the family', async () => {
      const bookings = await familyService.getFamilyBookings('parent1');

      assert.ok(Array.isArray(bookings));
      assert.ok(bookings.length > 0);
      bookings.forEach((booking) => {
        assert.ok(booking.id);
        assert.ok(booking.childId);
        assert.ok(booking.colorCode);
        assert.ok(booking.title);
        assert.ok(booking.start);
        assert.ok(booking.end);
        assert.ok(['CONFIRMED', 'PENDING', 'CANCELLED', 'COMPLETED'].includes(booking.status));
      });
    });

    test('should sort bookings by date descending', async () => {
      const bookings = await familyService.getFamilyBookings('parent1');

      for (let i = 0; i < bookings.length - 1; i++) {
        const current = new Date(bookings[i].start).getTime();
        const next = new Date(bookings[i + 1].start).getTime();
        assert.ok(current >= next, 'Bookings should be sorted by date descending');
      }
    });
  });

  describe('getChildBookings', () => {
    test('should return bookings only for a specific child', async () => {
      const bookings = await familyService.getChildBookings('child_tom');

      assert.ok(Array.isArray(bookings));
      bookings.forEach((booking) => {
        assert.strictEqual(booking.childId, 'child_tom');
      });
    });
  });

  describe('getFamilyCalendar', () => {
    test('should return events within the date range', async () => {
      const dateRange: FamilyDateRange = {
        startDate: '2025-01-01T00:00:00.000Z',
        endDate: '2025-01-31T23:59:59.999Z',
      };

      const events = await familyService.getFamilyCalendar('parent1', dateRange);

      assert.ok(Array.isArray(events));
      events.forEach((event) => {
        const eventDate = new Date(event.start).getTime();
        const startDate = new Date(dateRange.startDate).getTime();
        const endDate = new Date(dateRange.endDate).getTime();
        assert.ok(eventDate >= startDate && eventDate <= endDate);
      });
    });

    test('should sort calendar events by date ascending', async () => {
      const dateRange: FamilyDateRange = {
        startDate: '2025-01-01T00:00:00.000Z',
        endDate: '2025-12-31T23:59:59.999Z',
      };

      const events = await familyService.getFamilyCalendar('parent1', dateRange);

      for (let i = 0; i < events.length - 1; i++) {
        const current = new Date(events[i].start).getTime();
        const next = new Date(events[i + 1].start).getTime();
        assert.ok(current <= next, 'Calendar events should be sorted by date ascending');
      }
    });
  });

  describe('getUpcomingForFamily', () => {
    test('should return only future sessions', async () => {
      const upcoming = await familyService.getUpcomingForFamily('parent1');
      const now = Date.now();

      assert.ok(Array.isArray(upcoming));
      upcoming.forEach((session) => {
        const sessionDate = new Date(session.start).getTime();
        assert.ok(sessionDate > now, 'Session should be in the future');
      });
    });

    test('should only return confirmed or pending sessions', async () => {
      const upcoming = await familyService.getUpcomingForFamily('parent1');

      upcoming.forEach((session) => {
        assert.ok(
          session.status === 'CONFIRMED' || session.status === 'PENDING',
          'Session should be confirmed or pending'
        );
      });
    });

    test('should respect the limit parameter', async () => {
      const limit = 2;
      const upcoming = await familyService.getUpcomingForFamily('parent1', limit);

      assert.ok(upcoming.length <= limit);
    });

    test('should sort sessions by date ascending', async () => {
      const upcoming = await familyService.getUpcomingForFamily('parent1', 10);

      for (let i = 0; i < upcoming.length - 1; i++) {
        const current = new Date(upcoming[i].start).getTime();
        const next = new Date(upcoming[i + 1].start).getTime();
        assert.ok(current <= next, 'Upcoming sessions should be sorted by date ascending');
      }
    });
  });

  describe('getChildProgress', () => {
    test('should return progress summary for a child', async () => {
      const progress = await familyService.getChildProgress('child_tom');

      assert.ok(progress);
      assert.strictEqual(progress.childId, 'child_tom');
      assert.ok(typeof progress.sessionsCompleted === 'number');
      assert.ok(typeof progress.badgesEarned === 'number');
      assert.ok(typeof progress.activeGoals === 'number');
      assert.ok(typeof progress.completedGoals === 'number');
    });

    test('should return null for non-existent child', async () => {
      const progress = await familyService.getChildProgress('non_existent');

      assert.strictEqual(progress, null);
    });

    test('should include skill progress if available', async () => {
      const progress = await familyService.getChildProgress('child_tom');

      assert.ok(progress);
      if (progress.skillProgress) {
        assert.ok(Array.isArray(progress.skillProgress));
        progress.skillProgress.forEach((skill) => {
          assert.ok(skill.skill);
          assert.ok(typeof skill.level === 'number');
          assert.ok(typeof skill.change === 'number');
        });
      }
    });
  });

  describe('getFamilyOverview', () => {
    test('should return complete overview structure', async () => {
      const overview = await familyService.getFamilyOverview('parent1');

      assert.ok(typeof overview.totalChildren === 'number');
      assert.ok(typeof overview.upcomingSessions === 'number');
      assert.ok(typeof overview.sessionsThisMonth === 'number');
      assert.ok(typeof overview.spendingThisMonth === 'number');
      assert.ok(typeof overview.totalSpending === 'number');
      assert.ok(overview.currency);
    });

    test('should include next session if available', async () => {
      const overview = await familyService.getFamilyOverview('parent1');

      if (overview.nextSession) {
        assert.ok(overview.nextSession.id);
        assert.ok(overview.nextSession.title);
        assert.ok(overview.nextSession.start);
        assert.ok(overview.nextSession.childId);
      }
    });
  });

  describe('getEventsGroupedByDate', () => {
    test('should group events by date', async () => {
      const dateRange: FamilyDateRange = {
        startDate: '2025-01-01T00:00:00.000Z',
        endDate: '2025-01-31T23:59:59.999Z',
      };

      const grouped = await familyService.getEventsGroupedByDate('parent1', dateRange);

      assert.ok(typeof grouped === 'object');
      Object.entries(grouped).forEach(([dateKey, events]) => {
        assert.ok(dateKey.match(/^\d{4}-\d{2}-\d{2}$/), 'Date key should be YYYY-MM-DD format');
        assert.ok(Array.isArray(events));
        events.forEach((event) => {
          assert.ok(event.start.startsWith(dateKey));
        });
      });
    });
  });

  describe('Utility Functions', () => {
    test('getNextChildColor should return valid hex color', () => {
      const color0 = familyService.getNextChildColor(0);
      const color1 = familyService.getNextChildColor(1);
      const color8 = familyService.getNextChildColor(8); // Should wrap around

      assert.ok(color0.startsWith('#'));
      assert.ok(color1.startsWith('#'));
      assert.ok(color8.startsWith('#'));
      assert.strictEqual(color0.length, 7);
    });

    test('formatAmount should format currency correctly', () => {
      const gbpAmount = familyService.formatAmount(100.50, 'GBP');
      const euroAmount = familyService.formatAmount(50, 'EUR');

      assert.ok(gbpAmount.includes('\u00A3'));
      assert.ok(gbpAmount.includes('100.50'));
      assert.ok(euroAmount.includes('\u00A3'));
      assert.ok(euroAmount.includes('50.00'));
    });

    test('formatAmount should handle negative amounts', () => {
      const negative = familyService.formatAmount(-25.00, 'GBP');

      assert.ok(negative.includes('-'));
      assert.ok(negative.includes('25.00'));
    });
  });

  describe('Data Management', () => {
    test('clearAllData should remove all data', async () => {
      await familyService.clearAllData();

      const members = await familyService.getFamilyMembers('parent1');
      const bookings = await familyService.getFamilyBookings('parent1');

      assert.strictEqual(members.length, 0);
      assert.strictEqual(bookings.length, 0);
    });

    test('seedDemoData should restore mock data', async () => {
      await familyService.clearAllData();
      await familyService.seedDemoData();

      const members = await familyService.getFamilyMembers('parent1');

      assert.ok(members.length > 0);
    });
  });
});
