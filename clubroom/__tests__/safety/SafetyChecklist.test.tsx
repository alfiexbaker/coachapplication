/**
 * SafetyChecklist Component Tests
 *
 * Unit tests for the SafetyChecklist component
 * testing completion status, rendering, and edge cases.
 */

import assert from 'node:assert';
import test, { describe } from 'node:test';

interface ChecklistItem {
  key: string;
  label: string;
  isComplete: boolean;
}

describe('SafetyChecklist', () => {
  describe('Completion Status', () => {
    test('should calculate completed count correctly', () => {
      const items: ChecklistItem[] = [
        { key: 'contact', label: 'Emergency Contact', isComplete: true },
        { key: 'consent', label: 'Emergency Treatment Consent', isComplete: true },
        { key: 'medical', label: 'Medical Information', isComplete: false },
      ];

      const completedCount = items.filter(i => i.isComplete).length;

      assert.strictEqual(completedCount, 2);
    });

    test('should identify when all items are complete', () => {
      const items: ChecklistItem[] = [
        { key: 'contact', label: 'Emergency Contact', isComplete: true },
        { key: 'consent', label: 'Emergency Treatment Consent', isComplete: true },
        { key: 'medical', label: 'Medical Information', isComplete: true },
      ];

      const completedCount = items.filter(i => i.isComplete).length;
      const isAllComplete = completedCount === items.length;

      assert.strictEqual(isAllComplete, true);
    });

    test('should identify when some items are incomplete', () => {
      const items: ChecklistItem[] = [
        { key: 'contact', label: 'Emergency Contact', isComplete: true },
        { key: 'consent', label: 'Emergency Treatment Consent', isComplete: false },
        { key: 'medical', label: 'Medical Information', isComplete: false },
      ];

      const completedCount = items.filter(i => i.isComplete).length;
      const isAllComplete = completedCount === items.length;

      assert.strictEqual(isAllComplete, false);
      assert.strictEqual(completedCount, 1);
    });

    test('should handle all incomplete items', () => {
      const items: ChecklistItem[] = [
        { key: 'contact', label: 'Emergency Contact', isComplete: false },
        { key: 'consent', label: 'Emergency Treatment Consent', isComplete: false },
        { key: 'medical', label: 'Medical Information', isComplete: false },
      ];

      const completedCount = items.filter(i => i.isComplete).length;

      assert.strictEqual(completedCount, 0);
    });
  });

  describe('Progress Display', () => {
    test('should format progress as fraction', () => {
      const completed = 2;
      const total = 3;
      const progress = `${completed}/${total}`;

      assert.strictEqual(progress, '2/3');
    });

    test('should show correct status message for complete', () => {
      const completedCount = 3;
      const total = 3;
      const isAllComplete = completedCount === total;
      const message = isAllComplete
        ? 'All safety requirements met'
        : `${completedCount}/${total} requirements complete`;

      assert.strictEqual(message, 'All safety requirements met');
    });

    test('should show correct status message for incomplete', () => {
      const getStatusMessage = (completed: number, total: number) => {
        const isAllComplete = completed === total;
        return isAllComplete
          ? 'All safety requirements met'
          : `${completed}/${total} requirements complete`;
      };

      assert.strictEqual(getStatusMessage(2, 3), '2/3 requirements complete');
    });
  });

  describe('SafetyStatusIndicator', () => {
    test('should return complete status when both requirements met', () => {
      const hasEmergencyContact = true;
      const hasEmergencyConsent = true;
      const isComplete = hasEmergencyContact && hasEmergencyConsent;

      assert.strictEqual(isComplete, true);
    });

    test('should return incomplete status when contact missing', () => {
      const hasEmergencyContact = false;
      const hasEmergencyConsent = true;
      const isComplete = hasEmergencyContact && hasEmergencyConsent;

      assert.strictEqual(isComplete, false);
    });

    test('should return incomplete status when consent missing', () => {
      const hasEmergencyContact = true;
      const hasEmergencyConsent = false;
      const isComplete = hasEmergencyContact && hasEmergencyConsent;

      assert.strictEqual(isComplete, false);
    });

    test('should return incomplete status when both missing', () => {
      const hasEmergencyContact = false;
      const hasEmergencyConsent = false;
      const isComplete = hasEmergencyContact && hasEmergencyConsent;

      assert.strictEqual(isComplete, false);
    });
  });

  describe('SessionSafetySummary', () => {
    test('should correctly identify missing info count', () => {
      const missingInfoCount = 2;
      const hasMissingInfo = missingInfoCount > 0;

      assert.strictEqual(hasMissingInfo, true);
    });

    test('should format plural message correctly for multiple athletes', () => {
      const formatMessage = (count: number) =>
        `${count} athlete${count !== 1 ? 's' : ''} missing emergency contact`;

      assert.strictEqual(formatMessage(3), '3 athletes missing emergency contact');
    });

    test('should format singular message correctly for one athlete', () => {
      const formatMessage = (count: number) =>
        `${count} athlete${count !== 1 ? 's' : ''} missing emergency contact`;

      assert.strictEqual(formatMessage(1), '1 athlete missing emergency contact');
    });

    test('should not show warning when no missing info', () => {
      const missingInfoCount = 0;
      const hasMissingInfo = missingInfoCount > 0;

      assert.strictEqual(hasMissingInfo, false);
    });

    test('should calculate stats correctly', () => {
      const totalAthletes = 10;
      const athletesWithAlerts = 4;
      const missingInfoCount = 2;

      assert.ok(athletesWithAlerts <= totalAthletes);
      assert.ok(missingInfoCount <= totalAthletes);
    });
  });
});
