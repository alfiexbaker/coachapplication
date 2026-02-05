/**
 * Injury Service Tests
 *
 * Unit tests for the injury service functionality including
 * CRUD operations, recovery notes, and status management.
 */

import assert from 'node:assert';
import test, { describe, beforeEach } from 'node:test';

import { injuryService } from '../../services/injury-service';
import type {
  Injury,
  InjurySeverity,
  InjuryStatus,
  LogInjuryInput,
} from '../../constants/types';

// Reset to mock data before each test
beforeEach(async () => {
  await injuryService.resetToMockData();
});

describe('Injury Service', () => {
  describe('logInjury', () => {
    test('should log a new injury with required fields', async () => {
      const input: LogInjuryInput = {
        bodyPart: 'LEFT_KNEE',
        description: 'Twisted knee during training',
        severity: 'MODERATE',
        occurredAt: new Date().toISOString(),
      };

      const injury = await injuryService.logInjury('test_user', input, 'Test User');

      assert.ok(injury.id.startsWith('injury_'));
      assert.strictEqual(injury.bodyPart, 'LEFT_KNEE');
      assert.strictEqual(injury.description, 'Twisted knee during training');
      assert.strictEqual(injury.severity, 'MODERATE');
      assert.strictEqual(injury.status, 'ACTIVE');
      assert.strictEqual(injury.recoveryPercent, 0);
      assert.strictEqual(injury.userId, 'test_user');
      assert.strictEqual(injury.userName, 'Test User');
      assert.strictEqual(injury.sharedWithCoach, true);
      assert.deepStrictEqual(injury.notes, []);
      assert.ok(injury.createdAt);
      assert.ok(injury.updatedAt);
    });

    test('should log injury with all optional fields', async () => {
      const input: LogInjuryInput = {
        bodyPart: 'RIGHT_ANKLE',
        description: 'Sprained ankle',
        severity: 'MINOR',
        occurredAt: '2026-01-05T10:00:00Z',
        expectedRecovery: '2026-01-20T00:00:00Z',
        sharedWithCoach: false,
      };

      const injury = await injuryService.logInjury('test_user', input);

      assert.strictEqual(injury.bodyPart, 'RIGHT_ANKLE');
      assert.strictEqual(injury.expectedRecovery, '2026-01-20T00:00:00Z');
      assert.strictEqual(injury.sharedWithCoach, false);
    });

    test('should set sharedWithCoach to true by default', async () => {
      const input: LogInjuryInput = {
        bodyPart: 'HEAD',
        description: 'Minor headache',
        severity: 'MINOR',
        occurredAt: new Date().toISOString(),
      };

      const injury = await injuryService.logInjury('test_user', input);

      assert.strictEqual(injury.sharedWithCoach, true);
    });
  });

  describe('getUserInjuries', () => {
    test('should return injuries for a specific user', async () => {
      const injuries = await injuryService.getUserInjuries('user1');

      assert.ok(Array.isArray(injuries));
      assert.ok(injuries.length > 0);
      injuries.forEach((injury) => {
        assert.strictEqual(injury.userId, 'user1');
      });
    });

    test('should include healed injuries by default', async () => {
      const injuries = await injuryService.getUserInjuries('user1', true);

      const hasHealed = injuries.some((i) => i.status === 'HEALED');
      assert.ok(hasHealed, 'Should include healed injuries');
    });

    test('should exclude healed injuries when includeHealed is false', async () => {
      const injuries = await injuryService.getUserInjuries('user1', false);

      injuries.forEach((injury) => {
        assert.notStrictEqual(injury.status, 'HEALED');
      });
    });

    test('should sort injuries with active first, then recovering, then healed', async () => {
      const injuries = await injuryService.getUserInjuries('user1', true);

      const statusOrder: Record<InjuryStatus, number> = { ACTIVE: 0, RECOVERING: 1, HEALED: 2 };
      let lastOrder = -1;

      injuries.forEach((injury) => {
        const currentOrder = statusOrder[injury.status];
        assert.ok(currentOrder >= lastOrder, 'Injuries should be sorted by status');
        if (currentOrder > lastOrder) {
          lastOrder = currentOrder;
        }
      });
    });
  });

  describe('getInjuryById', () => {
    test('should return injury by ID', async () => {
      const injury = await injuryService.getInjuryById('injury_1');

      assert.ok(injury);
      assert.strictEqual(injury.id, 'injury_1');
    });

    test('should return null for non-existent injury', async () => {
      const injury = await injuryService.getInjuryById('non_existent');

      assert.strictEqual(injury, null);
    });
  });

  describe('updateInjury', () => {
    test('should update injury fields', async () => {
      const originalInjury = await injuryService.getInjuryById('injury_1');
      assert.ok(originalInjury);

      const updatedInjury = await injuryService.updateInjury('injury_1', {
        description: 'Updated description',
        severity: 'SEVERE',
        recoveryPercent: 50,
      });

      assert.ok(updatedInjury);
      assert.strictEqual(updatedInjury.description, 'Updated description');
      assert.strictEqual(updatedInjury.severity, 'SEVERE');
      assert.strictEqual(updatedInjury.recoveryPercent, 50);
      assert.ok(new Date(updatedInjury.updatedAt) > new Date(originalInjury.updatedAt));
    });

    test('should set healedAt when marking as healed', async () => {
      const updatedInjury = await injuryService.updateInjury('injury_1', {
        status: 'HEALED',
      });

      assert.ok(updatedInjury);
      assert.strictEqual(updatedInjury.status, 'HEALED');
      assert.strictEqual(updatedInjury.recoveryPercent, 100);
      assert.ok(updatedInjury.healedAt);
    });

    test('should return null for non-existent injury', async () => {
      const result = await injuryService.updateInjury('non_existent', { description: 'Test' });

      assert.strictEqual(result, null);
    });
  });

  describe('addRecoveryNote', () => {
    test('should add a recovery note to an injury', async () => {
      const injury = await injuryService.getInjuryById('injury_1');
      assert.ok(injury);
      const originalNoteCount = injury.notes.length;

      const updatedInjury = await injuryService.addRecoveryNote(
        'injury_1',
        'Feeling better today',
        'user1',
        'Tom Henderson',
        70
      );

      assert.ok(updatedInjury);
      assert.strictEqual(updatedInjury.notes.length, originalNoteCount + 1);

      const newNote = updatedInjury.notes[updatedInjury.notes.length - 1];
      assert.ok(newNote.id.startsWith('note_'));
      assert.strictEqual(newNote.injuryId, 'injury_1');
      assert.strictEqual(newNote.note, 'Feeling better today');
      assert.strictEqual(newNote.createdBy, 'user1');
      assert.strictEqual(newNote.createdByName, 'Tom Henderson');
      assert.strictEqual(newNote.recoveryPercent, 70);
    });

    test('should update recovery percent when adding note with progress', async () => {
      const updatedInjury = await injuryService.addRecoveryNote(
        'injury_1',
        'Progress update',
        'user1',
        'User',
        80
      );

      assert.ok(updatedInjury);
      assert.strictEqual(updatedInjury.recoveryPercent, 80);
    });

    test('should transition status from ACTIVE to RECOVERING when progress > 0', async () => {
      // Create a new active injury
      const input: LogInjuryInput = {
        bodyPart: 'LEFT_WRIST',
        description: 'Wrist strain',
        severity: 'MINOR',
        occurredAt: new Date().toISOString(),
      };
      const injury = await injuryService.logInjury('test_user', input);
      assert.strictEqual(injury.status, 'ACTIVE');

      // Add note with progress
      const updated = await injuryService.addRecoveryNote(
        injury.id,
        'Starting recovery',
        'test_user',
        'Test',
        25
      );

      assert.ok(updated);
      assert.strictEqual(updated.status, 'RECOVERING');
    });

    test('should auto-heal when progress reaches 100', async () => {
      const input: LogInjuryInput = {
        bodyPart: 'RIGHT_FOOT',
        description: 'Bruised foot',
        severity: 'MINOR',
        occurredAt: new Date().toISOString(),
      };
      const injury = await injuryService.logInjury('test_user', input);

      const updated = await injuryService.addRecoveryNote(
        injury.id,
        'Fully recovered',
        'test_user',
        'Test',
        100
      );

      assert.ok(updated);
      assert.strictEqual(updated.status, 'HEALED');
      assert.strictEqual(updated.recoveryPercent, 100);
      assert.ok(updated.healedAt);
    });

    test('should return null for non-existent injury', async () => {
      const result = await injuryService.addRecoveryNote(
        'non_existent',
        'Test note',
        'user1'
      );

      assert.strictEqual(result, null);
    });
  });

  describe('markAsHealed', () => {
    test('should mark injury as healed', async () => {
      const updatedInjury = await injuryService.markAsHealed('injury_1');

      assert.ok(updatedInjury);
      assert.strictEqual(updatedInjury.status, 'HEALED');
      assert.strictEqual(updatedInjury.recoveryPercent, 100);
      assert.ok(updatedInjury.healedAt);
    });

    test('should return null for non-existent injury', async () => {
      const result = await injuryService.markAsHealed('non_existent');

      assert.strictEqual(result, null);
    });
  });

  describe('getAthleteInjuries', () => {
    test('should return only shared injuries', async () => {
      // Log an unshared injury
      const input: LogInjuryInput = {
        bodyPart: 'NECK',
        description: 'Private injury',
        severity: 'MINOR',
        occurredAt: new Date().toISOString(),
        sharedWithCoach: false,
      };
      await injuryService.logInjury('user1', input);

      const athleteInjuries = await injuryService.getAthleteInjuries('user1');

      athleteInjuries.forEach((injury) => {
        assert.strictEqual(injury.sharedWithCoach, true);
      });
    });
  });

  describe('hasActiveInjury', () => {
    test('should return true if user has active injuries', async () => {
      const hasActive = await injuryService.hasActiveInjury('user1');

      assert.strictEqual(hasActive, true);
    });

    test('should return true if user has recovering injuries', async () => {
      // user1 has a RECOVERING injury in mock data
      const hasActive = await injuryService.hasActiveInjury('user1');

      assert.strictEqual(hasActive, true);
    });

    test('should return false if user has only healed injuries', async () => {
      // Create a user with only healed injuries
      const input: LogInjuryInput = {
        bodyPart: 'LEFT_HAND',
        description: 'Old injury',
        severity: 'MINOR',
        occurredAt: new Date().toISOString(),
      };
      const injury = await injuryService.logInjury('new_user', input);
      await injuryService.markAsHealed(injury.id);

      const hasActive = await injuryService.hasActiveInjury('new_user');

      assert.strictEqual(hasActive, false);
    });
  });

  describe('getActiveInjuryCount', () => {
    test('should return correct count of active/recovering injuries', async () => {
      const count = await injuryService.getActiveInjuryCount('user1');

      assert.ok(typeof count === 'number');
      assert.ok(count >= 0);
    });
  });

  describe('getInjuryStats', () => {
    test('should return correct statistics', async () => {
      const stats = await injuryService.getInjuryStats('user1');

      assert.ok(typeof stats.totalInjuries === 'number');
      assert.ok(typeof stats.activeInjuries === 'number');
      assert.ok(typeof stats.recoveringInjuries === 'number');
      assert.ok(typeof stats.healedInjuries === 'number');
      assert.ok(Array.isArray(stats.commonBodyParts));
      assert.ok(typeof stats.averageRecoveryDays === 'number');
    });

    test('should count body parts correctly', async () => {
      const stats = await injuryService.getInjuryStats('user1');

      // commonBodyParts should be sorted by count descending
      for (let i = 0; i < stats.commonBodyParts.length - 1; i++) {
        assert.ok(
          stats.commonBodyParts[i].count >= stats.commonBodyParts[i + 1].count,
          'Body parts should be sorted by count'
        );
      }
    });

    test('should limit common body parts to top 5', async () => {
      const stats = await injuryService.getInjuryStats('user1');

      assert.ok(stats.commonBodyParts.length <= 5);
    });
  });

  describe('Body Part Utilities', () => {
    test('getBodyPartCategory should return correct category', () => {
      assert.strictEqual(injuryService.getBodyPartCategory('HEAD'), 'HEAD');
      assert.strictEqual(injuryService.getBodyPartCategory('NECK'), 'HEAD');
      assert.strictEqual(injuryService.getBodyPartCategory('LEFT_SHOULDER'), 'UPPER_BODY');
      assert.strictEqual(injuryService.getBodyPartCategory('CHEST'), 'CORE');
      assert.strictEqual(injuryService.getBodyPartCategory('LEFT_KNEE'), 'LOWER_BODY');
    });

    test('getBodyPartLabel should return readable labels', () => {
      assert.strictEqual(injuryService.getBodyPartLabel('LEFT_KNEE'), 'Left Knee');
      assert.strictEqual(injuryService.getBodyPartLabel('RIGHT_SHOULDER'), 'Right Shoulder');
      assert.strictEqual(injuryService.getBodyPartLabel('LOWER_BACK'), 'Lower Back');
    });

    test('getBodyPartsByCategory should return correct parts', () => {
      const headParts = injuryService.getBodyPartsByCategory('HEAD');
      assert.ok(headParts.includes('HEAD'));
      assert.ok(headParts.includes('NECK'));
      assert.ok(!headParts.includes('LEFT_KNEE'));

      const lowerBodyParts = injuryService.getBodyPartsByCategory('LOWER_BODY');
      assert.ok(lowerBodyParts.includes('LEFT_KNEE'));
      assert.ok(lowerBodyParts.includes('RIGHT_ANKLE'));
      assert.ok(!lowerBodyParts.includes('HEAD'));
    });
  });

  describe('Display Helpers', () => {
    test('getSeverityInfo should return correct info for all severities', () => {
      const severities: InjurySeverity[] = ['MINOR', 'MODERATE', 'SEVERE'];

      severities.forEach((severity) => {
        const info = injuryService.getSeverityInfo(severity);
        assert.ok(info.label);
        assert.ok(info.color);
        assert.ok(info.icon);
      });
    });

    test('getStatusInfo should return correct info for all statuses', () => {
      const statuses: InjuryStatus[] = ['ACTIVE', 'RECOVERING', 'HEALED'];

      statuses.forEach((status) => {
        const info = injuryService.getStatusInfo(status);
        assert.ok(info.label);
        assert.ok(info.color);
        assert.ok(info.icon);
      });
    });

    test('formatDate should format date correctly', () => {
      const formatted = injuryService.formatDate('2026-06-15');
      assert.ok(formatted.includes('15'));
      assert.ok(formatted.includes('Jun'));
      assert.ok(formatted.includes('2026'));

      const noDate = injuryService.formatDate(undefined);
      assert.strictEqual(noDate, 'Not set');
    });
  });

  describe('Recovery Progress', () => {
    test('calculateExpectedProgress should return correct progress', () => {
      const now = Date.now();
      const oneDayMs = 24 * 60 * 60 * 1000;

      // Injury occurred 5 days ago, expected recovery in 5 days (50% progress)
      const injury: Injury = {
        id: 'test',
        userId: 'user1',
        bodyPart: 'LEFT_KNEE',
        description: 'Test',
        severity: 'MODERATE',
        occurredAt: new Date(now - 5 * oneDayMs).toISOString(),
        expectedRecovery: new Date(now + 5 * oneDayMs).toISOString(),
        status: 'RECOVERING',
        notes: [],
        recoveryPercent: 30,
        sharedWithCoach: true,
        createdAt: new Date(now - 5 * oneDayMs).toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const progress = injuryService.calculateExpectedProgress(injury);
      assert.ok(progress >= 45 && progress <= 55, 'Expected ~50% progress');
    });

    test('getDaysUntilRecovery should return correct days', () => {
      const now = Date.now();
      const oneDayMs = 24 * 60 * 60 * 1000;

      const injury: Injury = {
        id: 'test',
        userId: 'user1',
        bodyPart: 'LEFT_KNEE',
        description: 'Test',
        severity: 'MODERATE',
        occurredAt: new Date().toISOString(),
        expectedRecovery: new Date(now + 10 * oneDayMs).toISOString(),
        status: 'RECOVERING',
        notes: [],
        recoveryPercent: 30,
        sharedWithCoach: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const days = injuryService.getDaysUntilRecovery(injury);
      assert.ok(days !== null);
      assert.ok(days >= 9 && days <= 11, 'Expected ~10 days');
    });

    test('getDaysUntilRecovery should return null for healed injuries', () => {
      const injury: Injury = {
        id: 'test',
        userId: 'user1',
        bodyPart: 'LEFT_KNEE',
        description: 'Test',
        severity: 'MODERATE',
        occurredAt: new Date().toISOString(),
        expectedRecovery: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'HEALED',
        notes: [],
        recoveryPercent: 100,
        sharedWithCoach: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        healedAt: new Date().toISOString(),
      };

      const days = injuryService.getDaysUntilRecovery(injury);
      assert.strictEqual(days, null);
    });

    test('getDaysUntilRecovery should return null for injuries without expected date', () => {
      const injury: Injury = {
        id: 'test',
        userId: 'user1',
        bodyPart: 'LEFT_KNEE',
        description: 'Test',
        severity: 'MODERATE',
        occurredAt: new Date().toISOString(),
        status: 'ACTIVE',
        notes: [],
        recoveryPercent: 0,
        sharedWithCoach: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const days = injuryService.getDaysUntilRecovery(injury);
      assert.strictEqual(days, null);
    });
  });
});
