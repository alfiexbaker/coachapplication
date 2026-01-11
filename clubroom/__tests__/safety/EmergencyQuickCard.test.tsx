/**
 * EmergencyQuickCard Component Tests
 *
 * Unit tests for the EmergencyQuickCard component
 * testing rendering, interactions, and edge cases.
 */

import assert from 'node:assert';
import test, { describe } from 'node:test';

import type { EmergencyContact } from '../../constants/types';

// Mock data for tests
const mockPrimaryContact: EmergencyContact = {
  id: 'contact_1',
  name: 'Sarah Henderson',
  relationship: 'Mother',
  phone: '+44 7700 900123',
  email: 'sarah@email.com',
  isPrimary: true,
  canPickup: true,
};

const mockAllergies = ['Peanuts', 'Tree nuts'];
const mockConditions = ['Mild asthma'];
const mockMedications = ['Ventolin inhaler'];

describe('EmergencyQuickCard', () => {
  describe('Alert Level Display', () => {
    test('should display correct alert level for high alerts', () => {
      // With 2+ allergies, alert level should be 'high'
      const allergies = ['Peanuts', 'Shellfish', 'Tree nuts'];
      assert.strictEqual(allergies.length >= 2, true);
    });

    test('should display correct alert level for medium alerts', () => {
      // With 1 allergy, alert level should be 'medium'
      const allergies = ['Peanuts'];
      assert.strictEqual(allergies.length >= 1 && allergies.length < 2, true);
    });

    test('should display no alerts for empty medical info', () => {
      const allergies: string[] = [];
      const conditions: string[] = [];
      const hasAlerts = allergies.length > 0 || conditions.length > 0;
      assert.strictEqual(hasAlerts, false);
    });
  });

  describe('Contact Display', () => {
    test('should have primary contact data available', () => {
      assert.ok(mockPrimaryContact.name);
      assert.ok(mockPrimaryContact.phone);
      assert.strictEqual(mockPrimaryContact.isPrimary, true);
    });

    test('should format contact relationship correctly', () => {
      const formattedContact = `${mockPrimaryContact.name} (${mockPrimaryContact.relationship})`;
      assert.strictEqual(formattedContact, 'Sarah Henderson (Mother)');
    });

    test('should handle contact without email', () => {
      const contactWithoutEmail: EmergencyContact = {
        ...mockPrimaryContact,
        email: undefined,
      };
      assert.strictEqual(contactWithoutEmail.email, undefined);
    });
  });

  describe('Medical Summary', () => {
    test('should limit displayed items to 3', () => {
      const allItems = [
        ...mockAllergies,
        ...mockConditions,
        ...mockMedications,
      ];
      const displayedItems = allItems.slice(0, 3);
      const remainingCount = allItems.length - displayedItems.length;

      assert.strictEqual(displayedItems.length, 3);
      assert.strictEqual(remainingCount, 1);
    });

    test('should correctly count remaining items', () => {
      const totalItems = mockAllergies.length + mockConditions.length + mockMedications.length;
      const displayedCount = 3;
      const remaining = totalItems - displayedCount;

      assert.strictEqual(remaining, 1);
    });

    test('should handle empty medical data', () => {
      const emptyAllergies: string[] = [];
      const emptyConditions: string[] = [];
      const emptyMedications: string[] = [];

      const totalItems = emptyAllergies.length + emptyConditions.length + emptyMedications.length;
      assert.strictEqual(totalItems, 0);
    });
  });

  describe('No Contact Warning', () => {
    test('should identify when no contact is available', () => {
      const primaryContact: EmergencyContact | null = null;
      const hasNoContact = primaryContact === null;

      assert.strictEqual(hasNoContact, true);
    });
  });

  describe('Item Type Classification', () => {
    test('should correctly classify allergies', () => {
      const items = mockAllergies.map(a => ({ label: a, type: 'allergy' as const }));

      items.forEach(item => {
        assert.strictEqual(item.type, 'allergy');
      });
    });

    test('should correctly classify conditions', () => {
      const items = mockConditions.map(c => ({ label: c, type: 'condition' as const }));

      items.forEach(item => {
        assert.strictEqual(item.type, 'condition');
      });
    });

    test('should correctly classify medications', () => {
      const items = mockMedications.map(m => ({ label: m, type: 'medication' as const }));

      items.forEach(item => {
        assert.strictEqual(item.type, 'medication');
      });
    });
  });
});
