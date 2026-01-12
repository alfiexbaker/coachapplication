/**
 * Safety Service Tests
 *
 * Unit tests for the safety service functionality including
 * emergency info access, caching, and session safety aggregation.
 */

import assert from 'node:assert';
import test, { describe, beforeEach } from 'node:test';

import { safetyService } from '../../services/safety-service';
import type {
  EmergencyInfo,
  EmergencyContact,
  MedicalInfo,
} from '../../constants/types';

// Reset to mock data before each test
beforeEach(async () => {
  await safetyService.resetToMockData();
});

describe('Safety Service', () => {
  describe('getEmergencyInfo', () => {
    test('should return emergency info for an existing athlete', async () => {
      const info = await safetyService.getEmergencyInfo('athlete1');

      assert.ok(info);
      assert.strictEqual(info.athleteId, 'athlete1');
      assert.ok(Array.isArray(info.contacts));
      assert.ok(info.medical);
      assert.ok(Array.isArray(info.consents));
    });

    test('should return default empty info for non-existent athlete', async () => {
      const info = await safetyService.getEmergencyInfo('non_existent_athlete');

      assert.ok(info);
      assert.strictEqual(info.athleteId, 'non_existent_athlete');
      assert.strictEqual(info.contacts.length, 0);
      assert.deepStrictEqual(info.medical.allergies, []);
      assert.deepStrictEqual(info.medical.conditions, []);
    });
  });

  describe('getAthleteEmergency', () => {
    test('should return quick view data for an athlete', async () => {
      const quickView = await safetyService.getAthleteEmergency('athlete1', 'Test Athlete');

      assert.ok(quickView);
      assert.strictEqual(quickView.athleteId, 'athlete1');
      assert.strictEqual(quickView.athleteName, 'Test Athlete');
      assert.ok(typeof quickView.hasAlerts === 'boolean');
      assert.ok(['none', 'low', 'medium', 'high'].includes(quickView.alertLevel));
      assert.ok(Array.isArray(quickView.allergies));
      assert.ok(Array.isArray(quickView.conditions));
      assert.ok(Array.isArray(quickView.medications));
      assert.ok(typeof quickView.emergencyTreatmentConsent === 'boolean');
      assert.strictEqual(quickView.isCached, false);
    });

    test('should include primary contact if available', async () => {
      const quickView = await safetyService.getAthleteEmergency('athlete1');

      assert.ok(quickView.primaryContact);
      assert.ok(quickView.primaryContact.name);
      assert.ok(quickView.primaryContact.phone);
    });

    test('should include all contacts', async () => {
      const quickView = await safetyService.getAthleteEmergency('athlete1');

      assert.ok(quickView.allContacts.length >= 1);
      assert.ok(quickView.allContacts.every(c => c.name && c.phone));
    });

    test('should correctly identify alert level based on medical info', async () => {
      // athlete1 has medical alerts in mock data
      const quickView = await safetyService.getAthleteEmergency('athlete1');

      assert.ok(quickView.hasAlerts);
      assert.notStrictEqual(quickView.alertLevel, 'none');
    });
  });

  describe('getSessionSafetyInfo', () => {
    test('should aggregate safety info for multiple athletes', async () => {
      const attendees = [
        { athleteId: 'athlete1', athleteName: 'Athlete One' },
        { athleteId: 'athlete2', athleteName: 'Athlete Two' },
      ];

      const sessionInfo = await safetyService.getSessionSafetyInfo('session_1', attendees);

      assert.ok(sessionInfo);
      assert.strictEqual(sessionInfo.sessionId, 'session_1');
      assert.strictEqual(sessionInfo.totalAthletes, 2);
      assert.strictEqual(sessionInfo.athletes.length, 2);
      assert.ok(Array.isArray(sessionInfo.allAllergies));
      assert.ok(Array.isArray(sessionInfo.allConditions));
      assert.ok(Array.isArray(sessionInfo.missingEmergencyInfo));
    });

    test('should count athletes with alerts correctly', async () => {
      const attendees = [
        { athleteId: 'athlete1', athleteName: 'Athlete One' },
        { athleteId: 'athlete2', athleteName: 'Athlete Two' },
      ];

      const sessionInfo = await safetyService.getSessionSafetyInfo('session_1', attendees);

      assert.ok(typeof sessionInfo.athletesWithAlerts === 'number');
      assert.ok(sessionInfo.athletesWithAlerts >= 0);
      assert.ok(sessionInfo.athletesWithAlerts <= sessionInfo.totalAthletes);
    });

    test('should aggregate unique allergies and conditions', async () => {
      const attendees = [
        { athleteId: 'athlete1', athleteName: 'Athlete One' },
      ];

      const sessionInfo = await safetyService.getSessionSafetyInfo('session_1', attendees);

      // Allergies should be sorted alphabetically
      for (let i = 0; i < sessionInfo.allAllergies.length - 1; i++) {
        assert.ok(sessionInfo.allAllergies[i].localeCompare(sessionInfo.allAllergies[i + 1]) <= 0);
      }
    });

    test('should track athletes missing emergency info', async () => {
      const attendees = [
        { athleteId: 'non_existent', athleteName: 'No Contact Athlete' },
      ];

      const sessionInfo = await safetyService.getSessionSafetyInfo('session_1', attendees);

      // Non-existent athlete should be in missingEmergencyInfo
      assert.ok(sessionInfo.missingEmergencyInfo.includes('No Contact Athlete'));
    });

    test('should handle empty attendee list', async () => {
      const sessionInfo = await safetyService.getSessionSafetyInfo('session_1', []);

      assert.strictEqual(sessionInfo.totalAthletes, 0);
      assert.strictEqual(sessionInfo.athletes.length, 0);
      assert.strictEqual(sessionInfo.athletesWithAlerts, 0);
    });
  });

  describe('getPrimaryContact', () => {
    test('should return primary contact if exists', async () => {
      const contact = await safetyService.getPrimaryContact('athlete1');

      assert.ok(contact);
      assert.ok(contact.isPrimary);
    });

    test('should return first contact if no primary is set', async () => {
      // Create athlete with non-primary contacts
      await safetyService.updateEmergencyInfo('test_athlete', {
        contacts: [
          {
            id: 'c1',
            name: 'Contact One',
            relationship: 'Parent',
            phone: '123456789',
            isPrimary: false,
            canPickup: true,
          },
        ],
      });

      const contact = await safetyService.getPrimaryContact('test_athlete');

      assert.ok(contact);
      assert.strictEqual(contact.name, 'Contact One');
    });

    test('should return null if no contacts exist', async () => {
      const contact = await safetyService.getPrimaryContact('non_existent');

      assert.strictEqual(contact, null);
    });
  });

  describe('formatEmergencyContact', () => {
    test('should format contact with relationship', () => {
      const contact: EmergencyContact = {
        id: '1',
        name: 'John Smith',
        relationship: 'Father',
        phone: '123456789',
        isPrimary: true,
        canPickup: true,
      };

      const formatted = safetyService.formatEmergencyContact(contact);

      assert.strictEqual(formatted, 'John Smith (Father)');
    });

    test('should format contact without relationship', () => {
      const contact: EmergencyContact = {
        id: '1',
        name: 'Jane Doe',
        relationship: '',
        phone: '123456789',
        isPrimary: false,
        canPickup: false,
      };

      const formatted = safetyService.formatEmergencyContact(contact);

      assert.strictEqual(formatted, 'Jane Doe');
    });
  });

  describe('getMedicalAlertSeverity', () => {
    test('should return none for empty medical info', () => {
      const medical: MedicalInfo = {
        conditions: [],
        allergies: [],
        medications: [],
        restrictions: [],
      };

      const severity = safetyService.getMedicalAlertSeverity(medical);

      assert.strictEqual(severity, 'none');
    });

    test('should return medium for single allergy', () => {
      const medical: MedicalInfo = {
        conditions: [],
        allergies: ['Peanuts'],
        medications: [],
        restrictions: [],
      };

      const severity = safetyService.getMedicalAlertSeverity(medical);

      assert.strictEqual(severity, 'medium');
    });

    test('should return high for multiple allergies', () => {
      const medical: MedicalInfo = {
        conditions: [],
        allergies: ['Peanuts', 'Shellfish'],
        medications: [],
        restrictions: [],
      };

      const severity = safetyService.getMedicalAlertSeverity(medical);

      assert.strictEqual(severity, 'high');
    });

    test('should return high for multiple conditions', () => {
      const medical: MedicalInfo = {
        conditions: ['Asthma', 'Diabetes'],
        allergies: [],
        medications: [],
        restrictions: [],
      };

      const severity = safetyService.getMedicalAlertSeverity(medical);

      assert.strictEqual(severity, 'high');
    });
  });

  describe('getAlertSummary', () => {
    test('should return summary for allergies', () => {
      const quickView = {
        athleteId: 'test',
        athleteName: 'Test',
        hasAlerts: true,
        alertLevel: 'medium' as const,
        primaryContact: null,
        allContacts: [],
        allergies: ['Peanuts', 'Tree nuts'],
        conditions: [],
        medications: [],
        restrictions: [],
        medicalNotes: undefined,
        doctorName: undefined,
        doctorPhone: undefined,
        emergencyTreatmentConsent: false,
        lastUpdated: new Date().toISOString(),
        isCached: false,
      };

      const summary = safetyService.getAlertSummary(quickView);

      assert.ok(summary.includes('2 allergies'));
    });

    test('should return summary for multiple types', () => {
      const quickView = {
        athleteId: 'test',
        athleteName: 'Test',
        hasAlerts: true,
        alertLevel: 'high' as const,
        primaryContact: null,
        allContacts: [],
        allergies: ['Peanuts'],
        conditions: ['Asthma'],
        medications: ['Inhaler'],
        restrictions: [],
        medicalNotes: undefined,
        doctorName: undefined,
        doctorPhone: undefined,
        emergencyTreatmentConsent: false,
        lastUpdated: new Date().toISOString(),
        isCached: false,
      };

      const summary = safetyService.getAlertSummary(quickView);

      assert.ok(summary.includes('1 allergy'));
      assert.ok(summary.includes('1 condition'));
      assert.ok(summary.includes('1 medication'));
    });

    test('should return no medical alerts for empty data', () => {
      const quickView = {
        athleteId: 'test',
        athleteName: 'Test',
        hasAlerts: false,
        alertLevel: 'none' as const,
        primaryContact: null,
        allContacts: [],
        allergies: [],
        conditions: [],
        medications: [],
        restrictions: [],
        medicalNotes: undefined,
        doctorName: undefined,
        doctorPhone: undefined,
        emergencyTreatmentConsent: false,
        lastUpdated: new Date().toISOString(),
        isCached: false,
      };

      const summary = safetyService.getAlertSummary(quickView);

      assert.strictEqual(summary, 'No medical alerts');
    });
  });

  describe('getAlertLevelColor', () => {
    test('should return correct colors for each level', () => {
      assert.strictEqual(safetyService.getAlertLevelColor('high'), '#C03E47');
      assert.strictEqual(safetyService.getAlertLevelColor('medium'), '#C78000');
      assert.strictEqual(safetyService.getAlertLevelColor('low'), '#64748b');
      assert.strictEqual(safetyService.getAlertLevelColor('none'), '#1C8C5E');
    });
  });

  describe('getAlertLevelLabel', () => {
    test('should return correct labels for each level', () => {
      assert.strictEqual(safetyService.getAlertLevelLabel('high'), 'High Alert');
      assert.strictEqual(safetyService.getAlertLevelLabel('medium'), 'Medical Alert');
      assert.strictEqual(safetyService.getAlertLevelLabel('low'), 'Info on File');
      assert.strictEqual(safetyService.getAlertLevelLabel('none'), 'No Alerts');
    });
  });

  describe('hasAlerts', () => {
    test('should return true if athlete has medical alerts', async () => {
      const hasAlerts = await safetyService.hasAlerts('athlete1');

      assert.strictEqual(hasAlerts, true);
    });

    test('should return false for athlete without alerts', async () => {
      // Create athlete without alerts
      await safetyService.updateEmergencyInfo('no_alerts', {
        medical: {
          conditions: [],
          allergies: [],
          medications: [],
          restrictions: [],
        },
      });

      const hasAlerts = await safetyService.hasAlerts('no_alerts');

      assert.strictEqual(hasAlerts, false);
    });
  });

  describe('isComplete', () => {
    test('should return true if has contact and emergency consent', async () => {
      // athlete1 has contacts and emergency consent in mock data
      const isComplete = await safetyService.isComplete('athlete1');

      assert.strictEqual(isComplete, true);
    });

    test('should return false if no contacts', async () => {
      const isComplete = await safetyService.isComplete('non_existent');

      assert.strictEqual(isComplete, false);
    });
  });

  describe('updateEmergencyInfo', () => {
    test('should update medical info', async () => {
      const updated = await safetyService.updateMedicalInfo('athlete1', {
        allergies: ['New Allergy'],
      });

      assert.ok(updated.medical.allergies.includes('New Allergy'));
    });

    test('should add emergency contact', async () => {
      const newContact = {
        name: 'New Contact',
        relationship: 'Aunt',
        phone: '+44 7700 999999',
        isPrimary: false,
        canPickup: true,
      };

      const updated = await safetyService.addContact('athlete1', newContact);

      assert.ok(updated.contacts.some(c => c.name === 'New Contact'));
    });

    test('should update consent', async () => {
      const updated = await safetyService.updateConsent(
        'athlete1',
        'PHOTO',
        true,
        'Test Parent'
      );

      const photoConsent = updated.consents.find(c => c.type === 'PHOTO');
      assert.ok(photoConsent);
      assert.strictEqual(photoConsent.granted, true);
      assert.strictEqual(photoConsent.grantedBy, 'Test Parent');
    });
  });

  describe('caching', () => {
    test('should clear cache successfully', async () => {
      await safetyService.clearCache();
      // Should not throw
      assert.ok(true);
    });

    test('should pre-cache session emergency info', async () => {
      const attendees = [
        { athleteId: 'athlete1', athleteName: 'Athlete One' },
        { athleteId: 'athlete2', athleteName: 'Athlete Two' },
      ];

      await safetyService.preCacheSessionEmergencyInfo(attendees);
      // Should not throw
      assert.ok(true);
    });
  });
});
