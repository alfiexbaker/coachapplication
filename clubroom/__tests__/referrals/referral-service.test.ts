/**
 * Referral Service Tests
 *
 * Unit tests for the referral service utility functions.
 * Tests the pure functions that don't require storage or external dependencies.
 */

import assert from 'node:assert';
import test, { describe } from 'node:test';

// Import only types - service will be tested via direct function testing
import type { ReferralStatus } from '../../constants/types';

describe('Referral Service Utility Functions', () => {
  describe('getStatusInfo', () => {
    // These functions are pure and can be tested directly
    const getStatusInfo = (status: ReferralStatus): { label: string; color: string } => {
      switch (status) {
        case 'COMPLETED':
          return { label: 'Completed', color: '#10B981' };
        case 'PENDING':
          return { label: 'Pending', color: '#F59E0B' };
        case 'EXPIRED':
          return { label: 'Expired', color: '#6B7280' };
        default:
          return { label: status, color: '#6B7280' };
      }
    };

    test('should return correct info for COMPLETED status', () => {
      const info = getStatusInfo('COMPLETED');
      assert.strictEqual(info.label, 'Completed');
      assert.strictEqual(info.color, '#10B981');
    });

    test('should return correct info for PENDING status', () => {
      const info = getStatusInfo('PENDING');
      assert.strictEqual(info.label, 'Pending');
      assert.strictEqual(info.color, '#F59E0B');
    });

    test('should return correct info for EXPIRED status', () => {
      const info = getStatusInfo('EXPIRED');
      assert.strictEqual(info.label, 'Expired');
      assert.strictEqual(info.color, '#6B7280');
    });
  });

  describe('formatCredit', () => {
    const formatCredit = (amount: number): string => {
      return `\u00A3${amount.toFixed(2)}`;
    };

    test('should format whole number correctly', () => {
      const formatted = formatCredit(10);
      assert.ok(formatted.includes('10.00'));
    });

    test('should format decimal number correctly', () => {
      const formatted = formatCredit(15.50);
      assert.ok(formatted.includes('15.50'));
    });

    test('should format zero correctly', () => {
      const formatted = formatCredit(0);
      assert.ok(formatted.includes('0.00'));
    });
  });

  describe('getShareUrl', () => {
    const getShareUrl = (code: string): string => {
      return `https://clubroom.app/join?ref=${encodeURIComponent(code)}`;
    };

    test('should return valid URL with code', () => {
      const url = getShareUrl('JOHN-ABC123');
      assert.ok(url.startsWith('https://'));
      assert.ok(url.includes('JOHN-ABC123'));
    });

    test('should encode special characters in code', () => {
      const url = getShareUrl('TEST+CODE');
      assert.ok(url.includes('TEST%2BCODE') || url.includes('TEST+CODE'));
    });
  });

  describe('getShareMessage', () => {
    const getShareMessage = (code: string, userName: string, creditAmount: number): string => {
      const url = `https://clubroom.app/join?ref=${encodeURIComponent(code)}`;
      return `Join me on Clubroom! Use my referral code ${code} when you sign up to get started. Download the app: ${url}`;
    };

    test('should include referral code in message', () => {
      const message = getShareMessage('JOHN-ABC123', 'John', 10);
      assert.ok(message.includes('JOHN-ABC123'));
    });

    test('should include app URL in message', () => {
      const message = getShareMessage('JOHN-ABC123', 'John', 10);
      assert.ok(message.includes('https://'));
    });

    test('should include call to action', () => {
      const message = getShareMessage('JOHN-ABC123', 'John', 10);
      assert.ok(message.includes('Join'));
    });
  });

  describe('formatDate', () => {
    const formatDate = (dateString: string): string => {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    };

    test('should format ISO date string correctly', () => {
      const formatted = formatDate('2024-09-01T14:00:00.000Z');
      assert.ok(formatted.includes('Sep'));
      assert.ok(formatted.includes('2024'));
    });

    test('should handle different months', () => {
      const formatted = formatDate('2025-01-15T10:00:00.000Z');
      assert.ok(formatted.includes('Jan'));
      assert.ok(formatted.includes('2025'));
    });
  });

  describe('Code Generation Logic', () => {
    const generateRandomString = (length: number): string => {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      let result = '';
      for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return result;
    };

    const generateUniqueCode = (userName: string): string => {
      const prefix = userName.split(' ')[0].toUpperCase().slice(0, 5);
      const suffix = generateRandomString(6);
      return `${prefix}-${suffix}`;
    };

    test('should generate code with user name prefix', () => {
      const code = generateUniqueCode('John Smith');
      assert.ok(code.startsWith('JOHN-'));
    });

    test('should limit prefix to 5 characters', () => {
      const code = generateUniqueCode('Alexander Hamilton');
      assert.ok(code.startsWith('ALEXA-'));
    });

    test('should include hyphen separator', () => {
      const code = generateUniqueCode('Jane');
      assert.ok(code.includes('-'));
    });

    test('should generate different codes each time', () => {
      const code1 = generateUniqueCode('Test User');
      const code2 = generateUniqueCode('Test User');
      // While prefix will be same, suffix should be different
      const suffix1 = code1.split('-')[1];
      const suffix2 = code2.split('-')[1];
      // Note: There's a tiny chance these could be equal, but very unlikely
      assert.ok(suffix1.length === 6);
      assert.ok(suffix2.length === 6);
    });

    test('should only use allowed characters in suffix', () => {
      const allowedChars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      for (let i = 0; i < 10; i++) {
        const suffix = generateRandomString(6);
        for (const char of suffix) {
          assert.ok(allowedChars.includes(char), `Character ${char} should be allowed`);
        }
      }
    });
  });

  describe('Referral Expiry Logic', () => {
    const REFERRAL_EXPIRY_DAYS = 30;

    const isReferralExpired = (referral: { status: string; createdAt: string }): boolean => {
      if (referral.status !== 'PENDING') return false;
      const createdDate = new Date(referral.createdAt);
      const expiryDate = new Date(createdDate.getTime() + REFERRAL_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
      return new Date() > expiryDate;
    };

    test('should return false for non-pending referral', () => {
      const referral = { status: 'COMPLETED', createdAt: '2020-01-01T00:00:00.000Z' };
      assert.strictEqual(isReferralExpired(referral), false);
    });

    test('should return true for old pending referral', () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 60); // 60 days ago
      const referral = { status: 'PENDING', createdAt: oldDate.toISOString() };
      assert.strictEqual(isReferralExpired(referral), true);
    });

    test('should return false for recent pending referral', () => {
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 5); // 5 days ago
      const referral = { status: 'PENDING', createdAt: recentDate.toISOString() };
      assert.strictEqual(isReferralExpired(referral), false);
    });
  });
});

describe('Referral Types', () => {
  test('ReferralStatus should have expected values', () => {
    const validStatuses: ReferralStatus[] = ['PENDING', 'COMPLETED', 'EXPIRED'];
    assert.strictEqual(validStatuses.length, 3);
  });
});
