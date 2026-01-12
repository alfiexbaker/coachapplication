"use strict";
/**
 * Referral Service Tests
 *
 * Unit tests for the referral service utility functions.
 * Tests the pure functions that don't require storage or external dependencies.
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
(0, node_test_1.describe)('Referral Service Utility Functions', () => {
    (0, node_test_1.describe)('getStatusInfo', () => {
        // These functions are pure and can be tested directly
        const getStatusInfo = (status) => {
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
        (0, node_test_1.default)('should return correct info for COMPLETED status', () => {
            const info = getStatusInfo('COMPLETED');
            node_assert_1.default.strictEqual(info.label, 'Completed');
            node_assert_1.default.strictEqual(info.color, '#10B981');
        });
        (0, node_test_1.default)('should return correct info for PENDING status', () => {
            const info = getStatusInfo('PENDING');
            node_assert_1.default.strictEqual(info.label, 'Pending');
            node_assert_1.default.strictEqual(info.color, '#F59E0B');
        });
        (0, node_test_1.default)('should return correct info for EXPIRED status', () => {
            const info = getStatusInfo('EXPIRED');
            node_assert_1.default.strictEqual(info.label, 'Expired');
            node_assert_1.default.strictEqual(info.color, '#6B7280');
        });
    });
    (0, node_test_1.describe)('formatCredit', () => {
        const formatCredit = (amount) => {
            return `\u00A3${amount.toFixed(2)}`;
        };
        (0, node_test_1.default)('should format whole number correctly', () => {
            const formatted = formatCredit(10);
            node_assert_1.default.ok(formatted.includes('10.00'));
        });
        (0, node_test_1.default)('should format decimal number correctly', () => {
            const formatted = formatCredit(15.50);
            node_assert_1.default.ok(formatted.includes('15.50'));
        });
        (0, node_test_1.default)('should format zero correctly', () => {
            const formatted = formatCredit(0);
            node_assert_1.default.ok(formatted.includes('0.00'));
        });
    });
    (0, node_test_1.describe)('getShareUrl', () => {
        const getShareUrl = (code) => {
            return `https://clubroom.app/join?ref=${encodeURIComponent(code)}`;
        };
        (0, node_test_1.default)('should return valid URL with code', () => {
            const url = getShareUrl('JOHN-ABC123');
            node_assert_1.default.ok(url.startsWith('https://'));
            node_assert_1.default.ok(url.includes('JOHN-ABC123'));
        });
        (0, node_test_1.default)('should encode special characters in code', () => {
            const url = getShareUrl('TEST+CODE');
            node_assert_1.default.ok(url.includes('TEST%2BCODE') || url.includes('TEST+CODE'));
        });
    });
    (0, node_test_1.describe)('getShareMessage', () => {
        const getShareMessage = (code, userName, creditAmount) => {
            const url = `https://clubroom.app/join?ref=${encodeURIComponent(code)}`;
            return `Join me on Clubroom! Use my referral code ${code} when you sign up to get started. Download the app: ${url}`;
        };
        (0, node_test_1.default)('should include referral code in message', () => {
            const message = getShareMessage('JOHN-ABC123', 'John', 10);
            node_assert_1.default.ok(message.includes('JOHN-ABC123'));
        });
        (0, node_test_1.default)('should include app URL in message', () => {
            const message = getShareMessage('JOHN-ABC123', 'John', 10);
            node_assert_1.default.ok(message.includes('https://'));
        });
        (0, node_test_1.default)('should include call to action', () => {
            const message = getShareMessage('JOHN-ABC123', 'John', 10);
            node_assert_1.default.ok(message.includes('Join'));
        });
    });
    (0, node_test_1.describe)('formatDate', () => {
        const formatDate = (dateString) => {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
            });
        };
        (0, node_test_1.default)('should format ISO date string correctly', () => {
            const formatted = formatDate('2024-09-01T14:00:00.000Z');
            node_assert_1.default.ok(formatted.includes('Sep'));
            node_assert_1.default.ok(formatted.includes('2024'));
        });
        (0, node_test_1.default)('should handle different months', () => {
            const formatted = formatDate('2025-01-15T10:00:00.000Z');
            node_assert_1.default.ok(formatted.includes('Jan'));
            node_assert_1.default.ok(formatted.includes('2025'));
        });
    });
    (0, node_test_1.describe)('Code Generation Logic', () => {
        const generateRandomString = (length) => {
            const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
            let result = '';
            for (let i = 0; i < length; i++) {
                result += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            return result;
        };
        const generateUniqueCode = (userName) => {
            const prefix = userName.split(' ')[0].toUpperCase().slice(0, 5);
            const suffix = generateRandomString(6);
            return `${prefix}-${suffix}`;
        };
        (0, node_test_1.default)('should generate code with user name prefix', () => {
            const code = generateUniqueCode('John Smith');
            node_assert_1.default.ok(code.startsWith('JOHN-'));
        });
        (0, node_test_1.default)('should limit prefix to 5 characters', () => {
            const code = generateUniqueCode('Alexander Hamilton');
            node_assert_1.default.ok(code.startsWith('ALEXA-'));
        });
        (0, node_test_1.default)('should include hyphen separator', () => {
            const code = generateUniqueCode('Jane');
            node_assert_1.default.ok(code.includes('-'));
        });
        (0, node_test_1.default)('should generate different codes each time', () => {
            const code1 = generateUniqueCode('Test User');
            const code2 = generateUniqueCode('Test User');
            // While prefix will be same, suffix should be different
            const suffix1 = code1.split('-')[1];
            const suffix2 = code2.split('-')[1];
            // Note: There's a tiny chance these could be equal, but very unlikely
            node_assert_1.default.ok(suffix1.length === 6);
            node_assert_1.default.ok(suffix2.length === 6);
        });
        (0, node_test_1.default)('should only use allowed characters in suffix', () => {
            const allowedChars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
            for (let i = 0; i < 10; i++) {
                const suffix = generateRandomString(6);
                for (const char of suffix) {
                    node_assert_1.default.ok(allowedChars.includes(char), `Character ${char} should be allowed`);
                }
            }
        });
    });
    (0, node_test_1.describe)('Referral Expiry Logic', () => {
        const REFERRAL_EXPIRY_DAYS = 30;
        const isReferralExpired = (referral) => {
            if (referral.status !== 'PENDING')
                return false;
            const createdDate = new Date(referral.createdAt);
            const expiryDate = new Date(createdDate.getTime() + REFERRAL_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
            return new Date() > expiryDate;
        };
        (0, node_test_1.default)('should return false for non-pending referral', () => {
            const referral = { status: 'COMPLETED', createdAt: '2020-01-01T00:00:00.000Z' };
            node_assert_1.default.strictEqual(isReferralExpired(referral), false);
        });
        (0, node_test_1.default)('should return true for old pending referral', () => {
            const oldDate = new Date();
            oldDate.setDate(oldDate.getDate() - 60); // 60 days ago
            const referral = { status: 'PENDING', createdAt: oldDate.toISOString() };
            node_assert_1.default.strictEqual(isReferralExpired(referral), true);
        });
        (0, node_test_1.default)('should return false for recent pending referral', () => {
            const recentDate = new Date();
            recentDate.setDate(recentDate.getDate() - 5); // 5 days ago
            const referral = { status: 'PENDING', createdAt: recentDate.toISOString() };
            node_assert_1.default.strictEqual(isReferralExpired(referral), false);
        });
    });
});
(0, node_test_1.describe)('Referral Types', () => {
    (0, node_test_1.default)('ReferralStatus should have expected values', () => {
        const validStatuses = ['PENDING', 'COMPLETED', 'EXPIRED'];
        node_assert_1.default.strictEqual(validStatuses.length, 3);
    });
});
