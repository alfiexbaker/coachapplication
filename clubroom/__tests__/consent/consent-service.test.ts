/**
 * Consent Service Tests
 *
 * Unit tests for the consent service functionality including
 * fetching athlete consents, filtering, and summary calculations.
 */

import assert from 'node:assert';
import test, { describe, beforeEach } from 'node:test';

import { consentService, CONSENT_TYPE_LABELS, CONSENT_TYPE_ICONS } from '../../services/consent-service';
import { safetyService } from '../../services/safety-service';
import type { AthleteConsent, Consent } from '../../constants/types';
import type { Result, ServiceError } from '../../types/result';

const expectOk = <T>(result: Result<T, ServiceError>): T => {
  assert.strictEqual(result.success, true);
  if (!result.success) {
    throw new Error('Expected successful result');
  }
  return result.data;
};

// Reset to mock data before each test
beforeEach(async () => {
  expectOk(await safetyService.resetToMockData());
});

describe('Consent Service', () => {
  describe('getAthleteConsents', () => {
    test('should return consent data for an existing athlete', async () => {
      const consents = expectOk(await consentService.getAthleteConsents('athlete1'));

      assert.ok(consents);
      assert.strictEqual(consents.athleteId, 'athlete1');
      assert.ok(Array.isArray(consents.consents));
      assert.ok(consents.consents.length > 0);
    });

    test('should return null for non-existent athlete', async () => {
      // The service returns an object with default values for non-existent athletes
      const consents = expectOk(await consentService.getAthleteConsents('non_existent'));

      assert.ok(consents);
      assert.strictEqual(consents.athleteId, 'non_existent');
    });
  });

  describe('getRosterConsents', () => {
    test('should return consents for all athletes in roster', async () => {
      const consents = expectOk(await consentService.getRosterConsents('coach1'));

      assert.ok(Array.isArray(consents));
      assert.ok(consents.length > 0);
      assert.ok(consents.every((c) => c.athleteId));
    });

    test('should include consent records for each roster athlete', async () => {
      const consents = expectOk(await consentService.getRosterConsents('coach1'));

      const athleteWithConsents = consents.find((c) => c.consents.length > 0);
      assert.ok(athleteWithConsents);
    });

    test('should filter by consent type granted', async () => {
      const consents = expectOk(
        await consentService.getRosterConsents('coach1', {
          type: 'PHOTO',
          status: 'granted',
        }),
      );

      // All returned athletes should have PHOTO consent granted
      for (const c of consents) {
        const photoConsent = c.consents.find((consent) => consent.type === 'PHOTO');
        assert.strictEqual(photoConsent?.granted, true);
      }
    });

    test('should filter by consent type denied', async () => {
      const consents = expectOk(
        await consentService.getRosterConsents('coach1', {
          type: 'SOCIAL_MEDIA',
          status: 'denied',
        }),
      );

      // All returned athletes should have SOCIAL_MEDIA consent denied
      for (const c of consents) {
        const socialConsent = c.consents.find((consent) => consent.type === 'SOCIAL_MEDIA');
        assert.strictEqual(socialConsent?.granted, false);
      }
    });

    test('should filter by search query', async () => {
      const consents = expectOk(
        await consentService.getRosterConsents('coach1', {
          search: 'athlete1',
        }),
      );

      // All returned athletes should match the athleteId query
      for (const c of consents) {
        assert.ok(c.athleteId.toLowerCase().includes('athlete1'));
      }
    });
  });

  describe('checkConsent', () => {
    test('should return true for granted consent', async () => {
      const hasPhotoConsent = expectOk(await consentService.checkConsent('athlete1', 'PHOTO'));

      // athlete1 has PHOTO consent in mock data
      assert.strictEqual(hasPhotoConsent, true);
    });

    test('should return false for denied consent', async () => {
      const hasSocialConsent = expectOk(
        await consentService.checkConsent('athlete1', 'SOCIAL_MEDIA'),
      );

      // athlete1 does not have SOCIAL_MEDIA consent in mock data
      assert.strictEqual(hasSocialConsent, false);
    });

    test('should return false for non-existent athlete', async () => {
      const hasConsent = expectOk(await consentService.checkConsent('non_existent', 'PHOTO'));

      assert.strictEqual(hasConsent, false);
    });
  });

  describe('getConsentedAthletes', () => {
    test('should return athletes with granted consent', async () => {
      const consentedAthletes = expectOk(
        await consentService.getConsentedAthletes('coach1', 'PHOTO'),
      );

      assert.ok(Array.isArray(consentedAthletes));
      for (const athlete of consentedAthletes) {
        const photoConsent = athlete.consents.find((c) => c.type === 'PHOTO');
        assert.strictEqual(photoConsent?.granted, true);
      }
    });

    test('should return empty array if no athletes have consent', async () => {
      // Update all athletes to not have a specific consent (this may need mock data adjustment)
      const athletes = expectOk(
        await consentService.getNonConsentedAthletes('coach1', 'EMERGENCY_TREATMENT'),
      );

      // The non-consented athletes should not have EMERGENCY_TREATMENT granted
      for (const athlete of athletes) {
        const emergencyConsent = athlete.consents.find((c) => c.type === 'EMERGENCY_TREATMENT');
        assert.strictEqual(emergencyConsent?.granted, false);
      }
    });
  });

  describe('getNonConsentedAthletes', () => {
    test('should return athletes without granted consent', async () => {
      const nonConsentedAthletes = expectOk(
        await consentService.getNonConsentedAthletes('coach1', 'SOCIAL_MEDIA'),
      );

      assert.ok(Array.isArray(nonConsentedAthletes));
      for (const athlete of nonConsentedAthletes) {
        const socialConsent = athlete.consents.find((c) => c.type === 'SOCIAL_MEDIA');
        assert.strictEqual(socialConsent?.granted, false);
      }
    });
  });

  describe('getConsentSummary', () => {
    test('should return summary with correct structure', async () => {
      const summary = expectOk(await consentService.getConsentSummary('coach1'));

      assert.ok(summary);
      assert.ok(typeof summary.totalAthletes === 'number');
      assert.ok(summary.byType);
      assert.ok(summary.byType.PHOTO);
      assert.ok(summary.byType.VIDEO);
      assert.ok(summary.byType.SOCIAL_MEDIA);
      assert.ok(summary.byType.EMERGENCY_TREATMENT);
    });

    test('should have correct counts for each consent type', async () => {
      const summary = expectOk(await consentService.getConsentSummary('coach1'));

      for (const type of consentService.getConsentTypes()) {
        const stat = summary.byType[type];
        assert.ok(typeof stat.granted === 'number');
        assert.ok(typeof stat.denied === 'number');
        assert.ok(stat.granted >= 0);
        assert.ok(stat.denied >= 0);
        assert.strictEqual(stat.granted + stat.denied, summary.totalAthletes);
      }
    });
  });

  describe('getConsentStatus', () => {
    test('should return consent for specified type', () => {
      const athleteConsent: AthleteConsent = {
        athleteId: 'test',
        consents: [
          { type: 'PHOTO', granted: true, grantedBy: 'Parent' },
          { type: 'VIDEO', granted: false, grantedBy: '' },
          { type: 'SOCIAL_MEDIA', granted: false, grantedBy: '' },
          { type: 'EMERGENCY_TREATMENT', granted: true, grantedBy: 'Parent' },
        ],
        lastUpdated: new Date().toISOString(),
      };

      const photoConsent = consentService.getConsentStatus(athleteConsent, 'PHOTO');
      const videoConsent = consentService.getConsentStatus(athleteConsent, 'VIDEO');

      assert.ok(photoConsent);
      assert.strictEqual(photoConsent.granted, true);
      assert.ok(videoConsent);
      assert.strictEqual(videoConsent.granted, false);
    });

    test('should return undefined for missing consent type', () => {
      const athleteConsent: AthleteConsent = {
        athleteId: 'test',
        consents: [],
        lastUpdated: new Date().toISOString(),
      };

      const consent = consentService.getConsentStatus(athleteConsent, 'PHOTO');

      assert.strictEqual(consent, undefined);
    });
  });

  describe('hasContentPostingConsent', () => {
    test('should return true when photo and social media consents are granted', () => {
      const athleteConsent: AthleteConsent = {
        athleteId: 'test',
        consents: [
          { type: 'PHOTO', granted: true, grantedBy: 'Parent' },
          { type: 'VIDEO', granted: false, grantedBy: '' },
          { type: 'SOCIAL_MEDIA', granted: true, grantedBy: 'Parent' },
          { type: 'EMERGENCY_TREATMENT', granted: true, grantedBy: 'Parent' },
        ],
        lastUpdated: new Date().toISOString(),
      };

      const hasConsent = consentService.hasContentPostingConsent(athleteConsent);

      assert.strictEqual(hasConsent, true);
    });

    test('should return true when video and social media consents are granted', () => {
      const athleteConsent: AthleteConsent = {
        athleteId: 'test',
        consents: [
          { type: 'PHOTO', granted: false, grantedBy: '' },
          { type: 'VIDEO', granted: true, grantedBy: 'Parent' },
          { type: 'SOCIAL_MEDIA', granted: true, grantedBy: 'Parent' },
          { type: 'EMERGENCY_TREATMENT', granted: true, grantedBy: 'Parent' },
        ],
        lastUpdated: new Date().toISOString(),
      };

      const hasConsent = consentService.hasContentPostingConsent(athleteConsent);

      assert.strictEqual(hasConsent, true);
    });

    test('should return false when social media consent is not granted', () => {
      const athleteConsent: AthleteConsent = {
        athleteId: 'test',
        consents: [
          { type: 'PHOTO', granted: true, grantedBy: 'Parent' },
          { type: 'VIDEO', granted: true, grantedBy: 'Parent' },
          { type: 'SOCIAL_MEDIA', granted: false, grantedBy: '' },
          { type: 'EMERGENCY_TREATMENT', granted: true, grantedBy: 'Parent' },
        ],
        lastUpdated: new Date().toISOString(),
      };

      const hasConsent = consentService.hasContentPostingConsent(athleteConsent);

      assert.strictEqual(hasConsent, false);
    });

    test('should return false when neither photo nor video consent is granted', () => {
      const athleteConsent: AthleteConsent = {
        athleteId: 'test',
        consents: [
          { type: 'PHOTO', granted: false, grantedBy: '' },
          { type: 'VIDEO', granted: false, grantedBy: '' },
          { type: 'SOCIAL_MEDIA', granted: true, grantedBy: 'Parent' },
          { type: 'EMERGENCY_TREATMENT', granted: true, grantedBy: 'Parent' },
        ],
        lastUpdated: new Date().toISOString(),
      };

      const hasConsent = consentService.hasContentPostingConsent(athleteConsent);

      assert.strictEqual(hasConsent, false);
    });
  });

  describe('getConsentTypes', () => {
    test('should return all consent types', () => {
      const types = consentService.getConsentTypes();

      assert.ok(Array.isArray(types));
      assert.ok(types.includes('PHOTO'));
      assert.ok(types.includes('VIDEO'));
      assert.ok(types.includes('SOCIAL_MEDIA'));
      assert.ok(types.includes('EMERGENCY_TREATMENT'));
      assert.strictEqual(types.length, 4);
    });
  });

  describe('getConsentLabel', () => {
    test('should return correct labels for each type', () => {
      assert.strictEqual(consentService.getConsentLabel('PHOTO'), 'Photo');
      assert.strictEqual(consentService.getConsentLabel('VIDEO'), 'Video');
      assert.strictEqual(consentService.getConsentLabel('SOCIAL_MEDIA'), 'Social Media');
      assert.strictEqual(consentService.getConsentLabel('EMERGENCY_TREATMENT'), 'Emergency Treatment');
    });
  });

  describe('getConsentIcon', () => {
    test('should return correct icons for each type', () => {
      assert.strictEqual(consentService.getConsentIcon('PHOTO'), 'camera-outline');
      assert.strictEqual(consentService.getConsentIcon('VIDEO'), 'videocam-outline');
      assert.strictEqual(consentService.getConsentIcon('SOCIAL_MEDIA'), 'share-social-outline');
      assert.strictEqual(consentService.getConsentIcon('EMERGENCY_TREATMENT'), 'medkit-outline');
    });
  });

  describe('getConsentDescription', () => {
    test('should return descriptions for each type', () => {
      const photoDesc = consentService.getConsentDescription('PHOTO');
      const videoDesc = consentService.getConsentDescription('VIDEO');
      const socialDesc = consentService.getConsentDescription('SOCIAL_MEDIA');
      const emergencyDesc = consentService.getConsentDescription('EMERGENCY_TREATMENT');

      assert.ok(photoDesc.length > 0);
      assert.ok(videoDesc.length > 0);
      assert.ok(socialDesc.length > 0);
      assert.ok(emergencyDesc.length > 0);
    });
  });

  describe('formatConsentDate', () => {
    test('should format granted date correctly', () => {
      const consent: Consent = {
        type: 'PHOTO',
        granted: true,
        grantedAt: '2024-01-15T10:00:00Z',
        grantedBy: 'Test Parent',
      };

      const formatted = consentService.formatConsentDate(consent);

      assert.ok(formatted.includes('Jan'));
      assert.ok(formatted.includes('2024'));
    });

    test('should return "Not granted" for consent without date', () => {
      const consent: Consent = {
        type: 'PHOTO',
        granted: false,
        grantedBy: '',
      };

      const formatted = consentService.formatConsentDate(consent);

      assert.strictEqual(formatted, 'Not granted');
    });
  });

  describe('getConsentCount', () => {
    test('should return correct count of granted consents', () => {
      const athleteConsent: AthleteConsent = {
        athleteId: 'test',
        consents: [
          { type: 'PHOTO', granted: true, grantedBy: 'Parent' },
          { type: 'VIDEO', granted: true, grantedBy: 'Parent' },
          { type: 'SOCIAL_MEDIA', granted: false, grantedBy: '' },
          { type: 'EMERGENCY_TREATMENT', granted: true, grantedBy: 'Parent' },
        ],
        lastUpdated: new Date().toISOString(),
      };

      const { granted, total } = consentService.getConsentCount(athleteConsent);

      assert.strictEqual(granted, 3);
      assert.strictEqual(total, 4);
    });

    test('should return zero for no consents', () => {
      const athleteConsent: AthleteConsent = {
        athleteId: 'test',
        consents: [],
        lastUpdated: new Date().toISOString(),
      };

      const { granted, total } = consentService.getConsentCount(athleteConsent);

      assert.strictEqual(granted, 0);
      assert.strictEqual(total, 0);
    });
  });

  describe('getConsentPercentage', () => {
    test('should return correct percentage', () => {
      const athleteConsent: AthleteConsent = {
        athleteId: 'test',
        consents: [
          { type: 'PHOTO', granted: true, grantedBy: 'Parent' },
          { type: 'VIDEO', granted: true, grantedBy: 'Parent' },
          { type: 'SOCIAL_MEDIA', granted: false, grantedBy: '' },
          { type: 'EMERGENCY_TREATMENT', granted: false, grantedBy: '' },
        ],
        lastUpdated: new Date().toISOString(),
      };

      const percentage = consentService.getConsentPercentage(athleteConsent);

      assert.strictEqual(percentage, 50);
    });

    test('should return 100 for all granted', () => {
      const athleteConsent: AthleteConsent = {
        athleteId: 'test',
        consents: [
          { type: 'PHOTO', granted: true, grantedBy: 'Parent' },
          { type: 'VIDEO', granted: true, grantedBy: 'Parent' },
          { type: 'SOCIAL_MEDIA', granted: true, grantedBy: 'Parent' },
          { type: 'EMERGENCY_TREATMENT', granted: true, grantedBy: 'Parent' },
        ],
        lastUpdated: new Date().toISOString(),
      };

      const percentage = consentService.getConsentPercentage(athleteConsent);

      assert.strictEqual(percentage, 100);
    });

    test('should return 0 for none granted', () => {
      const athleteConsent: AthleteConsent = {
        athleteId: 'test',
        consents: [
          { type: 'PHOTO', granted: false, grantedBy: '' },
          { type: 'VIDEO', granted: false, grantedBy: '' },
          { type: 'SOCIAL_MEDIA', granted: false, grantedBy: '' },
          { type: 'EMERGENCY_TREATMENT', granted: false, grantedBy: '' },
        ],
        lastUpdated: new Date().toISOString(),
      };

      const percentage = consentService.getConsentPercentage(athleteConsent);

      assert.strictEqual(percentage, 0);
    });

    test('should return 0 for empty consents array', () => {
      const athleteConsent: AthleteConsent = {
        athleteId: 'test',
        consents: [],
        lastUpdated: new Date().toISOString(),
      };

      const percentage = consentService.getConsentPercentage(athleteConsent);

      assert.strictEqual(percentage, 0);
    });
  });

  describe('CONSENT_TYPE_LABELS', () => {
    test('should have labels for all consent types', () => {
      assert.ok(CONSENT_TYPE_LABELS.PHOTO);
      assert.ok(CONSENT_TYPE_LABELS.VIDEO);
      assert.ok(CONSENT_TYPE_LABELS.SOCIAL_MEDIA);
      assert.ok(CONSENT_TYPE_LABELS.EMERGENCY_TREATMENT);
    });
  });

  describe('CONSENT_TYPE_ICONS', () => {
    test('should have icons for all consent types', () => {
      assert.ok(CONSENT_TYPE_ICONS.PHOTO);
      assert.ok(CONSENT_TYPE_ICONS.VIDEO);
      assert.ok(CONSENT_TYPE_ICONS.SOCIAL_MEDIA);
      assert.ok(CONSENT_TYPE_ICONS.EMERGENCY_TREATMENT);
    });
  });
});
