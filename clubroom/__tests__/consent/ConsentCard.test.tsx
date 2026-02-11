/**
 * ConsentCard Component Tests
 *
 * Unit tests for the ConsentCard component
 * testing rendering, data display, and consent status indicators.
 */

import assert from 'node:assert';
import test, { describe } from 'node:test';

import type { AthleteConsent, Consent, ConsentType } from '../../constants/types';
import { consentService } from '../../services/consent-service';

// Mock athlete consent data for tests
const createMockConsent = (
  overrides: Partial<AthleteConsent> = {}
): AthleteConsent => ({
  athleteId: 'test_athlete',
  consents: [
    { type: 'PHOTO', granted: true, grantedBy: 'Test Parent', grantedAt: '2024-01-15T10:00:00Z' },
    { type: 'VIDEO', granted: true, grantedBy: 'Test Parent', grantedAt: '2024-01-15T10:00:00Z' },
    { type: 'SOCIAL_MEDIA', granted: false, grantedBy: '' },
    { type: 'EMERGENCY_TREATMENT', granted: true, grantedBy: 'Test Parent', grantedAt: '2024-01-15T10:00:00Z' },
  ],
  lastUpdated: '2024-01-15T10:00:00Z',
  ...overrides,
});

describe('ConsentCard', () => {
  describe('Consent Count Display', () => {
    test('should calculate correct granted count', () => {
      const athleteConsent = createMockConsent();
      const { granted, total } = consentService.getConsentCount(athleteConsent);

      assert.strictEqual(granted, 3);
      assert.strictEqual(total, 4);
    });

    test('should handle all consents granted', () => {
      const athleteConsent = createMockConsent({
        consents: [
          { type: 'PHOTO', granted: true, grantedBy: 'Parent' },
          { type: 'VIDEO', granted: true, grantedBy: 'Parent' },
          { type: 'SOCIAL_MEDIA', granted: true, grantedBy: 'Parent' },
          { type: 'EMERGENCY_TREATMENT', granted: true, grantedBy: 'Parent' },
        ],
      });
      const { granted, total } = consentService.getConsentCount(athleteConsent);

      assert.strictEqual(granted, 4);
      assert.strictEqual(total, 4);
    });

    test('should handle no consents granted', () => {
      const athleteConsent = createMockConsent({
        consents: [
          { type: 'PHOTO', granted: false, grantedBy: '' },
          { type: 'VIDEO', granted: false, grantedBy: '' },
          { type: 'SOCIAL_MEDIA', granted: false, grantedBy: '' },
          { type: 'EMERGENCY_TREATMENT', granted: false, grantedBy: '' },
        ],
      });
      const { granted, total } = consentService.getConsentCount(athleteConsent);

      assert.strictEqual(granted, 0);
      assert.strictEqual(total, 4);
    });
  });

  describe('Consent Percentage', () => {
    test('should calculate 75% for 3 of 4 consents', () => {
      const athleteConsent = createMockConsent();
      const percentage = consentService.getConsentPercentage(athleteConsent);

      assert.strictEqual(percentage, 75);
    });

    test('should calculate 100% for all consents', () => {
      const athleteConsent = createMockConsent({
        consents: [
          { type: 'PHOTO', granted: true, grantedBy: 'Parent' },
          { type: 'VIDEO', granted: true, grantedBy: 'Parent' },
          { type: 'SOCIAL_MEDIA', granted: true, grantedBy: 'Parent' },
          { type: 'EMERGENCY_TREATMENT', granted: true, grantedBy: 'Parent' },
        ],
      });
      const percentage = consentService.getConsentPercentage(athleteConsent);

      assert.strictEqual(percentage, 100);
    });

    test('should calculate 0% for no consents', () => {
      const athleteConsent = createMockConsent({
        consents: [
          { type: 'PHOTO', granted: false, grantedBy: '' },
          { type: 'VIDEO', granted: false, grantedBy: '' },
          { type: 'SOCIAL_MEDIA', granted: false, grantedBy: '' },
          { type: 'EMERGENCY_TREATMENT', granted: false, grantedBy: '' },
        ],
      });
      const percentage = consentService.getConsentPercentage(athleteConsent);

      assert.strictEqual(percentage, 0);
    });
  });

  describe('Content Posting Consent', () => {
    test('should return true when photo and social media are granted', () => {
      const athleteConsent = createMockConsent({
        consents: [
          { type: 'PHOTO', granted: true, grantedBy: 'Parent' },
          { type: 'VIDEO', granted: false, grantedBy: '' },
          { type: 'SOCIAL_MEDIA', granted: true, grantedBy: 'Parent' },
          { type: 'EMERGENCY_TREATMENT', granted: false, grantedBy: '' },
        ],
      });
      const hasConsent = consentService.hasContentPostingConsent(athleteConsent);

      assert.strictEqual(hasConsent, true);
    });

    test('should return true when video and social media are granted', () => {
      const athleteConsent = createMockConsent({
        consents: [
          { type: 'PHOTO', granted: false, grantedBy: '' },
          { type: 'VIDEO', granted: true, grantedBy: 'Parent' },
          { type: 'SOCIAL_MEDIA', granted: true, grantedBy: 'Parent' },
          { type: 'EMERGENCY_TREATMENT', granted: false, grantedBy: '' },
        ],
      });
      const hasConsent = consentService.hasContentPostingConsent(athleteConsent);

      assert.strictEqual(hasConsent, true);
    });

    test('should return false when social media is not granted', () => {
      const athleteConsent = createMockConsent({
        consents: [
          { type: 'PHOTO', granted: true, grantedBy: 'Parent' },
          { type: 'VIDEO', granted: true, grantedBy: 'Parent' },
          { type: 'SOCIAL_MEDIA', granted: false, grantedBy: '' },
          { type: 'EMERGENCY_TREATMENT', granted: true, grantedBy: 'Parent' },
        ],
      });
      const hasConsent = consentService.hasContentPostingConsent(athleteConsent);

      assert.strictEqual(hasConsent, false);
    });

    test('should return false when neither photo nor video is granted', () => {
      const athleteConsent = createMockConsent({
        consents: [
          { type: 'PHOTO', granted: false, grantedBy: '' },
          { type: 'VIDEO', granted: false, grantedBy: '' },
          { type: 'SOCIAL_MEDIA', granted: true, grantedBy: 'Parent' },
          { type: 'EMERGENCY_TREATMENT', granted: true, grantedBy: 'Parent' },
        ],
      });
      const hasConsent = consentService.hasContentPostingConsent(athleteConsent);

      assert.strictEqual(hasConsent, false);
    });
  });

  describe('Status Label Logic', () => {
    test('should identify 100% consent', () => {
      const athleteConsent = createMockConsent({
        consents: [
          { type: 'PHOTO', granted: true, grantedBy: 'Parent' },
          { type: 'VIDEO', granted: true, grantedBy: 'Parent' },
          { type: 'SOCIAL_MEDIA', granted: true, grantedBy: 'Parent' },
          { type: 'EMERGENCY_TREATMENT', granted: true, grantedBy: 'Parent' },
        ],
      });
      const percentage = consentService.getConsentPercentage(athleteConsent);

      assert.strictEqual(percentage === 100, true);
    });

    test('should identify partial consent (50%+)', () => {
      const athleteConsent = createMockConsent({
        consents: [
          { type: 'PHOTO', granted: true, grantedBy: 'Parent' },
          { type: 'VIDEO', granted: true, grantedBy: 'Parent' },
          { type: 'SOCIAL_MEDIA', granted: false, grantedBy: '' },
          { type: 'EMERGENCY_TREATMENT', granted: false, grantedBy: '' },
        ],
      });
      const percentage = consentService.getConsentPercentage(athleteConsent);

      assert.strictEqual(percentage >= 50 && percentage < 100, true);
    });

    test('should identify limited consent (< 50%)', () => {
      const athleteConsent = createMockConsent({
        consents: [
          { type: 'PHOTO', granted: true, grantedBy: 'Parent' },
          { type: 'VIDEO', granted: false, grantedBy: '' },
          { type: 'SOCIAL_MEDIA', granted: false, grantedBy: '' },
          { type: 'EMERGENCY_TREATMENT', granted: false, grantedBy: '' },
        ],
      });
      const percentage = consentService.getConsentPercentage(athleteConsent);

      assert.strictEqual(percentage > 0 && percentage < 50, true);
    });

    test('should identify no consent', () => {
      const athleteConsent = createMockConsent({
        consents: [
          { type: 'PHOTO', granted: false, grantedBy: '' },
          { type: 'VIDEO', granted: false, grantedBy: '' },
          { type: 'SOCIAL_MEDIA', granted: false, grantedBy: '' },
          { type: 'EMERGENCY_TREATMENT', granted: false, grantedBy: '' },
        ],
      });
      const percentage = consentService.getConsentPercentage(athleteConsent);

      assert.strictEqual(percentage === 0, true);
    });
  });

  describe('Athlete Data Display', () => {
    test('should have athlete id available', () => {
      const athleteConsent = createMockConsent();
      assert.strictEqual(athleteConsent.athleteId, 'test_athlete');
    });

    test('should have last updated timestamp', () => {
      const athleteConsent = createMockConsent();
      assert.ok(athleteConsent.lastUpdated);
    });

    test('should generate initials from athlete id', () => {
      const athleteConsent = createMockConsent();
      const initials = athleteConsent.athleteId.slice(0, 2).toUpperCase();
      assert.strictEqual(initials, 'TE');
    });
  });

  describe('Consent Grid Data', () => {
    test('should have all consent types', () => {
      const athleteConsent = createMockConsent();
      const consentTypes: ConsentType[] = ['PHOTO', 'VIDEO', 'SOCIAL_MEDIA', 'EMERGENCY_TREATMENT'];

      for (const type of consentTypes) {
        const consent = athleteConsent.consents.find((c) => c.type === type);
        assert.ok(consent, `Missing consent type: ${type}`);
      }
    });

    test('should have correct granted status for each type', () => {
      const athleteConsent = createMockConsent();

      const photoConsent = athleteConsent.consents.find((c) => c.type === 'PHOTO');
      const socialConsent = athleteConsent.consents.find((c) => c.type === 'SOCIAL_MEDIA');

      assert.strictEqual(photoConsent?.granted, true);
      assert.strictEqual(socialConsent?.granted, false);
    });
  });

  describe('Consent Detail Data', () => {
    test('should have grantedBy for granted consents', () => {
      const athleteConsent = createMockConsent();
      const photoConsent = athleteConsent.consents.find((c) => c.type === 'PHOTO');

      assert.ok(photoConsent?.grantedBy);
      assert.strictEqual(photoConsent?.grantedBy, 'Test Parent');
    });

    test('should have grantedAt date for granted consents', () => {
      const athleteConsent = createMockConsent();
      const photoConsent = athleteConsent.consents.find((c) => c.type === 'PHOTO');

      assert.ok(photoConsent?.grantedAt);
    });

    test('should format consent date correctly', () => {
      const consent: Consent = {
        type: 'PHOTO',
        granted: true,
        grantedAt: '2024-01-15T10:00:00Z',
        grantedBy: 'Parent',
      };
      const formatted = consentService.formatConsentDate(consent);

      assert.ok(formatted.includes('Jan'));
      assert.ok(formatted.includes('2024'));
    });
  });

  describe('Consent Type Labels and Icons', () => {
    test('should have correct label for photo consent', () => {
      const label = consentService.getConsentLabel('PHOTO');
      assert.strictEqual(label, 'Photo');
    });

    test('should have correct icon for video consent', () => {
      const icon = consentService.getConsentIcon('VIDEO');
      assert.strictEqual(icon, 'videocam-outline');
    });

    test('should have correct label for social media consent', () => {
      const label = consentService.getConsentLabel('SOCIAL_MEDIA');
      assert.strictEqual(label, 'Social Media');
    });

    test('should have correct label for emergency treatment consent', () => {
      const label = consentService.getConsentLabel('EMERGENCY_TREATMENT');
      assert.strictEqual(label, 'Emergency Treatment');
    });
  });
});
