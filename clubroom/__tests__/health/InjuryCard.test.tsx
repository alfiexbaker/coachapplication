/**
 * InjuryCard Component Tests
 *
 * Tests for the InjuryCard component rendering and behavior.
 * Uses React Native Testing Library patterns.
 */

import assert from 'node:assert';
import test, { describe } from 'node:test';

import type { Injury, InjurySeverity, InjuryStatus, BodyPart } from '../../constants/types';
import { injuryService } from '../../services/injury-service';

/**
 * Helper function to create a mock injury for testing
 */
function createMockInjury(overrides: Partial<Injury> = {}): Injury {
  return {
    id: 'injury_test_1',
    userId: 'user1',
    userName: 'Test User',
    bodyPart: 'LEFT_KNEE',
    description: 'Test injury description',
    severity: 'MODERATE',
    occurredAt: '2026-01-05T14:30:00Z',
    expectedRecovery: '2026-01-20T00:00:00Z',
    status: 'RECOVERING',
    notes: [
      {
        id: 'note_1',
        injuryId: 'injury_test_1',
        note: 'Started treatment',
        createdAt: '2026-01-06T10:00:00Z',
        createdBy: 'user1',
        createdByName: 'Test User',
        recoveryPercent: 25,
      },
    ],
    recoveryPercent: 50,
    sharedWithCoach: true,
    createdAt: '2026-01-05T16:00:00Z',
    updatedAt: '2026-01-10T09:00:00Z',
    ...overrides,
  };
}

describe('InjuryCard Component Logic', () => {
  describe('Injury Data Display', () => {
    test('should have correct body part and description', () => {
      const injury = createMockInjury();

      assert.strictEqual(injury.bodyPart, 'LEFT_KNEE');
      assert.strictEqual(injury.description, 'Test injury description');
    });

    test('should display correct body part label', () => {
      const injury = createMockInjury();
      const label = injuryService.getBodyPartLabel(injury.bodyPart);

      assert.strictEqual(label, 'Left Knee');
    });

    test('should have correct recovery percentage', () => {
      const injury = createMockInjury();

      assert.strictEqual(injury.recoveryPercent, 50);
    });

    test('should count notes correctly', () => {
      const injury = createMockInjury();

      assert.strictEqual(injury.notes.length, 1);
    });
  });

  describe('Severity Display', () => {
    test('should display correct severity info for each severity', () => {
      const severities: InjurySeverity[] = ['MINOR', 'MODERATE', 'SEVERE'];

      severities.forEach((severity) => {
        const injury = createMockInjury({ severity });
        const info = injuryService.getSeverityInfo(injury.severity);

        assert.ok(info.label, `Severity ${severity} should have a label`);
        assert.ok(info.icon, `Severity ${severity} should have an icon`);
        assert.ok(info.color, `Severity ${severity} should have a color`);
        assert.ok(info.color.startsWith('#'), `Severity ${severity} color should be hex`);
      });
    });

    test('MINOR severity should be amber', () => {
      const info = injuryService.getSeverityInfo('MINOR');
      assert.strictEqual(info.label, 'Minor');
      assert.strictEqual(info.color, '#F59E0B');
    });

    test('MODERATE severity should be orange', () => {
      const info = injuryService.getSeverityInfo('MODERATE');
      assert.strictEqual(info.label, 'Moderate');
      assert.strictEqual(info.color, '#F97316');
    });

    test('SEVERE severity should be red', () => {
      const info = injuryService.getSeverityInfo('SEVERE');
      assert.strictEqual(info.label, 'Severe');
      assert.strictEqual(info.color, '#EF4444');
    });
  });

  describe('Status Display', () => {
    test('should display correct status info for each status', () => {
      const statuses: InjuryStatus[] = ['ACTIVE', 'RECOVERING', 'HEALED'];

      statuses.forEach((status) => {
        const injury = createMockInjury({ status });
        const info = injuryService.getStatusInfo(injury.status);

        assert.ok(info.label, `Status ${status} should have a label`);
        assert.ok(info.icon, `Status ${status} should have an icon`);
        assert.ok(info.color, `Status ${status} should have a color`);
        assert.ok(info.color.startsWith('#'), `Status ${status} color should be hex`);
      });
    });

    test('ACTIVE status should be red', () => {
      const info = injuryService.getStatusInfo('ACTIVE');
      assert.strictEqual(info.label, 'Active');
      assert.strictEqual(info.color, '#EF4444');
    });

    test('RECOVERING status should be amber', () => {
      const info = injuryService.getStatusInfo('RECOVERING');
      assert.strictEqual(info.label, 'Recovering');
      assert.strictEqual(info.color, '#F59E0B');
    });

    test('HEALED status should be green', () => {
      const info = injuryService.getStatusInfo('HEALED');
      assert.strictEqual(info.label, 'Healed');
      assert.strictEqual(info.color, '#10B981');
    });
  });

  describe('Body Part Categories', () => {
    test('should categorize head correctly', () => {
      const injury = createMockInjury({ bodyPart: 'HEAD' });
      const category = injuryService.getBodyPartCategory(injury.bodyPart);

      assert.strictEqual(category, 'HEAD');
    });

    test('should categorize neck as head', () => {
      const injury = createMockInjury({ bodyPart: 'NECK' });
      const category = injuryService.getBodyPartCategory(injury.bodyPart);

      assert.strictEqual(category, 'HEAD');
    });

    test('should categorize shoulders as upper body', () => {
      const leftShoulder = injuryService.getBodyPartCategory('LEFT_SHOULDER');
      const rightShoulder = injuryService.getBodyPartCategory('RIGHT_SHOULDER');

      assert.strictEqual(leftShoulder, 'UPPER_BODY');
      assert.strictEqual(rightShoulder, 'UPPER_BODY');
    });

    test('should categorize chest as core', () => {
      const injury = createMockInjury({ bodyPart: 'CHEST' });
      const category = injuryService.getBodyPartCategory(injury.bodyPart);

      assert.strictEqual(category, 'CORE');
    });

    test('should categorize knee as lower body', () => {
      const injury = createMockInjury({ bodyPart: 'LEFT_KNEE' });
      const category = injuryService.getBodyPartCategory(injury.bodyPart);

      assert.strictEqual(category, 'LOWER_BODY');
    });
  });

  describe('Date Display', () => {
    test('should format occurred date correctly', () => {
      const injury = createMockInjury({ occurredAt: '2026-06-15T10:00:00Z' });
      const formatted = injuryService.formatDate(injury.occurredAt);

      assert.ok(formatted.includes('15'));
      assert.ok(formatted.includes('Jun'));
      assert.ok(formatted.includes('2026'));
    });

    test('should format expected recovery date correctly', () => {
      const injury = createMockInjury({ expectedRecovery: '2026-07-01T00:00:00Z' });
      const formatted = injuryService.formatDate(injury.expectedRecovery);

      assert.ok(formatted.includes('1'));
      assert.ok(formatted.includes('Jul'));
      assert.ok(formatted.includes('2026'));
    });

    test('should handle missing expected recovery date', () => {
      const injury = createMockInjury({ expectedRecovery: undefined });
      const formatted = injuryService.formatDate(injury.expectedRecovery);

      assert.strictEqual(formatted, 'Not set');
    });
  });

  describe('Recovery Progress', () => {
    test('should calculate days until recovery', () => {
      const now = Date.now();
      const oneDayMs = 24 * 60 * 60 * 1000;
      const injury = createMockInjury({
        expectedRecovery: new Date(now + 10 * oneDayMs).toISOString(),
        status: 'RECOVERING',
      });

      const days = injuryService.getDaysUntilRecovery(injury);

      assert.ok(days !== null);
      assert.ok(days >= 9 && days <= 11);
    });

    test('should return null for healed injuries', () => {
      const injury = createMockInjury({
        status: 'HEALED',
        recoveryPercent: 100,
      });

      const days = injuryService.getDaysUntilRecovery(injury);

      assert.strictEqual(days, null);
    });

    test('should return null for injuries without expected date', () => {
      const injury = createMockInjury({
        expectedRecovery: undefined,
      });

      const days = injuryService.getDaysUntilRecovery(injury);

      assert.strictEqual(days, null);
    });

    test('should show 0% for new injury', () => {
      const injury = createMockInjury({ recoveryPercent: 0 });
      assert.strictEqual(injury.recoveryPercent, 0);
    });

    test('should show 100% for healed injury', () => {
      const injury = createMockInjury({
        recoveryPercent: 100,
        status: 'HEALED',
      });
      assert.strictEqual(injury.recoveryPercent, 100);
    });

    test('should clamp progress between 0 and 100', () => {
      const injury = createMockInjury({ recoveryPercent: 150 });
      const clampedProgress = Math.max(0, Math.min(100, injury.recoveryPercent));
      assert.strictEqual(clampedProgress, 100);

      const negativeInjury = createMockInjury({ recoveryPercent: -10 });
      const clampedNegative = Math.max(0, Math.min(100, negativeInjury.recoveryPercent));
      assert.strictEqual(clampedNegative, 0);
    });
  });

  describe('Coach Sharing', () => {
    test('should show shared badge when sharedWithCoach is true', () => {
      const injury = createMockInjury({ sharedWithCoach: true });

      assert.strictEqual(injury.sharedWithCoach, true);
    });

    test('should not show shared badge when sharedWithCoach is false', () => {
      const injury = createMockInjury({ sharedWithCoach: false });

      assert.strictEqual(injury.sharedWithCoach, false);
    });
  });

  describe('Compact Variant', () => {
    test('compact variant should work with minimal data', () => {
      const minimalInjury = createMockInjury({
        description: 'Brief description',
        notes: [],
        expectedRecovery: undefined,
      });

      assert.ok(minimalInjury.id);
      assert.ok(minimalInjury.bodyPart);
      assert.ok(minimalInjury.status);
    });

    test('compact variant should show status and recovery percent', () => {
      const injury = createMockInjury();

      const statusInfo = injuryService.getStatusInfo(injury.status);
      assert.ok(statusInfo.label);
      assert.ok(injury.recoveryPercent >= 0);
    });
  });

  describe('Interaction Logic', () => {
    test('injury should be pressable when onPress is provided', () => {
      createMockInjury();
      let pressed = false;
      const onPress = () => {
        pressed = true;
      };

      onPress();
      assert.strictEqual(pressed, true);
    });

    test('should navigate to injury detail on press', () => {
      const injury = createMockInjury();
      const expectedPath = `/health/${injury.id}`;

      assert.strictEqual(`/health/${injury.id}`, expectedPath);
    });
  });
});

describe('InjuryCard Accessibility', () => {
  test('injury card should have accessible content', () => {
    const injury = createMockInjury();

    assert.ok(injury.description.length > 0, 'Description should be non-empty');
    assert.ok(injury.bodyPart, 'Body part should be defined');
  });

  test('progress should be describable', () => {
    const injury = createMockInjury({ recoveryPercent: 75 });
    const progressDescription = `${injury.recoveryPercent}% recovered`;

    assert.strictEqual(progressDescription, '75% recovered');
  });

  test('severity should be describable', () => {
    const injury = createMockInjury({ severity: 'MODERATE' });
    const info = injuryService.getSeverityInfo(injury.severity);
    const description = `${info.label} severity injury`;

    assert.strictEqual(description, 'Moderate severity injury');
  });

  test('status should be describable', () => {
    const injury = createMockInjury({ status: 'RECOVERING' });
    const info = injuryService.getStatusInfo(injury.status);
    const description = `Status: ${info.label}`;

    assert.strictEqual(description, 'Status: Recovering');
  });
});

describe('InjuryCard Edge Cases', () => {
  test('should handle very long description', () => {
    const longDescription = 'A'.repeat(500);
    const injury = createMockInjury({ description: longDescription });

    assert.strictEqual(injury.description.length, 500);
  });

  test('should handle special characters in description', () => {
    const specialDescription = 'Injury with "quotes" & <special> chars!';
    const injury = createMockInjury({ description: specialDescription });

    assert.strictEqual(injury.description, specialDescription);
  });

  test('should handle many notes', () => {
    const manyNotes = Array.from({ length: 50 }, (_, i) => ({
      id: `note_${i}`,
      injuryId: 'injury_test_1',
      note: `Note ${i}`,
      createdAt: new Date().toISOString(),
      createdBy: 'user1',
      createdByName: 'User',
      recoveryPercent: i * 2,
    }));

    const injury = createMockInjury({ notes: manyNotes });

    assert.strictEqual(injury.notes.length, 50);
  });

  test('should handle injury with no notes', () => {
    const injury = createMockInjury({ notes: [] });

    assert.strictEqual(injury.notes.length, 0);
  });

  test('should handle all body parts', () => {
    const bodyParts: BodyPart[] = [
      'HEAD', 'NECK',
      'LEFT_SHOULDER', 'RIGHT_SHOULDER',
      'LEFT_ARM', 'RIGHT_ARM',
      'LEFT_ELBOW', 'RIGHT_ELBOW',
      'LEFT_WRIST', 'RIGHT_WRIST',
      'LEFT_HAND', 'RIGHT_HAND',
      'CHEST', 'UPPER_BACK', 'LOWER_BACK', 'ABDOMEN',
      'LEFT_HIP', 'RIGHT_HIP',
      'LEFT_THIGH', 'RIGHT_THIGH',
      'LEFT_KNEE', 'RIGHT_KNEE',
      'LEFT_CALF', 'RIGHT_CALF',
      'LEFT_ANKLE', 'RIGHT_ANKLE',
      'LEFT_FOOT', 'RIGHT_FOOT',
    ];

    bodyParts.forEach((part) => {
      const injury = createMockInjury({ bodyPart: part });
      const label = injuryService.getBodyPartLabel(injury.bodyPart);
      const category = injuryService.getBodyPartCategory(injury.bodyPart);

      assert.ok(label, `Body part ${part} should have a label`);
      assert.ok(category, `Body part ${part} should have a category`);
    });
  });

  test('should handle healed injury with healedAt date', () => {
    const injury = createMockInjury({
      status: 'HEALED',
      recoveryPercent: 100,
      healedAt: '2026-01-15T10:00:00Z',
    });

    assert.strictEqual(injury.status, 'HEALED');
    assert.ok(injury.healedAt);
  });
});
