"use strict";
/**
 * Safety Service Tests
 *
 * Unit tests for the safety service functionality including
 * emergency info access, caching, and session safety aggregation.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_assert_1 = __importDefault(require("node:assert"));
const node_test_1 = __importStar(require("node:test"));
const safety_service_1 = require("../../services/safety-service");
const expectOk = (result) => {
    if (!result.success) {
        throw new Error(`Expected success but got error: ${result.error.message}`);
    }
    return result.data;
};
// Reset to mock data before each test
(0, node_test_1.beforeEach)(async () => {
    expectOk(await safety_service_1.safetyService.resetToMockData());
});
(0, node_test_1.describe)('Safety Service', () => {
    (0, node_test_1.describe)('getEmergencyInfo', () => {
        (0, node_test_1.default)('should return emergency info for an existing athlete', async () => {
            const info = expectOk(await safety_service_1.safetyService.getEmergencyInfo('athlete1'));
            node_assert_1.default.ok(info);
            node_assert_1.default.strictEqual(info.athleteId, 'athlete1');
            node_assert_1.default.ok(Array.isArray(info.contacts));
            node_assert_1.default.ok(info.medical);
            node_assert_1.default.ok(Array.isArray(info.consents));
        });
        (0, node_test_1.default)('should return default empty info for non-existent athlete', async () => {
            const info = expectOk(await safety_service_1.safetyService.getEmergencyInfo('non_existent_athlete'));
            node_assert_1.default.ok(info);
            node_assert_1.default.strictEqual(info.athleteId, 'non_existent_athlete');
            node_assert_1.default.strictEqual(info.contacts.length, 0);
            node_assert_1.default.deepStrictEqual(info.medical.allergies, []);
            node_assert_1.default.deepStrictEqual(info.medical.conditions, []);
        });
    });
    (0, node_test_1.describe)('getAthleteEmergency', () => {
        (0, node_test_1.default)('should return quick view data for an athlete', async () => {
            const quickView = expectOk(await safety_service_1.safetyService.getAthleteEmergency('athlete1', 'Test Athlete'));
            node_assert_1.default.ok(quickView);
            node_assert_1.default.strictEqual(quickView.athleteId, 'athlete1');
            node_assert_1.default.strictEqual(quickView.athleteName, 'Test Athlete');
            node_assert_1.default.ok(typeof quickView.hasAlerts === 'boolean');
            node_assert_1.default.ok(['none', 'low', 'medium', 'high'].includes(quickView.alertLevel));
            node_assert_1.default.ok(Array.isArray(quickView.allergies));
            node_assert_1.default.ok(Array.isArray(quickView.conditions));
            node_assert_1.default.ok(Array.isArray(quickView.medications));
            node_assert_1.default.ok(typeof quickView.emergencyTreatmentConsent === 'boolean');
            node_assert_1.default.strictEqual(quickView.isCached, false);
        });
        (0, node_test_1.default)('should include primary contact if available', async () => {
            const quickView = expectOk(await safety_service_1.safetyService.getAthleteEmergency('athlete1'));
            node_assert_1.default.ok(quickView.primaryContact);
            node_assert_1.default.ok(quickView.primaryContact.name);
            node_assert_1.default.ok(quickView.primaryContact.phone);
        });
        (0, node_test_1.default)('should include all contacts', async () => {
            const quickView = expectOk(await safety_service_1.safetyService.getAthleteEmergency('athlete1'));
            node_assert_1.default.ok(quickView.allContacts.length >= 1);
            node_assert_1.default.ok(quickView.allContacts.every(c => c.name && c.phone));
        });
        (0, node_test_1.default)('should correctly identify alert level based on medical info', async () => {
            // athlete1 has medical alerts in mock data
            const quickView = expectOk(await safety_service_1.safetyService.getAthleteEmergency('athlete1'));
            node_assert_1.default.ok(quickView.hasAlerts);
            node_assert_1.default.notStrictEqual(quickView.alertLevel, 'none');
        });
    });
    (0, node_test_1.describe)('getSessionSafetyInfo', () => {
        (0, node_test_1.default)('should aggregate safety info for multiple athletes', async () => {
            const attendees = [
                { athleteId: 'athlete1', athleteName: 'Athlete One' },
                { athleteId: 'athlete2', athleteName: 'Athlete Two' },
            ];
            const sessionInfo = expectOk(await safety_service_1.safetyService.getSessionSafetyInfo('session_1', attendees));
            node_assert_1.default.ok(sessionInfo);
            node_assert_1.default.strictEqual(sessionInfo.sessionId, 'session_1');
            node_assert_1.default.strictEqual(sessionInfo.totalAthletes, 2);
            node_assert_1.default.strictEqual(sessionInfo.athletes.length, 2);
            node_assert_1.default.ok(Array.isArray(sessionInfo.allAllergies));
            node_assert_1.default.ok(Array.isArray(sessionInfo.allConditions));
            node_assert_1.default.ok(Array.isArray(sessionInfo.missingEmergencyInfo));
        });
        (0, node_test_1.default)('should count athletes with alerts correctly', async () => {
            const attendees = [
                { athleteId: 'athlete1', athleteName: 'Athlete One' },
                { athleteId: 'athlete2', athleteName: 'Athlete Two' },
            ];
            const sessionInfo = expectOk(await safety_service_1.safetyService.getSessionSafetyInfo('session_1', attendees));
            node_assert_1.default.ok(typeof sessionInfo.athletesWithAlerts === 'number');
            node_assert_1.default.ok(sessionInfo.athletesWithAlerts >= 0);
            node_assert_1.default.ok(sessionInfo.athletesWithAlerts <= sessionInfo.totalAthletes);
        });
        (0, node_test_1.default)('should aggregate unique allergies and conditions', async () => {
            const attendees = [
                { athleteId: 'athlete1', athleteName: 'Athlete One' },
            ];
            const sessionInfo = expectOk(await safety_service_1.safetyService.getSessionSafetyInfo('session_1', attendees));
            // Allergies should be sorted alphabetically
            for (let i = 0; i < sessionInfo.allAllergies.length - 1; i++) {
                node_assert_1.default.ok(sessionInfo.allAllergies[i].localeCompare(sessionInfo.allAllergies[i + 1]) <= 0);
            }
        });
        (0, node_test_1.default)('should track athletes missing emergency info', async () => {
            const attendees = [
                { athleteId: 'non_existent', athleteName: 'No Contact Athlete' },
            ];
            const sessionInfo = expectOk(await safety_service_1.safetyService.getSessionSafetyInfo('session_1', attendees));
            // Non-existent athlete should be in missingEmergencyInfo
            node_assert_1.default.ok(sessionInfo.missingEmergencyInfo.includes('No Contact Athlete'));
        });
        (0, node_test_1.default)('should handle empty attendee list', async () => {
            const sessionInfo = expectOk(await safety_service_1.safetyService.getSessionSafetyInfo('session_1', []));
            node_assert_1.default.strictEqual(sessionInfo.totalAthletes, 0);
            node_assert_1.default.strictEqual(sessionInfo.athletes.length, 0);
            node_assert_1.default.strictEqual(sessionInfo.athletesWithAlerts, 0);
        });
    });
    (0, node_test_1.describe)('getPrimaryContact', () => {
        (0, node_test_1.default)('should return primary contact if exists', async () => {
            const contact = expectOk(await safety_service_1.safetyService.getPrimaryContact('athlete1'));
            node_assert_1.default.ok(contact);
            node_assert_1.default.ok(contact.isPrimary);
        });
        (0, node_test_1.default)('should return first contact if no primary is set', async () => {
            // Create athlete with non-primary contacts
            expectOk(await safety_service_1.safetyService.updateEmergencyInfo('test_athlete', {
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
            }));
            const contact = expectOk(await safety_service_1.safetyService.getPrimaryContact('test_athlete'));
            node_assert_1.default.ok(contact);
            node_assert_1.default.strictEqual(contact.name, 'Contact One');
        });
        (0, node_test_1.default)('should return null if no contacts exist', async () => {
            const contact = expectOk(await safety_service_1.safetyService.getPrimaryContact('non_existent'));
            node_assert_1.default.strictEqual(contact, null);
        });
    });
    (0, node_test_1.describe)('formatEmergencyContact', () => {
        (0, node_test_1.default)('should format contact with relationship', () => {
            const contact = {
                id: '1',
                name: 'John Smith',
                relationship: 'Father',
                phone: '123456789',
                isPrimary: true,
                canPickup: true,
            };
            const formatted = safety_service_1.safetyService.formatEmergencyContact(contact);
            node_assert_1.default.strictEqual(formatted, 'John Smith (Father)');
        });
        (0, node_test_1.default)('should format contact without relationship', () => {
            const contact = {
                id: '1',
                name: 'Jane Doe',
                relationship: '',
                phone: '123456789',
                isPrimary: false,
                canPickup: false,
            };
            const formatted = safety_service_1.safetyService.formatEmergencyContact(contact);
            node_assert_1.default.strictEqual(formatted, 'Jane Doe');
        });
    });
    (0, node_test_1.describe)('getMedicalAlertSeverity', () => {
        (0, node_test_1.default)('should return none for empty medical info', () => {
            const medical = {
                conditions: [],
                allergies: [],
                medications: [],
                restrictions: [],
            };
            const severity = safety_service_1.safetyService.getMedicalAlertSeverity(medical);
            node_assert_1.default.strictEqual(severity, 'none');
        });
        (0, node_test_1.default)('should return medium for single allergy', () => {
            const medical = {
                conditions: [],
                allergies: ['Peanuts'],
                medications: [],
                restrictions: [],
            };
            const severity = safety_service_1.safetyService.getMedicalAlertSeverity(medical);
            node_assert_1.default.strictEqual(severity, 'medium');
        });
        (0, node_test_1.default)('should return high for multiple allergies', () => {
            const medical = {
                conditions: [],
                allergies: ['Peanuts', 'Shellfish'],
                medications: [],
                restrictions: [],
            };
            const severity = safety_service_1.safetyService.getMedicalAlertSeverity(medical);
            node_assert_1.default.strictEqual(severity, 'high');
        });
        (0, node_test_1.default)('should return high for multiple conditions', () => {
            const medical = {
                conditions: ['Asthma', 'Diabetes'],
                allergies: [],
                medications: [],
                restrictions: [],
            };
            const severity = safety_service_1.safetyService.getMedicalAlertSeverity(medical);
            node_assert_1.default.strictEqual(severity, 'high');
        });
    });
    (0, node_test_1.describe)('getAlertSummary', () => {
        (0, node_test_1.default)('should return summary for allergies', () => {
            const quickView = {
                athleteId: 'test',
                athleteName: 'Test',
                hasAlerts: true,
                alertLevel: 'medium',
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
            const summary = safety_service_1.safetyService.getAlertSummary(quickView);
            node_assert_1.default.ok(summary.includes('2 allergies'));
        });
        (0, node_test_1.default)('should return summary for multiple types', () => {
            const quickView = {
                athleteId: 'test',
                athleteName: 'Test',
                hasAlerts: true,
                alertLevel: 'high',
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
            const summary = safety_service_1.safetyService.getAlertSummary(quickView);
            node_assert_1.default.ok(summary.includes('1 allergy'));
            node_assert_1.default.ok(summary.includes('1 condition'));
            node_assert_1.default.ok(summary.includes('1 medication'));
        });
        (0, node_test_1.default)('should return no medical alerts for empty data', () => {
            const quickView = {
                athleteId: 'test',
                athleteName: 'Test',
                hasAlerts: false,
                alertLevel: 'none',
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
            const summary = safety_service_1.safetyService.getAlertSummary(quickView);
            node_assert_1.default.strictEqual(summary, 'No medical alerts');
        });
    });
    (0, node_test_1.describe)('getAlertLevelColor', () => {
        (0, node_test_1.default)('should return correct colors for each level', () => {
            node_assert_1.default.strictEqual(safety_service_1.safetyService.getAlertLevelColor('high'), '#C03E47');
            node_assert_1.default.strictEqual(safety_service_1.safetyService.getAlertLevelColor('medium'), '#C78000');
            node_assert_1.default.strictEqual(safety_service_1.safetyService.getAlertLevelColor('low'), '#64748b');
            node_assert_1.default.strictEqual(safety_service_1.safetyService.getAlertLevelColor('none'), '#1C8C5E');
        });
    });
    (0, node_test_1.describe)('getAlertLevelLabel', () => {
        (0, node_test_1.default)('should return correct labels for each level', () => {
            node_assert_1.default.strictEqual(safety_service_1.safetyService.getAlertLevelLabel('high'), 'High Alert');
            node_assert_1.default.strictEqual(safety_service_1.safetyService.getAlertLevelLabel('medium'), 'Medical Alert');
            node_assert_1.default.strictEqual(safety_service_1.safetyService.getAlertLevelLabel('low'), 'Info on File');
            node_assert_1.default.strictEqual(safety_service_1.safetyService.getAlertLevelLabel('none'), 'No Alerts');
        });
    });
    (0, node_test_1.describe)('hasAlerts', () => {
        (0, node_test_1.default)('should return true if athlete has medical alerts', async () => {
            const hasAlerts = expectOk(await safety_service_1.safetyService.hasAlerts('athlete1'));
            node_assert_1.default.strictEqual(hasAlerts, true);
        });
        (0, node_test_1.default)('should return false for athlete without alerts', async () => {
            // Create athlete without alerts
            expectOk(await safety_service_1.safetyService.updateEmergencyInfo('no_alerts', {
                medical: {
                    conditions: [],
                    allergies: [],
                    medications: [],
                    restrictions: [],
                },
            }));
            const hasAlerts = expectOk(await safety_service_1.safetyService.hasAlerts('no_alerts'));
            node_assert_1.default.strictEqual(hasAlerts, false);
        });
    });
    (0, node_test_1.describe)('isComplete', () => {
        (0, node_test_1.default)('should return true if has contact and emergency consent', async () => {
            // athlete1 has contacts and emergency consent in mock data
            const isComplete = expectOk(await safety_service_1.safetyService.isComplete('athlete1'));
            node_assert_1.default.strictEqual(isComplete, true);
        });
        (0, node_test_1.default)('should return false if no contacts', async () => {
            const isComplete = expectOk(await safety_service_1.safetyService.isComplete('non_existent'));
            node_assert_1.default.strictEqual(isComplete, false);
        });
    });
    (0, node_test_1.describe)('updateEmergencyInfo', () => {
        (0, node_test_1.default)('should update medical info', async () => {
            const updated = expectOk(await safety_service_1.safetyService.updateMedicalInfo('athlete1', {
                allergies: ['New Allergy'],
            }));
            node_assert_1.default.ok(updated.medical.allergies.includes('New Allergy'));
        });
        (0, node_test_1.default)('should add emergency contact', async () => {
            const newContact = {
                name: 'New Contact',
                relationship: 'Aunt',
                phone: '+44 7700 999999',
                isPrimary: false,
                canPickup: true,
            };
            const updated = expectOk(await safety_service_1.safetyService.addContact('athlete1', newContact));
            node_assert_1.default.ok(updated.contacts.some(c => c.name === 'New Contact'));
        });
        (0, node_test_1.default)('should update consent', async () => {
            const updated = expectOk(await safety_service_1.safetyService.updateConsent('athlete1', 'PHOTO', true, 'Test Parent'));
            const photoConsent = updated.consents.find(c => c.type === 'PHOTO');
            node_assert_1.default.ok(photoConsent);
            node_assert_1.default.strictEqual(photoConsent.granted, true);
            node_assert_1.default.strictEqual(photoConsent.grantedBy, 'Test Parent');
        });
    });
    (0, node_test_1.describe)('caching', () => {
        (0, node_test_1.default)('should clear cache successfully', async () => {
            expectOk(await safety_service_1.safetyService.clearCache());
            // Should not throw
            node_assert_1.default.ok(true);
        });
        (0, node_test_1.default)('should pre-cache session emergency info', async () => {
            const attendees = [
                { athleteId: 'athlete1', athleteName: 'Athlete One' },
                { athleteId: 'athlete2', athleteName: 'Athlete Two' },
            ];
            expectOk(await safety_service_1.safetyService.preCacheSessionEmergencyInfo(attendees));
            // Should not throw
            node_assert_1.default.ok(true);
        });
    });
});
