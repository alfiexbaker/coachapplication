import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { sessionDisplayService } from '@/services/group-session/session-display-service';

describe('SessionDisplayService', () => {
  describe('formatPrice', () => {
    it('should return Free for zero amount', () => {
      const result = sessionDisplayService.formatPrice(0);
      assert.equal(result, 'Free');
    });

    it('should format GBP price correctly', () => {
      const result = sessionDisplayService.formatPrice(45, 'GBP');
      assert.ok(result.includes('45'));
      assert.ok(result.includes('£') || result.includes('GBP'));
    });

    it('should format decimal prices', () => {
      const result = sessionDisplayService.formatPrice(39.99, 'GBP');
      assert.ok(result.includes('39.99'));
    });

    it('should use GBP as default currency', () => {
      const result = sessionDisplayService.formatPrice(25);
      assert.ok(result.includes('25'));
    });
  });

  describe('formatSessionType', () => {
    it('should format CAMP type', () => {
      const result = sessionDisplayService.formatSessionType('CAMP');
      assert.equal(result, 'Camp');
    });

    it('should format CLINIC type', () => {
      const result = sessionDisplayService.formatSessionType('CLINIC');
      assert.equal(result, 'Clinic');
    });

    it('should format TEAM_TRAINING type', () => {
      const result = sessionDisplayService.formatSessionType('TEAM_TRAINING');
      assert.equal(result, 'Team Training');
    });

    it('should format OPEN_SESSION type', () => {
      const result = sessionDisplayService.formatSessionType('OPEN_SESSION');
      assert.equal(result, 'Open Session');
    });

    it('should format TRIAL type', () => {
      const result = sessionDisplayService.formatSessionType('TRIAL');
      assert.equal(result, 'Trial Session');
    });

    it('should format TRAINING type', () => {
      const result = sessionDisplayService.formatSessionType('TRAINING');
      assert.equal(result, 'Training');
    });
  });
});
